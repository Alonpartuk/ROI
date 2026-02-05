-- ============================================================================
-- SEED DATA SCRIPT
-- Loads initial data from seed-data.json structure
-- Run this after all schema files have been applied
-- ============================================================================

-- ============================================================================
-- TEMPORARILY DISABLE RLS AND TRIGGERS FOR SEEDING
-- ============================================================================
-- We need to bypass RLS policies to insert seed data
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE employment_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE equity_grants DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE employee_local_data DISABLE ROW LEVEL SECURITY;

-- Disable the onboarding trigger (it expects employment records to exist)
ALTER TABLE employees DISABLE TRIGGER trg_employee_onboarding;

-- Disable audit triggers (current_employee_id() is NULL during seeding)
ALTER TABLE salary_records DISABLE TRIGGER audit_salary_access;
ALTER TABLE equity_grants DISABLE TRIGGER audit_equity_access;

-- ============================================================================
-- LOCATIONS
-- ============================================================================

INSERT INTO locations (id, code, name, country_code, timezone, default_currency, legal_entity_name, config) VALUES
    ('11111111-1111-1111-1111-111111111001', 'TLV', 'Tel Aviv Office', 'IL', 'Asia/Jerusalem', 'ILS', 'TechStartup Israel Ltd.', '{}'),
    ('11111111-1111-1111-1111-111111111002', 'TOR', 'Toronto Office', 'CA', 'America/Toronto', 'CAD', 'TechStartup Canada Inc.', '{}'),
    ('11111111-1111-1111-1111-111111111003', 'US', 'US Remote', 'US', 'America/New_York', 'USD', 'TechStartup US Inc.', '{}')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- DEPARTMENTS
-- ============================================================================

INSERT INTO departments (id, code, name, cost_center) VALUES
    ('22222222-2222-2222-2222-222222222001', 'ENG', 'Engineering', 'CC-100'),
    ('22222222-2222-2222-2222-222222222002', 'PROD', 'Product', 'CC-200'),
    ('22222222-2222-2222-2222-222222222003', 'DESIGN', 'Design', 'CC-300'),
    ('22222222-2222-2222-2222-222222222004', 'SALES', 'Sales', 'CC-400'),
    ('22222222-2222-2222-2222-222222222005', 'MKT', 'Marketing', 'CC-500'),
    ('22222222-2222-2222-2222-222222222006', 'OPS', 'Operations', 'CC-600'),
    ('22222222-2222-2222-2222-222222222007', 'FIN', 'Finance', 'CC-700'),
    ('22222222-2222-2222-2222-222222222008', 'HR', 'People & Culture', 'CC-800')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- JOB LEVELS
-- ============================================================================

INSERT INTO job_levels (id, code, name, track, rank) VALUES
    ('33333333-3333-3333-3333-333333333001', 'IC1', 'Junior', 'ic', 1),
    ('33333333-3333-3333-3333-333333333002', 'IC2', 'Mid-Level', 'ic', 2),
    ('33333333-3333-3333-3333-333333333003', 'IC3', 'Senior', 'ic', 3),
    ('33333333-3333-3333-3333-333333333004', 'IC4', 'Staff', 'ic', 4),
    ('33333333-3333-3333-3333-333333333005', 'IC5', 'Principal', 'ic', 5),
    ('33333333-3333-3333-3333-333333333006', 'M1', 'Team Lead', 'management', 3),
    ('33333333-3333-3333-3333-333333333007', 'M2', 'Manager', 'management', 4),
    ('33333333-3333-3333-3333-333333333008', 'M3', 'Director', 'management', 5),
    ('33333333-3333-3333-3333-333333333009', 'M4', 'VP', 'management', 6),
    ('33333333-3333-3333-3333-333333333010', 'EXEC', 'Executive', 'management', 7)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- JOB TITLES
-- ============================================================================

