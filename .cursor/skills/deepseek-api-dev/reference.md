# DeepSeek API Reference for Development

## Scope

This document is a practical development guide for integrating DeepSeek API in application code.
Use official docs as the source of truth if there is any conflict.

## 1) Authentication

- Auth scheme: HTTP Bearer
- Header format:

```http
Authorization: Bearer <DEEPSEEK_API_KEY>
Content-Type: application/json
```

Recommended:

- Store key in env var: `DEEPSEEK_API_KEY`
- Never commit keys into source control

## 2) Minimal Request Template

Use a minimal payload first, then expand.

```json
{
  "model": "deepseek-chat",
  "messages": [
    { "role": "user", "content": "Hello" }
  ]
}
```

## 3) cURL Example

```bash
curl https://api.deepseek.com/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -d '{
    "model": "deepseek-chat",
    "messages": [
      {"role":"system","content":"You are a helpful assistant."},
      {"role":"user","content":"Say hi in Chinese."}
    ]
  }'
```

## 4) JavaScript Example (fetch)

```javascript
const apiKey = process.env.DEEPSEEK_API_KEY;

async function callDeepSeek() {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: "Write a one-line summary about APIs." }]
    })
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}
```

## 5) Python Example (requests)

```python
import os
import requests

def call_deepseek():
    api_key = os.environ["DEEPSEEK_API_KEY"]
    url = "https://api.deepseek.com/chat/completions"
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "user", "content": "Give me 3 API integration tips."}
        ]
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    resp = requests.post(url, headers=headers, json=payload, timeout=30)
    if resp.status_code >= 400:
        raise RuntimeError(f"DeepSeek API error {resp.status_code}: {resp.text}")
    data = resp.json()
    return data["choices"][0]["message"]["content"]
```

## 6) Error Handling Rules

- Do not retry:
  - 400/401/403 with clear auth or parameter errors
- Retry with exponential backoff:
  - 429, 500, 502, 503, 504
- Always capture:
  - request id (if provided), status code, endpoint, model, latency

## 7) Team Conventions

- Keep one shared API client module:
  - `src/lib/deepseekClient.*`
- Keep prompts versioned in code for critical features.
- For production paths, add:
  - timeout
  - retry with max attempts
  - structured logs
  - fallback response strategy

## 8) Quick Validation Checklist

- [ ] API key exists in environment
- [ ] Authorization header is valid Bearer format
- [ ] Endpoint path is correct
- [ ] Model string is correct
- [ ] Response parsing handles missing fields safely
- [ ] Timeout and retry strategy are configured

## 9) Removal

This guide is temporary by design.
To remove later, delete:

- `.cursor/skills/deepseek-api-dev/SKILL.md`
- `.cursor/skills/deepseek-api-dev/reference.md`
