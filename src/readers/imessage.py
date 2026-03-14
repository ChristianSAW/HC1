"""iMessage chat.db reader with attributedBody decoding."""

import os
import sqlite3
import struct
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator, Optional


DEFAULT_DB_PATH = Path.home() / "Library" / "Messages" / "chat.db"

# Apple's epoch starts at 2001-01-01 00:00:00 UTC
APPLE_EPOCH_OFFSET = 978307200


@dataclass
class Handle:
    rowid: int
    id: str  # phone number or email
    service: str
    uncanonicalized_id: Optional[str] = None


@dataclass
class Chat:
    rowid: int
    guid: str
    display_name: Optional[str]
    chat_identifier: str
    handle_ids: list[int] = field(default_factory=list)


@dataclass
class Message:
    rowid: int
    guid: str
    handle_id: Optional[int]
    text: Optional[str]
    date: datetime
    is_from_me: bool
    chat_id: Optional[int] = None
    service: str = "iMessage"


def decode_attributed_body(blob: bytes) -> Optional[str]:
    """Decode an NSArchiver-encoded attributedBody blob to plain text.

    The blob is a typedstream (NSArchiver binary format). We scan for the
    embedded UTF-8 string by looking for the streamtyped header and then
    locating the string content.
    """
    if not blob:
        return None

    # Validate typedstream header
    header = b"\x04\x0bstreamtyped"
    if not blob.startswith(header):
        return None

    # Strategy: scan for NSString content embedded in the typedstream.
    # The pattern is: a length byte followed by the actual UTF-8 string data.
    # We look for i+ or NSString marker, then extract the string.

    # Walk through looking for string segments
    # NSArchiver stores NSAttributedString with embedded NSString
    # The string content is usually preceded by a \x01 length indicator
    # and appears after the class type markers

    try:
        # Try to find the string by scanning for a plausible text region.
        # The text is stored as a sequence: type-tag, length (big-endian), string bytes.
        # We look for the pattern where a short byte signals a counted string.

        i = len(header)
        best: Optional[str] = None

        while i < len(blob) - 2:
            # Look for a counted string marker (0x01 = "this is a string value")
            # followed by a 2-byte or 4-byte big-endian length
            if blob[i] == 0x01 and i + 3 < len(blob):
                length = struct.unpack_from(">H", blob, i + 1)[0]
                if 1 <= length <= 10000 and i + 3 + length <= len(blob):
                    candidate = blob[i + 3 : i + 3 + length]
                    try:
                        text = candidate.decode("utf-8")
                        # Prefer longer, printable strings
                        if len(text) > len(best or ""):
                            best = text
                    except UnicodeDecodeError:
                        pass
            i += 1

        if best:
            return best

        # Fallback: extract all printable ASCII/UTF-8 runs of length >= 4
        # and return the longest one that isn't a class name.
        # Start scanning after the header to avoid returning header bytes.
        class_names = {
            "NSMutableAttributedString",
            "NSAttributedString",
            "NSString",
            "NSObject",
            "NSColor",
            "streamtyped",
        }
        runs: list[str] = []
        run_start: int = -1
        i = len(header)  # skip header
        while i < len(blob):
            b = blob[i]
            if 0x20 <= b < 0x7F:
                if run_start < 0:
                    run_start = i
            else:
                if run_start >= 0 and i - run_start >= 4:
                    run = blob[run_start:i].decode("ascii", errors="ignore")
                    if run not in class_names and not run.startswith("NS"):
                        runs.append(run)
                run_start = -1
            i += 1
        # Handle run ending at EOF
        if run_start >= 0 and len(blob) - run_start >= 4:
            run = blob[run_start:].decode("ascii", errors="ignore")
            if run not in class_names and not run.startswith("NS"):
                runs.append(run)

        if runs:
            return max(runs, key=len)

    except Exception:
        pass

    return None


class IMessageReader:
    """Reads messages from the macOS iMessage chat.db SQLite database."""

    def __init__(self, db_path: Optional[Path] = None) -> None:
        self.db_path = Path(os.environ.get("IMESSAGE_DB_PATH", "") or db_path or DEFAULT_DB_PATH)

    def _connect(self) -> sqlite3.Connection:
        if not self.db_path.exists():
            raise FileNotFoundError(f"iMessage database not found at {self.db_path}")
        conn = sqlite3.connect(f"file:{self.db_path}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        return conn

    def get_handles(self) -> list[Handle]:
        """Return all handles (contacts) in the database."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT ROWID, id, service, uncanonicalized_id FROM handle ORDER BY ROWID"
            ).fetchall()
        return [
            Handle(
                rowid=r["ROWID"],
                id=r["id"],
                service=r["service"],
                uncanonicalized_id=r["uncanonicalized_id"],
            )
            for r in rows
        ]

    def get_chats(self) -> list[Chat]:
        """Return all chats with their associated handle IDs."""
        with self._connect() as conn:
            chat_rows = conn.execute(
                "SELECT ROWID, guid, display_name, chat_identifier FROM chat ORDER BY ROWID"
            ).fetchall()
            handle_map: dict[int, list[int]] = {}
            for row in conn.execute(
                "SELECT chat_id, handle_id FROM chat_handle_join ORDER BY chat_id"
            ).fetchall():
                handle_map.setdefault(row["chat_id"], []).append(row["handle_id"])

        chats = []
        for r in chat_rows:
            chats.append(
                Chat(
                    rowid=r["ROWID"],
                    guid=r["guid"],
                    display_name=r["display_name"] or None,
                    chat_identifier=r["chat_identifier"],
                    handle_ids=handle_map.get(r["ROWID"], []),
                )
            )
        return chats

    def get_messages(
        self,
        limit: Optional[int] = None,
        since: Optional[datetime] = None,
    ) -> Iterator[Message]:
        """Yield messages ordered by date ascending.

        Args:
            limit: Maximum number of messages to return.
            since: Only return messages after this datetime (UTC).
        """
        where_clauses = []
        params: list = []

        if since is not None:
            apple_ts = (since.timestamp() - APPLE_EPOCH_OFFSET) * 1_000_000_000
            where_clauses.append("m.date > ?")
            params.append(int(apple_ts))

        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        limit_sql = f"LIMIT {int(limit)}" if limit else ""

        query = f"""
            SELECT
                m.ROWID,
                m.guid,
                m.handle_id,
                m.text,
                m.attributedBody,
                m.date,
                m.is_from_me,
                m.service,
                cmj.chat_id
            FROM message m
            LEFT JOIN chat_message_join cmj ON cmj.message_id = m.ROWID
            {where_sql}
            ORDER BY m.date ASC
            {limit_sql}
        """

        with self._connect() as conn:
            for row in conn.execute(query, params):
                text = row["text"]
                if not text and row["attributedBody"]:
                    text = decode_attributed_body(bytes(row["attributedBody"]))

                # Convert Apple nanosecond timestamp to UTC datetime
                apple_ns = row["date"] or 0
                ts = apple_ns / 1_000_000_000 + APPLE_EPOCH_OFFSET
                dt = datetime.fromtimestamp(ts, tz=timezone.utc)

                yield Message(
                    rowid=row["ROWID"],
                    guid=row["guid"],
                    handle_id=row["handle_id"] or None,
                    text=text or None,
                    date=dt,
                    is_from_me=bool(row["is_from_me"]),
                    chat_id=row["chat_id"],
                    service=row["service"] or "iMessage",
                )

    def count_messages(self) -> int:
        """Return total message count."""
        with self._connect() as conn:
            return conn.execute("SELECT COUNT(*) FROM message").fetchone()[0]
