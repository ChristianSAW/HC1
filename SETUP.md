# Developer Setup

Requirements: macOS, internet connection.

## 1. Install Homebrew

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

After install, follow the printed instructions to add Homebrew to your PATH (usually adding a line to `~/.zprofile`). Then open a new terminal or run:

```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
```

## 2. Install Python 3.11

```bash
brew install python@3.11
```

## 3. Clone and install the project

```bash
git clone https://github.com/ChristianSAW/HC1.git
cd HC1
python3.11 -m pip install -e ".[dev]"
```

## 4. Set your Anthropic API key

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Add this to your `~/.zprofile` or `~/.zshrc` to persist it across sessions.

## 5. Grant Full Disk Access to Terminal

The iMessage reader needs access to `~/Library/Messages/chat.db`.

- Open **System Settings → Privacy & Security → Full Disk Access**
- Enable **Terminal** (or whichever terminal app you use)

## 6. Run setup

```bash
# Index your iMessage history
hc1 ingest

# Ask a question
hc1 ask "Who have I texted most this month?"

# Interactive mode
hc1 ask --interactive

# Show stats
hc1 stats
```

## 7. Run tests

```bash
python3.11 -m pytest tests/
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | (required) | Anthropic API key |
| `IMESSAGE_DB_PATH` | `~/Library/Messages/chat.db` | Path to iMessage database |
| `HC1_DB_PATH` | `~/.hc1/knowledge.db` | Path to knowledge store |
