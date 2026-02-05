-- ============================================================================
-- RBAC & ROW-LEVEL SECURITY IMPLEMENTATION
-- ============================================================================
--
-- ROLE HIERARCHY:
-- ---------------
-- HR_Admin    → Full access to all data including salary, equity, documents
-- Manager     → View direct reports' profiles, limited salary/equity access
-- Employee    → Own profile, own documents only
--
-- PERMISSION MODEL:
-- -----------------
-- Permissions are attribute-based (ABAC) combined with role-based (RBAC)
-- Access decisions consider: role + relationship (manager_id) + data sensitivity
-- ============================================================================

-- ============================================================================
-- ROLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,  -- Cannot be deleted
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert system roles
INSERT INTO roles (name, description, is_system_role) VALUES
    ('hr_admin', 'Full HR access including compensation and equity data', true),
    ('manager', 'Access to direct reports profiles and limited compensation data', true),
    ('employee', 'Access to own profile and documents only', true),
    ('finance', 'Read-only access to compensation data for payroll', true),
    ('executive', 'High-level access to org-wide metrics and reports', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- PERMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource VARCHAR(50) NOT NULL,          -- 'employees', 'salary', 'equity', 'documents'
    action VARCHAR(20) NOT NULL,            -- 'read', 'write', 'delete', 'admin'
    scope VARCHAR(20) NOT NULL,             -- 'own', 'reports', 'department', 'all'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(resource, action, scope)
);

-- Insert permissions
INSERT INTO permissions (resource, action, scope, description) VALUES
    -- Employee profile permissions
    ('employees', 'read', 'own', 'Read own profile'),
    ('employees', 'read', 'reports', 'Read direct reports profiles'),
    ('employees', 'read', 'department', 'Read department members profiles'),
    ('employees', 'read', 'all', 'Read all employee profiles'),
    ('employees', 'write', 'own', 'Update own profile (limited fields)'),
    ('employees', 'write', 'reports', 'Update direct reports profiles'),
    ('employees', 'write', 'all', 'Update any employee profile'),
    ('employees', 'admin', 'all', 'Full admin access to employees'),

    -- Salary permissions
    ('salary', 'read', 'own', 'View own salary'),
    ('salary', 'read', 'reports', 'View direct reports salary (with authorization)'),
    ('salary', 'read', 'all', 'View all salary data'),
    ('salary', 'write', 'all', 'Modify salary records'),

    -- Equity permissions
    ('equity', 'read', 'own', 'View own equity grants'),
    ('equity', 'read', 'all', 'View all equity data'),
    ('equity', 'write', 'all', 'Modify equity grants'),

    -- Document permissions
    ('documents', 'read', 'own', 'Read own documents'),
    ('documents', 'read', 'reports', 'Read reports documents (based on visibility)'),
    ('documents', 'read', 'all', 'Read all documents'),
    ('documents', 'write', 'own', 'Upload own documents'),
    ('documents', 'write', 'all', 'Manage all documents'),

    -- Reports permissions
    ('reports', 'read', 'department', 'View department reports'),
    ('reports', 'read', 'all', 'View all organizational reports'),

    -- Onboarding permissions
    ('onboarding', 'read', 'reports', 'View reports onboarding tasks'),
    ('onboarding', 'read', 'all', 'View all onboarding tasks'),
    ('onboarding', 'write', 'all', 'Manage onboarding tasks')
ON CONFLICT (resource, action, scope) DO NOTHING;

-- ============================================================================
-- ROLE-PERMISSION MAPPING
-- ============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- Assign permissions to roles
DO $$
DECLARE
    v_hr_admin_id UUID;
    v_manager_id UUID;
    v_employee_id UUID;
    v_finance_id UUID;
    v_executive_id UUID;
