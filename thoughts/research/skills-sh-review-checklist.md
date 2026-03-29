# skills.sh Review Checklist

**Started:** 2026-01-31
**Last Updated:** 2026-02-02
**Total skills on skills.sh:** 35,746+
**Reviewed:** 90
**Remaining:** ~1,000+

---

## Reviewed Skills

### Batch 1: Core Stack (10 skills)

- [x] **next-js** (gohypergiant/agent-skills) — ADOPT: Server Components, Server Actions security, parallel data fetching for Next.js 15
- [x] **react** (vercel-labs/agent-skills) — ADOPT: 57 rules across 8 categories, #1 priority for performance
- [x] **tailwind-css** → **tailwind-v4-shadcn** (jezweb/claude-skills) — ADOPT: Tailwind v4 breaking changes, CSS-first config
- [x] **posthog** — SKIP: No skill exists, our implementation is comprehensive
- [x] **playwright** (lackeyjb/playwright-skill) — CONSIDER: Complements E2E but we have ui-navigator agent
- [x] **typescript** → **typescript-advanced-types** (wshobson/agents) — CONSIDER: Advanced generics, conditional types
- [x] **vercel** → **vercel-deploy** (vercel-labs/agent-skills) — SKIP: For quick deploys without auth, we have CI/CD
- [x] **accessibility** → **wcag-audit-patterns** (wshobson/agents) — ADOPT: WCAG 2.2 audit patterns
- [x] **accessibility** → **screen-reader-testing** (wshobson/agents) — ADOPT: VoiceOver, NVDA, JAWS testing
- [x] **code-review** → **code-review-excellence** (wshobson/agents) — ADOPT: Complements design-reviewer for code PRs
- [x] **performance-optimization** (korallis/Droidz) — CONSIDER: Core Web Vitals, overlaps with react-best-practices

### Batch 2: UI, Validation, Security, SEO (10 skills)

- [x] **shadcn-ui** (giuseppe-trisciuoglio/developer-kit) — CONSIDER: General shadcn patterns if adding components
- [x] **radix-ui** — SKIP: No standalone skill, shadcn-ui covers via Radix primitives
- [x] **framer-motion** → **animation-designer** (daffy0208/ai-dev-standards) — ADOPT: useReducedMotion() patterns
- [x] **framer-motion** → **design-motion-principles** (kylezantos/design-motion-principles) — CONSIDER: Motion audit tool
- [x] **framer-motion** → **fixing-motion-performance** (ibelick/ui-skills) — CONSIDER: Performance constraints
- [x] **zod** (pproenca/dot-skills) — ADOPT: 43 rules for schema validation with @t3-oss/env-nextjs
- [x] **eslint** → **eslint-checker** (jmagly/ai-writing-guide) — CONSIDER: Safe ESLint execution, but we have yarn check
- [x] **sentry** → **sentry-for-claude** (getsentry/sentry-for-claude) — FUTURE: When adding error monitoring
- [x] **web-security** → **secure-claude-skills** (harperaa/secure-claude-skills) — ADOPT: 14 security skills, OWASP 90/100 (DEEP-DIVE FLAGGED)
- [x] **seo** → **roier-seo** (davila7/claude-code-templates) — ADOPT: Auto-fix SEO for Next.js, Open Graph
- [x] **github-actions** → **github-actions-templates** (wshobson/agents) — FUTURE: When enhancing CI/CD
- [x] **responsive-design** (wshobson/agents) — CONSIDER: Container queries, fluid typography

### Batch 3: Testing, Payments, Databases (10 skills)

- [x] **vitest** (antfu/skills) — ADOPT: 1.4K installs, Jest-compatible, native ESM/TS
- [x] **jest** → **jest-testing-patterns** (wshobson/agents) — CONSIDER: AAA pattern, mocking, React testing
- [x] **storybook** (storybookjs/storybook-skills) — FUTURE: When adding component documentation
- [x] **stripe** → **stripe-best-practices** (stripe/agent-toolkit) — FUTURE: When adding payments
- [x] **hubspot** — SKIP: No skill found on skills.sh
- [x] **linear** (linear/linear-skills) — SKIP: Using GitHub Projects, not needed
- [x] **git** → **conventional-commits** (wshobson/agents) — CONSIDER: Semantic commits for auto-versioning
- [x] **prisma** (prisma/prisma-skills) — FUTURE: When adding database
- [x] **supabase** (supabase/supabase-skills) — FUTURE: When adding BaaS
- [x] **documentation** → **commit** (anthropics/skills) — CONSIDER: Anthropic's commit conventions
- [x] **documentation** → **pr-description** (anthropics/skills) — SKIP: We have /describe_pr already

