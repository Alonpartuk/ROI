-- ============================================================================
-- GLOBAL HRIS CORE SCHEMA
-- Effective Dating Pattern (Temporal Data Model)
-- ============================================================================
--
-- EFFECTIVE DATING LOGIC (Workday/HiBob Pattern):
-- -----------------------------------------------
-- Each temporal record has:
--   - effective_date: When this version becomes active
--   - end_date: When this version expires (NULL = current/future)
--   - created_at: Audit timestamp
--   - created_by: Audit user
--
-- To query "as of" a specific date:
--   WHERE effective_date <= target_date
--     AND (end_date IS NULL OR end_date > target_date)
--
-- To schedule future changes: Insert with future effective_date
-- To view history: Query all records for an entity, ordered by effective_date
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ROLES
-- ============================================================================
-- Application roles for Row Level Security policies
-- These are PostgreSQL roles that map to application user types

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hr_role') THEN
        CREATE ROLE hr_role NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'manager_role') THEN
        CREATE ROLE manager_role NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'employee_role') THEN
        CREATE ROLE employee_role NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'finance_role') THEN
        CREATE ROLE finance_role NOLOGIN;
    END IF;
END $$;

-- Grant the application user membership in these roles
-- The app will SET ROLE based on the authenticated user's permissions
GRANT hr_role, manager_role, employee_role, finance_role TO hris_app;

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE employment_type AS ENUM ('full_time', 'part_time', 'contractor', 'intern', 'consultant');
CREATE TYPE work_model AS ENUM ('remote', 'hybrid', 'onsite');
CREATE TYPE employment_status AS ENUM ('active', 'on_leave', 'terminated', 'pending_start');
CREATE TYPE salary_frequency AS ENUM ('annual', 'monthly', 'hourly', 'daily');
CREATE TYPE salary_change_reason AS ENUM ('hire', 'promotion', 'merit', 'market_adjustment', 'role_change', 'correction', 'cost_of_living');
CREATE TYPE vesting_type AS ENUM ('linear', 'milestone', 'cliff_then_linear', 'custom');
CREATE TYPE equity_grant_type AS ENUM ('iso', 'nso', 'rsu', 'phantom');
CREATE TYPE document_visibility AS ENUM ('private_hr', 'private_employee', 'manager_visible', 'public');
CREATE TYPE document_category AS ENUM ('contract', 'performance_review', 'tax_form', 'certification', 'policy_acknowledgment', 'other');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Locations / Legal Entities
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,           -- 'TLV', 'TOR', 'US'
    name VARCHAR(100) NOT NULL,
    country_code CHAR(2) NOT NULL,              -- ISO 3166-1 alpha-2
    timezone VARCHAR(50) NOT NULL,
    default_currency CHAR(3) NOT NULL,          -- ISO 4217
    legal_entity_name VARCHAR(200),
    config JSONB NOT NULL DEFAULT '{}',         -- Location-specific config
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES departments(id),
    location_id UUID REFERENCES locations(id),
    cost_center VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Levels / Bands
