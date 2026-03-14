"""LLM provider abstraction.

All synthesis in the query engine goes through an LLMProvider.  Swap the
provider at startup to change which model (and which company) processes your
message data.

Built-in providers
------------------
AnthropicProvider  — Claude via Anthropic API (data leaves your machine)
OllamaProvider     — any model via Ollama local server (fully private)
"""

import json
import os
import urllib.request
from typing import Optional, Protocol, runtime_checkable


@runtime_checkable
class LLMProvider(Protocol):
    """Minimal interface every provider must satisfy."""

    def complete(self, system: str, user: str, max_tokens: int = 1024) -> str:
        """Send a system + user prompt pair and return the model's reply."""
        ...


# ---------------------------------------------------------------------------
# Anthropic (Claude)
# ---------------------------------------------------------------------------

class AnthropicProvider:
    """Claude via the Anthropic API.

    Privacy note: the system prompt, your question, and the retrieved message
    excerpts are all sent to Anthropic's servers on every query.

    Models: claude-haiku-4-5-20251001 (fast/cheap), claude-sonnet-4-6 (better quality)
    """

    DEFAULT_MODEL = "claude-haiku-4-5-20251001"

    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        api_key: Optional[str] = None,
    ) -> None:
        import anthropic  # imported lazily so Ollama users don't need it installed

        self.model = model
        self._client = anthropic.Anthropic(
            api_key=api_key or os.environ.get("ANTHROPIC_API_KEY")
        )

    def complete(self, system: str, user: str, max_tokens: int = 1024) -> str:
        response = self._client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return response.content[0].text

    def __repr__(self) -> str:
        return f"AnthropicProvider(model={self.model!r})"


# ---------------------------------------------------------------------------
# Ollama (local)
# ---------------------------------------------------------------------------

class OllamaProvider:
    """Any model served by Ollama on your local machine.

    Privacy note: nothing leaves your machine.  Requires `ollama` to be
    running: https://ollama.ai

    Example models: llama3.2, mistral, phi3, gemma2
    Pull a model first:  ollama pull llama3.2
    """

    DEFAULT_MODEL = "llama3.2"
    DEFAULT_BASE_URL = "http://localhost:11434"

    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        base_url: str = DEFAULT_BASE_URL,
    ) -> None:
        self.model = model
        self.base_url = base_url.rstrip("/")

    def complete(self, system: str, user: str, max_tokens: int = 1024) -> str:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "stream": False,
            "options": {"num_predict": max_tokens},
        }
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            f"{self.base_url}/api/chat",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read())
        except OSError as e:
            raise RuntimeError(
                f"Could not reach Ollama at {self.base_url}. "
                "Is `ollama serve` running?"
            ) from e
        return result["message"]["content"]

    def __repr__(self) -> str:
        return f"OllamaProvider(model={self.model!r}, base_url={self.base_url!r})"


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def make_provider(name: str, model: Optional[str] = None) -> LLMProvider:
    """Construct a provider by short name ('anthropic' or 'ollama').

    Used by the CLI --provider flag.
    """
    if name == "anthropic":
        return AnthropicProvider(model=model or AnthropicProvider.DEFAULT_MODEL)
    if name == "ollama":
        return OllamaProvider(model=model or OllamaProvider.DEFAULT_MODEL)
    raise ValueError(f"Unknown provider {name!r}. Choose 'anthropic' or 'ollama'.")