BEGIN
    SELECT id INTO v_hr_admin_id FROM roles WHERE name = 'hr_admin';
    SELECT id INTO v_manager_id FROM roles WHERE name = 'manager';
    SELECT id INTO v_employee_id FROM roles WHERE name = 'employee';
    SELECT id INTO v_finance_id FROM roles WHERE name = 'finance';
    SELECT id INTO v_executive_id FROM roles WHERE name = 'executive';

    -- HR_Admin: Full access
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_hr_admin_id, id FROM permissions
    WHERE scope = 'all'
    ON CONFLICT DO NOTHING;

    -- Manager: Reports access + own access
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_manager_id, id FROM permissions
    WHERE scope IN ('own', 'reports')
    ON CONFLICT DO NOTHING;

    -- Employee: Own access only
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_employee_id, id FROM permissions
    WHERE scope = 'own'
    ON CONFLICT DO NOTHING;

    -- Finance: Salary read access
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_finance_id, id FROM permissions
    WHERE (resource = 'salary' AND action = 'read')
       OR (resource = 'employees' AND action = 'read' AND scope = 'all')
    ON CONFLICT DO NOTHING;

    -- Executive: Reports + high-level employee data
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_executive_id, id FROM permissions
    WHERE (resource = 'reports' AND scope = 'all')
       OR (resource = 'employees' AND action = 'read' AND scope = 'all')
    ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- USER ROLES TABLE (Maps employees to roles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES employees(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,  -- NULL = permanent
    is_active BOOLEAN DEFAULT true,
    UNIQUE(employee_id, role_id)
);

CREATE INDEX idx_employee_roles_employee ON employee_roles(employee_id) WHERE is_active;
CREATE INDEX idx_employee_roles_role ON employee_roles(role_id) WHERE is_active;

-- ============================================================================
-- SPECIAL PERMISSIONS (Override for sensitive data access)
-- ============================================================================

-- Allows manager to view specific report's salary/equity when authorized
CREATE TABLE IF NOT EXISTS special_authorizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grantor_id UUID NOT NULL REFERENCES employees(id),      -- Who granted
    grantee_id UUID NOT NULL REFERENCES employees(id),      -- Who receives access
    target_employee_id UUID REFERENCES employees(id),       -- Specific employee (NULL = all reports)
    resource VARCHAR(50) NOT NULL,                          -- 'salary', 'equity'
    action VARCHAR(20) NOT NULL DEFAULT 'read',
    reason TEXT NOT NULL,                                   -- Audit trail
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,                                 -- NULL = until revoked
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES employees(id),
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT valid_expiry CHECK (expires_at IS NULL OR expires_at > granted_at)
);

CREATE INDEX idx_special_auth_grantee ON special_authorizations(grantee_id) WHERE is_active;

-- ============================================================================
-- SESSION CONTEXT FUNCTIONS
-- ============================================================================

