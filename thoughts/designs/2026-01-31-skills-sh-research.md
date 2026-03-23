# skills.sh Research Summary

**Date:** 2026-01-31
**Purpose:** Comprehensive review of Vercel's skills.sh ecosystem to identify skills relevant to Rekurve's Next.js landing page project.

---

## Overview

**skills.sh** is Vercel's "npm for AI agents" - an open ecosystem with 34,000+ skills that extend AI coding agent capabilities. Skills are modular packages containing instructions, scripts, and resources that agents load dynamically.

**Research scope:** Reviewed 40+ skills across 4 batches, focusing on relevance to our stack:
- Next.js 15.2.3 (App Router) + React 19
- Tailwind CSS 4.0.15
- TypeScript
- Playwright E2E tests
- PostHog analytics
- Vercel deployment

---

## Priority Tiers

### Tier 1: High Priority (Immediate Value)

| Skill | Source | Installs | Why |
|-------|--------|----------|-----|
| **react-best-practices** | vercel-labs/agent-skills | 71.6K | 57 rules for React/Next.js performance - waterfalls, bundle size, RSC |
| **web-design-guidelines** | vercel-labs/agent-skills | 43K | 100+ UI compliance rules, typography standards |
| **tailwind-v4-shadcn** | jezweb/claude-skills | 646 | Tailwind v4 + shadcn setup - addresses 8 common config errors |
| **wcag-audit-patterns** | wshobson/agents | 627 | WCAG 2.2 accessibility audits |
| **screen-reader-testing** | wshobson/agents | 641 | VoiceOver, NVDA, JAWS testing patterns |
| **secure-claude-skills** | harperaa/secure-claude-skills | - | 14 security skills for Next.js - OWASP 90/100 |
| **baseline-ui** | ibelick/ui-skills | 614 | Prevents AI slop, enforces animation/z-index constraints |
| **frontend-design** | anthropics/skills | - | Distinctive fonts, anti-generic aesthetics |

**Installation (Tier 1):**
```bash
npx skills add vercel-labs/agent-skills --skill react-best-practices
npx skills add vercel-labs/agent-skills --skill web-design-guidelines
npx skills add jezweb/claude-skills --skill tailwind-v4-shadcn
npx skills add wshobson/agents --skill wcag-audit-patterns
npx skills add wshobson/agents --skill screen-reader-testing
npx skills add ibelick/ui-skills --skill baseline-ui
npx skills add anthropics/skills --skill frontend-design
# secure-claude-skills requires separate install - see deep-dive section
```

---

### Tier 2: Medium Priority (Strong Value)

| Skill | Source | Installs | Why |
|-------|--------|----------|-----|
| **composition-patterns** | vercel-labs/agent-skills | - | Compound components, avoid boolean props |
| **animation-designer** | daffy0208/ai-dev-standards | - | Framer Motion + `useReducedMotion()` patterns |
| **zod** | pproenca/dot-skills | - | 43 rules for schema validation |
| **roier-seo** | davila7/claude-code-templates | 67 | Auto-fix SEO for Next.js, Open Graph |
| **copywriting** | coreyhaines31/marketingskills | - | Benefits over features, CTA best practices |
| **ux-writing** | content-designer/ux-writing-skill | - | 40+ UI patterns, error messages, microcopy |
| **code-review-excellence** | wshobson/agents | - | Complements design-reviewer for code PRs |
| **error-handling-patterns** | wshobson/agents | 977 | Circuit breaker, graceful degradation |
| **vitest** | antfu/skills | 1.4K | Jest-compatible, native ESM/TS support |
| **skill-creator** | anthropics/skills | - | Meta-skill for building custom skills |

**Installation (Tier 2):**
```bash
npx skills add vercel-labs/agent-skills --skill composition-patterns
npx skills add daffy0208/ai-dev-standards --skill animation-designer
npx skills add pproenca/dot-skills --skill zod
npx skills add davila7/claude-code-templates --skill roier-seo
npx skills add coreyhaines31/marketingskills --skill copywriting
npx skills add antfu/skills --skill vitest
npx skills add wshobson/agents --skill error-handling-patterns
npx skills add wshobson/agents --skill code-review-excellence
npx skills add anthropics/skills --skill skill-creator
# ux-writing requires manual install from content-designer/ux-writing-skill
```

---

### Tier 3: Low Priority (Future Value)