CREATE TABLE job_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,           -- 'IC1', 'IC2', 'M1', etc.
    name VARCHAR(50) NOT NULL,                  -- 'Junior', 'Senior', 'Staff', etc.
    track VARCHAR(20) NOT NULL,                 -- 'individual_contributor', 'management'
    rank INTEGER NOT NULL,                      -- For ordering/comparison
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Titles
CREATE TABLE job_titles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    department_id UUID REFERENCES departments(id),
    default_level_id UUID REFERENCES job_levels(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EMPLOYEE CORE (Non-temporal base record)
-- ============================================================================

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_number VARCHAR(20) UNIQUE NOT NULL,    -- Human-readable ID

    -- Immutable personal data
    legal_first_name VARCHAR(100) NOT NULL,
    legal_last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,

    -- Preferred name (can change but not temporal)
    preferred_first_name VARCHAR(100),
    preferred_last_name VARCHAR(100),

    -- Contact
    personal_email VARCHAR(255),
    work_email VARCHAR(255) UNIQUE,
    phone VARCHAR(30),

    -- Original hire info (immutable)
    original_hire_date DATE NOT NULL,

    -- Current status (denormalized for quick queries)
    current_status employment_status DEFAULT 'pending_start',

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    -- Soft delete
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_employees_number ON employees(employee_number);
CREATE INDEX idx_employees_work_email ON employees(work_email);
CREATE INDEX idx_employees_status ON employees(current_status) WHERE NOT is_deleted;

-- ============================================================================
-- EFFECTIVE-DATED TABLES (Temporal Records)
-- ============================================================================

-- Employment Records (Position, Department, Manager, etc.)
-- This is the core "effective dated" table for employment changes
CREATE TABLE employment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id),

    -- Effective dating
    effective_date DATE NOT NULL,
    end_date DATE,                              -- NULL = current/future

    -- Employment details
    employment_type employment_type NOT NULL,
    work_model work_model NOT NULL,
    status employment_status NOT NULL,

    -- Position
    job_title_id UUID REFERENCES job_titles(id),
    job_level_id UUID REFERENCES job_levels(id),
    department_id UUID REFERENCES departments(id),
    location_id UUID REFERENCES locations(id),

    -- Reporting
    manager_id UUID REFERENCES employees(id),

    -- Work schedule
    fte_percentage DECIMAL(5,2) DEFAULT 100.00, -- Full-time equivalent
    weekly_hours DECIMAL(4,1),

    -- Change tracking
    change_reason TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    approved_by UUID,
    approved_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT employment_dates_valid CHECK (end_date IS NULL OR end_date > effective_date),
    CONSTRAINT fte_valid CHECK (fte_percentage > 0 AND fte_percentage <= 100)
);

CREATE INDEX idx_employment_employee ON employment_records(employee_id);
CREATE INDEX idx_employment_effective ON employment_records(employee_id, effective_date);
CREATE INDEX idx_employment_current ON employment_records(employee_id)
    WHERE end_date IS NULL;
CREATE INDEX idx_employment_manager ON employment_records(manager_id)
    WHERE end_date IS NULL;

-- ============================================================================
-- SALARY ENGINE (Multi-Currency)
-- ============================================================================

CREATE TABLE salary_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id),

    -- Effective dating
    effective_date DATE NOT NULL,
    end_date DATE,

    -- Compensation
    amount DECIMAL(15,2) NOT NULL,
    currency CHAR(3) NOT NULL,                  -- ISO 4217: USD, ILS, CAD
    frequency salary_frequency NOT NULL,

    -- Annualized amount (computed for comparison)
    annualized_amount DECIMAL(15,2) NOT NULL,
    annualized_currency CHAR(3) NOT NULL,       -- Normalized to USD for reporting
    exchange_rate_used DECIMAL(10,6),

    -- Change context
    reason salary_change_reason NOT NULL,
    reason_notes TEXT,

    -- Related employment record (for context)
    employment_record_id UUID REFERENCES employment_records(id),

    -- Approval workflow
    proposed_by UUID,
    approved_by UUID,
    approved_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    CONSTRAINT salary_positive CHECK (amount > 0),
    CONSTRAINT salary_dates_valid CHECK (end_date IS NULL OR end_date > effective_date)
);

CREATE INDEX idx_salary_employee ON salary_records(employee_id);
CREATE INDEX idx_salary_effective ON salary_records(employee_id, effective_date);
CREATE INDEX idx_salary_current ON salary_records(employee_id) WHERE end_date IS NULL;

-- Salary Bands (for benchmarking)
CREATE TABLE salary_bands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_level_id UUID REFERENCES job_levels(id),
    location_id UUID REFERENCES locations(id),

    currency CHAR(3) NOT NULL,
    min_amount DECIMAL(15,2) NOT NULL,
    mid_amount DECIMAL(15,2) NOT NULL,
    max_amount DECIMAL(15,2) NOT NULL,

    effective_date DATE NOT NULL,
    end_date DATE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EQUITY / OPTIONS VAULT
