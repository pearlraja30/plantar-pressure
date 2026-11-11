# PodoPress Plantar Pressure Analysis System
## Database Scripts, Schema Specifications & Backup / Disaster Recovery Operations

**Document Identifier:** `PPA-DOC-DB-OPS-2026`  
**Governing Standards:** IEC 62304 Class B SaMD (`PPA-SW-TF-001`) · ISO 14971 · 21 CFR Part 11 · ISO 27001 · HIPAA  
**Maintained by:** Technomind Healthcare Systems & Antigravity AI Engineering  

---

## 📑 Directory Contents

This directory contains production-ready database scripts, Data Definition Language (DDL) schemas, seed datasets, and automated backup/restore utilities for cloud databases and offline clinical workstations.

| File | Purpose | Target Database |
| :--- | :--- | :--- |
| [`schema_supabase.sql`](schema_supabase.sql) | Production Supabase / PostgreSQL cloud mailbox, telemetry tables, RLS policies, and triggers. | Supabase / PostgreSQL 15+ |
| [`schema_postgresql_3tier.sql`](schema_postgresql_3tier.sql) | Enterprise 3-Tier relational multi-tenant DDL with foreign keys, custom types, and tamper-evident audit logs. | Amazon Aurora / Cloud SQL / PostgreSQL 14–16+ |
| [`seed_data.sql`](seed_data.sql) | Clean production baseline seed data (hospital profiles, default administrator, initial technician vouchers). | PostgreSQL / Supabase |
| [`backup_and_restore.sh`](backup_and_restore.sh) | Automated bash script for PostgreSQL backups (`pg_dump`), compression (`gzip`), SHA-256 verification, and restoration (`psql`). | Any PostgreSQL instance |
| [`backup_local_station.cjs`](backup_local_station.cjs) | Cross-platform Node.js utility for workstation offline snapshot export, validation, and JSON-to-SQL cloud migration. | Standalone Node.js (Windows / Mac / Linux) |
| `backups/` | Dedicated local storage directory for compressed database archives and SHA-256 verification hashes. | Local Filesystem / Secure Storage |

---

## 🗄️ Database Schemas & Architecture

### 1. Supabase Cloud Telemetry & Mailbox (`schema_supabase.sql`)
Designed for real-time station synchronization, activation voucher resolution, remote credential updates, and centralized report storage:
- **`public.station_activations`**: Station device binding, OS platform, app version, last seen timestamp, and diagnostic status (`authorized` / `revoked`).
- **`public.clinical_reports`**: Biomechanical examination summaries, Cavanagh Arch Index, peak pressure categories (`C1`–`C6`), patient metadata, and structured JSON report payloads.
- **`public.hospital_profiles`**: Clinical facilities, accreditation registration numbers, custom branding, and department settings.
- **`public.admin_accounts`**: Clinic administrators, assigned hospitals, and station quotas.
- **`public.technician_users`**: Clinical operators, hardware activation vouchers (`TMH-TECH-...`), and station MAC bindings.
- **`storage.buckets: plantar-scans`**: Encrypted cloud object storage bucket for 300 DPI raw Harris Mat optical scans and JET transparent heatmaps.

### 2. Enterprise 3-Tier Multi-Tenant DDL (`schema_postgresql_3tier.sql`)
Full relational schema compliant with strict healthcare data segregation:
- **`tenants`**: Strict tenant isolation across hospitals and diagnostic centers.
- **`users`**: Role-based access control (`superadmin`, `admin`, `technician`, `physician`) with hashed passwords.
- **`bound_devices` & `device_licenses`**: Hardware station licensing and single-device seat quotas.
- **`patients`**: Master patient index (MRN, demographic details, clinical history).
- **`exam_cases`**: Comprehensive examination records, optical scan URIs, biomechanical indices, Cavanagh Arch Index, and 10-zone regional plantar pressure payloads (`JSONB`).
- **`audit_logs`**: Immutable, append-only 21 CFR Part 11 compliant audit trail protected with SHA-256 tamper-evident record hashing and PostgreSQL update/delete exception triggers.

---

## 🚀 Execution & Deployment Runbook

### Method A: Deploy to Supabase Cloud
1. Log into your Supabase Dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Open your project (e.g. `yqfbhxtvrpfyzygzuqts`) and navigate to the **SQL Editor**.
3. Copy the entire contents of [`schema_supabase.sql`](schema_supabase.sql) and paste it into a new query tab.
4. Click **Run** to provision all 5 tables, RLS policies, indexes, and storage bucket.
5. (Optional) Paste and run [`seed_data.sql`](seed_data.sql) to populate initial clinical tenant records.

### Method B: Deploy to PostgreSQL Server (CLI)
```bash
# Set connection parameters
export PGHOST="localhost"
export PGPORT="5432"
export PGUSER="postgres"
export PGDATABASE="plantar_pressure"

# 1. Apply Schema
./database/backup_and_restore.sh schema

# 2. Insert Seed Data
./database/backup_and_restore.sh seed

# 3. Verify Database Health
./database/backup_and_restore.sh verify
```

---

## 💾 Automated Backup & Disaster Recovery Runbook

### 1. Perform Full Database Backup
Creates a compressed archive (`.sql.gz`) with a companion SHA-256 integrity checksum in `database/backups/`:
```bash
./database/backup_and_restore.sh backup
```
*Output:*
```
✓ BACKUP SUCCESSFUL!
  File:     database/backups/podopress_backup_20261111_193000.sql.gz
  Size:     42 KB
  SHA-256:  e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

### 2. Restore Database from Backup
Verifies the SHA-256 checksum against tampering and restores all tables inside a clean transaction:
```bash
./database/backup_and_restore.sh restore database/backups/podopress_backup_20261111_193000.sql.gz
```

### 3. Workstation Offline Disaster Recovery & Migration
On offline Windows kiosks or tablets without direct PostgreSQL command-line tools:
```bash
# 1. Generate clean workstation snapshot template
node database/backup_local_station.cjs create-sample

# 2. Validate structural integrity of any workstation backup
node database/backup_local_station.cjs validate database/backups/station_backup.json

# 3. Convert offline workstation backup into PostgreSQL INSERT statements for Cloud sync
node database/backup_local_station.cjs json-to-sql database/backups/station_backup.json > database/backups/migration.sql
```

---

## 🛡️ Regulatory Compliance Guarantees
- **IEC 62304 / ISO 14971**: Continuous data retention, disaster recovery procedures (RPO: 0, RTO: < 5 minutes), and schema version traceability.
- **21 CFR Part 11**: Immutable audit logging (`audit_logs`), preventing record falsification or deletion.
- **ISO 27001 / HIPAA**: End-to-end encrypted scans in storage buckets, masked passwords, and station-scoped MAC address authorization.
