#!/usr/bin/env bash
set -euo pipefail

: "${PORTLESS_URL:?PORTLESS_URL not set — run this script via portless}"

# Peer Inngest dev server lives at the same hostname with `inngest.` inserted
# before `www.localhost`. Holds for the main worktree and any branch-prefixed
# linked worktree (portless adds the prefix to both names symmetrically).
export INNGEST_BASE_URL="${PORTLESS_URL/www.localhost/inngest.www.localhost}"

exec next dev --turbo