### Batch 4: Error Handling, UI Design, Writing (18 skills)

- [x] **error-handling-patterns** (wshobson/agents) — ADOPT: Circuit breaker, graceful degradation, retry
- [x] **logging-observability** (wshobson/agents) — CONSIDER: Structured logging, distributed tracing
- [x] **api-design-patterns** (wshobson/agents) — CONSIDER: REST/GraphQL, versioning, rate limiting
- [x] **caching-strategies** (wshobson/agents) — SKIP: Rails 8 focused, not applicable
- [x] **web-design-guidelines** (vercel-labs/agent-skills) — ADOPT: 56K installs, 100+ UI compliance rules
- [x] **baseline-ui** (ibelick/ui-skills) — ADOPT: Prevents AI slop, animation/z-index constraints
- [x] **frontend-design** (anthropics/skills) — ADOPT: Distinctive fonts, anti-generic aesthetics (patterns merged into frontend-design)
- [x] **composition-patterns** (vercel-labs/agent-skills) — ADOPT: Compound components, avoid boolean props
- [x] **web-perf** (cloudflare/cloudflare-skills) — CONSIDER: Core Web Vitals audit via DevTools MCP
- [x] **image-optimization** (wshobson/agents) — CONSIDER: Hero <200KB, WebP with fallbacks
- [x] **form-validation-patterns** — SKIP: Skill doesn't exist
- [x] **mcp-builder** (anthropics/skills) — FUTURE: When building MCP servers
- [x] **skill-creator** (anthropics/skills) — ADOPT: Meta-skill for building custom skills
- [x] **copywriting** (coreyhaines31/marketingskills) — ADOPT: Benefits over features, CTA best practices
- [x] **ux-writing** (content-designer/ux-writing-skill) — ADOPT: 40+ UI patterns, error messages
- [x] **typography** → Various skills found — CONSIDER: Font loading, typography scale patterns
- [x] **remotion-best-practices** (remotion/remotion-skills) — FUTURE: 51K installs, if adding video
- [x] **analytics-tracking** (coreyhaines31/marketingskills) — FUTURE: GA4, Mixpanel patterns
- [x] **better-auth** → **better-auth-best-practices** (better-auth/skills) — ADOPT: 29.5K installs. Auth.js maintainers joined better-auth Sep 2025; recommended for new projects. Magic link, email OTP, Drizzle adapter built-in. **Installed.**
- [ ] **better-auth** → **better-auth-security-best-practices** (better-auth/skills) — CONSIDER: 5.9K installs. Security hardening patterns for better-auth.
- [ ] **better-auth** → **email-and-password-best-practices** (better-auth/skills) — SKIP: 6.9K installs. Using email OTP, not email/password.
- [ ] **better-auth** → **organization-best-practices** (better-auth/skills) — FUTURE: 6.4K installs. Multi-tenant/orgs — out of scope for pilot.
- [ ] **better-auth** → **two-factor-authentication-best-practices** (better-auth/skills) — FUTURE: 5.9K installs. 2FA not needed for pilot.
- [ ] **better-auth** → **create-auth-skill** (better-auth/skills) — SKIP: 11.5K installs. Meta-skill for creating auth skills, not applicable.
- [x] **notion** (notion/notion-skills) — SKIP: Not using Notion

### Batch 5: Data Fetching, Testing, Infrastructure (10 skills)

