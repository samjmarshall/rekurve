---
skills: writing-clearly-and-concisely
argument-hint: '<feature-name>'
model: opus
effort: high
---

# Document Feature

Use the `document-feature` skill to interview a developer and produce a living feature doc at `docs/feature/{slug}.md` — present-tense "what does this thing do today" for engineers reading the codebase cold.

Feature: $ARGUMENTS

Follow the workflow in `.claude/skills/document-feature/SKILL.md` exactly. Apply the `writing-clearly-and-concisely` skill when filling reader-facing prose.
