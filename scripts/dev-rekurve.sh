#!/usr/bin/env bash
set -euo pipefail

: "${PORTLESS_URL:?PORTLESS_URL not set — run this script via portless}"

# Peer Inngest dev server lives at the same hostname with `inngest.` inserted
# before `rekurve.localhost`. Holds for the main worktree and any branch-prefixed
# linked worktree (portless adds the prefix to both names symmetrically).
export INNGEST_BASE_URL="${PORTLESS_URL/rekurve.localhost/inngest.rekurve.localhost}"

# Put the SDK in dev mode. Without this the SDK defaults to cloud mode and
# rejects the dev server's sync (PUT /api/inngest 500: "no signing key found").
# INNGEST_BASE_URL only overrides the URL — it does not flip the mode.
export INNGEST_DEV=1

exec next dev --turbo
