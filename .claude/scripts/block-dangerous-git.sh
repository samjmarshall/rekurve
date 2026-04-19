#!/bin/bash
# Pre-tool hook for Claude Code. Reads the Bash tool invocation from stdin,
# extracts the command, and blocks it (exit 2) if it matches a destructive
# git pattern. Claude receives the stderr message as refusal context.
#
# Escape hatch for the user: run the command directly via the `!` prefix
# in the Claude prompt — hooks do not run on user-invoked shell commands.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

DANGEROUS_PATTERNS=(
  "git push"
  "git reset --hard"
  "git clean -fd"
  "git clean -f"
  "git branch -D"
  "git checkout \\."
  "git restore \\."
  "push --force"
  "reset --hard"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "BLOCKED: '$COMMAND' matches dangerous pattern '$pattern'. The user has prevented you from doing this without explicit override." >&2
    exit 2
  fi
done

exit 0