- [x] **react-query** / **tanstack-query** (jezweb/claude-skills) — FUTURE: 984 installs, React 19 SSR hydration docs, not needed for landing page
- [x] **react-testing-library** → **javascript-testing-patterns** (wshobson/agents) — CONSIDER: 20.8K installs, AAA pattern, React Testing Library, Vitest
- [x] **cypress** (wshobson/agents) — SKIP: 1,048 installs, already using Playwright which is faster with better Safari support
- [x] **docker** (sickn33/antigravity-awesome-skills) — SKIP: 692 installs, Vercel doesn't use Docker
- [x] **cloudflare-workers** (cloudflare/skills) — SKIP: 481 installs, on Vercel, patterns don't transfer
- [x] **google-analytics** → **analytics-tracking** (coreyhaines31/marketingskills) — SKIP: 3K installs, already using PostHog
- [x] **segment** — SKIP: No dedicated skill exists, PostHog is sufficient for pre-PMF
- [x] **css** → **web-design-guidelines** (vercel-labs) — ADOPT: Already covered, 56K installs, includes CSS patterns
- [x] **html** → **web-design-guidelines** (vercel-labs) — ADOPT: Already covered, includes semantic HTML
- [x] **svg** — SKIP: No dedicated skill, react-best-practices covers SVG animation basics

### Batch 6: JavaScript, Package Managers, UI Design (10 skills)

- [x] **es6** → **modern-javascript-patterns** (wshobson/agents) — CONSIDER: 27.4K stars, ES6+ patterns, async/await, destructuring
- [x] **node-js** → **nodejs-best-practices** (davila7/claude-code-templates) — SKIP: 85 installs, Vercel skills better for Next.js
- [x] **yarn** / **npm** / **pnpm** — SKIP: No good Yarn 3 PnP skill exists, CLAUDE.md is sufficient
- [x] **vite** / **webpack** (antfu/skills) — SKIP: 1.7K installs, Next.js uses Turbopack, patterns don't apply
- [x] **unit-testing** → **javascript-testing-patterns** (wshobson/agents) — CONSIDER: Already noted above
- [x] **ui-design** / **ux-design** → **ui-ux-pro-max** (nextlevelbuilder) — PATTERNS EXTRACTED: 7.9K installs, 67 styles, 96 palettes - key patterns merged into frontend-design skill
- [x] **progressive-web-apps** — FUTURE: No strong skill, use Serwist when needed
- [x] **oauth** / **jwt** → **better-auth** (Microck) — ADOPT: Auth.js team joined better-auth; first-class magic link, OTP, passkeys, Drizzle adapter
- [x] **rest-api** → **api-design-principles** (wshobson/agents) — ADOPT: 25.7K downloads, REST + GraphQL patterns
- [x] **graphql** — FUTURE: No prominent skill, use Apollo Client + Next.js docs when needed

### Batch 7: AI/LLM, Databases, Tooling (10 skills)

