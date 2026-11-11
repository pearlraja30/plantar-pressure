-- ============================================================================
-- PLANTAR PRESSURE ANALYSIS SYSTEM — POSTGRESQL PRODUCTION DDL
-- Standard: IEC 62304 Class B SaMD / ISO 13485 / ISO 14971 / 21 CFR Part 11
-- Target Database: PostgreSQL 14 / 15 / 16+ (Amazon Aurora / Google Cloud SQL)
-- ============================================================================

-- 0. Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Custom Types & Enumerations
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'technician', 'physician');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('active', 'suspended', 'inactive');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'foot_side') THEN
        CREATE TYPE foot_side AS ENUM ('Left', 'Right', 'Bilateral');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_status') THEN
        CREATE TYPE sync_status AS ENUM ('local_draft', 'synced', 'pending_upload', 'failed');
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Tenants Table (Hospitals & Healthcare Facilities)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,                -- e.g. 'TMH-CENTRAL'
    name VARCHAR(255) NOT NULL,                      -- e.g. 'Technomind Healthcare Systems'
    registration_no VARCHAR(100),                    -- Accreditation / NABH Reg No
    department VARCHAR(100) DEFAULT 'Podiatry & Biomechanics Lab',
    address TEXT,
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    website VARCHAR(255),
    logo_s3_uri VARCHAR(512),                        -- URL to logo in S3/GCS bucket
    logo_position VARCHAR(20) DEFAULT 'Left',        -- 'Left' | 'Centre' | 'Right'
    default_doctor VARCHAR(100) DEFAULT 'Dr. Specialist',
    default_technician VARCHAR(100),
    report_footer_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tenants_code ON tenants(code);

-- ----------------------------------------------------------------------------
-- 3. Users Table (Administrators, Technicians, Physicians)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,           -- Login email or username
    password_hash VARCHAR(255) NOT NULL,             -- Argon2id / bcrypt salted hash
    name VARCHAR(255) NOT NULL,                      -- Full name
    role user_role NOT NULL DEFAULT 'technician',
    phone VARCHAR(50),
    email VARCHAR(100),
    status user_status NOT NULL DEFAULT 'active',
    recovery_key_hash VARCHAR(255),                  -- Hash of emergency recovery key
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ----------------------------------------------------------------------------
-- 4. Hardware Station Binding & Licensing Tables
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bound_devices (
    id VARCHAR(100) PRIMARY KEY,                     -- Hardware fingerprint (e.g. DEV-8F29-4A1B)
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,                      -- e.g. 'Main Lab Windows Workstation'
    platform VARCHAR(100) NOT NULL,                  -- 'Windows 11 (Electron)', 'Android', 'macOS'
    ip_address INET,
    mac_address VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active',    -- 'active' | 'revoked'
    bound_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_bound_devices_tenant ON bound_devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bound_devices_status ON bound_devices(status);

CREATE TABLE IF NOT EXISTS device_licenses (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    tier VARCHAR(50) DEFAULT 'single',               -- 'single' | 'clinic_duo' | 'enterprise_unlimited'
    tier_name VARCHAR(100) DEFAULT 'Single Station Clinic License',
    max_allowed_devices INT NOT NULL DEFAULT 1,      -- Station seat quota (1)
    status VARCHAR(20) DEFAULT 'active',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- 5. Patients Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    mrn VARCHAR(50) NOT NULL,                        -- Alphanumeric Patient ID (e.g. PP-9X8UZ)
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20) DEFAULT 'Male',               -- 'Male' | 'Female' | 'Other'
    height_cm NUMERIC(5,2),
    weight_kg NUMERIC(5,2),
    phone VARCHAR(50),
    referring_doctor VARCHAR(255),
    clinical_history TEXT,                           -- Reason for examination & symptoms
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_tenant_mrn UNIQUE (tenant_id, mrn)
);

CREATE INDEX IF NOT EXISTS idx_patients_tenant_mrn ON patients(tenant_id, mrn);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);

-- ----------------------------------------------------------------------------
-- 6. Clinical Examination Cases & Biomechanical Scans Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exam_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    case_number VARCHAR(100) NOT NULL,               -- e.g. 'PPA-2026-3128'
    foot_side foot_side NOT NULL DEFAULT 'Bilateral',
    operator_id UUID REFERENCES users(id),
    indication TEXT,
    
    -- Cloud S3 / Object Storage URIs
    left_raw_scan_uri VARCHAR(512),
    left_heatmap_uri VARCHAR(512),
    right_raw_scan_uri VARCHAR(512),
    right_heatmap_uri VARCHAR(512),
    pdf_report_uri VARCHAR(512),

    -- Calibrated Optical Metadata
    scanner_model VARCHAR(100),
    resolution_dpi INT DEFAULT 300,
    optical_scale_px_per_mm NUMERIC(6,3) DEFAULT 11.811,
    
    -- Structured Biomechanical Metrics
    cavanagh_arch_index NUMERIC(5,3),                -- e.g. 0.224
    arch_classification VARCHAR(50),                 -- 'High Arch', 'Normal Arch', 'Flat Foot'
    peak_pressure_category VARCHAR(10),              -- 'C1', 'C2', 'C3', 'C4', 'C5', 'C6'
    peak_region VARCHAR(100),                        -- 'Metatarsal 1 & Hallux'
    contact_area_cm2 NUMERIC(6,2),                   -- e.g. 118.50 cm²
    bilateral_asymmetry_index NUMERIC(5,2),          -- ASI %
    
    -- Extended Orthotic & Clinical Measurements Payload
    regional_analysis JSONB DEFAULT '{}'::jsonb,     -- 10-zone sub-breakdown, CSI, Staheli SI
    orthotic_measurements JSONB DEFAULT '{}'::jsonb, -- Foot length (mm), ball breadth (mm), recommendations
    doctor_comments TEXT,
    integrity_hash VARCHAR(64),                      -- SHA-256 integrity hash
    
    sync_status sync_status NOT NULL DEFAULT 'synced',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cases_tenant ON exam_cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cases_patient ON exam_cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON exam_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON exam_cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_regional ON exam_cases USING GIN (regional_analysis);

-- ----------------------------------------------------------------------------
-- 7. Audit Logs Table (Immutable 21 CFR Part 11 Audit Trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    username VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,                    -- 'PATIENT_REGISTERED', 'SCAN_ACQUIRED', etc.
    entity_type VARCHAR(50),                         -- 'patient', 'case', 'user', 'license'
    entity_id VARCHAR(100),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    client_ip INET,
    user_agent TEXT,
    device_id VARCHAR(100),
    algorithm_version VARCHAR(50) DEFAULT 'v1.0.79 (IEC 62304 Verified)',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    record_hash VARCHAR(64)                          -- SHA-256 tamper-evident checksum
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Immutable Rule: Audit logs cannot be updated or deleted
CREATE OR REPLACE FUNCTION prevent_audit_log_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log entries are immutable and cannot be modified or deleted (21 CFR Part 11 Compliance).';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_tamper_guard ON audit_logs;
CREATE TRIGGER trg_audit_logs_tamper_guard
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_tampering();

-- ============================================================================
-- End of PostgreSQL 3-Tier Enterprise DDL
-- ============================================================================