INSERT INTO job_titles (id, code, name, department_id) VALUES
    ('44444444-4444-4444-4444-444444444001', 'SWE', 'Software Engineer', '22222222-2222-2222-2222-222222222001'),
    ('44444444-4444-4444-4444-444444444002', 'SRE', 'Site Reliability Engineer', '22222222-2222-2222-2222-222222222001'),
    ('44444444-4444-4444-4444-444444444003', 'FE', 'Frontend Engineer', '22222222-2222-2222-2222-222222222001'),
    ('44444444-4444-4444-4444-444444444004', 'BE', 'Backend Engineer', '22222222-2222-2222-2222-222222222001'),
    ('44444444-4444-4444-4444-444444444005', 'EM', 'Engineering Manager', '22222222-2222-2222-2222-222222222001'),
    ('44444444-4444-4444-4444-444444444006', 'PM', 'Product Manager', '22222222-2222-2222-2222-222222222002'),
    ('44444444-4444-4444-4444-444444444007', 'PD', 'Product Designer', '22222222-2222-2222-2222-222222222003'),
    ('44444444-4444-4444-4444-444444444008', 'AE', 'Account Executive', '22222222-2222-2222-2222-222222222004'),
    ('44444444-4444-4444-4444-444444444009', 'SDR', 'Sales Development Rep', '22222222-2222-2222-2222-222222222004'),
    ('44444444-4444-4444-4444-444444444010', 'MKT', 'Marketing Manager', '22222222-2222-2222-2222-222222222005'),
    ('44444444-4444-4444-4444-444444444011', 'OPS', 'Operations Manager', '22222222-2222-2222-2222-222222222006'),
    ('44444444-4444-4444-4444-444444444012', 'FIN', 'Finance Manager', '22222222-2222-2222-2222-222222222007'),
    ('44444444-4444-4444-4444-444444444013', 'HR', 'HR Manager', '22222222-2222-2222-2222-222222222008'),
    ('44444444-4444-4444-4444-444444444014', 'CEO', 'Chief Executive Officer', NULL),
    ('44444444-4444-4444-4444-444444444015', 'CTO', 'Chief Technology Officer', '22222222-2222-2222-2222-222222222001'),
    ('44444444-4444-4444-4444-444444444016', 'CPO', 'Chief Product Officer', '22222222-2222-2222-2222-222222222002'),
    ('44444444-4444-4444-4444-444444444017', 'VPE', 'VP of Engineering', '22222222-2222-2222-2222-222222222001')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- EQUITY PLANS
-- ============================================================================

INSERT INTO equity_plans (id, name, plan_type, total_pool_shares, default_vesting_type, default_cliff_months, default_vesting_months, effective_date) VALUES
    ('55555555-5555-5555-5555-555555555001', '2024 Employee Incentive Stock Option Plan', 'iso', 10000000, 'cliff_then_linear', 12, 48, '2024-01-01')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- EMPLOYEES (First batch - Executives and Managers)
-- ============================================================================

-- CEO - David Chen
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, preferred_first_name, work_email, personal_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0001', 'EMP001', 'David', 'Chen', 'Dave', 'david.chen@techstartup.com', 'davidchen@gmail.com', '+1-416-555-0101', '1985-03-15', '2022-01-01', 'active');

-- CTO - Yael Levi
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, personal_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0002', 'EMP002', 'Yael', 'Levi', 'yael.levi@techstartup.com', 'yaellevi@gmail.com', '+972-54-555-0102', '1987-07-22', '2022-01-01', 'active');

-- VP Engineering - Omer Katz
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0003', 'EMP003', 'Omer', 'Katz', 'omer.katz@techstartup.com', '+972-52-555-0103', '1989-11-08', '2022-06-01', 'active');

-- Engineering Manager TLV - Noa Cohen
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0004', 'EMP004', 'Noa', 'Cohen', 'noa.cohen@techstartup.com', '+972-54-555-0104', '1991-04-20', '2022-09-01', 'active');

-- Senior Backend - Amit Goldberg
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0005', 'EMP005', 'Amit', 'Goldberg', 'amit.goldberg@techstartup.com', '+972-52-555-0105', '1992-08-12', '2022-10-01', 'active');

-- Senior Frontend - Maya Shapiro
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0006', 'EMP006', 'Maya', 'Shapiro', 'maya.shapiro@techstartup.com', '+972-54-555-0106', '1993-02-28', '2022-11-01', 'active');

-- Mid Backend - Daniel Mizrahi
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0007', 'EMP007', 'Daniel', 'Mizrahi', 'daniel.mizrahi@techstartup.com', '+972-52-555-0107', '1995-06-15', '2023-02-01', 'active');

