# Session Transcript — `web-research` Agent Iteration

**Date:** 2026-04-21
**Purpose:** Iteratively improve the new `web-research` sub-agent until it matches or exceeds the old `web-search-researcher` agent on the sub-agent eval pipeline brainstorm prompt (see `thoughts/research/2026-04-21-sub-agent-eval-pipeline-transcript.md`).
**Companion files:**
- `thoughts/research/2026-04-21-sub-agent-eval-pipeline-transcript.md` — original brainstorm + old agent output (baseline)
- `thoughts/designs/2026-04-21-sub-agent-eval-pipeline.md` — design artefact grounded in that baseline
- `.claude/agents/web-research.md` — target agent (iterated across this session)
- `.claude/agents/web-lookup.md` — companion fast-lookup agent (also modified)

---

## 1. Session goal

The old `web-search-researcher` agent was deleted earlier and replaced with two scoped agents: `web-lookup` (fast single-fact) and `web-research` (multi-source synthesis). The first `web-research` run regressed vs the old agent on coverage (missing Autorubric, DeepEval metric class names, GEPA real-world gains, Anthropic sub-agent frontmatter details).

This session diagnoses each regression, applies minimal generic edits to `web-research.md` (the agent must remain project-neutral), and reruns the research prompt after each edit to measure whether the gap closed.

The prompt used for every run is the 5-section eval-pipeline research briefing verbatim from `thoughts/research/2026-04-21-sub-agent-eval-pipeline-transcript.md` §1.

---

## 2. Runs — telemetry summary

| Run | Agent state | Tokens | Tool uses | Duration | Output words |
|---|---|---|---|---|---|
| **Old** | `web-search-researcher` (sonnet, no context7, length unrestricted) | 43,356 | 18 | 7m 45s | ~2,700 |
| **#1** | `web-research` v1: opus + mandatory context7-first + 800w cap | 65,068 | 19 | 3m 38s | ~1,400 |
| **#2** | v2 edits: sonnet, context7 removed, adaptive word cap | 28,232 | 11 | 6m 30s | ~2,100 |
| **#3** | v3 edits: + advisory "project-specific claims" branch | 36,277 | 14 | 5m 10s | ~2,200 |
| **#4** | v4 edits: + mandatory README extraction branch | 29,391 | 13 | 3m 02s | ~2,400 |
| **#5** | v5 state: **opus + `effort: max`** (manually toggled by user) | 60,543 | 18 | 4m 36s | ~2,900 |

---

## 3. Edits applied to `.claude/agents/web-research.md`

Each edit targeted a specific regression observed in the preceding run. All edits remained generic (no GEPA-, Autorubric-, or design-doc-specific language).

### Edit set A — applied after run #1 diagnosis (produced run #2)

1. **`model: opus → sonnet`.** Web research is extraction-shaped, not reasoning-shaped; opus was 2–5× more expensive per token with no measurable quality gain and added verbose internal deliberation.
2. **Removed context7 tools and mandatory "context7 first" policy.** Replaced with a "Library-docs delegation" section stating the agent does *not* handle API/syntax/config questions — those go to `web-lookup`. This eliminated the premature-satisfaction bias where context7's API-doc hits made the agent mark a topic "covered" before reading the paper/README deeply.
3. **Adaptive length budget.** Default cap stays 800 words, but an explicit caller target ("~2000 words", "deep dive") uses the target instead; prompts with ≥4 numbered sub-sections raise to 400w per section. Closed the regression where the prompt's "Target ~1500-2500 words" was ignored and the agent compressed to ~1,400.

### Companion edits to `.claude/agents/web-lookup.md`

Since `web-research` no longer handles library docs, `web-lookup` became the primary library-docs surface:
1. **`model: haiku → sonnet`.** Its scope expanded from pure single-fact to "read a doc page and faithfully extract the right three lines" — haiku was marginal for that.
2. **Description broadened** to explicitly mention library API/config/syntax + positioned as a parallel helper for `web-research` syntheses that need factual anchors.

### Edit set B — applied after run #2 diagnosis (produced run #3)

