# Phase 0 — iMessage Reader + Basic LLM Query CLI

## Goal

Build a working CLI that:
1. Reads the user's iMessage database (`~/Library/Messages/chat.db`)
2. Resolves contact identities from macOS Contacts
3. Indexes messages into a local SQLite knowledge store with FTS5
4. Answers natural language questions via Claude API

## Deliverables

| Deliverable | Status | File(s) |
|-------------|--------|---------|
| iMessage reader with `attributedBody` decoding | ✅ Done | `src/readers/imessage.py` |
| Contact name resolver (AddressBook + AppleScript fallback) | ✅ Done | `src/contacts/resolver.py` |
| Local SQLite knowledge store with FTS5 | ✅ Done | `src/db/knowledge_store.py` |
| Query engine (FTS retrieval → Claude synthesis) | ✅ Done | `src/query/engine.py` |
| CLI (`hc1 ingest`, `hc1 ask`, `hc1 stats`) | ✅ Done | `src/cli.py` |
| Unit tests | ✅ Done | `tests/readers/`, `tests/contacts/` |

## Setup

```bash
cd HC1
pip install -e .
export ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

```bash
# Index your iMessage history (run once, then periodically)
hc1 ingest

# Ask a one-shot question
hc1 ask "What food does Sarah like?"
hc1 ask "Who have I texted most this month?"
hc1 ask "Did anyone mention a birthday recently?"

# Interactive Q&A session
hc1 ask --interactive

# Show stats
hc1 stats
```

## Architecture

```
chat.db (SQLite)
    ↓
IMessageReader
  - reads message.text (modern macOS: attributedBody blob)
  - decodes NSArchiver typedstream → plain UTF-8
    ↓
ContactResolver
  - reads AddressBook SQLite: phone/email → display name
  - AppleScript fallback for live lookup
    ↓
KnowledgeStore (SQLite + FTS5)
  - message_chunks table → indexed by content
  - FTS5 virtual table for fast text search
    ↓
QueryEngine
  - FTS5 search for relevant messages
  - Recent messages for temporal queries
  - Claude Haiku synthesis
    ↓
CLI output
```

## Key Technical Decisions

### attributedBody Decoding

In macOS Ventura and later, message text is stored as an NSArchiver binary blob
in the `attributedBody` column rather than the plain-text `text` column.

The decoder (`decode_attributed_body`) scans the typedstream for counted string
segments (0x01 length-prefix encoding) and returns the longest valid UTF-8 match.
Falls back to ASCII printable-run extraction if the counted-string scan finds
nothing.

### Contact Resolution

Two-tier approach:
1. **Direct SQLite read** from `AddressBook-v22.abcddb` — fast, works offline,
   reads all phones + emails for all contacts at startup.
2. **osascript fallback** — live Contacts.app query for handles not found in the
   SQLite snapshot (e.g., contacts added after last Address Book cache flush).

### Query Engine

Phase 0 uses SQLite FTS5 rather than vector embeddings. This is sufficient for
keyword-based retrieval and avoids the `sentence-transformers` dependency (which
requires ~500 MB of model weights). Embeddings are planned for Phase 1.

Temporal questions ("recently", "last week") also pull the 20 most recent
messages regardless of keyword match.

### Claude Model

Uses `claude-haiku-4-5-20251001` for cost efficiency (~$0.001/query at typical
message context sizes). Swap to `claude-sonnet-4-6` in `src/query/engine.py` for
higher-quality synthesis if needed.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `IMESSAGE_DB_PATH` | `~/Library/Messages/chat.db` | Path to iMessage database |
| `HC1_DB_PATH` | `~/.hc1/knowledge.db` | Path to knowledge store |
| `ANTHROPIC_API_KEY` | (required) | Anthropic API key |

## Known Limitations

- Requires Full Disk Access permission for Terminal / Python to read `chat.db`
- attributedBody decoder covers the common NSArchiver format; edge cases
  (RTL text, special attachment markers) may return `None` for text
- FTS5 search is keyword-based — typos and paraphrasing won't match
- No incremental ingest yet (every `hc1 ingest` skips already-indexed rows by
  `rowid_src`, so re-running is safe but reads the full chat.db each time)

## Next Steps (Phase 1)

- Two-pass extraction pipeline: lightweight flag → structured knowledge extraction
- Per-person knowledge profiles (preferences, plans, life events)
- Gmail OAuth ingestion
- Apple Photos face/scene integration
- Vector embeddings for semantic search
- Mac app shell (SwiftUI or Electron)