-- ============================================================================

-- Equity Plans (company-level)
CREATE TABLE equity_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    plan_type equity_grant_type NOT NULL,

    -- Plan limits
    total_pool_shares BIGINT NOT NULL,
    allocated_shares BIGINT DEFAULT 0,

    -- Default terms
    default_vesting_type vesting_type DEFAULT 'cliff_then_linear',
    default_cliff_months INTEGER DEFAULT 12,
    default_vesting_months INTEGER DEFAULT 48,

    -- Plan dates
    effective_date DATE NOT NULL,
    expiration_date DATE,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equity Grants (individual grants to employees)
CREATE TABLE equity_grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    equity_plan_id UUID NOT NULL REFERENCES equity_plans(id),

    -- Grant details
    grant_number VARCHAR(30) UNIQUE NOT NULL,
    grant_date DATE NOT NULL,
    grant_type equity_grant_type NOT NULL,

    -- Shares
    shares_granted BIGINT NOT NULL,
    exercise_price DECIMAL(10,4),               -- For options; NULL for RSUs
    fair_market_value DECIMAL(10,4),            -- FMV at grant date

    -- Vesting schedule
    vesting_type vesting_type NOT NULL,
    vesting_start_date DATE NOT NULL,
    cliff_months INTEGER,                        -- NULL if no cliff
    total_vesting_months INTEGER NOT NULL,

    -- Milestone vesting (if applicable)
    milestone_config JSONB,                      -- Custom milestone definitions

    -- Status
    shares_vested BIGINT DEFAULT 0,
    shares_exercised BIGINT DEFAULT 0,
    shares_forfeited BIGINT DEFAULT 0,

    -- Termination handling
    post_termination_exercise_months INTEGER DEFAULT 3,

    -- Dates
    expiration_date DATE,
    early_exercise_allowed BOOLEAN DEFAULT false,

    -- Approval
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    board_approval_date DATE,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    CONSTRAINT shares_valid CHECK (shares_granted > 0),
    CONSTRAINT vesting_months_valid CHECK (total_vesting_months > 0)
);

CREATE INDEX idx_grants_employee ON equity_grants(employee_id);
CREATE INDEX idx_grants_plan ON equity_grants(equity_plan_id);
CREATE INDEX idx_grants_vesting ON equity_grants(vesting_start_date);

-- Vesting Events (actual vesting occurrences)
CREATE TABLE vesting_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grant_id UUID NOT NULL REFERENCES equity_grants(id),

    vesting_date DATE NOT NULL,
    shares_vested BIGINT NOT NULL,

    -- For milestone vesting
    milestone_id VARCHAR(50),
    milestone_description TEXT,

    -- Status
    is_scheduled BOOLEAN DEFAULT true,          -- true = future, false = occurred
    processed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vesting_grant ON vesting_events(grant_id);
CREATE INDEX idx_vesting_date ON vesting_events(vesting_date) WHERE is_scheduled;

-- Exercise Events (option exercises)
CREATE TABLE exercise_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grant_id UUID NOT NULL REFERENCES equity_grants(id),

    exercise_date DATE NOT NULL,
    shares_exercised BIGINT NOT NULL,
    exercise_price DECIMAL(10,4) NOT NULL,
    fair_market_value DECIMAL(10,4) NOT NULL,

    -- Tax withholding
    tax_withholding_amount DECIMAL(15,2),
    tax_withholding_currency CHAR(3),

    -- Payment
    payment_method VARCHAR(50),
    total_cost DECIMAL(15,2) NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- ============================================================================
