# Architecture: Personal Relationship Intelligence

> A local-first AI system that extracts relationship knowledge from existing user data.
> No manual input. No cloud dependency. No message archiving — just synthesized understanding.

---

## 1. Problem Statement

Humans can't remember incidental details across hundreds of relationships and thousands of messages. Someone mentioned wanting to go wine tasting two months ago. Someone else is vegetarian. Three friends are around this weekend but you'd have to cross-reference five group chats to know that.

The data to solve this already exists — in text messages, group chats, photos, emails, and calendars. But it's distributed across platforms, organized for the platform's benefit, and no human can index it at scale.

**For college students specifically:** 15-25 active group chats, 500+ messages/day, dozens of overlapping social circles. The information overload is genuinely unmanageable. Plans get buried. Preferences get forgotten. People fall through the cracks.

---

## 2. Core Thesis

By aggregating existing communication data and running AI extraction to build a structured knowledge graph, we create a personal relationship intelligence layer that augments human memory — without requiring any manual data entry.

### Design Principles

1. **Zero manual input** — 100% of knowledge derived from existing data
2. **Always up to date** — continuous background watching, no periodic exports
3. **Privacy-first, local-first** — all processing on user's device, raw messages processed into knowledge and optionally discarded
4. **Personal, not professional** — this is not a CRM; it's for remembering what your friends care about

---

## 3. What We Extract: The Five Knowledge Layers

### Layer A: Relationship Graph — "Who matters to me"
- Contact identities across platforms
- Relationship closeness (interaction frequency/recency)
- Social clusters (group chat co-membership, photo co-occurrence)
- **Source:** Metadata only, no message content needed

### Layer B: Preference & Interest Graph — "What do my people care about"
- Expressed preferences, likes, dislikes, dietary restrictions, hobbies
- Mentioned in passing in conversations, not formally stated
- Changes over time ("trying to eat less meat" overrides older signals)
- **Source:** Message content, LLM extraction required

### Layer C: Expressed Intents & Plans — "What do my people want to do"
- Unfulfilled plans ("we should do X sometime")
- Upcoming plans ("going to Y next weekend")
- Open invitations ("anyone want to check out Z?")
- Time-sensitive — plans expire
- **Source:** Message content + calendar events

### Layer D: Context & Situation — "What's going on in my people's lives"
- Life events (new job, breakup, traveling, exams)
- Current state (on vacation, stressed, just got back)
- Emotional context (rough week, great news)
- **Source:** All channels, group chats richest

### Layer E: Interaction History — "When did we last connect"
- Last contact timestamp per person per platform
- Interaction frequency and trends
- Relationship trajectory (growing vs. fading)
- **Source:** Metadata only

**Key architectural insight:** Layers A and E need only metadata. Layers B, C, D need message content *at extraction time* but not permanently. This means the system can process messages → extract knowledge → store only structured output. Raw messages don't need to be retained.

---

## 4. Data Sources

### Tier 1: Mac-Native (Zero Friction)

One Full Disk Access permission grant. No bridges, no OAuth, no exports. Continuously monitored via filesystem watchers.

#### iMessage — `~/Library/Messages/chat.db`

The single richest data source for Apple ecosystem users. Standard SQLite database.

**Schema (key tables):**
- `message` — all messages. Key columns: `ROWID`, `handle_id`, `text`, `attributedBody`, `date`, `is_from_me`, `cache_has_attachments`
- `handle` — contact identifiers. Key columns: `ROWID`, `id` (phone/email), `service` (iMessage/SMS)
- `chat` — conversations. Key columns: `ROWID`, `chat_identifier`, `display_name`, `group_id`
- `chat_message_join` — links chats to messages
- `chat_handle_join` — links chats to participants
- `attachment` — file attachments with local paths

**Critical: attributedBody encoding (macOS Ventura+)**
In recent macOS versions, message text may not be in the `text` column. Instead it's in `attributedBody` as an NSArchiver-encoded hex blob. The reader must:
1. Check if `text` is populated → use it
2. If `text` is NULL, decode `attributedBody` → extract plain text string
3. The blob is a typedstream/NSArchiver format — parse the binary to extract the attributed string content

