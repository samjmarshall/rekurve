#!/usr/bin/env python3
"""PostToolUse hook: logs skill completion with Haiku value assessment."""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

SYSTEM_PROMPT = """You assess whether a Claude Code skill's output was valuable. You receive the skill name, the arguments it was called with, and its response. Rate the value and explain in one sentence.

Respond ONLY with JSON: {"value": "high|medium|low|none", "reason": "..."}

Rating guide:
- high: Provided specific, actionable content directly relevant to the request (data, protocols, citations, structured output)
- medium: Provided useful context or guidance but required significant additional work to be actionable
- low: Mostly generic information that Claude likely already knows from training data
- none: Failed, returned errors, or produced irrelevant/empty output"""

LOG_PATH = os.path.join(os.environ.get("CLAUDE_PROJECT_DIR", "."), ".claude", "skills.log")


def measure_response(tool_response):
    """Measure response size in bytes."""
    if isinstance(tool_response, str):
        return len(tool_response.encode("utf-8"))
    return len(json.dumps(tool_response).encode("utf-8"))


def truncate_response(tool_response, max_chars=500):
    """Truncate response to approximate char limit for Haiku prompt."""
    if isinstance(tool_response, str):
        text = tool_response
    else:
        text = json.dumps(tool_response)
    if len(text) > max_chars:
        return text[:max_chars] + "... [truncated]"
    return text


def assess_value(skill, args, response_text):
    """Call Haiku to assess the skill's output value."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return "unrated", "no API key"

    user_message = f"Skill: {skill}\nArgs: {args}\n\nResponse:\n{response_text}"

    body = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 150,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_message}],
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Api-Key": api_key,
            "Anthropic-Version": "2023-06-01",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            result = json.loads(resp.read().decode("utf-8"))
        text = result["content"][0]["text"].strip()
        parsed = json.loads(text)
        return parsed.get("value", "unrated"), parsed.get("reason", "")
    except (urllib.error.URLError, json.JSONDecodeError, KeyError, IndexError) as e:
        return "unrated", str(e)


def append_log(entry):
    """Append a JSONL entry to the log file."""
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    with open(LOG_PATH, "a") as f:
        f.write(json.dumps(entry) + "\n")


def main():
    try:
        hook_data = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        return

    tool_input = hook_data.get("tool_input", {})
    skill = tool_input.get("skill")
    if not skill:
        return

    args = tool_input.get("args")
    tool_response = hook_data.get("tool_response", "")
    session_id = hook_data.get("session_id", "")

    response_bytes = measure_response(tool_response)
    truncated = truncate_response(tool_response)

    value, reason = assess_value(skill, args, truncated)

    entry = {
        "event": "complete",
        "ts": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "session_id": session_id,
        "skill": skill,
        "response_bytes": response_bytes,
        "value": value,
        "value_reason": reason,
    }
    append_log(entry)


if __name__ == "__main__":
    main()