-- DOCUMENT MANAGEMENT
-- ============================================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id),

    -- Document info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category document_category NOT NULL,

    -- Storage
    storage_path VARCHAR(500) NOT NULL,         -- S3 path or similar
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT,
    checksum VARCHAR(64),                        -- SHA-256

    -- Access control
    visibility document_visibility NOT NULL,

    -- Effective dating (for versioned documents like contracts)
    effective_date DATE,
    expiration_date DATE,

    -- Metadata
    metadata JSONB DEFAULT '{}',                 -- Flexible additional data
    tags TEXT[],

    -- Workflow
    requires_acknowledgment BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMPTZ,

    -- Audit
    uploaded_by UUID NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),

    -- Soft delete
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

CREATE INDEX idx_documents_employee ON documents(employee_id) WHERE NOT is_deleted;
CREATE INDEX idx_documents_category ON documents(category) WHERE NOT is_deleted;
CREATE INDEX idx_documents_visibility ON documents(visibility) WHERE NOT is_deleted;

-- Document Access Log (audit trail)
CREATE TABLE document_access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id),
    accessed_by UUID NOT NULL,
    access_type VARCHAR(20) NOT NULL,           -- 'view', 'download', 'share'
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Document Access Overrides (for special permissions)
CREATE TABLE document_access_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id),
    user_id UUID NOT NULL,
    can_view BOOLEAN DEFAULT false,
    can_download BOOLEAN DEFAULT false,
    granted_by UUID NOT NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    reason TEXT
);

-- ============================================================================
-- LOCALIZATION DATA
-- ============================================================================

-- Country-specific employee fields
CREATE TABLE employee_local_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    location_id UUID NOT NULL REFERENCES locations(id),

    -- Effective dating
    effective_date DATE NOT NULL,
    end_date DATE,

    -- Flexible local data storage
    local_fields JSONB NOT NULL,                -- Country-specific fields

    -- Common fields that vary by location
    tax_id VARCHAR(50),                          -- SSN (US), SIN (CA), Teudat Zehut (IL)
    tax_id_type VARCHAR(30),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,

    CONSTRAINT local_dates_valid CHECK (end_date IS NULL OR end_date > effective_date)
);

CREATE INDEX idx_local_data_employee ON employee_local_data(employee_id);
CREATE UNIQUE INDEX idx_local_data_current ON employee_local_data(employee_id, location_id)
    WHERE end_date IS NULL;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Current employment status (as of today)
CREATE OR REPLACE VIEW v_current_employment AS
SELECT
    e.id AS employee_id,
    e.employee_number,
    COALESCE(e.preferred_first_name, e.legal_first_name) AS first_name,
    COALESCE(e.preferred_last_name, e.legal_last_name) AS last_name,
    e.work_email,
    er.employment_type,
    er.work_model,
    er.status,
    jt.name AS job_title,
    jl.name AS job_level,
    jl.code AS level_code,
    d.name AS department,
    l.name AS location,
    l.code AS location_code,
    mgr.employee_number AS manager_number,
    COALESCE(mgr.preferred_first_name, mgr.legal_first_name) || ' ' ||
        COALESCE(mgr.preferred_last_name, mgr.legal_last_name) AS manager_name,
    er.effective_date AS position_since,
    e.original_hire_date
FROM employees e
JOIN employment_records er ON e.id = er.employee_id
    AND er.effective_date <= CURRENT_DATE
    AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
LEFT JOIN job_titles jt ON er.job_title_id = jt.id
LEFT JOIN job_levels jl ON er.job_level_id = jl.id
LEFT JOIN departments d ON er.department_id = d.id
LEFT JOIN locations l ON er.location_id = l.id
LEFT JOIN employees mgr ON er.manager_id = mgr.id
WHERE NOT e.is_deleted;

-- Current salary view
CREATE OR REPLACE VIEW v_current_salary AS
SELECT
    e.id AS employee_id,
    e.employee_number,
    sr.amount,
    sr.currency,
    sr.frequency,
    sr.annualized_amount,
    sr.annualized_currency,
    sr.reason AS last_change_reason,
    sr.effective_date AS salary_since