-- Junior Frontend - Shira Ben-David
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0008', 'EMP008', 'Shira', 'Ben-David', 'shira.bendavid@techstartup.com', '+972-54-555-0108', '1998-10-03', '2023-06-01', 'active');

-- SRE - Eitan Avraham
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0009', 'EMP009', 'Eitan', 'Avraham', 'eitan.avraham@techstartup.com', '+972-52-555-0109', '1990-12-25', '2023-03-01', 'active');

-- Staff Engineer Toronto - Sarah Thompson
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0010', 'EMP010', 'Sarah', 'Thompson', 'sarah.thompson@techstartup.com', '+1-416-555-0110', '1988-05-20', '2022-08-01', 'active');

-- Engineering Manager Toronto - Michael Wong
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0011', 'EMP011', 'Michael', 'Wong', 'michael.wong@techstartup.com', '+1-416-555-0111', '1986-09-14', '2023-01-01', 'active');

-- Mid Engineer Toronto - Emily Patel
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0012', 'EMP012', 'Emily', 'Patel', 'emily.patel@techstartup.com', '+1-416-555-0112', '1994-01-30', '2023-04-01', 'active');

-- Senior Engineer US - James Rodriguez
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0013', 'EMP013', 'James', 'Rodriguez', 'james.rodriguez@techstartup.com', '+1-555-555-0113', '1989-07-04', '2023-05-01', 'active');

-- Contractor US - Alex Kim
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0014', 'EMP014', 'Alex', 'Kim', 'alex.kim@techstartup.com', '+1-555-555-0114', '1991-11-11', '2023-07-01', 'active');

-- CPO - Jennifer Lee
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0015', 'EMP015', 'Jennifer', 'Lee', 'jennifer.lee@techstartup.com', '+1-416-555-0115', '1984-03-08', '2022-04-01', 'active');

-- Senior PM - Tal Mor
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0016', 'EMP016', 'Tal', 'Mor', 'tal.mor@techstartup.com', '+972-54-555-0116', '1990-06-22', '2022-12-01', 'active');

-- Product Designer - Roni Stern
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0017', 'EMP017', 'Roni', 'Stern', 'roni.stern@techstartup.com', '+972-52-555-0117', '1993-09-18', '2023-01-15', 'active');

-- HR Manager - Michal Levy
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0018', 'EMP018', 'Michal', 'Levy', 'michal.levy@techstartup.com', '+972-54-555-0118', '1988-12-05', '2023-02-01', 'active');

-- Finance Manager - Robert Martinez
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0019', 'EMP019', 'Robert', 'Martinez', 'robert.martinez@techstartup.com', '+1-416-555-0119', '1985-08-30', '2023-03-01', 'active');

-- Account Executive US - Ashley Johnson
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0020', 'EMP020', 'Ashley', 'Johnson', 'ashley.johnson@techstartup.com', '+1-555-555-0120', '1992-04-12', '2023-06-01', 'active');

-- Marketing Manager - Christina Nguyen
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0021', 'EMP021', 'Christina', 'Nguyen', 'christina.nguyen@techstartup.com', '+1-416-555-0121', '1990-10-25', '2023-04-15', 'active');

-- Operations Manager - Yonatan Rubin
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0022', 'EMP022', 'Yonatan', 'Rubin', 'yonatan.rubin@techstartup.com', '+972-52-555-0122', '1987-02-14', '2023-05-01', 'active');

-- New Hire - Liora Fischer (cliff in ~60 days)
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0023', 'EMP023', 'Liora', 'Fischer', 'liora.fischer@techstartup.com', '+972-54-555-0123', '1996-07-19', '2023-10-15', 'active');

-- New Hire Toronto - Kevin OBrien (cliff in ~45 days)
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0024', 'EMP024', 'Kevin', 'O''Brien', 'kevin.obrien@techstartup.com', '+1-416-555-0124', '1994-11-02', '2023-11-01', 'active');

-- SDR US - Marcus Williams
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0025', 'EMP025', 'Marcus', 'Williams', 'marcus.williams@techstartup.com', '+1-555-555-0125', '1997-03-28', '2023-09-01', 'active');

