"""
Daily Report Scheduler
Runs the Q1 target report generation and email sending on a schedule
Can be run as a Windows service or scheduled task
"""
import schedule
import time
from datetime import datetime
import os
import sys
import logging

# Setup logging
log_dir = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(log_dir, 'scheduler.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def run_daily_report(use_html=True):
    """Generate and send the daily report

    Args:
        use_html: If True, sends report as HTML in email body (no attachment).
                  If False, sends PDF as attachment.
    """
    from daily_report_generator import generate_and_send_report, generate_and_send_html_report, EmailSender

    logger.info("=" * 60)
    logger.info("Starting daily report generation")
    logger.info(f"Mode: {'HTML (no attachment)' if use_html else 'PDF (with attachment)'}")
    logger.info("=" * 60)

    try:
        # Load email config
        sender = EmailSender()
        recipient = sender.recipient_email

        if not recipient:
            logger.warning("No recipient email configured. Report will be generated but not sent.")
            recipient = None

        # Generate and send
        if use_html:
            generate_and_send_html_report(recipient)
            logger.info("HTML report generated and sent in email body")
        else:
            pdf_path = generate_and_send_report(recipient)
            logger.info(f"PDF report generated: {pdf_path}")
            # Archive old reports (keep last 30)
            archive_old_reports()

        if recipient:
            logger.info(f"Report sent to: {recipient}")

        logger.info("Daily report completed successfully")

    except Exception as e:
        logger.error(f"Error generating daily report: {e}", exc_info=True)


def archive_old_reports(keep_count=30):
    """Archive old PDF reports, keeping the most recent ones"""
    report_dir = os.path.dirname(__file__)
    pdf_files = [f for f in os.listdir(report_dir) if f.startswith('Q1_Target_Report_') and f.endswith('.pdf')]
    pdf_files.sort(reverse=True)  # Most recent first

    if len(pdf_files) > keep_count:
        archive_dir = os.path.join(report_dir, 'archive')
        os.makedirs(archive_dir, exist_ok=True)

        for old_file in pdf_files[keep_count:]:
            src = os.path.join(report_dir, old_file)
            dst = os.path.join(archive_dir, old_file)
            os.rename(src, dst)
            logger.info(f"Archived: {old_file}")


def run_scheduler(run_time="08:00"):
    """
    Run the scheduler that generates reports at the specified time daily

    Args:
        run_time: Time to run in HH:MM format (default 8:00 AM)
    """
    logger.info(f"Starting Daily Report Scheduler")
    logger.info(f"Reports will be generated at {run_time} daily")
    logger.info("Press Ctrl+C to stop")

    # Schedule the job
    schedule.every().day.at(run_time).do(run_daily_report)

    # Also allow manual trigger by creating a trigger file
    trigger_file = os.path.join(os.path.dirname(__file__), 'TRIGGER_REPORT')

    while True:
        # Check for manual trigger
        if os.path.exists(trigger_file):
            logger.info("Manual trigger detected")
            os.remove(trigger_file)
            run_daily_report()

        schedule.run_pending()
        time.sleep(60)  # Check every minute


def setup_windows_task():
    """Print instructions to set up a Windows scheduled task"""
    script_path = os.path.abspath(__file__)
    python_path = sys.executable

    print("\n" + "=" * 60)
    print("WINDOWS TASK SCHEDULER SETUP")
    print("=" * 60)
    print("\nTo set up automatic daily reports, create a Windows Scheduled Task:")
    print("\n1. Open Task Scheduler (taskschd.msc)")
    print("2. Click 'Create Basic Task'")
    print("3. Name: 'Q1 Target Daily Report'")
    print("4. Trigger: Daily at 8:00 AM (or your preferred time)")
    print("5. Action: Start a program")
    print(f"   Program: {python_path}")
    print(f"   Arguments: {script_path} --run-once")
    print(f"   Start in: {os.path.dirname(script_path)}")
    print("\nAlternatively, run in continuous mode:")
    print(f"   {python_path} {script_path}")
    print("\n" + "=" * 60)


def configure_email():
    """Interactive email configuration"""
    from daily_report_generator import EmailSender

    print("\n" + "=" * 60)
    print("EMAIL CONFIGURATION")
    print("=" * 60)

    print("\nSelect email provider:")
    print("  1. Outlook / Microsoft 365 (default)")
    print("  2. Gmail")
    choice = input("\nEnter choice [1]: ").strip() or "1"

    if choice == "2":
        provider = "gmail"
        print("\nFor Gmail, you need to use an App Password:")
        print("1. Go to https://myaccount.google.com/apppasswords")
        print("2. Generate an App Password for 'Mail'")
        print("3. Use that password below\n")
    else:
        provider = "outlook"
        print("\nFor Outlook/Microsoft 365:")
        print("- Use your regular Outlook email and password")
        print("- If you have MFA enabled, you may need an App Password")
        print("- Create one at: https://account.live.com/proofs/AppPassword\n")

    sender_email = input("Your email address: ").strip()
    sender_password = input("Password (or App Password): ").strip()
    recipient_email = input("Send reports to: ").strip()

    if all([sender_email, sender_password, recipient_email]):
        sender = EmailSender()
        sender.configure(sender_email, sender_password, recipient_email, provider)
        print("\nConfiguration saved!")
        print("Test by running: python daily_scheduler.py --run-once")
    else:
        print("\nConfiguration cancelled - all fields required.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Daily Q1 Target Report Scheduler')
    parser.add_argument('--run-once', action='store_true', help='Generate report once and exit')
    parser.add_argument('--configure', action='store_true', help='Configure email settings')
    parser.add_argument('--setup', action='store_true', help='Show Windows Task Scheduler setup')
    parser.add_argument('--time', default='08:00', help='Time to run daily (HH:MM format)')
    parser.add_argument('--pdf', action='store_true', help='Send as PDF attachment (default: HTML in email body)')

    args = parser.parse_args()

    if args.configure:
        configure_email()
    elif args.setup:
        setup_windows_task()
    elif args.run_once:
        run_daily_report(use_html=not args.pdf)
    else:
        run_scheduler(args.time)
