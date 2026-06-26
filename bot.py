"""Telegram Trip-PDF Bot — Phase 1 skeleton.

Proves the plumbing: the bot is alive, responds to /start, and acknowledges
photos / PDF documents. Extraction (Phase 2) and PDF synthesis (Phase 3) are
not wired in yet — this is intentionally the smallest deployable surface.

See docs/BuildPlan.md for the full phased plan.
"""

from __future__ import annotations

import logging
import os

try:
    # Load a local .env when present (no-op in production where vars are set
    # directly, e.g. Railway). Safe to skip if python-dotenv isn't installed.
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    level=logging.INFO,
)
# Quiet the noisy HTTP layer; keep our own logs.
logging.getLogger("httpx").setLevel(logging.WARNING)
logger = logging.getLogger("trip-pdf-bot")


START_MESSAGE = (
    "👋 *Trip-PDF Bot*\n\n"
    "Send me your ticket images (flights, trains, hotels…), one or many. "
    "When you've sent them all, type /done and I'll send back a single clean "
    "PDF with your trip in order.\n\n"
    "Use /reset to start over."
)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Respond to /start with one-line instructions (Phase 1)."""
    if update.message:
        await update.message.reply_markdown(START_MESSAGE)


async def acknowledge_media(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Acknowledge a received photo or PDF document (Phase 1).

    Phase 2 will replace this with download → vision extraction → confirmation.
    """
    if update.message:
        await update.message.reply_text("📩 Got it.")


async def done(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Placeholder for /done until Phase 3 wires in PDF synthesis."""
    if update.message:
        await update.message.reply_text(
            "🛠️ PDF generation isn't wired up yet — that's the next build phase."
        )


def main() -> None:
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        raise SystemExit(
            "TELEGRAM_BOT_TOKEN is not set. Add it to your environment "
            "(.env locally, or Railway variables) before starting the bot."
        )

    app = Application.builder().token(token).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("done", done))
    app.add_handler(
        MessageHandler(filters.PHOTO | filters.Document.ALL, acknowledge_media)
    )

    logger.info("Bot starting (long-polling)…")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