FROM employees e
JOIN salary_records sr ON e.id = sr.employee_id
    AND sr.effective_date <= CURRENT_DATE
    AND (sr.end_date IS NULL OR sr.end_date > CURRENT_DATE)
WHERE NOT e.is_deleted;

-- Equity summary view
CREATE OR REPLACE VIEW v_equity_summary AS
SELECT
    eg.employee_id,
    eg.grant_number,
    eg.grant_type,
    eg.grant_date,
    eg.shares_granted,
    eg.shares_vested,
    eg.shares_exercised,
    eg.shares_forfeited,
    (eg.shares_granted - eg.shares_vested - eg.shares_forfeited) AS shares_unvested,
    (eg.shares_vested - eg.shares_exercised) AS shares_exercisable,
    eg.exercise_price,
    eg.vesting_type,
    eg.vesting_start_date,
    eg.cliff_months,
    eg.total_vesting_months,
    -- Next vesting date calculation
    (SELECT MIN(ve.vesting_date)
     FROM vesting_events ve
     WHERE ve.grant_id = eg.id
       AND ve.vesting_date > CURRENT_DATE
       AND ve.is_scheduled) AS next_vesting_date,
    -- Next vesting shares
    (SELECT ve.shares_vested
     FROM vesting_events ve
     WHERE ve.grant_id = eg.id
       AND ve.vesting_date > CURRENT_DATE
       AND ve.is_scheduled
     ORDER BY ve.vesting_date LIMIT 1) AS next_vesting_shares
FROM equity_grants eg;

-- ============================================================================
-- FUNCTIONS FOR EFFECTIVE DATING
-- ============================================================================

