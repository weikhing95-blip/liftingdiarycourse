"""In-memory session store, keyed by Telegram user ID.

Per the Engineering hat in docs/BuildPlan.md: a simple in-memory dict for the
MVP. A process restart clears everything — accepted for now. Only extracted
fields are held here; raw images never reach this module.
"""

from __future__ import annotations

from typing import Dict, List

from models import TicketItem

# user_id -> list of items collected since their last /done or /reset.
_sessions: Dict[int, List[TicketItem]] = {}


def add_item(user_id: int, item: TicketItem) -> int:
    """Append an item to the user's session; return the new item count."""
    items = _sessions.setdefault(user_id, [])
    items.append(item)
    return len(items)


def get_items(user_id: int) -> List[TicketItem]:
    """Return a copy of the user's items (empty list if none)."""
    return list(_sessions.get(user_id, []))


def count(user_id: int) -> int:
    return len(_sessions.get(user_id, []))


def clear(user_id: int) -> None:
    """Drop the user's session (after PDF delivery, or on /reset)."""
    _sessions.pop(user_id, None)
