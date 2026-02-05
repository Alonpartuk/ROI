-- ============================================================================
-- ONBOARDING TASK ENGINE
-- ============================================================================
--
-- Automates onboarding task generation based on:
-- - Employee location (TLV/Toronto/US specific forms)
-- - Employment type (contractor vs full-time)
-- - Department
-- - Custom triggers
--
-- FEATURES:
-- - Task templates with location-based rules
-- - Automatic task creation on new employee
-- - Task assignment and tracking
-- - Deadline management
-- - Progress reporting
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked', 'cancelled');
CREATE TYPE task_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE task_category AS ENUM (
    'documentation',    -- Forms, contracts, etc.
    'it_setup',        -- Equipment, accounts
    'training',        -- Onboarding training
    'compliance',      -- Legal/compliance requirements
    'introduction',    -- Meet the team
    'administrative',  -- General admin tasks
    'benefits'         -- Benefits enrollment
);
CREATE TYPE assignee_type AS ENUM ('employee', 'manager', 'hr', 'it', 'specific_user');
CREATE TYPE trigger_event AS ENUM ('employee_created', 'employment_change', 'location_change', 'manual');

-- ============================================================================
-- TASK TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category task_category NOT NULL,
    priority task_priority DEFAULT 'medium',

    -- Location/context rules (NULL = applies to all)
    location_id UUID REFERENCES locations(id),
    employment_type employment_type,
    department_id UUID REFERENCES departments(id),

    -- Timing
    days_from_start INTEGER NOT NULL DEFAULT 0,  -- Days relative to start date
    days_to_complete INTEGER NOT NULL DEFAULT 7, -- Deadline in days from task creation

    -- Assignment
    assignee_type assignee_type NOT NULL,
    specific_assignee_id UUID REFERENCES employees(id),  -- If assignee_type = 'specific_user'

    -- Form/document reference
    related_form_id VARCHAR(50),      -- Reference to localForms config
    related_document_category document_category,

    -- Dependencies
    depends_on_template_id UUID REFERENCES task_templates(id),

    -- Instructions
    instructions TEXT,
    checklist JSONB,                   -- Array of checkbox items
    external_link VARCHAR(500),        -- Link to form/system

    -- Trigger
    trigger_event trigger_event DEFAULT 'employee_created',

    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique template per context
    UNIQUE NULLS NOT DISTINCT (name, location_id, employment_type, department_id)
);

CREATE INDEX idx_templates_location ON task_templates(location_id) WHERE is_active;
CREATE INDEX idx_templates_trigger ON task_templates(trigger_event) WHERE is_active;

-- ============================================================================
-- ONBOARDING TASKS (Actual tasks for employees)
-- ============================================================================

CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES task_templates(id),
    employee_id UUID NOT NULL REFERENCES employees(id),

    -- Task details (copied from template, can be customized)
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category task_category NOT NULL,
    priority task_priority NOT NULL,

    -- Assignment
    assignee_type assignee_type NOT NULL,
    assigned_to UUID REFERENCES employees(id),  -- Resolved assignee

    -- Dates
    created_at TIMESTAMPTZ DEFAULT NOW(),
    due_date DATE NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Status
    status task_status DEFAULT 'pending',
    blocked_reason TEXT,

    -- Checklist progress
    checklist JSONB,
    checklist_progress INTEGER DEFAULT 0,  -- Percentage complete

    -- Form/document handling
    related_form_id VARCHAR(50),
    related_document_id UUID REFERENCES documents(id),

    -- Dependencies
    depends_on_task_id UUID REFERENCES onboarding_tasks(id),
    is_dependency_met BOOLEAN DEFAULT true,

    -- Notes
    notes TEXT,

    -- Audit
    created_by UUID REFERENCES employees(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES employees(id)
);

CREATE INDEX idx_onboarding_employee ON onboarding_tasks(employee_id);
CREATE INDEX idx_onboarding_assignee ON onboarding_tasks(assigned_to) WHERE status IN ('pending', 'in_progress');
CREATE INDEX idx_onboarding_due ON onboarding_tasks(due_date) WHERE status IN ('pending', 'in_progress');
CREATE INDEX idx_onboarding_status ON onboarding_tasks(status);

