-- =====================================================================
-- PodoPress / Plantar Pressure Analysis System (PPA-SW-TF-001)
-- Supabase Cloud Mailbox & Telemetry Schema Migration
-- Standard: IEC 62304 Class B SaMD / 21 CFR Part 11 / ISO 27001
--
-- Target Database: Supabase / PostgreSQL 15+
-- Dashboard URL: https://supabase.com/dashboard/project/<your-project-id>/sql/new
-- =====================================================================

-- 0. Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper trigger function to maintain updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 1. Station Activations & Hardware Device Binding Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.station_activations (
    device_fingerprint TEXT PRIMARY KEY,
    device_name TEXT NOT NULL DEFAULT 'Authorized Diagnostic Station',
    os_platform TEXT NOT NULL DEFAULT 'Windows / Mobile',
    app_version TEXT NOT NULL DEFAULT '1.0.79',
    hospital_code TEXT NOT NULL,
    hospital_name TEXT,
    technician_id TEXT,
    technician_name TEXT,
    technician_email TEXT,
    status TEXT NOT NULL DEFAULT 'authorized', -- 'authorized' | 'revoked' | 'pending'
    pending_cases_count INTEGER DEFAULT 0,
    activated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_station_activations_hosp ON public.station_activations (hospital_code);
CREATE INDEX IF NOT EXISTS idx_station_activations_status ON public.station_activations (status);
CREATE INDEX IF NOT EXISTS idx_station_activations_last_seen ON public.station_activations (last_seen_at DESC);

ALTER TABLE public.station_activations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read station_activations" ON public.station_activations;
CREATE POLICY "Allow anon read station_activations"
    ON public.station_activations FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow anon upsert station_activations" ON public.station_activations;
CREATE POLICY "Allow anon upsert station_activations"
    ON public.station_activations FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 2. Clinical Examination Reports & Biomechanical Scans Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinical_reports (
    case_id TEXT PRIMARY KEY,
    case_number TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    patient_name TEXT,
    foot_side TEXT DEFAULT 'Both',
    exam_date DATE DEFAULT CURRENT_DATE,
    cavanagh_arch_index NUMERIC,
    arch_classification TEXT,
    chippaux_smirak_index NUMERIC,
    staheli_index NUMERIC,
    peak_pressure_mpa NUMERIC,
    pressure_category TEXT,
    risk_category TEXT,
    technician_id TEXT,
    technician_name TEXT,
    hospital_code TEXT NOT NULL DEFAULT 'TMH-CENTRAL',
    device_fingerprint TEXT,
    integrity_hash TEXT,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    report_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_clinical_reports_hosp ON public.clinical_reports (hospital_code);
CREATE INDEX IF NOT EXISTS idx_clinical_reports_patient ON public.clinical_reports (patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_reports_date ON public.clinical_reports (exam_date DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_reports_case_num ON public.clinical_reports (case_number);

ALTER TABLE public.clinical_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read clinical_reports" ON public.clinical_reports;
CREATE POLICY "Allow anon read clinical_reports"
    ON public.clinical_reports FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow anon insert/update clinical_reports" ON public.clinical_reports;
CREATE POLICY "Allow anon insert/update clinical_reports"
    ON public.clinical_reports FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ---------------------------------------------------------------------
-- 3. Storage Bucket for High-Resolution Plantar Pressure Scans
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('plantar-scans', 'plantar-scans', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public read of plantar-scans" ON storage.objects;
CREATE POLICY "Allow public read of plantar-scans"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'plantar-scans');

DROP POLICY IF EXISTS "Allow public upload to plantar-scans" ON storage.objects;
CREATE POLICY "Allow public upload to plantar-scans"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'plantar-scans');

-- ---------------------------------------------------------------------
-- 4. Hospital Profiles Table (Clinics & Healthcare Facilities)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hospital_profiles (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    contact TEXT,
    email TEXT,
    website TEXT,
    registration_no TEXT,
    department TEXT,
    default_doctor TEXT,
    default_technician TEXT,
    footer_text TEXT,
    logo_url TEXT,
    logo_position TEXT DEFAULT 'Left',
    doctors JSONB DEFAULT '[]'::jsonb,
    technicians JSONB DEFAULT '[]'::jsonb,
    active_user JSONB,
    status TEXT NOT NULL DEFAULT 'active',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_hospital_profiles_code ON public.hospital_profiles (code);

ALTER TABLE public.hospital_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read hospital_profiles" ON public.hospital_profiles;
CREATE POLICY "Allow anon read hospital_profiles"
    ON public.hospital_profiles FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow anon upsert hospital_profiles" ON public.hospital_profiles;
CREATE POLICY "Allow anon upsert hospital_profiles"
    ON public.hospital_profiles FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_hospital_profiles_updated_at ON public.hospital_profiles;
CREATE TRIGGER trg_hospital_profiles_updated_at
    BEFORE UPDATE ON public.hospital_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------
-- 5. Hospital Administrators Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_accounts (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    pin TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    hospital_id TEXT NOT NULL,
    hospital_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    status TEXT NOT NULL DEFAULT 'active',
    recovery_key TEXT,
    created_by TEXT,
    max_stations_allowed INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    last_login_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_admin_accounts_user ON public.admin_accounts (username);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_hosp ON public.admin_accounts (hospital_id);

ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read admin_accounts" ON public.admin_accounts;
CREATE POLICY "Allow anon read admin_accounts"
    ON public.admin_accounts FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow anon upsert admin_accounts" ON public.admin_accounts;
CREATE POLICY "Allow anon upsert admin_accounts"
    ON public.admin_accounts FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_admin_accounts_updated_at ON public.admin_accounts;
CREATE TRIGGER trg_admin_accounts_updated_at
    BEFORE UPDATE ON public.admin_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ---------------------------------------------------------------------
-- 6. Clinical Technicians & Hardware Activation Vouchers Table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.technician_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    pin TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    hospital_id TEXT NOT NULL,
    hospital_name TEXT,
    role TEXT NOT NULL DEFAULT 'technician',
    status TEXT NOT NULL DEFAULT 'active',
    activation_code TEXT,
    is_registered_on_device BOOLEAN DEFAULT false,
    registered_device_id TEXT,
    mac_address TEXT,
    is_activation_code_used BOOLEAN DEFAULT false,
    activation_code_used_at TIMESTAMPTZ,
    activation_code_used_by_device_id TEXT,
    permit_type TEXT DEFAULT 'standard',
    permit_expiry TIMESTAMPTZ,
    notes TEXT,
    recovery_key TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    last_login_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_technician_users_user ON public.technician_users (username);
CREATE INDEX IF NOT EXISTS idx_technician_users_hosp ON public.technician_users (hospital_id);
CREATE INDEX IF NOT EXISTS idx_technician_users_code ON public.technician_users (activation_code);

ALTER TABLE public.technician_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read technician_users" ON public.technician_users;
CREATE POLICY "Allow anon read technician_users"
    ON public.technician_users FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow anon upsert technician_users" ON public.technician_users;
CREATE POLICY "Allow anon upsert technician_users"
    ON public.technician_users FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_technician_users_updated_at ON public.technician_users;
CREATE TRIGGER trg_technician_users_updated_at
    BEFORE UPDATE ON public.technician_users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================================
-- End of Supabase Schema Migration Script
-- =====================================================================
