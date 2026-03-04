# Skills Adoption Implementation Plan

## Overview

Install and test 21 high-priority skills from skills.sh to enhance Claude Code's capabilities for Next.js development, accessibility, code quality, and content creation. Skills are organized into 5 phases based on dependencies and impact.

## Current State Analysis

**Existing Skills** (`.claude/skills/`):
- Custom project skills: ui-aesthetics, ticket-writer, roadmap-review, writing-clearly-and-concisely, brand-guidelines
- Total: 5 custom skills

**Skills Infrastructure**:
- npx skills CLI available (v1.3.1)
- Local skills directory: `.claude/skills/`
- No global skills installed yet

### Key Discoveries:
- **Multiple installation systems**: Standard npx, Claude Code /plugin, custom CLIs, manual ZIP
- **Installation complexity**: Some skills require post-install steps (roier-seo needs `npm install`)
- **Skill bundling**: Some repos install multiple skills at once (vercel-labs/agent-skills includes 3 skills)
- **Naming variance**: Skill names may differ from directory names (e.g., accelint-nextjs-best-practices)

## Desired End State

**All 21 ADOPT skills installed and functional**, with:
- Skills accessible via Claude Code context system
- No conflicts between skills
- Verification that each skill loads correctly
- Documentation of any installation issues or workarounds

### Verification Method:
Run `/context` command to see all loaded skills in the "Skills" section.

## What We're NOT Doing

- NOT installing CONSIDER skills (18 skills deferred for evaluation)
- NOT installing FUTURE skills (23 skills for later use cases)
- NOT installing secure-claude-skills yet (requires separate deep-dive review)
- NOT modifying existing custom skills (ui-aesthetics, ticket-writer, etc.)
- NOT removing frontend-design from the list (already merged into ui-aesthetics)

## Implementation Approach

**Phased Installation Strategy**:
1. Install core foundation skills first (React, Next.js, Tailwind, Zod)
2. Add accessibility and UX skills
3. Install quality and tooling skills
4. Add AI SDK and meta-skills last
5. Defer security skill for separate evaluation

**Risk Mitigation**:
- Test after each phase to catch conflicts early
- Document installation commands that fail
- Keep notes on any post-install requirements
- Verify skill loading with `/context` after each phase

---

## Phase 1: Core Foundation (6 skills)

### Overview
Install essential skills for Next.js 15, React 19, Tailwind v4, and TypeScript validation. These form the foundation that other skills build upon.

### Installation Method Notes
- **vercel-labs/agent-skills**: Single repo installs 3 skills (react-best-practices, web-design-guidelines, composition-patterns)
- **gohypergiant/agent-skills**: Specific skill flag needed for nextjs-best-practices
- **pproenca/dot-skills**: Uses add-skill CLI, not standard npx skills

### Changes Required:

#### 1. Install Vercel Labs Agent Skills Bundle
**Command**:
```bash
npx skills add vercel-labs/agent-skills
```

**Skills Installed** (3 skills):
- react-best-practices (74K installs) — 57 rules across 8 categories
- web-design-guidelines (56K installs) — 100+ UI compliance rules
- composition-patterns — Compound components, avoid boolean props

**Expected Location**: `~/.claude-code/skills/` or `.claude/skills/`

#### 2. Install Next.js Best Practices
**Command**:
```bash
npx skills add https://github.com/gohypergiant/agent-skills --skill nextjs-best-practices
```

**Skills Installed**: nextjs-best-practices (may be named accelint-nextjs-best-practices in repo)

**Note**: Server Components, Server Actions security, parallel data fetching for Next.js 15

#### 3. Install Tailwind v4 + shadcn Skill
**Installation Method**: Claude Code /plugin system
**Commands**:
```bash
# Method 1: Try standard skills add first
npx skills add https://github.com/jezweb/claude-skills --skill tailwind-v4-shadcn

# Method 2 (if Method 1 fails): Use plugin system
# Run from within Claude Code CLI:
# /plugin marketplace add https://github.com/jezweb/claude-skills
# /plugin install tailwind-v4-shadcn@jezweb-skills
```

