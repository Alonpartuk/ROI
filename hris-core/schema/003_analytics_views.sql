-- ============================================================================
-- HR ANALYTICS DASHBOARD - SQL VIEWS & FUNCTIONS
-- ============================================================================
--
-- METRICS:
-- 1. Global Burn Rate - Monthly cost by location (in USD)
-- 2. Equity Cliff Monitor - Employees with cliff in next 90 days
-- 3. Headcount Growth - Monthly count by department
-- 4. Additional KPIs for comprehensive dashboard
-- ============================================================================

-- ============================================================================
-- EXCHANGE RATES TABLE (For multi-currency normalization)
-- ============================================================================

CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_currency CHAR(3) NOT NULL,
    to_currency CHAR(3) NOT NULL,
    rate DECIMAL(15,6) NOT NULL,
    effective_date DATE NOT NULL,
    source VARCHAR(50) DEFAULT 'manual',        -- 'manual', 'api', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_currency, to_currency, effective_date)
);

-- Insert sample exchange rates (to be updated regularly)
INSERT INTO exchange_rates (from_currency, to_currency, rate, effective_date) VALUES
    ('ILS', 'USD', 0.27, CURRENT_DATE),
    ('CAD', 'USD', 0.74, CURRENT_DATE),
    ('USD', 'USD', 1.00, CURRENT_DATE)
ON CONFLICT (from_currency, to_currency, effective_date) DO UPDATE
SET rate = EXCLUDED.rate;

