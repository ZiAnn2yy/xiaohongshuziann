"""
DeepSeek API 客户端（严格遵循 deepseek-api-dev skill）

Checklist (from skill):
- [x] API key exists in environment
- [x] Authorization header is valid Bearer format
- [x] Endpoint path is correct: /chat/completions
- [x] Model string is configurable
- [x] Response parsing handles missing fields safely
- [x] Timeout and retry strategy are configured
- [x] Log request metadata (model, token usage, latency, status code)
- [x] Never log secrets
- [x] Retry 429/5xx with exponential backoff
- [x] Do not retry 400/401/403
"""

import asyncio
import logging
import os
import time
from typing import Any

import httpx

logger = logging.getLogger("backend.deepseek")

RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
NON_RETRYABLE_STATUS_CODES = {400, 401, 403}


class DeepSeekClient:
    def __init__(self) -> None:
        self.api_key = os.getenv("DEEPSEEK_API_KEY", "")
        self.base_url = os.getenv(
            "DEEPSEEK_BASE_URL", "https://api.deepseek.com"
        ).rstrip("/")
        self.model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
        self.timeout_seconds = float(os.getenv("DEEPSEEK_TIMEOUT_SECONDS", "60"))
        self.max_retries = int(os.getenv("DEEPSEEK_MAX_RETRIES", "2"))

    @property
    def enabled(self) -> bool:
        return bool(self.api_key)

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        response_format: dict[str, str] | None = None,
        timeout_override: float | None = None,
    ) -> dict[str, Any]:
        if not self.enabled:
            raise RuntimeError("DEEPSEEK_API_KEY is missing")

        endpoint = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {"model": self.model, "messages": messages}
        if response_format:
            payload["response_format"] = response_format

        timeout = timeout_override or self.timeout_seconds
        attempt = 0

        while True:
            start = time.perf_counter()
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    response = await client.post(
                        endpoint, headers=headers, json=payload
                    )
                latency_ms = int((time.perf_counter() - start) * 1000)

                usage = {}
                body: dict[str, Any] = {}
                if response.status_code < 400:
                    body = response.json()
                    usage = body.get("usage", {})

                logger.info(
                    "deepseek_request status=%s model=%s latency_ms=%s "
                    "prompt_tokens=%s completion_tokens=%s total_tokens=%s",
                    response.status_code,
                    self.model,
                    latency_ms,
                    usage.get("prompt_tokens", "-"),
                    usage.get("completion_tokens", "-"),
                    usage.get("total_tokens", "-"),
                )

                if response.status_code in NON_RETRYABLE_STATUS_CODES:
                    detail = response.text
                    logger.error("deepseek non-retryable error %s: %s", response.status_code, detail[:500])
                    raise RuntimeError(
                        f"DeepSeek API error {response.status_code}: {detail}"
                    )

                if response.status_code in RETRYABLE_STATUS_CODES and attempt < self.max_retries:
                    wait = 2 ** attempt
                    logger.warning(
                        "deepseek retryable error %s, attempt %s/%s, wait %ss",
                        response.status_code, attempt + 1, self.max_retries, wait,
                    )
                    await asyncio.sleep(wait)
                    attempt += 1
                    continue

                if response.status_code >= 400:
                    detail = response.text
                    raise RuntimeError(
                        f"DeepSeek API error {response.status_code}: {detail}"
                    )

                return body

            except httpx.TimeoutException as exc:
                latency_ms = int((time.perf_counter() - start) * 1000)
                logger.warning(
                    "deepseek timeout after %sms, attempt %s/%s",
                    latency_ms, attempt + 1, self.max_retries,
                )
                if attempt >= self.max_retries:
                    raise RuntimeError("DeepSeek request timed out") from exc
                await asyncio.sleep(2 ** attempt)
                attempt += 1
