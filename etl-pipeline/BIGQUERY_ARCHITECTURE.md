# Complete BigQuery Reporting Architecture
## HubSpot Sales Pipeline Analytics for React/Tremor Frontend

**Project**: `octup-testing`
**Dataset**: `hubspot_data`
**Total Active Views**: **48**
**Primary Pipeline Filter**: `3PL New Business`
**Generated**: 2026-01-29

---

## Table of Contents

1. [Source Tables](#source-tables)
2. [Global Patterns](#global-patterns)
3. [Core Risk Views](#1-core-risk-views)
4. [Multi-Threading Analysis](#2-multi-threading-analysis)
5. [Owner Performance Views](#3-owner-performance-views)
6. [Rep Ramp Views](#4-rep-ramp-views)
7. [Pipeline Overview Views](#5-pipeline-overview-views)
8. [Deal Health Views](#6-deal-health-views)
9. [SDR Activity Views](#7-sdr-activity-views)
10. [Movement & Slippage Views](#8-movement--slippage-views)
11. [Forecasting Views](#9-forecasting-views)
12. [Executive / AI Views](#10-executive--ai-views)
13. [Analysis Views](#11-analysis-views)
14. [Detail Views](#12-detail-views)
15. [Frontend Query Examples](#frontend-query-examples)
16. [Important Notes for Frontend](#important-notes-for-frontend)

---

## Source Tables

| Table | Description | Refresh |
|-------|-------------|---------|
| `deals_snapshots` | Daily snapshots of all HubSpot deals | Daily ETL |
| `meetings_snapshots` | Daily snapshots of all HubSpot meetings | Daily ETL |

---

## Global Patterns

### Deduplication Pattern

All views use this standard pattern to get only the latest snapshot:

```sql
-- Standard deduplication (single latest date)
WHERE snapshot_date = (
  SELECT MAX(snapshot_date)
  FROM `octup-testing.hubspot_data.deals_snapshots`
)

-- With CTE pattern
WITH latest_snapshot AS (
  SELECT MAX(snapshot_date) AS max_date
  FROM `octup-testing.hubspot_data.deals_snapshots`
)
SELECT * FROM deals_snapshots d
WHERE d.snapshot_date = (SELECT max_date FROM latest_snapshot)
```

### ARR Value Standardization

```sql
-- Use hs_arr if available, fallback to amount
COALESCE(hs_arr, amount) AS arr_value
```

---

## 1. CORE RISK VIEWS

### v_deals_at_risk

**Purpose**: Master risk view - flags all open deals with risk indicators
**Filter**: `pipeline_label = '3PL New Business' AND is_open = TRUE`

| # | Column | Type | Description |
|---|--------|------|-------------|
| 1 | hs_object_id | STRING | HubSpot deal ID |
| 2 | dealname | STRING | Deal name |
| 3 | amount | FLOAT64 | Original deal amount |
| 4 | arr_value | FLOAT64 | ARR value (hs_arr or amount) |
| 5 | dealstage_label | STRING | Current stage name |
| 6 | owner_name | STRING | Deal owner |
| 7 | owner_email | STRING | Owner email |
| 8 | company_name | STRING | Company name |
| 9 | company_industry | STRING | Industry |
| 10 | days_in_current_stage | INT64 | Days since last stage change |
| 11 | notes_last_contacted | TIMESTAMP | Last contact date |
| 12 | hs_next_step | STRING | Next step field |
| 13 | createdate | TIMESTAMP | Deal created date |
| 14 | hs_lastmodifieddate | TIMESTAMP | Last modified |
| 15 | snapshot_date | DATE | Snapshot date |
| 16 | next_meeting_scheduled | TIMESTAMP | Next meeting date |
| 17 | last_meeting_date | TIMESTAMP | Last meeting date |
| 18 | recent_meetings_count | INT64 | Meetings in last 14 days |
| 19 | days_since_last_activity | INT64 | Days since lastmodified |
| 20 | **is_enterprise** | BOOL | TRUE if ARR >= $100,000 |
| 21 | **has_upcoming_meeting** | BOOL | TRUE if future meeting exists |
| 22 | **has_recent_activity** | BOOL | TRUE if modified in last 7 days |
| 23 | **is_unassigned_risk** | BOOL | Owner is Kurt/Hanan/Deactivated |
| 24 | **is_stalled** | BOOL | Stalled beyond threshold |
| 25 | **is_ghosted** | BOOL | No engagement beyond threshold |
| 26 | **is_not_3pl_match** | BOOL | Company not 3PL industry |
| 27 | **is_stalled_delayed** | BOOL | In Delayed stage >30 days |
| 28 | **is_at_risk** | BOOL | Overall risk flag |
| 29 | **primary_risk_reason** | STRING | Risk category label |
| 30 | risk_flag_count | INT64 | Number of risk flags |

#### Risk Calculation Logic

```sql
-- ENTERPRISE THRESHOLD
is_enterprise = COALESCE(hs_arr, amount) >= 100000

-- STALLED LOGIC (different thresholds by deal size)
is_stalled = CASE
  WHEN next_meeting_scheduled IS NOT NULL THEN FALSE  -- Meeting overrides
  WHEN DATE_DIFF(CURRENT_DATE(), DATE(hs_lastmodifieddate), DAY) <= 7 THEN FALSE  -- Activity overrides
  WHEN is_enterprise AND days_in_current_stage > 30 THEN TRUE
  WHEN NOT is_enterprise AND days_in_current_stage > 14 THEN TRUE
  ELSE FALSE
END

-- GHOSTED LOGIC
is_ghosted = CASE
  WHEN next_meeting_scheduled IS NOT NULL THEN FALSE
  WHEN DATE_DIFF(CURRENT_DATE(), DATE(hs_lastmodifieddate), DAY) <= 7 THEN FALSE
  WHEN is_enterprise AND no_contact > 10 days THEN TRUE
  WHEN NOT is_enterprise AND no_contact > 5 days THEN TRUE
  ELSE FALSE
END

-- OWNERSHIP RISK (NOT Chanan - he's pending rebook)
is_unassigned_risk = LOWER(owner_name) LIKE '%kurt%'
                  OR LOWER(owner_name) LIKE '%hanan%'
                  OR LOWER(owner_name) LIKE '%deactivated%'

-- PENDING REBOOK (tracked but NOT counted as risk)
is_pending_rebook = LOWER(owner_name) LIKE '%chanan%'

-- 3PL MATCH
is_not_3pl_match = company doesn't contain keywords:
  '3pl', 'fulfillment', 'logistics', 'warehouse',
  'shipping', 'freight', 'distribution'

-- OVERALL AT RISK (excludes pending_rebook)
is_at_risk = is_unassigned_risk OR is_stalled OR is_ghosted OR is_not_3pl_match

-- PRIMARY RISK REASON
CASE
  WHEN is_pending_rebook THEN 'Pending Rebook (Chanan)'
  WHEN is_unassigned_risk THEN 'Ownership Risk'
  WHEN is_stalled AND is_ghosted THEN 'Stalled & Ghosted'
  WHEN is_stalled AND is_enterprise THEN 'Stalled (>30 days - Enterprise)'
  WHEN is_stalled THEN 'Stalled (>14 days)'
  WHEN is_ghosted AND is_enterprise THEN 'Ghosted (>10 days - Enterprise)'
  WHEN is_ghosted THEN 'Ghosted (>5 days)'
  WHEN is_not_3pl_match THEN 'Not 3PL Match'
  ELSE 'Healthy'
END
```

#### Risk Thresholds Summary

| Risk Flag | Standard (<$100K) | Enterprise (≥$100K) | Override Conditions |
|-----------|-------------------|---------------------|---------------------|
| `is_stalled` | >14 days in stage | >30 days in stage | has_upcoming_meeting OR has_recent_activity |
| `is_ghosted` | >5 days no contact | >10 days no contact | has_upcoming_meeting OR has_recent_activity |
| `is_unassigned_risk` | Kurt/Hanan/Deactivated | Same | None |
| `is_pending_rebook` | Chanan (NOT risk) | Same | None |

---

### v_at_risk_by_owner

**Purpose**: Risk metrics aggregated by deal owner

| # | Column | Type | Description |
|---|--------|------|-------------|
| 1 | owner_name | STRING | Deal owner |
| 2 | owner_email | STRING | Email |
| 3 | total_open_deals | INT64 | Total deals |
| 4 | total_arr | FLOAT64 | Total ARR |
| 5 | at_risk_deals | INT64 | Count at risk |
| 6 | at_risk_value | FLOAT64 | ARR at risk |
| 7 | stalled_deals | INT64 | Stalled count |
| 8 | ghosted_deals | INT64 | Ghosted count |
| 9 | non_3pl_deals | INT64 | Non-3PL count |
| 10 | at_risk_pct | FLOAT64 | % deals at risk |
| 11 | at_risk_arr_pct | FLOAT64 | % ARR at risk |

---

### v_orphaned_deals_summary

**Purpose**: Deals owned by Kurt/Hanan/Deactivated needing reassignment

| # | Column | Type | Description |
|---|--------|------|-------------|
| 1 | owner_name | STRING | Placeholder owner |
| 2 | deal_count | INT64 | Number of deals |
| 3 | total_arr_at_risk | FLOAT64 | Total ARR |
| 4 | avg_days_in_stage | FLOAT64 | Avg days stalled |
| 5 | top_deals | STRING | Top 5 deal names |

---

### v_stalled_deals_alert

**Purpose**: Stalled deals requiring action

| # | Column | Type | Description |
|---|--------|------|-------------|
| 1 | deal_id | STRING | HubSpot ID |
| 2 | deal_name | STRING | Deal name |
| 3 | value_arr | FLOAT64 | ARR value |
| 4 | owner_name | STRING | Owner |
| 5 | current_stage | STRING | Current stage |
| 6 | days_in_current_stage | INT64 | Days stalled |
| 7 | next_step | STRING | Next step |
| 8 | last_contact_date | TIMESTAMP | Last contact |
| 9 | deal_created | TIMESTAMP | Created date |
| 10 | recommended_action | STRING | Action recommendation |
| 11 | priority_rank | INT64 | Priority (1=highest) |

---

## 2. MULTI-THREADING ANALYSIS

### v_multi_threading

**Purpose**: Contact coverage analysis per deal with risk integration

| # | Column | Type | Description |
|---|--------|------|-------------|
| 1 | snapshot_date | DATE | Date |
| 2 | hs_object_id | STRING | Deal ID |
| 3 | dealname | STRING | Deal name |
| 4 | owner_name | STRING | Owner |
| 5 | owner_email | STRING | Email |
| 6 | dealstage_label | STRING | Stage |
| 7 | arr_value | FLOAT64 | ARR |
| 8 | contact_count | INT64 | Number of contacts |
| 9 | days_in_current_stage | INT64 | Days in stage |
| 10 | **threading_level** | STRING | Contact coverage level |
| 11 | **is_low_threading** | BOOL | TRUE if ≤1 contacts |
| 12 | is_at_risk | BOOL | From v_deals_at_risk |
| 13 | primary_risk_reason | STRING | Risk reason |
| 14 | **is_critical_risk_loss_of_momentum** | BOOL | At Risk AND Low Threading |
| 15 | **combined_risk_status** | STRING | Combined risk category |

#### Threading Classification Logic

```sql
threading_level = CASE
  WHEN contact_count >= 3 THEN 'Healthy (3+ Contacts)'
  WHEN contact_count = 2 THEN 'Moderate (2 Contacts)'
  WHEN contact_count = 1 THEN 'Low (1 Contact)'
  ELSE 'Critical (No Contacts)'
END

is_critical_risk_loss_of_momentum = is_at_risk AND contact_count <= 1

combined_risk_status IN (
  'Critical_Risk_Loss_of_Momentum',
  'At_Risk',
  'Low_Threading_Risk',
  'Healthy'
)
```

---

## 3. OWNER PERFORMANCE VIEWS

### v_owner_leaderboard

**Purpose**: Rep performance metrics (deduplicated, 3PL only)
**Filter**: Excludes Court, A.K., Alon

| # | Column | Type | Description |
|---|--------|------|-------------|
| 1 | snapshot_date | DATE | Date |
| 2 | owner_name | STRING | Rep name |
| 3 | owner_email | STRING | Email |
| 4 | open_deals | INT64 | Open deal count |
| 5 | won_deals | INT64 | Won count |
| 6 | lost_deals | INT64 | Lost count |
| 7 | pipeline_value | FLOAT64 | Total ARR |
| 8 | weighted_pipeline | FLOAT64 | Weighted ARR |
| 9 | won_value | FLOAT64 | Won ARR |
| 10 | **at_risk_value** | FLOAT64 | At-risk ARR |
| 11 | **clean_pipeline_value** | FLOAT64 | pipeline - at_risk |
| 12 | win_rate_pct | FLOAT64 | Win rate % |
| 13 | avg_sales_cycle_days | FLOAT64 | Avg cycle days |
| 14 | at_risk_deals | INT64 | Red status count |

#### At-Risk Value Calculation

```sql
at_risk_value = SUM(IF(is_open AND (
  days_in_current_stage > 14
  OR DATE_DIFF(CURRENT_DATE(), DATE(notes_last_contacted), DAY) > 5
  OR LOWER(owner_name) LIKE '%hanan%'
  OR LOWER(owner_name) LIKE '%kurt%'
), COALESCE(hs_arr, amount), 0))

clean_pipeline_value = pipeline_value - at_risk_value
```

---

## 4. REP RAMP VIEWS

### v_rep_ramp_chart

**Purpose**: Rep performance by quarter of tenure since hire

| # | Column | Type | Description |
|---|--------|------|-------------|
| 1 | owner_name | STRING | Rep name |
| 2 | hire_date | DATE | Hire date |
| 3 | days_employed | INT64 | Total days |
| 4 | current_quarter_of_tenure | INT64 | Current quarter |
| 5 | quarter_of_tenure | INT64 | Quarter number |
| 6 | tenure_quarter_label | STRING | "Q1", "Q2", etc. |
| 7 | deals_won | INT64 | Deals in quarter |
| 8 | new_arr | FLOAT64 | ARR in quarter |
| 9 | avg_deal_size | FLOAT64 | Avg deal size |
| 10 | cumulative_arr | FLOAT64 | Running total |
| 11 | cumulative_deals | INT64 | Running total |

#### Quarter Calculation

```sql
quarter_of_tenure = FLOOR(DATE_DIFF(closedate, hire_date, DAY) / 91) + 1
-- Q1 = days 0-90, Q2 = days 91-181, etc.
```

#### Hire Dates

| Rep | Hire Date |
|-----|-----------|
| Jay Mazur | 2025-06-16 |
| Ava Barnes | 2025-08-18 |
| Blake Read | 2025-08-11 |
| Chanan Burstein | 2025-09-25 |
| Ishmael Williams | 2026-01-02 |
| Matthew Bocker | 2026-01-22 |

---

### v_rep_ramp_summary

**Purpose**: Pivoted ramp comparison view

| # | Column | Type | Description |
|---|--------|------|-------------|
| 1 | owner_name | STRING | Rep |
| 2 | hire_date | DATE | Hire date |
| 3 | days_employed | INT64 | Days |
| 4 | current_qtr | INT64 | Current quarter |
| 5 | q1_arr | FLOAT64 | Q1 ARR |
| 6 | q2_arr | FLOAT64 | Q2 ARR |
| 7 | q3_arr | FLOAT64 | Q3 ARR |
| 8 | q4_arr | FLOAT64 | Q4 ARR |
| 9 | q5_arr | FLOAT64 | Q5 ARR |
| 10 | q6_arr | FLOAT64 | Q6 ARR |
| 11 | total_arr | FLOAT64 | Total ARR |
| 12 | q1_deals | INT64 | Q1 deals |
| 13 | q2_deals | INT64 | Q2 deals |
| 14 | q3_deals | INT64 | Q3 deals |
| 15 | q4_deals | INT64 | Q4 deals |
| 16 | total_deals | INT64 | Total deals |

---

### v_rep_ramp_deals

**Purpose**: Individual deal list per rep

| # | Column | Type | Description |
|---|--------|------|-------------|
| 1 | owner_name | STRING | Rep |
| 2 | hire_date | DATE | Hire date |
| 3 | deal_name | STRING | Deal name |
| 4 | arr_value | FLOAT64 | ARR |
| 5 | close_date | DATE | Close date |
| 6 | days_since_hire | INT64 | Days since hire |
| 7 | quarter_of_tenure | INT64 | Quarter closed |
| 8 | tenure_quarter_label | STRING | "Q1", "Q2", etc. |
| 9 | dealstage_label | STRING | Stage |

---

## 5. PIPELINE OVERVIEW VIEWS

### v_pipeline_summary

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | pipeline_label | STRING |
| 3 | total_deals | INT64 |
| 4 | open_deals | INT64 |
| 5 | won_deals | INT64 |
| 6 | lost_deals | INT64 |
| 7 | open_pipeline_value | FLOAT64 |
| 8 | weighted_pipeline_value | FLOAT64 |
| 9 | won_value | FLOAT64 |
| 10 | avg_deal_size | FLOAT64 |
| 11 | avg_days_in_stage | FLOAT64 |

---

### v_pipeline_trend

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | total_deals | INT64 |
| 3 | open_deals | INT64 |
| 4 | won_deals | INT64 |
| 5 | lost_deals | INT64 |
| 6 | open_pipeline_value | FLOAT64 |
| 7 | weighted_pipeline_value | FLOAT64 |
| 8 | won_value | FLOAT64 |
| 9 | lost_value | FLOAT64 |
| 10 | prev_pipeline_value | FLOAT64 |
| 11 | pipeline_change | FLOAT64 |

---

### v_pipeline_coverage

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | pipeline_label | STRING |
| 3 | pipeline_value | FLOAT64 |
| 4 | weighted_pipeline | FLOAT64 |
| 5 | mtd_won | FLOAT64 |
| 6 | coverage_ratio | FLOAT64 |
| 7 | coverage_status | STRING |

#### Coverage Logic

```sql
coverage_ratio = pipeline_value / mtd_won
coverage_status = CASE
  WHEN coverage_ratio >= 3.0 THEN 'Healthy'
  WHEN coverage_ratio >= 2.1 THEN 'At Risk'
  ELSE 'Critical'
END
```

---

### v_pipeline_concentration

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | pipeline_label | STRING |
| 3 | dealstage_label | STRING |
| 4 | stage_value | FLOAT64 |
| 5 | stage_count | INT64 |
| 6 | total_pipeline_value | FLOAT64 |
| 7 | pct_of_pipeline_value | FLOAT64 |
| 8 | pct_of_pipeline_count | FLOAT64 |
| 9 | concentration_risk | STRING |

---

## 6. DEAL HEALTH VIEWS

### v_deal_aging

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | hs_object_id | STRING |
| 3 | dealname | STRING |
| 4 | dealstage_label | STRING |
| 5 | pipeline_label | STRING |
| 6 | owner_name | STRING |
| 7 | amount | FLOAT64 |
| 8 | days_in_current_stage | INT64 |
| 9 | days_since_created | INT64 |
| 10 | deal_age_status | STRING |
| 11 | primary_contact_name | STRING |
| 12 | primary_contact_email | STRING |
| 13 | company_name | STRING |
| 14 | age_priority_score | INT64 |

#### Age Status Logic

```sql
deal_age_status = Red/Yellow/Green (from deals_snapshots)
age_priority_score = CASE
  WHEN deal_age_status = 'Red' THEN 3
  WHEN deal_age_status = 'Yellow' THEN 2
  WHEN deal_age_status = 'Green' THEN 1
  ELSE 0
END
```

---

### v_deal_aging_summary

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | deal_age_status | STRING |
| 3 | deal_count | INT64 |
| 4 | total_value | FLOAT64 |
| 5 | avg_days_in_stage | FLOAT64 |
| 6 | pct_of_deals | FLOAT64 |

---

### v_stalled_deals

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | hs_object_id | STRING |
| 3 | dealname | STRING |
| 4 | amount | FLOAT64 |
| 5 | dealstage_label | STRING |
| 6 | pipeline_label | STRING |
| 7 | owner_name | STRING |
| 8 | days_in_current_stage | INT64 |
| 9 | notes_last_contacted | TIMESTAMP |
| 10 | hs_latest_meeting_activity | TIMESTAMP |
| 11 | primary_contact_name | STRING |
| 12 | primary_contact_email | STRING |
| 13 | days_since_last_activity | INT64 |
| 14 | activity_status | STRING |

#### Activity Status Logic

```sql
activity_status = CASE
  WHEN days_since_last_activity > 30 THEN 'Severely Stalled'
  WHEN days_since_last_activity > 14 THEN 'Stalled'
  WHEN days_since_last_activity > 7 THEN 'At Risk'
  ELSE 'Active'
END
```

---

### v_avg_time_in_stage

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | pipeline_label | STRING |
| 3 | dealstage_label | STRING |
| 4 | deals_in_stage | INT64 |
| 5 | avg_days | FLOAT64 |
| 6 | min_days | INT64 |
| 7 | max_days | INT64 |
| 8 | median_days | FLOAT64 |

---

## 7. SDR ACTIVITY VIEWS

### v_sdr_activity_weekly

| # | Column | Type |
|---|--------|------|
| 1 | week_start | DATE |
| 2 | sdr_name | STRING |
| 3 | sdr_email | STRING |
| 4 | meetings_booked_count | INT64 |
| 5 | meetings_held_count | INT64 |
| 6 | meetings_scheduled_count | INT64 |
| 7 | meetings_no_show_count | INT64 |
| 8 | meetings_canceled_count | INT64 |
| 9 | meetings_rescheduled_count | INT64 |
| 10 | held_rate_pct | FLOAT64 |
| 11 | no_show_rate_pct | FLOAT64 |

#### SDR Attribution Logic

```sql
-- SDR is who created/booked the meeting
sdr_name = COALESCE(NULLIF(created_by_name, ''), owner_name)
-- Only 3PL pipeline meetings or unassociated prospecting
```

---

### v_sdr_meeting_outcomes

| # | Column | Type |
|---|--------|------|
| 1 | week_start | DATE |
| 2 | sdr_name | STRING |
| 3 | meeting_outcome | STRING |
| 4 | meeting_count | INT64 |
| 5 | pct_of_total | FLOAT64 |

---

### v_sdr_leaderboard

| # | Column | Type |
|---|--------|------|
| 1 | sdr_name | STRING |
| 2 | sdr_email | STRING |
| 3 | week_start | DATE |
| 4 | meetings_booked_count | INT64 |
| 5 | meetings_held_count | INT64 |
| 6 | meetings_no_show_count | INT64 |
| 7 | held_rate_pct | FLOAT64 |
| 8 | no_show_rate_pct | FLOAT64 |
| 9 | total_open_deals | INT64 |
| 10 | total_pipeline_arr | FLOAT64 |
| 11 | at_risk_deals_count | INT64 |
| 12 | at_risk_value | FLOAT64 |
| 13 | stalled_deals | INT64 |
| 14 | ghosted_deals | INT64 |
| 15 | rank_by_meetings_held | INT64 |
| 16 | rank_by_meetings_booked | INT64 |
| 17 | rank_by_held_rate | INT64 |
| 18 | rank_by_risk | INT64 |

---

### v_sdr_forecast_model

| # | Column | Type |
|---|--------|------|
| 1 | sdr_name | STRING |
| 2 | sdr_email | STRING |
| 3 | weeks_active | INT64 |
| 4 | avg_weekly_booked | FLOAT64 |
| 5 | avg_weekly_held | FLOAT64 |
| 6 | avg_held_rate_pct | FLOAT64 |
| 7 | forecasted_next_month_meetings | FLOAT64 |
| 8 | forecasted_next_month_held | FLOAT64 |
| 9 | win_rate_pct | FLOAT64 |
| 10 | avg_deal_size | FLOAT64 |
| 11 | expected_arr_contribution | FLOAT64 |
| 12 | sdr_arr_target | FLOAT64 |
| 13 | arr_gap_to_target | FLOAT64 |
| 14 | gap_to_target | FLOAT64 |
| 15 | forecast_status | STRING |

---

## 8. MOVEMENT & SLIPPAGE VIEWS

### v_daily_deal_movements

| # | Column | Type |
|---|--------|------|
| 1 | deal_id | STRING |
| 2 | deal_name | STRING |
| 3 | value_arr | FLOAT64 |
| 4 | previous_stage | STRING |
| 5 | current_stage | STRING |
| 6 | transition_date | DATE |
| 7 | owner_name | STRING |
| 8 | days_in_previous_stage | INT64 |
| 9 | movement_type | STRING |
| 10 | movement_description | STRING |

#### Movement Type Logic

```sql
movement_type = CASE
  WHEN previous_stage IS NULL THEN 'New Deal'
  WHEN dealstage_label = previous_stage THEN 'No Change'
  WHEN dealstage_label IN ('Closed Won', 'Closed Lost') THEN 'Closed'
  WHEN previous_stage IN ('Closed Won', 'Closed Lost') THEN 'Reopened'
  ELSE 'Stage Change'
END
```

---

### v_stage_conversion

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | deal_id | STRING |
| 3 | deal_name | STRING |
| 4 | hubspot_link | STRING |
| 5 | pipeline_label | STRING |
| 6 | owner_name | STRING |
| 7 | from_stage | STRING |
| 8 | to_stage | STRING |
| 9 | deal_value | FLOAT64 |

---

### v_close_date_slippage

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | hs_object_id | STRING |
| 3 | dealname | STRING |
| 4 | pipeline_label | STRING |
| 5 | owner_name | STRING |
| 6 | amount | FLOAT64 |
| 7 | prev_closedate | TIMESTAMP |
| 8 | curr_closedate | TIMESTAMP |
| 9 | days_slipped | INT64 |
| 10 | slippage_category | STRING |

#### Slippage Categories

```sql
slippage_category = CASE
  WHEN days_slipped > 30 THEN 'Major Slip (30+ days)'
  WHEN days_slipped > 14 THEN 'Moderate Slip (14-30 days)'
  WHEN days_slipped > 0 THEN 'Minor Slip (1-14 days)'
  WHEN days_slipped < 0 THEN 'Pulled In'
  ELSE 'No Change'
END
```

---

### v_slippage_summary

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | total_open_deals | INT64 |
| 3 | slipped_count | INT64 |
| 4 | slippage_rate_pct | FLOAT64 |
| 5 | total_open_value | FLOAT64 |
| 6 | slipped_value | FLOAT64 |
| 7 | value_slippage_rate_pct | FLOAT64 |

---

### v_stage_leakage

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | pipeline_label | STRING |
| 3 | from_stage | STRING |
| 4 | exit_type | STRING |
| 5 | exit_count | INT64 |
| 6 | exit_value | FLOAT64 |

---

## 9. FORECASTING VIEWS

### v_forecast_weighted

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | pipeline_label | STRING |
| 3 | hs_forecast_category | STRING |
| 4 | deal_count | INT64 |
| 5 | total_amount | FLOAT64 |
| 6 | weighted_forecast | FLOAT64 |
| 7 | avg_probability | FLOAT64 |

---

### v_forecast_distribution

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | pipeline_label | STRING |
| 3 | hs_forecast_category | STRING |
| 4 | deal_count | INT64 |
| 5 | total_amount | FLOAT64 |
| 6 | weighted_amount | FLOAT64 |
| 7 | pct_of_pipeline | FLOAT64 |

---

### v_forecasting_raw_data

| # | Column | Type |
|---|--------|------|
| 1 | quarterly_target | INT64 |
| 2 | deals_won_6mo | INT64 |
| 3 | deals_lost_6mo | INT64 |
| 4 | revenue_won_6mo | FLOAT64 |
| 5 | avg_sales_cycle_days | FLOAT64 |
| 6 | historical_win_rate_pct | FLOAT64 |
| 7 | total_open_deals | INT64 |
| 8 | total_pipeline_value | FLOAT64 |
| 9 | total_weighted_value | FLOAT64 |
| 10 | deals_past_close_date | INT64 |
| 11 | slippage_pct | FLOAT64 |
| 12 | deals_closing_this_quarter | INT64 |
| 13 | value_closing_this_quarter | FLOAT64 |
| 14 | weighted_closing_this_quarter | FLOAT64 |
| 15 | snapshot_date | DATE |

---

## 10. EXECUTIVE / AI VIEWS

### v_ceo_dashboard

| # | Column | Type |
|---|--------|------|
| 1 | report_date | DATE |
| 2 | total_open_deals | INT64 |
| 3 | total_pipeline_value | FLOAT64 |
| 4 | weighted_pipeline_value | FLOAT64 |
| 5 | active_open_deals | INT64 |
| 6 | total_pipeline_value_active | FLOAT64 |
| 7 | weighted_pipeline_value_active | FLOAT64 |
| 8 | stalled_deals_count | INT64 |
| 9 | stalled_pipeline_value | FLOAT64 |
| 10 | stalled_weighted_value | FLOAT64 |
| 11 | avg_deal_size | FLOAT64 |
| 12 | win_rate_pct | FLOAT64 |
| 13 | avg_sales_cycle_days | FLOAT64 |
| 14 | red_deals_count | INT64 |
| 15 | red_deals_value | FLOAT64 |
| 16 | pct_deals_at_risk | FLOAT64 |
| 17 | next_step_coverage_pct | FLOAT64 |
| 18 | deals_won_count | INT64 |
| 19 | deals_won_value | FLOAT64 |
| 20 | deals_lost_count | INT64 |
| 21 | deals_lost_value | FLOAT64 |

---

### v_weekly_summary_data

**Purpose**: Gemini AI input data - comprehensive metrics for AI analysis

| # | Column | Type |
|---|--------|------|
| 1 | report_date | DATE |
| 2 | current_open_deals | INT64 |
| 3 | current_pipeline_value | FLOAT64 |
| 4 | current_weighted_pipeline | FLOAT64 |
| 5 | current_won_value | FLOAT64 |
| 6 | current_win_rate | FLOAT64 |
| 7 | current_at_risk_deals | INT64 |
| 8 | current_at_risk_value | FLOAT64 |
| 9 | current_avg_days_in_stage | FLOAT64 |
| 10 | previous_open_deals | INT64 |
| 11 | previous_pipeline_value | FLOAT64 |
| 12 | previous_won_value | FLOAT64 |
| 13 | previous_win_rate | FLOAT64 |
| 14 | pipeline_change | FLOAT64 |
| 15 | pipeline_change_pct | FLOAT64 |
| 16 | deals_slipped | INT64 |
| 17 | slipped_value | FLOAT64 |
| 18 | top_owners_summary | STRING |
| 19 | enterprise_deals_count | INT64 |
| 20 | enterprise_arr | FLOAT64 |
| 21 | standard_deals_count | INT64 |
| 22 | standard_arr | FLOAT64 |
| 23 | deals_with_meetings | INT64 |
| 24 | arr_with_meetings | FLOAT64 |
| 25 | deals_with_recent_activity | INT64 |
| 26 | arr_with_recent_activity | FLOAT64 |
| 27 | ownership_risk_count | INT64 |
| 28 | ownership_risk_arr | FLOAT64 |
| 29 | stalled_count | INT64 |
| 30 | stalled_arr | FLOAT64 |
| 31 | ghosted_count | INT64 |
| 32 | ghosted_arr | FLOAT64 |
| 33 | not_3pl_count | INT64 |
| 34 | not_3pl_arr | FLOAT64 |
| 35 | enterprise_stalled_count | INT64 |
| 36 | enterprise_stalled_arr | FLOAT64 |
| 37 | healthy_count | INT64 |
| 38 | healthy_arr | FLOAT64 |
| 39 | avg_days_since_activity | FLOAT64 |
| 40 | top_at_risk_deals | STRING |
| 41 | upcoming_meetings | STRING |
| 42 | deals_saved_by_activity | STRING |

---

### v_ai_executive_summary

**Purpose**: AI-generated executive insight

| # | Column | Type |
|---|--------|------|
| 1 | total_pipeline_value | FLOAT64 |
| 2 | weighted_value | FLOAT64 |
| 3 | count_at_risk | INT64 |
| 4 | avg_win_rate | FLOAT64 |
| 5 | weighted_confidence_pct | FLOAT64 |
| 6 | executive_insight | STRING |
| 7 | generated_at | TIMESTAMP |

---

### v_ai_forecast_analysis

**Purpose**: AI-generated forecast analysis

| # | Column | Type |
|---|--------|------|
| 1 | forecasted_revenue_amount | FLOAT64 |
| 2 | optimistic_revenue | FLOAT64 |
| 3 | pessimistic_revenue | FLOAT64 |
| 4 | confidence_score | FLOAT64 |
| 5 | gap_to_goal | FLOAT64 |
| 6 | forecasting_rationale | STRING |
| 7 | quarterly_target | INT64 |
| 8 | total_pipeline_value | FLOAT64 |
| 9 | total_weighted_value | FLOAT64 |
| 10 | historical_win_rate_pct | FLOAT64 |
| 11 | ai_raw_response | STRING |
| 12 | generated_at | TIMESTAMP |

---

### v_ai_insight_simple

**Purpose**: Simple AI insight view

| # | Column | Type |
|---|--------|------|
| 1 | executive_insight | STRING |
| 2 | generated_at | TIMESTAMP |

---

## 11. ANALYSIS VIEWS

### v_sales_velocity

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | pipeline_label | STRING |
| 3 | owner_name | STRING |
| 4 | num_opportunities | INT64 |
| 5 | avg_deal_value | FLOAT64 |
| 6 | win_rate_pct | FLOAT64 |
| 7 | avg_sales_cycle_days | FLOAT64 |
| 8 | sales_velocity_daily | FLOAT64 |
| 9 | sales_velocity_monthly | FLOAT64 |

#### Velocity Formula

`V = (n × L × W) / T`

```sql
sales_velocity = (num_opportunities * avg_deal_value * win_rate) / avg_sales_cycle_days
```

---

### v_win_rate_analysis

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | pipeline_label | STRING |
| 3 | owner_name | STRING |
| 4 | won_count | INT64 |
| 5 | lost_count | INT64 |
| 6 | closed_count | INT64 |
| 7 | win_rate_pct | FLOAT64 |
| 8 | won_value | FLOAT64 |
| 9 | lost_value | FLOAT64 |
| 10 | avg_won_deal_size | FLOAT64 |
| 11 | avg_lost_deal_size | FLOAT64 |

---

### v_priority_analysis

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | hs_priority | STRING |
| 3 | deal_count | INT64 |
| 4 | open_deals | INT64 |
| 5 | won_deals | INT64 |
| 6 | pipeline_value | FLOAT64 |
| 7 | avg_days_in_stage | FLOAT64 |
| 8 | win_rate_pct | FLOAT64 |

---

### v_deal_type_analysis

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | dealtype | STRING |
| 3 | total_deals | INT64 |
| 4 | open_deals | INT64 |
| 5 | won_deals | INT64 |
| 6 | lost_deals | INT64 |
| 7 | pipeline_value | FLOAT64 |
| 8 | won_value | FLOAT64 |
| 9 | avg_deal_size | FLOAT64 |
| 10 | win_rate_pct | FLOAT64 |

---

### v_lost_deal_analysis

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | pipeline_label | STRING |
| 3 | closed_lost_reason | STRING |
| 4 | lost_count | INT64 |
| 5 | lost_value | FLOAT64 |
| 6 | avg_lost_deal_size | FLOAT64 |
| 7 | avg_days_before_lost | FLOAT64 |
| 8 | pct_of_losses | FLOAT64 |

---

### v_won_deal_analysis

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | pipeline_label | STRING |
| 3 | closed_won_reason | STRING |
| 4 | won_count | INT64 |
| 5 | won_value | FLOAT64 |
| 6 | avg_won_deal_size | FLOAT64 |
| 7 | avg_days_to_win | FLOAT64 |
| 8 | pct_of_wins | FLOAT64 |

---

### v_next_step_coverage

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | pipeline_label | STRING |
| 3 | owner_name | STRING |
| 4 | total_open_deals | INT64 |
| 5 | deals_with_next_step | INT64 |
| 6 | next_step_coverage_pct | FLOAT64 |

---

### v_new_deals_daily

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | created_date | DATE |
| 3 | pipeline_label | STRING |
| 4 | owner_name | STRING |
| 5 | new_deals | INT64 |
| 6 | new_deals_value | FLOAT64 |

---

### v_weekly_comparison

| # | Column | Type |
|---|--------|------|
| 1 | week_start | DATE |
| 2 | snapshot_date | DATE |
| 3 | pipeline_value | FLOAT64 |
| 4 | weighted_pipeline | FLOAT64 |
| 5 | open_deals | INT64 |
| 6 | won_deals | INT64 |
| 7 | won_value | FLOAT64 |
| 8 | prev_week_pipeline | FLOAT64 |
| 9 | pipeline_change | FLOAT64 |
| 10 | pipeline_change_pct | FLOAT64 |

---

## 12. DETAIL VIEWS

### v_latest_snapshot

**Purpose**: All columns from latest deals snapshot (65 columns)

| # | Column | Type |
|---|--------|------|
| 1 | hs_object_id | STRING |
| 2 | dealname | STRING |
| 3 | dealtype | STRING |
| 4 | amount | FLOAT64 |
| 5 | deal_currency_code | STRING |
| 6 | hs_tcv | FLOAT64 |
| 7 | hs_acv | FLOAT64 |
| 8 | hs_arr | FLOAT64 |
| 9 | hs_mrr | FLOAT64 |
| 10 | dealstage | STRING |
| 11 | dealstage_label | STRING |
| 12 | pipeline | STRING |
| 13 | pipeline_label | STRING |
| 14 | hs_deal_stage_probability | FLOAT64 |
| 15 | closedate | TIMESTAMP |
| 16 | createdate | TIMESTAMP |
| 17 | hs_lastmodifieddate | TIMESTAMP |
| 18 | notes_last_updated | TIMESTAMP |
| 19 | notes_last_contacted | TIMESTAMP |
| 20 | hs_date_entered_closedwon | TIMESTAMP |
| 21 | hs_date_entered_closedlost | TIMESTAMP |
| 22 | hubspot_owner_id | STRING |
| 23 | owner_name | STRING |
| 24 | owner_email | STRING |
| 25 | hs_forecast_category | STRING |
| 26 | hs_forecast_probability | FLOAT64 |
| 27 | hs_manual_forecast_category | STRING |
| 28 | hs_priority | STRING |
| 29 | hs_next_step | STRING |
| 30 | num_associated_contacts | INT64 |
| 31 | num_contacted_notes | INT64 |
| 32 | num_notes | INT64 |
| 33 | engagements_last_meeting_booked | TIMESTAMP |
| 34 | hs_latest_meeting_activity | TIMESTAMP |
| 35 | hs_sales_email_last_replied | TIMESTAMP |
| 36 | closed_lost_reason | STRING |
| 37 | closed_won_reason | STRING |
| 38 | description | STRING |
| 39 | all_properties_json | STRING |
| 40 | contact_count | INT64 |
| 41 | primary_contact_id | STRING |
| 42 | primary_contact_name | STRING |
| 43 | primary_contact_email | STRING |
| 44 | primary_contact_phone | STRING |
| 45 | primary_contact_jobtitle | STRING |
| 46 | primary_contact_company | STRING |
| 47 | all_contacts_json | STRING |
| 48 | company_id | STRING |
| 49 | company_name | STRING |
| 50 | company_domain | STRING |
| 51 | company_industry | STRING |
| 52 | company_country | STRING |
| 53 | company_city | STRING |
| 54 | company_revenue | FLOAT64 |
| 55 | company_employees | INT64 |
| 56 | days_in_current_stage | INT64 |
| 57 | days_since_created | INT64 |
| 58 | days_to_close | INT64 |
| 59 | weighted_amount | FLOAT64 |
| 60 | is_open | BOOL |
| 61 | is_won | BOOL |
| 62 | is_lost | BOOL |
| 63 | deal_age_status | STRING |
| 64 | snapshot_timestamp | TIMESTAMP |
| 65 | snapshot_date | DATE |

---

### v_full_deal_details

**Purpose**: Comprehensive deal view (36 columns)

| # | Column | Type |
|---|--------|------|
| 1-36 | (subset of v_latest_snapshot) | |

---

### v_contact_analysis

**Purpose**: Deal with contact details

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | hs_object_id | STRING |
| 3 | dealname | STRING |
| 4 | amount | FLOAT64 |
| 5 | dealstage_label | STRING |
| 6 | owner_name | STRING |
| 7 | contact_count | INT64 |
| 8 | primary_contact_id | STRING |
| 9 | primary_contact_name | STRING |
| 10 | primary_contact_email | STRING |
| 11 | primary_contact_phone | STRING |
| 12 | primary_contact_jobtitle | STRING |
| 13 | primary_contact_company | STRING |
| 14 | company_name | STRING |
| 15 | company_domain | STRING |
| 16 | company_industry | STRING |

---

### v_company_analysis

**Purpose**: Company-level aggregation

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | company_name | STRING |
| 3 | company_domain | STRING |
| 4 | company_industry | STRING |
| 5 | company_country | STRING |
| 6 | company_city | STRING |
| 7 | company_revenue | FLOAT64 |
| 8 | company_employees | INT64 |
| 9 | deal_count | INT64 |
| 10 | open_deals | INT64 |
| 11 | pipeline_value | FLOAT64 |
| 12 | won_value | FLOAT64 |

---

### v_closing_this_month

**Purpose**: Deals with closedate in current month

| # | Column | Type |
|---|--------|------|
| 1 | snapshot_date | DATE |
| 2 | hs_object_id | STRING |
| 3 | dealname | STRING |
| 4 | amount | FLOAT64 |
| 5 | weighted_amount | FLOAT64 |
| 6 | closedate | TIMESTAMP |
| 7 | dealstage_label | STRING |
| 8 | pipeline_label | STRING |
| 9 | owner_name | STRING |
| 10 | deal_age_status | STRING |
| 11 | days_to_close | INT64 |
| 12 | hs_forecast_category | STRING |
| 13 | primary_contact_name | STRING |
| 14 | primary_contact_email | STRING |
| 15 | company_name | STRING |

---

## Frontend Query Examples

```sql
-- Get all at-risk deals sorted by ARR
SELECT * FROM `octup-testing.hubspot_data.v_deals_at_risk`
WHERE is_at_risk = TRUE
ORDER BY arr_value DESC;

-- Get critical risk deals (at risk + low threading)
SELECT * FROM `octup-testing.hubspot_data.v_multi_threading`
WHERE combined_risk_status = 'Critical_Risk_Loss_of_Momentum';

-- Get owner leaderboard
SELECT * FROM `octup-testing.hubspot_data.v_owner_leaderboard`
ORDER BY pipeline_value DESC;

-- Get risk by owner
SELECT * FROM `octup-testing.hubspot_data.v_at_risk_by_owner`;

-- Get rep ramp data
SELECT * FROM `octup-testing.hubspot_data.v_rep_ramp_summary`;

-- Get pipeline trend (last 30 days)
SELECT * FROM `octup-testing.hubspot_data.v_pipeline_trend`
ORDER BY snapshot_date DESC
LIMIT 30;

-- Get deals closing this month
SELECT * FROM `octup-testing.hubspot_data.v_closing_this_month`
WHERE snapshot_date = CURRENT_DATE()
ORDER BY closedate;

-- Get SDR leaderboard
SELECT * FROM `octup-testing.hubspot_data.v_sdr_leaderboard`;

-- Get stalled deals requiring action
SELECT * FROM `octup-testing.hubspot_data.v_stalled_deals_alert`
WHERE priority_rank <= 2
ORDER BY priority_rank, value_arr DESC;

-- Get daily movements (last 7 days)
SELECT * FROM `octup-testing.hubspot_data.v_daily_deal_movements`
WHERE transition_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
ORDER BY transition_date DESC, value_arr DESC;
```

---

## Important Notes for Frontend

### 1. Chanan Handling
- `is_pending_rebook = TRUE` means deal is with Chanan for rebooking
- This is **NOT** a risk - display separately as "Pending Rebook" queue
- Goal: Chanan should have 0 deals (all rebooked with AEs)

### 2. Enterprise Distinction
- Use `is_enterprise` flag for different thresholds
- Enterprise deals (≥$100K): 30-day stalled threshold
- Standard deals (<$100K): 14-day stalled threshold

### 3. Meeting Override
- `has_upcoming_meeting = TRUE` protects deals from stalled/ghosted flags
- These deals are actively being worked

### 4. Activity Override
- `has_recent_activity = TRUE` (modified in last 7 days)
- Protects deals from stalled/ghosted flags

### 5. Excluded Owners
- v_owner_leaderboard excludes: Court, A.K., Alon

### 6. ARR Standardization
- Always use `arr_value` column or `COALESCE(hs_arr, amount)`

### 7. Views Not Deployed
- `v_pending_rebook_summary` - exists in SQL but not deployed
- `v_ceo_ai_summary` - exists in SQL but not deployed

### 8. Gemini AI Integration
- Model: `gemini_pro_model` (Gemini 1.5 Pro)
- Connection: `gemini-connection`
- Function: `fn_generate_ceo_summary()`

---

## View Summary by Category

| Category | Count | Views |
|----------|-------|-------|
| Core Risk | 4 | v_deals_at_risk, v_at_risk_by_owner, v_orphaned_deals_summary, v_stalled_deals_alert |
| Multi-Threading | 1 | v_multi_threading |
| Owner Performance | 1 | v_owner_leaderboard |
| Rep Ramp | 3 | v_rep_ramp_chart, v_rep_ramp_summary, v_rep_ramp_deals |
| Pipeline Overview | 4 | v_pipeline_summary, v_pipeline_trend, v_pipeline_coverage, v_pipeline_concentration |
| Deal Health | 4 | v_deal_aging, v_deal_aging_summary, v_stalled_deals, v_avg_time_in_stage |
| SDR Activity | 4 | v_sdr_activity_weekly, v_sdr_meeting_outcomes, v_sdr_leaderboard, v_sdr_forecast_model |
| Movement/Slippage | 5 | v_daily_deal_movements, v_stage_conversion, v_close_date_slippage, v_slippage_summary, v_stage_leakage |
| Forecasting | 3 | v_forecast_weighted, v_forecast_distribution, v_forecasting_raw_data |
| Executive/AI | 6 | v_ceo_dashboard, v_weekly_summary_data, v_ai_executive_summary, v_ai_forecast_analysis, v_ai_insight_simple |
| Analysis | 9 | v_sales_velocity, v_win_rate_analysis, v_priority_analysis, v_deal_type_analysis, v_lost_deal_analysis, v_won_deal_analysis, v_next_step_coverage, v_new_deals_daily, v_weekly_comparison |
| Detail | 5 | v_latest_snapshot, v_full_deal_details, v_contact_analysis, v_company_analysis, v_closing_this_month |
| **TOTAL** | **48** | |

---

*Document generated: 2026-01-29*
