"""Trip PDF synthesis (Phase 3).

`/done` gathers the session's items, sorts them chronologically, groups them by
day, and renders an HTML template -> PDF via WeasyPrint.

Design note: `render_html()` is a pure function (items -> HTML string) so the
sorting/grouping/templating can be tested without WeasyPrint's native stack.
`build_trip_pdf()` adds the one WeasyPrint call (imported lazily, since it needs
Pango/Cairo — present in the Docker image, see Dockerfile).
"""

from __future__ import annotations

import os
import re
from datetime import datetime
from typing import List, Optional, Tuple

from jinja2 import Environment, FileSystemLoader, select_autoescape

from models import TicketItem, format_when, parse_iso

_TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "templates")
_env = Environment(
    loader=FileSystemLoader(_TEMPLATE_DIR),
    autoescape=select_autoescape(["html"]),  # ticket text is untrusted — escape it
)


def _time_label(item: TicketItem) -> str:
    """Time-of-day for within-a-day display, e.g. '09:05' (empty if no time)."""
    dt = parse_iso(item.start_datetime)
    if dt and (dt.hour or dt.minute):
        return dt.strftime("%H:%M")
    return ""


def _rows(item: TicketItem) -> List[Tuple[str, str]]:
    """Detail rows for an item — only fields that are present render."""
    rows: List[Tuple[str, str]] = []
    if item.origin and item.destination:
        rows.append(("Route", f"{item.origin} → {item.destination}"))
    elif item.location:
        rows.append(("Location", item.location))
    if item.provider:
        rows.append(("Operator", item.provider))
    if item.end_datetime:
        label = "Check-out" if item.item_type == "hotel" else "Ends"
        ends = format_when(item.end_datetime)
        if ends:
            rows.append((label, ends))
    if item.seat:
        rows.append(("Seat", item.seat))
    if item.passenger_name:
        rows.append(("Passenger", item.passenger_name))
    if item.confirmation_number:
        rows.append(("Confirmation", item.confirmation_number))
    if item.notes:
        rows.append(("Notes", item.notes))
    return rows


def _item_vm(item: TicketItem) -> dict:
    from models import TYPE_EMOJI

    return {
        "emoji": TYPE_EMOJI.get(item.item_type, "📍"),
        "type": item.item_type.replace("_", " "),
        "title": item.title,
        "time": _time_label(item),
        "needs_review": item.needs_review,
        "rows": _rows(item),
    }


def _organize(items: List[TicketItem]) -> List[dict]:
    """Sort chronologically and group into day buckets (unknown dates last)."""
    ordered = sorted(items, key=lambda i: i.sort_key())

    groups: List[dict] = []
    by_label: dict[str, dict] = {}
    unscheduled = {"label": "To confirm (no date found)", "items": []}

    for item in ordered:
        dt = parse_iso(item.start_datetime)
        if dt is None:
            unscheduled["items"].append(_item_vm(item))
            continue
        label = dt.strftime("%A, %d %b %Y")  # e.g. "Saturday, 14 Mar 2026"
        group = by_label.get(label)
        if group is None:
            group = {"label": label, "items": []}
            by_label[label] = group
            groups.append(group)
        group["items"].append(_item_vm(item))

    if unscheduled["items"]:
        groups.append(unscheduled)
    return groups


def _format_range(a: datetime, b: datetime) -> str:
    if a.date() == b.date():
        return a.strftime("%-d %b %Y")
    if a.year == b.year and a.month == b.month:
        return f"{a.strftime('%-d')}–{b.strftime('%-d %b %Y')}"
    if a.year == b.year:
        return f"{a.strftime('%-d %b')} – {b.strftime('%-d %b %Y')}"
    return f"{a.strftime('%-d %b %Y')} – {b.strftime('%-d %b %Y')}"


def _trip_meta(items: List[TicketItem]) -> Tuple[str, Optional[str]]:
    """Headline destination + date range for the PDF header."""
    ordered = sorted(items, key=lambda i: i.sort_key())

    # The headline destination is the last *dated* stop — undated items sort to
    # the end but shouldn't hijack the title. Fall back to any item if none are
    # dated.
    dated = [i for i in ordered if parse_iso(i.start_datetime) is not None]
    candidates = dated or ordered

    title = "Your Trip"
    for item in reversed(candidates):
        if item.destination:
            title = item.destination
            break
        if item.location:
            title = item.location
            break

    known = [
        d
        for item in items
        for d in (parse_iso(item.start_datetime), parse_iso(item.end_datetime))
        if d is not None
    ]
    date_range = _format_range(min(known), max(known)) if known else None
    return title, date_range


def render_html(items: List[TicketItem]) -> str:
    """Pure: items -> rendered HTML string (no WeasyPrint needed)."""
    title, date_range = _trip_meta(items)
    template = _env.get_template("trip.html")
    return template.render(
        trip_title=title,
        date_range=date_range,
        day_groups=_organize(items),
        item_count=len(items),
    )


def _slug(text: str) -> str:
    text = re.sub(r"[^\w]+", "-", text.lower()).strip("-")
    return text or "trip"


def build_trip_pdf(items: List[TicketItem]) -> Tuple[bytes, str]:
    """Render the trip PDF; returns (pdf_bytes, suggested_filename)."""
    html = render_html(items)
    # Lazy import: WeasyPrint needs native libs (Pango/Cairo) — see Dockerfile.
    from weasyprint import HTML

    pdf_bytes = HTML(string=html).write_pdf()
    title, _ = _trip_meta(items)
    return pdf_bytes, f"{_slug(title)}-trip.pdf"