-- Get employment record as of a specific date
CREATE OR REPLACE FUNCTION get_employment_as_of(
    p_employee_id UUID,
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    employment_type employment_type,
    work_model work_model,
    status employment_status,
    job_title VARCHAR,
    job_level VARCHAR,
    department VARCHAR,
    location VARCHAR,
    manager_id UUID,
    effective_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        er.employment_type,
        er.work_model,
        er.status,
        jt.name::VARCHAR,
        jl.name::VARCHAR,
        d.name::VARCHAR,
        l.name::VARCHAR,
        er.manager_id,
        er.effective_date
    FROM employment_records er
    LEFT JOIN job_titles jt ON er.job_title_id = jt.id
    LEFT JOIN job_levels jl ON er.job_level_id = jl.id
    LEFT JOIN departments d ON er.department_id = d.id
    LEFT JOIN locations l ON er.location_id = l.id
    WHERE er.employee_id = p_employee_id
      AND er.effective_date <= p_as_of_date
      AND (er.end_date IS NULL OR er.end_date > p_as_of_date);
END;
$$ LANGUAGE plpgsql;

-- Get full employee timeline
CREATE OR REPLACE FUNCTION get_employee_timeline(p_employee_id UUID)
RETURNS TABLE (
    event_type VARCHAR,
    event_date DATE,
    description TEXT,
    details JSONB
) AS $$
BEGIN
    RETURN QUERY
    -- Employment changes
    SELECT
        'employment'::VARCHAR AS event_type,
        er.effective_date AS event_date,
        CASE
            WHEN er.change_reason IS NOT NULL THEN er.change_reason
            ELSE 'Employment record'
        END AS description,
        jsonb_build_object(
            'employment_type', er.employment_type,
            'work_model', er.work_model,
            'status', er.status,
            'job_title_id', er.job_title_id,
            'department_id', er.department_id
        ) AS details
    FROM employment_records er
    WHERE er.employee_id = p_employee_id

    UNION ALL

    -- Salary changes
    SELECT
        'salary'::VARCHAR,
        sr.effective_date,
        sr.reason::TEXT || ': ' || sr.amount::TEXT || ' ' || sr.currency,
        jsonb_build_object(
            'amount', sr.amount,
            'currency', sr.currency,
            'frequency', sr.frequency,
            'reason', sr.reason
        )
    FROM salary_records sr
    WHERE sr.employee_id = p_employee_id

    UNION ALL

    -- Equity grants
    SELECT
        'equity_grant'::VARCHAR,
        eg.grant_date,
        'Granted ' || eg.shares_granted::TEXT || ' shares (' || eg.grant_type::TEXT || ')',
        jsonb_build_object(
            'grant_number', eg.grant_number,
            'shares', eg.shares_granted,
            'grant_type', eg.grant_type,
            'exercise_price', eg.exercise_price
        )
    FROM equity_grants eg
    WHERE eg.employee_id = p_employee_id

    UNION ALL

    -- Vesting events (past only)
    SELECT
        'vesting'::VARCHAR,
        ve.vesting_date,
        'Vested ' || ve.shares_vested::TEXT || ' shares',
        jsonb_build_object(
            'shares_vested', ve.shares_vested,
            'grant_id', ve.grant_id
        )
    FROM vesting_events ve
    JOIN equity_grants eg ON ve.grant_id = eg.id
    WHERE eg.employee_id = p_employee_id
      AND NOT ve.is_scheduled

    ORDER BY event_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Calculate next vesting date for an employee
CREATE OR REPLACE FUNCTION calculate_next_vesting_date(p_employee_id UUID)
RETURNS TABLE (
    grant_id UUID,
    grant_number VARCHAR,
    next_vesting_date DATE,
    shares_to_vest BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (eg.id)
        eg.id AS grant_id,
        eg.grant_number,
        ve.vesting_date AS next_vesting_date,
        ve.shares_vested AS shares_to_vest
    FROM equity_grants eg
    JOIN vesting_events ve ON eg.id = ve.grant_id
    WHERE eg.employee_id = p_employee_id
      AND ve.vesting_date > CURRENT_DATE
      AND ve.is_scheduled
    ORDER BY eg.id, ve.vesting_date;
END;
$$ LANGUAGE plpgsql;

-- Insert new employment record (handles end-dating previous record)
CREATE OR REPLACE FUNCTION insert_employment_record(
    p_employee_id UUID,
    p_effective_date DATE,
    p_employment_type employment_type,
    p_work_model work_model,
    p_status employment_status,
    p_job_title_id UUID,
    p_job_level_id UUID,
    p_department_id UUID,
    p_location_id UUID,
    p_manager_id UUID,
    p_change_reason TEXT,
    p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_new_id UUID;
BEGIN
    -- End-date any overlapping future records
    UPDATE employment_records
    SET end_date = p_effective_date
    WHERE employee_id = p_employee_id
      AND effective_date < p_effective_date
      AND (end_date IS NULL OR end_date > p_effective_date);

    -- Insert new record
    INSERT INTO employment_records (
        employee_id, effective_date, employment_type, work_model, status,
        job_title_id, job_level_id, department_id, location_id, manager_id,
        change_reason, created_by
    ) VALUES (
        p_employee_id, p_effective_date, p_employment_type, p_work_model, p_status,
        p_job_title_id, p_job_level_id, p_department_id, p_location_id, p_manager_id,
        p_change_reason, p_created_by
    )
    RETURNING id INTO v_new_id;

    -- Update employee's current status if effective today or past
    IF p_effective_date <= CURRENT_DATE THEN
        UPDATE employees SET current_status = p_status, updated_at = NOW()
        WHERE id = p_employee_id;
    END IF;

    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql;

-- Generate vesting schedule for a grant
CREATE OR REPLACE FUNCTION generate_vesting_schedule(p_grant_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_grant RECORD;
    v_vesting_date DATE;
    v_shares_per_period BIGINT;
    v_remaining_shares BIGINT;
    v_period INTEGER;
    v_events_created INTEGER := 0;
BEGIN
    SELECT * INTO v_grant FROM equity_grants WHERE id = p_grant_id;

    IF v_grant.vesting_type = 'cliff_then_linear' THEN
        -- Cliff vesting
        IF v_grant.cliff_months IS NOT NULL AND v_grant.cliff_months > 0 THEN
            v_vesting_date := v_grant.vesting_start_date + (v_grant.cliff_months || ' months')::INTERVAL;
            v_shares_per_period := v_grant.shares_granted * v_grant.cliff_months / v_grant.total_vesting_months;

            INSERT INTO vesting_events (grant_id, vesting_date, shares_vested)
            VALUES (p_grant_id, v_vesting_date, v_shares_per_period);
            v_events_created := v_events_created + 1;

            v_remaining_shares := v_grant.shares_granted - v_shares_per_period;
            v_period := v_grant.cliff_months + 1;
        ELSE
            v_remaining_shares := v_grant.shares_granted;
            v_period := 1;
        END IF;

        -- Monthly vesting after cliff
        v_shares_per_period := v_remaining_shares / (v_grant.total_vesting_months - COALESCE(v_grant.cliff_months, 0));

        WHILE v_period <= v_grant.total_vesting_months LOOP
            v_vesting_date := v_grant.vesting_start_date + (v_period || ' months')::INTERVAL;

            INSERT INTO vesting_events (grant_id, vesting_date, shares_vested)
            VALUES (p_grant_id, v_vesting_date, v_shares_per_period);
            v_events_created := v_events_created + 1;

            v_period := v_period + 1;
        END LOOP;

    ELSIF v_grant.vesting_type = 'linear' THEN
        -- Simple linear vesting (monthly)
        v_shares_per_period := v_grant.shares_granted / v_grant.total_vesting_months;

        FOR v_period IN 1..v_grant.total_vesting_months LOOP
            v_vesting_date := v_grant.vesting_start_date + (v_period || ' months')::INTERVAL;

            INSERT INTO vesting_events (grant_id, vesting_date, shares_vested)
            VALUES (p_grant_id, v_vesting_date, v_shares_per_period);
            v_events_created := v_events_created + 1;
        END LOOP;
    END IF;

    RETURN v_events_created;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW-LEVEL SECURITY FOR DOCUMENTS
-- ============================================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: HR can see all documents
CREATE POLICY documents_hr_full_access ON documents
    FOR ALL
    TO hr_role
    USING (true);

-- Policy: Employees can see their own private_employee and public docs
CREATE POLICY documents_employee_own ON documents
    FOR SELECT
    TO employee_role
    USING (
        employee_id = current_setting('app.current_employee_id')::UUID
        AND visibility IN ('private_employee', 'public')
    );

-- Policy: Managers can see manager_visible and public docs for their reports
CREATE POLICY documents_manager_reports ON documents
    FOR SELECT
    TO manager_role
    USING (
        visibility IN ('manager_visible', 'public')
        AND employee_id IN (
            SELECT er.employee_id
            FROM employment_records er
            WHERE er.manager_id = current_setting('app.current_employee_id')::UUID
              AND er.effective_date <= CURRENT_DATE
              AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update employee's updated_at on any related change
CREATE OR REPLACE FUNCTION update_employee_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE employees SET updated_at = NOW() WHERE id = NEW.employee_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employment_update_employee
    AFTER INSERT OR UPDATE ON employment_records
    FOR EACH ROW EXECUTE FUNCTION update_employee_timestamp();

CREATE TRIGGER trg_salary_update_employee
    AFTER INSERT OR UPDATE ON salary_records
    FOR EACH ROW EXECUTE FUNCTION update_employee_timestamp();

-- Auto-generate vesting schedule on grant insert
CREATE OR REPLACE FUNCTION auto_generate_vesting()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM generate_vesting_schedule(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_grant_generate_vesting
    AFTER INSERT ON equity_grants
    FOR EACH ROW EXECUTE FUNCTION auto_generate_vesting();