-- Part-time Designer - Gal Azulay
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0026', 'EMP026', 'Gal', 'Azulay', 'gal.azulay@techstartup.com', '+972-52-555-0126', '1995-05-10', '2023-08-01', 'active');

-- Staff Engineer - Uri Baruch
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0027', 'EMP027', 'Uri', 'Baruch', 'uri.baruch@techstartup.com', '+972-54-555-0127', '1986-08-15', '2023-07-01', 'active');

-- Pending Start - Rachel Green
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0028', 'EMP028', 'Rachel', 'Green', 'rachel.green@techstartup.com', '+1-416-555-0128', '1993-12-01', '2024-02-01', 'pending_start');

-- Senior Backend Toronto - Daniel Park
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0029', 'EMP029', 'Daniel', 'Park', 'daniel.park@techstartup.com', '+1-416-555-0129', '1991-06-30', '2023-08-15', 'active');

-- Junior SRE US - Jordan Smith
INSERT INTO employees (id, employee_number, legal_first_name, legal_last_name, work_email, phone, date_of_birth, original_hire_date, current_status)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeee0030', 'EMP030', 'Jordan', 'Smith', 'jordan.smith@techstartup.com', '+1-555-555-0130', '1998-04-22', '2023-12-01', 'active');

-- ============================================================================
-- EMPLOYMENT RECORDS (Initial positions)
-- ============================================================================

-- Use function to properly insert employment records
-- For simplicity, direct inserts with NULL manager for CEO, then cascading