**Skills Installed**: tailwind-v4-shadcn — Tailwind v4 breaking changes, CSS-first config

**Note**: May require Claude Code /plugin commands instead of npx

#### 4. Install Zod Validation Skill
**Command**:
```bash
npx add-skill pproenca/dot-skills --skill zod
```

**Skills Installed**: zod (43 rules) — TypeScript schema validation with @t3-oss/env-nextjs

**Note**: Uses add-skill CLI, not standard npx skills

### Success Criteria:

#### Automated Verification:
- [x] Run `/context` and verify "Skills" section includes:
  - vercel-react-best-practices ✓
  - web-design-guidelines ✓
  - vercel-composition-patterns ✓
  - accelint-nextjs-best-practices ✓
  - tailwind-v4-shadcn ✓
  - zod ✓
- [x] Count should show 6 new skills + 5 existing custom skills = 11 total
- [x] Existing code still passes: `yarn check`

#### Manual Verification:
- [x] Skills appear in skill selector when typing `/` in Claude Code
- [x] No error messages when loading Claude Code after installation
- [x] Skill files exist in `.claude/skills/` (symlinked from `.agents/skills/`)

---

## Phase 2: Accessibility & UX (5 skills)

### Overview
Install accessibility auditing, screen reader testing, UI baseline, and content writing skills. These ensure WCAG 2.2 compliance and professional UX writing.

### Installation Method Notes
- **wshobson/agents**: Uses Claude Code /plugin system, not npx
- **ibelick/ui-skills**: Uses custom ui-skills CLI
- **content-designer/ux-writing-skill**: Manual ZIP installation required

### Changes Required:

#### 1. Install wshobson Accessibility Plugin
**Installation Method**: Claude Code /plugin system
**Commands**:
```bash
# Run from within Claude Code CLI:
# /plugin marketplace add wshobson/agents
# /plugin install accessibility-compliance
```

**Skills Installed** (2 skills):
- wcag-audit-patterns — WCAG 2.2 audit patterns
- screen-reader-testing — VoiceOver, NVDA, JAWS testing

**Note**: Must use /plugin commands from within Claude Code, not from bash

#### 2. Install Baseline UI Skill
**Command**:
```bash
npx ui-skills add baseline-ui
```

**Alternative** (if ui-skills CLI fails):
```bash
npx skills add ibelick/ui-skills
```

**Skills Installed**: baseline-ui — Prevents AI slop, animation/z-index constraints

#### 3. Install Copywriting Skill
**Command**:
```bash
npx skills add coreyhaines31/marketingskills --skill copywriting
```

**Skills Installed**: copywriting — Benefits over features, CTA best practices

#### 4. Install UX Writing Skill
**Installation Method**: Manual ZIP file
**Steps**:
```bash
# Download and extract manually
mkdir -p ~/.claude-code/skills/ux-writing
curl -L https://github.com/content-designer/ux-writing-skill/raw/main/dist/ux-writing-skill.zip -o /tmp/ux-writing-skill.zip
unzip /tmp/ux-writing-skill.zip -d ~/.claude-code/skills/ux-writing
rm /tmp/ux-writing-skill.zip
```

**Skills Installed**: ux-writing (40+ UI patterns) — Error messages, microcopy, buttons

**Note**: Requires manual file placement, then restart Claude Code

### Success Criteria:

#### Automated Verification:
- [x] Run `/context` and verify new skills appear:
  - wcag-audit-patterns ✓
  - screen-reader-testing ✓
  - baseline-ui ✓ (+ 3 bonus: fixing-accessibility, fixing-metadata, fixing-motion-performance)
  - copywriting ✓
  - ux-writing ✓
- [x] Total count: 11 (from Phase 1) + 8 = 19 skills (5 planned + 3 bonus from ibelick)