**Date format:** Dates are nanoseconds since 2001-01-01 (Apple's epoch). Convert: `datetime(date/1000000000 + strftime('%s', '2001-01-01'), 'unixepoch', 'localtime')`

**Group chats:** Fully supported. Group messages are in the same `message` table, linked to group `chat` entries. `chat.display_name` contains the group name. Each message has `handle_id` identifying the sender.

**History completeness:** Everything since the user started using iMessage on this Apple ID, assuming iCloud sync is enabled and the Mac is fully synced.

**Update method:** Watch the file for changes (FSEvents or polling the modification timestamp). New messages appear as they sync.

#### Contacts — AddressBook Framework

Access via macOS Contacts framework APIs or read the SQLite databases directly from `~/Library/Application Support/AddressBook/`.

**What you get:** Names, phone numbers (multiple per person), email addresses, birthdays, physical addresses, notes, organization, job title, linked social accounts (some people store Instagram/Twitter handles).

**Critical role:** This is the master identity reference. Phone numbers in Contacts are the primary key for linking iMessage handles to WhatsApp IDs to real names.

#### Calendar — EventKit Framework

Access via macOS EventKit APIs (not a direct SQLite file).

**What you get:** Events with titles, attendees (names + email addresses), start/end times, locations, recurrence rules, notes.

**Value:** Structured interaction history. "You met Sarah at 3pm on Tuesday" is a high-confidence signal. Calendar attendee emails also help with identity resolution.

#### Photos — `~/Pictures/Photos Library.photoslibrary/database/Photos.sqlite`

Apple's on-device ML has already computed rich metadata. The database is 300-750MB for typical libraries.

**Key tables:**
- `ZASSET` — every photo/video. Columns include: `ZDATECREATED`, `ZLATITUDE`, `ZLONGITUDE`, `ZSCENECLASSIFICATION` (foreign key)
- `ZDETECTEDFACE` — every detected face in every photo. Columns: `ZASSET` (which photo), `ZPERSON` (which person cluster), `ZAGETYPE` (age estimate), `ZGENDERTYPE`, `ZHASSMILE`, `ZFACIALHAIRCATEGORY`, `ZGLASSESCATEGORY`
- `ZPERSON` — named person clusters. Columns: `ZDISPLAYNAME`, `ZFULLNAME`, `ZCONTACTIDENTIFIER` (link to Contacts), `ZFACECOUNT`, `ZTYPE`
- `ZSCENECLASSIFICATION` — scene labels per photo (beach, restaurant, concert, hiking, wine, food, etc.)

**The `osxphotos` Python library** (github.com/RhetTbull/osxphotos) provides clean programmatic access to all of this. Well-maintained, handles multiple macOS versions.

**What Photos unlock:**
1. **Physical co-presence graph** — who you actually spend time with in person (appears in photos together), distinct from digital graph (who you text)
2. **Activity/interest signals** — 47 photos on trails = hiking interest; photos at sushi restaurants = food preference
3. **Visual evidence in query results** — "Jake at the winery last October [photo]" transforms "AI told me" into "oh yeah, I remember that"
4. **Event attendance** — face detection shows who was at gatherings even without messages

**Update method:** Watch the SQLite file for changes. Apple's ML processes new photos automatically.

#### Apple Notes — `~/Library/Group Containers/group.com.apple.notes/NoteStore.sqlite`

Note content stored as protobuf in the `ZICCLOUDSYNCINGOBJECT` table. Contains full note content including rich text, checklists, tables.

**Value:** Occasional gold — gift idea lists, trip plans, personal notes about people. Lower volume than messages but sometimes very high signal.

### Tier 2: Google OAuth (One-Click Auth)

A single "Sign in with Google" button grants access to all three. Token refreshes automatically — set it once and forget.

#### Gmail — Gmail API

**What you get:** Full email history — metadata (sender, recipients, subject, date) AND body content. Push notification support via pub/sub for real-time updates.

**Value:** Professional relationships, receipts/reservations (restaurant preferences, travel patterns), newsletter subscriptions (interest signals).

**API:** `google-api-python-client` with `google-auth-oauthlib`. Scopes: `gmail.readonly`, `gmail.metadata`.

#### Google Calendar — Calendar API

**What you get:** All events, attendees with email addresses, locations, times. Webhook support for real-time updates.

#### Google Contacts — People API

**What you get:** Contact details, interaction history, labels/groups. Enriches the identity resolution layer beyond what's in macOS Contacts.

### Tier 3: Messaging Bridges (One QR Scan)

These use open-source bridges that implement the same client-side protocols as official apps. Not scraping — native protocol emulation.

#### WhatsApp — via mautrix-whatsapp (Go)

**Protocol:** Registers as a "linked device" using WhatsApp's multi-device protocol (same as WhatsApp Web). Uses the `whatsmeow` Go library. User scans a QR code once.

**Historical backfill:**
- **Path A (complete):** Decrypt local backup. Android: `msgstore.db.crypt15` with 64-char hex key. iOS: iTunes backup extraction via `iphone_backup_decrypt`. Tool: `WhatsApp-Chat-Exporter` (Python). Gets 100% of history.
- **Path B (partial):** Linked device history sync. Phone sends history blobs after pairing. Desktop clients get ~1 year, sometimes up to 3 years.

**Ongoing:** Real-time via linked device protocol. All DMs AND group chats.

**Group chats:** FULLY SUPPORTED. Every message with sender phone number (resolvable to contacts), timestamps, reactions, replies, media. This is the single most valuable data source for students.

**Reliability:** Good. Connection stable for weeks/months. May require re-scan occasionally.

#### Signal — via mautrix-signal (Go)

**Protocol:** Linked device, same as Signal Desktop. User selects "Transfer message history" during linking.

**Historical:** Complete text history transfer. Media only for messages < 45 days.

**Ongoing:** Real-time via linked device. Stable.

#### Telegram — via mautrix-telegram or official API

**Protocol:** Official Telegram API (unusually open). Authenticate with phone number + code once.

**Historical:** Complete. All DMs, 1000 messages per supergroup.

**Ongoing:** Real-time. Very stable.

### Tier 4: Deprioritized for v1

**Instagram/Facebook Messenger:** mautrix-meta bridge exists but Meta changes internal protocols frequently. Bridges break. For historical data, use Meta Account Center GDPR export (JSON, 100% complete).

**LinkedIn:** No reliable real-time bridge. Beeper only gets 1 message per chat. For historical data, use LinkedIn Settings > Data Privacy export (Messages.csv, 100% complete). Periodic re-exports only option for updates.

**Discord:** User token bridge works but ToS risk. Periodic re-auth required.

**Twitter/X:** Bridge exists but unstable. Data download for historical.

### GDPR Exports (One-Time Historical Enrichment)

All platforms are legally required to provide complete data exports:

| Platform | Export Contents | Format |
|----------|----------------|--------|
| Instagram | Full DM history + posts, likes, stories | JSON via Meta Account Center |
| Facebook | Full Messenger history + everything | JSON via Meta Account Center |
| LinkedIn | Messages.csv + Connections.csv + Profile | CSV via Settings > Data Privacy |
| Twitter/X | Full DM history + tweets | JSON via Settings > Your Account |
| WhatsApp | Full history via local backup decryption | SQLite database |

These serve as Day 0 historical data, providing immediate value before ongoing bridges are active.

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   USER'S MAC                         │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │           1. INGESTION LAYER                  │   │
│  │                                               │   │
│  │  Filesystem Watchers:                         │   │
│  │    chat.db → new messages                     │   │
│  │    Photos.sqlite → new photos/faces           │   │
│  │    NoteStore.sqlite → new notes               │   │
│  │                                               │   │
│  │  API Pollers:                                 │   │
│  │    Gmail API → new emails (push/poll)         │   │
│  │    Calendar API → new events (webhooks)       │   │
│  │                                               │   │
│  │  Bridge Connectors (optional):                │   │
│  │    WhatsApp bridge → real-time messages        │   │
│  │    Signal bridge → real-time messages          │   │
│  └──────────────────────┬───────────────────────┘   │
│                         │                            │
│  ┌──────────────────────▼───────────────────────┐   │
│  │       2. IDENTITY RESOLUTION LAYER            │   │
│  │                                               │   │
│  │  Input signals:                               │   │
│  │    Phone numbers (strongest cross-platform)    │   │
│  │    Email addresses                            │   │
│  │    Names (fuzzy matching)                     │   │
│  │    Photos face cluster → Contact link         │   │
│  │    Group chat co-membership                   │   │
│  │                                               │   │
│  │  Output: Unified Person entities              │   │
│  │    person_id → [imessage_handles, wa_ids,     │   │
│  │                  emails, photo_person_ids,     │   │
│  │                  contact_record]               │   │
│  └──────────────────────┬───────────────────────┘   │
│                         │                            │
│  ┌──────────────────────▼───────────────────────┐   │
│  │       3. KNOWLEDGE EXTRACTION LAYER           │   │
│  │                                               │   │
│  │  Pass 1 — Fast Filter (every message):        │   │
│  │    Lightweight classifier → "contains          │   │
│  │    actionable info?" (plans, preferences,      │   │
│  │    life events, requests)                      │   │
│  │    ~5-10% of messages pass                     │   │
│  │                                               │   │
│  │  Pass 2 — LLM Extraction (flagged only):      │   │
│  │    Extract structured knowledge:               │   │
│  │    - who said it (person_id)                  │   │
│  │    - type: preference|plan|life_event|request │   │
│  │    - content (structured)                     │   │
│  │    - confidence score                         │   │
│  │    - relevance window / expiry                │   │
│  │                                               │   │
│  │  Metadata extraction (no LLM needed):         │   │
│  │    - Interaction timestamps                   │   │
│  │    - Platform usage patterns                  │   │
│  │    - Group membership                         │   │
│  │    - Photo co-occurrence                      │   │
│  └──────────────────────┬───────────────────────┘   │
│                         │                            │
│  ┌──────────────────────▼───────────────────────┐   │
│  │          4. KNOWLEDGE STORE                   │   │
│  │          (Local SQLite)                        │   │
│  │                                               │   │
│  │  Tables:                                      │   │
│  │    persons — unified identity records         │   │
│  │    identities — cross-platform ID mapping     │   │
│  │    preferences — per-person likes/dislikes    │   │
│  │    intents — expressed plans (with expiry)    │   │
│  │    life_events — job changes, travel, etc.    │   │
│  │    interactions — last contact per platform   │   │
│  │    social_clusters — group memberships        │   │
│  │    photo_refs — photo evidence per person     │   │
│  │    embeddings — message chunks for retrieval  │   │
│  └──────────────────────┬───────────────────────┘   │
│                         │                            │
│  ┌──────────────────────▼───────────────────────┐   │
│  │          5. QUERY INTERFACE                    │   │
│  │                                               │   │
│  │  User asks natural language question           │   │
│  │       ↓                                        │   │
│  │  Check structured knowledge graph first        │   │
│  │       ↓ (if insufficient)                      │   │
│  │  Retrieve relevant raw messages via embeddings │   │
│  │       ↓                                        │   │
│  │  LLM synthesizes answer from all context       │   │
│  │       ↓                                        │   │
│  │  Attach photo references where relevant        │   │
│  │       ↓                                        │   │
│  │  Return answer to user                         │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 6. Knowledge Store Schema (Draft)

