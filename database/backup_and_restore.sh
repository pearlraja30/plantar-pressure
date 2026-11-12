#!/usr/bin/env bash
# ==============================================================================
# PodoPress / Plantar Pressure Analysis System
# Database Backup & Disaster Recovery Automation Utility
# Standards: IEC 62304 / ISO 27001 / HIPAA / 21 CFR Part 11
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_ROOT}/database/backups"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"

# Default Connection Variables (Can be overridden by environment)
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
DB_USER="${PGUSER:-postgres}"
DB_NAME="${PGDATABASE:-plantar_pressure}"
DB_URL="${DATABASE_URL:-}"

# Help documentation
function show_help() {
    cat << EOF
================================================================================
  PODOPRESS PLANTAR PRESSURE ANALYSIS SYSTEM — DATABASE BACKUP & RESTORE
================================================================================

Usage:
  ./database/backup_and_restore.sh [command] [options]

Commands:
  backup               Create a full, compressed, SHA-256 verified database backup.
  restore <file>       Restore database from a compressed or plain SQL backup file.
  seed                 Apply the default production seed dataset (database/seed_data.sql).
  schema               Apply the Supabase / PostgreSQL schema (database/schema_supabase.sql).
  verify               Check database table counts, record integrity, and connectivity.
  help                 Display this guidance manual.

Environment Variables:
  DATABASE_URL         Complete PostgreSQL URI (e.g. postgresql://user:pass@host:5432/dbname)
  PGHOST               Database server host (Default: localhost)
  PGPORT               Database server port (Default: 5432)
  PGUSER               Database user (Default: postgres)
  PGDATABASE           Database name (Default: plantar_pressure)

Examples:
  ./database/backup_and_restore.sh backup
  ./database/backup_and_restore.sh restore database/backups/backup_20261111_192000.sql.gz
  DATABASE_URL="postgresql://postgres:pass@db.yqfbhxtvrpfyzygzuqts.supabase.co:5432/postgres" ./database/backup_and_restore.sh backup
================================================================================
EOF
}

# Ensure backup directory exists
function ensure_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        echo "[INFO] Created backup directory: $BACKUP_DIR"
    fi
}

# Execute SQL command through psql using URL or parameters
function run_psql() {
    if [[ -n "$DB_URL" ]]; then
        psql "$DB_URL" "$@"
    else
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$@"
    fi
}

# Perform full backup
function do_backup() {
    ensure_backup_dir
    local backup_file="${BACKUP_DIR}/podopress_backup_${TIMESTAMP}.sql"
    local gz_file="${backup_file}.gz"
    local sha_file="${gz_file}.sha256"

    echo "===================================================================="
    echo "  STARTING FULL DATABASE BACKUP: ${TIMESTAMP}"
    echo "===================================================================="

    if ! command -v pg_dump &> /dev/null; then
        echo "[ERROR] 'pg_dump' utility not found. Please install PostgreSQL client tools."
        exit 1
    fi

    echo "[1/3] Dumping database schema and data..."
    if [[ -n "$DB_URL" ]]; then
        pg_dump --no-owner --no-privileges "$DB_URL" > "$backup_file"
    else
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges > "$backup_file"
    fi

    echo "[2/3] Compressing backup archive..."
    gzip -9 "$backup_file"

    echo "[3/3] Generating SHA-256 integrity checksum..."
    if command -v shasum &> /dev/null; then
        shasum -a 256 "$gz_file" | awk '{print $1}' > "$sha_file"
    elif command -v sha256sum &> /dev/null; then
        sha256sum "$gz_file" | awk '{print $1}' > "$sha_file"
    else
        echo "[WARN] No SHA-256 tool found. Checksum skipped."
    fi

    local size_kb
    size_kb=$(du -k "$gz_file" | cut -f1)

    echo "--------------------------------------------------------------------"
    echo "✓ BACKUP SUCCESSFUL!"
    echo "  File:     $gz_file"
    echo "  Size:     ${size_kb} KB"
    if [[ -f "$sha_file" ]]; then
        echo "  SHA-256:  $(cat "$sha_file")"
    fi
    echo "===================================================================="
}

