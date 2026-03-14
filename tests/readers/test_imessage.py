"""Unit tests for the iMessage reader."""

import sqlite3
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import pytest

from src.readers.imessage import (
    APPLE_EPOCH_OFFSET,
    IMessageReader,
    Message,
    decode_attributed_body,
)


# ---------------------------------------------------------------------------
# decode_attributed_body tests
# ---------------------------------------------------------------------------


def test_decode_attributed_body_returns_none_for_empty():
    assert decode_attributed_body(b"") is None


def test_decode_attributed_body_returns_none_for_bad_header():
    assert decode_attributed_body(b"\x00\x00garbage") is None


def test_decode_attributed_body_valid_header_no_text():
    # Valid header but no string content — should return None or empty
    blob = b"\x04\x0bstreamtyped\x00\x00\x00"
    result = decode_attributed_body(blob)
    # Either None or empty string is acceptable
    assert result is None or result == ""


def test_decode_attributed_body_with_embedded_string():
    """Synthesize a minimal blob containing a counted string."""
    text = "Hello, world!"
    encoded = text.encode("utf-8")
    length_bytes = len(encoded).to_bytes(2, "big")
    # Construct: header + 0x01 + length (2 bytes) + string
    blob = b"\x04\x0bstreamtyped" + b"\x01" + length_bytes + encoded
    result = decode_attributed_body(blob)
    assert result == text


# ---------------------------------------------------------------------------
# IMessageReader tests (using an in-memory fake chat.db)
# ---------------------------------------------------------------------------


def _make_fake_db(path: Path) -> None:
    """Create a minimal chat.db-like SQLite file for testing."""
    conn = sqlite3.connect(path)
    conn.executescript("""
        CREATE TABLE handle (
            ROWID INTEGER PRIMARY KEY,
            id TEXT NOT NULL,
            service TEXT DEFAULT 'iMessage',
            uncanonicalized_id TEXT
        );
        CREATE TABLE chat (
            ROWID INTEGER PRIMARY KEY,
            guid TEXT NOT NULL,
            display_name TEXT,
            chat_identifier TEXT NOT NULL
        );
        CREATE TABLE message (
            ROWID INTEGER PRIMARY KEY,
            guid TEXT NOT NULL,
            handle_id INTEGER DEFAULT 0,
            text TEXT,
            attributedBody BLOB,
            date INTEGER DEFAULT 0,
            is_from_me INTEGER DEFAULT 0,
            service TEXT DEFAULT 'iMessage'
        );
        CREATE TABLE chat_message_join (
            chat_id INTEGER,
            message_id INTEGER
        );
        CREATE TABLE chat_handle_join (
            chat_id INTEGER,
            handle_id INTEGER
        );
    """)

    # Insert test data
    apple_ts = int((datetime(2024, 6, 1, 12, 0, 0, tzinfo=timezone.utc).timestamp() - APPLE_EPOCH_OFFSET) * 1_000_000_000)
    conn.execute("INSERT INTO handle VALUES (1, '+15551234567', 'iMessage', NULL)")
    conn.execute("INSERT INTO chat VALUES (1, 'chat-guid-1', NULL, '+15551234567')")
    conn.execute(f"INSERT INTO message VALUES (1, 'msg-guid-1', 1, 'Hey there!', NULL, {apple_ts}, 0, 'iMessage')")
    conn.execute("INSERT INTO message VALUES (2, 'msg-guid-2', 0, 'Hello back!', NULL, ?, 1, 'iMessage')",
                 [apple_ts + 1_000_000_000])
    conn.execute("INSERT INTO chat_message_join VALUES (1, 1)")
    conn.execute("INSERT INTO chat_message_join VALUES (1, 2)")
    conn.execute("INSERT INTO chat_handle_join VALUES (1, 1)")
    conn.commit()
    conn.close()


@pytest.fixture
def fake_db(tmp_path: Path) -> Path:
    db_path = tmp_path / "chat.db"
    _make_fake_db(db_path)
    return db_path


def test_get_handles(fake_db: Path):
    reader = IMessageReader(db_path=fake_db)
    handles = reader.get_handles()
    assert len(handles) == 1
    assert handles[0].id == "+15551234567"
    assert handles[0].service == "iMessage"


def test_get_chats(fake_db: Path):
    reader = IMessageReader(db_path=fake_db)
    chats = reader.get_chats()
    assert len(chats) == 1
    assert chats[0].chat_identifier == "+15551234567"
    assert 1 in chats[0].handle_ids


def test_get_messages(fake_db: Path):
    reader = IMessageReader(db_path=fake_db)
    messages = list(reader.get_messages())
    assert len(messages) == 2

    incoming = messages[0]
    assert incoming.text == "Hey there!"
    assert incoming.is_from_me is False
    assert incoming.handle_id == 1

    outgoing = messages[1]
    assert outgoing.text == "Hello back!"
    assert outgoing.is_from_me is True
    assert outgoing.handle_id is None


def test_count_messages(fake_db: Path):
    reader = IMessageReader(db_path=fake_db)
    assert reader.count_messages() == 2


def test_missing_db_raises():
    reader = IMessageReader(db_path=Path("/nonexistent/chat.db"))
    with pytest.raises(FileNotFoundError):
        list(reader.get_messages())


def test_messages_with_limit(fake_db: Path):
    reader = IMessageReader(db_path=fake_db)
    messages = list(reader.get_messages(limit=1))
    assert len(messages) == 1


def test_message_date_conversion(fake_db: Path):
    reader = IMessageReader(db_path=fake_db)
    messages = list(reader.get_messages())
    dt = messages[0].date
    assert dt.year == 2024
    assert dt.month == 6
    assert dt.day == 1
    assert dt.tzinfo == timezone.utc