Added **"For project-specific claims"** branch to Search strategy (advisory version):
> For any topic that has both a paper and an implementation repo, fetch **both**, even if the paper alone appears to satisfy the prompt. Papers carry methodology and controlled-baseline numbers; READMEs carry real-world gain claims often absent from the paper.

### Edit set C — applied after run #3 diagnosis (produced run #4)

Tightened the project-claims branch from advisory to **mandatory verbatim extraction**:
> For any topic that has both a paper/preprint AND an implementation repo, you **must** fetch the repo README (and the landing page / launch blog post if one exists) in addition to the paper. Extract any quantified real-world gain claims **verbatim** (e.g. "X% → Y% on benchmark Z"). Treat the README fetch as non-optional for this source type — not a "fetch if the paper is insufficient" fallback.

### User-applied change — between run #4 and run #5

User manually set `model: opus` and `effort: max` on the agent.

---

## 4. Coverage evolution (key facts, compressed)

✅ = present; ❌ = missing; ⚠️ = partial/displaced; **bold** = new finding not in old agent.

| Fact | Old | #1 | #2 | #3 | #4 | #5 |
|---|---|---|---|---|---|---|
| Meta-Harness Table 3 ablation (50.0 / 34.6) | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ (+34.9 summary baseline) |
| Meta-Harness 500× context ratio | ✅ | ✅ | ✅ | ⚠️ | partial | ✅ |
| **Meta-Harness Appendix A.2 proposer behaviour** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Meta-Harness file access stats (median 82)** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| GEPA algorithm (5-step or 6-step loop) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| GEPA vs GRPO / MIPROv2 numbers | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| GEPA DSPy metric signature `{score, feedback}` | ✅ | ✅ | ❌ | ✅ | partial | partial |
| GEPA AIME 46.6→56.6 | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| GEPA ARC-AGI 32→89 | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| GEPA MATH 67→93 | ❌ | ❌ | ❌ | ❌ | ✅ | — |
| GEPA 90× cost reduction vs Opus | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **GEPA 35× faster than RL** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **GEPA "works with as few as 3 examples"** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **GEPA production uses (Shopify/Databricks/OpenAI/Pydantic)** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **`GEPAAdapter` API surface + code example** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Built-in adapters list** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **GEPA v0.1.1 release date + stars** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Autorubric (criteria types + aggregation) | ✅ | ❌ | ✅ | ❌ | ⚠️ flagged | ❌ **still missing** |
| DeepEval agent-specific metrics | ✅ named | ❌ | partial | partial | ✅ | ✅ |
| **Ragas Tool Call / Agent Goal Accuracy** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Braintrust CI/CD | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Inspect AI primitives | ✅ | ✅ | ✅ | ⚠️ gap | ✅ | ✅ + adoption note |
| **inspect_evals 200+ prebuilt** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **autoresearch disambiguation (3 distinct projects)** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| MT-Bench position bias (65% / 23.8% / 46.2%) | ✅ | ✅ | ❌ | ⚠️ IJCNLP | ❌ | ✅ |
| MT-Bench verbosity (91.3% / 8.7%) | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| MT-Bench self-enhancement (+10% / +25%) | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **MT-Bench math grading (70% / 30% / 15%)** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Few-shot consistency 65% → 77.5% | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Length bias mitigations (length-norm, conciseness dim)** | partial | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Reference-guided 4× cost multiplier** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Position Bias paper arXiv:2602.02219** (2026) | ❌ | ❌ | ❌ | ❌ | ✅ | — |
| **10-permutation balanced rotation mitigation** | ❌ | ❌ | ❌ | ❌ | ✅ | — |
| Cohen's κ / Krippendorff's α | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Anthropic description pattern | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Canonical description pattern (role + proactively + trigger)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ strongest |
| Tool scoping precedence (allowlist/denylist) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Tool scoping framed as security boundary** | partial | ❌ | ❌ | ❌ | ✅ | ⚠️ dropped |
| Model resolution order | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Built-in model assignments | ✅ | partial | ✅ | ✅ | ✅ | ✅ |
| `isolation: worktree` field | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Full frontmatter field enumeration (all 16)** | partial | partial | ✅ | ✅ | ✅ | ✅ |
| **Sub-agent transcript JSONL path** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **"Subagents cannot spawn sub-agents" constraint** | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ explicit impl. |
| **Anthropic agent feedback loop quote** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Anthropic rules-based feedback quote** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Explicit Conflicts section | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Explicit Gaps section | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 5. Diagnoses that drove each edit