| Skill | Source | Installs | When Needed |
|-------|--------|----------|-------------|
| **stripe-best-practices** | stripe/agent-toolkit | - | When adding payments |
| **prisma** | prisma/prisma-skills | - | When adding database |
| **supabase** | supabase/supabase-skills | - | When adding BaaS |
| **better-auth** | better-auth/better-auth-skills | - | When adding auth |
| **linear** | linear/linear-skills | - | If switching from GitHub Projects |
| **storybook** | storybookjs/storybook-skills | - | When adding component docs |
| **github-actions-templates** | wshobson/agents | 921 | When enhancing CI/CD |
| **sentry-for-claude** | getsentry/sentry-for-claude | - | When adding error monitoring |
| **analytics-tracking** | coreyhaines31/marketingskills | 3K | When adding GA4/Mixpanel |
| **remotion-best-practices** | remotion/remotion-skills | 51.6K | When adding programmatic video |
| **mcp-builder** | anthropics/skills | 3.5K | When building MCP servers |

---

## Deep-Dive Required: secure-claude-skills

**Repository:** [harperaa/secure-claude-skills](https://github.com/harperaa/secure-claude-skills)

**Why flagged:** Enterprise-grade defense-in-depth security controls specifically designed for Next.js. Claims OWASP 90/100 score.

**14 Sub-Skills:**
| Skill | Security Controls |
|-------|-------------------|
| security-overview | Defense-in-depth framework |
| csrf-protection | Token validation, form protection |
| rate-limiting | Request throttling, brute force defense |
| input-validation | Sanitization, XSS prevention |
| security-headers | CSP, XSS protection headers |
| error-handling | Generic messages, safe logging |
| auth-security | Clerk integration, session management |
| payment-security | PCI compliance, Stripe security |
| dependency-security | Vulnerability auditing |
| security-testing | Automated security tests |
| security-awareness | 7 sub-skills covering OWASP vulnerabilities |

**Install command:**
```bash
npx secure-claude-skills init
```

**Action:** Schedule dedicated session to review each sub-skill and integrate relevant patterns into project.

---

## Comparisons to Existing `.claude/` Config

### `frontend-design` vs Found Skills

| Feature | Our `frontend-design` | `baseline-ui` | `frontend-design` | `web-design-guidelines` |
|---------|---------------------|---------------|-------------------|------------------------|
| Anti-AI-slop | Custom rules | Explicit constraints | Strong emphasis | - |
| Font restrictions | Brand fonts only | No Inter/Roboto | No Arial/Inter/Roboto | Typography rules |
| Animation limits | `prefers-reduced-motion` | <200ms, compositor only | High-impact moments | - |
| Z-index scale | - | Fixed scale required | - | - |
| Touch targets | - | - | - | - |
| Gradient restrictions | - | No gradients unless asked | - | - |
| `text-balance/pretty` | - | Required for headings/body | - | Required |

**Gaps to fill in `frontend-design`:**
1. Add fixed z-index scale (10, 20, 30, 40, 50)
2. Add "no gradients unless explicit" rule
3. Add `text-balance` for headings, `text-pretty` for body
4. Add 44x44px minimum touch target requirement
5. Add compositor-only animation rule (transform, opacity only)

---

### `writing-clearly-and-concisely` vs Found Skills

| Feature | Our skill | `copywriting` | `ux-writing` |
|---------|-----------|---------------|--------------|
| Focus | General prose (Strunk) | Marketing/landing pages | UI microcopy |
| CTA guidance | - | Specific action verbs | Verb-first pattern |
| Error messages | - | - | 4 error types covered |
| Empty states | - | - | Headline + explanation + CTA |
| Page structure | - | Section-by-section framework | - |

**Recommendation:** Keep current skill for docs/commits. Add:
- `copywriting` for landing page iterations
- `ux-writing` for UI text and error messages

---

### `design-reviewer` vs Found Skills

| Feature | Our `design-reviewer` | `code-review-excellence` | `web-design-guidelines` |
|---------|----------------------|-------------------------|------------------------|
| Focus | Visual/UX via Playwright | Code quality/logic | UI compliance rules |
| Severity labels | Blocker/High/Medium/Nit | Emoji-based system | Violations list |
| Output | Screenshots + report | PR comments | `file:line` format |

**Enhancement opportunity:** Adopt emoji severity labels:
- 🔴 `[blocking]` - Must fix before merge
- 🟡 `[important]` - Should fix, discuss if disagree
- 🟢 `[nit]` - Nice to have, not blocking
- 💡 `[suggestion]` - Alternative approach
- 📚 `[learning]` - Educational, no action needed
- 🎉 `[praise]` - Good work acknowledgment

---

### `/commit` vs Found Skills

| Feature | Our `/commit` | `conventional-commits` | Anthropic `commit` |
|---------|---------------|------------------------|-------------------|
| Format | Free-form + Co-Author | `<type>(<scope>): <subject>` | `<type>(<scope>): <subject>` |
| Types | Not enforced | feat, fix, docs, etc. | feat, fix, ref, perf, etc. |
| Versioning | Manual | Enables auto SEMVER | Manual |
| Issue refs | Not specified | `Fixes #123` | `Fixes GH-1234` |

**Recommendation:** Consider adding commit type prefix convention for future automated changelog generation.

---

## Skills Not Needed

| Skill | Reason |
|-------|--------|
| PostHog | No skill exists - our implementation is comprehensive |
| vercel-deploy | For quick deploys without auth - we have CI/CD |
| Radix UI standalone | No dedicated skill - shadcn-ui covers via Radix primitives |
| programmatic-seo | For scale pages (directories) - not single landing page |
| caching-strategies | Rails 8 focused - not applicable |

---

## Key Patterns Discovered

### 1. Vercel's React Performance Rules (57 rules, 8 categories)

**Priority order:**
1. CRITICAL: Eliminating waterfalls - defer awaits, use `Promise.all()`
2. CRITICAL: Bundle size - avoid barrel imports, dynamic imports
3. HIGH: Server-side - `React.cache()`, minimize RSC serialization
4. MEDIUM-HIGH: Client data fetching - SWR, event listener deduplication
5. MEDIUM: Re-render optimization - derived state, memoization
6. MEDIUM: Rendering performance - DOM updates, hydration
7. LOW-MEDIUM: JavaScript performance - cache property access
8. LOW: Advanced patterns - refs, initialization

### 2. Tailwind v4 Breaking Changes

**Must do:**
- Wrap colors with `hsl()` in `:root` and `.dark`
- Use `@theme inline` to map CSS variables
- Set `"tailwind.config": ""` in components.json
- Delete `tailwind.config.ts`
- Use `@tailwindcss/vite` plugin

**Never do:**
- Place `:root`/`.dark` inside `@layer base`
- Double-wrap colors: `hsl(var(--background))`
- Use `@apply` with `@layer base` (use `@utility` instead)

### 3. Animation Best Practices

**Rules from multiple skills:**
- Only animate compositor properties (transform, opacity)
- Keep interactions under 200ms
- Respect `prefers-reduced-motion` via `useReducedMotion()` hook
- Default to visible browser mode for debugging
- Use spring physics for bouncy interactions
- Easing: `easeOut` for natural motion

### 4. Security Checklist (from multiple skills)

1. Secrets: Never hardcode; use env vars; gitignore .env.local
2. Input: Schema validation (Zod); file uploads: 5MB limit, MIME verification
3. SQL: Parameterized queries only; never concatenate user input
4. Auth: JWT in httpOnly cookies (not localStorage); RLS in Supabase
5. XSS: DOMPurify sanitization; CSP headers
6. CSRF: CSRF tokens; SameSite=Strict cookies
7. Rate limiting: Throttle API endpoints
8. Errors: Generic messages to users; detailed logs server-side
9. Dependencies: Regular updates; commit lock files

---

## Next Steps

1. **Immediate:** Install Tier 1 skills and test compatibility
2. **This week:** Deep-dive on `secure-claude-skills`
3. **This sprint:** Update `frontend-design` with identified gaps
4. **Backlog:** Create custom skill combining best patterns

---

## Sources

### Official Repositories
- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) - Vercel's official skills
- [anthropics/skills](https://github.com/anthropics/skills) - Anthropic's official skills
- [stripe/agent-toolkit](https://github.com/stripe/agent-toolkit) - Stripe integration
- [prisma/prisma-skills](https://github.com/prisma/prisma-skills) - Prisma ORM
- [supabase/supabase-skills](https://github.com/supabase/supabase-skills) - Supabase BaaS
- [linear/linear-skills](https://github.com/linear/linear-skills) - Linear issue tracking
- [remotion/remotion-skills](https://github.com/remotion/remotion-skills) - Programmatic video
- [cloudflare/cloudflare-skills](https://github.com/cloudflare/cloudflare-skills) - Web performance

### Community Repositories
- [wshobson/agents](https://github.com/wshobson/agents) - 129 skills across 27 plugins
- [ibelick/ui-skills](https://github.com/ibelick/ui-skills) - UI quality enforcement
- [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) - Marketing/copywriting
- [jezweb/claude-skills](https://github.com/jezweb/claude-skills) - Tailwind v4 + shadcn
- [harperaa/secure-claude-skills](https://github.com/harperaa/secure-claude-skills) - Security (14 skills)
- [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates) - SEO tools
- [antfu/skills](https://github.com/antfu/skills) - Vitest + Vue ecosystem
- [content-designer/ux-writing-skill](https://github.com/content-designer/ux-writing-skill) - UX writing
- [daffy0208/ai-dev-standards](https://github.com/daffy0208/ai-dev-standards) - Animation patterns
- [pproenca/dot-skills](https://github.com/pproenca/dot-skills) - Zod validation

### Aggregators
- [skills.sh](https://skills.sh/) - The Agent Skills Directory
- [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) - 172+ curated skills
- [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills) - Community catalog