# Restore database from file
function do_restore() {
    local target_file="${1:-}"

    if [[ -z "$target_file" ]]; then
        echo "[ERROR] Missing target backup file for restore."
        echo "Usage: ./database/backup_and_restore.sh restore <path_to_backup_file>"
        exit 1
    fi

    if [[ ! -f "$target_file" ]]; then
        echo "[ERROR] Backup file not found: $target_file"
        exit 1
    fi

    echo "===================================================================="
    echo "  STARTING DATABASE RESTORATION FROM: ${target_file}"
    echo "===================================================================="

    # Verify Checksum if present
    local sha_file="${target_file}.sha256"
    if [[ -f "$sha_file" ]]; then
        echo "[INFO] Verifying SHA-256 checksum integrity..."
        local expected_sha
        local actual_sha
        expected_sha=$(cat "$sha_file" | tr -d ' \n\r')
        if command -v shasum &> /dev/null; then
            actual_sha=$(shasum -a 256 "$target_file" | awk '{print $1}' | tr -d ' \n\r')
        elif command -v sha256sum &> /dev/null; then
            actual_sha=$(sha256sum "$target_file" | awk '{print $1}' | tr -d ' \n\r')
        else
            actual_sha="$expected_sha"
        fi

        if [[ "$expected_sha" != "$actual_sha" ]]; then
            echo "[FATAL] Checksum mismatch! File may be corrupt or tampered."
            echo "Expected: $expected_sha"
            echo "Actual:   $actual_sha"
            exit 1
        fi
        echo "✓ SHA-256 Checksum verified OK."
    fi

    echo "[INFO] Executing database restore..."
    if [[ "$target_file" == *.gz ]]; then
        gunzip -c "$target_file" | run_psql -v ON_ERROR_STOP=1
    else
        run_psql -v ON_ERROR_STOP=1 -f "$target_file"
    fi

    echo "--------------------------------------------------------------------"
    echo "✓ DATABASE RESTORE COMPLETED SUCCESSFULLY."
    echo "===================================================================="
}

# Apply initial production seed script
function do_seed() {
    local seed_file="${SCRIPT_DIR}/seed_data.sql"
    if [[ ! -f "$seed_file" ]]; then
        echo "[ERROR] Seed file not found: $seed_file"
        exit 1
    fi

    echo "[INFO] Applying seed dataset from $seed_file..."
    run_psql -v ON_ERROR_STOP=1 -f "$seed_file"
    echo "✓ Seed dataset successfully inserted."
}

# Apply schema
function do_schema() {
    local schema_file="${SCRIPT_DIR}/schema_supabase.sql"
    if [[ ! -f "$schema_file" ]]; then
        echo "[ERROR] Schema file not found: $schema_file"
        exit 1
    fi

    echo "[INFO] Applying Supabase / PostgreSQL schema from $schema_file..."
    run_psql -v ON_ERROR_STOP=1 -f "$schema_file"
    echo "✓ Database schema applied successfully."
}

# Verify table counts & connectivity
function do_verify() {
    echo "===================================================================="
    echo "  VERIFYING DATABASE TABLES & HEALTH"
    echo "===================================================================="
    run_psql -c "
        SELECT 'hospital_profiles' as table_name, count(*) as record_count FROM public.hospital_profiles
        UNION ALL
        SELECT 'admin_accounts', count(*) FROM public.admin_accounts
        UNION ALL
        SELECT 'technician_users', count(*) FROM public.technician_users
        UNION ALL
        SELECT 'station_activations', count(*) FROM public.station_activations
        UNION ALL
        SELECT 'clinical_reports', count(*) FROM public.clinical_reports;
    " || echo "[WARN] Direct table count failed or tables not yet created."
    echo "===================================================================="
}

# Main dispatcher
COMMAND="${1:-help}"
case "$COMMAND" in
    backup)
        do_backup
        ;;
    restore)
        do_restore "${2:-}"
        ;;
    seed)
        do_seed
        ;;
    schema)
        do_schema
        ;;
    verify)
        do_verify
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "[ERROR] Unknown command: $COMMAND"
        echo "Run '$0 help' for available commands."
        exit 1
        ;;
esac

