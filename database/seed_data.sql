-- ============================================================================
-- PLANTAR PRESSURE ANALYSIS SYSTEM — INITIAL PRODUCTION SEED SCRIPT
-- Standard: IEC 62304 / ISO 14971
-- Target Database: PostgreSQL / Supabase
-- ============================================================================

-- 1. Insert Default Hospital Profile / Tenant
INSERT INTO public.hospital_profiles (
    id,
    code,
    name,
    address,
    contact,
    email,
    website,
    registration_no,
    department,
    default_doctor,
    default_technician,
    footer_text,
    status
) VALUES (
    'hosp-default',
    'TMH-CENTRAL',
    'Technomind Healthcare Systems',
    'Medical Innovation Center, Sector 4, Diagnostic Wing',
    '+91 (0) 44 2839 0000',
    'support@technomind.health',
    'https://technomind.health',
    'NABH-LAB-2026-9812',
    'Podiatry & Biomechanics Laboratory',
    'Dr. Specialist',
    'Clinical Operator',
    'Official Plantar Pressure Diagnostic Assessment Report · IEC 62304 Class B Certified',
    'active'
) ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = timezone('utc'::text, now());

-- 2. Insert Default Hospital Administrator Account
-- Default Master Credentials: username = admin@technomind.health (or admin), pin = 1234
INSERT INTO public.admin_accounts (
    id,
    username,
    pin,
    name,
    email,
    phone,
    hospital_id,
    hospital_name,
    role,
    status,
    max_stations_allowed
) VALUES (
    'admin-auto-01',
    'admin@technomind.health',
    '1234',
    'Hospital Administrator',
    'admin@technomind.health',
    '+91 (0) 44 2839 0001',
    'hosp-default',
    'Technomind Healthcare Systems',
    'admin',
    'active',
    1
) ON CONFLICT (username) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = timezone('utc'::text, now());

-- 3. Insert Initial Clinical Technician Voucher
-- Activation Voucher: TMH-TECH-INIT-01
INSERT INTO public.technician_users (
    id,
    username,
    pin,
    name,
    email,
    phone,
    hospital_id,
    hospital_name,
    role,
    status,
    activation_code,
    is_registered_on_device,
    permit_type,
    notes
) VALUES (
    'tech-auto-01',
    'tech@technomind.health',
    '1234',
    'Clinical Operator',
    'tech@technomind.health',
    '+91 (0) 44 2839 0002',
    'hosp-default',
    'Technomind Healthcare Systems',
    'technician',
    'active',
    'TMH-TECH-INIT-01',
    false,
    'standard',
    'Primary Clinical Operator for Plantar Pressure Scanning Terminal'
) ON CONFLICT (username) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = timezone('utc'::text, now());

-- 4. Insert Default Station Activation Record
INSERT INTO public.station_activations (
    device_fingerprint,
    device_name,
    os_platform,
    app_version,
    hospital_code,
    hospital_name,
    technician_id,
    technician_name,
    technician_email,
    status
) VALUES (
    'STATION-PRIMARY-01',
    'Main Lab Windows Scanner Station',
    'Windows 11 (Electron)',
    '1.0.79',
    'TMH-CENTRAL',
    'Technomind Healthcare Systems',
    'tech-auto-01',
    'Clinical Operator',
    'tech@technomind.health',
    'authorized'
) ON CONFLICT (device_fingerprint) DO UPDATE SET
    app_version = EXCLUDED.app_version,
    last_seen_at = timezone('utc'::text, now());

-- 5. Insert Sample Reference Normative Patient Report (Audit & Verification Set)
INSERT INTO public.clinical_reports (
    case_id,
    case_number,
    patient_id,
    patient_name,
    foot_side,
    exam_date,
    cavanagh_arch_index,
    arch_classification,
    chippaux_smirak_index,
    staheli_index,
    peak_pressure_mpa,
    pressure_category,
    risk_category,
    technician_id,
    technician_name,
    hospital_code,
    device_fingerprint,
    report_data
) VALUES (
    'case-sample-01',
    'PPA-2026-0001',
    'PP-NORM-01',
    'Clinical Benchmark Subject',
    'Bilateral',
    CURRENT_DATE,
    0.224,
    'Normal Arch',
    38.4,
    0.68,
    0.48,
    'C3',
    'Very Low Risk (Normative)',
    'tech-auto-01',
    'Clinical Operator',
    'TMH-CENTRAL',
    'STATION-PRIMARY-01',
    '{
        "indication": "Annual Diabetic Foot Screening & Biomechanical Evaluation",
        "leftFoot": { "cavanaghArchIndex": 0.221, "archType": "Normal Arch", "contactAreaCm2": 118.2 },
        "rightFoot": { "cavanaghArchIndex": 0.227, "archType": "Normal Arch", "contactAreaCm2": 119.0 },
        "bilateralAsymmetryIndex": 1.4,
        "recommendations": "Custom dual-density EVA functional orthotic shell with 4mm heel cup depth"
    }'::jsonb
) ON CONFLICT (case_id) DO NOTHING;

-- ============================================================================
-- End of Seed Script
-- ============================================================================

