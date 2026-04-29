---
skills: writing-clearly-and-concisely
argument-hint: '[create|update] [type|#number] [draft]'
model: sonnet
---

# Pull Request
yea 
Use the `pull-request` skill to create or update a Pull Request for the current branch.

Arguments passed: $ARGUMENTS

The skill auto-detects action when no `create`/`update` arg is given (update if a PR exists for the current branch, create otherwise). Accepted forms:

- *(no args)* — auto-detect action and conventional-commit type
- `create` / `update` — force action
- `<number>` — update specific PR (implies `update`)
- `<type>` — force conventional-commit type (`feat`, `fix`, `refactor`, `chore`, `docs`, `ci`, `build`, `style`, `test`, `perf`)
- `create draft` — create as draft
- Combined: `create feat`, `update 158 fix`, etc.

Follow the workflow in `.claude/skills/pull-request/SKILL.md` exactly. Apply the `writing-clearly-and-concisely` skill when filling prose sections.