INSERT INTO employment_records (employee_id, effective_date, employment_type, work_model, status, job_title_id, job_level_id, department_id, location_id, manager_id, fte_percentage, change_reason) VALUES
-- CEO
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0001', '2022-01-01', 'full_time', 'hybrid', 'active', '44444444-4444-4444-4444-444444444014', '33333333-3333-3333-3333-333333333010', '22222222-2222-2222-2222-222222222006', '11111111-1111-1111-1111-111111111002', NULL, 100, 'Founding'),
-- CTO
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0002', '2022-01-01', 'full_time', 'hybrid', 'active', '44444444-4444-4444-4444-444444444015', '33333333-3333-3333-3333-333333333010', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0001', 100, 'Founding'),
-- VP Engineering
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0003', '2022-06-01', 'full_time', 'hybrid', 'active', '44444444-4444-4444-4444-444444444017', '33333333-3333-3333-3333-333333333009', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0002', 100, 'Hire'),
-- EM TLV
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0004', '2022-09-01', 'full_time', 'hybrid', 'active', '44444444-4444-4444-4444-444444444005', '33333333-3333-3333-3333-333333333007', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0003', 100, 'Hire'),
-- Engineers TLV
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0005', '2022-10-01', 'full_time', 'remote', 'active', '44444444-4444-4444-4444-444444444004', '33333333-3333-3333-3333-333333333003', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0004', 100, 'Hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0006', '2022-11-01', 'full_time', 'hybrid', 'active', '44444444-4444-4444-4444-444444444003', '33333333-3333-3333-3333-333333333003', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0004', 100, 'Hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0007', '2023-02-01', 'full_time', 'hybrid', 'active', '44444444-4444-4444-4444-444444444004', '33333333-3333-3333-3333-333333333002', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0004', 100, 'Hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0008', '2023-06-01', 'full_time', 'onsite', 'active', '44444444-4444-4444-4444-444444444003', '33333333-3333-3333-3333-333333333001', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0004', 100, 'Hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0009', '2023-03-01', 'full_time', 'remote', 'active', '44444444-4444-4444-4444-444444444002', '33333333-3333-3333-3333-333333333003', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0003', 100, 'Hire'),
-- Toronto team
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0010', '2022-08-01', 'full_time', 'hybrid', 'active', '44444444-4444-4444-4444-444444444001', '33333333-3333-3333-3333-333333333004', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0002', 100, 'Hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0011', '2023-01-01', 'full_time', 'hybrid', 'active', '44444444-4444-4444-4444-444444444005', '33333333-3333-3333-3333-333333333007', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0002', 100, 'Hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0012', '2023-04-01', 'full_time', 'remote', 'active', '44444444-4444-4444-4444-444444444001', '33333333-3333-3333-3333-333333333002', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0011', 100, 'Hire'),
-- US team
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0013', '2023-05-01', 'full_time', 'remote', 'active', '44444444-4444-4444-4444-444444444004', '33333333-3333-3333-3333-333333333003', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0011', 100, 'Hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0014', '2023-07-01', 'contractor', 'remote', 'active', '44444444-4444-4444-4444-444444444003', '33333333-3333-3333-3333-333333333003', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0011', 100, 'Hire'),
-- CPO
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0015', '2022-04-01', 'full_time', 'hybrid', 'active', '44444444-4444-4444-4444-444444444016', '33333333-3333-3333-3333-333333333010', '22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0001', 100, 'Hire'),
-- Product/Design
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0016', '2022-12-01', 'full_time', 'hybrid', 'active', '44444444-4444-4444-4444-444444444006', '33333333-3333-3333-3333-333333333003', '22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0015', 100, 'Hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0017', '2023-01-15', 'full_time', 'hybrid', 'active', '44444444-4444-4444-4444-444444444007', '33333333-3333-3333-3333-333333333002', '22222222-2222-2222-2222-222222222003', '11111111-1111-1111-1111-111111111001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0015', 100, 'Hire'),
-- HR
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0018', '2023-02-01', 'full_time', 'hybrid', 'active', '44444444-4444-4444-4444-444444444013', '33333333-3333-3333-3333-333333333006', '22222222-2222-2222-2222-222222222008', '11111111-1111-1111-1111-111111111001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0001', 100, 'Hire'),
-- Finance
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0019', '2023-03-01', 'full_time', 'hybrid', 'active', '44444444-4444-4444-4444-444444444012', '33333333-3333-3333-3333-333333333007', '22222222-2222-2222-2222-222222222007', '11111111-1111-1111-1111-111111111002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0001', 100, 'Hire'),
-- Sales
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0020', '2023-06-01', 'full_time', 'remote', 'active', '44444444-4444-4444-4444-444444444008', '33333333-3333-3333-3333-333333333002', '22222222-2222-2222-2222-222222222004', '11111111-1111-1111-1111-111111111003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0001', 100, 'Hire'),
-- Marketing
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0021', '2023-04-15', 'full_time', 'hybrid', 'active', '44444444-4444-4444-4444-444444444010', '33333333-3333-3333-3333-333333333006', '22222222-2222-2222-2222-222222222005', '11111111-1111-1111-1111-111111111002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0001', 100, 'Hire'),
-- Operations
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0022', '2023-05-01', 'full_time', 'onsite', 'active', '44444444-4444-4444-4444-444444444011', '33333333-3333-3333-3333-333333333006', '22222222-2222-2222-2222-222222222006', '11111111-1111-1111-1111-111111111001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0001', 100, 'Hire'),
-- Recent hires with upcoming cliffs
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0023', '2023-10-15', 'full_time', 'hybrid', 'active', '44444444-4444-4444-4444-444444444004', '33333333-3333-3333-3333-333333333002', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0004', 100, 'Hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0024', '2023-11-01', 'full_time', 'remote', 'active', '44444444-4444-4444-4444-444444444003', '33333333-3333-3333-3333-333333333002', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0011', 100, 'Hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0025', '2023-09-01', 'full_time', 'remote', 'active', '44444444-4444-4444-4444-444444444009', '33333333-3333-3333-3333-333333333001', '22222222-2222-2222-2222-222222222004', '11111111-1111-1111-1111-111111111003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0020', 100, 'Hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0026', '2023-08-01', 'part_time', 'remote', 'active', '44444444-4444-4444-4444-444444444007', '33333333-3333-3333-3333-333333333001', '22222222-2222-2222-2222-222222222003', '11111111-1111-1111-1111-111111111001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0017', 50, 'Hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0027', '2023-07-01', 'full_time', 'hybrid', 'active', '44444444-4444-4444-4444-444444444001', '33333333-3333-3333-3333-333333333004', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0003', 100, 'Hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0028', '2024-02-01', 'full_time', 'hybrid', 'pending_start', '44444444-4444-4444-4444-444444444006', '33333333-3333-3333-3333-333333333002', '22222222-2222-2222-2222-222222222002', '11111111-1111-1111-1111-111111111002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0015', 100, 'Hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0029', '2023-08-15', 'full_time', 'remote', 'active', '44444444-4444-4444-4444-444444444004', '33333333-3333-3333-3333-333333333003', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0011', 100, 'Hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0030', '2023-12-01', 'full_time', 'remote', 'active', '44444444-4444-4444-4444-444444444002', '33333333-3333-3333-3333-333333333001', '22222222-2222-2222-2222-222222222001', '11111111-1111-1111-1111-111111111003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0009', 100, 'Hire');

