# BigQuery Views Documentation
## HubSpot CEO Metrics Suite - Complete Reference

---

## Overview

This document describes **all 44 BigQuery views** created for tracking sales performance, SDR activity, deal risk analysis, and AI-powered executive summaries. All views are in the `octup-testing.hubspot_data` dataset.

### Data Sources
- **deals_snapshots**: Daily snapshot of all deals in "3PL New Business" pipeline
- **meetings_snapshots**: Daily snapshot of all HubSpot meetings

### Key Business Rules
- **Pipeline Filter**: Most views filter for "3PL New Business" pipeline
- **SDR Tracking**: Uses `created_by_name` with fallback to `owner_name` (see Known Limitations)
- **Week Definition**: Weeks start on Monday (using `WEEK(MONDAY)`)
- **ARR Value**: Uses `hs_arr` field with fallback to `amount`

---

# Table of Contents

1. [Base/Core Views (31)](#base-views)
   - [v_latest_snapshot](#1-v_latest_snapshot)
   - [v_pipeline_summary](#2-v_pipeline_summary)
   - [v_deal_aging](#3-v_deal_aging)
   - [v_deal_aging_summary](#4-v_deal_aging_summary)
   - [v_avg_time_in_stage](#5-v_avg_time_in_stage)
   - [v_pipeline_concentration](#6-v_pipeline_concentration)
   - [v_sales_velocity](#7-v_sales_velocity)
   - [v_stage_conversion](#8-v_stage_conversion)
   - [v_win_rate_analysis](#9-v_win_rate_analysis)
   - [v_forecast_weighted](#10-v_forecast_weighted)
   - [v_close_date_slippage](#11-v_close_date_slippage)
   - [v_slippage_summary](#12-v_slippage_summary)
   - [v_owner_leaderboard](#13-v_owner_leaderboard)
   - [v_multi_threading](#14-v_multi_threading)
   - [v_next_step_coverage](#15-v_next_step_coverage)
   - [v_lost_deal_analysis](#16-v_lost_deal_analysis)
   - [v_won_deal_analysis](#17-v_won_deal_analysis)
   - [v_pipeline_trend](#18-v_pipeline_trend)
   - [v_deal_type_analysis](#19-v_deal_type_analysis)
   - [v_closing_this_month](#20-v_closing_this_month)
   - [v_stalled_deals](#21-v_stalled_deals)
   - [v_new_deals_daily](#22-v_new_deals_daily)
   - [v_pipeline_coverage](#23-v_pipeline_coverage)
   - [v_forecast_distribution](#24-v_forecast_distribution)
   - [v_weekly_comparison](#25-v_weekly_comparison)
   - [v_priority_analysis](#26-v_priority_analysis)
   - [v_stage_leakage](#27-v_stage_leakage)
   - [v_ceo_dashboard](#28-v_ceo_dashboard)
   - [v_contact_analysis](#29-v_contact_analysis)
   - [v_company_analysis](#30-v_company_analysis)
   - [v_full_deal_details](#31-v_full_deal_details)

2. [SDR Activity Views (3)](#sdr-activity-views)
   - [v_sdr_activity_weekly](#32-v_sdr_activity_weekly)
   - [v_sdr_meeting_outcomes](#33-v_sdr_meeting_outcomes)
   - [v_sdr_leaderboard](#34-v_sdr_leaderboard)

3. [Deal Risk Views (6)](#deal-risk-views)
   - [v_deals_at_risk](#35-v_deals_at_risk)
   - [v_orphaned_deals_summary](#36-v_orphaned_deals_summary)
   - [v_pending_rebook_summary](#36b-v_pending_rebook_summary)
   - [v_daily_deal_movements](#37-v_daily_deal_movements)
   - [v_stalled_deals_alert](#38-v_stalled_deals_alert)
   - [v_at_risk_by_owner](#39-v_at_risk_by_owner)

4. [SDR Forecast View (1)](#sdr-forecast-view)
   - [v_sdr_forecast_model](#40-v_sdr_forecast_model)

5. [AI Summary Views (4)](#ai-summary-views)
   - [v_ai_executive_summary](#41-v_ai_executive_summary)
   - [v_ai_insight_simple](#42-v_ai_insight_simple)
   - [v_weekly_summary_data](#43-v_weekly_summary_data)
   - [v_ceo_ai_summary](#44-v_ceo_ai_summary)

---

# Base Views

## 1. v_latest_snapshot

**Purpose**: Get the most recent snapshot of all deals.

**Business Logic**: Filters to only the latest `snapshot_date` in the deals table.

**Key Columns**: All columns from `deals_snapshots` for the current day.

**Example Query**:
```sql
SELECT dealname, amount, owner_name, dealstage_label
FROM `octup-testing.hubspot_data.v_latest_snapshot`
WHERE is_open = TRUE
ORDER BY amount DESC;
```

---

## 2. v_pipeline_summary

**Purpose**: High-level dashboard of pipeline metrics by date and pipeline.

**Business Logic**: Aggregates deal counts, values, and averages grouped by snapshot date and pipeline.

| Column | Description |
|--------|-------------|
| `snapshot_date` | Date of snapshot |
| `pipeline_label` | Pipeline name |
| `total_deals` | Total deal count |
| `open_deals` | Open deals count |
| `won_deals` | Won deals count |
| `lost_deals` | Lost deals count |
| `open_pipeline_value` | Sum of open deal amounts |
| `weighted_pipeline_value` | Sum of weighted amounts |
| `won_value` | Total won amount |
| `avg_deal_size` | Average deal size |
| `avg_days_in_stage` | Average days in current stage |

**Example Query**:
```sql
SELECT * FROM `octup-testing.hubspot_data.v_pipeline_summary`
WHERE snapshot_date = CURRENT_DATE()
AND pipeline_label = '3PL New Business';
```

---

## 3. v_deal_aging

**Purpose**: SLA-based RAG (Red/Amber/Green) status for deal aging.

**Business Logic**: Shows open deals with aging status and priority score based on `deal_age_status` field.

| Column | Description |
|--------|-------------|
| `hs_object_id` | HubSpot deal ID |
| `dealname` | Deal name |
| `deal_age_status` | Red/Yellow/Green status |
| `age_priority_score` | Numeric priority (3=Red, 2=Yellow, 1=Green) |
| `days_in_current_stage` | Days in stage |
| `owner_name` | Deal owner |
| `company_name` | Associated company |

**Example Query**:
```sql
SELECT * FROM `octup-testing.hubspot_data.v_deal_aging`
WHERE deal_age_status = 'Red'
ORDER BY amount DESC;
```

---

## 4. v_deal_aging_summary

**Purpose**: Summary statistics by deal age status.

**Business Logic**: Groups open deals by `deal_age_status` with counts and values.

| Column | Description |
|--------|-------------|
| `deal_age_status` | Red/Yellow/Green |
| `deal_count` | Number of deals |
| `total_value` | Sum of amounts |
| `avg_days_in_stage` | Average days in stage |
| `pct_of_deals` | Percentage of total |

---

## 5. v_avg_time_in_stage

**Purpose**: Average, median, min, max time deals spend in each stage.

**Business Logic**: Calculates statistics per pipeline stage using PERCENTILE_CONT for median.

| Column | Description |
|--------|-------------|
| `dealstage_label` | Stage name |
| `deals_in_stage` | Count of deals |
| `avg_days` | Average days |
| `median_days` | Median days |
| `min_days` | Minimum days |
| `max_days` | Maximum days |

---

## 6. v_pipeline_concentration

**Purpose**: Identify concentration risk when too much value is in one stage.

**Business Logic**: Calculates percentage of pipeline value in each stage. Flags stages with >50% as "High Risk", >30% as "Medium Risk".

| Column | Description |
|--------|-------------|
| `dealstage_label` | Stage name |
| `stage_value` | Total value in stage |
| `pct_of_pipeline_value` | Percentage of total pipeline |
| `concentration_risk` | High Risk / Medium Risk / Balanced |

---

## 7. v_sales_velocity

**Purpose**: Calculate sales velocity formula: V = (n x L x W) / T

**Business Logic**:
- n = number of opportunities
- L = average deal value
- W = win rate
- T = sales cycle length

| Column | Description |
|--------|-------------|
| `owner_name` | Sales rep name |
| `num_opportunities` | Deal count |
| `avg_deal_value` | Average deal size |
| `win_rate_pct` | Win rate percentage |
| `avg_sales_cycle_days` | Average days to close |
| `sales_velocity_daily` | Daily velocity |
| `sales_velocity_monthly` | Monthly velocity |

---

## 8. v_stage_conversion

**Purpose**: Track stage-to-stage transitions with deal details and HubSpot links.

**Business Logic**: Compares consecutive daily snapshots to identify stage transitions. Shows each deal that moved with a direct link to HubSpot.

| Column | Description |
|--------|-------------|
| `snapshot_date` | Date of transition |
| `deal_id` | HubSpot deal ID |
| `deal_name` | Name of the deal |
| `hubspot_link` | Direct link to deal in HubSpot |
| `pipeline_label` | Pipeline name |
| `owner_name` | Deal owner |
| `from_stage` | Previous stage |
| `to_stage` | New stage |
| `deal_value` | Deal amount |

**Example Query**:
```sql
-- Get all stage transitions for today with HubSpot links
SELECT
  deal_name,
  hubspot_link,
  from_stage,
  to_stage,
  deal_value
FROM `octup-testing.hubspot_data.v_stage_conversion`
WHERE snapshot_date = CURRENT_DATE()
ORDER BY deal_value DESC;
```

---

## 9. v_win_rate_analysis

**Purpose**: Win rate analysis by owner.

**Business Logic**: Calculates won/(won+lost) ratio per owner.

| Column | Description |
|--------|-------------|
| `owner_name` | Sales rep |
| `won_count` | Deals won |
| `lost_count` | Deals lost |
| `win_rate_pct` | Win rate percentage |
| `avg_won_deal_size` | Average won deal size |
| `avg_lost_deal_size` | Average lost deal size |

---

## 10. v_forecast_weighted

**Purpose**: Weighted pipeline by forecast category.

**Business Logic**: Groups by HubSpot forecast category with weighted amounts.

| Column | Description |
|--------|-------------|
| `hs_forecast_category` | Commit/Best Case/Pipeline/etc |
| `deal_count` | Number of deals |
| `total_amount` | Raw sum |
| `weighted_forecast` | Probability-weighted sum |
| `avg_probability` | Average stage probability |

---

## 11. v_close_date_slippage

**Purpose**: Track when close dates are pushed out.

**Business Logic**: Compares consecutive days to detect closedate changes.

| Column | Description |
|--------|-------------|
| `dealname` | Deal name |
| `prev_closedate` | Previous close date |
| `curr_closedate` | New close date |
| `days_slipped` | Number of days pushed |
| `slippage_category` | Major/Moderate/Minor Slip or Pulled In |

---

## 12. v_slippage_summary

**Purpose**: Summary of slippage rates across pipeline.

**Business Logic**: Calculates what percentage of deals slipped their close date.

| Column | Description |
|--------|-------------|
| `total_open_deals` | Total open deals |
| `slipped_count` | Deals that slipped |
| `slippage_rate_pct` | % of deals slipped |
| `value_slippage_rate_pct` | % of value slipped |

---

## 13. v_owner_leaderboard

**Purpose**: Sales rep performance rankings.

**Business Logic**: Aggregates all key metrics per owner for comparison.

| Column | Description |
|--------|-------------|
| `owner_name` | Sales rep |
| `open_deals` | Open deal count |
| `won_deals` | Won count |
| `pipeline_value` | Open pipeline |
| `weighted_pipeline` | Weighted value |
| `won_value` | Total won |
| `win_rate_pct` | Win rate |
| `at_risk_deals` | Red status deals |

---

## 14. v_multi_threading

**Purpose**: Analyze contact coverage per deal.

**Business Logic**: Groups deals by contact count to assess relationship risk.

| Threading Level | Condition |
|-----------------|-----------|
| 4+ Contacts (Strong) | contact_count >= 4 |
| 2-3 Contacts (Good) | contact_count 2-3 |
| 1 Contact (Weak) | contact_count = 1 |
| No Contacts (Risk) | contact_count = 0 |

| Column | Description |
|--------|-------------|
| `threading_level` | Contact coverage category |
| `deal_count` | Number of deals |
| `total_value` | Sum of amounts |
| `win_rate_pct` | Win rate for this group |

---

## 15. v_next_step_coverage

**Purpose**: Track which deals have defined next steps.

**Business Logic**: Calculates percentage of open deals with `hs_next_step` populated.

| Column | Description |
|--------|-------------|
| `owner_name` | Sales rep |
| `total_open_deals` | Open deal count |
| `deals_with_next_step` | Deals with next step defined |
| `next_step_coverage_pct` | Coverage percentage |

---

## 16. v_lost_deal_analysis

**Purpose**: Analyze reasons for lost deals.

**Business Logic**: Groups lost deals by `closed_lost_reason`.

| Column | Description |
|--------|-------------|
| `closed_lost_reason` | Reason for loss |
| `lost_count` | Number of deals |
| `lost_value` | Total value lost |
| `avg_days_before_lost` | Average days before loss |
| `pct_of_losses` | Percentage of all losses |

---

## 17. v_won_deal_analysis

**Purpose**: Analyze won deals patterns.

**Business Logic**: Groups won deals by `closed_won_reason`.

| Column | Description |
|--------|-------------|
| `closed_won_reason` | Win reason |
| `won_count` | Number of deals |
| `won_value` | Total value won |
| `avg_days_to_win` | Average days to close |
| `pct_of_wins` | Percentage of all wins |

---

## 18. v_pipeline_trend

**Purpose**: Track pipeline changes over time.

**Business Logic**: Daily aggregates with LAG to calculate day-over-day changes.

| Column | Description |
|--------|-------------|
| `snapshot_date` | Date |
| `open_pipeline_value` | Pipeline value |
| `prev_pipeline_value` | Previous day value |
| `pipeline_change` | Daily change |
| `won_value` | Won that day |
| `lost_value` | Lost that day |

---

## 19. v_deal_type_analysis

**Purpose**: Performance by deal type.

**Business Logic**: Groups by `dealtype` field.

| Column | Description |
|--------|-------------|
| `dealtype` | Deal type |
| `total_deals` | Count |
| `pipeline_value` | Open value |
| `won_value` | Won value |
| `win_rate_pct` | Win rate |

---

## 20. v_closing_this_month

**Purpose**: Deals expected to close this month.

**Business Logic**: Filters open deals where closedate is in current month.

| Column | Description |
|--------|-------------|
| `dealname` | Deal name |
| `amount` | Deal value |
| `closedate` | Expected close date |
| `days_to_close` | Days remaining |
| `hs_forecast_category` | Forecast category |
| `deal_age_status` | RAG status |

---

## 21. v_stalled_deals

**Purpose**: Identify deals with no recent activity.

**Business Logic**: Calculates days since last activity using `notes_last_contacted` and `hs_latest_meeting_activity`.

| Activity Status | Condition |
|-----------------|-----------|
| Severely Stalled | >30 days since activity |
| Stalled | 15-30 days |
| At Risk | 8-14 days |
| Active | <7 days |

---

## 22. v_new_deals_daily

**Purpose**: Track new deal creation by day and owner.

**Business Logic**: Filters deals where createdate matches snapshot_date.

| Column | Description |
|--------|-------------|
| `created_date` | Date created |
| `owner_name` | Owner |
| `new_deals` | Count |
| `new_deals_value` | Value created |

---

## 23. v_pipeline_coverage

**Purpose**: Pipeline coverage ratio vs targets.

**Business Logic**: Calculates ratio of pipeline to MTD wins. Target multiplier is 3x.

| Coverage Status | Condition |
|-----------------|-----------|
| Healthy | Ratio >= 3x |
| At Risk | Ratio >= 2.1x |
| Critical | Ratio < 2.1x |

---

## 24. v_forecast_distribution

**Purpose**: Distribution of pipeline by forecast category.

**Business Logic**: Shows percentage breakdown by forecast category.

| Column | Description |
|--------|-------------|
| `hs_forecast_category` | Category |
| `deal_count` | Count |
| `total_amount` | Raw amount |
| `pct_of_pipeline` | Percentage |

---

## 25. v_weekly_comparison

**Purpose**: Week-over-week pipeline comparison.

**Business Logic**: Aggregates by week with LAG for comparison.

| Column | Description |
|--------|-------------|
| `week_start` | Week beginning |
| `pipeline_value` | Current week |
| `prev_week_pipeline` | Previous week |
| `pipeline_change` | Absolute change |
| `pipeline_change_pct` | Percentage change |

---

## 26. v_priority_analysis

**Purpose**: Performance by deal priority.

**Business Logic**: Groups by `hs_priority` field.

---

## 27. v_stage_leakage

**Purpose**: Track how deals exit each stage (Won/Lost/Moved).

**Business Logic**: Identifies stage exits and categorizes by type.

| Column | Description |
|--------|-------------|
| `from_stage` | Stage deals left |
| `exit_type` | Won/Lost/Moved |
| `exit_count` | Number of exits |
| `exit_value` | Value of exits |

---

## 28. v_ceo_dashboard

**Purpose**: Executive summary dashboard with all key metrics.

**Business Logic**: Single-row view with comprehensive pipeline metrics.

| Column | Description |
|--------|-------------|
| `report_date` | Current date |
| `total_open_deals` | All open deals |
| `total_pipeline_value` | Total pipeline |
| `weighted_pipeline_value` | Weighted total |
| `active_open_deals` | Excluding Stalled/Delayed |
| `total_pipeline_value_active` | Active pipeline only |
| `stalled_deals_count` | Stalled deal count |
| `stalled_pipeline_value` | Stalled value |
| `win_rate_pct` | Overall win rate |
| `avg_sales_cycle_days` | Average days to close |
| `red_deals_count` | At-risk deals |
| `red_deals_value` | At-risk value |
| `pct_deals_at_risk` | Risk percentage |
| `next_step_coverage_pct` | Next step coverage |

---

## 29. v_contact_analysis

**Purpose**: Detailed contact information per deal.

**Business Logic**: Shows primary contact details for latest snapshot.

| Column | Description |
|--------|-------------|
| `dealname` | Deal name |
| `contact_count` | Number of contacts |
| `primary_contact_name` | Main contact |
| `primary_contact_email` | Contact email |
| `primary_contact_jobtitle` | Job title |
| `company_name` | Company |

---

## 30. v_company_analysis

**Purpose**: Pipeline analysis by company.

**Business Logic**: Groups deals by company with demographics.

| Column | Description |
|--------|-------------|
| `company_name` | Company name |
| `company_industry` | Industry |
| `company_revenue` | Revenue |
| `company_employees` | Employee count |
| `deal_count` | Total deals |
| `pipeline_value` | Open value |
| `won_value` | Won value |

---

## 31. v_full_deal_details

**Purpose**: Complete deal record with all fields for latest snapshot.

**Business Logic**: Returns all columns from deals_snapshots for current date.

---

# SDR Activity Views

## 32. v_sdr_activity_weekly

**Purpose**: Track weekly SDR meeting performance - meetings booked and outcomes.

**Business Logic**:
- Counts meetings created each week by SDR
- SDR is determined by who booked the meeting (`created_by_name`), with fallback to `owner_name`
- Only includes meetings associated with deals in "3PL New Business" pipeline OR meetings with no deal association (SDR prospecting)

| Column | Description |
|--------|-------------|
| `week_start` | Monday of the week |
| `sdr_name` | Name of the SDR who booked the meeting |
| `sdr_email` | Email of the SDR |
| `meetings_booked_count` | Total meetings created that week |
| `meetings_held_count` | Meetings with outcome = COMPLETED |
| `meetings_scheduled_count` | Meetings still pending (no outcome) |
| `meetings_no_show_count` | Meetings where prospect didn't show |
| `meetings_canceled_count` | Canceled meetings |
| `meetings_rescheduled_count` | Rescheduled meetings |
| `held_rate_pct` | % of meetings that were held |
| `no_show_rate_pct` | % of meetings that were no-shows |

**Example Query**:
```sql
-- Get last 4 weeks of SDR activity
SELECT *
FROM `octup-testing.hubspot_data.v_sdr_activity_weekly`
WHERE week_start >= DATE_SUB(CURRENT_DATE(), INTERVAL 4 WEEK)
ORDER BY week_start DESC, meetings_booked_count DESC;
```

---

## 33. v_sdr_meeting_outcomes

**Purpose**: Detailed breakdown of meeting outcomes by SDR and week.

**Business Logic**:
- Pivots meeting outcomes into rows for easier analysis
- Shows percentage of total for each outcome type
- Uses same SDR resolution logic as v_sdr_activity_weekly

| Column | Description |
|--------|-------------|
| `week_start` | Monday of the week |
| `sdr_name` | Name of the SDR |
| `meeting_outcome` | Outcome type (COMPLETED, NO_SHOW, CANCELED, RESCHEDULED, PENDING) |
| `meeting_count` | Number of meetings with this outcome |
| `pct_of_total` | Percentage of SDR's weekly meetings |

**Example Query**:
```sql
-- Compare SDR outcomes for current week
SELECT *
FROM `octup-testing.hubspot_data.v_sdr_meeting_outcomes`
WHERE week_start = DATE_TRUNC(CURRENT_DATE(), WEEK(MONDAY))
ORDER BY sdr_name, meeting_count DESC;
```

---

## 34. v_sdr_leaderboard

**Purpose**: Weekly SDR performance ranking with at-risk deal metrics.

**Business Logic**:
- Shows current week's SDR performance
- Joins with deal risk data to show each SDR's at-risk portfolio
- Ranks SDRs by multiple criteria

| Column | Description |
|--------|-------------|
| `sdr_name` | SDR name |
| `sdr_email` | SDR email |
| `week_start` | Current week |
| `meetings_booked_count` | Meetings booked this week |
| `meetings_held_count` | Meetings held this week |
| `meetings_no_show_count` | No-shows this week |
| `held_rate_pct` | Meeting hold rate |
| `no_show_rate_pct` | No-show rate |
| `total_open_deals` | Total open deals owned |
| `total_pipeline_arr` | Total ARR in pipeline |
| `at_risk_deals_count` | Number of at-risk deals |
| `at_risk_value` | ARR value of at-risk deals |
| `stalled_deals` | Deals stalled >14 days |
| `ghosted_deals` | Deals with no contact >5 days |
| `rank_by_meetings_held` | Ranking by meetings held |
| `rank_by_meetings_booked` | Ranking by meetings booked |
| `rank_by_held_rate` | Ranking by hold rate |
| `rank_by_risk` | Ranking by risk (lower = better) |

**Example Query**:
```sql
-- Current week leaderboard
SELECT
  sdr_name,
  meetings_held_count,
  held_rate_pct,
  at_risk_value,
  rank_by_meetings_held
FROM `octup-testing.hubspot_data.v_sdr_leaderboard`
ORDER BY rank_by_meetings_held;
```

---

# Deal Risk Views

## 35. v_deals_at_risk

**Purpose**: Flag deals with risk indicators for proactive management.

**Business Logic**: Applies 5 risk flags to all open deals in "3PL New Business" pipeline. The view now considers **enterprise deal thresholds**, **recent activity**, and **upcoming meetings** as overrides.

### Enterprise Deals
Deals with ARR >= $100,000 are classified as **enterprise deals** and have longer thresholds (longer sales cycles expected).

### Override Conditions
A deal is **NOT** flagged as stalled or ghosted if:
- Has an **upcoming scheduled meeting** (future start_time in meetings_snapshots)
- Has **recent activity** (hs_lastmodifieddate within last 7 days)

### Risk Flags

| Risk Flag | Standard Deals (<$100K) | Enterprise Deals (≥$100K) | Override Conditions |
|-----------|------------------------|---------------------------|---------------------|
| `is_unassigned_risk` | Owner contains "Kurt", "Hanan", or "Deactivated" (**NOT Chanan**) | Same | None |
| `is_pending_rebook` | Owner contains "Chanan" | Same | None - this is NOT a risk flag |
| `is_stalled` | days_in_current_stage > **14** | days_in_current_stage > **30** | Recent activity OR upcoming meeting |
| `is_ghosted` | No contact > **5 days** AND no recent activity | No contact > **10 days** AND no recent activity | Recent activity OR upcoming meeting |
| `is_not_3pl_match` | Company doesn't match 3PL keywords | Same | None |
| `is_stalled_delayed` | In "Delayed" stage > 30 days, no next step | Same | None |

### Chanan - Pending Rebook Role

**IMPORTANT**: Chanan is NOT an inactive owner. Deals assigned to Chanan are actively being worked:
- **Chanan deals** = First meeting didn't happen OR meeting was scheduled too far out
- **Chanan's job** = Rebook these meetings with the sales team (AEs)
- **Goal** = Chanan should have **0 deals** (all should be rebooked with AEs)

Chanan deals have `is_pending_rebook = TRUE` and `primary_risk_reason = 'Pending Rebook (Chanan)'`. They are **NOT** counted in `is_at_risk`.

**Overall Risk**: `is_at_risk = TRUE` if ANY of `is_unassigned_risk`, `is_stalled`, `is_ghosted`, or `is_not_3pl_match` is true. Note: `is_pending_rebook` is NOT included in the overall risk calculation.

### Key Columns

| Column | Description |
|--------|-------------|
| `hs_object_id` | HubSpot deal ID |
| `dealname` | Deal name |
| `arr_value` | ARR value (uses `hs_arr` or `amount`) |
| `dealstage_label` | Current stage name |
| `owner_name` | Deal owner |
| `days_in_current_stage` | Days since last stage change |
| `is_enterprise` | TRUE if ARR >= $100,000 |
| `has_upcoming_meeting` | TRUE if future meeting scheduled |
| `has_recent_activity` | TRUE if hs_lastmodifieddate within 7 days |
| `next_meeting_scheduled` | Date of next scheduled meeting |
| `days_since_last_activity` | Days since hs_lastmodifieddate |
| `is_pending_rebook` | TRUE if deal is with Chanan for rebooking |
| `is_at_risk` | Overall risk flag (excludes pending_rebook) |
| `primary_risk_reason` | Main risk category |
| `risk_flag_count` | Number of risk flags triggered |

### Risk Categories in `primary_risk_reason`

| Category | Description |
|----------|-------------|
| `Pending Rebook (Chanan)` | Deal with Chanan for meeting rebooking (NOT a risk) |
| `Ownership Risk` | Deal owned by Kurt/Hanan/Deactivated user (NOT Chanan) |
| `Stalled & Ghosted` | Both stalled and ghosted flags |
| `Stalled (>30 days - Enterprise)` | Enterprise deal stalled beyond threshold |
| `Stalled (>14 days)` | Standard deal stalled beyond threshold |
| `Ghosted (>10 days - Enterprise)` | Enterprise deal with no engagement |
| `Ghosted (>5 days)` | Standard deal with no engagement |
| `Not 3PL Match` | Company doesn't match target industry |
| `Healthy` | No risk flags triggered |

**Example Query**:
```sql
-- High-value at-risk deals
SELECT
  dealname,
  arr_value,
  owner_name,
  primary_risk_reason,
  days_in_current_stage,
  is_enterprise,
  has_upcoming_meeting,
  has_recent_activity
FROM `octup-testing.hubspot_data.v_deals_at_risk`
WHERE is_at_risk = TRUE
ORDER BY arr_value DESC
LIMIT 20;
```

```sql
-- Check enterprise deals with overrides
SELECT
  dealname,
  arr_value,
  next_meeting_scheduled,
  days_since_last_activity,
  is_stalled,
  is_ghosted
FROM `octup-testing.hubspot_data.v_deals_at_risk`
WHERE is_enterprise = TRUE
ORDER BY arr_value DESC;
```

---

## 36. v_orphaned_deals_summary

**Purpose**: Summary of deals owned by Kurt/Hanan/Deactivated users (placeholder owners) needing reassignment. **Does NOT include Chanan** (Chanan is tracked separately in v_pending_rebook_summary).

**Business Logic**:
- Filters deals where `is_unassigned_risk = TRUE`
- Groups by owner to show total exposure

| Column | Description |
|--------|-------------|
| `owner_name` | Placeholder owner name |
| `deal_count` | Number of deals |
| `total_arr_at_risk` | Total ARR needing reassignment |
| `avg_days_in_stage` | Average days deals have been sitting |
| `top_deals` | Names of top 5 deals by value |

**Example Query**:
```sql
SELECT * FROM `octup-testing.hubspot_data.v_orphaned_deals_summary`;
```

---

## 36b. v_pending_rebook_summary

**Purpose**: Summary of deals with Chanan that need meeting rebooking.

**Business Logic**:
- Chanan holds deals where the first meeting didn't happen OR meeting was too far out
- Goal: Chanan should have **0 deals** (all should be rebooked with AEs)
- This view tracks Chanan's rebook queue and progress

| Column | Description |
|--------|-------------|
| `rebook_coordinator` | Always "Chanan" |
| `deal_count` | Number of deals pending rebook |
| `total_arr_pending` | Total ARR in rebook queue |
| `avg_days_pending` | Average days deals have been with Chanan |
| `deals_with_meeting_scheduled` | Deals that have a new meeting booked |
| `deals_needing_meeting` | Deals that still need a meeting booked |
| `arr_needing_meeting` | ARR value of deals needing meetings |
| `top_deals_pending` | Top 5 deals by value with days pending |

**Example Query**:
```sql
-- Check Chanan's rebook queue
SELECT * FROM `octup-testing.hubspot_data.v_pending_rebook_summary`;
```

**KPI Goal**: `deal_count = 0` means all deals have been successfully rebooked with AEs.

---

## 37. v_daily_deal_movements

**Purpose**: Track all deal stage transitions for pipeline movement analysis.

**Business Logic**:
- Compares each day's snapshot to previous day
- Identifies stage changes using `LAG()` window function
- Categorizes movement types

| Type | Description |
|------|-------------|
| `New Deal` | First appearance in pipeline |
| `Stage Change` | Moved between stages |
| `Closed` | Moved to Closed Won or Closed Lost |
| `Reopened` | Moved from closed back to open |

| Column | Description |
|--------|-------------|
| `deal_id` | HubSpot deal ID |
| `deal_name` | Deal name |
| `value_arr` | Deal ARR value |
| `previous_stage` | Stage before transition |
| `current_stage` | Stage after transition |
| `transition_date` | Date of the move |
| `owner_name` | Deal owner |
| `days_in_previous_stage` | How long deal was in previous stage |
| `movement_type` | Type of movement |
| `movement_description` | Human-readable description |

**Example Query**:
```sql
-- Last 7 days of movements
SELECT
  transition_date,
  movement_description,
  movement_type
FROM `octup-testing.hubspot_data.v_daily_deal_movements`
WHERE transition_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
ORDER BY transition_date DESC, value_arr DESC;
```

---

## 38. v_stalled_deals_alert

**Purpose**: Prioritized list of stalled deals requiring action.

**Business Logic**:
- Shows deals stalled > 14 days OR in "Delayed" status > 30 days
- Assigns priority rank and recommended action

| Priority | Condition | Recommendation |
|----------|-----------|----------------|
| 1 | Delayed > 30 days, no next step | Move to Closed Lost |
| 2 | Any stage > 30 days + ghosted | Re-engage or Close |
| 3 | Any stage > 21 days | Warning: Approaching stale |
| 4 | Other stalled deals | Monitor |

| Column | Description |
|--------|-------------|
| `deal_id` | HubSpot deal ID |
| `deal_name` | Deal name |
| `value_arr` | Deal ARR value |
| `owner_name` | Deal owner |
| `current_stage` | Current stage |
| `days_in_current_stage` | Days in stage |
| `next_step` | Defined next step (if any) |
| `last_contact_date` | Last engagement date |
| `recommended_action` | Suggested action |
| `priority_rank` | 1-4 priority (1 = urgent) |

**Example Query**:
```sql
-- Urgent stalled deals
SELECT *
FROM `octup-testing.hubspot_data.v_stalled_deals_alert`
WHERE priority_rank <= 2
ORDER BY priority_rank, value_arr DESC;
```

---

## 39. v_at_risk_by_owner

**Purpose**: At-risk ARR summary grouped by deal owner.

**Business Logic**:
- Aggregates risk metrics per owner
- Shows both count and ARR value exposure

| Column | Description |
|--------|-------------|
| `owner_name` | Deal owner |
| `owner_email` | Owner email |
| `total_open_deals` | Total open deals |
| `total_arr` | Total pipeline ARR |
| `at_risk_deals` | Number at risk |
| `at_risk_value` | ARR at risk |
| `stalled_deals` | Stalled deal count |
| `ghosted_deals` | Ghosted deal count |
| `non_3pl_deals` | Non-3PL match count |
| `at_risk_pct` | % of deals at risk |
| `at_risk_arr_pct` | % of ARR at risk |

**Example Query**:
```sql
-- Owners with highest at-risk ARR
SELECT
  owner_name,
  total_arr,
  at_risk_value,
  at_risk_arr_pct
FROM `octup-testing.hubspot_data.v_at_risk_by_owner`
ORDER BY at_risk_value DESC;
```

---

# SDR Forecast View

## 40. v_sdr_forecast_model

**Purpose**: Forecast SDR performance and calculate gap to $1.6M ARR target.

**Business Logic**:
1. Calculate 4-week rolling average of meetings per SDR
2. Get historical win rate and average deal size from closed deals
3. Project next 4 weeks of meetings and expected ARR
4. Allocate $1.6M target proportionally based on performance
5. Calculate gap between forecast and target

**Formula**:
```
Expected ARR = Forecasted Held Meetings x Win Rate x Avg Deal Size
```

| Column | Description |
|--------|-------------|
| `sdr_name` | SDR name |
| `sdr_email` | SDR email |
| `weeks_active` | Weeks with activity in last 4 weeks |
| `avg_weekly_booked` | Average meetings booked per week |
| `avg_weekly_held` | Average meetings held per week |
| `avg_held_rate_pct` | Average show rate |
| `forecasted_next_month_meetings` | Projected meetings next 4 weeks |
| `forecasted_next_month_held` | Projected held meetings |
| `win_rate_pct` | Historical win rate |
| `avg_deal_size` | Average closed won deal size |
| `expected_arr_contribution` | Forecasted ARR |
| `sdr_arr_target` | Proportional target |
| `arr_gap_to_target` | Difference (negative = behind) |
| `gap_to_target` | Additional meetings needed |
| `forecast_status` | "On Track", "At Risk", or "Behind" |

**Example Query**:
```sql
-- SDR forecast summary
SELECT
  sdr_name,
  avg_weekly_held,
  expected_arr_contribution,
  sdr_arr_target,
  arr_gap_to_target,
  forecast_status
FROM `octup-testing.hubspot_data.v_sdr_forecast_model`
ORDER BY expected_arr_contribution DESC;
```

---

# AI Summary Views

## 41. v_ai_executive_summary

**Purpose**: AI-generated executive summary using Gemini 1.5 Pro.

**Business Logic**:
1. Aggregates KPIs from v_pipeline_trend, v_deal_aging, v_owner_leaderboard, v_multi_threading
2. Constructs a dynamic prompt with current metrics
3. Calls Gemini 1.5 Pro via BigQuery ML
4. Returns 3-bullet CEO summary with fallback if AI unavailable

**Prerequisites**:
- BigQuery Connection: `gemini_insight_conn` (Vertex AI Remote Connection)
- Model: `gemini_insight_model`

| Column | Description |
|--------|-------------|
| `total_pipeline_value` | Current pipeline |
| `weighted_value` | Weighted pipeline |
| `count_at_risk` | At-risk deals |
| `avg_win_rate` | Win rate |
| `weighted_confidence_pct` | Pipeline confidence |
| `executive_insight` | AI-generated summary |
| `generated_at` | Timestamp |

**Example Query**:
```sql
-- Get AI executive summary (incurs Gemini API costs)
SELECT executive_insight
FROM `octup-testing.hubspot_data.v_ai_executive_summary`;
```

---

## 42. v_ai_insight_simple

**Purpose**: Simplified view returning only the AI insight text.

**Business Logic**: Wraps v_ai_executive_summary to return just the insight for Looker Studio.

| Column | Description |
|--------|-------------|
| `executive_insight` | AI-generated summary |
| `generated_at` | Timestamp |

---

## 43. v_weekly_summary_data

**Purpose**: Aggregated weekly data for AI summary generation.

**Business Logic**:
- Compares current vs 7-days-ago snapshot
- Calculates week-over-week changes
- Aggregates top owners and slippage data

| Column | Description |
|--------|-------------|
| `report_date` | Current date |
| `current_open_deals` | Current open deals |
| `current_pipeline_value` | Current pipeline |
| `current_weighted_pipeline` | Weighted pipeline |
| `current_at_risk_deals` | At-risk count |
| `current_at_risk_value` | At-risk value |
| `previous_pipeline_value` | Last week pipeline |
| `pipeline_change` | Week-over-week change |
| `pipeline_change_pct` | Change percentage |
| `deals_slipped` | Slipped close dates |
| `top_owners_summary` | Top 5 owners by pipeline |

---

## 44. v_ceo_ai_summary

**Purpose**: Latest AI-generated CEO summary via table function.

**Business Logic**: Calls `fn_generate_ceo_summary()` which uses the `gemini_pro_model`.

| Column | Description |
|--------|-------------|
| `generated_at` | Timestamp |
| `summary` | Full AI-generated executive summary |

**Example Query**:
```sql
-- Get AI CEO summary
SELECT summary
FROM `octup-testing.hubspot_data.v_ceo_ai_summary`;
```

---

# Known Limitations

## SDR Attribution Issue

**Problem**: Meetings booked by SDRs are attributed to the AE whose calendar link was used (Blake, Jay).

**Current Behavior**:
- HubSpot's `hs_created_by_user_id` shows who created the CRM record, not who initiated the booking
- When SDR books via AE's calendar link, meeting is attributed to AE

**Workaround Options**:
1. **Track by deal ownership**: Count meetings on deals owned by the SDR
2. **Custom HubSpot property**: Add "Booked By SDR" field
3. **Process change**: Have SDRs create meetings under their own accounts

---

## Chanan - Rebook Coordinator Role

**Clarification**: Chanan is NOT an inactive/orphaned owner like Kurt or Hanan.

**Chanan's Role**:
- Deals are assigned to Chanan when: first meeting didn't happen OR meeting was scheduled too far out
- Chanan's job is to **rebook these meetings** with the sales team (AEs)
- Goal: Chanan should have **0 deals** (all rebooked and reassigned to AEs)

**How This is Tracked**:
- `v_deals_at_risk.is_pending_rebook = TRUE` for Chanan's deals
- `v_pending_rebook_summary` shows Chanan's rebook queue metrics
- Chanan deals are **NOT** counted in `is_at_risk` (they are being actively worked)
- Chanan deals show `primary_risk_reason = 'Pending Rebook (Chanan)'`

**Example - Check Chanan's Queue**:
```sql
-- Chanan's rebook queue status
SELECT * FROM `octup-testing.hubspot_data.v_pending_rebook_summary`;

-- Detailed list of Chanan's deals
SELECT
  dealname,
  arr_value,
  days_in_current_stage,
  has_upcoming_meeting
FROM `octup-testing.hubspot_data.v_deals_at_risk`
WHERE is_pending_rebook = TRUE
ORDER BY arr_value DESC;
```

---

# Refresh Schedule

All views read from snapshot tables that are refreshed by the ETL pipeline:
- **Deals**: Daily snapshot at ETL run time
- **Meetings**: Daily snapshot at ETL run time

Views are always based on the latest `snapshot_date` available.

---

# Quick Reference: Views by Category

| Category | Views |
|----------|-------|
| **Pipeline Overview** | v_pipeline_summary, v_pipeline_trend, v_pipeline_coverage, v_pipeline_concentration |
| **Deal Health** | v_deal_aging, v_deal_aging_summary, v_stalled_deals, v_stalled_deals_alert |
| **Risk Analysis** | v_deals_at_risk, v_at_risk_by_owner, v_orphaned_deals_summary, v_pending_rebook_summary |
| **Performance** | v_owner_leaderboard, v_win_rate_analysis, v_sales_velocity |
| **SDR Metrics** | v_sdr_activity_weekly, v_sdr_meeting_outcomes, v_sdr_leaderboard, v_sdr_forecast_model |
| **Forecasting** | v_forecast_weighted, v_forecast_distribution, v_closing_this_month |
| **Movement Tracking** | v_daily_deal_movements, v_stage_conversion, v_stage_leakage |
| **Slippage** | v_close_date_slippage, v_slippage_summary |
| **Contact/Company** | v_contact_analysis, v_company_analysis, v_multi_threading |
| **Executive** | v_ceo_dashboard, v_ai_executive_summary, v_ceo_ai_summary |

---

# Contact

For questions or issues with these views, contact the Data Engineering team.