-- Function to get exchange rate
CREATE OR REPLACE FUNCTION get_exchange_rate(
    p_from_currency CHAR(3),
    p_to_currency CHAR(3),
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL(15,6) AS $$
DECLARE
    v_rate DECIMAL(15,6);
BEGIN
    -- Same currency
    IF p_from_currency = p_to_currency THEN
        RETURN 1.0;
    END IF;

    -- Find most recent rate on or before the date
    SELECT rate INTO v_rate
    FROM exchange_rates
    WHERE from_currency = p_from_currency
      AND to_currency = p_to_currency
      AND effective_date <= p_date
    ORDER BY effective_date DESC
    LIMIT 1;

    IF v_rate IS NULL THEN
        RAISE WARNING 'No exchange rate found for % to %', p_from_currency, p_to_currency;
        RETURN NULL;
    END IF;

    RETURN v_rate;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- BENEFITS CONFIGURATION (For burn rate calculation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS benefits_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES locations(id),
    benefit_type VARCHAR(50) NOT NULL,          -- 'employer_pension', 'health_insurance', etc.
    calculation_type VARCHAR(20) NOT NULL,      -- 'percentage', 'fixed'
    value DECIMAL(10,4) NOT NULL,               -- Percentage or fixed amount
    currency CHAR(3),                           -- For fixed amounts
    max_salary_base DECIMAL(15,2),              -- Cap for percentage calculation
    effective_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default benefits by location
INSERT INTO benefits_config (location_id, benefit_type, calculation_type, value, effective_date) VALUES
    -- Israel (TLV)
    ((SELECT id FROM locations WHERE code = 'TLV'), 'employer_pension', 'percentage', 6.5, '2024-01-01'),
    ((SELECT id FROM locations WHERE code = 'TLV'), 'severance_fund', 'percentage', 8.33, '2024-01-01'),
    ((SELECT id FROM locations WHERE code = 'TLV'), 'education_fund', 'percentage', 7.5, '2024-01-01'),
    ((SELECT id FROM locations WHERE code = 'TLV'), 'national_insurance', 'percentage', 3.55, '2024-01-01'),
    -- Canada (TOR)
    ((SELECT id FROM locations WHERE code = 'TOR'), 'employer_cpp', 'percentage', 5.95, '2024-01-01'),
    ((SELECT id FROM locations WHERE code = 'TOR'), 'employer_ei', 'percentage', 2.21, '2024-01-01'),
    ((SELECT id FROM locations WHERE code = 'TOR'), 'health_benefits', 'percentage', 8.0, '2024-01-01'),
    -- US
    ((SELECT id FROM locations WHERE code = 'US'), 'employer_fica', 'percentage', 7.65, '2024-01-01'),
    ((SELECT id FROM locations WHERE code = 'US'), 'health_insurance', 'percentage', 12.0, '2024-01-01'),
    ((SELECT id FROM locations WHERE code = 'US'), '401k_match', 'percentage', 4.0, '2024-01-01')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VIEW 1: GLOBAL BURN RATE
-- Monthly cost by location (Salary + Benefits) in USD
-- ============================================================================

CREATE OR REPLACE VIEW v_global_burn_rate AS
WITH current_salaries AS (
    -- Get current salary for each active employee
    SELECT
        e.id AS employee_id,
        er.location_id,
        l.code AS location_code,
        l.name AS location_name,
        sr.amount,
        sr.currency,
        sr.frequency,
        -- Normalize to monthly amount
        CASE sr.frequency
            WHEN 'annual' THEN sr.amount / 12
            WHEN 'monthly' THEN sr.amount
            WHEN 'hourly' THEN sr.amount * er.weekly_hours * 4.33
            WHEN 'daily' THEN sr.amount * 21.67
        END AS monthly_amount,
        sr.currency AS salary_currency
    FROM employees e
    JOIN employment_records er ON e.id = er.employee_id
        AND er.effective_date <= CURRENT_DATE
        AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
        AND er.status = 'active'
    JOIN salary_records sr ON e.id = sr.employee_id
        AND sr.effective_date <= CURRENT_DATE
        AND (sr.end_date IS NULL OR sr.end_date > CURRENT_DATE)
    JOIN locations l ON er.location_id = l.id
    WHERE NOT e.is_deleted
),
salary_in_usd AS (
    -- Convert to USD
    SELECT
        cs.*,
        cs.monthly_amount * get_exchange_rate(cs.currency, 'USD') AS monthly_amount_usd
    FROM current_salaries cs
),
benefits_cost AS (
    -- Calculate benefits per employee
    SELECT
        su.employee_id,
        su.location_id,
        SUM(
            CASE bc.calculation_type
                WHEN 'percentage' THEN
                    LEAST(su.monthly_amount, COALESCE(bc.max_salary_base, su.monthly_amount))
                    * bc.value / 100
                WHEN 'fixed' THEN
                    bc.value * get_exchange_rate(bc.currency, su.salary_currency)
            END
        ) AS monthly_benefits_local
    FROM salary_in_usd su
    JOIN benefits_config bc ON su.location_id = bc.location_id
        AND bc.effective_date <= CURRENT_DATE
        AND (bc.end_date IS NULL OR bc.end_date > CURRENT_DATE)
    GROUP BY su.employee_id, su.location_id
),
benefits_in_usd AS (
    SELECT
        bc.employee_id,
        bc.location_id,
        bc.monthly_benefits_local * get_exchange_rate(
            (SELECT default_currency FROM locations WHERE id = bc.location_id),
            'USD'
        ) AS monthly_benefits_usd
    FROM benefits_cost bc
)
SELECT
    su.location_code,
    su.location_name,
    COUNT(DISTINCT su.employee_id) AS headcount,
    ROUND(SUM(su.monthly_amount_usd)::numeric, 2) AS monthly_salary_usd,
    ROUND(SUM(COALESCE(bu.monthly_benefits_usd, 0))::numeric, 2) AS monthly_benefits_usd,
    ROUND(SUM(su.monthly_amount_usd + COALESCE(bu.monthly_benefits_usd, 0))::numeric, 2) AS monthly_total_usd,
    ROUND(SUM(su.monthly_amount_usd + COALESCE(bu.monthly_benefits_usd, 0))::numeric * 12, 2) AS annual_total_usd
FROM salary_in_usd su
LEFT JOIN benefits_in_usd bu ON su.employee_id = bu.employee_id
GROUP BY su.location_code, su.location_name
ORDER BY su.location_code;

-- Global totals view
CREATE OR REPLACE VIEW v_global_burn_rate_total AS
SELECT
    'GLOBAL' AS location_code,
    'All Locations' AS location_name,
    SUM(headcount) AS headcount,
    SUM(monthly_salary_usd) AS monthly_salary_usd,
    SUM(monthly_benefits_usd) AS monthly_benefits_usd,
    SUM(monthly_total_usd) AS monthly_total_usd,
    SUM(annual_total_usd) AS annual_total_usd
FROM v_global_burn_rate;

-- ============================================================================
-- VIEW 2: EQUITY CLIFF MONITOR
-- Employees with 12-month cliff vesting within next 90 days
-- ============================================================================

CREATE OR REPLACE VIEW v_equity_cliff_monitor AS
SELECT
    e.id AS employee_id,
    e.employee_number,
    COALESCE(e.preferred_first_name, e.legal_first_name) || ' ' ||
        COALESCE(e.preferred_last_name, e.legal_last_name) AS employee_name,
    e.work_email,
    eg.grant_number,
    eg.grant_type,
    eg.shares_granted,
    eg.cliff_months,
    eg.vesting_start_date,
    -- Calculate cliff date
    eg.vesting_start_date + (eg.cliff_months || ' months')::INTERVAL AS cliff_date,
    -- Shares that will vest at cliff
    ROUND(eg.shares_granted::DECIMAL * eg.cliff_months / eg.total_vesting_months) AS cliff_shares,
    -- Days until cliff
    (eg.vesting_start_date + (eg.cliff_months || ' months')::INTERVAL)::DATE - CURRENT_DATE AS days_until_cliff,
    -- Manager info
    mgr.employee_number AS manager_number,
    COALESCE(mgr.preferred_first_name, mgr.legal_first_name) || ' ' ||
        COALESCE(mgr.preferred_last_name, mgr.legal_last_name) AS manager_name,
    l.code AS location_code,
    d.name AS department
FROM employees e
JOIN equity_grants eg ON e.id = eg.employee_id
JOIN employment_records er ON e.id = er.employee_id
    AND er.effective_date <= CURRENT_DATE
    AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
LEFT JOIN employees mgr ON er.manager_id = mgr.id
LEFT JOIN locations l ON er.location_id = l.id
LEFT JOIN departments d ON er.department_id = d.id
WHERE NOT e.is_deleted
  AND er.status = 'active'
  AND eg.cliff_months IS NOT NULL
  AND eg.cliff_months > 0
  AND eg.shares_vested = 0                      -- Cliff hasn't occurred yet
  -- Cliff date is within next 90 days
  AND (eg.vesting_start_date + (eg.cliff_months || ' months')::INTERVAL)::DATE
      BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '90 days')
ORDER BY cliff_date;

-- Extended cliff monitor with alert levels
CREATE OR REPLACE VIEW v_equity_cliff_alerts AS
SELECT
    *,
    CASE
        WHEN days_until_cliff <= 7 THEN 'critical'
        WHEN days_until_cliff <= 30 THEN 'high'
        WHEN days_until_cliff <= 60 THEN 'medium'
        ELSE 'low'
    END AS alert_level
FROM v_equity_cliff_monitor;

-- ============================================================================
-- VIEW 3: HEADCOUNT GROWTH
-- Monthly count of active employees by department
-- ============================================================================

-- Historical headcount snapshot (requires periodic snapshots)
CREATE TABLE IF NOT EXISTS headcount_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_date DATE NOT NULL,
    department_id UUID REFERENCES departments(id),
    location_id UUID REFERENCES locations(id),
    employment_type employment_type,
    headcount INTEGER NOT NULL,
    fte_count DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(snapshot_date, department_id, location_id, employment_type)
);