-- ============================================================================
-- INSERT DEFAULT TASK TEMPLATES
-- ============================================================================

-- Global templates (apply to all locations)
INSERT INTO task_templates (name, description, category, priority, days_from_start, days_to_complete, assignee_type, instructions) VALUES
    ('Welcome email sent', 'Send welcome email with first day details', 'administrative', 'high', -3, 1, 'hr', 'Send the standard welcome email template including:\n- First day time and location\n- Who to ask for\n- What to bring\n- Parking/transit info'),
    ('Laptop and equipment ordered', 'Order necessary IT equipment', 'it_setup', 'critical', -7, 2, 'it', 'Order standard equipment package based on role. For engineers: MacBook Pro, monitors, peripherals.'),
    ('Accounts created', 'Create necessary system accounts', 'it_setup', 'high', -1, 1, 'it', 'Create accounts for:\n- Email/Google Workspace\n- Slack\n- GitHub\n- HRIS\n- Other role-specific tools'),
    ('Contract signed', 'Ensure employment contract is signed', 'documentation', 'critical', -5, 3, 'hr', 'Send contract via DocuSign and confirm signature received.'),
    ('Team introduction scheduled', 'Schedule meet & greet with team', 'introduction', 'medium', 0, 3, 'manager', 'Schedule 1:1 introductions with team members for first week.'),
    ('Buddy assigned', 'Assign an onboarding buddy', 'introduction', 'medium', -1, 1, 'manager', 'Choose a team member to be the new hire buddy for the first 30 days.'),
    ('First week schedule created', 'Create detailed first week agenda', 'administrative', 'high', -2, 1, 'manager', 'Create calendar events for:\n- Orientation sessions\n- Team meetings\n- 1:1s with key stakeholders'),
    ('Emergency contact collected', 'Collect emergency contact information', 'documentation', 'high', 0, 3, 'employee', 'Please provide your emergency contact information in the HRIS.'),
    ('Bank details provided', 'Collect banking information for payroll', 'administrative', 'critical', 0, 5, 'employee', 'Please submit your bank details for direct deposit.'),
    ('Company policies acknowledged', 'Review and sign company policies', 'compliance', 'high', 0, 7, 'employee', 'Review and acknowledge:\n- Employee handbook\n- Code of conduct\n- IT security policy\n- Privacy policy'),
    ('Security training completed', 'Complete mandatory security awareness training', 'training', 'high', 0, 14, 'employee', 'Complete the security awareness training module in the LMS.'),
    ('30-day check-in scheduled', 'Schedule 30-day review meeting', 'administrative', 'medium', 21, 7, 'manager', 'Schedule a 30-day check-in to discuss onboarding experience and early feedback.')
ON CONFLICT DO NOTHING;

-- Israel (TLV) specific templates
INSERT INTO task_templates (name, description, category, priority, location_id, days_from_start, days_to_complete, assignee_type, related_form_id, instructions) VALUES
    ('Form 101 completed', 'Complete and submit Form 101 tax declaration', 'documentation', 'critical', (SELECT id FROM locations WHERE code = 'TLV'), 0, 7, 'employee', 'form_101', 'Fill out Form 101 (טופס 101) with your tax information. This is required for payroll processing.'),
    ('Pension fund enrollment', 'Enroll in mandatory pension fund', 'benefits', 'high', (SELECT id FROM locations WHERE code = 'TLV'), 0, 30, 'employee', 'pension_form', 'Choose your preferred pension fund from the approved list and complete enrollment forms.'),
    ('Keren Hishtalmut enrollment', 'Optional: Enroll in education fund', 'benefits', 'medium', (SELECT id FROM locations WHERE code = 'TLV'), 0, 30, 'employee', 'keren_hishtalmut', 'Optional enrollment in Keren Hishtalmut (קרן השתלמות). Recommended for tax benefits.'),
    ('ID copy submitted', 'Submit copy of Teudat Zehut', 'documentation', 'high', (SELECT id FROM locations WHERE code = 'TLV'), 0, 5, 'employee', NULL, 'Please upload a copy of your Teudat Zehut (front and back) to the HRIS.')
