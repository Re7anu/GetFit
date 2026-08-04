"""Date calculation utilities for handling customizable day-cutoff / rollover times."""

from datetime import datetime, date, timedelta, time
from typing import Optional


def get_effective_user_date(day_cutoff_time_str: Optional[str] = "00:00", dt: Optional[datetime] = None) -> date:
    """Computes the effective fitness date given a user's day rollover/cutoff time string (e.g. '03:00').

    Args:
        day_cutoff_time_str: HH:MM 24-hour time string when the user's fitness day ends (e.g. '03:00' or '00:00').
        dt: Reference datetime object. Defaults to current local datetime.now().

    Returns:
        date: The effective calendar date for logging food, exercises, and daily summaries.
    """
    dt = dt or datetime.now()

    if not day_cutoff_time_str:
        return dt.date()

    try:
        parts = day_cutoff_time_str.strip().split(":")
        cutoff_hour = int(parts[0])
        cutoff_minute = int(parts[1]) if len(parts) > 1 else 0
        cutoff_time = time(cutoff_hour, cutoff_minute)
    except (ValueError, IndexError):
        cutoff_time = time(0, 0)

    # If cutoff_time is 00:00 (standard midnight), effective date is simply dt.date()
    if cutoff_time == time(0, 0):
        return dt.date()

    # If reference time is strictly before the cutoff time (e.g. 1:30 AM < 3:00 AM cutoff),
    # the log belongs to yesterday's fitness day!
    if dt.time() < cutoff_time:
        return (dt - timedelta(days=1)).date()

    return dt.date()