-- ============================================================================
-- SALARY RECORDS
-- ============================================================================

INSERT INTO salary_records (employee_id, effective_date, amount, currency, frequency, annualized_amount, annualized_currency, reason) VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0001', '2022-01-01', 250000, 'CAD', 'annual', 185000, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0002', '2022-01-01', 65000, 'ILS', 'monthly', 210600, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0003', '2022-06-01', 55000, 'ILS', 'monthly', 178200, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0004', '2022-09-01', 42000, 'ILS', 'monthly', 136080, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0005', '2022-10-01', 38000, 'ILS', 'monthly', 123120, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0006', '2022-11-01', 36000, 'ILS', 'monthly', 116640, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0007', '2023-02-01', 28000, 'ILS', 'monthly', 90720, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0008', '2023-06-01', 22000, 'ILS', 'monthly', 71280, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0009', '2023-03-01', 40000, 'ILS', 'monthly', 129600, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0010', '2022-08-01', 165000, 'CAD', 'annual', 122100, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0011', '2023-01-01', 180000, 'CAD', 'annual', 133200, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0012', '2023-04-01', 115000, 'CAD', 'annual', 85100, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0013', '2023-05-01', 175000, 'USD', 'annual', 175000, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0014', '2023-07-01', 85, 'USD', 'hourly', 176800, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0015', '2022-04-01', 220000, 'CAD', 'annual', 162800, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0016', '2022-12-01', 35000, 'ILS', 'monthly', 113400, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0017', '2023-01-15', 26000, 'ILS', 'monthly', 84240, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0018', '2023-02-01', 32000, 'ILS', 'monthly', 103680, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0019', '2023-03-01', 145000, 'CAD', 'annual', 107300, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0020', '2023-06-01', 90000, 'USD', 'annual', 90000, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0021', '2023-04-15', 125000, 'CAD', 'annual', 92500, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0022', '2023-05-01', 30000, 'ILS', 'monthly', 97200, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0023', '2023-10-15', 27000, 'ILS', 'monthly', 87480, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0024', '2023-11-01', 110000, 'CAD', 'annual', 81400, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0025', '2023-09-01', 55000, 'USD', 'annual', 55000, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0026', '2023-08-01', 10000, 'ILS', 'monthly', 32400, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0027', '2023-07-01', 52000, 'ILS', 'monthly', 168480, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0028', '2024-02-01', 130000, 'CAD', 'annual', 96200, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0029', '2023-08-15', 150000, 'CAD', 'annual', 111000, 'USD', 'hire'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0030', '2023-12-01', 95000, 'USD', 'annual', 95000, 'USD', 'hire');

-- ============================================================================
-- EQUITY GRANTS (For employees with equity)
-- ============================================================================

