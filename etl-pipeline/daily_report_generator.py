"""
Daily Q1 Target Report Generator
Generates PDF reports and sends via email
Tracks progress toward $1.6M ARR Q1 target with focus on daily changes
"""
from google.cloud import bigquery
from datetime import datetime, date, timedelta
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.platypus import HRFlowable
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import os
import json

Q1_TARGET = 1600000  # $1.6M ARR
Q1_START = date(2026, 1, 1)
Q1_END = date(2026, 3, 31)


class DailyReportGenerator:
    def __init__(self, project_id='octup-testing'):
        self.client = bigquery.Client(project=project_id)
        self.report_date = date.today()
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles for the PDF"""
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=20,
            textColor=colors.HexColor('#1a365d'),
            alignment=1  # Center
        ))
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceBefore=15,
            spaceAfter=10,
            textColor=colors.HexColor('#2c5282'),
            borderPadding=5
        ))
        self.styles.add(ParagraphStyle(
            name='MetricLabel',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#4a5568')
        ))
        self.styles.add(ParagraphStyle(
            name='MetricValue',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#1a202c'),
            fontName='Helvetica-Bold'
        ))
        self.styles.add(ParagraphStyle(
            name='PositiveChange',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#276749')
        ))
        self.styles.add(ParagraphStyle(
            name='NegativeChange',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#c53030')
        ))
        self.styles.add(ParagraphStyle(
            name='AlertText',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#c53030'),
            backColor=colors.HexColor('#fed7d7'),
            borderPadding=8
        ))
        self.styles.add(ParagraphStyle(
            name='SuccessText',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=colors.HexColor('#276749'),
            backColor=colors.HexColor('#c6f6d5'),
            borderPadding=8
        ))

    def fetch_current_snapshot(self):
        """Fetch current pipeline snapshot data"""
        query = """
        WITH current_snapshot AS (
          SELECT *
          FROM `octup-testing.hubspot_data.deals_snapshots`
          WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
            AND pipeline_label = '3PL New Business'
        ),
        -- TOTAL ARR from ALL closed-won deals (existing + new customers)
        total_won AS (
          SELECT
            SUM(COALESCE(hs_arr, amount)) as total_arr,
            COUNT(*) as total_count
          FROM current_snapshot
          WHERE is_won = TRUE
        ),
        -- Q1 specific won deals (new wins this quarter only)
        q1_won AS (
          SELECT
            SUM(COALESCE(hs_arr, amount)) as won_arr,
            COUNT(*) as won_count
          FROM current_snapshot
          WHERE is_won = TRUE
            AND closedate >= '2026-01-01'
            AND closedate < '2026-04-01'
        ),
        -- Yesterday's TOTAL ARR for comparison
        yesterday_total AS (
          SELECT
            SUM(COALESCE(hs_arr, amount)) as total_arr
          FROM `octup-testing.hubspot_data.deals_snapshots`
          WHERE snapshot_date = DATE_SUB((SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`), INTERVAL 1 DAY)
            AND pipeline_label = '3PL New Business'
            AND is_won = TRUE
        )
        SELECT
          (SELECT total_arr FROM total_won) as total_won_arr,
          (SELECT total_count FROM total_won) as total_won_deals,
          (SELECT won_arr FROM q1_won) as q1_won_arr,
          (SELECT won_count FROM q1_won) as q1_won_deals,
          (SELECT total_arr FROM yesterday_total) as yesterday_total_arr,
          SUM(IF(is_open, COALESCE(hs_arr, amount), 0)) as open_pipeline_arr,
          COUNTIF(is_open) as open_deals,
          SUM(IF(is_open, weighted_amount, 0)) as weighted_pipeline,
          SUM(IF(is_open AND closedate < '2026-04-01', COALESCE(hs_arr, amount), 0)) as q1_pipeline_arr,
          COUNTIF(is_open AND closedate < '2026-04-01') as q1_pipeline_deals,
          MAX(snapshot_date) as report_date
        FROM current_snapshot
        """
        result = self.client.query(query).result()
        return list(result)[0]

    def fetch_yesterday_pipeline(self):
        """Fetch yesterday's pipeline for comparison"""
        query = """
        SELECT
          SUM(IF(is_open, COALESCE(hs_arr, amount), 0)) as open_pipeline_arr,
          COUNTIF(is_open) as open_deals,
          SUM(IF(is_open AND closedate < '2026-04-01', COALESCE(hs_arr, amount), 0)) as q1_pipeline_arr
        FROM `octup-testing.hubspot_data.deals_snapshots`
        WHERE snapshot_date = DATE_SUB((SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`), INTERVAL 1 DAY)
          AND pipeline_label = '3PL New Business'
        """
        result = self.client.query(query).result()
        return list(result)[0]

    def fetch_new_deals_today(self):
        """Fetch deals that were added or closed today"""
        query = """
        WITH today AS (
          SELECT hs_object_id, dealname, COALESCE(hs_arr, amount) as arr, owner_name, dealstage_label, is_won
          FROM `octup-testing.hubspot_data.deals_snapshots`
          WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
            AND pipeline_label = '3PL New Business'
        ),
        yesterday AS (
          SELECT hs_object_id, dealname, COALESCE(hs_arr, amount) as arr, owner_name, dealstage_label, is_won
          FROM `octup-testing.hubspot_data.deals_snapshots`
          WHERE snapshot_date = DATE_SUB((SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`), INTERVAL 1 DAY)
            AND pipeline_label = '3PL New Business'
        )
        -- New deals added to pipeline
        SELECT 'NEW' as change_type, t.dealname, t.arr, t.owner_name, t.dealstage_label
        FROM today t
        LEFT JOIN yesterday y ON t.hs_object_id = y.hs_object_id
        WHERE y.hs_object_id IS NULL AND t.is_won = FALSE

        UNION ALL

        -- Deals closed won today
        SELECT 'WON' as change_type, t.dealname, t.arr, t.owner_name, t.dealstage_label
        FROM today t
        JOIN yesterday y ON t.hs_object_id = y.hs_object_id
        WHERE t.is_won = TRUE AND y.is_won = FALSE

        UNION ALL

        -- Stage changes
        SELECT 'STAGE_CHANGE' as change_type, t.dealname, t.arr, t.owner_name,
               CONCAT(y.dealstage_label, ' -> ', t.dealstage_label) as dealstage_label
        FROM today t
        JOIN yesterday y ON t.hs_object_id = y.hs_object_id
        WHERE t.dealstage_label != y.dealstage_label
          AND t.is_won = FALSE

        ORDER BY change_type, arr DESC
        """
        result = self.client.query(query).result()
        return list(result)

    def fetch_top_pipeline_deals(self):
        """Fetch top deals expected to close in Q1"""
        query = """
        SELECT
          dealname,
          ROUND(COALESCE(hs_arr, amount), 0) as arr,
          owner_name,
          dealstage_label,
          closedate,
          days_in_current_stage
        FROM `octup-testing.hubspot_data.deals_snapshots`
        WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
          AND pipeline_label = '3PL New Business'
          AND is_open = TRUE
          AND closedate < '2026-04-01'
        ORDER BY COALESCE(hs_arr, amount) DESC
        LIMIT 10
        """
        result = self.client.query(query).result()
        return list(result)

    def fetch_deals_at_risk(self):
        """Fetch deals that have risk flags"""
        query = """
        SELECT
          dealname,
          arr_value,
          owner_name,
          dealstage_label,
          primary_risk_reason,
          risk_score
        FROM `octup-testing.hubspot_data.v_deals_at_risk`
        WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
          AND risk_score >= 2
        ORDER BY arr_value DESC
        LIMIT 10
        """
        try:
            result = self.client.query(query).result()
            return list(result)
        except Exception:
            return []

    def fetch_owner_performance(self):
        """Fetch owner contribution to Q1 target"""
        query = """
        SELECT
          owner_name,
          SUM(IF(is_won AND closedate >= '2026-01-01' AND closedate < '2026-04-01', COALESCE(hs_arr, amount), 0)) as won_arr,
          COUNTIF(is_won AND closedate >= '2026-01-01' AND closedate < '2026-04-01') as won_deals,
          SUM(IF(is_open AND closedate < '2026-04-01', COALESCE(hs_arr, amount), 0)) as q1_pipeline_arr,
          COUNTIF(is_open AND closedate < '2026-04-01') as q1_open_deals
        FROM `octup-testing.hubspot_data.deals_snapshots`
        WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM `octup-testing.hubspot_data.deals_snapshots`)
          AND pipeline_label = '3PL New Business'
        GROUP BY owner_name
        HAVING won_arr > 0 OR q1_pipeline_arr > 0
        ORDER BY won_arr DESC
        """
        result = self.client.query(query).result()
        return list(result)

    def calculate_target_metrics(self, snapshot):
        """Calculate all target-related metrics based on TOTAL ARR (all closed-won deals)"""
        # TOTAL ARR from all closed-won customers (existing + new)
        total_arr = snapshot.total_won_arr or 0
        yesterday_total = snapshot.yesterday_total_arr or 0

        # Q1 new wins only (for reference)
        q1_won = snapshot.q1_won_arr or 0

        # Time calculations
        today = self.report_date
        days_in_q1 = (Q1_END - Q1_START).days + 1  # 90 days
        days_elapsed = (today - Q1_START).days + 1
        days_remaining = max(0, (Q1_END - today).days + 1)

        # Target calculations based on TOTAL ARR
        remaining_target = Q1_TARGET - total_arr
        pct_achieved = (total_arr / Q1_TARGET) * 100 if Q1_TARGET > 0 else 0

        # Daily change in total ARR
        daily_arr_change = total_arr - yesterday_total

        # Required run rate to hit target
        required_daily = remaining_target / days_remaining if days_remaining > 0 else 0
        required_weekly = required_daily * 7

        # On track calculation - are we gaining enough ARR?
        is_on_track = remaining_target <= 0 or (required_daily <= (daily_arr_change if daily_arr_change > 0 else required_daily * 2))

        return {
            'total_arr': total_arr,
            'q1_won': q1_won,
            'remaining_target': max(0, remaining_target),
            'pct_achieved': pct_achieved,
            'days_elapsed': days_elapsed,
            'days_remaining': days_remaining,
            'is_on_track': remaining_target <= 0,
            'daily_arr_change': daily_arr_change,
            'required_daily': required_daily,
            'required_weekly': required_weekly
        }

    def generate_pdf(self, output_path=None):
        """Generate the full PDF report"""
        if output_path is None:
            # Save in the same directory as this script with timestamp to avoid conflicts
            script_dir = os.path.dirname(os.path.abspath(__file__))
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_path = os.path.join(script_dir, f"Q1_Target_Report_{timestamp}.pdf")

        # Fetch all data
        print("Fetching current snapshot...")
        snapshot = self.fetch_current_snapshot()

        print("Fetching yesterday's pipeline...")
        yesterday = self.fetch_yesterday_pipeline()

        print("Fetching daily changes...")
        daily_changes = self.fetch_new_deals_today()

        print("Fetching top pipeline deals...")
        top_deals = self.fetch_top_pipeline_deals()

        print("Fetching deals at risk...")
        risk_deals = self.fetch_deals_at_risk()

        print("Fetching owner performance...")
        owner_perf = self.fetch_owner_performance()

        # Calculate metrics
        metrics = self.calculate_target_metrics(snapshot)

        # Pipeline changes
        pipeline_change = (snapshot.open_pipeline_arr or 0) - (yesterday.open_pipeline_arr or 0)
        q1_pipeline_change = (snapshot.q1_pipeline_arr or 0) - (yesterday.q1_pipeline_arr or 0)

        # Build PDF
        print(f"Generating PDF: {output_path}")
        doc = SimpleDocTemplate(output_path, pagesize=letter,
                               rightMargin=0.5*inch, leftMargin=0.5*inch,
                               topMargin=0.5*inch, bottomMargin=0.5*inch)

        story = []

        # Title
        story.append(Paragraph("Q1 2026 TOTAL ARR TARGET REPORT", self.styles['ReportTitle']))
        story.append(Paragraph(f"Target: $1.6M Total ARR (All Customers) | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                              self.styles['Normal']))
        story.append(Spacer(1, 20))

        # Executive Summary Box
        if metrics['is_on_track']:
            status_style = self.styles['SuccessText']
            status_text = f"TARGET REACHED! Total ARR: ${metrics['total_arr']:,.0f}"
        else:
            status_style = self.styles['AlertText']
            status_text = f"${metrics['remaining_target']:,.0f} ARR remaining to reach $1.6M target"

        story.append(Paragraph(status_text, status_style))
        story.append(Spacer(1, 15))

        # Section 1: Target Progress
        story.append(Paragraph("TOTAL ARR TARGET PROGRESS", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))

        target_data = [
            ['Metric', 'ARR Value', 'Change'],
            ['Q1 ARR Target', f"${Q1_TARGET:,.0f}", '-'],
            ['Current Total ARR (All Customers)', f"${metrics['total_arr']:,.0f}",
             self._format_change(metrics['daily_arr_change'])],
            ['Q1 New Wins ARR', f"${metrics['q1_won']:,.0f}", '-'],
            ['Remaining to Target', f"${metrics['remaining_target']:,.0f}", '-'],
            ['Achievement', f"{metrics['pct_achieved']:.1f}%", '-'],
            ['Days Remaining in Q1', f"{metrics['days_remaining']}", '-'],
        ]

        target_table = Table(target_data, colWidths=[2.5*inch, 2*inch, 2*inch])
        target_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f7fafc')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ]))
        story.append(target_table)
        story.append(Spacer(1, 15))

        # Required Run Rate
        story.append(Paragraph("REQUIRED ARR RUN RATE TO HIT TARGET", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))

        run_rate_data = [
            ['Daily ARR Required', 'Weekly ARR Required', 'Monthly ARR Required'],
            [f"${metrics['required_daily']:,.0f}",
             f"${metrics['required_weekly']:,.0f}",
             f"${metrics['required_daily'] * 30:,.0f}"]
        ]

        run_rate_table = Table(run_rate_data, colWidths=[2.2*inch, 2.2*inch, 2.2*inch])
        run_rate_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#553c9a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('FONTSIZE', (0, 1), (-1, -1), 14),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#faf5ff')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(run_rate_table)
        story.append(Spacer(1, 15))

        # Section 2: Pipeline Coverage
        story.append(Paragraph("PIPELINE ARR COVERAGE", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))

        open_pipeline = snapshot.open_pipeline_arr or 0
        q1_pipeline = snapshot.q1_pipeline_arr or 0
        weighted = snapshot.weighted_pipeline or 0
        coverage_ratio = open_pipeline / metrics['remaining_target'] if metrics['remaining_target'] > 0 else 0

        pipeline_data = [
            ['Metric', 'ARR Value', 'Change'],
            ['Total Open Pipeline ARR', f"${open_pipeline:,.0f}", self._format_change(pipeline_change)],
            ['Q1 Pipeline ARR (closing by Mar 31)', f"${q1_pipeline:,.0f}", self._format_change(q1_pipeline_change)],
            ['Weighted Pipeline ARR', f"${weighted:,.0f}", '-'],
            ['Coverage Ratio', f"{coverage_ratio:.1f}x", '(need 3x)'],
        ]

        pipeline_table = Table(pipeline_data, colWidths=[2.5*inch, 2*inch, 2*inch])
        pipeline_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#276749')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f0fff4')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ]))
        story.append(pipeline_table)
        story.append(Spacer(1, 15))

        # Section 3: Today's Changes
        story.append(Paragraph("TODAY'S CHANGES", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))

        if daily_changes:
            won_deals = [d for d in daily_changes if d.change_type == 'WON']
            new_deals = [d for d in daily_changes if d.change_type == 'NEW']
            stage_changes = [d for d in daily_changes if d.change_type == 'STAGE_CHANGE']

            if won_deals:
                story.append(Paragraph("DEALS CLOSED WON TODAY", self.styles['PositiveChange']))
                won_data = [['Deal', 'ARR', 'Owner']]
                for d in won_deals[:5]:
                    won_data.append([d.dealname[:35], f"${d.arr:,.0f}", d.owner_name])
                won_table = Table(won_data, colWidths=[3*inch, 1.5*inch, 2*inch])
                won_table.setStyle(self._get_change_table_style(colors.HexColor('#c6f6d5')))
                story.append(won_table)
                story.append(Spacer(1, 10))

            if new_deals:
                story.append(Paragraph("NEW DEALS ADDED", self.styles['Normal']))
                new_data = [['Deal', 'ARR', 'Owner', 'Stage']]
                for d in new_deals[:5]:
                    new_data.append([d.dealname[:30], f"${d.arr:,.0f}", d.owner_name[:15], d.dealstage_label[:15]])
                new_table = Table(new_data, colWidths=[2.5*inch, 1.2*inch, 1.5*inch, 1.5*inch])
                new_table.setStyle(self._get_change_table_style(colors.HexColor('#ebf8ff')))
                story.append(new_table)
                story.append(Spacer(1, 10))

            if stage_changes:
                story.append(Paragraph("STAGE MOVEMENTS", self.styles['Normal']))
                stage_data = [['Deal', 'ARR', 'Movement']]
                for d in stage_changes[:5]:
                    stage_data.append([d.dealname[:30], f"${d.arr:,.0f}", d.dealstage_label[:35]])
                stage_table = Table(stage_data, colWidths=[2.5*inch, 1.2*inch, 3*inch])
                stage_table.setStyle(self._get_change_table_style(colors.HexColor('#faf5ff')))
                story.append(stage_table)
        else:
            story.append(Paragraph("No significant changes today.", self.styles['Normal']))

        story.append(Spacer(1, 15))

        # Section 4: Top Q1 Pipeline Deals
        story.append(Paragraph("TOP DEALS EXPECTED TO CLOSE IN Q1", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))

        if top_deals:
            deals_data = [['Deal Name', 'ARR', 'Owner', 'Stage', 'Days in Stage']]
            for d in top_deals:
                deals_data.append([
                    d.dealname[:30],
                    f"${d.arr:,.0f}",
                    d.owner_name[:12],
                    d.dealstage_label[:15],
                    str(d.days_in_current_stage or 0)
                ])

            deals_table = Table(deals_data, colWidths=[2.2*inch, 1*inch, 1.2*inch, 1.3*inch, 0.8*inch])
            deals_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('ALIGN', (4, 0), (4, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')]),
            ]))
            story.append(deals_table)

        story.append(PageBreak())

        # Section 5: Deals at Risk
        story.append(Paragraph("DEALS AT RISK", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))

        if risk_deals:
            risk_data = [['Deal', 'ARR', 'Owner', 'Risk Reason', 'Score']]
            for d in risk_deals:
                risk_data.append([
                    d.dealname[:25],
                    f"${d.arr_value:,.0f}",
                    d.owner_name[:12],
                    d.primary_risk_reason[:20],
                    str(d.risk_score)
                ])

            risk_table = Table(risk_data, colWidths=[1.8*inch, 1*inch, 1.2*inch, 1.8*inch, 0.7*inch])
            risk_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#c53030')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('ALIGN', (4, 0), (4, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#fff5f5')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(risk_table)
        else:
            story.append(Paragraph("Risk view not available or no high-risk deals.", self.styles['Normal']))

        story.append(Spacer(1, 15))

        # Section 6: Owner Performance
        story.append(Paragraph("OWNER CONTRIBUTION TO Q1 TARGET", self.styles['SectionHeader']))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))

        if owner_perf:
            owner_data = [['Owner', 'Q1 Won', '# Won', 'Q1 Pipeline', '# Open']]
            for o in owner_perf:
                owner_data.append([
                    o.owner_name[:20],
                    f"${o.won_arr:,.0f}",
                    str(o.won_deals),
                    f"${o.q1_pipeline_arr:,.0f}",
                    str(o.q1_open_deals)
                ])

            owner_table = Table(owner_data, colWidths=[1.8*inch, 1.3*inch, 0.8*inch, 1.3*inch, 0.8*inch])
            owner_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#553c9a')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#faf5ff')]),
            ]))
            story.append(owner_table)

        # Footer
        story.append(Spacer(1, 30))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#2c5282')))
        story.append(Paragraph(
            f"Report generated by ROI ETL Pipeline | Data as of {snapshot.report_date}",
            self.styles['Normal']
        ))

        # Build PDF
        doc.build(story)
        print(f"PDF report generated: {output_path}")
        return output_path

    def _format_change(self, value):
        """Format a change value with + or - prefix"""
        if value is None or value == 0:
            return '-'
        elif value > 0:
            return f"+${value:,.0f}"
        else:
            return f"-${abs(value):,.0f}"

    def generate_html_report(self):
        """Generate the report as HTML for email body"""
        # Fetch all data
        print("Fetching current snapshot...")
        snapshot = self.fetch_current_snapshot()

        print("Fetching yesterday's pipeline...")
        yesterday = self.fetch_yesterday_pipeline()

        print("Fetching daily changes...")
        daily_changes = self.fetch_new_deals_today()

        print("Fetching top pipeline deals...")
        top_deals = self.fetch_top_pipeline_deals()

        print("Fetching deals at risk...")
        risk_deals = self.fetch_deals_at_risk()

        print("Fetching owner performance...")
        owner_perf = self.fetch_owner_performance()

        # Calculate metrics
        metrics = self.calculate_target_metrics(snapshot)

        # Pipeline changes
        pipeline_change = (snapshot.open_pipeline_arr or 0) - (yesterday.open_pipeline_arr or 0)
        q1_pipeline_change = (snapshot.q1_pipeline_arr or 0) - (yesterday.q1_pipeline_arr or 0)

        open_pipeline = snapshot.open_pipeline_arr or 0
        q1_pipeline = snapshot.q1_pipeline_arr or 0
        weighted = snapshot.weighted_pipeline or 0
        coverage_ratio = open_pipeline / metrics['remaining_target'] if metrics['remaining_target'] > 0 else 0

        # Build HTML
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f7fafc; }}
        h1 {{ color: #1a365d; text-align: center; border-bottom: 3px solid #2c5282; padding-bottom: 10px; }}
        h2 {{ color: #2c5282; margin-top: 25px; border-left: 4px solid #2c5282; padding-left: 10px; }}
        .status-box {{ padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: bold; }}
        .status-warning {{ background-color: #fed7d7; color: #c53030; }}
        .status-success {{ background-color: #c6f6d5; color: #276749; }}
        table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
        th {{ background-color: #2c5282; color: white; padding: 10px; text-align: left; }}
        td {{ padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }}
        tr:nth-child(even) {{ background-color: #f7fafc; }}
        .positive {{ color: #276749; font-weight: bold; }}
        .negative {{ color: #c53030; font-weight: bold; }}
        .metric-value {{ font-weight: bold; font-size: 16px; }}
        .section-green th {{ background-color: #276749; }}
        .section-purple th {{ background-color: #553c9a; }}
        .section-red th {{ background-color: #c53030; }}
        .change-won {{ background-color: #c6f6d5; }}
        .change-new {{ background-color: #ebf8ff; }}
        .footer {{ margin-top: 30px; padding-top: 15px; border-top: 2px solid #2c5282; color: #4a5568; font-size: 12px; text-align: center; }}
    </style>
</head>
<body>
    <h1>Q1 2026 TOTAL ARR TARGET REPORT</h1>
    <p style="text-align: center; color: #4a5568;">Target: $1.6M Total ARR | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>

    <div class="status-box {'status-success' if metrics['is_on_track'] else 'status-warning'}">
        {'TARGET REACHED! Total ARR: ${:,.0f}'.format(metrics['total_arr']) if metrics['is_on_track'] else '${:,.0f} ARR remaining to reach $1.6M target'.format(metrics['remaining_target'])}
    </div>

    <h2>TARGET PROGRESS</h2>
    <table>
        <tr><th>Metric</th><th>ARR Value</th><th>Change</th></tr>
        <tr><td>Q1 ARR Target</td><td class="metric-value">${Q1_TARGET:,.0f}</td><td>-</td></tr>
        <tr><td>Current Total ARR (All Customers)</td><td class="metric-value">${metrics['total_arr']:,.0f}</td><td class="{'positive' if metrics['daily_arr_change'] > 0 else 'negative' if metrics['daily_arr_change'] < 0 else ''}">{self._format_change(metrics['daily_arr_change'])}</td></tr>
        <tr><td>Q1 New Wins ARR</td><td>${metrics['q1_won']:,.0f}</td><td>-</td></tr>
        <tr><td>Remaining to Target</td><td class="metric-value">${metrics['remaining_target']:,.0f}</td><td>-</td></tr>
        <tr><td>Achievement</td><td class="metric-value">{metrics['pct_achieved']:.1f}%</td><td>-</td></tr>
        <tr><td>Days Remaining in Q1</td><td>{metrics['days_remaining']}</td><td>-</td></tr>
    </table>

    <h2>REQUIRED RUN RATE TO HIT TARGET</h2>
    <table class="section-purple">
        <tr><th>Daily Required</th><th>Weekly Required</th><th>Monthly Required</th></tr>
        <tr style="font-size: 18px; font-weight: bold; text-align: center;">
            <td>${metrics['required_daily']:,.0f}</td>
            <td>${metrics['required_weekly']:,.0f}</td>
            <td>${metrics['required_daily'] * 30:,.0f}</td>
        </tr>
    </table>

    <h2>PIPELINE COVERAGE</h2>
    <table class="section-green">
        <tr><th>Metric</th><th>ARR Value</th><th>Change</th></tr>
        <tr><td>Total Open Pipeline ARR</td><td class="metric-value">${open_pipeline:,.0f}</td><td class="{'positive' if pipeline_change > 0 else 'negative' if pipeline_change < 0 else ''}">{self._format_change(pipeline_change)}</td></tr>
        <tr><td>Q1 Pipeline ARR (closing by Mar 31)</td><td>${q1_pipeline:,.0f}</td><td class="{'positive' if q1_pipeline_change > 0 else 'negative' if q1_pipeline_change < 0 else ''}">{self._format_change(q1_pipeline_change)}</td></tr>
        <tr><td>Weighted Pipeline ARR</td><td>${weighted:,.0f}</td><td>-</td></tr>
        <tr><td>Coverage Ratio</td><td class="metric-value">{coverage_ratio:.1f}x</td><td>(need 3x)</td></tr>
    </table>
"""

        # Today's Changes
        html += "<h2>TODAY'S CHANGES</h2>"
        if daily_changes:
            won_deals = [d for d in daily_changes if d.change_type == 'WON']
            new_deals = [d for d in daily_changes if d.change_type == 'NEW']
            stage_changes = [d for d in daily_changes if d.change_type == 'STAGE_CHANGE']

            if won_deals:
                html += "<h3 style='color: #276749;'>DEALS CLOSED WON</h3><table>"
                html += "<tr><th>Deal</th><th>ARR</th><th>Owner</th></tr>"
                for d in won_deals[:5]:
                    html += f"<tr class='change-won'><td>{d.dealname[:40]}</td><td>${d.arr:,.0f}</td><td>{d.owner_name}</td></tr>"
                html += "</table>"

            if new_deals:
                html += "<h3>NEW DEALS ADDED</h3><table>"
                html += "<tr><th>Deal</th><th>ARR</th><th>Owner</th><th>Stage</th></tr>"
                for d in new_deals[:5]:
                    html += f"<tr class='change-new'><td>{d.dealname[:35]}</td><td>${d.arr:,.0f}</td><td>{d.owner_name[:15]}</td><td>{d.dealstage_label[:15]}</td></tr>"
                html += "</table>"

            if stage_changes:
                html += "<h3>STAGE MOVEMENTS</h3><table>"
                html += "<tr><th>Deal</th><th>ARR</th><th>Movement</th></tr>"
                for d in stage_changes[:5]:
                    html += f"<tr><td>{d.dealname[:35]}</td><td>${d.arr:,.0f}</td><td>{d.dealstage_label[:40]}</td></tr>"
                html += "</table>"
        else:
            html += "<p>No significant changes today.</p>"

        # Top Q1 Pipeline Deals
        html += "<h2>TOP DEALS EXPECTED TO CLOSE IN Q1</h2>"
        if top_deals:
            html += "<table><tr><th>Deal</th><th>ARR</th><th>Owner</th><th>Stage</th><th>Days</th></tr>"
            for d in top_deals[:10]:
                html += f"<tr><td>{d.dealname[:35]}</td><td>${d.arr:,.0f}</td><td>{d.owner_name[:12]}</td><td>{d.dealstage_label[:15]}</td><td>{d.days_in_current_stage or 0}</td></tr>"
            html += "</table>"

        # Deals at Risk
        html += "<h2>DEALS AT RISK</h2>"
        if risk_deals:
            html += "<table class='section-red'><tr><th>Deal</th><th>ARR</th><th>Owner</th><th>Risk Reason</th></tr>"
            for d in risk_deals[:10]:
                html += f"<tr><td>{d.dealname[:30]}</td><td>${d.arr_value:,.0f}</td><td>{d.owner_name[:12]}</td><td>{d.primary_risk_reason[:25]}</td></tr>"
            html += "</table>"
        else:
            html += "<p>No high-risk deals identified.</p>"

        # Owner Performance
        html += "<h2>OWNER CONTRIBUTION TO Q1 TARGET</h2>"
        if owner_perf:
            html += "<table class='section-purple'><tr><th>Owner</th><th>Q1 Won</th><th># Won</th><th>Q1 Pipeline</th><th># Open</th></tr>"
            for o in owner_perf:
                html += f"<tr><td>{o.owner_name[:20]}</td><td>${o.won_arr:,.0f}</td><td>{o.won_deals}</td><td>${o.q1_pipeline_arr:,.0f}</td><td>{o.q1_open_deals}</td></tr>"
            html += "</table>"

        # Footer
        html += f"""
    <div class="footer">
        <p>Report generated by ROI ETL Pipeline | Data as of {snapshot.report_date}</p>
    </div>
</body>
</html>
"""
        print("HTML report generated")
        return html

    def _get_change_table_style(self, bg_color):
        """Get standard table style for change tables"""
        return TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BACKGROUND', (0, 1), (-1, -1), bg_color),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ])


class EmailSender:
    """Send reports via email using SMTP (supports Outlook and Gmail)"""

    # SMTP server configurations
    PROVIDERS = {
        'outlook': {'server': 'smtp.office365.com', 'port': 587},
        'gmail': {'server': 'smtp.gmail.com', 'port': 587},
    }

    def __init__(self, provider='outlook'):
        self.config_file = os.path.join(os.path.dirname(__file__), 'email_config.json')
        self._load_config()
        # Use saved provider or default
        if not hasattr(self, 'provider') or not self.provider:
            self.provider = provider
            self._set_smtp_from_provider()

    def _set_smtp_from_provider(self):
        """Set SMTP settings based on provider"""
        if self.provider in self.PROVIDERS:
            self.smtp_server = self.PROVIDERS[self.provider]['server']
            self.smtp_port = self.PROVIDERS[self.provider]['port']
        else:
            # Default to Outlook
            self.smtp_server = 'smtp.office365.com'
            self.smtp_port = 587

    def _load_config(self):
        """Load email configuration from file"""
        if os.path.exists(self.config_file):
            with open(self.config_file, 'r') as f:
                config = json.load(f)
                self.sender_email = config.get('sender_email', '')
                self.sender_password = config.get('sender_password', '')
                self.recipient_email = config.get('recipient_email', '')
                self.provider = config.get('provider', 'outlook')
                self._set_smtp_from_provider()
        else:
            self.sender_email = ''
            self.sender_password = ''
            self.recipient_email = ''
            self.provider = 'outlook'
            self._set_smtp_from_provider()

    def configure(self, sender_email, sender_password, recipient_email, provider='outlook'):
        """Configure email settings and save to file

        Args:
            sender_email: Your Outlook/Gmail email address
            sender_password: Your password or App Password
            recipient_email: Where to send reports
            provider: 'outlook' or 'gmail'
        """
        config = {
            'sender_email': sender_email,
            'sender_password': sender_password,
            'recipient_email': recipient_email,
            'provider': provider
        }
        with open(self.config_file, 'w') as f:
            json.dump(config, f)
        self._load_config()
        print(f"Email configuration saved to {self.config_file}")
        print(f"Provider: {provider.upper()} ({self.smtp_server}:{self.smtp_port})")

    def send_report(self, pdf_path, subject=None, body=None):
        """Send the PDF report via email"""
        if not all([self.sender_email, self.sender_password, self.recipient_email]):
            raise ValueError("Email not configured. Run configure() first.")

        if subject is None:
            subject = f"Q1 Target Report - {date.today().strftime('%Y-%m-%d')}"

        if body is None:
            body = """
            <html>
            <body>
            <h2>Daily Q1 Target Progress Report</h2>
            <p>Please find attached the daily Q1 target progress report.</p>
            <p>Key items covered:</p>
            <ul>
                <li>Progress toward $1.6M ARR target</li>
                <li>Today's pipeline changes</li>
                <li>Deals at risk</li>
                <li>Owner performance</li>
            </ul>
            <p>This report is automatically generated by the ROI ETL Pipeline.</p>
            </body>
            </html>
            """

        # Create message
        msg = MIMEMultipart()
        msg['From'] = self.sender_email
        msg['To'] = self.recipient_email
        msg['Subject'] = subject

        # Attach body
        msg.attach(MIMEText(body, 'html'))

        # Attach PDF
        with open(pdf_path, 'rb') as f:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(f.read())
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename="{os.path.basename(pdf_path)}"')
            msg.attach(part)

        # Send email
        try:
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.sender_email, self.sender_password)
            server.send_message(msg)
            server.quit()
            print(f"Report sent successfully to {self.recipient_email}")
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False

    def send_html_report(self, html_content, subject=None):
        """Send HTML report directly in email body (no attachment)"""
        if not all([self.sender_email, self.sender_password, self.recipient_email]):
            raise ValueError("Email not configured. Run configure() first.")

        if subject is None:
            subject = f"Q1 Target Report - {date.today().strftime('%Y-%m-%d')}"

        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = self.sender_email
        msg['To'] = self.recipient_email
        msg['Subject'] = subject

        # Attach HTML body
        msg.attach(MIMEText(html_content, 'html'))

        # Send email
        try:
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.sender_email, self.sender_password)
            server.send_message(msg)
            server.quit()
            print(f"HTML report sent successfully to {self.recipient_email}")
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False


def generate_and_send_report(recipient_email=None):
    """Main function to generate and send the daily report (PDF with attachment)"""
    # Generate PDF
    generator = DailyReportGenerator()
    pdf_path = generator.generate_pdf()

    # Send email if recipient provided
    if recipient_email:
        sender = EmailSender()
        if not sender.sender_email:
            print("\nEmail not configured. Run: python daily_scheduler.py --configure")
            print("\nOr configure manually:")
            print("  from daily_report_generator import EmailSender")
            print("  sender = EmailSender()")
            print("  sender.configure('your@outlook.com', 'password', 'recipient@email.com', 'outlook')")
        else:
            sender.recipient_email = recipient_email
            sender.send_report(pdf_path)

    return pdf_path


def generate_and_send_html_report(recipient_email=None):
    """Main function to generate and send the daily report as HTML in email body (no attachment)"""
    generator = DailyReportGenerator()
    html_content = generator.generate_html_report()

    # Send email if recipient provided
    if recipient_email:
        sender = EmailSender()
        if not sender.sender_email:
            print("\nEmail not configured. Run: python daily_scheduler.py --configure")
            print("\nOr configure manually:")
            print("  from daily_report_generator import EmailSender")
            print("  sender = EmailSender()")
            print("  sender.configure('your@outlook.com', 'password', 'recipient@email.com', 'outlook')")
        else:
            sender.recipient_email = recipient_email
            sender.send_html_report(html_content)

    return html_content


if __name__ == "__main__":
    import sys

    # Check for --html flag to send HTML email instead of PDF
    if '--html' in sys.argv:
        sys.argv.remove('--html')
        recipient = sys.argv[1] if len(sys.argv) > 1 else None
        generate_and_send_html_report(recipient)
        print("\nHTML report sent (no attachment)")
    else:
        recipient = sys.argv[1] if len(sys.argv) > 1 else None
        pdf_path = generate_and_send_report(recipient)
        print(f"\nReport saved: {pdf_path}")
