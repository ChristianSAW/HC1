"""Local SQLite knowledge store with FTS5 message index."""

import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

from src.readers.imessage import Message


DEFAULT_DB_PATH = Path.home() / ".hc1" / "knowledge.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS persons (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    handle_id   TEXT    NOT NULL UNIQUE,
    display_name TEXT   NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS message_chunks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    rowid_src   INTEGER NOT NULL,
    handle_id   TEXT,
    person_id   INTEGER REFERENCES persons(id),
    is_from_me  INTEGER NOT NULL DEFAULT 0,
    sent_at     TEXT    NOT NULL,
    chat_id     INTEGER,
    service     TEXT,
    content     TEXT    NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS message_chunks_fts USING fts5(
    content,
    handle_id UNINDEXED,
    sent_at   UNINDEXED,
    is_from_me UNINDEXED,
    content='message_chunks',
    content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS message_chunks_ai AFTER INSERT ON message_chunks BEGIN
    INSERT INTO message_chunks_fts(rowid, content, handle_id, sent_at, is_from_me)
    VALUES (new.id, new.content, new.handle_id, new.sent_at, new.is_from_me);
END;

CREATE TRIGGER IF NOT EXISTS message_chunks_ad AFTER DELETE ON message_chunks BEGIN
    INSERT INTO message_chunks_fts(message_chunks_fts, rowid, content, handle_id, sent_at, is_from_me)
    VALUES ('delete', old.id, old.content, old.handle_id, old.sent_at, old.is_from_me);
END;

CREATE TABLE IF NOT EXISTS ingestion_state (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


class KnowledgeStore:
    """Stores indexed messages and supports FTS5 search."""

    def __init__(self, db_path: Optional[Path] = None) -> None:
        self.db_path = Path(os.environ.get("HC1_DB_PATH", "") or db_path or DEFAULT_DB_PATH)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn: Optional[sqlite3.Connection] = None

    def _get_conn(self) -> sqlite3.Connection:
        if self._conn is None:
            self._conn = sqlite3.connect(self.db_path)
            self._conn.row_factory = sqlite3.Row
            self._conn.executescript(SCHEMA)
            self._conn.commit()
        return self._conn

    def close(self) -> None:
        if self._conn:
            self._conn.close()
            self._conn = None

    # ------------------------------------------------------------------
    # Person registry
    # ------------------------------------------------------------------

    def upsert_person(self, handle_id: str, display_name: str) -> int:
        """Insert or update a person record. Returns person id."""
        conn = self._get_conn()
        conn.execute(
            """
            INSERT INTO persons (handle_id, display_name)
            VALUES (?, ?)
            ON CONFLICT(handle_id) DO UPDATE SET display_name=excluded.display_name
            """,
            (handle_id, display_name),
        )
        conn.commit()
        row = conn.execute("SELECT id FROM persons WHERE handle_id = ?", (handle_id,)).fetchone()
        return row["id"]

    # ------------------------------------------------------------------
    # Message indexing
    # ------------------------------------------------------------------

    def get_last_ingested_rowid(self) -> int:
        """Return the highest source rowid already ingested (0 if none)."""
        conn = self._get_conn()
        row = conn.execute(
            "SELECT value FROM ingestion_state WHERE key = 'last_rowid'"
        ).fetchone()
        return int(row["value"]) if row else 0

    def set_last_ingested_rowid(self, rowid: int) -> None:
        conn = self._get_conn()
        conn.execute(
            "INSERT INTO ingestion_state (key, value) VALUES ('last_rowid', ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (str(rowid),),
        )
        conn.commit()

    def index_messages(
        self,
        messages: list[Message],
        handle_names: Optional[dict[str, str]] = None,
    ) -> int:
        """Index a list of messages. Returns count of newly inserted rows."""
        if not messages:
            return 0

        handle_names = handle_names or {}
        conn = self._get_conn()

        # Ensure persons exist
        person_ids: dict[str, int] = {}
        for msg in messages:
            if msg.handle_id is not None:
                handle_str = str(msg.handle_id)
                if handle_str not in person_ids:
                    name = handle_names.get(handle_str, handle_str)
                    pid = self.upsert_person(handle_str, name)
                    person_ids[handle_str] = pid

        # Bulk insert message chunks (skip already-indexed rowids)
        existing_rowids: set[int] = set(
            r[0]
            for r in conn.execute("SELECT rowid_src FROM message_chunks").fetchall()
        )

        rows_to_insert = []
        for msg in messages:
            if msg.rowid in existing_rowids:
                continue
            if not msg.text:
                continue
            handle_str = str(msg.handle_id) if msg.handle_id else None
            pid = person_ids.get(handle_str) if handle_str else None
            rows_to_insert.append(
                (
                    msg.rowid,
                    handle_str,
                    pid,
                    int(msg.is_from_me),
                    msg.date.isoformat(),
                    msg.chat_id,
                    msg.service,
                    msg.text,
                )
            )

        if rows_to_insert:
            conn.executemany(
                """
                INSERT INTO message_chunks
                    (rowid_src, handle_id, person_id, is_from_me, sent_at, chat_id, service, content)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                rows_to_insert,
            )
            conn.commit()

        return len(rows_to_insert)

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def search(self, query: str, limit: int = 20) -> list[dict]:
        """Full-text search over message content. Returns list of result dicts."""
        conn = self._get_conn()
        rows = conn.execute(
            """
            SELECT
                mc.content,
                mc.handle_id,
                mc.sent_at,
                mc.is_from_me,
                p.display_name
            FROM message_chunks_fts fts
            JOIN message_chunks mc ON mc.id = fts.rowid
            LEFT JOIN persons p ON p.id = mc.person_id
            WHERE message_chunks_fts MATCH ?
            ORDER BY rank
            LIMIT ?
            """,
            (query, limit),
        ).fetchall()

        return [
            {
                "content": r["content"],
                "handle_id": r["handle_id"],
                "display_name": r["display_name"] or r["handle_id"] or "Me",
                "sent_at": r["sent_at"],
                "is_from_me": bool(r["is_from_me"]),
            }
            for r in rows
        ]

    def recent_messages(self, limit: int = 50) -> list[dict]:
        """Return the most recent messages."""
        conn = self._get_conn()
        rows = conn.execute(
            """
            SELECT
                mc.content,
                mc.handle_id,
                mc.sent_at,
                mc.is_from_me,
                p.display_name
            FROM message_chunks mc
            LEFT JOIN persons p ON p.id = mc.person_id
            ORDER BY mc.sent_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [
            {
                "content": r["content"],
                "handle_id": r["handle_id"],
                "display_name": r["display_name"] or r["handle_id"] or "Me",
                "sent_at": r["sent_at"],
                "is_from_me": bool(r["is_from_me"]),
            }
            for r in rows
        ]

    def message_count(self) -> int:
        conn = self._get_conn()
        return conn.execute("SELECT COUNT(*) FROM message_chunks").fetchone()[0]