#### Manual Verification:
- [x] wshobson skills installed via npx skills add (no /plugin needed)
- [x] UX writing skill folder exists with SKILL.md file
- [x] Skills load without errors

---

## Phase 3: Quality & Tooling (6 skills)

### Overview
Install error handling, code review, testing, SEO, animation, and API design skills. These improve code quality, testing practices, and SEO optimization.

### Installation Method Notes
- **wshobson skills**: Use /plugin system (developer-essentials, backend-development)
- **roier-seo**: Requires post-install npm install for audit dependencies
- **animation-designer**: Uses add-skill CLI
- **vitest**: Prefers pnpm (pnpx)

### Changes Required:

#### 1. Install wshobson Developer Essentials Plugin
**Installation Method**: Claude Code /plugin system
**Commands**:
```bash
# Run from within Claude Code CLI:
# /plugin marketplace add wshobson/agents
# /plugin install developer-essentials
```

**Skills Installed** (2 skills):
- error-handling-patterns — Circuit breaker, graceful degradation, retry
- code-review-excellence — Systematic code review analysis

#### 2. Install wshobson Backend Development Plugin
**Installation Method**: Claude Code /plugin system
**Commands**:
```bash
# Run from within Claude Code CLI:
# /plugin marketplace add wshobson/agents (already added)
# /plugin install backend-development
```

**Skills Installed**: api-design-principles (25.7K downloads) — REST + GraphQL patterns

#### 3. Install Vitest Skill
**Command** (prefer pnpm):
```bash
pnpx skills add antfu/skills --skill='vitest'
```

**Alternative** (if pnpm not available):
```bash
npx skills add antfu/skills --skill vitest
```

**Skills Installed**: vitest (1.4K installs) — Jest-compatible, native ESM/TS

#### 4. Install SEO Skill with Post-Install
**Command**:
```bash
npx skills add https://github.com/davila7/claude-code-templates --skill roier-seo
```

**Post-Install Steps**:
```bash
# Install audit dependencies
cd ~/.claude-code/skills/roier-seo/scripts || cd .claude/skills/roier-seo/scripts
npm install
cd -
```

**Skills Installed**: roier-seo — Auto-fix SEO for Next.js, Open Graph

**Note**: Requires npm install after skill installation

#### 5. Install Animation Designer Skill
**Command**:
```bash
npx add-skill https://github.com/daffy0208/ai-dev-standards/animation-designer
```

**Skills Installed**: animation-designer — Framer Motion, useReducedMotion() patterns

**Note**: Uses add-skill CLI

### Success Criteria:

#### Automated Verification:
- [x] Run `/context` and verify new skills appear:
  - error-handling-patterns ✓
  - code-review-excellence ✓
  - api-design-principles ✓
  - vitest ✓
  - roier-seo ✓
  - animation-designer ✓
- [x] Total count: 19 (from Phase 2) + 6 = 25 skills
- [x] roier-seo scripts/node_modules directory exists

#### Manual Verification:
- [x] wshobson skills installed via npx skills add (no /plugin needed)
- [x] roier-seo post-install completed successfully (npm install in scripts/)
- [x] No errors when running skills that depend on installed dependencies

---

## Phase 4: AI SDK & Meta-Skills (2 skills)

### Overview
Install Vercel AI SDK toolkit and Anthropic's skill-creator meta-skill. These enable AI agent features and custom skill development.

### Installation Method Notes
- **ai-sdk**: Standard npx skills
- **skill-creator**: Claude Code /plugin system (Anthropic official)

### Changes Required:

#### 1. Install Vercel AI SDK Skill
**Command**:
```bash
npx skills add vercel/ai
```

**Skills Installed**: ai-sdk (2,300 installs) — TypeScript-native AI SDK for Next.js, streaming, agents

**Note**: Critical for AI sales agent features