-- Function to capture headcount snapshot
CREATE OR REPLACE FUNCTION capture_headcount_snapshot(p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
    v_rows_inserted INTEGER;
BEGIN
    INSERT INTO headcount_snapshots (snapshot_date, department_id, location_id, employment_type, headcount, fte_count)
    SELECT
        p_date,
        er.department_id,
        er.location_id,
        er.employment_type,
        COUNT(DISTINCT e.id),
        SUM(er.fte_percentage / 100)
    FROM employees e
    JOIN employment_records er ON e.id = er.employee_id
        AND er.effective_date <= p_date
        AND (er.end_date IS NULL OR er.end_date > p_date)
        AND er.status = 'active'
    WHERE NOT e.is_deleted
    GROUP BY er.department_id, er.location_id, er.employment_type
    ON CONFLICT (snapshot_date, department_id, location_id, employment_type)
    DO UPDATE SET
        headcount = EXCLUDED.headcount,
        fte_count = EXCLUDED.fte_count;

    GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;
    RETURN v_rows_inserted;
END;
$$ LANGUAGE plpgsql;

-- View for current headcount by department
CREATE OR REPLACE VIEW v_current_headcount_by_department AS
SELECT
    d.id AS department_id,
    d.code AS department_code,
    d.name AS department_name,
    COUNT(DISTINCT e.id) AS headcount,
    SUM(er.fte_percentage / 100) AS fte_count,
    COUNT(DISTINCT CASE WHEN er.employment_type = 'full_time' THEN e.id END) AS full_time_count,
    COUNT(DISTINCT CASE WHEN er.employment_type = 'contractor' THEN e.id END) AS contractor_count
FROM departments d
LEFT JOIN employment_records er ON d.id = er.department_id
    AND er.effective_date <= CURRENT_DATE
    AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
    AND er.status = 'active'
LEFT JOIN employees e ON er.employee_id = e.id AND NOT e.is_deleted
GROUP BY d.id, d.code, d.name
ORDER BY d.name;

-- View for headcount growth over time (from snapshots)
CREATE OR REPLACE VIEW v_headcount_growth AS
SELECT
    hs.snapshot_date,
    d.code AS department_code,
    d.name AS department_name,
    l.code AS location_code,
    SUM(hs.headcount) AS headcount,
    SUM(hs.fte_count) AS fte_count,
    -- Month-over-month change
    SUM(hs.headcount) - LAG(SUM(hs.headcount)) OVER (
        PARTITION BY d.id, l.id
        ORDER BY hs.snapshot_date
    ) AS mom_change,
    -- Year-over-year change
    SUM(hs.headcount) - LAG(SUM(hs.headcount), 12) OVER (
        PARTITION BY d.id, l.id
        ORDER BY hs.snapshot_date
    ) AS yoy_change
FROM headcount_snapshots hs
LEFT JOIN departments d ON hs.department_id = d.id
LEFT JOIN locations l ON hs.location_id = l.id
GROUP BY hs.snapshot_date, d.id, d.code, d.name, l.id, l.code
ORDER BY hs.snapshot_date DESC, d.name;

-- Monthly headcount summary (for charts)
CREATE OR REPLACE VIEW v_monthly_headcount_summary AS
SELECT
    DATE_TRUNC('month', hs.snapshot_date)::DATE AS month,
    SUM(hs.headcount) AS total_headcount,
    SUM(hs.fte_count) AS total_fte,
    SUM(CASE WHEN l.code = 'TLV' THEN hs.headcount ELSE 0 END) AS tlv_headcount,
    SUM(CASE WHEN l.code = 'TOR' THEN hs.headcount ELSE 0 END) AS tor_headcount,
    SUM(CASE WHEN l.code = 'US' THEN hs.headcount ELSE 0 END) AS us_headcount
FROM headcount_snapshots hs
LEFT JOIN locations l ON hs.location_id = l.id
GROUP BY DATE_TRUNC('month', hs.snapshot_date)
ORDER BY month DESC;

-- ============================================================================
-- ADDITIONAL KPI VIEWS
-- ============================================================================

-- Tenure Distribution
CREATE OR REPLACE VIEW v_tenure_distribution AS
SELECT
    tenure_band,
    COUNT(*) AS employee_count,
    ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER () * 100, 1) AS percentage
