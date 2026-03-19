"""HC1 CLI — Personal Relationship Intelligence for iMessage."""

import argparse
import sqlite3
import sys
from pathlib import Path
from typing import Optional

from src.contacts.resolver import ContactResolver
from src.db.knowledge_store import KnowledgeStore
from src.llm.providers import make_provider
from src.query.engine import QueryEngine
from src.readers.imessage import IMessageReader


def cmd_ingest(args: argparse.Namespace) -> int:
    """Read iMessage chat.db and index messages into the knowledge store."""
    reader = IMessageReader(db_path=Path(args.db) if args.db else None)
    store = KnowledgeStore(db_path=Path(args.store) if args.store else None)
    resolver = ContactResolver()

    try:
        total = reader.count_messages()
        print(f"iMessage database: {reader.db_path}")
        print(f"Total messages in chat.db: {total:,}")
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except sqlite3.DatabaseError as e:
        if "authorization denied" in str(e).lower() or "unable to open" in str(e).lower():
            print(
                "Error: macOS blocked access to the iMessage database.\n\n"
                "Fix: grant Full Disk Access to your terminal app.\n"
                "  System Settings → Privacy & Security → Full Disk Access\n"
                "  Enable the toggle next to Terminal (or iTerm2, etc.)\n"
                "  Then reopen your terminal and retry.",
                file=sys.stderr,
            )
        else:
            print(f"Error reading iMessage database: {e}", file=sys.stderr)
        return 1

    # Resolve all handles upfront for efficient batch insert
    handles = reader.get_handles()
    handle_names: dict[str, str] = {}
    for h in handles:
        name = resolver.resolve(h.id)
        handle_names[str(h.rowid)] = name

    print(f"Resolved {len(handles)} handles from Contacts")

    # Ingest in batches
    batch_size = args.batch_size
    batch: list = []
    new_count = 0
    msg_count = 0

    print("Indexing messages...", flush=True)

    for msg in reader.get_messages():
        batch.append(msg)
        msg_count += 1
        if len(batch) >= batch_size:
            new_count += store.index_messages(batch, handle_names)
            batch = []
            print(f"  Processed {msg_count:,} messages ({new_count:,} new)...", flush=True)

    if batch:
        new_count += store.index_messages(batch, handle_names)

    print(f"\nDone. {msg_count:,} messages scanned, {new_count:,} new messages indexed.")
    print(f"Knowledge store: {store.db_path}")
    print(f"Total indexed: {store.message_count():,}")
    return 0


def cmd_ask(args: argparse.Namespace) -> int:
    """Answer a natural language question about iMessage history."""
    import os

    provider_name = args.provider or "anthropic"

    if provider_name == "anthropic" and not os.environ.get("ANTHROPIC_API_KEY"):
        print("Error: ANTHROPIC_API_KEY environment variable not set.", file=sys.stderr)
        return 1

    store = KnowledgeStore(db_path=Path(args.store) if args.store else None)

    if store.message_count() == 0:
        print("Knowledge store is empty. Run `hc1 ingest` first.", file=sys.stderr)
        return 1

    try:
        provider = make_provider(provider_name, model=args.model or None)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    engine = QueryEngine(store=store, provider=provider)

    if args.interactive:
        print("HC1 — Ask questions about your iMessage history. Type 'quit' to exit.\n")
        while True:
            try:
                question = input("You: ").strip()
            except (EOFError, KeyboardInterrupt):
                print()
                break
            if question.lower() in {"quit", "exit", "q"}:
                break
            if not question:
                continue
            answer = engine.answer(question)
            print(f"\nHC1: {answer}\n")
    else:
        question = " ".join(args.question)
        if not question:
            print("Error: provide a question or use --interactive", file=sys.stderr)
            return 1
        answer = engine.answer(question)
        print(answer)

    return 0


def cmd_ollama(args: argparse.Namespace) -> int:
    """Manage the local Ollama server."""
    import subprocess

    from src.llm.ollama_lifecycle import is_running

    action = args.action

    if action == "status":
        print("Ollama is running." if is_running() else "Ollama is not running.")
        return 0

    if action == "start":
        if is_running():
            print("Ollama is already running.")
            return 0
        import shutil
        if not shutil.which("ollama"):
            print("Error: Ollama is not installed. Install from https://ollama.ai", file=sys.stderr)
            return 1
        subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        import time
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            if is_running():
                print("Ollama started.")
                return 0
            time.sleep(0.3)
        print("Error: Ollama failed to start within 10 seconds.", file=sys.stderr)
        return 1

    if action == "stop":
        if not is_running():
            print("Ollama is not running.")
            return 0
        subprocess.run(["pkill", "-x", "ollama"], check=False)
        print("Ollama stopped.")
        return 0

    return 0


def cmd_stats(args: argparse.Namespace) -> int:
    """Show ingestion statistics."""
    store = KnowledgeStore(db_path=Path(args.store) if args.store else None)
    count = store.message_count()
    print(f"Knowledge store: {store.db_path}")
    print(f"Indexed messages: {count:,}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="hc1",
        description="Personal Relationship Intelligence — iMessage reader and query CLI",
    )

    shared = argparse.ArgumentParser(add_help=False)
    shared.add_argument(
        "--store",
        metavar="PATH",
        help="Path to knowledge store SQLite DB (default: ~/.hc1/knowledge.db)",
    )

    sub = parser.add_subparsers(dest="command", required=True)

    # ingest
    p_ingest = sub.add_parser("ingest", parents=[shared], help="Index iMessage history")
    p_ingest.add_argument(
        "--db",
        metavar="PATH",
        help="Path to chat.db (default: ~/Library/Messages/chat.db)",
    )
    p_ingest.add_argument(
        "--batch-size",
        type=int,
        default=1000,
        metavar="N",
        help="Messages per batch (default: 1000)",
    )
    p_ingest.set_defaults(func=cmd_ingest)

    # ask
    p_ask = sub.add_parser("ask", parents=[shared], help="Ask a question about your messages")
    p_ask.add_argument("question", nargs="*", help="Question to ask")
    p_ask.add_argument(
        "--interactive",
        "-i",
        action="store_true",
        help="Start interactive Q&A session",
    )
    p_ask.add_argument(
        "--provider",
        choices=["anthropic", "ollama"],
        default="anthropic",
        help="LLM provider to use for synthesis (default: anthropic)",
    )
    p_ask.add_argument(
        "--model",
        metavar="NAME",
        help="Model name to use (e.g. claude-sonnet-4-6, llama3.2)",
    )
    p_ask.set_defaults(func=cmd_ask)

    # ollama
    p_ollama = sub.add_parser("ollama", help="Manage local Ollama server")
    p_ollama.add_argument(
        "action",
        choices=["start", "stop", "status"],
        help="Action to perform",
    )
    p_ollama.set_defaults(func=cmd_ollama)

    # stats
    p_stats = sub.add_parser("stats", parents=[shared], help="Show knowledge store statistics")
    p_stats.set_defaults(func=cmd_stats)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    sys.exit(args.func(args))


if __name__ == "__main__":
    main()