#### 2. Install Skill Creator Meta-Skill
**Installation Method**: Claude Code /plugin system
**Commands**:
```bash
# Run from within Claude Code CLI:
# /plugin install document-skills@anthropic-agent-skills
```

**Skills Installed**: skill-creator — Meta-skill for building custom skills

**Note**: Uses Anthropic's official plugin, not available via npx

### Success Criteria:

#### Automated Verification:
- [x] Run `/context` and verify new skills appear:
  - ai-sdk ✓
  - skill-creator ✓
- [x] Total count: 25 (from Phase 3) + 2 = 27 skills
- [x] All 19 ADOPT skills installed + 3 bonus from ibelick bundle = 22 new skills

#### Manual Verification:
- [x] ai-sdk skill provides guidance on Vercel AI SDK usage
- [x] skill-creator provides instructions for creating new skills
- [x] No conflicts between skills
- [x] All skills load successfully when Claude Code starts

---

## Phase 5: Security Evaluation (Deferred)

### Overview
Deep-dive evaluation of secure-claude-skills before adoption. This phase is NOT part of this implementation plan and should be handled separately.

**Skill**: secure-claude-skills (harperaa/secure-claude-skills)
- 14 security skills
- OWASP coverage: 90/100
- Requires careful evaluation before adoption

### Recommendation:
Create a separate implementation plan for:
1. Reviewing the 14 security skills included
2. Testing each security skill's recommendations
3. Validating compatibility with existing codebase
4. Making adoption decision per-skill rather than bulk install

**Out of scope for this plan.**

---

## Testing Strategy

### Skill Loading Verification
After each phase:
1. Run `/context` command
2. Check "Skills" section for newly installed skills
3. Verify skill count matches expected total
4. Ensure no error messages in Claude Code output

### Skill Functionality Testing
After all phases complete:
1. Test a sample skill from each category:
   - **React**: Ask Claude to review a component using react-best-practices
   - **Accessibility**: Ask for WCAG audit using wcag-audit-patterns
   - **SEO**: Ask for SEO review using roier-seo
   - **AI SDK**: Ask about Vercel AI SDK usage
2. Verify skills provide relevant, accurate guidance
3. Check for conflicts (e.g., contradictory advice between skills)

### Rollback Plan
If a skill causes issues:
1. Remove skill directory: `rm -rf ~/.claude-code/skills/SKILLNAME` or `rm -rf .claude/skills/SKILLNAME`
2. Restart Claude Code
3. Document the issue in thoughts/research/skill-installation-issues.md
4. Continue with remaining skills

---

## Installation Command Reference

### Skills by Installation Method

**Standard npx skills** (8 skills):
```bash
# Phase 1
npx skills add vercel-labs/agent-skills  # Installs 3: react-best-practices, web-design-guidelines, composition-patterns
npx skills add https://github.com/gohypergiant/agent-skills --skill nextjs-best-practices

# Phase 2
npx skills add coreyhaines31/marketingskills --skill copywriting

# Phase 3
npx skills add https://github.com/davila7/claude-code-templates --skill roier-seo

# Phase 4
npx skills add vercel/ai
```

**Custom CLI - add-skill** (2 skills):
```bash
# Phase 1
npx add-skill pproenca/dot-skills --skill zod

# Phase 3
npx add-skill https://github.com/daffy0208/ai-dev-standards/animation-designer
```

**Custom CLI - ui-skills** (1 skill):
```bash
# Phase 2
npx ui-skills add baseline-ui
# OR fallback:
npx skills add ibelick/ui-skills
```

**Custom CLI - pnpm** (1 skill):
```bash
# Phase 3
pnpx skills add antfu/skills --skill='vitest'
```