```sql
-- Unified person entity
CREATE TABLE persons (
    id INTEGER PRIMARY KEY,
    display_name TEXT NOT NULL,
    contact_id TEXT,              -- macOS Contacts identifier
    photo_person_id INTEGER,      -- Photos ZPERSON.Z_PK
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cross-platform identity mapping
CREATE TABLE identities (
    id INTEGER PRIMARY KEY,
    person_id INTEGER NOT NULL REFERENCES persons(id),
    platform TEXT NOT NULL,       -- 'imessage', 'whatsapp', 'gmail', 'calendar', 'instagram', etc.
    identifier TEXT NOT NULL,     -- phone number, email, username, etc.
    UNIQUE(platform, identifier)
);

-- Extracted preferences and interests
CREATE TABLE preferences (
    id INTEGER PRIMARY KEY,
    person_id INTEGER NOT NULL REFERENCES persons(id),
    category TEXT,                -- 'food', 'music', 'activity', 'general'
    content TEXT NOT NULL,        -- "vegetarian", "loves Thai food", "allergic to shellfish"
    sentiment TEXT,               -- 'positive', 'negative', 'neutral'
    confidence REAL DEFAULT 0.8,
    source_platform TEXT,
    source_date DATETIME,
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Expressed intents and plans
CREATE TABLE intents (
    id INTEGER PRIMARY KEY,
    person_id INTEGER NOT NULL REFERENCES persons(id),
    type TEXT,                    -- 'unfulfilled_plan', 'upcoming_plan', 'open_invitation', 'request'
    content TEXT NOT NULL,        -- "wants to go wine tasting", "going home for spring break March 8"
    expires_at DATETIME,          -- plans are time-sensitive
    fulfilled BOOLEAN DEFAULT FALSE,
    source_platform TEXT,
    source_date DATETIME,
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Life events and situational context
CREATE TABLE life_events (
    id INTEGER PRIMARY KEY,
    person_id INTEGER NOT NULL REFERENCES persons(id),
    type TEXT,                    -- 'job_change', 'travel', 'relationship', 'academic', 'health', 'move', 'celebration'
    content TEXT NOT NULL,
    is_current BOOLEAN DEFAULT TRUE,  -- still relevant?
    source_platform TEXT,
    source_date DATETIME,
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Interaction history (metadata only, no content)
CREATE TABLE interactions (
    id INTEGER PRIMARY KEY,
    person_id INTEGER NOT NULL REFERENCES persons(id),
    platform TEXT NOT NULL,
    last_interaction DATETIME,
    interaction_count INTEGER DEFAULT 0,  -- in last 30 days
    direction TEXT,               -- 'inbound', 'outbound', 'both'
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Social clusters / groups
CREATE TABLE social_clusters (
    id INTEGER PRIMARY KEY,
    name TEXT,                    -- group chat name or inferred cluster name
    source TEXT,                  -- 'imessage_group', 'whatsapp_group', 'photo_cooccurrence', 'calendar'
    source_identifier TEXT        -- chat_id, group JID, etc.
);

CREATE TABLE cluster_members (
    cluster_id INTEGER NOT NULL REFERENCES social_clusters(id),
    person_id INTEGER NOT NULL REFERENCES persons(id),
    PRIMARY KEY (cluster_id, person_id)
);

-- Photo references for visual evidence
CREATE TABLE photo_refs (
    id INTEGER PRIMARY KEY,
    person_id INTEGER NOT NULL REFERENCES persons(id),
    photo_asset_id TEXT,          -- Photos ZASSET identifier
    photo_path TEXT,              -- local file path
    scene_labels TEXT,            -- JSON array of scene classifications
    location_lat REAL,
    location_lon REAL,
    taken_at DATETIME
);

-- Message embeddings for retrieval (raw message fallback)
CREATE TABLE message_chunks (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    platform TEXT,
    chat_name TEXT,
    content TEXT NOT NULL,
    embedding BLOB,               -- vector embedding
    message_date DATETIME,
    indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. Processing Strategy: Hybrid Model

### Continuous Lightweight Extraction (~5% of messages)

Run on every incoming message through a fast classifier:

**Flags messages containing:**
- Plans/logistics ("let's meet at", "what time", "who's coming", "this weekend")
- Preferences/opinions ("I love", "I can't stand", "I'm allergic to", "that was amazing")
- Life updates ("I got the job", "heading home", "I'm not feeling well", "just broke up")
- Requests ("anyone want to", "does someone have", "can you")

**Implementation options for Pass 1:**
- Keyword/regex patterns (cheapest, fastest, least accurate)
- Small local classifier model (good balance)
- Few-shot LLM call with structured output (most accurate, more expensive)

Flagged messages go to Pass 2 for full LLM extraction into structured knowledge records.

### On-Demand Retrieval (~95% of messages)

When the structured knowledge graph can't fully answer a query:
1. Embed the query
2. Retrieve top-k most relevant message chunks from the embeddings index
3. Pass retrieved messages + structured knowledge to LLM for synthesis
4. Return answer with citations (which messages/photos informed the answer)

### Cost Implications

For a typical student with 500 messages/day across all platforms:
- Pass 1 flags ~25-50 messages/day
- Pass 2 processes those ~25-50 with LLM calls
- At ~500 tokens per extraction call: ~25,000 tokens/day
- With Claude Haiku-class pricing: ~$0.01/day for extraction
- On-demand queries: ~2,000-5,000 tokens per query, ~$0.01-0.05 per query

Total: well under $1/month for typical usage. Local models (Ollama) reduce this to $0.

---

## 8. Example Queries and Resolution Paths

### "What food does Sarah like?"
1. Check `preferences` table for person "Sarah" where category = 'food'
2. Results: "vegetarian" (from group chat, 3 months ago), "loves Thai food" (from DM, 2 weeks ago), "allergic to shellfish" (from group chat, 6 months ago)
3. Check `photo_refs` for Sarah at restaurants (scene_labels contains 'restaurant' or 'food')
4. Synthesize: "Sarah is vegetarian, loves Thai food, and is allergic to shellfish. You two went to that Thai place on College Ave in October [photo]."

### "Who would want to go wine tasting?"
1. Check `intents` for content matching "wine tasting" or "winery" → Jake said "we should go wine tasting" 2 months ago (unfulfilled)
2. Check `preferences` for "wine" related content → Emma mentioned being into natural wine
3. Check `photo_refs` for scene_labels containing "wine" → Sarah has 3 winery photos from October
4. Synthesize: "Jake mentioned wanting to go 2 months ago. Emma's been into natural wine. Sarah went wine tasting in October [photo]."

### "Catch me up on the house group chat"
1. Identify the house group chat from `social_clusters`
2. Pull recent `intents` and `life_events` from members of that cluster
3. Pull recent flagged messages from that chat
4. Synthesize: "3 things that matter: (1) dinner at Thai Orchid Thursday 7pm — Jake, Sarah, Emma confirmed. (2) Mike needs a ride to the airport Friday. (3) Lease renewal: everyone agreed to renew except Alex."

### "Who's around this weekend?"
1. Check `intents` for travel/absence plans with active relevance windows
2. Check `life_events` for current travel status
3. Cross-reference across all group chats and platforms
4. Synthesize: "Alex is going home Friday (house chat). Sarah has a tournament Saturday (friend group chat). Jake asked if anyone wants to study Sunday, so he's around."

---

## 9. Competitive Positioning

| Capability | Us | Clay | Dex | Beeper |
|---|---|---|---|---|
| Reads actual message content | ✓ | Metadata only | ✗ | ✓ (no extraction) |
| Group chat intelligence | ✓ | ✗ | ✗ | ✓* (raw only) |
| WhatsApp integration | ✓ | ✗ | ✗ | ✓ |
| Photo context (faces, scenes, co-presence) | ✓ | ✗ | ✗ | ✗ |
| AI knowledge extraction | ✓ | Partial | ✗ | ✗ |
| Zero manual data entry | ✓ | ✓ | ✗ | ✓ |
| Natural language querying | ✓ | Partial | ✗ | ✗ |
| Local/privacy-first | ✓ | ✗ | ✗ | ✓ |

**The gap:** Nobody combines messages + photos + calendar + email + notes into a unified local knowledge graph with zero manual input. Photos integration specifically is the "holy shit" differentiator — visual evidence transforms "AI told me" into "oh yeah, I remember that."

---

## 10. Open Questions

1. **Local vs. cloud LLM** — Local (MLX/Ollama) preserves privacy but limits capability. Cloud API (Claude) gives better extraction. Offer both as user choice?
2. **Mac-only limitation** — iMessage chat.db and Photos.sqlite are Mac-only. iOS would need a completely different data access approach. Mac-first is correct for v1.
3. **Monetization** — Freemium (Tier 1 free, Tier 2-3 paid)? Subscription? One-time? Privacy positioning argues against ad-supported.
4. **Identity resolution edge cases** — How to handle people not in Contacts? People with multiple phone numbers? Shared devices?
5. **Knowledge staleness** — How aggressively to expire old preferences? Someone said they liked sushi 2 years ago — still valid? Confidence decay over time.
6. **Ethical considerations** — Reading other people's messages who haven't consented. Same data user already has access to, but extraction/storage raises questions.

---

## 11. Key Libraries and Tools

| Library | Language | Purpose |
|---------|----------|---------|
| `osxphotos` | Python | Apple Photos library metadata access |
| `mautrix-whatsapp` | Go | WhatsApp bridge (multi-device protocol) |
| `mautrix-signal` | Go | Signal bridge (linked device protocol) |
| `whatsmeow` | Go | Low-level WhatsApp Web API library |
| `WhatsApp-Chat-Exporter` | Python | Decrypt/parse WhatsApp local backups |
| `imessage_reader` | Python | Read/export iMessage from chat.db |
| `iphone_backup_decrypt` | Python | Decrypt iOS backups for WhatsApp extraction |
| `google-api-python-client` | Python | Gmail, Calendar, Contacts API |
| `sentence-transformers` | Python | Message embeddings for retrieval |
| `sqlite3` | Python stdlib | All local database access |

---

## 12. Data Coverage Estimate

For a typical US college student (Apple ecosystem, Cornell):

| Data Sources Connected | Coverage of Meaningful Relationships |
|---|---|
| iMessage only | ~60-70% |
| iMessage + Gmail + Calendar | ~70-80% |
| + WhatsApp | ~85-90% |
| + Photos | Captures physical social graph that messages miss entirely |

**Main gaps without Tier 3-4 bridges:** WhatsApp group chats (significant for international students), Instagram DMs (casual/social, less substantive), Discord (gaming/hobby communities), LinkedIn (professional, low volume for students).
