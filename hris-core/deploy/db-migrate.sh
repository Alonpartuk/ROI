#!/bin/bash
# =============================================================================
# Octup HRIS - Database Migration Script
# =============================================================================
# Executes all SQL migration files in order using psql
# Designed to run during Cloud Build deployment
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
MIGRATIONS_DIR="${MIGRATIONS_DIR:-./migrations}"
MIGRATIONS_TABLE="schema_migrations"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Functions
# -----------------------------------------------------------------------------

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check required environment variables
check_env() {
    if [[ -z "${DATABASE_URL:-}" ]]; then
        log_error "DATABASE_URL environment variable is not set"
        echo "Expected format: postgresql://user:password@host:port/database"
        echo "For Cloud SQL: postgresql://user:password@localhost/database?host=/cloudsql/PROJECT:REGION:INSTANCE"
        exit 1
    fi
    log_info "Database connection configured"
}

# Create migrations tracking table if it doesn't exist
init_migrations_table() {
    log_info "Initializing migrations tracking table..."

    psql "$DATABASE_URL" <<EOF
CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64),
    execution_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_filename
ON ${MIGRATIONS_TABLE}(filename);
EOF

    log_success "Migrations table ready"
}

# Calculate MD5 checksum of a file
get_checksum() {
    local file="$1"
    if command -v md5sum &> /dev/null; then
        md5sum "$file" | awk '{print $1}'
    elif command -v md5 &> /dev/null; then
        md5 -q "$file"
    else
        echo "no-checksum"
    fi
}

# Check if a migration has already been applied
is_migrated() {
    local filename="$1"
    local result
    result=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM ${MIGRATIONS_TABLE} WHERE filename = '${filename}';" | tr -d '[:space:]')
    [[ "$result" -gt 0 ]]
}

# Run a single migration file
run_migration() {
    local filepath="$1"
    local filename
    filename=$(basename "$filepath")
    local checksum
    checksum=$(get_checksum "$filepath")
    local start_time
    local end_time
    local execution_time

    # Skip if already migrated
    if is_migrated "$filename"; then
        log_info "Skipping $filename (already applied)"
        return 0
    fi

    log_info "Applying migration: $filename"

    # Record start time
    start_time=$(date +%s%3N)

    # Execute the migration within a transaction
    if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f "$filepath"; then
        # Record end time
        end_time=$(date +%s%3N)
        execution_time=$((end_time - start_time))

        # Record successful migration
        psql "$DATABASE_URL" -c "
            INSERT INTO ${MIGRATIONS_TABLE} (filename, checksum, execution_time_ms)
            VALUES ('${filename}', '${checksum}', ${execution_time});
        "

        log_success "Applied $filename (${execution_time}ms)"
    else
        log_error "Failed to apply migration: $filename"
        exit 1
    fi
}

# List pending migrations
list_pending() {
    log_info "Checking for pending migrations..."
    local pending=0

    for file in "$MIGRATIONS_DIR"/*.sql; do
        [[ -e "$file" ]] || continue
        local filename
        filename=$(basename "$file")
        if ! is_migrated "$filename"; then
            echo "  - $filename"
            ((pending++))
        fi
    done

    if [[ $pending -eq 0 ]]; then
        log_success "No pending migrations"
    else
        log_warning "$pending pending migration(s)"
    fi
}

# Show migration status
show_status() {
    log_info "Migration Status"
    echo ""
    psql "$DATABASE_URL" -c "
        SELECT
            filename,
            executed_at,
            execution_time_ms || 'ms' as duration
        FROM ${MIGRATIONS_TABLE}
        ORDER BY filename;
    "
}

# Run all pending migrations
run_all() {
    log_info "Starting database migrations..."
    log_info "Migrations directory: $MIGRATIONS_DIR"

    # Check if migrations directory exists
    if [[ ! -d "$MIGRATIONS_DIR" ]]; then
        log_error "Migrations directory not found: $MIGRATIONS_DIR"
        exit 1
    fi

    # Count migration files
    local count
    count=$(find "$MIGRATIONS_DIR" -name "*.sql" -type f | wc -l | tr -d '[:space:]')

    if [[ "$count" -eq 0 ]]; then
        log_warning "No SQL migration files found in $MIGRATIONS_DIR"
        exit 0
    fi

    log_info "Found $count migration file(s)"

    # Initialize migrations table
    init_migrations_table

    # Run migrations in sorted order
    local applied=0
    for file in $(find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort); do
        if run_migration "$file"; then
            ((applied++)) || true
        fi
    done

    echo ""
    log_success "Migrations complete! Applied: $applied"
}

# Rollback last migration (optional - requires manual rollback scripts)
rollback() {
    log_warning "Rollback is not implemented for raw SQL migrations"
    log_info "To rollback, manually execute the appropriate SQL and remove from ${MIGRATIONS_TABLE}"
    exit 1
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

main() {
    local command="${1:-migrate}"

    echo "=============================================="
    echo "  Octup HRIS - Database Migration Tool"
    echo "=============================================="
    echo ""

    check_env

    case "$command" in
        migrate|up)
            run_all
            ;;
        status)
            init_migrations_table
            show_status
            ;;
        pending)
            init_migrations_table
            list_pending
            ;;
        rollback|down)
            rollback
            ;;
        help|--help|-h)
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  migrate, up    Run all pending migrations (default)"
            echo "  status         Show migration history"
            echo "  pending        List pending migrations"
            echo "  rollback       Rollback last migration (not implemented)"
            echo "  help           Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  DATABASE_URL      PostgreSQL connection string (required)"
            echo "  MIGRATIONS_DIR    Path to migrations directory (default: ./migrations)"
            ;;
        *)
            log_error "Unknown command: $command"
            echo "Run '$0 help' for usage information"
            exit 1
            ;;
    esac
}

main "$@"