ON CONFLICT DO NOTHING;

-- Canada (Toronto) specific templates
INSERT INTO task_templates (name, description, category, priority, location_id, days_from_start, days_to_complete, assignee_type, related_form_id, instructions) VALUES
    ('TD1 Federal form completed', 'Complete federal tax credits form', 'documentation', 'critical', (SELECT id FROM locations WHERE code = 'TOR'), 0, 7, 'employee', 'td1_federal', 'Complete the TD1 Personal Tax Credits Return form for federal tax withholding.'),
    ('TD1 Provincial form completed', 'Complete provincial tax credits form', 'documentation', 'critical', (SELECT id FROM locations WHERE code = 'TOR'), 0, 7, 'employee', 'td1_provincial', 'Complete the TD1ON (Ontario) Personal Tax Credits Return form.'),
    ('SIN verification', 'Verify Social Insurance Number', 'documentation', 'critical', (SELECT id FROM locations WHERE code = 'TOR'), 0, 3, 'hr', NULL, 'Verify employee SIN against documentation provided.'),
    ('Benefits enrollment', 'Enroll in group benefits plan', 'benefits', 'high', (SELECT id FROM locations WHERE code = 'TOR'), 0, 30, 'employee', NULL, 'Complete enrollment in the company group benefits plan (health, dental, vision).')
ON CONFLICT DO NOTHING;

