# HC1 — Personal Relationship Intelligence

Reads your iMessage history and answers natural language questions about your conversations and the people in them. All ingestion and storage runs locally. The only thing that leaves your machine (by default) is the query step — and even that is optional.

> **Phase 0:** iMessage reader + LLM-powered query CLI

---

## How it works

```
YOUR MACHINE
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ~/Library/Messages/chat.db                                             │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────┐    ┌──────────────────┐                           │
│  │  iMessage       │    │  Contact         │                           │
│  │  Reader         │    │  Resolver        │                           │
│  │                 │    │                  │                           │
│  │  reads SQLite   │    │  AddressBook     │                           │
│  │  decodes blobs  │    │  SQLite lookup   │                           │
│  └────────┬────────┘    └────────┬─────────┘                           │
│           │                      │                                      │
│           └──────────┬───────────┘                                      │
│                      ▼                                                  │
│           ┌──────────────────────┐                                      │
│           │   Knowledge Store    │  ← ~/.hc1/knowledge.db               │
│           │   (SQLite + FTS5)    │                                      │
│           │                      │                                      │
│           │   message_chunks     │                                      │
│           │   persons            │                                      │
│           └──────────┬───────────┘                                      │
│                      │                                                  │
│              FTS keyword search                                         │
│                      │                                                  │
│           ┌──────────▼───────────┐                                      │
│           │    Query Engine      │◀── your question                     │
│           │                      │                                      │
│           │  question +          │                                      │
│           │  top-N messages      │──────────────────────────────────────┼──▶ LLM Provider
│           └──────────────────────┘                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                                    │
                         ┌──────────────────────────┘
                         ▼
               ┌──────────────────┐         ┌──────────────────┐
               │  Anthropic API   │   OR    │  Ollama (local)  │
               │  (Claude Haiku)  │         │  (llama3.2, etc) │
               │                  │         │                  │
               │  ⚠ data leaves   │         │  ✓ fully private │
               │    your machine  │         │    no API key    │
               └────────┬─────────┘         └────────┬─────────┘
                        │                            │
                        └──────────┬─────────────────┘
                                   ▼
                              answer text
```

### Where AI is involved

AI is used **only in the query step** — synthesis of an answer from retrieved messages. Everything else (reading, indexing, searching) is plain SQLite with no AI involved.

---

## Data & Privacy

### What the LLM receives on every query

```
[system prompt]
  "You are a personal relationship intelligence assistant..."
  (fixed instructions — no personal data)

[user message]
  "Here are relevant messages from the user's iMessage history:

  [2024-06-15] Sarah: Hey want to grab lunch tomorrow?
  [2024-06-15] Me: Yeah! What are you feeling?
  [2024-06-16] Sarah: I'm vegetarian so somewhere with good options
  ...

  Question: What food does Sarah like?"
```

The LLM sees: your question, sender display names, message dates, and message text for the top ~20 matches.

### What Anthropic (the API host) sees

When using the default Anthropic provider, Anthropic's servers receive everything above — **real message content from your personal conversations**. Anthropic's [privacy policy](https://www.anthropic.com/privacy) applies.

### Keeping everything local

Run with `--provider ollama` to use a local model instead. Nothing leaves your machine:

```bash
brew install ollama
ollama pull llama3.2
hc1 ask --provider ollama "What food does Sarah like?"
```

---

## Requirements

- macOS (Ventura or later recommended)
- Python 3.11+
- **Full Disk Access** granted to your terminal (required to read iMessage data)
- For Anthropic: an [Anthropic API key](https://console.anthropic.com/)
- For Ollama: [Ollama](https://ollama.ai) installed and running locally

### Grant Full Disk Access

System Settings → Privacy & Security → Full Disk Access → enable your terminal app (Terminal, iTerm2, etc.)

---

## Setup

```bash
git clone https://github.com/ChristianSAW/HC1.git
cd HC1
pip install -e .
export ANTHROPIC_API_KEY=sk-ant-...   # only needed for --provider anthropic
```

---

## Usage

### 1. Ingest your messages

Reads `~/Library/Messages/chat.db`, resolves contact names, and indexes everything into a local knowledge store at `~/.hc1/knowledge.db`.

```bash
hc1 ingest
```

Re-running is safe — already-indexed messages are skipped.

### 2. Ask questions

```bash
# Default: uses Anthropic (Claude Haiku)
hc1 ask "What food does Sarah like?"
hc1 ask "Who have I texted most recently?"
hc1 ask "Did anyone mention a birthday?"

# Use a local model (fully private, no API key needed)
hc1 ask --provider ollama "What food does Sarah like?"

# Use a different model
hc1 ask --model claude-sonnet-4-6 "Summarize my conversations with Jake this month"
hc1 ask --provider ollama --model mistral "Who mentioned they were traveling?"

# Interactive session
hc1 ask --interactive
hc1 ask --provider ollama --interactive
```

### 3. Check stats

```bash
hc1 stats
```

---

## LLM Providers

| Provider | Flag | Privacy | Requires |
|----------|------|---------|----------|
| Anthropic (default) | `--provider anthropic` | Data sent to Anthropic API | `ANTHROPIC_API_KEY` |
| Ollama (local) | `--provider ollama` | Fully local, nothing sent | Ollama running locally |

The provider is pluggable — see `src/llm/providers.py`. To add a new provider (OpenAI, Gemini, a custom endpoint), implement the `LLMProvider` protocol:

```python
class MyProvider:
    def complete(self, system: str, user: str, max_tokens: int = 1024) -> str:
        # call your API / model here
        return response_text
```

Then pass it directly to `QueryEngine`:

```python
engine = QueryEngine(store=store, provider=MyProvider())
```

---

## Configuration

| Environment variable | Default | Description |
|----------------------|---------|-------------|
| `ANTHROPIC_API_KEY` | *(required for Anthropic)* | Your Anthropic API key |
| `IMESSAGE_DB_PATH` | `~/Library/Messages/chat.db` | Path to iMessage database |
| `HC1_DB_PATH` | `~/.hc1/knowledge.db` | Path to local knowledge store |

---

## Development

```bash
# Run tests
python -m pytest

# Run tests with output
python -m pytest -v
```

---

## Project structure

```
src/
  readers/imessage.py     — chat.db reader + attributedBody decoder
  contacts/resolver.py    — phone/email → display name (AddressBook)
  db/knowledge_store.py   — SQLite + FTS5 message index
  llm/providers.py        — LLMProvider protocol + Anthropic/Ollama implementations
  query/engine.py         — FTS retrieval → LLM synthesis
  cli.py                  — hc1 CLI entry point
tests/
  readers/test_imessage.py
  contacts/test_resolver.py
docs/
  ARCHITECTURE.md         — full technical design
  PLAN-phase0.md          — Phase 0 implementation notes
```

---

## Roadmap

| Phase | Goal |
|-------|------|
| **0** *(current)* | iMessage reader + natural language query CLI |
| 1 | Knowledge graph, Gmail, Apple Photos face integration, Mac app |
| 2 | WhatsApp bridge, group chat intelligence, cross-platform queries |
| 3 | Proactive nudges, people profile UI, beta launch |