- [x] **openai** / **chatgpt** — SKIP: No dedicated skill, OpenRouter provides multi-model access if needed
- [x] **langchain** → **langchain-architecture** (wshobson/agents) — FUTURE: 809 installs, ReAct agents, LangGraph, multi-agent systems
- [x] **figma** → **implement-design** (figma/mcp-server-guide) — FUTURE: 314 installs, 7-step design-to-code workflow
- [x] **postgresql** → **supabase-postgres-best-practices** (supabase/agent-skills) — FUTURE: 7,794 installs (#13), connection pooling, RLS
- [x] **postgresql** → **pg-aiguide** (timescale/pg-aiguide) — FUTURE: 196 stars, version-aware docs PG15-18, deep schema patterns
- [x] **redis** → **redis-js** (upstash/redis-js) — FUTURE: 38 installs, edge-compatible caching for Next.js
- [x] **datadog** / **monitoring** — FUTURE: New skills with low adoption, wait for maturity
- [x] **markdown** → **agent-md-refactor** (softaworks/agent-toolkit) — CONSIDER: 2K installs, for managing CLAUDE.md as it grows
- [x] **anthropic** / **claude-api** — SKIP: No skill exists, use official docs and SDK
- [x] **prompt-engineering** → **prompt-coach** (hancengiz) — CONSIDER: 130 stars, analyzes your Claude Code sessions for vague prompts
- [x] **mcp** → **mcp-builder** (anthropics/skills) — FUTURE: Already noted, for building MCP servers

### Batch 8: Frontend, DevOps, Marketing, Quality (10 skills)

- [x] **react-router** — SKIP: Not needed, Next.js App Router handles routing
- [x] **css-grid** — SKIP: Covered by web-design-guidelines (vercel-labs)
- [x] **css-modules** — SKIP: No skill exists, using Tailwind not CSS Modules
- [x] **web-components** — SKIP: No relevant skill, using React components
- [x] **web-accessibility** → **accessibility-engineer** (daffy0208/ai-dev-standards) — PATTERNS EXTRACTED: 7 pillars, mindset framing merged into design-checklist.md
- [x] **docker-compose** — SKIP: Not needed, Vercel handles infrastructure
- [x] **kubernetes** — SKIP: Not needed, Vercel handles scaling
- [x] **terraform** — SKIP: Not needed, Vercel handles infrastructure
- [x] **google-tag-manager** → **claude-skill-gtm-javascript** (ekusiadadus) — FUTURE: ES5-only code generation for GTM Custom HTML tags, Consent Mode v2. Flag for marketing integrations.
- [x] **hotjar** — SKIP: No skill exists, use PostHog for behavior analytics
- [x] **mixpanel** / **amplitude** — SKIP: No skills on skills.sh, MCP integrations exist from Composio if needed
- [x] **web-quality** → **web-quality-skills** (addyosmani) — PATTERNS EXTRACTED: 96 stars, 150+ Lighthouse audits. Performance patterns merged into frontend-design SKILL.md.

---

## Remaining Skills to Review

**COMPLETE** ✓ - All skills reviewed as of 2026-02-02

### Batch 9: Databases, AI/ML, CMS, Communication, Design (12 skills)

#### Databases
- [x] **mongodb** → **database-architect** (rmyndharis) — FUTURE: 17 installs, general DB architecture. Gap: No Mongoose+TypeScript skill. Create custom when needed.
- [x] **elasticsearch** — SKIP: No dedicated skill. MCP servers exist (Elastic, Meilisearch, Algolia). `qmd` for local vector search.

#### AI/ML
- [x] **hugging-face** → **huggingface/skills** — FUTURE: Official HF repo with 8 skills (cli, datasets, evaluation, jobs, model-trainer, etc). Gap: No HF Inference + Next.js skill.
- [x] **machine-learning** → **wshobson/agents ML skills** — FUTURE: `rag-implementation` (987), `langchain-architecture` (945), `embedding-strategies` (768). Highly relevant for AI sales agents.
- [x] **ai-sdk** (vercel/ai) — **ADOPT**: 2,300 installs. TypeScript-native AI SDK for Next.js. Streaming, agents, model selection. **NEW DISCOVERY**

#### CMS & Content
- [x] **contentful** — SKIP: No skill exists. Sanity has better Claude Code support.
- [x] **sanity** → **sanity-io/agent-toolkit** — FUTURE: 64 stars, official toolkit + MCP server. Next.js-specific rules, GROQ optimization. Best CMS option for Claude Code.
- [x] **strapi** — SKIP: No skill. `openapi-to-typescript` (1.1M installs) could help with Strapi API types.

#### E-commerce
- [x] **shopify** → **Shopify Dev MCP Server** — FUTURE: Official MCP with 8 tools for GraphQL validation. No Next.js+Storefront skill exists.

#### Communication
- [x] **slack** → **slack-gif-creator** (anthropics) — SKIP: 2.4K installs, only for GIFs. No Bolt SDK or webhook skill exists.
- [x] **discord** — SKIP: No skills.sh skill. MCP Market has third-party options.
- [x] **twilio** → **Twilio MCP Server** (twilio-labs/mcp) — FUTURE: 84 stars, official MCP. Exposes all Twilio APIs. 20.5% faster task completion.

#### Design Tools
- [x] **sketch** — SKIP: No skill. Sketch MCP Server exists but limited. **Figma implement-design** (362 installs) is better alternative.

---

## Review Statistics

| Status | Count |
|--------|-------|
| **Reviewed** | **102** |
| ADOPT | 22 |
| CONSIDER | 18 |
| FUTURE | 22 |
| SKIP | 37 |
| PATTERNS EXTRACTED | 4 |
| High Priority Remaining | 0 |
| Medium Priority Remaining | 0 |
| Low Priority Remaining | 0 |
| Not Relevant | ~900+ |

**Review Complete**: All priority skills reviewed as of 2026-02-02

---

## Quick Reference: Adoption Decisions

### ADOPT (Install Now) - 21 skills
1. react-best-practices (vercel-labs) — 74K installs
2. web-design-guidelines (vercel-labs) — 56K installs
3. tailwind-v4-shadcn (jezweb) — Tailwind v4 breaking changes
4. wcag-audit-patterns (wshobson)
5. screen-reader-testing (wshobson)
6. baseline-ui (ibelick)
7. frontend-design (anthropics) — Merged into frontend-design
8. composition-patterns (vercel-labs)
9. animation-designer (daffy0208)
10. zod (pproenca)
11. roier-seo (davila7)
12. error-handling-patterns (wshobson)
13. vitest (antfu)
14. code-review-excellence (wshobson)
15. skill-creator (anthropics)
16. copywriting (coreyhaines31)
17. ux-writing (content-designer)
18. secure-claude-skills (harperaa) — DEEP-DIVE REQUIRED
19. nextjs-best-practices (gohypergiant) — Moved from CONSIDER
20. api-design-principles (wshobson) — 25.7K downloads
21. **ai-sdk** (vercel/ai) — 2,300 installs, TypeScript-native AI SDK for Next.js
22. **better-auth** (better-auth/better-auth-skills) — Auth.js team joined better-auth Sep 2025; magic link, OTP, Drizzle adapter built-in

### CONSIDER (Evaluate Further) - 18 skills
1. playwright-skill (lackeyjb)
2. typescript-advanced-types (wshobson)
3. shadcn-ui (giuseppe-trisciuoglio)
4. design-motion-principles (kylezantos)
5. fixing-motion-performance (ibelick)
6. eslint-checker (jmagly)
7. responsive-design (wshobson)
8. jest-testing-patterns (wshobson)
9. conventional-commits (wshobson)
10. logging-observability (wshobson)
11. web-perf (cloudflare)
12. image-optimization (wshobson)
13. performance-optimization (korallis/Droidz)
14. typography patterns
15. javascript-testing-patterns (wshobson) — 20.8K installs
16. modern-javascript-patterns (wshobson) — 27.4K stars
17. agent-md-refactor (softaworks) — 2K installs
18. prompt-coach (hancengiz) — 130 stars

### FUTURE (When Needed) - 23 skills
1. sentry-for-claude — Error monitoring
2. github-actions-templates — CI/CD enhancement
3. storybook — Component docs
4. stripe-best-practices — Payments
5. prisma — Database ORM
6. supabase — BaaS
7. mcp-builder — MCP servers
8. remotion-best-practices — Video
9. analytics-tracking — GA4/Mixpanel
10. ~~better-auth~~ — Moved to ADOPT
11. tanstack-query — Data fetching
12. langchain-architecture (wshobson) — AI agent orchestration (945 installs)
13. figma implement-design — Design handoff (362 installs)
14. supabase-postgres-best-practices — Database (7.8K installs)
15. pg-aiguide — PostgreSQL deep patterns
16. redis-js — Edge caching
17. claude-skill-gtm-javascript (ekusiadadus) — ES5 code generation for GTM, Consent Mode v2
18. **database-architect** (rmyndharis) — General DB architecture (17 installs)
19. **huggingface/skills** — HF CLI, datasets, evaluation, model-trainer (official repo)
20. **rag-implementation** (wshobson) — RAG patterns for AI agent knowledge bases (987 installs)
21. **embedding-strategies** (wshobson) — Semantic search patterns (768 installs)
22. **sanity-io/agent-toolkit** — Official Sanity MCP + Next.js rules (64 stars)
23. **Twilio MCP Server** (twilio-labs/mcp) — Official SMS/Voice/WhatsApp (84 stars)

### SKIP (Not Needed) - 37 skills
1. posthog — No skill exists
2. vercel-deploy — Have CI/CD
3. radix-ui — Covered by shadcn-ui
4. hubspot — No skill found
5. linear — Using GitHub Projects
6. pr-description — Have /describe_pr
7. caching-strategies — Rails focused
8. form-validation-patterns — Doesn't exist
9. notion — Not using
10. cypress — Using Playwright
11. docker — Vercel doesn't use it
12. cloudflare-workers — On Vercel
13. google-analytics — Using PostHog
14. segment — No skill, PostHog sufficient
15. svg — No dedicated skill
16. nodejs-best-practices — Generic, Vercel skills better
17. yarn/npm/pnpm — No good Yarn 3 PnP skill
18. vite/webpack — Using Turbopack
19. react-router — Next.js App Router handles routing
20. css-grid — Covered by web-design-guidelines
21. css-modules — Using Tailwind, not CSS Modules
22. web-components — Using React components
23. docker-compose — Vercel handles infrastructure
24. kubernetes — Vercel handles scaling
25. terraform — Vercel handles infrastructure
26. hotjar — No skill exists, use PostHog
27. mixpanel — No skill on skills.sh, MCP integrations exist
28. amplitude — No skill on skills.sh, MCP integrations exist
29. **elasticsearch** — No dedicated skill. MCP servers exist (Elastic, Meilisearch, Algolia)
30. **contentful** — No skill. Sanity has better Claude Code support
31. **strapi** — No skill. openapi-to-typescript could help with API types
32. **slack** — Only slack-gif-creator (2.4K), not useful. No Bolt SDK skill
33. **discord** — No skill on skills.sh. Third-party MCPs exist
34. **sketch** — No skill. Sketch MCP limited. Figma implement-design (362) is better
35. **mongodb** (custom) — Generic patterns exist, but no Mongoose+TypeScript skill. Create when needed
36. **shopify** (MCP only) — Official Shopify Dev MCP, no Next.js+Storefront skill
37. **twilio** (MCP only) — Official Twilio MCP (84 stars), no skill wrapper

### PATTERNS EXTRACTED - 4 skills
1. frontend-design (anthropics) — Spatial composition, scroll-triggering, complexity matching merged into frontend-design
2. ui-ux-pro-max (nextlevelbuilder) — Light/dark mode contrast rules, professional UI mistakes table merged into frontend-design
3. accessibility-engineer (daffy0208) — 7 pillars, mindset framing, WCAG patterns merged into design-checklist.md
4. web-quality-skills (addyosmani) — Animation performance patterns merged into frontend-design SKILL.md

---

## Improvements Made to Existing Skills

### frontend-design SKILL.md enhanced with:
- **From frontend-design**: Spatial Composition section (asymmetry, overlap, diagonal flow, grid-breaking)
- **From frontend-design**: Scroll-triggering guidance in Motion section
- **From frontend-design**: "Match complexity to vision" principle
- **From ui-ux-pro-max**: Common Professional UI Mistakes table
- **From ui-ux-pro-max**: Light/Dark Mode Contrast Rules table
- **From ui-ux-pro-max**: No emoji icons anti-pattern
- **From web-quality-skills (addyosmani)**: Animation performance patterns (transform/opacity only, debounce, requestAnimationFrame, prefers-reduced-motion)

### frontend-design design-checklist.md enhanced with:
- **From accessibility-engineer (daffy0208)**: Mindset framing ("Accessibility is a civil right, not a feature", 1 in 4 stats)
- **From accessibility-engineer**: New Section II with 7 Pillars of Accessibility:
  1. Semantic HTML (landmarks, heading hierarchy)
  2. Keyboard Navigation (focus trapping, skip links, tabIndex rules)
  3. ARIA Attributes (when to use, common attributes)
  4. Forms & Inputs (labels, error association)
  5. Color & Contrast (4.5:1, 3:1 ratios)
  6. Images & Media (alt text patterns)
  7. Testing (automated, manual keyboard, screen readers)
- **From accessibility-engineer**: Critical Issues checklist (fix first)

---

## Review Complete ✓

**Status**: All priority skills reviewed as of 2026-02-02

**Final Batch (9)**: Databases (mongodb, elasticsearch), AI/ML (hugging-face, machine-learning, ai-sdk), CMS (contentful, sanity, strapi, shopify), Communication (slack, discord, twilio), Design (sketch)

**Key Discoveries**:
- **ai-sdk** (Vercel) → ADOPT: 2,300 installs, TypeScript-native AI SDK for Next.js
- **wshobson ML skills** → FUTURE: rag-implementation (987), langchain-architecture (945), embedding-strategies (768)
- **Sanity Agent Toolkit** → FUTURE: 64 stars, official MCP + Next.js rules
- **Twilio MCP** → FUTURE: 84 stars, official SMS/Voice/WhatsApp
- **Hugging Face Skills** → FUTURE: Official repo with 8 skills (CLI, datasets, model-trainer)

**Major Gaps Identified**:
1. No Mongoose + TypeScript skill (use database-architect or create custom)
2. No Next.js + Shopify Storefront skill (MCP exists)
3. No Sketch skill (use Figma implement-design instead)
4. No Slack Bolt SDK skill (only GIF creator exists)

**Next Actions**:
1. Install ai-sdk skill immediately (relevant for AI sales agents)
2. Deep-dive secure-claude-skills before adoption
3. Consider wshobson ML skills when building agent knowledge bases

---

## Key Insights & Recommendations

### Immediate Actions (ADOPT - 21 skills)
Install these skills now for immediate impact on Next.js development:
- **Vercel skills** (react-best-practices, web-design-guidelines, composition-patterns, nextjs-best-practices)
- **AI SDK** (ai-sdk) — New discovery, critical for AI sales agent features
- **Accessibility** (wcag-audit-patterns, screen-reader-testing)
- **Design** (baseline-ui, animation-designer, tailwind-v4-shadcn)
- **Code quality** (error-handling-patterns, code-review-excellence, vitest)
- **Content** (copywriting, ux-writing, roier-seo)
- **Security** (secure-claude-skills) — Requires deep-dive before adoption

### High-Value Future Skills (FUTURE - 23 skills)
Keep these in mind for specific use cases:
- **AI/ML**: rag-implementation, langchain-architecture, embedding-strategies (wshobson), huggingface/skills
- **Design handoff**: figma implement-design (362 installs, React + Tailwind)
- **Database**: supabase-postgres-best-practices (7.8K), pg-aiguide, database-architect
- **CMS**: sanity-io/agent-toolkit (64 stars, official Next.js support)
- **Communication**: Twilio MCP (84 stars, official)
- **Infrastructure**: sentry-for-claude, better-auth, tanstack-query

### Patterns Extracted (PATTERNS - 4 skills)
These skills had valuable patterns merged into existing custom skills:
- **frontend-design** → frontend-design (spatial composition, scroll-triggering)
- **ui-ux-pro-max** → frontend-design (light/dark mode contrast, common mistakes)
- **accessibility-engineer** → design-checklist.md (7 pillars framework)
- **web-quality-skills** → frontend-design (animation performance patterns)

### Notable Skill Authors
- **wshobson** — 15+ high-quality skills with 20K-50K installs (error-handling, code-review, API design, accessibility, ML patterns)
- **Vercel Labs** — Official Next.js/React skills with 50K+ installs
- **Anthropic** — Official Claude Code skills (skill-creator, frontend-design)
- **Official MCPs** — Twilio (84 stars), Sanity (64 stars), Shopify, Hugging Face

### Ecosystem Gaps
Skills that don't exist but would be valuable:
1. **Mongoose + TypeScript** patterns
2. **Next.js + Shopify Storefront** implementation guide
3. **Slack Bolt SDK** development patterns
4. **Sketch to React** design handoff workflow
5. **Yarn 3 PnP** + Zero-Installs optimization
6. **PostHog + Next.js** analytics patterns

### MCP vs Skill Strategy
When to use MCP servers directly vs skills:
- **Use MCP directly**: Data access (databases, APIs), tool integration (Twilio, Shopify)
- **Use Skills**: Patterns, best practices, architectural guidance, code generation
- **Best of both**: Sanity (MCP + skill), Figma (MCP + implement-design), Hugging Face (MCP + skills)

### Skills.sh Trends (As of 2026-02-02)
- **Largest category**: React/Next.js (74K installs for react-best-practices)
- **Emerging**: AI/ML skills (rag-implementation at 987, ai-sdk at 2,300)
- **Well-covered**: Accessibility, design, testing, code quality
- **Gaps**: E-commerce integrations, CMS-specific patterns, communication tools

---

## Always Skip (Out of Scope)

These categories are **permanently out of scope** and should be skipped in all future reviews:

- **Alternative frontend frameworks**: astro, remix, svelte, vue, gatsby, angular, solid — We use Next.js exclusively
- **Mobile development**: react-native, expo, ios, android, flutter, swift, kotlin — No mobile app planned
- **Other languages**: python, go, rust, java, ruby, php — Backend is Next.js/TypeScript only
- **Game development**: unity, unreal, godot
- **Blockchain/Web3**: ethereum, solidity, web3
- **Desktop apps**: electron, tauri
- **Legacy systems**: cobol, fortran
- **IoT/Embedded**: arduino, raspberry-pi
