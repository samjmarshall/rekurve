---
name: commit
description: git commit code changes with clear messages
---
# Commit Changes

Review the current working tree and create well-structured git commits.

## Message format

See "Conventional Commits 1.0.0" message specification here: https://raw.githubusercontent.com/conventional-commits/conventionalcommits.org/refs/heads/master/content/v1.0.0/index.md

## Process

1. **Understand what changed:**
   - Run `git status` to see current changes
   - Run `git diff` to understand the modifications
   - Consider whether changes should be one commit or multiple logical commits

2. **Plan your commit(s):**
   - Identify which files belong together
   - Draft clear, descriptive commit messages
   - Use imperative mood in commit messages
   - Focus on why the changes were made, not just what

3. **Present your plan:**
   - List the files you plan to add for each commit
   - Show the commit message(s) you'll use
   - Ask: "I plan to create [N] commit(s) with these changes. Shall I proceed?"

4. **Execute upon confirmation:**
   - Use `git add` with specific files (never use `-A` or `.`)
   - **NEVER stage git-ignored files** — run `git check-ignore -v <file>` if unsure whether a file is ignored; skip any file that is ignored
   - Create commits with your planned messages
   - Show the result with `git log --oneline -n [number]`

## Important

- **NEVER add co-author information or Claude attribution**
- Commits should be authored solely by the user
- Do not include any "Generated with Claude" messages
- Do not add "Co-Authored-By" lines
- Write commit messages as if the user wrote them
- Add "Refs: #" for applicable JIRA, Linear, GitHub tickets/issues

## Remember

- Group related changes together
- Keep commits focused and atomic when possible
- Use skill writing-clearly-and-concisely is available to help draft messages