INSERT INTO equity_grants (employee_id, equity_plan_id, grant_number, grant_date, grant_type, shares_granted, exercise_price, vesting_type, vesting_start_date, cliff_months, total_vesting_months) VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0001', '55555555-5555-5555-5555-555555555001', 'GRANT-001', '2022-01-01', 'iso', 2000000, 0.01, 'linear', '2022-01-01', NULL, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0002', '55555555-5555-5555-5555-555555555001', 'GRANT-002', '2022-01-01', 'iso', 1500000, 0.01, 'linear', '2022-01-01', NULL, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0003', '55555555-5555-5555-5555-555555555001', 'GRANT-003', '2022-06-01', 'iso', 200000, 0.10, 'cliff_then_linear', '2022-06-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0004', '55555555-5555-5555-5555-555555555001', 'GRANT-004', '2022-09-01', 'iso', 80000, 0.15, 'cliff_then_linear', '2022-09-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0005', '55555555-5555-5555-5555-555555555001', 'GRANT-005', '2022-10-01', 'iso', 50000, 0.15, 'cliff_then_linear', '2022-10-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0006', '55555555-5555-5555-5555-555555555001', 'GRANT-006', '2022-11-01', 'iso', 50000, 0.15, 'cliff_then_linear', '2022-11-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0007', '55555555-5555-5555-5555-555555555001', 'GRANT-007', '2023-02-01', 'iso', 30000, 0.25, 'cliff_then_linear', '2023-02-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0008', '55555555-5555-5555-5555-555555555001', 'GRANT-008', '2023-06-01', 'iso', 20000, 0.30, 'cliff_then_linear', '2023-06-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0009', '55555555-5555-5555-5555-555555555001', 'GRANT-009', '2023-03-01', 'iso', 45000, 0.25, 'cliff_then_linear', '2023-03-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0010', '55555555-5555-5555-5555-555555555001', 'GRANT-010', '2022-08-01', 'iso', 75000, 0.10, 'cliff_then_linear', '2022-08-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0011', '55555555-5555-5555-5555-555555555001', 'GRANT-011', '2023-01-01', 'iso', 70000, 0.25, 'cliff_then_linear', '2023-01-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0012', '55555555-5555-5555-5555-555555555001', 'GRANT-012', '2023-04-01', 'iso', 30000, 0.30, 'cliff_then_linear', '2023-04-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0013', '55555555-5555-5555-5555-555555555001', 'GRANT-013', '2023-05-01', 'iso', 50000, 0.30, 'cliff_then_linear', '2023-05-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0015', '55555555-5555-5555-5555-555555555001', 'GRANT-015', '2022-04-01', 'iso', 300000, 0.05, 'cliff_then_linear', '2022-04-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0016', '55555555-5555-5555-5555-555555555001', 'GRANT-016', '2022-12-01', 'iso', 40000, 0.15, 'cliff_then_linear', '2022-12-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0017', '55555555-5555-5555-5555-555555555001', 'GRANT-017', '2023-01-15', 'iso', 25000, 0.25, 'cliff_then_linear', '2023-01-15', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0018', '55555555-5555-5555-5555-555555555001', 'GRANT-018', '2023-02-01', 'iso', 30000, 0.25, 'cliff_then_linear', '2023-02-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0019', '55555555-5555-5555-5555-555555555001', 'GRANT-019', '2023-03-01', 'iso', 35000, 0.25, 'cliff_then_linear', '2023-03-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0020', '55555555-5555-5555-5555-555555555001', 'GRANT-020', '2023-06-01', 'iso', 20000, 0.30, 'cliff_then_linear', '2023-06-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0021', '55555555-5555-5555-5555-555555555001', 'GRANT-021', '2023-04-15', 'iso', 30000, 0.30, 'cliff_then_linear', '2023-04-15', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0022', '55555555-5555-5555-5555-555555555001', 'GRANT-022', '2023-05-01', 'iso', 25000, 0.30, 'cliff_then_linear', '2023-05-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0023', '55555555-5555-5555-5555-555555555001', 'GRANT-023', '2023-10-15', 'iso', 30000, 0.35, 'cliff_then_linear', '2023-10-15', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0024', '55555555-5555-5555-5555-555555555001', 'GRANT-024', '2023-11-01', 'iso', 30000, 0.35, 'cliff_then_linear', '2023-11-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0025', '55555555-5555-5555-5555-555555555001', 'GRANT-025', '2023-09-01', 'iso', 15000, 0.35, 'cliff_then_linear', '2023-09-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0026', '55555555-5555-5555-5555-555555555001', 'GRANT-026', '2023-08-01', 'iso', 10000, 0.35, 'cliff_then_linear', '2023-08-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0027', '55555555-5555-5555-5555-555555555001', 'GRANT-027', '2023-07-01', 'iso', 60000, 0.30, 'cliff_then_linear', '2023-07-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0028', '55555555-5555-5555-5555-555555555001', 'GRANT-028', '2024-02-01', 'iso', 35000, 0.40, 'cliff_then_linear', '2024-02-01', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0029', '55555555-5555-5555-5555-555555555001', 'GRANT-029', '2023-08-15', 'iso', 45000, 0.35, 'cliff_then_linear', '2023-08-15', 12, 48),
('eeeeeeee-eeee-eeee-eeee-eeeeeeee0030', '55555555-5555-5555-5555-555555555001', 'GRANT-030', '2023-12-01', 'iso', 20000, 0.40, 'cliff_then_linear', '2023-12-01', 12, 48);

