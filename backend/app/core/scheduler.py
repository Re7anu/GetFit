"""Background APScheduler module for executing automated cron jobs and nightly email report dispatches."""

from datetime import datetime, date
from apscheduler.schedulers.background import BackgroundScheduler
from loguru import logger

from app.config.settings import settings
from app.db.session import SessionLocal
from app.db.models.user_auth import UserAuth
from app.db.models.profile import UserProfile
from app.services.email_report_service import send_nightly_email_report

scheduler = BackgroundScheduler()


from app.core.date_utils import get_effective_user_date


def dispatch_nightly_email_reports_cron() -> None:
    """Cron job function that checks active user email preferences and dispatches nightly health summary reports."""
    now_time_str = datetime.now().strftime("%H:%M")
    current_hour = datetime.now().hour
    current_minute = datetime.now().minute
    global_default_time_str = f"{settings.NIGHTLY_REPORT_HOUR:02d}:{settings.NIGHTLY_REPORT_MINUTE:02d}"

    logger.info(f"[Nightly Report Cron] Checking email dispatch queue at {now_time_str}...")

    db = SessionLocal()
    try:
        # Find users with profiles enabled for daily email reports
        users = (
            db.query(UserAuth)
            .join(UserProfile)
            .filter(UserProfile.enable_daily_email_report == True)
            .all()
        )

        sent_count = 0
        for user in users:
            profile = user.profile
            user_pref_time = (profile.preferred_email_time if profile and profile.preferred_email_time else global_default_time_str).strip()
            cutoff_time = profile.day_cutoff_time if profile and profile.day_cutoff_time else "00:00"

            # Trigger if current minute matches user's preferred time or global system default
            if now_time_str == user_pref_time or (current_hour == settings.NIGHTLY_REPORT_HOUR and current_minute == settings.NIGHTLY_REPORT_MINUTE):
                try:
                    target_date = get_effective_user_date(cutoff_time)
                    res = send_nightly_email_report(db=db, user=user, target_date=target_date)
                    sent_count += 1
                    logger.info(f"[Cron Dispatch] Email sent to {user.email}: {res.get('status')}")
                except Exception as e:
                    logger.error(f"[Cron Dispatch Error] Failed to send report to {user.email}: {e}")

        logger.info(f"[Nightly Report Cron Finished] Completed dispatch batch for {sent_count} user(s).")
    finally:
        db.close()


def start_scheduler() -> None:
    """Starts the APScheduler background scheduler."""
    if not scheduler.running:
        # Check queue every minute to accommodate custom per-user preferred delivery times
        scheduler.add_job(
            dispatch_nightly_email_reports_cron,
            trigger="cron",
            minute="*",
            id="nightly_email_reports_job",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("Background APScheduler initialized and started successfully.")


def stop_scheduler() -> None:
    """Stops the APScheduler background scheduler on application shutdown."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Background APScheduler stopped cleanly.")
