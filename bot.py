"""Telegram Trip-PDF Bot.

Pipeline (see docs/BuildPlan.md):
  ticket images -> vision extraction -> in-memory session -> /done -> PDF

Phase 1 (skeleton) and Phase 2 (extraction) are wired in. /done still returns a
placeholder until Phase 3 adds chronological sort + WeasyPrint PDF rendering.

Privacy: downloaded file bytes are used for one extraction call and then
dropped. Nothing is written to disk; only extracted fields live in memory.
"""

from __future__ import annotations

import asyncio
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

import sessions
from extraction import IMAGE_MEDIA_TYPES, extract_ticket
from pdf import build_trip_pdf

logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    level=logging.INFO,
)
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
    """Respond to /start with one-line instructions."""
    if update.message:
        await update.message.reply_markdown(START_MESSAGE)


async def _download(message) -> tuple[bytes | None, str | None, str | None]:
    """Pull a photo or supported document off a Telegram message.

    Returns (file_bytes, media_type, error_message). Exactly one of file_bytes
    or error_message is set.
    """
    if message.photo:
        # photo[-1] is the largest available size. Telegram photos are JPEG.
        tg_file = await message.photo[-1].get_file()
        data = await tg_file.download_as_bytearray()
        return bytes(data), "image/jpeg", None

    if message.document:
        media_type = (message.document.mime_type or "").lower()
        if media_type in IMAGE_MEDIA_TYPES or media_type == "application/pdf":
            tg_file = await message.document.get_file()
            data = await tg_file.download_as_bytearray()
            return bytes(data), media_type, None
        return None, None, (
            "I can read photos and PDFs of tickets. That file type isn't "
            "something I can read — try sending a photo or a PDF."
        )

    return None, None, "Send me a photo or PDF of a ticket and I'll add it to your trip."


async def handle_media(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Download a ticket, extract its details, and confirm to the user."""
    message = update.message
    if message is None or update.effective_user is None:
        return
    user_id = update.effective_user.id

    file_bytes, media_type, error = await _download(message)
    if error:
        await message.reply_text(error)
        return

    await message.reply_text("📩 Got it — reading it now…")

    # Anthropic client is synchronous; run it off the event loop. file_bytes is
    # discarded when this scope exits — never persisted.
    result = await asyncio.to_thread(extract_ticket, file_bytes, media_type)

    if result.status == "error":
        await message.reply_text(
            "😕 I couldn't read that one — please try resending it."
        )
        return
    if result.status == "not_ticket":
        await message.reply_text(
            "🤔 I couldn't find a ticket in that image. Send a clear photo of a "
            "ticket or booking and I'll add it."
        )
        return

    total = sessions.add_item(user_id, result.item)
    line = result.item.confirmation_line()
    plural = "s" if total != 1 else ""
    await message.reply_text(
        f"{line}\n\n({total} item{plural} so far — /done when ready)"
    )


async def done(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Build the trip PDF, send it, and clear the session."""
    message = update.message
    if message is None or update.effective_user is None:
        return
    user_id = update.effective_user.id

    items = sessions.get_items(user_id)
    if not items:
        await message.reply_text(
            "You haven't sent any tickets yet — send a few photos first, then /done."
        )
        return

    await message.reply_text("🛠️ Building your trip PDF…")

    try:
        # WeasyPrint render is CPU-bound and sync — run it off the event loop.
        pdf_bytes, filename = await asyncio.to_thread(build_trip_pdf, items)
    except Exception:
        logger.exception("PDF build failed for user %s", user_id)
        # Keep the session so the user can retry without re-sending tickets.
        await message.reply_text(
            "😕 Something went wrong building your PDF. Your tickets are still "
            "saved — try /done again in a moment."
        )
        return

    n = len(items)
    plural = "s" if n != 1 else ""
    await message.reply_document(
        document=pdf_bytes,
        filename=filename,
        caption=f"✅ Your trip — {n} item{plural}, in order. Safe travels!",
    )
    sessions.clear(user_id)


async def reset(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Clear the user's session."""
    if update.message is None or update.effective_user is None:
        return
    sessions.clear(update.effective_user.id)
    await update.message.reply_text("🧹 Cleared. Send tickets whenever you're ready.")


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
    app.add_handler(CommandHandler("reset", reset))
    app.add_handler(
        MessageHandler(filters.PHOTO | filters.Document.ALL, handle_media)
    )

    logger.info("Bot starting (long-polling)…")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
