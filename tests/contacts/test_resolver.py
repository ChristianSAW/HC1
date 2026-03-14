"""Unit tests for the contact resolver."""

import sqlite3
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from src.contacts.resolver import ContactResolver, _normalize_phone


# ---------------------------------------------------------------------------
# Phone normalization tests
# ---------------------------------------------------------------------------


def test_normalize_us_with_country_code():
    assert _normalize_phone("+16075551234") == "6075551234"


def test_normalize_us_without_country_code():
    assert _normalize_phone("6075551234") == "6075551234"


def test_normalize_us_formatted():
    assert _normalize_phone("(607) 555-1234") == "6075551234"


def test_normalize_us_dashes():
    assert _normalize_phone("607-555-1234") == "6075551234"


def test_normalize_email_unchanged():
    # Emails contain @ which is stripped — result is just digits
    # _normalize_phone is only used for phones; emails are looked up differently
    assert _normalize_phone("sarah@example.com") == ""


# ---------------------------------------------------------------------------
# ContactResolver tests
# ---------------------------------------------------------------------------


def _make_fake_addressbook(path: Path) -> None:
    """Create a minimal AddressBook SQLite db."""
    conn = sqlite3.connect(path)
    conn.executescript("""
        CREATE TABLE ZABCDRECORD (
            ROWID INTEGER PRIMARY KEY,
            ZFIRSTNAME TEXT,
            ZLASTNAME TEXT,
            ZNICKNAME TEXT,
            ZORGANIZATION TEXT
        );
        CREATE TABLE ZABCDPHONENUMBER (
            ROWID INTEGER PRIMARY KEY,
            ZOWNER INTEGER,
            ZFULLNUMBER TEXT
        );
        CREATE TABLE ZABCDEMAILADDRESS (
            ROWID INTEGER PRIMARY KEY,
            ZOWNER INTEGER,
            ZADDRESS TEXT
        );
    """)
    conn.execute("INSERT INTO ZABCDRECORD VALUES (1, 'Sarah', 'Chen', NULL, NULL)")
    conn.execute("INSERT INTO ZABCDRECORD VALUES (2, 'Jake', 'Kim', NULL, NULL)")
    conn.execute("INSERT INTO ZABCDRECORD VALUES (3, NULL, NULL, NULL, 'Acme Corp')")
    conn.execute("INSERT INTO ZABCDPHONENUMBER VALUES (1, 1, '+16075551234')")
    conn.execute("INSERT INTO ZABCDPHONENUMBER VALUES (2, 2, '(212) 555-9876')")
    conn.execute("INSERT INTO ZABCDEMAILADDRESS VALUES (1, 1, 'sarah.chen@gmail.com')")
    conn.execute("INSERT INTO ZABCDEMAILADDRESS VALUES (2, 3, 'info@acme.com')")
    conn.commit()
    conn.close()


@pytest.fixture
def resolver_with_fake_addressbook(tmp_path: Path) -> ContactResolver:
    db_path = tmp_path / "AddressBook-v22.abcddb"
    _make_fake_addressbook(db_path)

    from src.contacts import resolver as resolver_module

    original_glob = resolver_module._ADDRESSBOOK_GLOB
    resolver_module._ADDRESSBOOK_GLOB = str(db_path)

    r = ContactResolver()
    yield r

    resolver_module._ADDRESSBOOK_GLOB = original_glob


def test_resolve_phone_with_country_code(resolver_with_fake_addressbook: ContactResolver):
    name = resolver_with_fake_addressbook.resolve("+16075551234")
    assert name == "Sarah Chen"


def test_resolve_normalized_phone(resolver_with_fake_addressbook: ContactResolver):
    name = resolver_with_fake_addressbook.resolve("6075551234")
    assert name == "Sarah Chen"


def test_resolve_formatted_phone(resolver_with_fake_addressbook: ContactResolver):
    name = resolver_with_fake_addressbook.resolve("2125559876")
    assert name == "Jake Kim"


def test_resolve_email(resolver_with_fake_addressbook: ContactResolver):
    name = resolver_with_fake_addressbook.resolve("sarah.chen@gmail.com")
    assert name == "Sarah Chen"


def test_resolve_email_case_insensitive(resolver_with_fake_addressbook: ContactResolver):
    name = resolver_with_fake_addressbook.resolve("Sarah.Chen@Gmail.COM")
    assert name == "Sarah Chen"


def test_resolve_organization_email(resolver_with_fake_addressbook: ContactResolver):
    name = resolver_with_fake_addressbook.resolve("info@acme.com")
    assert name == "Acme Corp"


def test_resolve_unknown_handle_returns_handle(resolver_with_fake_addressbook: ContactResolver):
    # Unknown handle — osascript fallback will also fail in test env
    with patch("src.contacts.resolver._osascript_lookup", return_value=None):
        name = resolver_with_fake_addressbook.resolve("+19999999999")
    assert name == "+19999999999"


def test_resolve_all(resolver_with_fake_addressbook: ContactResolver):
    result = resolver_with_fake_addressbook.resolve_all(["+16075551234", "sarah.chen@gmail.com"])
    assert result["+16075551234"] == "Sarah Chen"
    assert result["sarah.chen@gmail.com"] == "Sarah Chen"