### Run #1 → Edit set A
Three independent causes of the regression, ranked:
1. **Word cap acting as ceiling.** The prompt's "Target ~1500-2500 words" was treated as a limit rather than authorization to exceed the 800-word default.
2. **Mandatory context7-first policy** steered the agent toward API-doc-shaped sources for paper-shaped questions (GEPA gains, Autorubric methodology). Context7 returns API docs with a "satisfied" signal.
3. **`model: opus` overkill** — web research is extraction-shaped; opus cost 50% more tokens without quality benefit.

### Run #2 → Edit set B
Diagnosis: **no search-strategy branch covered "project-level claims."** Existing branches (library/API docs, best-practices, comparisons, technical solutions) all sent the agent to papers or official domains. GEPA's 32→89% and 55→82% claims live in the `gepa-ai/gepa` README — adjacent to the search path but never landed on.

### Run #3 → Edit set C
Diagnosis: the advisory branch *allowed* fetching the README but the agent still treated the paper as satisfying. Headline numbers were either not extracted or extracted but not quoted. Tightened to mandatory verbatim extraction with explicit "not a fallback" framing.

### Run #4 → (user toggled opus + effort:max)
Diagnosis: the mandatory-README edit fired correctly (AIME 46.6→56.6, MATH 67→93, 90× cost recovered) but partial — ARC-AGI and coding-agent numbers were still missed, suggesting the agent opened the README and extracted only some of the headline claims. User's hypothesis was that a stronger model with max effort would extract more completely.

### Run #5 — result
Hypothesis confirmed: opus + effort:max recovered ARC-AGI 32→89, picked up production-uses, 35× faster than RL, 3-examples minimum, full `GEPAAdapter` API with code example, sub-agent JSONL transcript path, and Anthropic blog's agent feedback loop quote. Cost doubled vs run #4 (60K vs 29K tokens) but coverage dramatically expanded.

---

## 6. Final state of `.claude/agents/web-research.md`

As of end-of-session, post user toggle:
- `model: opus`
- `effort: max` (manually applied by user)
- Tools: `WebSearch, WebFetch, TodoWrite, Read, Grep, Glob, LS` (no context7)
- Library-docs delegation section redirecting to `web-lookup`
- Adaptive length cap (caller targets / ≥4 sub-sections → raised)
- Search strategy includes "For project-specific claims" mandatory-README branch
- Mandatory Conflicts / Gaps / Sources output sections

## Final state of `.claude/agents/web-lookup.md`
- `model: sonnet` (upgraded from haiku)
- Description broadened to include library docs + parallel-helper role
- context7 retained as primary library-docs surface

---

## 7. Known remaining gaps (to inform design-doc review)

Fed into the design doc at `thoughts/designs/2026-04-21-sub-agent-eval-pipeline.md`, these are findings either present in run #5 that weren't in the original baseline, OR still missing from run #5 vs the old agent:

### Present in run #5 but not in original baseline — worth adding to the design
1. **`GEPAAdapter` interface** (`evaluate()` + `make_reflective_dataset()`) — a concrete Python API surface we can implement against directly. More actionable than the design doc's current abstract metric-function description.
2. **Sub-agent transcript JSONL path** (`~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`) — native Claude Code artefact the eval pipeline can read without custom capture plumbing. Design currently assumes we need to build a custom trace capture layer.
3. **"Subagents cannot spawn sub-agents" constraint** — the eval harness cannot itself be a sub-agent (must be a main-session orchestrator or a skill). Design Q8 (slash command `/eval <subcommand>`) is consistent with this constraint but the reasoning wasn't documented.
4. **`isolation: worktree` frontmatter field** — directly useful for sandboxed eval runs. Design Q5c (trajectory layout) didn't consider this.
5. **Built-in `GEPAAdapter` variants** (`DSPyFullProgramAdapter`, `GenericRAGAdapter`, `ConfidenceAdapter`, `MCPAdapter`, `DefaultAdapter`) — our sub-agent evaluator could start from `DefaultAdapter` rather than rolling custom.
6. **GEPA production-uses list** (Shopify, Databricks, OpenAI, Pydantic) — raises the confidence level of the "Step 3 activation" decision. Design Q9 budget (500 metric calls, ~$40/agent) can be cross-checked against community reports.
7. **Anthropic agent feedback-loop principle** ("gather context → take action → verify work → repeat") and rules-based feedback ("The best form of feedback is providing clearly defined rules for an output, then explaining which rules failed and why") — aligns with the design's pairwise-with-swap + analytic rubric direction but gives Anthropic-authoritative framing to cite.
8. **Ragas Tool Call Accuracy / Agent Goal Accuracy** metrics — named prior-art for two rubric dimensions the design calls "description routing accuracy" and "end-to-end task success." Worth citing.
9. **Inspect AI `dataset → Task → Solver → Scorer` primitives** — the design's "execution substrate" (Q5) uses Claude Agent SDK headless + DSPy adapter; Inspect AI's primitives are a named mental model we could align vocabulary with.
10. **Meta-Harness Appendix A.2 proposer behaviour** (reads median 82 files/iteration, 41% harness code, 40% traces, non-Markovian patterns, diagnostic pivot after 6 failures) — concrete evidence for the "filesystem-as-memory" pattern the design Q5c adopts. Can be cited as empirical support.
11. **Position Bias 2026 paper (arXiv:2602.02219) 10-permutation rotation mitigation** (from run #4, not run #5) — more recent and more rigorous than MT-Bench 2023's 2× swap mitigation. Design Q4c "swap-gated" is consistent but could be strengthened.
12. **MT-Bench reference-guided 4× cost multiplier** — named trade-off for Q4c (reference-based scoring). Currently the design treats reference-guided as free.
13. **MT-Bench math grading failure rates** (default 70% / CoT 30% / reference-guided 15%) — quantified evidence for CoT + reference-guided rubric design.

### Still missing in run #5 (needs targeted follow-up)
1. **Autorubric (arXiv:2603.00077)** — flagged as a gap by run #5. The design doc's rubric weight rationale (Q3c: correctness +2.0, process +1.0, anti-patterns −1.5, verbosity −0.5) cites Autorubric's leniency asymmetry. If future runs drop Autorubric, the rationale chain breaks. **Action:** a targeted `web-lookup` against `arxiv:2603.00077` to extract the weight formula verbatim for permanent citation.
2. **GEPA coding agent 55→82% claim** — in the old agent's output but not in run #5. Lower priority than Autorubric.
3. **Full GEPA Algorithm 1 pseudocode** — PDF-fetch only returned a summary. If the design's Step 3 GEPA integration needs it, a follow-up WebFetch of `arxiv.org/pdf/2507.19457` §3.

### Methodology gaps (process-level)
1. The iteration happened across 5 runs. Later runs sometimes displaced earlier findings (e.g. run #4 picked up Position Bias 2026 paper + 10-permutation mitigation; run #5 replaced with MT-Bench originals). No single run is a superset.
   - **Implication:** a load-bearing design doc should cite the **union** across the old agent + best new runs, not rely on any single run as authoritative.
2. The `web-research` agent's token/cost varies 2× between runs (29K–65K) for the same prompt. Non-determinism is real; re-running for a fresh perspective is cheap insurance.
3. No run recovered Autorubric reliably — the fact is in arxiv search results but the agent consistently deprioritises it. Possible root cause: "Autorubric" is a paper name that sounds library-ish, which may trigger the library-docs-delegation redirect to `web-lookup`. Worth investigating in future if reliance on Autorubric increases.

---

## 8. Suggested next step

Review `thoughts/designs/2026-04-21-sub-agent-eval-pipeline.md` against §7.1 (present but not in baseline) and §7.2 (still missing). For each item, decide:
- **Integrate** — add to the design doc with a citation to run #5's output or the primary source
- **Defer** — note as a known follow-up without changing the current design
- **Discard** — not relevant to the locked scope

Then run targeted `web-lookup` calls for §7.2 items (Autorubric at minimum) to fill the verified-gap rows.
