"""Contact name resolver: maps iMessage handle IDs to display names."""

import glob
import re
import sqlite3
import subprocess
from pathlib import Path
from typing import Optional


_ADDRESSBOOK_GLOB = str(
    Path.home() / "Library" / "Application Support" / "AddressBook" / "Sources" / "*" / "AddressBook-v22.abcddb"
)


def _normalize_phone(raw: str) -> str:
    """Strip all non-digit characters and leading country code variations."""
    digits = re.sub(r"\D", "", raw)
    # Normalize to 10-digit US numbers (strip leading 1)
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    return digits


def _load_addressbook_db(db_path: str) -> dict[str, str]:
    """Read an AddressBook SQLite database and return phone/email → display name map."""
    mapping: dict[str, str] = {}
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row

        # Fetch all contacts with first + last name
        people: dict[int, str] = {}
        for row in conn.execute(
            "SELECT ROWID, ZFIRSTNAME, ZLASTNAME, ZNICKNAME, ZORGANIZATION FROM ZABCDRECORD"
        ).fetchall():
            parts = []
            if row["ZFIRSTNAME"]:
                parts.append(row["ZFIRSTNAME"])
            if row["ZLASTNAME"]:
                parts.append(row["ZLASTNAME"])
            name = " ".join(parts).strip() or row["ZNICKNAME"] or row["ZORGANIZATION"] or ""
            if name:
                people[row["ROWID"]] = name

        # Phone numbers
        for row in conn.execute(
            "SELECT ZOWNER, ZFULLNUMBER FROM ZABCDPHONENUMBER"
        ).fetchall():
            if row["ZOWNER"] in people and row["ZFULLNUMBER"]:
                normalized = _normalize_phone(row["ZFULLNUMBER"])
                if normalized:
                    mapping[normalized] = people[row["ZOWNER"]]
                # Also store original form
                mapping[row["ZFULLNUMBER"].strip()] = people[row["ZOWNER"]]

        # Email addresses
        for row in conn.execute(
            "SELECT ZOWNER, ZADDRESS FROM ZABCDEMAILADDRESS"
        ).fetchall():
            if row["ZOWNER"] in people and row["ZADDRESS"]:
                mapping[row["ZADDRESS"].strip().lower()] = people[row["ZOWNER"]]

        conn.close()
    except Exception:
        pass

    return mapping


def _osascript_lookup(handle_id: str) -> Optional[str]:
    """Fall back to AppleScript to look up a contact name."""
    script = f"""
    tell application "Contacts"
        set matchPeople to every person whose value of phones contains "{handle_id}" ¬
            or value of emails contains "{handle_id}"
        if length of matchPeople > 0 then
            return name of item 1 of matchPeople
        end if
    end tell
    """
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            timeout=5,
        )
        name = result.stdout.strip()
        if name and name != "missing value":
            return name
    except Exception:
        pass
    return None


class ContactResolver:
    """Resolves iMessage handle IDs (phone numbers / emails) to display names."""

    def __init__(self) -> None:
        self._mapping: dict[str, str] = {}
        self._loaded = False

    def _ensure_loaded(self) -> None:
        if self._loaded:
            return
        for db_path in glob.glob(_ADDRESSBOOK_GLOB):
            self._mapping.update(_load_addressbook_db(db_path))
        self._loaded = True

    def resolve(self, handle_id: str) -> str:
        """Return display name for the given handle ID, or the raw handle_id as fallback."""
        self._ensure_loaded()

        # Try direct lookup first
        if handle_id in self._mapping:
            return self._mapping[handle_id]

        # Try lowercase (for emails)
        lower = handle_id.lower()
        if lower in self._mapping:
            return self._mapping[lower]

        # Try normalized phone
        normalized = _normalize_phone(handle_id)
        if normalized and normalized in self._mapping:
            return self._mapping[normalized]

        # AppleScript fallback
        name = _osascript_lookup(handle_id)
        if name:
            self._mapping[handle_id] = name
            return name

        return handle_id

    def resolve_all(self, handle_ids: list[str]) -> dict[str, str]:
        """Resolve a list of handle IDs, returning a mapping of handle → name."""
        return {h: self.resolve(h) for h in handle_ids}