**Claude Code /plugin system** (6 skills):
```
# Phase 1
/plugin marketplace add https://github.com/jezweb/claude-skills
/plugin install tailwind-v4-shadcn@jezweb-skills

# Phase 2
/plugin marketplace add wshobson/agents
/plugin install accessibility-compliance  # Installs 2: wcag-audit-patterns, screen-reader-testing

# Phase 3
/plugin install developer-essentials  # Installs 2: error-handling-patterns, code-review-excellence
/plugin install backend-development  # Installs 1: api-design-principles

# Phase 4
/plugin install document-skills@anthropic-agent-skills
```

**Manual ZIP installation** (1 skill):
```bash
# Phase 2
mkdir -p ~/.claude-code/skills/ux-writing
curl -L https://github.com/content-designer/ux-writing-skill/raw/main/dist/ux-writing-skill.zip -o /tmp/ux-writing-skill.zip
unzip /tmp/ux-writing-skill.zip -d ~/.claude-code/skills/ux-writing
rm /tmp/ux-writing-skill.zip
```

---

## Performance Considerations

**Skill Loading Impact**:
- Each skill adds ~50-500 tokens to context
- 19 new skills ≈ 1K-10K additional tokens
- Current custom skills (5): ~1K tokens
- Expected total: ~2K-11K tokens from skills
- Context budget: 200K tokens available
- **Impact**: Negligible (<6% of context budget)

**Recommendation**: Monitor `/context` output after all phases complete. If token usage becomes a concern, consider:
1. Removing duplicate/overlapping skills
2. Consolidating similar skills
3. Using skills selectively via explicit invocation

---

## Migration Notes

**No migration required** — This is additive only:
- Existing custom skills remain unchanged
- No code changes needed in project
- Skills enhance Claude Code's capabilities without modifying codebase
- Reversible: Skills can be removed by deleting directories

---

## Known Issues & Workarounds

### Issue 1: Multiple Installation Systems
**Problem**: Different skills use incompatible installation methods
**Workaround**: Follow installation method specified per skill in this plan

### Issue 2: Plugin Commands in Bash
**Problem**: `/plugin` commands may not work from bash terminal
**Workaround**: Run /plugin commands from within Claude Code CLI interface, not bash

### Issue 3: Skill Name Variations
**Problem**: Skill names may differ from repo names (e.g., accelint-nextjs-best-practices)
**Workaround**: Accept actual installed name, document variance

### Issue 4: Manual Installation Requires Restart
**Problem**: Manually installed skills (ux-writing) may not load until restart
**Workaround**: Restart Claude Code after manual installation

---

## Post-Installation Checklist

After completing all phases:

### Verification:
- [x] Run `/context` shows 27 total skills (5 custom + 22 new, including 3 bonus from ibelick)
- [x] No error messages when Claude Code starts
- [x] All skill directories exist in `.claude/skills/` (symlinked from `.agents/skills/`)
- [x] roier-seo post-install npm dependencies exist
- [x] `yarn check` passes clean (added `.agents` to ESLint ignores)
- [x] Added `.agents/` to `.gitignore`

### Testing:
- [ ] Test react-best-practices by asking for component review
- [ ] Test wcag-audit-patterns by requesting accessibility audit
- [ ] Test roier-seo by requesting SEO analysis
- [ ] Test ai-sdk by asking about Vercel AI SDK usage
- [ ] Test copywriting by requesting CTA improvements

### Documentation:
- [x] No installation failures — all skills installed successfully via `npx skills add`
- [x] No workarounds needed — `/plugin` commands were unnecessary, standard npx worked for all
- [ ] Update thoughts/research/skills-sh-review-checklist.md with installation status

### Maintenance:
- [ ] Set reminder to update skills quarterly
- [ ] Monitor skills.sh for updates to installed skills
- [ ] Watch for new versions of high-impact skills (react-best-practices, nextjs-best-practices)

---

## References

- Original research: `thoughts/research/skills-sh-review-checklist.md`
- Skills.sh platform: https://skills.sh
- Installation commands source: Web research via @agent-web-search-researcher
- Claude Code skills documentation: https://docs.anthropic.com/claude/docs/skills
