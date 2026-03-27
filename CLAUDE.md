# CLAUDE.md

The role of this file is to describe common mistakes, confusion points and workflows that agents might encounter when they work in this project. If you encounter something in this project that surprises you, please alert the developer working with you and indicate that this is the case in the CLAUDE.md file to help prevent future agents from having the same issue.

---

## Quick Start: Current Project State

**Status**: Pre-PMF validation phase. Running free Release Pilot to validate use cases.

**Project Tracking**: [GitHub Project](https://github.com/users/samjmarshall/projects/2) - all tasks, roadmap, and progress tracked via GitHub Issues.

**GitHub Repository**: `samjmarshall/www` - use this repo for all issue creation and management.

---

## Workflow Orchestration

### 1. Self-Improvement Loop
- After ANY correction from the user: update CLAUDE.md with a rule to prevent the same mistake
- Write rules for yourself that are specific and actionable
- Ruthlessly iterate on these rules until mistake rate drops

### 2. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 3. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 4. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Task Management

1. **Plan First:** Write plan with checkable items before coding
2. **Verify Plan:** Check in with the user before starting implementation
3. **Track Progress:** Mark items complete as you go
4. **Explain Changes:** High-level summary at each step
5. **Document Results:** Note what was done and any follow-ups needed
6. **Capture Lessons:** Update CLAUDE.md after corrections

---

## Build & Test Commands

Prefer Makefile targets with `yarn` as a fallback — never use `npm` or `npx` directly:

- `make build` — clean build (`rm -rf .next` + `yarn build`)
- `make check` — lint + typecheck (`yarn check`)
- `make test_e2e` — run Playwright E2E tests (`yarn test:e2e`)
- `make start` — local dev server (`yarn dev`)
- `make install` — install dependencies (`yarn`)

---

## Core Principles

- **Simplicity First:** Make every change as simple as possible. Minimal code impact.
- **No Laziness:** Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact:** Changes should only touch what's necessary. Avoid introducing bugs.