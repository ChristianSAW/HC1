"""Query engine: natural language question → FTS search → LLM synthesis."""

from typing import Optional

from src.db.knowledge_store import KnowledgeStore
from src.llm.providers import AnthropicProvider, LLMProvider

SYSTEM_PROMPT = """You are a personal relationship intelligence assistant. You have access to \
the user's iMessage history and help them recall information about their conversations \
and the people they communicate with.

When answering questions:
- Be concise and direct
- Cite specific messages when relevant (use the sender name and approximate date)
- If the context doesn't contain enough information, say so honestly
- Never fabricate details not present in the provided messages
- Treat all information as private and personal
"""


def _format_context(results: list[dict]) -> str:
    """Format search results into a context block for the LLM."""
    if not results:
        return "(No relevant messages found)"

    lines = []
    for r in results:
        sender = "Me" if r["is_from_me"] else (r["display_name"] or r["handle_id"] or "Unknown")
        date_str = r["sent_at"][:10] if r["sent_at"] else "unknown date"
        lines.append(f"[{date_str}] {sender}: {r['content']}")

    return "\n".join(lines)


class QueryEngine:
    """Answers natural language questions using FTS retrieval + an LLM provider."""

    def __init__(
        self,
        store: KnowledgeStore,
        provider: Optional[LLMProvider] = None,
        search_limit: int = 20,
    ) -> None:
        self.store = store
        self.search_limit = search_limit
        self.provider: LLMProvider = provider or AnthropicProvider()

    def answer(self, question: str) -> str:
        """Answer a natural language question about the user's messages.

        Strategy:
        1. FTS search for relevant messages
        2. Also fetch recent messages for temporal questions
        3. Pass context + question to the LLM provider for synthesis

        What the LLM receives:
        - A fixed system prompt (no personal data)
        - The user's question
        - Up to `search_limit` message excerpts: sender name, date, text
        """
        fts_results = self.store.search(question, limit=self.search_limit)

        recent: list[dict] = []
        temporal_keywords = {"recent", "lately", "last", "yesterday", "today", "this week"}
        if any(kw in question.lower() for kw in temporal_keywords):
            recent = self.store.recent_messages(limit=20)

        seen: set[str] = set()
        combined: list[dict] = []
        for r in fts_results + recent:
            key = r["content"]
            if key not in seen:
                seen.add(key)
                combined.append(r)

        context = _format_context(combined)

        user_prompt = f"""Here are relevant messages from the user's iMessage history:

{context}

Question: {question}

Please answer based on the messages above."""

        return self.provider.complete(SYSTEM_PROMPT, user_prompt)
