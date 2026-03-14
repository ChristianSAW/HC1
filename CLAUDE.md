# Tribal — Claude Configuration

## Project Overview
Workspace containing the HC1 project (`./HC1`), tracked at https://github.com/ChristianSAW/HC1.

## Key Directories
- `HC1/` — main project repository

## Workflow Preferences
- Confirm before pushing to remote branches
- Confirm before force-push or destructive git operations
- Prefer editing existing files over creating new ones

## Code Style
- Keep solutions minimal and focused; avoid over-engineering
- No docstrings, comments, or type annotations added to unchanged code
- No backwards-compatibility shims for removed code

## Notes
- This workspace root is not itself a git repository; HC1 has its own git repo

## Session Memory
At the start of each session, read the memory index at:
`~/.claude/projects/-Users-cwelling-Tribal-HC1/memory/MEMORY.md`

This index links to memory files with key context on decisions, rationale, and current state. Always consult it before making architectural suggestions or picking up where prior work left off. The user can also say "read your memory" or "check your memory" to trigger this explicitly.

# Personal Relationship Intelligence — Project Context

## What This Is

A macOS-native app that builds a queryable knowledge graph of the user's personal relationships by extracting insights from data that already exists on their devices. Zero manual data entry. All processing runs locally. The user installs the app, grants one permission, and immediately has an AI that understands their social world.

**This is NOT a CRM.** It's not for managing professional contacts or sales pipelines. It's for remembering that your friend Jake mentioned wanting to go wine tasting, that Sarah is vegetarian, and that three people in your group chat are around this weekend.

## Project Status

**Current Phase: Phase 0 — iMessage Reader + Basic LLM Query Layer**

The immediate goal is to build a proof-of-concept that reads the user's iMessage database, resolves contact identities, and answers natural language questions about their relationships and conversations.

## Architecture Overview

See `docs/ARCHITECTURE.md` for the full technical design. Summary:

```
Data Sources (Tier 1: Mac-native, Tier 2: Google OAuth, Tier 3: WhatsApp/Signal bridges)
    ↓
Ingestion Layer (filesystem watchers on local SQLite DBs, API polling, bridge connections)
    ↓
Identity Resolution (cross-platform: phone → contact → email → photo face cluster)
    ↓
Knowledge Extraction (two-pass LLM pipeline: lightweight filter → structured extraction)
    ↓
Knowledge Store (local SQLite — per-person profiles with preferences, intents, life events, context)
    ↓
Query Interface (natural language questions → structured knowledge lookup → LLM synthesis)
```

## Tech Stack

- **Language:** Python 3.11+ (data ingestion, LLM pipeline, CLI)
- **Database:** SQLite (knowledge store, embeddings index)
- **LLM:** TBD — likely Anthropic Claude API for extraction quality, with option for local models (Ollama/MLX) for privacy
- **Key Libraries:**
  - `sqlite3` — reading iMessage chat.db, Photos.sqlite, Apple Notes
  - `osxphotos` — programmatic access to Apple Photos metadata (faces, scenes, GPS)
  - `google-api-python-client` + `google-auth` — Gmail, Calendar, Contacts OAuth
  - `mautrix-whatsapp` (Go) — WhatsApp bridge (Phase 2)
  - `sentence-transformers` or similar — message embeddings for retrieval

## Key Data Source Locations (macOS)

| Source | Path | Notes |
|--------|------|-------|
| iMessage | `~/Library/Messages/chat.db` | SQLite. Tables: `message`, `handle`, `chat`, join tables. Newer macOS encodes text in `attributedBody` hex blob — must decode. |
| Contacts | AddressBook framework / `~/Library/Application Support/AddressBook/` | Use macOS APIs or read SQLite directly. |
| Calendar | EventKit framework | Not a direct SQLite file; use macOS APIs. |
| Photos | `~/Pictures/Photos Library.photoslibrary/database/Photos.sqlite` | Key tables: `ZDETECTEDFACE`, `ZPERSON`, `ZSCENECLASSIFICATION`, `ZASSET`. Apple ML pre-computes face clusters, scene tags, GPS. |
| Apple Notes | `~/Library/Group Containers/group.com.apple.notes/NoteStore.sqlite` | Content stored as protobuf in `ZICCLOUDSYNCINGOBJECT`. |

## Coding Conventions

- Use type hints everywhere
- Docstrings on all public functions
- Each data source reader should be a standalone module in `src/readers/`
- Knowledge extraction prompts go in `src/prompts/`
- Tests in `tests/` mirroring `src/` structure
- Keep dependencies minimal — don't add libraries we don't need
- All file paths should be configurable, not hardcoded
- Handle errors gracefully — if a data source is unavailable, skip it and continue

## Important Technical Notes

### iMessage attributedBody Decoding
In recent macOS versions (Ventura+), message text is no longer in the `text` column of the `message` table. Instead it's encoded as a hex blob in `attributedBody`. The reader must detect which format is present and decode accordingly. The blob is an NSArchiver-encoded attributed string — decode with `typedstream` parsing or the `streamcoder` approach.

### Identity Resolution
A single person may appear as:
- A phone number in iMessage (`+16075551234`)
- A different format in WhatsApp (`16075551234@s.whatsapp.net`)
- An email in Gmail (`sarah.chen@gmail.com`)
- A face cluster in Photos (ZPERSON table linked to Contacts)
- A name in Calendar event attendees

The identity resolver must map all of these to a single unified Person entity. Phone numbers are the strongest cross-platform signal. The Contacts database is the master reference.

### Two-Pass Extraction Pipeline
- **Pass 1 (cheap, every message):** Lightweight classifier flags messages containing actionable info (plans, preferences, life events, requests). ~5-10% of messages pass.
- **Pass 2 (LLM, flagged messages only):** Extract structured knowledge: who said it, type (preference/plan/life_event/request), content, relevance window.

This is critical for group chats where 90%+ of messages are noise ("lol", reactions, memes).

## Phase Roadmap

| Phase | Goal | Depends On | Key Deliverables |
|-------|------|------------|-----------------|
| 0 | iMessage reader + basic LLM queries | Nothing — start here | chat.db reader with attributedBody decoding, contact resolution, embedding-based retrieval, CLI query interface |
| 1 | Knowledge graph + Gmail + Photos | Phase 0 (reader + identity resolution) | Two-pass extraction pipeline, per-person knowledge profiles, Gmail OAuth, Photos face/scene integration, Mac app shell |
| 2 | WhatsApp + group chat intelligence | Phase 1 (extraction pipeline + knowledge store) | mautrix-whatsapp bridge, historical backfill, group chat triage/summarization, cross-platform queries |
| 3 | Polish + expansion + beta | Phase 2 (multi-platform working) | Proactive nudges, people profile UI, Notes integration, Signal/Telegram, GDPR imports, beta launch |

## What NOT to Build

- Don't build a message archive viewer. This is a knowledge extraction tool.
- Don't build a web app. This is a local Mac app. Data never leaves the device (for now).
- Don't try to support Windows/Linux/iOS in Phase 0. Mac-only is correct for v1.
- Don't build bridges in Phase 0. Start with data that's already on the Mac.
- Don't over-engineer the UI. CLI is fine for Phase 0. A simple chat interface is fine for Phase 1.

## Reference Material

- `docs/ARCHITECTURE.md` — Full technical architecture and design decisions
- `docs/PLAN-phase0.md` — Detailed implementation plan for current phase (created during planning)
