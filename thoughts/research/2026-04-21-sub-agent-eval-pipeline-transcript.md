# Session Transcript — Sub-Agent Eval Pipeline Brainstorm

**Date:** 2026-04-21
**Purpose:** Preserve the research output of the old `web-search-researcher` agent and the brainstorm dialogue that produced `thoughts/designs/2026-04-21-sub-agent-eval-pipeline.md`, so the new `web-lookup` / `web-research` agents can be re-run on the same prompt for quality comparison.
**Design artefact:** `thoughts/designs/2026-04-21-sub-agent-eval-pipeline.md`
**Old agent (deleted this session):** `.claude/agents/web-search-researcher.md`
**New agents:** `.claude/agents/web-lookup.md` (haiku), `.claude/agents/web-research.md` (opus)

---

## 0. User's opening prompt

> Review the sub-agent metadata and prompt (configuration) for `.claude/agents/web-search-researcher.md` and suggest how to optimize / improve both or either the metadata (description, model, tools, effort) or prompt.
>
> Provide some initial suggestions that have verified evidence to back up the suggested change.
>
> Then I'd like to design an evaluation pipeline to using something like autoresearch, a custom llm-as-a-judge or GEPA optimisation pipeline, or even a more recent strategy incorporating relevant parts of Stanford's Meta-Harness (https://arxiv.org/html/2603.28052v1#S4)
>
> Idealy the solution we design will be used to continuously improve (or even create) other sub-agents under `.claude/agents/`
>
> Then possiblly progress into creating/improving slash commands (.claude/commands/) and skills (.claude/skills/)

---

## 1. Research prompt sent to the OLD `web-search-researcher` agent

This is the verbatim prompt. Re-run it through `web-research` (multi-source synthesis) to compare.

> I'm designing an evaluation + continuous-improvement pipeline for Claude Code sub-agents (markdown files with YAML frontmatter defining description/model/tools, followed by a system prompt). The goal is to automatically score sub-agent quality on representative tasks and iteratively improve their prompts/metadata.
>
> Please research all of the following and return a consolidated, citation-backed briefing. Do NOT synthesize recommendations — just return faithful, well-quoted findings I can use to design the system myself.
>
> ## 1. Stanford Meta-Harness paper
> URL: https://arxiv.org/html/2603.28052v1#S4
>
> Fetch the paper (especially §4). I need:
> - What is the Meta-Harness? (core idea in 2-4 sentences)
> - How does it evaluate agents/prompts? (pipeline stages, scorers, judges)
> - What metrics does it report?
> - What makes it different from vanilla LLM-as-judge or GEPA?
> - Any specific techniques (rubric design, test generation, calibration) that transfer to evaluating Claude Code sub-agents
>
> Quote the paper directly where possible.
>
> ## 2. GEPA (Genetic-Pareto / reflective prompt optimization)
> Search for the latest GEPA paper/implementation (originated 2024-2025, associated with DSPy / Stanford NLP / Lakera or similar). Find:
> - Core algorithm (mutation, Pareto selection, reflective feedback loop)
> - What inputs/outputs it expects (prompt templates, eval set, scorer)
> - Reference implementations (github repos, DSPy modules)
> - Reported gains vs baselines like MIPROv2, OPRO, random search
> - How it handles multi-objective trade-offs (quality vs cost vs latency)
>
> ## 3. AutoResearch / automated research agent eval
> Several projects share this name. Identify which is relevant for agent evaluation:
> - Is there a framework specifically called "autoresearch" for evaluating research agents?
> - Alternatives in the same space: OpenAI Evals, Inspect AI (UK AISI), LangSmith evals, Braintrust, Promptfoo, Ragas, DeepEval — which are best suited for evaluating *agents* (not just one-shot prompts)?
>
> ## 4. LLM-as-judge best practices (2025)
> - Rubric design (numeric scales vs pairwise comparison vs structured rubric)
> - Calibration against human judgment (ChatBot Arena, MT-Bench findings)
> - Known failure modes (position bias, length bias, self-preference bias)
> - Techniques to mitigate (pairwise with randomized order, ensemble judges, reference-based scoring)
>
> ## 5. Claude Code sub-agent best practices
> Search Anthropic docs, engineering blog, and Claude Code docs for:
> - Official guidance on writing sub-agent descriptions (what triggers invocation)
> - Tool scoping recommendations
> - Model selection (haiku vs sonnet vs opus for different agent roles)
> - Prompt structure patterns that work well
>
> ## Output format
> For each section above, return:
> - 3-8 bullet points of key findings with inline citations (URL + quoted text where possible)
> - A short "transfers to our use case" line noting which findings are directly applicable to evaluating markdown-based sub-agents
>
> Keep it factual and sourced — no opinions. Target ~1500-2500 words total.

---

## 2. OLD agent output (verbatim, to compare against new agent reruns)

### Section 1: Stanford Meta-Harness Paper (arxiv.org/html/2603.28052v1)

**Core idea.** Meta-Harness is "an outer-loop system that searches over harness code for LLM applications." A coding agent reads a filesystem of all prior candidates' source code, execution traces, and scores, then proposes a new harness implementation. The loop runs N times; each iteration produces k new harness proposals informed by full history.

- The fundamental differentiation is information richness. Table 1 contrasts context budgets: GEPA uses ~0.008 M tokens per iteration (summaries), while Meta-Harness provides ~10.0 M tokens per iteration (full filesystem access). Prior methods "typically operate with short-horizon or heavily compressed feedback: some condition only on the current candidate, others rely primarily on scalar scores, and others restrict feedback to short templates or LLM-generated summaries." (§1)

- Pipeline stages (Algorithm 1, §3): (1) Filesystem inspection — the coding agent uses grep/cat on prior candidates' code, traces, and scores; (2) Proposal generation — the proposer reasons about failure modes and produces a new harness; (3) Evaluation — the harness runs on a search set; (4) Filesystem storage — all code, scores, and traces go into a new directory for future reference.

- What makes it different from vanilla LLM-as-judge: it delegates proposer work to a coding agent with unrestricted filesystem access, rather than compressing feedback into a short prompt. An ablation (Table 3, §4.1) shows "scores-only" reaches 34.6% median accuracy vs. Meta-Harness at 50.0%, demonstrating that raw execution traces — not just scalar rewards — are essential.

- What makes it different from GEPA specifically: GEPA is listed in Table 1 as a text optimizer with compressed feedback; Meta-Harness operates at the harness (code) level with full trace access rather than evolving prompt text against scalar scores.

- Metrics reported (three domains): (a) Text classification — accuracy and context tokens; result: 48.6% accuracy vs. ACE's 40.9% baseline, using 11.4K vs. 50.8K tokens. (b) Math reasoning — Pass@1 on 200 IMO-level problems; 4.7-point average improvement over no retrieval. (c) Agentic coding — pass rate on TerminalBench-2 (89 tasks); 76.4% on Opus 4.6, 37.6% on Haiku 4.5.

- Pareto frontier analysis is used to navigate accuracy–efficiency tradeoffs (Figure 3, §4.1), so the proposer "discover[s] harnesses across a broad range of the frontier" without committing to a single scalar objective upfront.

- No explicit rubric design or calibration procedures are described. The paper delegates scoring to task-specific reward functions (pass/fail, accuracy). The implicit calibration mechanism is the proposer reading raw execution traces, not a rubric.

**Transfers to our use case:** The filesystem-as-memory pattern (storing every eval run's code, traces, and scores for the next proposer iteration) directly transfers. For markdown-based sub-agent evaluation, this means persisting full agent transcripts alongside scores so an optimizer can read raw tool-call traces — not just final scores — when proposing prompt improvements.

### Section 2: GEPA (Genetic-Pareto Reflective Prompt Optimization)

Paper: "GEPA: Reflective Prompt Evolution Can Outperform Reinforcement Learning," Agrawal et al., arxiv:2507.19457, accepted ICLR 2026 (Oral).

- Core algorithm (5 steps from the gepa-ai/gepa README): (1) Select a candidate from the Pareto frontier; (2) Execute on a minibatch, capturing full execution traces; (3) Reflect — an LLM reads the traces and diagnoses why the candidate failed; (4) Mutate — generate an improved candidate informed by the diagnosis; (5) Accept — add to the candidate pool if improved, update the Pareto frontier.

- Pareto frontier maintenance: rather than keeping only the global best, GEPA maintains "the set of candidates which achieve the highest score on at least one evaluation instance." Candidates are selected probabilistically weighted by their coverage on the validation set. This preserves complementary strategies and avoids local optima. (DSPy GEPA overview docs)

- Inputs/outputs: inputs are a seed candidate (e.g., a dict with `"system_prompt"` key), a training set, a validation set, and a metric function. The metric function must return `(score, feedback)` tuples — the textual `feedback` field "provides GEPA more visibility into why the system got the score that it did, and then GEPA can introspect to identify how to improve the score." (DSPy API docs) Output is an optimized program with evolved prompts, plus optional `detailed_results` containing all candidates and lineage.

- DSPy integration: `dspy.GEPA(metric=your_metric, reflection_lm=dspy.LM(model='gpt-5', temperature=1.0), max_metric_calls=5000)` compiled via `gepa.compile(student, trainset=train_data, valset=val_data)`. Standalone use via `pip install gepa` with `gepa.optimize(seed_candidate, trainset, valset, task_lm, reflection_lm, max_metric_calls)`.

- Reported gains vs baselines: vs. GRPO (RL): +6% average, up to +20% on individual tasks, using 35x fewer rollouts. Vs. MIPROv2: >10% outperformance, +12% accuracy on AIME-2025. Real-world claims from the gepa-ai README: 32% → 89% on an ARC-AGI agent; 55% → 82% coding agent resolve rate; 46.6% → 56.6% GPT-4.1 Mini on AIME 2025.

- Multi-objective handling: GEPA "combine[s] complementary lessons from the Pareto frontier of its own attempts," enabling tradeoffs between accuracy, cost, latency without collapsing to a single scalar. (arxiv abstract)

- Reference implementations: [github.com/gepa-ai/gepa](https://github.com/gepa-ai/gepa); [dspy.ai/api/optimizers/GEPA/overview/](https://dspy.ai/api/optimizers/GEPA/overview/); [stanfordnlp/dspy GEPA docs](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/api/optimizers/GEPA/overview.md).

**Transfers to our use case:** The metric function's `(score, feedback)` interface is directly applicable — when scoring a markdown sub-agent run, returning a structured string explaining why a score was given (not just the number) enables GEPA's reflection step to propose targeted description/prompt edits. The Pareto frontier design handles the inherent multi-objective nature of sub-agent quality (accuracy, token cost, latency).

### Section 3: Agent Evaluation Frameworks

No single project called "autoresearch" dominates the agent-eval space. The relevant landscape breaks into two tiers: frameworks purpose-built for agent trajectory evaluation, and those primarily designed for single-turn prompt evaluation.

**Purpose-built for agent evaluation:**

- **Inspect AI (UK AISI)** — open-source (MIT), Python-first, explicitly designed for agent evals. Architecture: Tasks/Datasets/Solvers/Scorers. "Agent Bridge enables the use of agents from 3rd party frameworks like OpenAI Agents SDK, LangChain, and Pydantic AI." Ships curated agent benchmarks: GAIA, SWE-Bench, GDM CTF, Cybench. [inspect.aisi.org.uk](https://inspect.aisi.org.uk/)

- **DeepEval (Confident AI)** — Python-native, pytest-based. Specifically models the agent as two-layer: reasoning layer and action layer. Agent-specific metrics include: `ToolCorrectnessMetric`, `ArgumentCorrectnessMetric`, `PlanQualityMetric`, `PlanAdherenceMetric`, `TaskCompletionMetric`, `StepEfficiencyMetric`. "Unlike simple LLM applications that respond to single prompts, agents operate in loops—reasoning, acting, observing results, and adapting their approach until the task is complete." Evaluates component-level (single tool call) and end-to-end (full trace). [deepeval.com/guides/guides-ai-agent-evaluation](https://deepeval.com/guides/guides-ai-agent-evaluation)

- **Braintrust** — cloud-hosted, recommended "for teams that have moved past local testing and need to measure AI agents in production, giving detailed traces across every agent step." Suited for trace-level production monitoring and prompt iteration collaboration.

- **LangSmith** and **Langfuse** — both support trajectory capture and agent-step-level scoring; primarily complement existing LangChain/LangGraph toolchains.

**Primarily prompt/single-turn evaluation (less suited for agent trajectory evals):**

- **Promptfoo** — CLI-first, YAML-based, acquired by OpenAI; strong for red-teaming and single-turn assertion testing. Less designed for multi-step agent trajectories.

- **OpenAI Evals** — restricted to OpenAI API users.

- **Ragas** — specialized in RAG pipeline evaluation (retrieval quality, faithfulness); not general-purpose agent eval.

- **Anthropic's own guidance** (from the engineering blog "Demystifying evals for AI agents") recommends combined grader strategies: code-based ("fast, cheap, objective, reproducible"), model-based ("flexible, scalable, captures nuance"), and human graders for calibration. Practical roadmap: start with 20-50 tasks from actual user failures, write unambiguous specs with reference solutions, build balanced positive/negative problem sets, and design isolated environments per trial. [anthropic.com/engineering/demystifying-evals-for-ai-agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

**Transfers to our use case:** Inspect AI's Solver/Scorer separation and DeepEval's two-layer model (reasoning + action) are directly applicable to evaluating markdown sub-agents: the `description` field governs routing (an agent-level decision) while the system prompt governs execution quality (a trajectory-level concern) — these require separate scorers.

### Section 4: LLM-as-Judge Best Practices (2025)

Primary source: "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena," Zheng et al., NeurIPS 2023, arxiv:2306.05685 — the seminal calibration study. Supplementary: "Autorubric: Unifying Rubric-based LLM Evaluation," arxiv:2603.00077v2.

**Rubric design:**

- Autorubric establishes that analytic rubrics — decomposing evaluation into independent criteria scored separately — "prevent criterion conflation and halo effects, enable reliability measurement via Cohen's κ, and provide optimization signals." (§2)

- Criterion types in order of reliability: binary (MET/UNMET, highest inter-rater reliability) > ordinal (3–5 Likert levels with behavioral anchors) > nominal (unordered categories). Continuous-valued criteria are explicitly excluded "due to poor LLM calibration on unbounded numeric scales." (§2)

- Negative-weight criteria serve as penalties for anti-patterns, counteracting the leniency bias documented in LLM judges. Weighted aggregation formula: `score = max(0, min(1, Σ(vᵢ·wᵢ)/Σ(wᵢ>0·wᵢ)))` (Equation 1, Autorubric)

**Calibration against human judgment:**

- MT-Bench findings: "GPT-4 with both pairwise comparison and single answer grading show very high agreements with human experts. The agreement under setup S2 (w/o tie) between GPT-4 and humans reaches 85%" — "even higher than the agreement among humans (81%)." (§4.2, Table 5, arxiv:2306.05685)

- Few-shot calibration is most impactful for weaker judges: on RiceChem, Gemini-3-Flash improved from 77.2% (0-shot) to 80.0% (5-shot); removing few-shot cost LLaMA-3.1-8B −15.0pp. Verdict-balanced sampling prevents judges from "inferring a base-rate prior." (Autorubric §2, Table 4)

**Known failure modes:**

- **Position bias**: "All LLM judges tested exhibit strong position bias, with most LLM judges favoring the first position." (§3.3, MT-Bench) GPT-4 showed only 65% consistency when answer order was swapped; Claude-v1 managed 23.8%.

- **Verbosity/length bias**: A "repetitive list" attack (lengthening responses without adding information) caused Claude-v1 and GPT-3.5 to fail at 91.3%; "all LLMs may be prone to verbosity bias though GPT-4 defends significantly better" at 8.7% failure. (§3.3, Table 4, MT-Bench)

- **Self-enhancement bias**: "GPT-4 favors itself with a 10% higher win rate; Claude-v1 favors itself with a 25% higher win rate." (§3.3, MT-Bench) — though authors note this could reflect genuine quality differences.

- **Reasoning limitations**: GPT-4 failed 14/20 (70%) math questions when judging with misleading provided answers. (§3.3, Table 4)

**Mitigation techniques:**

- Position swapping: "call a judge twice by swapping the order of two answers and only declare a win when an answer is preferred in both orders." (§3.4, MT-Bench) Reduces position bias at the cost of 2x API calls.

- Reference-guided scoring: providing a reference solution reduced GPT-4's math failure rate from 14/20 to 3/20. (§3.4, Table 4, MT-Bench)

- Few-shot prompting: improved GPT-4 positional consistency from 65% to 77.5%. (§D.2, Table 13, MT-Bench)

- Randomized option order with explicit numeric values: Autorubric "randomizes option order per evaluation by default, using explicit numeric values to decouple score from position." (§3, Table 1)

- Multi-judge ensembles: same-model ensembles (k=3,5) provided negligible gains for strong models but lifted LLaMA by up to 26pp. (Autorubric Table 4) Regression-based bias correction calibrated on a small set of human-annotated examples can "halve residual error relative to best ensembles."

**Transfers to our use case:** For scoring markdown sub-agents, use binary or 3-point ordinal criteria per dimension (description clarity, tool scoping correctness, prompt specificity, output format compliance) rather than a single 1-10 score. Always randomize option order in pairwise comparisons and provide reference solutions (the "ideal" sub-agent output) to anchor the judge.

### Section 5: Claude Code Sub-Agent Best Practices

Source: [code.claude.com/docs/en/sub-agents](https://code.claude.com/docs/en/sub-agents) (official Anthropic docs, fetched April 2026).

**Description field — what triggers invocation:**

- "Claude uses each subagent's description to decide when to delegate tasks. When you create a subagent, write a clear description so Claude knows when to use it." The description field is defined as "When Claude should delegate to this subagent."

- Adding "use proactively" in the description encourages automatic delegation: "To encourage proactive delegation, include phrases like 'use proactively' in your subagent's description field."

- The built-in code-reviewer example shows the pattern: `"Expert code review specialist. Proactively reviews code for quality, security, and maintainability. Use immediately after writing or modifying code."` — it names the role, names the domain, and states the invocation trigger condition.

**Tool scoping:**

- Two complementary fields: `tools` (allowlist) and `disallowedTools` (denylist). "If both are set, `disallowedTools` is applied first, then `tools` is resolved against the remaining pool." A tool in both lists is removed.

- Official best practice tip: "Limit tool access: grant only necessary permissions for security and focus." The Explore built-in uses Haiku + read-only tools as the canonical minimal-scope pattern.

- MCP servers can be scoped to a single sub-agent via `mcpServers` inline definitions, preventing parent-context pollution: "To keep an MCP server out of the main conversation entirely and avoid its tool descriptions consuming context there, define it inline here rather than in `.mcp.json`."

- `PreToolUse` hooks enable conditional tool gating beyond static allowlists (e.g., blocking SQL write operations while allowing Bash for SELECT queries).

**Model selection:**

- Model resolution order (highest to lowest priority): (1) `CLAUDE_CODE_SUBAGENT_MODEL` environment variable; (2) per-invocation `model` parameter; (3) frontmatter `model` field; (4) main conversation's model.

- Built-in patterns: Explore uses **Haiku** (fast, low-latency, read-only exploration); statusline-setup uses **Sonnet**; Claude Code Guide uses **Haiku**; Plan and general-purpose agents inherit from the main conversation.

- Official guidance: "Control costs by routing tasks to faster, cheaper models like Haiku." The data-scientist example explicitly sets `model: sonnet` for "more capable analysis."

- Available aliases: `sonnet`, `opus`, `haiku`, full model IDs (e.g., `claude-sonnet-4-6`), or `inherit` (default if omitted).

**Prompt structure patterns:**

- Sub-agents receive "only this system prompt (plus basic environment details like working directory), not the full Claude Code system prompt." This means all necessary context must be in the markdown body.

- The official examples share a consistent structure: (1) role statement ("You are a senior code reviewer..."); (2) "When invoked:" numbered workflow; (3) a checklist or "key practices" section; (4) output format specification ("Provide feedback organized by priority: Critical / Warnings / Suggestions").

- `skills` field injects domain knowledge at startup: "The full content of each skill is injected into the subagent's context, not just made available for invocation. Subagents don't inherit skills from the parent conversation; you must list them explicitly."

- `memory` field enables cross-session learning. Recommended tip: "Include memory instructions directly in the subagent's markdown file so it proactively maintains its own knowledge base."

- Sub-agents cannot spawn other sub-agents: "Subagents cannot spawn other subagents." For nested delegation, chain sub-agents from the main conversation or use Skills.

**Transfers to our use case:** The description field is the primary routing signal — evaluating it means testing whether the description correctly triggers (and doesn't false-positive trigger) delegation on a representative task set. The structured body pattern (role → workflow → checklist → output format) provides a natural rubric template for scoring prompt quality. Model selection is a scorable metadata field: Haiku for read-only/fast tasks, Sonnet for analysis, Opus for complex reasoning.

### Sources cited

- [Meta-Harness paper (arxiv:2603.28052v1)](https://arxiv.org/html/2603.28052v1#S4)
- [GEPA paper abstract (arxiv:2507.19457)](https://arxiv.org/abs/2507.19457)
- [GEPA PDF (arxiv:2507.19457)](https://arxiv.org/pdf/2507.19457)
- [GEPA reference implementation (gepa-ai/gepa)](https://github.com/gepa-ai/gepa)
- [GEPA DSPy optimizer overview (dspy.ai)](https://dspy.ai/api/optimizers/GEPA/overview/)
- [GEPA DSPy source docs (stanfordnlp/dspy)](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/api/optimizers/GEPA/overview.md)
- [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena (arxiv:2306.05685)](https://arxiv.org/html/2306.05685v4)
- [Autorubric: Unifying Rubric-based LLM Evaluation (arxiv:2603.00077v2)](https://arxiv.org/html/2603.00077v2)
- [Anthropic engineering: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [Claude Code sub-agent official docs](https://code.claude.com/docs/en/sub-agents)
- [Inspect AI (UK AISI)](https://inspect.aisi.org.uk/)
- [DeepEval AI agent evaluation guide](https://deepeval.com/guides/guides-ai-agent-evaluation)
- [Braintrust](https://www.braintrust.dev/articles)
- [GEPA overview on DeepEval](https://deepeval.com/docs/prompt-optimization-gepa)

### Agent telemetry

- `total_tokens: 43356`
- `tool_uses: 18`
- `duration_ms: 464686` (~7m 45s)

---

## 3. Brainstorm Q&A (condensed — full text in the conversation log)

All decisions locked in below. Evidence citations for each decision live in the design doc at `thoughts/designs/2026-04-21-sub-agent-eval-pipeline.md`.

### Q1 — Pipeline scope
**A:** Option 2 now (measurement + reflective feedback), Option 3 (closed-loop GEPA mutation) once the judge is calibrated.

### Q2 — Task sourcing
**A:** (4) Hybrid — 5 hand-curated golden + 5 mined real invocations + 5 synthetic adversarial per agent.
**Split:** routing tasks (score invocation decision) vs. execution tasks (score output quality).

### Q3 — Rubric design
**Q3a (structure):** shared core + per-agent extensions.
**Q3b (cost/latency):** excluded until quality plateaus.
**Q3c (weights):** evidence-based asymmetric — correctness +2.0, process +1.0, anti-patterns −1.5, verbosity −0.5. Rationale: Autorubric leniency asymmetry, MT-Bench reference-grounded correctness signal, GEPA Pareto shape.

### Q4 — Judge configuration
**Q4a (mode):** single-answer rubric now; add pairwise-with-swap at step 3.
**Q4b (model):** Opus 4.7 + 3-shot verdict-balanced, no ensemble.
**Q4c (bias mitigations):** all five (randomise criteria + exemplars, reference-based, swap-gated, identity-blind).
**Q4d (calibration gate):** κ ≥ 0.6 primary / ≥ 0.4 secondary, 50-item sample, two disjoint passes.

### Q5 — Execution substrate
**Q5a:** Claude Agent SDK headless now, DSPy adapter layered on for step 3.
**Q5b:** Python (pyproject.toml sibling; DSPy is Python-only).
**Q5c:** Nested trajectory layout `runs/{timestamp}/{agent}/{task-id}/{meta.json, transcript.jsonl, score.json}` (Meta-Harness compatible).

### Q6 — Storage & reporting
**Q6a (location):** `.claude/eval/` (portable to other Claude Code projects).
**Q6b (report sections):** Header / Leaderboard / Regressions / Reflective feedback digest / Calibration drift / Suggested edits.
**Q6c (distribution):** local + GitHub Issue.

### Q7 — Trigger cadence
**Q7a:** Phased — manual only now → add PR-gate after κ gate → add nightly cron after step 3 activation.
**Q7b:** PR gating is advisory-only, never blocking. Human veto preserved.
**Q7c:** Single namespaced slash command `/eval <subcommand>`.

### Q8 — Extension to commands and skills
**Q8a:** Phased (agents → commands → skills); full design captured in the design doc.
**Q8b (skills eval):** Pairwise A/B with swap (inherits step-3 judge stack).
**Q8c (agent creation):** Describe in scope as Phase 4, defer implementation.

### Q9 — Step 3 activation criteria
**Q9a (stability):** Spearman ρ ≥ 0.9 across 3 reruns.
**Q9b (mutation scope):** body-only first, then body + description, never model/tools.
**Q9c (acceptance):** ≥+0.05 aggregate, no ≥0.1 regression on primary-axis criteria, held-out test split must also improve.
**Q9d (rollback):** PR-for-review + shadow-eval on merge.
**Q9e (budget):** 500 `max_metric_calls` per agent per session (~$40/agent).
**Q9f (auto-disable):** both triggers (κ drift + ≥3 merged-then-reverted mutations).

---

## 4. How to re-run the research

### Via `web-research` (recommended — multi-source synthesis task)

Launch the agent with the **verbatim prompt in §1** above. Target output: the same 5-section structured briefing with inline citations. Compare against §2 along these axes:

| Axis | Check |
|---|---|
| **Coverage** | Are all 5 sections returned? Are key facts (Meta-Harness Table 3 ablation, GEPA's 32→89% gain, MT-Bench position bias 65%, Autorubric κ methodology, Anthropic sub-agent description pattern) present? |
| **Citation discipline** | New agent's citation contract is binary. Count uncited claims — target: 0. Old agent's output has ~6 claims that are quoted-but-not-linked. |
| **Publication dates** | New agent's contract mandates dates per source. Old output includes some (arxiv IDs, NeurIPS 2023, ICLR 2026) but not consistently. |
| **Conflicts section** | Old output has none (no source disagreements surfaced). New agent should explicitly emit "## Conflicts" or note its absence. |
| **Length** | Old output is ~2,700 words. New agent cap is 800 unless "deep dive" requested. This prompt is a deep-dive — either raise the cap via caller instruction or compare at 800 for fidelity-per-word. |
| **Telemetry** | Old: 43,356 tokens, 18 tool uses, ~7m 45s. Compare against new agent run. |

### Via `web-lookup` (partial comparison — NOT the same task)

`web-lookup` is scoped to single-fact queries — this prompt is out of scope. But you can sample the five most fact-like sub-questions and run each independently:

1. "What is Meta-Harness's reported TerminalBench-2 pass rate on Opus 4.6 vs Haiku 4.5?"
2. "What Pareto frontier win does GEPA claim over GRPO in the ICLR 2026 paper?"
3. "What position-bias consistency rate did GPT-4 show in MT-Bench, and what dropped it to what?"
4. "What does Anthropic's sub-agent doc recommend for encouraging proactive delegation?"
5. "What is Autorubric's aggregation formula?"

Compare each answer against the corresponding fact in §2. Target: all five exact-match on the core number/quote.

### Success criteria for the split

The split is a success if:

- `web-research` produces **equal or better** coverage on the full prompt (§1), with stricter citation discipline and explicit conflict/gap surfacing.
- `web-lookup` produces the five sub-facts in <60 seconds each, at lower token cost than the old agent's per-fact share.
- Combined cost of (one `web-research` run + five `web-lookup` runs) is comparable to or lower than the old single-agent run (43K tokens).

If `web-research` drops coverage or `web-lookup` fabricates citations, flag the regression — it means the split went too aggressive on scoping or budget.

---

## 5. Files changed in this session

| File | Change |
|---|---|
| `.claude/agents/web-search-researcher.md` | **Deleted** |
| `.claude/agents/web-lookup.md` | **Created** — haiku, tight budget, context7-first |
| `.claude/agents/web-research.md` | **Created** — opus, deep synthesis, context7-first with fallback |
| `.claude/commands/brainstorm.md:23` | Updated agent references from `web-search-researcher` to `web-lookup` / `web-research` |
| `thoughts/designs/2026-04-21-sub-agent-eval-pipeline.md` | **Created** — full design doc |
| `thoughts/research/2026-04-21-sub-agent-eval-pipeline-transcript.md` | **Created** — this file |

Stale historical references to `web-search-researcher` remain intact in:

- `thoughts/plans/2026-02-02-skills-adoption.md`
- `thoughts/designs/2026-01-20-claude-code-github-actions.md`

These are timestamped records of prior decisions, not live routing instructions — left unchanged on purpose.