-- US specific templates
INSERT INTO task_templates (name, description, category, priority, location_id, days_from_start, days_to_complete, assignee_type, related_form_id, instructions) VALUES
    ('W-4 form completed', 'Complete federal tax withholding form', 'documentation', 'critical', (SELECT id FROM locations WHERE code = 'US'), 0, 3, 'employee', 'w4', 'Complete IRS Form W-4 Employee''s Withholding Certificate.'),
    ('I-9 verification', 'Complete employment eligibility verification', 'compliance', 'critical', (SELECT id FROM locations WHERE code = 'US'), 0, 3, 'hr', 'i9', 'Complete Section 2 of Form I-9 within 3 business days of hire date. Employee must present original documents.'),
    ('State W-4 completed', 'Complete state tax withholding form', 'documentation', 'high', (SELECT id FROM locations WHERE code = 'US'), 0, 5, 'employee', 'state_w4', 'Complete state-specific withholding form based on your state of residence.'),
    ('Benefits enrollment', 'Enroll in health benefits', 'benefits', 'high', (SELECT id FROM locations WHERE code = 'US'), 0, 30, 'employee', NULL, 'Complete enrollment in health, dental, and vision insurance plans.'),
    ('401(k) enrollment', 'Enroll in retirement plan', 'benefits', 'medium', (SELECT id FROM locations WHERE code = 'US'), 0, 30, 'employee', NULL, 'Set up your 401(k) contribution elections. Company matches up to 4%.'),
    ('E-Verify completed', 'Complete E-Verify check', 'compliance', 'high', (SELECT id FROM locations WHERE code = 'US'), 0, 3, 'hr', NULL, 'Run E-Verify check after I-9 completion.')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TASK GENERATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_onboarding_tasks(
    p_employee_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_employee RECORD;
    v_template RECORD;
    v_assigned_to UUID;
    v_due_date DATE;
    v_tasks_created INTEGER := 0;
    v_start_date DATE;
BEGIN
    -- Get employee details
    SELECT
        e.id,
        e.original_hire_date,
        er.location_id,
        er.employment_type,
        er.department_id,
        er.manager_id
    INTO v_employee
    FROM employees e
    JOIN employment_records er ON e.id = er.employee_id
        AND er.effective_date <= COALESCE(p_start_date, e.original_hire_date)
        AND (er.end_date IS NULL OR er.end_date > COALESCE(p_start_date, e.original_hire_date))
    WHERE e.id = p_employee_id
    ORDER BY er.effective_date DESC
    LIMIT 1;

    IF v_employee IS NULL THEN
        RAISE EXCEPTION 'Employee not found or no employment record: %', p_employee_id;
    END IF;

    v_start_date := COALESCE(p_start_date, v_employee.original_hire_date);

    -- Loop through applicable templates
    FOR v_template IN
        SELECT * FROM task_templates
        WHERE is_active
          AND trigger_event = 'employee_created'
          -- Location filter: NULL matches all, or specific location
          AND (location_id IS NULL OR location_id = v_employee.location_id)
          -- Employment type filter
          AND (employment_type IS NULL OR employment_type = v_employee.employment_type)
          -- Department filter
          AND (department_id IS NULL OR department_id = v_employee.department_id)
        ORDER BY days_from_start, priority
    LOOP
        -- Resolve assignee
        v_assigned_to := CASE v_template.assignee_type
            WHEN 'employee' THEN p_employee_id
            WHEN 'manager' THEN v_employee.manager_id
            WHEN 'specific_user' THEN v_template.specific_assignee_id
            ELSE NULL  -- HR/IT will be assigned manually or by separate logic
        END;

        -- Calculate due date
        v_due_date := v_start_date + v_template.days_from_start + v_template.days_to_complete;

        -- Create the task
        INSERT INTO onboarding_tasks (
            template_id,
            employee_id,
            name,
            description,
            category,
            priority,
            assignee_type,
            assigned_to,
            due_date,
            checklist,
            related_form_id,
            created_by
        ) VALUES (
            v_template.id,
            p_employee_id,
            v_template.name,
            COALESCE(v_template.description, '') || E'\n\n' || COALESCE(v_template.instructions, ''),
            v_template.category,
            v_template.priority,
            v_template.assignee_type,
            v_assigned_to,
            v_due_date,
            v_template.checklist,
            v_template.related_form_id,
            p_created_by
        );

        v_tasks_created := v_tasks_created + 1;
    END LOOP;

    RETURN v_tasks_created;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-generate tasks on new employee
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_onboarding_tasks()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger on new employee with 'pending_start' or 'active' status
    IF TG_OP = 'INSERT' AND NEW.current_status IN ('pending_start', 'active') THEN
        PERFORM generate_onboarding_tasks(NEW.id, NEW.original_hire_date);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employee_onboarding ON employees;
CREATE TRIGGER trg_employee_onboarding
    AFTER INSERT ON employees
    FOR EACH ROW EXECUTE FUNCTION trigger_onboarding_tasks();

-- ============================================================================
-- TASK UPDATE FUNCTIONS
-- ============================================================================

-- Update task status
CREATE OR REPLACE FUNCTION update_task_status(
    p_task_id UUID,
    p_status task_status,
    p_updated_by UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE onboarding_tasks
    SET
        status = p_status,
        started_at = CASE WHEN p_status = 'in_progress' AND started_at IS NULL THEN NOW() ELSE started_at END,
        completed_at = CASE WHEN p_status = 'completed' THEN NOW() ELSE completed_at END,
        notes = COALESCE(p_notes, notes),
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE id = p_task_id;

    -- Check if this unblocks dependent tasks
    IF p_status = 'completed' THEN
        UPDATE onboarding_tasks
        SET is_dependency_met = true
        WHERE depends_on_task_id = p_task_id;
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Update checklist item
CREATE OR REPLACE FUNCTION update_task_checklist(
    p_task_id UUID,
    p_checklist_index INTEGER,
    p_checked BOOLEAN,
    p_updated_by UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_checklist JSONB;
    v_total_items INTEGER;
    v_checked_items INTEGER;
BEGIN
    -- Get current checklist
    SELECT checklist INTO v_checklist FROM onboarding_tasks WHERE id = p_task_id;

    IF v_checklist IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Update the specific item
    v_checklist := jsonb_set(
        v_checklist,
        ARRAY[p_checklist_index::TEXT, 'checked'],
        to_jsonb(p_checked)
    );

    -- Calculate progress
    v_total_items := jsonb_array_length(v_checklist);
    SELECT COUNT(*) INTO v_checked_items
    FROM jsonb_array_elements(v_checklist) elem
    WHERE (elem->>'checked')::BOOLEAN = true;

    -- Update task
    UPDATE onboarding_tasks
    SET
        checklist = v_checklist,
        checklist_progress = ROUND(v_checked_items::DECIMAL / v_total_items * 100),
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE id = p_task_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS FOR ONBOARDING DASHBOARD
-- ============================================================================

-- Employee onboarding progress
CREATE OR REPLACE VIEW v_onboarding_progress AS
SELECT
    e.id AS employee_id,
    e.employee_number,
    COALESCE(e.preferred_first_name, e.legal_first_name) || ' ' ||
        COALESCE(e.preferred_last_name, e.legal_last_name) AS employee_name,
    e.original_hire_date AS start_date,
    l.code AS location_code,
    d.name AS department,
    COUNT(ot.id) AS total_tasks,
    COUNT(CASE WHEN ot.status = 'completed' THEN 1 END) AS completed_tasks,
    COUNT(CASE WHEN ot.status IN ('pending', 'in_progress') AND ot.due_date < CURRENT_DATE THEN 1 END) AS overdue_tasks,
    ROUND(
        COUNT(CASE WHEN ot.status = 'completed' THEN 1 END)::DECIMAL /
        NULLIF(COUNT(ot.id), 0) * 100
    ) AS completion_percentage,
    MIN(CASE WHEN ot.status IN ('pending', 'in_progress') THEN ot.due_date END) AS next_due_date
FROM employees e
JOIN employment_records er ON e.id = er.employee_id
    AND er.effective_date <= CURRENT_DATE
    AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
LEFT JOIN locations l ON er.location_id = l.id
LEFT JOIN departments d ON er.department_id = d.id
LEFT JOIN onboarding_tasks ot ON e.id = ot.employee_id
WHERE NOT e.is_deleted
  AND e.original_hire_date >= (CURRENT_DATE - INTERVAL '90 days')  -- Recent hires
GROUP BY e.id, e.employee_number, e.preferred_first_name, e.legal_first_name,
         e.preferred_last_name, e.legal_last_name, e.original_hire_date,
         l.code, d.name
ORDER BY e.original_hire_date DESC;

-- Tasks by assignee (for task inbox)
CREATE OR REPLACE VIEW v_my_onboarding_tasks AS
SELECT
    ot.id AS task_id,
    ot.name AS task_name,
    ot.description,
    ot.category,
    ot.priority,
    ot.status,
    ot.due_date,
    ot.due_date < CURRENT_DATE AS is_overdue,
    ot.checklist_progress,
    e.employee_number,
    COALESCE(e.preferred_first_name, e.legal_first_name) || ' ' ||
        COALESCE(e.preferred_last_name, e.legal_last_name) AS employee_name,
    e.original_hire_date AS employee_start_date,
    ot.related_form_id,
    ot.is_dependency_met
FROM onboarding_tasks ot
JOIN employees e ON ot.employee_id = e.id
WHERE ot.status IN ('pending', 'in_progress', 'blocked')
ORDER BY
    CASE ot.priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        ELSE 4
    END,
    ot.due_date;

-- Overdue tasks alert
CREATE OR REPLACE VIEW v_overdue_onboarding_tasks AS
SELECT
    ot.*,
    e.employee_number,
    COALESCE(e.preferred_first_name, e.legal_first_name) || ' ' ||
        COALESCE(e.preferred_last_name, e.legal_last_name) AS employee_name,
    e.work_email AS employee_email,
    CURRENT_DATE - ot.due_date AS days_overdue,
    assigned.work_email AS assignee_email
FROM onboarding_tasks ot
JOIN employees e ON ot.employee_id = e.id
LEFT JOIN employees assigned ON ot.assigned_to = assigned.id
WHERE ot.status IN ('pending', 'in_progress')
  AND ot.due_date < CURRENT_DATE
ORDER BY days_overdue DESC, priority;
