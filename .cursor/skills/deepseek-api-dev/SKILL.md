---
name: deepseek-api-dev
description: Implement and troubleshoot DeepSeek API integrations for application development. Use when the user asks for DeepSeek chat or completions calls, Bearer authentication setup, model invocation, JSON output, tool calls, request templates, or API error handling.
---

# DeepSeek API Development

## Purpose

Use this skill to build stable DeepSeek API integrations that are easy to debug and maintain.

This is a project-local, removable skill. Delete the `deepseek-api-dev` folder when no longer needed.

## Default Workflow

1. Confirm the target is DeepSeek API integration.
2. Implement using official documentation defaults first.
3. Start from a minimal request that can succeed.
4. Add optional capabilities step by step (JSON output, tool calls, multi-turn context, etc.).
5. Add robust error handling and retry logic before finishing.

## Required Baseline

- Use HTTPS requests with `Authorization: Bearer <DEEPSEEK_API_KEY>`.
- Keep API keys in environment variables, never hardcode them.
- Set a clear timeout in every client call.
- Log request metadata (model, token usage, latency, status code), but never log secrets.

## Implementation Rules

- Prefer a small reusable client wrapper over scattered inline requests.
- Keep model name and base URL configurable by environment variables.
- For first integration, implement one happy-path example and one error-path example.
- If the user asks for advanced features, implement incrementally and keep fallback behavior.

## Debug Checklist

- Validate base URL and endpoint path.
- Validate Authorization header format.
- Check model name against currently available models.
- Inspect HTTP status code and response body error fields.
- Verify token usage and request payload size.
- Add backoff retry for transient failures (429/5xx), avoid retrying invalid requests (4xx auth/params).

## Output Style

When generating integration code with this skill:

- Provide complete runnable snippets (not pseudo code) for the requested language.
- Include env var names and minimal setup command.
- Include one short "how to test" section.

## Additional Resources

- Detailed API call conventions and templates: [reference.md](reference.md)
