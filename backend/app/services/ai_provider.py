"""
AI provider abstraction. Alibaba Model Studio exposes Qwen through an
OpenAI-compatible API, so the concrete provider wraps the `openai` SDK —
but all callers depend on the `AIProvider` protocol, never on the SDK
directly. Swapping providers (or faking one in tests) is then trivial.

Usage:
    from app.services.ai_provider import get_ai_provider
    provider = get_ai_provider()
    answer = provider.chat_text("...", system="You are a career coach.")
    data = provider.chat_json(...)   # structured output, validated by caller
    vectors = provider.embed(["chunk one", "chunk two"])
"""
import json
from typing import List, Protocol, runtime_checkable

from openai import OpenAI

from app.core.config import settings


class AIProviderError(RuntimeError):
    """Raised when the provider call fails or returns unusable output."""


@runtime_checkable
class AIProvider(Protocol):
    def chat_text(self, prompt: str, system: str = "") -> str: ...
    def chat_json(self, prompt: str, system: str = "") -> dict: ...
    def embed(self, texts: List[str]) -> List[List[float]]: ...


class AlibabaModelStudioProvider:
    """Qwen via Model Studio's OpenAI-compatible endpoint."""

    def __init__(self, api_key: str, base_url: str, model: str, embedding_model: str):
        self.model = model
        self.embedding_model = embedding_model
        self._client = OpenAI(api_key=api_key, base_url=base_url)

    # --- internal ---

    def _chat(self, prompt: str, system: str, json_mode: bool = False) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        try:
            response = self._client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"} if json_mode else None,
            )
        except Exception as exc:
            raise AIProviderError(f"Model Studio chat call failed: {exc}") from exc
        content = response.choices[0].message.content
        if not content:
            raise AIProviderError("Model Studio returned an empty completion")
        return content

    # --- public API ---

    def chat_text(self, prompt: str, system: str = "") -> str:
        return self._chat(prompt, system)

    def chat_json(self, prompt: str, system: str = "") -> dict:
        raw = self._chat(prompt, system, json_mode=True).strip()
        # Models occasionally wrap JSON in markdown fences even in JSON mode.
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise AIProviderError(f"Model Studio returned invalid JSON: {exc}") from exc
        if not isinstance(data, dict):
            raise AIProviderError("Model Studio JSON response was not an object")
        return data

    def embed(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        try:
            response = self._client.embeddings.create(
                model=self.embedding_model,
                input=texts,
                dimensions=settings.EMBEDDING_DIM,
            )
        except Exception as exc:
            raise AIProviderError(f"Model Studio embedding call failed: {exc}") from exc
        return [item.embedding for item in response.data]


_provider: AIProvider | None = None


def get_ai_provider() -> AIProvider:
    """Lazily construct and cache the configured provider."""
    global _provider
    if _provider is None:
        if not settings.MODEL_STUDIO_API_KEY:
            raise AIProviderError("MODEL_STUDIO_API_KEY is not set in backend/.env")
        _provider = AlibabaModelStudioProvider(
            api_key=settings.MODEL_STUDIO_API_KEY,
            base_url=settings.MODEL_STUDIO_BASE_URL,
            model=settings.MODEL_STUDIO_MODEL,
            embedding_model=settings.MODEL_STUDIO_EMBEDDING_MODEL,
        )
    return _provider


def set_ai_provider(provider: AIProvider) -> None:
    """Test seam — inject a fake provider before requests."""
    global _provider
    _provider = provider
