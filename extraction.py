"""Vision extraction: a ticket image/PDF -> structured TicketItem.

Uses Claude vision (default claude-opus-4-8) with a forced tool call so the
model must return well-formed JSON in a known shape. The extraction prompt is
deliberate about NOT inventing data: unreadable fields come back null, and a
non-ticket image is reported as such rather than fabricated into an item.

Raw file bytes are passed in, used for the single API call, and never persisted.
"""

from __future__ import annotations

import base64
import logging
import os
from dataclasses import dataclass
from typing import Optional

import anthropic

from models import TicketItem

logger = logging.getLogger("trip-pdf-bot.extraction")

MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-opus-4-8")

# Image media types Claude vision accepts. PDFs go through a document block.
IMAGE_MEDIA_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}

ITEM_TYPES = ["flight", "train", "bus", "ferry", "hotel", "car_rental", "event", "other"]

EXTRACTION_PROMPT = (
    "You are extracting structured trip details from a single travel document "
    "(a flight/train/bus/ferry ticket, a hotel booking, a car rental, or an "
    "event ticket).\n\n"
    "Call the `record_ticket` tool with what you can read. Rules:\n"
    "- If the image is NOT a travel ticket/booking (e.g. a selfie, a random "
    "photo, an unreadable/blurry scan), set is_ticket=false and leave the other "
    "fields empty. Do NOT invent a ticket.\n"
    "- Never guess. If a field is not clearly legible, omit it (leave it null). "
    "It is correct and expected to return nulls for missing fields.\n"
    "- Dates/times must be ISO 8601 in the document's local time, e.g. "
    "2026-03-14T09:05. If only a date is legible, use 2026-03-14. If the year is "
    "absent, infer it only when unambiguous; otherwise omit the time/date.\n"
    "- title: a short human label, e.g. 'SQ806 SIN→NRT' or 'Hotel Nikko, 3 nights'.\n"
    "- confidence: 'high' if the key fields are crisp and certain, 'low' if the "
    "image is hard to read, otherwise 'medium'."
)

TICKET_TOOL = {
    "name": "record_ticket",
    "description": "Record the structured details extracted from one travel document.",
    "input_schema": {
        "type": "object",
        "properties": {
            "is_ticket": {
                "type": "boolean",
                "description": "True if this is a travel ticket/booking; false for non-tickets or unreadable images.",
            },
            "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
            "item_type": {"type": "string", "enum": ITEM_TYPES},
            "title": {"type": "string", "description": "Short human label for the item."},
            "provider": {"type": "string", "description": "Airline/operator/hotel/company name."},
            "confirmation_number": {"type": "string"},
            "passenger_name": {"type": "string"},
            "start_datetime": {"type": "string", "description": "ISO 8601 local departure/check-in; null if unknown."},
            "end_datetime": {"type": "string", "description": "ISO 8601 local arrival/check-out; null if unknown."},
            "origin": {"type": "string", "description": "Departure city/airport/station."},
            "destination": {"type": "string", "description": "Arrival city/airport/station."},
            "location": {"type": "string", "description": "Address/city for a hotel or event."},
            "seat": {"type": "string"},
            "notes": {"type": "string"},
        },
        "required": ["is_ticket", "confidence"],
    },
}


@dataclass
class ExtractionResult:
    status: str  # "ok" | "not_ticket" | "error"
    item: Optional[TicketItem] = None


_client: Optional[anthropic.Anthropic] = None


def _get_client() -> anthropic.Anthropic:
    """Lazily build the Anthropic client (reads ANTHROPIC_API_KEY from env)."""
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


def _content_block(file_bytes: bytes, media_type: str) -> dict:
    b64 = base64.standard_b64encode(file_bytes).decode("utf-8")
    if media_type == "application/pdf":
        return {
            "type": "document",
            "source": {"type": "base64", "media_type": "application/pdf", "data": b64},
        }
    return {
        "type": "image",
        "source": {"type": "base64", "media_type": media_type, "data": b64},
    }


def _clean(value) -> Optional[str]:
    """Coerce empty strings / 'null' to None so missing fields render cleanly."""
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() in {"null", "none", "n/a", "unknown"}:
        return None
    return text


def _to_item(data: dict) -> TicketItem:
    item_type = (_clean(data.get("item_type")) or "other").lower()
    if item_type not in ITEM_TYPES:
        item_type = "other"
    confidence = (_clean(data.get("confidence")) or "medium").lower()
    if confidence not in {"high", "medium", "low"}:
        confidence = "medium"

    title = _clean(data.get("title")) or _clean(data.get("provider")) or "Trip item"

    return TicketItem(
        item_type=item_type,
        title=title,
        confidence=confidence,
        provider=_clean(data.get("provider")),
        confirmation_number=_clean(data.get("confirmation_number")),
        passenger_name=_clean(data.get("passenger_name")),
        start_datetime=_clean(data.get("start_datetime")),
        end_datetime=_clean(data.get("end_datetime")),
        origin=_clean(data.get("origin")),
        destination=_clean(data.get("destination")),
        location=_clean(data.get("location")),
        seat=_clean(data.get("seat")),
        notes=_clean(data.get("notes")),
    )


def extract_ticket(file_bytes: bytes, media_type: str) -> ExtractionResult:
    """Extract one item from a ticket image/PDF.

    Synchronous (the Anthropic client is sync) — call via asyncio.to_thread from
    the bot so the event loop isn't blocked. Retries once on API error before
    giving up, so a transient failure never hangs the user.
    """
    block = _content_block(file_bytes, media_type)
    messages = [{"role": "user", "content": [block, {"type": "text", "text": EXTRACTION_PROMPT}]}]

    last_error: Optional[Exception] = None
    for attempt in (1, 2):
        try:
            response = _get_client().messages.create(
                model=MODEL,
                max_tokens=1024,
                tools=[TICKET_TOOL],
                tool_choice={"type": "tool", "name": "record_ticket"},
                messages=messages,
            )
            data = next(
                (b.input for b in response.content if b.type == "tool_use"), None
            )
            if data is None:
                logger.warning("No tool_use block in response; treating as not a ticket.")
                return ExtractionResult(status="not_ticket")

            if not data.get("is_ticket", False):
                return ExtractionResult(status="not_ticket")

            return ExtractionResult(status="ok", item=_to_item(data))

        except anthropic.APIError as exc:
            last_error = exc
            logger.warning("Extraction attempt %d failed: %s", attempt, exc)

    logger.error("Extraction failed after retries: %s", last_error)
    return ExtractionResult(status="error")