-- ============================================================================
-- EMPLOYEE ROLES
-- ============================================================================

-- Get role IDs first, then assign
INSERT INTO employee_roles (employee_id, role_id)
SELECT 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0001', id FROM roles WHERE name = 'hr_admin';
INSERT INTO employee_roles (employee_id, role_id)
SELECT 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0001', id FROM roles WHERE name = 'executive';

INSERT INTO employee_roles (employee_id, role_id)
SELECT 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0002', id FROM roles WHERE name = 'hr_admin';
INSERT INTO employee_roles (employee_id, role_id)
SELECT 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0002', id FROM roles WHERE name = 'executive';
INSERT INTO employee_roles (employee_id, role_id)
SELECT 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0002', id FROM roles WHERE name = 'manager';

INSERT INTO employee_roles (employee_id, role_id)
SELECT 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0015', id FROM roles WHERE name = 'executive';
INSERT INTO employee_roles (employee_id, role_id)
SELECT 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0015', id FROM roles WHERE name = 'manager';

-- Managers
INSERT INTO employee_roles (employee_id, role_id)
SELECT 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0003', id FROM roles WHERE name = 'manager';
INSERT INTO employee_roles (employee_id, role_id)
SELECT 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0004', id FROM roles WHERE name = 'manager';
INSERT INTO employee_roles (employee_id, role_id)
SELECT 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0011', id FROM roles WHERE name = 'manager';
INSERT INTO employee_roles (employee_id, role_id)
SELECT 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0018', id FROM roles WHERE name = 'hr_admin';
INSERT INTO employee_roles (employee_id, role_id)
SELECT 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0018', id FROM roles WHERE name = 'manager';
INSERT INTO employee_roles (employee_id, role_id)
SELECT 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0019', id FROM roles WHERE name = 'finance';
INSERT INTO employee_roles (employee_id, role_id)
SELECT 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0019', id FROM roles WHERE name = 'manager';
INSERT INTO employee_roles (employee_id, role_id)
SELECT 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0020', id FROM roles WHERE name = 'manager';
INSERT INTO employee_roles (employee_id, role_id)
SELECT 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0021', id FROM roles WHERE name = 'manager';
INSERT INTO employee_roles (employee_id, role_id)
SELECT 'eeeeeeee-eeee-eeee-eeee-eeeeeeee0022', id FROM roles WHERE name = 'manager';

-- All other employees get 'employee' role
INSERT INTO employee_roles (employee_id, role_id)
SELECT e.id, r.id
FROM employees e
CROSS JOIN roles r
WHERE r.name = 'employee'
AND NOT EXISTS (
    SELECT 1 FROM employee_roles er
    WHERE er.employee_id = e.id AND er.role_id = r.id
);

-- ============================================================================
-- CAPTURE INITIAL HEADCOUNT SNAPSHOT
-- ============================================================================

SELECT capture_headcount_snapshot(CURRENT_DATE);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify employee count
SELECT 'Total Employees' AS metric, COUNT(*) AS value FROM employees
UNION ALL
SELECT 'Active Employees', COUNT(*) FROM employees WHERE current_status = 'active'
UNION ALL
SELECT 'Pending Start', COUNT(*) FROM employees WHERE current_status = 'pending_start';

-- Verify by location
SELECT l.code, COUNT(DISTINCT e.id) AS employee_count
FROM employees e
JOIN employment_records er ON e.id = er.employee_id AND er.end_date IS NULL
JOIN locations l ON er.location_id = l.id
GROUP BY l.code;

-- Verify upcoming cliffs (within 90 days)
SELECT COUNT(*) AS upcoming_cliffs FROM v_equity_cliff_monitor;

-- ============================================================================
-- RE-ENABLE ROW LEVEL SECURITY AND TRIGGERS
-- ============================================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_local_data ENABLE ROW LEVEL SECURITY;

-- Re-enable the onboarding trigger
ALTER TABLE employees ENABLE TRIGGER trg_employee_onboarding;

-- Re-enable audit triggers
ALTER TABLE salary_records ENABLE TRIGGER audit_salary_access;
ALTER TABLE equity_grants ENABLE TRIGGER audit_equity_access;