FROM (
    SELECT
        e.id,
        CASE
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.original_hire_date)) +
                 EXTRACT(MONTH FROM AGE(CURRENT_DATE, e.original_hire_date)) / 12.0 < 1 THEN '0-1 years'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.original_hire_date)) +
                 EXTRACT(MONTH FROM AGE(CURRENT_DATE, e.original_hire_date)) / 12.0 < 2 THEN '1-2 years'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.original_hire_date)) +
                 EXTRACT(MONTH FROM AGE(CURRENT_DATE, e.original_hire_date)) / 12.0 < 3 THEN '2-3 years'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.original_hire_date)) +
                 EXTRACT(MONTH FROM AGE(CURRENT_DATE, e.original_hire_date)) / 12.0 < 5 THEN '3-5 years'
            ELSE '5+ years'
        END AS tenure_band
    FROM employees e
    JOIN employment_records er ON e.id = er.employee_id
        AND er.effective_date <= CURRENT_DATE
        AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
        AND er.status = 'active'
    WHERE NOT e.is_deleted
) tenure_calc
GROUP BY tenure_band
ORDER BY
    CASE tenure_band
        WHEN '0-1 years' THEN 1
        WHEN '1-2 years' THEN 2
        WHEN '2-3 years' THEN 3
        WHEN '3-5 years' THEN 4
        ELSE 5
    END;

-- Upcoming Anniversaries (next 30 days)
CREATE OR REPLACE VIEW v_upcoming_anniversaries AS
SELECT
    e.id AS employee_id,
    e.employee_number,
    COALESCE(e.preferred_first_name, e.legal_first_name) || ' ' ||
        COALESCE(e.preferred_last_name, e.legal_last_name) AS employee_name,
    e.original_hire_date,
    EXTRACT(YEAR FROM AGE(
        DATE_TRUNC('year', CURRENT_DATE) + (e.original_hire_date - DATE_TRUNC('year', e.original_hire_date)),
        e.original_hire_date
    )) + 1 AS upcoming_anniversary_year,
    DATE_TRUNC('year', CURRENT_DATE)::DATE +
        (e.original_hire_date - DATE_TRUNC('year', e.original_hire_date)) AS anniversary_date_this_year,
    d.name AS department,
    mgr.employee_number AS manager_number