-- Set the current user context for RLS
CREATE OR REPLACE FUNCTION set_current_user_context(
    p_employee_id UUID,
    p_roles TEXT[]
) RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_employee_id', p_employee_id::TEXT, false);
    PERFORM set_config('app.current_roles', array_to_string(p_roles, ','), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current employee ID
CREATE OR REPLACE FUNCTION current_employee_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_employee_id', true), '')::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if current user has a specific role
CREATE OR REPLACE FUNCTION has_role(p_role_name TEXT) RETURNS BOOLEAN AS $$
DECLARE
    v_roles TEXT;
BEGIN
    v_roles := current_setting('app.current_roles', true);
    RETURN v_roles IS NOT NULL AND p_role_name = ANY(string_to_array(v_roles, ','));
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if employee is a direct report of current user
CREATE OR REPLACE FUNCTION is_direct_report(p_employee_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM employment_records er
        WHERE er.employee_id = p_employee_id
          AND er.manager_id = current_employee_id()
          AND er.effective_date <= CURRENT_DATE
          AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if employee is in the reporting chain (recursive)
CREATE OR REPLACE FUNCTION is_in_reporting_chain(p_employee_id UUID) RETURNS BOOLEAN AS $$
WITH RECURSIVE report_chain AS (
    -- Direct reports
    SELECT er.employee_id
    FROM employment_records er
    WHERE er.manager_id = current_employee_id()
      AND er.effective_date <= CURRENT_DATE
      AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)

    UNION

    -- Indirect reports (reports of reports)
    SELECT er.employee_id
    FROM employment_records er
    JOIN report_chain rc ON er.manager_id = rc.employee_id
    WHERE er.effective_date <= CURRENT_DATE
      AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
)
SELECT EXISTS (SELECT 1 FROM report_chain WHERE employee_id = p_employee_id);
$$ LANGUAGE SQL STABLE;

-- Check if user has special authorization for resource
CREATE OR REPLACE FUNCTION has_special_authorization(
    p_target_employee_id UUID,
    p_resource TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM special_authorizations sa
        WHERE sa.grantee_id = current_employee_id()
          AND sa.resource = p_resource
          AND sa.is_active
          AND (sa.target_employee_id IS NULL OR sa.target_employee_id = p_target_employee_id)
          AND (sa.expires_at IS NULL OR sa.expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all sensitive tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_local_data ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- EMPLOYEES TABLE POLICIES
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS employees_select_policy ON employees;
DROP POLICY IF EXISTS employees_insert_policy ON employees;
DROP POLICY IF EXISTS employees_update_policy ON employees;
DROP POLICY IF EXISTS employees_delete_policy ON employees;

-- SELECT: Employee can see own, Manager can see reports, HR sees all
CREATE POLICY employees_select_policy ON employees
    FOR SELECT
    USING (
        -- Own record
        id = current_employee_id()
        -- OR HR Admin
        OR has_role('hr_admin')
        -- OR Executive (read all)
        OR has_role('executive')
        -- OR is direct/indirect report
        OR is_in_reporting_chain(id)
    );

-- INSERT: HR Admin only
CREATE POLICY employees_insert_policy ON employees
    FOR INSERT
    WITH CHECK (has_role('hr_admin'));

-- UPDATE: Own record (limited) or HR Admin (full)
CREATE POLICY employees_update_policy ON employees
    FOR UPDATE
    USING (
        id = current_employee_id()
        OR has_role('hr_admin')
    )
    WITH CHECK (
        -- Self-update limited to certain fields (enforced at app layer)
        id = current_employee_id()
        OR has_role('hr_admin')
    );

-- DELETE: HR Admin only (soft delete)
CREATE POLICY employees_delete_policy ON employees
    FOR DELETE
    USING (has_role('hr_admin'));

-- ============================================================================
-- EMPLOYMENT_RECORDS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS employment_select_policy ON employment_records;
DROP POLICY IF EXISTS employment_insert_policy ON employment_records;

-- SELECT: Same as employees
CREATE POLICY employment_select_policy ON employment_records
    FOR SELECT
    USING (
        employee_id = current_employee_id()
        OR has_role('hr_admin')
        OR has_role('executive')
        OR is_in_reporting_chain(employee_id)
    );

-- INSERT/UPDATE: HR Admin only
CREATE POLICY employment_insert_policy ON employment_records
    FOR INSERT
    WITH CHECK (has_role('hr_admin'));

-- ============================================================================
-- SALARY_RECORDS TABLE POLICIES (Most sensitive)
-- ============================================================================

DROP POLICY IF EXISTS salary_select_policy ON salary_records;
DROP POLICY IF EXISTS salary_insert_policy ON salary_records;

-- SELECT: Own salary, HR sees all, Manager sees reports only with special auth
CREATE POLICY salary_select_policy ON salary_records
    FOR SELECT
    USING (
        -- Own salary
        employee_id = current_employee_id()
        -- HR Admin sees all
        OR has_role('hr_admin')
        -- Finance sees all (for payroll)
        OR has_role('finance')
        -- Manager with special authorization
        OR (
            has_role('manager')
            AND is_direct_report(employee_id)
            AND has_special_authorization(employee_id, 'salary')
        )
    );

-- INSERT/UPDATE: HR Admin only
CREATE POLICY salary_insert_policy ON salary_records
    FOR INSERT
    WITH CHECK (has_role('hr_admin'));

-- ============================================================================
-- EQUITY_GRANTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS equity_select_policy ON equity_grants;
DROP POLICY IF EXISTS equity_insert_policy ON equity_grants;

-- SELECT: Own grants, HR sees all, Manager with special auth
CREATE POLICY equity_select_policy ON equity_grants
    FOR SELECT
    USING (
        -- Own equity
        employee_id = current_employee_id()
        -- HR Admin sees all
        OR has_role('hr_admin')
        -- Manager with special authorization
        OR (
            has_role('manager')
            AND is_direct_report(employee_id)
            AND has_special_authorization(employee_id, 'equity')
        )
    );

-- INSERT: HR Admin only
CREATE POLICY equity_insert_policy ON equity_grants
    FOR INSERT
    WITH CHECK (has_role('hr_admin'));

-- ============================================================================
-- DOCUMENTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS documents_select_policy ON documents;
DROP POLICY IF EXISTS documents_insert_policy ON documents;

-- SELECT: Based on visibility + role
CREATE POLICY documents_select_policy ON documents
    FOR SELECT
    USING (
        (
            -- HR Admin sees all
            has_role('hr_admin')
            -- Own documents (private_employee and above)
            OR (
                employee_id = current_employee_id()
                AND visibility IN ('private_employee', 'manager_visible', 'public')
            )
            -- Manager sees manager_visible and public for reports
            OR (
                has_role('manager')
                AND is_direct_report(employee_id)
                AND visibility IN ('manager_visible', 'public')
            )
            -- Public documents visible to all authenticated users
            OR visibility = 'public'
        )
        -- Exclude soft-deleted
        AND NOT is_deleted
    );

-- INSERT: HR Admin or own documents
CREATE POLICY documents_insert_policy ON documents
    FOR INSERT
    WITH CHECK (
        has_role('hr_admin')
        OR employee_id = current_employee_id()
    );

-- ============================================================================
-- EMPLOYEE_LOCAL_DATA TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS local_data_select_policy ON employee_local_data;

CREATE POLICY local_data_select_policy ON employee_local_data
    FOR SELECT
    USING (
        employee_id = current_employee_id()
        OR has_role('hr_admin')
        OR has_role('finance')  -- For payroll/tax purposes
    );

-- ============================================================================
-- AUDIT LOGGING
-- ============================================================================

CREATE TABLE IF NOT EXISTS access_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL,              -- Who accessed
    action VARCHAR(20) NOT NULL,            -- 'read', 'write', 'delete'
    resource_type VARCHAR(50) NOT NULL,     -- 'salary', 'equity', etc.
    resource_id UUID,                       -- Specific record accessed
    target_employee_id UUID,                -- Whose data was accessed
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    details JSONB DEFAULT '{}'
);

CREATE INDEX idx_audit_employee ON access_audit_log(employee_id);
CREATE INDEX idx_audit_target ON access_audit_log(target_employee_id);
CREATE INDEX idx_audit_time ON access_audit_log(accessed_at);

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_sensitive_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log access to salary or equity data
    IF TG_TABLE_NAME IN ('salary_records', 'equity_grants') THEN
        INSERT INTO access_audit_log (
            employee_id,
            action,
            resource_type,
            resource_id,
            target_employee_id
        ) VALUES (
            current_employee_id(),
            TG_OP,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            COALESCE(NEW.employee_id, OLD.employee_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers (PostgreSQL triggers don't support SELECT - only INSERT/UPDATE/DELETE)
DROP TRIGGER IF EXISTS audit_salary_access ON salary_records;
CREATE TRIGGER audit_salary_access
    AFTER INSERT OR UPDATE OR DELETE ON salary_records
    FOR EACH ROW EXECUTE FUNCTION audit_sensitive_access();

DROP TRIGGER IF EXISTS audit_equity_access ON equity_grants;
CREATE TRIGGER audit_equity_access
    AFTER INSERT OR UPDATE OR DELETE ON equity_grants
    FOR EACH ROW EXECUTE FUNCTION audit_sensitive_access();

-- ============================================================================
-- PERMISSION CHECK FUNCTION (For application layer)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_permission(
    p_resource TEXT,
    p_action TEXT,
    p_target_employee_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN := FALSE;
    v_scope TEXT;
BEGIN
    -- Check role-based permissions
    SELECT p.scope INTO v_scope
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN employee_roles er ON rp.role_id = er.role_id
    WHERE er.employee_id = current_employee_id()
      AND er.is_active
      AND (er.expires_at IS NULL OR er.expires_at > NOW())
      AND p.resource = p_resource
      AND p.action = p_action
    ORDER BY
        CASE p.scope
            WHEN 'all' THEN 1
            WHEN 'department' THEN 2
            WHEN 'reports' THEN 3
            WHEN 'own' THEN 4
        END
    LIMIT 1;

    IF v_scope IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Check scope against target
    CASE v_scope
        WHEN 'all' THEN
            v_has_permission := TRUE;
        WHEN 'department' THEN
            -- Check if target is in same department
            v_has_permission := EXISTS (
                SELECT 1 FROM employment_records er1
                JOIN employment_records er2 ON er1.department_id = er2.department_id
                WHERE er1.employee_id = current_employee_id()
                  AND er2.employee_id = p_target_employee_id
                  AND er1.effective_date <= CURRENT_DATE
                  AND (er1.end_date IS NULL OR er1.end_date > CURRENT_DATE)
                  AND er2.effective_date <= CURRENT_DATE
                  AND (er2.end_date IS NULL OR er2.end_date > CURRENT_DATE)
            );
        WHEN 'reports' THEN
            v_has_permission := is_in_reporting_chain(p_target_employee_id);
        WHEN 'own' THEN
            v_has_permission := (p_target_employee_id = current_employee_id());
    END CASE;

    -- Check special authorizations for sensitive resources
    IF NOT v_has_permission AND p_resource IN ('salary', 'equity') THEN
        v_has_permission := has_special_authorization(p_target_employee_id, p_resource);
    END IF;

    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- GRANT STATEMENTS (For application database user)
-- ============================================================================

-- Create application role if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'hris_app') THEN
        CREATE ROLE hris_app LOGIN;
    END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hris_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO hris_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO hris_app;

-- Ensure RLS is enforced for the application user
ALTER TABLE employees FORCE ROW LEVEL SECURITY;
ALTER TABLE employment_records FORCE ROW LEVEL SECURITY;
ALTER TABLE salary_records FORCE ROW LEVEL SECURITY;
ALTER TABLE equity_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
ALTER TABLE employee_local_data FORCE ROW LEVEL SECURITY;
