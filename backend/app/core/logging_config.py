"""Centralized Loguru logging configuration module for GetFit backend."""

import logging
import os
import sys
from loguru import logger


class InterceptHandler(logging.Handler):
    """Standard logging handler that redirects standard library logs (FastAPI, Uvicorn, APScheduler) to Loguru."""

    def emit(self, record: logging.LogRecord) -> None:
        # Get corresponding Loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller from where originated the logged message
        frame, depth = logging.currentframe(), 2
        while frame and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())


def setup_logging(log_dir: str = "logs") -> None:
    """Configures Loguru logging sinks and intercepts standard Python logging.

    Args:
        log_dir: Directory path where rotating log files will be saved.
    """
    # 1. Ensure log directory exists
    os.makedirs(log_dir, exist_ok=True)

    # 2. Remove default Loguru handler
    logger.remove()

    # 3. Add Console Sink (Colorized Terminal Log Format)
    console_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>"
    )
    logger.add(
        sys.stderr,
        format=console_format,
        level="INFO",
        colorize=True,
    )

    # 4. Add Rotating File Sink (backend/logs/getfit_{time:YYYY-MM-DD}.log)
    file_path = os.path.join(log_dir, "getfit_{time:YYYY-MM-DD}.log")
    file_format = "{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} - {message}"
    logger.add(
        file_path,
        format=file_format,
        level="INFO",
        rotation="10 MB",
        retention="14 days",
        enqueue=True,
        backtrace=True,
        diagnose=True,
    )

    # 5. Intercept Standard Python Loggers (Uvicorn, FastAPI, SQLAlchemy, APScheduler)
    logging.basicConfig(handlers=[InterceptHandler()], level=logging.INFO, force=True)

    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access", "fastapi", "apscheduler"):
        mod_logger = logging.getLogger(logger_name)
        mod_logger.handlers = [InterceptHandler()]
        mod_logger.propagate = False

    logger.info("Loguru logging initialized successfully (Console + File rotation in '{}')", log_dir)