FROM employees e
JOIN employment_records er ON e.id = er.employee_id
    AND er.effective_date <= CURRENT_DATE
    AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
    AND er.status = 'active'
LEFT JOIN departments d ON er.department_id = d.id
LEFT JOIN employees mgr ON er.manager_id = mgr.id
WHERE NOT e.is_deleted
  AND (
      DATE_TRUNC('year', CURRENT_DATE)::DATE +
      (e.original_hire_date - DATE_TRUNC('year', e.original_hire_date))
  ) BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
ORDER BY anniversary_date_this_year;

-- Compensation Summary by Level
CREATE OR REPLACE VIEW v_compensation_by_level AS
SELECT
    jl.code AS level_code,
    jl.name AS level_name,
    jl.track,
    l.code AS location_code,
    COUNT(DISTINCT e.id) AS employee_count,
    ROUND(AVG(sr.annualized_amount)::NUMERIC, 0) AS avg_salary_usd,
    ROUND(MIN(sr.annualized_amount)::NUMERIC, 0) AS min_salary_usd,
    ROUND(MAX(sr.annualized_amount)::NUMERIC, 0) AS max_salary_usd,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sr.annualized_amount)::NUMERIC, 0) AS median_salary_usd
FROM employees e
JOIN employment_records er ON e.id = er.employee_id
    AND er.effective_date <= CURRENT_DATE
    AND (er.end_date IS NULL OR er.end_date > CURRENT_DATE)
    AND er.status = 'active'
JOIN salary_records sr ON e.id = sr.employee_id
    AND sr.effective_date <= CURRENT_DATE
    AND (sr.end_date IS NULL OR sr.end_date > CURRENT_DATE)
JOIN job_levels jl ON er.job_level_id = jl.id
JOIN locations l ON er.location_id = l.id
WHERE NOT e.is_deleted
GROUP BY jl.code, jl.name, jl.track, jl.rank, l.code
ORDER BY jl.rank, l.code;

-- Equity Pool Utilization
CREATE OR REPLACE VIEW v_equity_pool_utilization AS
SELECT
    ep.id AS plan_id,
    ep.name AS plan_name,
    ep.plan_type,
    ep.total_pool_shares,
    ep.allocated_shares,
    ep.total_pool_shares - ep.allocated_shares AS available_shares,
    ROUND(ep.allocated_shares::DECIMAL / ep.total_pool_shares * 100, 2) AS utilization_percent,
    COUNT(DISTINCT eg.id) AS active_grants,
    COUNT(DISTINCT eg.employee_id) AS employees_with_grants,
    SUM(eg.shares_granted) AS total_shares_granted,
    SUM(eg.shares_vested) AS total_shares_vested,
    SUM(eg.shares_exercised) AS total_shares_exercised
FROM equity_plans ep
LEFT JOIN equity_grants eg ON ep.id = eg.equity_plan_id
WHERE ep.is_active
GROUP BY ep.id, ep.name, ep.plan_type, ep.total_pool_shares, ep.allocated_shares;

-- ============================================================================
-- DASHBOARD AGGREGATE FUNCTION
-- Returns all key metrics in one call
-- ============================================================================

CREATE OR REPLACE FUNCTION get_hr_dashboard_metrics()
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'generated_at', NOW(),
        'burn_rate', (
            SELECT jsonb_agg(row_to_json(br))
            FROM v_global_burn_rate br
        ),
        'burn_rate_total', (
            SELECT row_to_json(brt)
            FROM v_global_burn_rate_total brt
        ),
        'cliff_alerts', (
            SELECT jsonb_agg(row_to_json(ca))
            FROM v_equity_cliff_alerts ca
        ),
        'cliff_count', (
            SELECT COUNT(*) FROM v_equity_cliff_monitor
        ),
        'headcount_by_department', (
            SELECT jsonb_agg(row_to_json(hd))
            FROM v_current_headcount_by_department hd
        ),
        'tenure_distribution', (
            SELECT jsonb_agg(row_to_json(td))
            FROM v_tenure_distribution td
        ),
        'upcoming_anniversaries', (
            SELECT jsonb_agg(row_to_json(ua))
            FROM v_upcoming_anniversaries ua
        ),
        'equity_utilization', (
            SELECT jsonb_agg(row_to_json(eu))
            FROM v_equity_pool_utilization eu
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
