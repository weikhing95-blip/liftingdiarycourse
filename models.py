"""Data model for an extracted trip item.

Only the *extracted fields* live here — never the raw ticket image (see the
Security hat in docs/BuildPlan.md: raw tickets are discarded after extraction).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

# Emoji per item type, used in the one-line confirmation and (later) the PDF.
TYPE_EMOJI = {
    "flight": "✈️",
    "train": "🚆",
    "bus": "🚌",
    "ferry": "⛴️",
    "hotel": "🏨",
    "car_rental": "🚗",
    "event": "🎫",
    "other": "📍",
}

# A datetime far in the future so items with an unknown start sort to the end.
_FAR_FUTURE = datetime.max


@dataclass
class TicketItem:
    """One extracted travel item (a flight, hotel night, train leg, …)."""

    item_type: str
    title: str
    confidence: str = "medium"  # "high" | "medium" | "low"
    provider: Optional[str] = None
    confirmation_number: Optional[str] = None
    passenger_name: Optional[str] = None
    start_datetime: Optional[str] = None  # ISO 8601 local, may be date-only
    end_datetime: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    location: Optional[str] = None
    seat: Optional[str] = None
    notes: Optional[str] = None

    @property
    def needs_review(self) -> bool:
        """Flag items that should be marked ⚠️ in the PDF (Phase 4)."""
        return self.confidence == "low" or self.start_datetime is None

    def sort_key(self) -> datetime:
        """Chronological sort key for Phase 3. Unknown start → far future."""
        return parse_iso(self.start_datetime) or _FAR_FUTURE

    def confirmation_line(self) -> str:
        """One-line confirmation, e.g. '✈️ Added: SQ806, SIN→NRT, 14 Mar 09:05'."""
        emoji = TYPE_EMOJI.get(self.item_type, "📍")
        label = self.title or self.provider or self.item_type

        bits = [label]
        if self.origin and self.destination:
            bits.append(f"{self.origin}→{self.destination}")
        elif self.location:
            bits.append(self.location)

        when = format_when(self.start_datetime)
        if when:
            bits.append(when)

        line = f"{emoji} Added: " + ", ".join(b for b in bits if b)
        if self.needs_review:
            line += "  ⚠️ (please double-check)"
        return line


def parse_iso(value: Optional[str]) -> Optional[datetime]:
    """Parse an ISO 8601 string that may be full, date-only, or have a 'Z'.

    Returns None if it can't be parsed — callers treat that as 'unknown time'.
    """
    if not value:
        return None
    text = value.strip().replace("Z", "+00:00")
    # Try full datetime first, then date-only.
    for parser in (datetime.fromisoformat,):
        try:
            return parser(text)
        except ValueError:
            pass
    try:
        return datetime.strptime(text[:10], "%Y-%m-%d")
    except ValueError:
        return None


def format_when(value: Optional[str]) -> Optional[str]:
    """Human-friendly date/time, e.g. '14 Mar 09:05' or '14 Mar' for date-only."""
    dt = parse_iso(value)
    if dt is None:
        return None
    if dt.hour or dt.minute:
        return dt.strftime("%d %b %H:%M")
    return dt.strftime("%d %b")
