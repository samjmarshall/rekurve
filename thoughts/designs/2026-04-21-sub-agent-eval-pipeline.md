# Sub-Agent Evaluation & Continuous-Improvement Pipeline

**Date:** 2026-04-21
**Status:** Design — approved, not yet implemented
**Scope:** `.claude/agents/`, `.claude/commands/`, `.claude/skills/` under this repo; designed to be portable to other Claude Code projects.

---

## 1. Motivation

Claude Code sub-agents are defined as markdown files with YAML frontmatter (`name`, `description`, `model`, `tools`) plus a system-prompt body. Today, quality assessment of these files is ad-hoc: authors write a description and prompt, observe behaviour, hand-edit. There is no systematic signal for routing accuracy, output quality, or regressions across the 9 agents currently in `.claude/agents/`.

This design proposes an evaluation harness that:

1. **Measures** agent quality against a principled rubric on a curated task set (step 2).
2. **Emits reflective feedback** per failing task so humans can edit agents with evidence (step 2).
3. **Later** runs closed-loop auto-mutation via GEPA (step 3), gated on rigorous judge calibration.

The pipeline then extends — in phases — to slash commands and skills.

A note on naming: "step 2" and "step 3" refer to the scope ladder introduced during design (measurement / measurement+reflection / closed-loop). The pipeline is shipping at step 2.

---

## 2. Scope ladder

| Step | What it does | When |
|---|---|---|
| **2. Measurement + reflection** | Score each agent against a rubric on a fixed task set. Judge emits `(score, feedback)` per run. Humans read the report and hand-edit agents. | **Now** |
| **3. Closed-loop optimization** | GEPA-style mutation: propose prompt edits, re-eval, accept if Pareto-improving, open PR for human review. | After judge calibration passes (§11) |

Step 3 is **described in-scope but deferred**. The step-2 implementation is architected so that adding step 3 is additive — no redesign.

Cost and latency criteria are intentionally excluded from the rubric until quality reaches a plateau. Quality optimisation first; Pareto trade-offs against spend come later.

---

## 3. Architecture overview

```
┌────────────────────────────────────────────────────────────────┐
│  .claude/eval/  (portable; self-contained Python package)       │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│   tasks/         rubrics/        runner.py     judge.py          │
│   (YAML)         (YAML)           (SDK)         (Opus)            │
│        │            │                │            │              │
│        ▼            ▼                ▼            ▼              │
│           ┌───────────────────────────────────┐                  │
│           │       eval orchestrator           │                   │
│           └───────────────────────────────────┘                  │
│                          │                                       │
│                          ▼                                       │
│    runs/{timestamp}/{agent}/{task-id}/                           │
│        ├─ meta.json                                              │
│        ├─ transcript.jsonl   ← Meta-Harness-compatible           │
│        └─ score.json                                             │
│                          │                                       │
│                          ▼                                       │
│    reports/{date}.md   +   GitHub Issue                          │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

**Location:** `.claude/eval/` — colocated with the artefacts it evaluates, portable to other Claude Code projects via copy.

**Language:** Python (sibling pyproject.toml, independent of the Next.js workspace). Rationale: the DSPy/GEPA implementation path for step 3 is Python-only; starting in Python avoids a rewrite.

**Execution substrate:** Claude Agent SDK headless. An agent file is already a (system-prompt, tools, model) tuple — the SDK's native input shape. Zero translation cost. Full message transcripts (including `tool_use` / `tool_result` blocks) are captured by default, unlocking Meta-Harness-style trace reading at step 3.

---

## 4. Repo layout

```
.claude/
└── eval/
    ├── pyproject.toml
    ├── config.yaml                  # judge model, seeds, max_turns, paths
    ├── run.py                       # CLI: python -m eval.run
    ├── src/eval/
    │   ├── agents.py                # parse .claude/agents/*.md frontmatter+body
    │   ├── rubric.py                # load shared-core + per-agent extensions
    │   ├── runner.py                # Agent SDK invocation, trace capture
    │   ├── judge.py                 # Opus judge prompt + call + parse
    │   ├── tasks.py                 # hybrid task loader
    │   └── report.py                # markdown report + GH issue writer
    ├── tasks/
    │   ├── shared/                  # cross-agent routing probes
    │   └── per-agent/
    │       └── <agent-name>.yaml    # 15 tasks: 5 golden + 5 mined + 5 adversarial
    ├── rubrics/
    │   ├── routing.core.yaml
    │   ├── execution.core.yaml
    │   └── per-agent/
    │       └── <agent-name>.extensions.yaml
    ├── runs/                        # .gitignored; raw traces
    │   └── {timestamp}/{agent}/{task-id}/
    ├── calibration/                 # committed; human labels for κ gate
    │   └── {date}-round-{n}.jsonl
    └── reports/                     # committed; summaries
        └── {date}.md
```

**Key decisions (recorded for portability):**

- `runs/` is git-ignored; transcripts are bulk data. `reports/` and `calibration/` are durable and committed.
- Task files are YAML, one per agent. Keeps edit surface small.
- Rubric inheritance is **extend-or-reweight only**, never override. Core criteria are universal.
- Agents optionally declare `evalCriteria:` in frontmatter pointing to their extension file. Co-locates constraint with the prompt that declares it.

---

## 5. Task sourcing (hybrid)

Hybrid strategy with three sources per agent, ~15 tasks total:

| Bucket | Count | Source |
|---|---:|---|
| **Golden** | 5 | Hand-written by engineer. Covers the golden path + 2–3 edge cases. |
| **Mined** | 5 | Extracted from past Claude Code sessions in `~/.claude/projects/-Users-sam-workspace-rekurve-www/`. Real user invocations. Routing tasks come from top-level session logs (user prompt → delegation decision). Execution tasks come from the per-sub-agent JSONL at `.../subagents/agent-{agentId}.jsonl` — those contain the stripped system prompt the sub-agent actually received. |
| **Adversarial** | 5 | Synthesised by an Opus "task author" that reads the agent's description + prompt. Generates prompts that should *not* trigger the agent (negatives) + edge cases the human didn't think of. |

**Total at full coverage:** ~135 tasks (9 agents × 15).

### Routing / execution split

Tasks divide by what they score:

- **Routing tasks** — user-prompt-only. Judged *without* running the agent. Single question: "should this agent have been invoked?" (and for negatives, "should it have *stayed silent*?"). Cheap — pennies per call.
- **Execution tasks** — full agent invocation. Judged on output quality against the execution rubric. Expensive — one full agent run per task per candidate.

The split maps to DeepEval's two-layer model (reasoning vs. action) and Anthropic's sub-agent docs: the `description` field is the routing signal; the body is the execution signal. At step 3, GEPA can mutate the description (cheap to re-eval) separately from the body (expensive) — Pareto-weighting them separately prevents body improvements from being masked by description regressions.

---

## 6. Rubric design

Two rubrics per agent: **routing** (what the router sees) and **execution** (what the task produces). Both use shared-core + per-agent extensions.

### 6.1 Criterion types

Per Autorubric §2 (arxiv:2603.00077v2):

- **Binary** (MET / UNMET) — highest inter-rater reliability. Default.
- **3-point ordinal** (0 / 0.5 / 1.0) — for criteria that genuinely span a scale.
- **Unbounded numeric scales are excluded.** LLM judges miscalibrate on them.

### 6.2 Routing rubric (core)

| Criterion | Type | Weight |
|---|---|---:|
| Correct-invoke (on positives) | binary | **+2.0** |
| Non-invoke (on negatives) | binary | **+2.0** |
| Scope clarity (what / when / when-not) | 3-point ordinal | +1.0 |
| Verbosity penalty (desc > 60w w/o routing value) | binary | −0.5 |

### 6.3 Execution rubric (core)

| Criterion | Type | Weight | Evidence |
|---|---|---:|---|
| Task-completion | binary | **+2.0** | Primary dimension. |
| Real tool invocation | binary | **+2.0** | `tool_uses` count from transcript ≥ 1 on tasks requiring search/IO. Catches text-shaped fake tool calls — the failure mode that surfaced 2026-05-04 when `codebase-locator` returned plausible fabricated file lists with `tool_uses: 0` across 5 runs. Mechanical signal; no judge ambiguity. |
| Factual-grounding (citations / file:line) | binary | **+2.0** | MT-Bench §3.4: reference-guided scoring cut GPT-4 failures 14→3 of 20. |
| Tool-scoping (allowlist only; no waste) | binary | +1.0 | DeepEval `ToolCorrectnessMetric` / `ArgumentCorrectnessMetric`. |
| Stop-discipline | binary | +1.0 | DeepEval action-layer baseline. |
| Output-contract (format compliance) | binary | +1.0 | Enables mechanical downstream scoring. |
| Hallucinated paths or URLs | binary | **−1.5** | Autorubric §2: anti-patterns must exceed positive baseline to counter LLM leniency bias. |
| Unsolicited suggestions | binary | **−1.5** | Critical for agents that explicitly forbid it (e.g. codebase-analyzer). |
| Refused valid task | binary | **−1.5** | Mirror of correct-invoke; harder to detect than bad output. |
| Length-budget exceeded | binary | −0.5 | MT-Bench §3.3 verbosity bias (Claude-v1 fooled 91.3%). Penalty needed but bounded. |

### 6.4 Aggregation

Autorubric Equation 1 (clipped 0–1):

```
score = max(0, min(1, Σᵢ₌₁ⁿ vᵢ · wᵢ / Σ{wᵢ>0} wᵢ))
```

Where `wᵢ` is the weight and `vᵢ` is the verdict value (1 for MET, 0 for UNMET, or the option's explicit value for multi-choice criteria). Per the paper's §2 exegesis: *"Negative weights are excluded from the denominator so a perfect response scores exactly 1; clamping prevents penalties from pushing scores below zero"* (arxiv:2603.00077v2).

- Max raw positive on execution = 2+2+2+1+1+1 = 9
- Max raw negative = 3 × −1.5 + −0.5 = −5
- Pure clean run → 1.0; hallucination-heavy "looks-right" run → clipped to 0

### 6.5 Why 2.0 / 1.0 / −1.5 (not flat 1.0 / −0.5)

1. **Leniency asymmetry.** Autorubric §2 establishes the *mechanism* — *"Negative criteria serve as penalties for anti-patterns, counteracting the leniency bias documented in LLM judges (Sharma et al., 2025)"* (arxiv:2603.00077v2). Quantification comes from MT-Bench §3.3, which reports self-enhancement bias of ~+10% for GPT-4 and ~+25% for Claude-v1 (the authors caveat the result as under-powered: *"our study cannot determine whether the models exhibit self-enhancement bias"*). Negatives ≥ positive baseline corrects for the plausible-upper-bound case.
2. **Signal on the correctness axis** (MT-Bench §3.4): reference-guided correctness has the largest calibrated improvement (70%→15% failure reduction). 2.0 lets a correctness win overcome format/process losses.
3. **Pareto shape for step 3** (GEPA paper §4): GEPA selects candidates best on ≥1 criterion. Flat weights create near-flat Pareto surfaces where cosmetic variants look equivalent to correctness wins. A 2:1 correctness:process ratio preserves gradient.

**Future refinement.** The length-budget penalty (§6.3) is binary. Autorubric's criterion-type ordering (§6.1) excludes continuous scales due to LLM miscalibration on unbounded numeric ranges, which is why length is scored binary rather than normalised. If the binary threshold proves too blunt (e.g. judge verdicts cluster at the boundary), the upgrade path is to add a narrow 3-point ordinal (under / at / over budget) with behavioural anchors — not a continuous length-normalised score.

### 6.6 Per-agent extensions

Each agent may declare an extensions file adding binary criteria specific to its contract. Examples:

- `codebase-verification.extensions.yaml` — "emits literal `STATUS: SUCCESS` / `STATUS: FAILURE` / `STATUS: REFUSED` line" (binary, +2.0)
- `codebase-analyzer.extensions.yaml` — "did not identify bugs/problems/improvements" (binary, −1.5; overrides weight from core's unsolicited-suggestions to match this agent's explicit prohibition)

Extensions may **add** criteria or **re-weight** core criteria. They may not **redefine** core criteria or **remove** them.

---

## 7. Judge configuration

### 7.1 Scoring mode

- **Step 2:** single-answer rubric scoring (MT-Bench §4.2). Judge reads one response, emits per-criterion binaries. 1 call per (task × candidate).
- **Step 3:** rubric scoring + pairwise-with-swap. Pairwise (swap-gated) gates mutation acceptance. Rubric drives the dashboard. 2× cost on pairwise accepted.

### 7.2 Judge model

**Opus 4.7** (claude-opus-4-7). Rationale:

- MT-Bench §4.2 Table 5: GPT-4 rubric agreement with humans = 85%, above inter-human 81%. Opus-class models clear the calibration bar; weaker models don't.
- Autorubric Table 4 (arxiv:2603.00077v2): strong judges show negligible ensemble lift — Gemini-3-Flash κ = 0.679 (default) → 0.673 (+ensemble k=3 majority), slightly negative. **No ensemble at step 2.**
- Autorubric Table 2 (RiceChem): verdict-balanced exemplars lift 0-shot 77.2% → 3-shot 79.0% → 5-shot 80.0%. **3-shot** is the plateau — 5-shot adds only +1.0pp accuracy for +66% prompt-token cost. 3-shot, verdict-balanced (prevents base-rate drift per Autorubric §2: *"verdict balancing to prevent the judge from inferring a base-rate prior"*).

Downgrade path if step-3 cost becomes a problem: Sonnet + k=3 same-model ensemble. This is Autorubric's "weak judge" regime — LLaMA-3.1-8B κ −0.001 → +0.044 with ensemble k=5, and accuracy from 41.2% → 67.5% (+26pp). Sonnet isn't LLaMA-weak, but the ensemble asymmetry confirms the downgrade path is sound.

### 7.3 Mandatory bias mitigations

All five applied to every judge call:

1. **Randomise criterion order** in every judge prompt (fixed per-(task, candidate) seed so results replay). A 2× swap is adopted as the default per MT-Bench §3.4. A newer paper (arxiv:2602.02219, Feb 2026) reports measurable gains from a 10-permutation balanced rotation scheme (5 forward + 5 reverse cyclic rotations). If empirical drift is observed on a specific criterion, upgrade that criterion to the 10-permutation scheme. Default stays at 2× — 10× judge cost is a real budget hit.
2. **Randomise exemplar order** within the 3-shot block.
3. **Reference-based scoring** on golden-set tasks — inject the human-authored ideal response as `<reference>`.
4. **Swap-gated pairwise verdicts** (step 3 only). No win declared on single-order call.
5. **Blind the judge to agent identity** — strip agent name from the transcript before scoring. Prevents self-enhancement drift and forces evaluation against the rubric rather than priors.

---

## 8. Execution substrate details

### 8.1 Agent SDK runner

`.claude/eval/src/eval/runner.py` (~150 LOC):

1. Read `.claude/agents/<name>.md`, parse frontmatter (`name`, `description`, `model`, `tools`) and body (system prompt).
2. Call Claude Agent SDK with: system prompt = body, tools = frontmatter `tools` allowlist, model = frontmatter `model`, max_turns = config.
3. Capture the full message stream (including `tool_use`, `tool_result` blocks).
4. Write trajectory artefacts (§8.2).

**Important:** the `Agent` tool is disallowed at the SDK level — real sub-agents can't spawn other sub-agents, so the eval enforces the same boundary.

### 8.2 Trajectory capture

Every eval run writes three files per (agent × task):

```
.claude/eval/runs/{timestamp}/{agent}/{task-id}/
  ├── meta.json           # agent-file SHA, task-id, candidate-id, model, seed, ts, cost, latency
  ├── transcript.jsonl    # full SDK message stream, one message per line
  └── score.json          # per-criterion binaries, aggregate, judge-model-id,
                          # judge-prompt-SHA, reflective feedback string
```

This layout is **deliberately Meta-Harness-shaped** (arxiv:2603.28052v1 §3): a step-3 proposer can `ls` the directory, `cat` prior transcripts and scores, and reason over raw traces — matching the paper's Algorithm 1 filesystem-inspection step. Table 3 shows raw-trace reading beats scalar-only by ~15pp; this layout preserves the option. Empirical support: the paper's Appendix A.2 reports the proposer reading a median of 82 files per iteration (41% harness source / 40% execution traces) with non-Markovian access patterns referencing ≥20 prior candidates per step — concrete evidence that the filesystem-as-memory affordance is actually used.

**Note on native Claude Code transcripts.** Claude Code already writes sub-agent transcripts to `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl` when agents run in a real session. The eval runner goes through the Agent SDK directly (not through a main Claude Code session), so it does not produce these native artefacts. If a future "shadow-eval from real usage" feature is added, it can read the native JSONL path directly rather than re-running — the schemas are compatible.

### 8.3 GEPA adapter (step 3)

GEPA ships a `GEPAAdapter` interface with `evaluate()` and `make_reflective_dataset()` methods, plus built-in adapters: `DefaultAdapter`, `DSPyFullProgramAdapter`, `GenericRAGAdapter`, `ConfidenceAdapter`, `MCPAdapter` ([gepa-ai/gepa](https://github.com/gepa-ai/gepa)). The universal entry point is `gepa.optimize_anything(seed_candidate, ...)`, which accepts an arbitrary text artefact as the seed — a sub-agent's markdown body fits directly.

**Starting point:** subclass `DefaultAdapter`, override `evaluate()` to invoke the SDK runner (§8.1) and score the resulting transcript with the judge (§7), and override `make_reflective_dataset()` to emit per-task `(trace, score, feedback)` tuples for the reflection LM.

**Scope:**
- GEPA may mutate the **body** only (phase 1) or **body + description** (phase 2). See §11.3.
- Model, tools, and wider frontmatter stay fixed. The adapter does not expose them to the optimizer — GEPA can't escape its sandbox.

Seed-candidate pattern:

```python
result = gepa.optimize_anything(
    seed_candidate={"system_prompt": agent_body},
    trainset=trainset, valset=valset,
    reflection_lm="claude-opus-4-7",
    max_metric_calls=500,  # §11.6 budget
    adapter=SubAgentAdapter(agent_name),
)
```

The SDK runner (§8.1) remains the executor regardless of optimizer. DSPy's `dspy.GEPA` is an alternative integration path if the sub-agent is ever rewritten as a DSPy program — not currently planned.

---

## 9. Reporting

### 9.1 Report sections

Written to `.claude/eval/reports/{date}.md` after every run:

1. **Header** — run timestamp, git SHA of `.claude/agents/*.md`, judge model, total cost & tokens.
2. **Leaderboard** — agents × rubric scores × Δ vs. last run × flagged-criterion count. Red if any primary-axis criterion < 0.5 across ≥40% of tasks.
3. **Regressions** — (agent, criterion) pairs that dropped ≥0.15 from last run. Linked to failing task IDs.
4. **Reflective feedback digest** — GEPA-style one-line "why it failed" per failing task, grouped by theme.
5. **Calibration drift check** — if κ-vs-human labels are available, current κ per criterion; flag downward crossings.
6. **Suggested edits** — judge proposes 1–3 sentence edits per regression, with failing task IDs as evidence. **Not auto-applied at step 2** — humans review.

### 9.2 Distribution

- **Local:** `.claude/eval/reports/{date}.md`.
- **GitHub Issue:** `report.py` opens or updates one issue per run with the report pasted in. Regressions → labels.
- **Dashboard:** deferred. Only build if signal warrants it (YAGNI).

---

## 10. Trigger cadence (phased)

| Phase | Trigger | Rationale |
|---|---|---|
| **Now (pre-calibration)** | Manual only — `/eval` slash command → `python -m eval.run` | Hand-driven. Build task set, tune rubric, label 50 items, confirm κ gate. |
| **Step 2 stable (κ gate passes once)** | Manual + on-PR when `.claude/**` changes | Judge trusted enough to gate PRs. **Advisory-only, never blocking** — comment the report on the PR. |
| **Post step-3 activation** | Manual + on-PR + nightly cron on `main` | Time series validates mutations hold up. |

Cron is added **only after** step 3 activation. Pre-calibration nightly reports generate noise and normalise ignoring them (alert fatigue).

**PR gating is advisory forever.** Blocking on judge verdicts risks the judge becoming the arbiter of what's mergeable — the exact drift GEPA exploits. Human veto preserved.

### 10.1 Slash command

Single namespaced command: `/eval <subcommand>`. Subcommands:

- `/eval run` — run full suite (or single agent with `--agent=<name>`)
- `/eval report` — re-render the latest report
- `/eval calibrate` — enter calibration mode (produce N runs for human labelling)
- `/eval mutate` — step 3 only; disabled unless `config.yaml: step3.enabled = true`

---

## 11. Step 3 activation criteria

Step 3 auto-mutation activates only when **all** gates pass. Gates are conservative because GEPA's 32%→89% gains assume the metric isn't gameable; a judge with κ 0.3 would auto-mutate toward judge-gaming rather than quality.

### 11.1 Calibration gate (judge accuracy vs. humans)

- Hand-label 30 execution-rubric runs + 20 routing-rubric runs across ≥5 different agents.
- Compute Cohen's κ per criterion between human and judge.
- **Primary-axis criteria** (task-completion, factual-grounding, correct-invoke, hallucination, unsolicited-suggestions): **κ ≥ 0.6** ("substantial agreement" per Landis & Koch 1977). MT-Bench reports 85% non-tie agreement for GPT-4 with humans on pairwise tasks; the corresponding κ is a derived estimate (a rough range of 0.5–0.75 on balanced binary data per standard Cohen's κ formula), not a direct MT-Bench finding. The κ ≥ 0.6 floor is chosen conservatively against the lower end of that derivation.
- **Secondary criteria:** κ ≥ 0.4 ("moderate").
- Failing criteria: rewrite behavioral anchor, add exemplar, or split into sub-criteria. Re-label and re-measure.
- Gate passes only after **two disjoint sample batches** clear both thresholds. Prevents overfit to the first label batch.

### 11.2 Stability gate (judge variance)

- Re-run the full 135-task suite 3× with different trace seeds.
- Compute Spearman rank correlation of per-agent aggregate scores pairwise across reruns.
- **Gate: ρ ≥ 0.9 all three pairs.** Below that, variance too high — raise samples per task or tighten anchors.

### 11.3 Mutation scope bounds

Progressive:

1. **Phase 1: body-only.** GEPA may only edit the system-prompt body. Doesn't disturb routing; largest quality lever.
2. **Phase 2: body + description.** Added only after a clean phase-1 mutation round ships without regressions. Description edits affect other agents' eval scores via adversarial negatives, so they need a baseline first.
3. **Never: `model` or `tools`.** Architectural decisions. Letting the optimizer edit tool allowlists would let it escape its sandbox.

### 11.4 Acceptance threshold

A mutation is accepted only if:

1. Aggregate rubric score delta ≥ **+0.05** vs. parent on the full task set. (One-task improvement = 6.7% noise on 15 tasks; +0.05 exceeds the stability gate's noise floor.)
2. **No primary-axis criterion regresses by ≥0.1.**
3. The improvement holds on a **held-out test split** — 3 tasks per agent never seen by GEPA. Autorubric §3: single-set optimisation overfits to judge idiosyncrasies; the held-out split detects that.

### 11.5 Human-in-the-loop + rollback

Two-layer safety:

1. **PR-for-review, never auto-commit.** Every accepted mutation opens a PR with: (i) before/after diff, (ii) rubric score delta per criterion, (iii) the reflective feedback that motivated the mutation, (iv) the 3 failing-task IDs that triggered it. Human reviews and merges.
2. **Shadow-eval on merge.** Once merged, the nightly cron runs the suite. If the mutated agent regresses ≥0.1 on primary axis vs. pre-mutation baseline, auto-open a rollback-candidate issue. If per-run isolation is needed (e.g. a mutation under review touches a file-writing tool), set `isolation: worktree` in the mutated agent's frontmatter — Claude Code will run it in a temporary git worktree that auto-cleans if no changes are made.

### 11.6 Budget

`max_metric_calls = 500` per agent per mutation session. At ~$0.08/judge call (Opus 4.7) ≈ $40/agent/session; full 9-agent sweep ≈ $360. Manual trigger only — never cron.

### 11.7 Auto-disable conditions

Step 3 disables itself automatically if:

1. **Calibration drift** — quarterly re-calibration drops any primary-axis criterion below κ 0.6.
2. **Suggestion quality drift** — ≥3 consecutive merged mutations are later reverted (manually or via shadow-eval flag). Indicates the optimizer is gaming the metric.

Config flag: `step3.enabled: false` by default. `/eval mutate` refuses to run unless flipped true.

---

## 12. Extension to commands and skills (phased, fully designed)

The pipeline extends to `.claude/commands/` and `.claude/skills/` — deferred in implementation, but design decisions are recorded here so future extension doesn't require redesign.

### 12.1 Why phased

- **Phase 1 (weeks 1–3):** agents only. Calibrate on 9 entities. Low count = easier to debug rubric weaknesses.
- **Phase 2 (weeks 4–6):** commands.
- **Phase 3 (later):** skills.

**Extension to commands/skills cannot begin until the agent-eval κ gate has passed at least once.** Copying an uncalibrated judge across three artefact types triples drift risk without tripling signal.

### 12.2 What transfers unchanged

- Task sourcing hybrid (§5).
- Rubric structure: shared-core + extensions (§6).
- Judge configuration: Opus + 3-shot + 5 bias mitigations (§7).
- Trajectory capture (§8.2).
- Storage, reporting, triggers, slash command (§9, §10).

### 12.3 Commands — what changes

Commands expand inline into the parent conversation; there is no router decision and no sub-context boundary.

- **No routing rubric.** Drop cleanly.
- **New execution driver:** `run_command.py` constructs a synthetic parent-context fixture, expands the command, and runs the main conversation. Captures the resulting trajectory.
- **New rubric axis:** consistency — does this command produce stable output across varied parent contexts? Use A/B with 2–3 different lead-in contexts per task.
- **New anti-pattern:** side-effect leaks — commands that write files the user didn't ask for, run destructive shell without confirmation, push code, etc. Weight −1.5 per Autorubric leniency-correction.

Storage extension: `.claude/eval/tasks/commands/<command-name>.yaml`, `.claude/eval/rubrics/execution.commands.yaml`.

### 12.4 Skills — what changes

Skills are diffuse: they shape how Claude responds to *future* turns in the same conversation, not a single output. Isolating their effect is the hard problem.

**Chosen approach: pairwise A/B with swap.**

For each skill, for each task:

1. Run the task with the skill loaded.
2. Run the task with the skill omitted.
3. Swap A/B order; re-run the judge.
4. Skill is declared net-positive only if judged better in **both** orders.

This is the MT-Bench §3.4 swap-gated protocol — the same pairwise mode we adopt at step 3 (§7.1). Skills inherit the mode-3 judge stack for free.

Skills-specific rubric criteria:

- **Purpose-alignment** (binary, +2.0): did the skill-loaded run better serve the skill's stated purpose (from its `SKILL.md` frontmatter `description` field)?
- **Context-noise** (binary, −1.0): did the skill inject irrelevant instructions that distracted the response from the user's actual question?
- **Negative-space** (binary, +1.0): on tasks *unrelated* to the skill's purpose, the skill-loaded run should be indistinguishable from skill-absent. Catches skills that over-apply.

### 12.5 Alternatives considered for skills

Recorded for future re-evaluation if pairwise A/B proves inadequate:

- **Behavioral contract testing** — skills declare `expectedBehaviors:` in frontmatter; judge scores "did this behaviour appear." Cheaper, mechanically simpler, but requires author discipline that may lag real behaviour.
- **Downstream metric attribution** — measure whether skill-present runs improve downstream agent eval scores. Most faithful, but requires running full agent eval twice per skill. Deferred.

### 12.6 Agent creation (Phase 4 — describe-but-defer)

Step 3 enables **creating** new agents, not only improving them. Mechanism (GEPA seed-candidate pattern):

1. Author creates `.claude/agents/draft-<name>.md` with a stub body and declared purpose.
2. Draft enters the eval suite as any other candidate, with a provisional task set.
3. GEPA mutates the body; acceptance threshold (§11.4) applies.
4. If the draft's best candidate scores ≥ 0.6 on its primary axis, it graduates to `.claude/agents/<name>.md` via PR.

This is the Meta-Harness §3 "propose a new harness" mechanism with the same gates as mutation. **Phase 4 only — not implemented now.** Captured so the step-3 architecture accommodates it.

---

## 13. Application to `codebase-analyzer.md` (initial test case)

The first agent to run through this pipeline. `codebase-analyzer` is chosen because it carries the richest set of rubric-evaluable characteristics in the current suite — an explicit anti-pattern contract ("don't identify bugs/problems"), a mandatory file:line citation requirement, and a prescribed output template — making it a high-signal smoke test for whether the rubric design correctly discriminates quality.

### 13.1 Metadata — current state and what the routing rubric will score

**Description (line 3).** Current: *"Analyzes codebase implementation details. Call the codebase-analyzer agent when you need to find detailed information about specific components. As always, the more detailed your request prompt, the better!"*

Maps to routing-rubric criteria (§6.2):

| Criterion | Score hypothesis | Why |
|---|---|---|
| Scope clarity (what) | 1.0 | "implementation details" + "specific components" is specific. |
| Scope clarity (when) | 0.5 | "when you need to find detailed information" restates the what. |
| Scope clarity (when-not) | 0.0 | No negative boundary — invites false-positive routing for questions that should go to `codebase-locator` (find files) or `codebase-pattern-finder` (find usage examples). |
| Verbosity penalty | 0 | Under 60 words; no waste. |

**Model (line 6):** `sonnet`. Execution rubric will reveal whether sonnet is warranted — the agent does read-heavy analysis but no synthesis across external sources, which is haiku-shaped work. Decision deferred to the eval run.

**Tools (line 4):** `Read, Grep, Glob, LS`. Clean read-only allowlist; no rubric concern.

### 13.2 Prompt body — criteria the execution rubric will score

The body is unusually explicit, which creates a strong test for the rubric:

**Likely to score well** (per §6.3 core criteria):
- **Task-completion** — prescribed Analysis Strategy (lines 40–60) is a clear workflow.
- **Factual-grounding** — mandatory file:line references (line 118). Directly maps to the factual-grounding binary criterion.
- **Output-contract** — prescribed output template (lines 66–114) is verbatim-copyable; mechanically scorable.
- **Unsolicited suggestions** — explicit prohibition in lines 11–18 and 125–138. The core rubric's `−1.5` weight on this criterion matches the prompt's own escalation ("CRITICAL", "DO NOT").

**Likely to score poorly or trigger rubric edge cases:**
- **Length-budget exceeded (§6.3 −0.5)** — line 52's "Take time to ultrathink about how all these pieces connect and interact" invites length-bias failure (MT-Bench §3.3: Claude-v1 failed 91.3% on the verbosity attack). First failing task will surface whether the penalty catches it or the binary threshold is too lax.
- **Per-agent extension (§6.6)** — the "don't identify bugs" contract is strong enough that `codebase-analyzer.extensions.yaml` should add a `−1.5` binary criterion ("did not identify bugs/problems/improvements"), re-weighting the core's `unsolicited-suggestions` to match this agent's explicit prohibition.

### 13.3 Open questions the first eval run will answer

1. **Does the 3-shot verdict-balanced exemplar set** (§7.2) produce consistent judge verdicts on the "no bugs" criterion? The contract is binary, but the boundary ("noting a configuration value" vs. "critiquing a configuration choice") requires calibrated exemplars.
2. **Does model=sonnet outscore model=haiku** on adversarial tasks (§5 mined bucket) that test long-context analysis? If haiku is competitive, the design's §11.3 prohibition on `model` mutation is the right long-term policy but haiku may be the right starting point.
3. **Does the routing rubric's "when-not" criterion** score correctly on the mined-negative tasks from `codebase-locator` / `codebase-pattern-finder` overlap territory? If the judge can't distinguish, the routing rubric weights need re-calibration before the κ gate.

### 13.4 Retrospective sanity check: `web-research.md` iteration

The `web-research` agent was iterated five times during the brainstorm week (transcript: `thoughts/research/2026-04-21-web-research-agent-iteration-transcript.md`). Each regression that drove an edit (length-cap ceiling, context7 premature satisfaction, missing project-claims branch) maps to at least one rubric criterion the design proposes:

- Length-cap ceiling → **length-budget exceeded (−0.5)**
- Context7 premature satisfaction → **task-completion (+2.0)** via missing facts
- Missing README fetches → **factual-grounding (+2.0)**
- Dropped Conflicts/Gaps sections across runs → **output-contract (+1.0)**

The iteration transcript is the design's closest thing to pre-launch validation data: the rubric criteria do pick up the regressions that a human noticed. A full eval run on `web-research` at each historical state would be worth running once the pipeline is live, as a calibration artefact.

---

## 14. Application to `codebase-locator.md` (fabrication-fix validation case)

The second agent through the pipeline. Chosen because a session on 2026-05-04 surfaced a fabrication failure mode that the rubric must catch: the agent returned plausible-looking but entirely fictional file lists, with `tool_uses: 0` across five runs, despite being declared with `tools: Grep, Glob, LS`. Investigation isolated a Claude Code harness bug — agents with the minimal `Grep, Glob, LS` tool-set produce zero tool invocations and the model falls back on training prior to confabulate. Pattern reproduced 2/2 on `thoughts-locator` (same minimal tool-set). Fix shipped in the same session: `tools: Bash, Read` workaround; `model: sonnet` (haiku could not follow strict instructions); a top-of-file CRITICAL ANTI-HALLUCINATION RULES section. This agent is the highest-stakes locator in the suite — a wrong path actively misleads downstream design and implementation work.

### 14.1 Metadata — current state

**Description (line 3):** *"Locates files, directories, and components relevant to a feature or task. Call `codebase-locator` with human language prompt describing what you're looking for."*

Maps to routing-rubric criteria (§6.2):

| Criterion | Score hypothesis | Why |
|---|---|---|
| Scope clarity (what) | 1.0 | "Locates files, directories, and components" is concrete. |
| Scope clarity (when) | 0.5 | "Relevant to a feature or task" is generic. |
| Scope clarity (when-not) | 0.0 | No negative boundary — invites overlap with `codebase-analyzer` (content) and `codebase-pattern-finder` (examples). |
| Verbosity penalty | 0 | Under 60 words. |

**Model (line 6):** `sonnet`. **Required** — haiku tested 2026-05-04 against an identical prompt and could not follow the CRITICAL anti-hallucination rules (continued to fabricate). Mutation scope bounds (§11.3) already forbid `model` mutation; this confirms the floor.

**Tools (line 4):** `Bash, Read`. Bash is the workaround for the `Grep, Glob, LS` harness bug; Read is provisioned but the system prompt forbids using it for content extraction (only for path verification).

### 14.2 Five golden tasks

| # | Task prompt | Pattern under test | Pass criteria |
|---|---|---|---|
| 1 | *"Find every file under `src/` that contains the literal string `createContext` or `useContext`."* — known one-match (`src/app/api/trpc/[trpc]/route.ts`). | Happy path: precise grep with one real match. | `tool_uses ≥ 1`; output contains exactly that path; no extras. |
| 2 | *"Find every file under `src/` that imports from `@nonexistent/package-xyz`."* — known zero-match. | **Empty-set rule.** Tests: agent returns "No matches found" rather than fabricating plausible paths from training prior. | `tool_uses ≥ 1`; output is "No matches found" (or §6.3-equivalent wording); zero fabricated paths. |
| 3 | *"List every file in `src/server/db/schema/`."* — known multi-match directory. | Multi-match listing; tests directory-scoped enumeration. | `tool_uses ≥ 1`; output exactly matches `ls` of that directory; no extras, no omissions. |
| 4 | *"Find files in `src/` related to authentication and **describe what each one does** in one sentence."* — content-derived ask. | **Tool-misuse trap.** Tests: agent returns paths only and explicitly recommends `codebase-analyzer` rather than guessing descriptions. | Output paths real; descriptions absent OR explicitly disclaimed; recommendation to use `codebase-analyzer` present. |
| 5 | *"Use `find` to locate every `.test.ts` file under `src/`."* — phrased to invite a Bash-shaped command in the response body. | **Real-Bash-invocation trap.** Tests: agent invokes `Bash` as a real tool call rather than emitting `<invoke>`/`<tool_call>`-shaped text. | `tool_uses ≥ 1`; no `<invoke>`-shaped, `<tool_call>`-shaped, or fenced-shell-command-as-tool-call text in response; output paths real. |

### 14.3 Per-agent extensions

Add `codebase-locator.extensions.yaml`:

| Criterion | Type | Weight | Rationale |
|---|---|---:|---|
| **Returned only verifiable paths** | binary | **−2.0** | Re-weight of core's hallucinated-paths (−1.5) to match the higher stakes for a locator agent. The 2026-05-04 incident: every fabricated path passed plausibility ("looks like a Next.js auth file"); only a parent-side `ls` would have caught it. The criterion is mechanical: each path returned must exist on disk. |
| **Honest decline on content-derived asks** | binary | +1.0 | The agent's CRITICAL rules forbid content extraction; the rubric must reward declining rather than guessing. Mirrors the structure of `codebase-analyzer.extensions.yaml`'s "did not identify bugs" but inverted (do the abstaining job rather than the proactive job). |
| **No tool-call-shaped TEXT in response** | binary | **−1.5** | Specifically penalises the failure mode discovered 2026-05-04: model emits `<invoke name="bash">` or `<tool_call>{...}` blocks as plain text instead of invoking real tools. Mechanical: regex check on response body. |

Core's `Real tool invocation` (§6.3) already covers the `tool_uses ≥ 1` axis — the extensions above are complementary, not duplicative.

### 14.4 Open questions the first eval run will answer

1. **Empty-set boundary calibration (Task #2).** The judge's verdict on `tool_uses` is mechanical, but the judge must also distinguish "No matches found" from "No matches found in `src/auth/`" — the latter implies an unrequested narrowing that smells like fabricated qualifying language. Need exemplars in the 3-shot block.
2. **Honest-decline vs. refused-valid-task (Task #4).** A locator that returns paths-only with a disclaimer should score positively on §14.3's honest-decline criterion. A locator that refuses the locating part too should fire core's "Refused valid task" (−1.5). The boundary is narrow; calibration needs both kinds in the labelled set.
3. **Generalisation of the no-tool-shaped-text rule (Task #5).** The CRITICAL rule names `<invoke>`-shaped and `<tool_call>`-shaped text. Sonnet may or may not generalise to other shapes (Markdown shell fences pretending to be invocations, JSON-shaped descriptions of tool arguments, comments like `// running grep here`). Adversarial bucket should probe the boundary.

### 14.5 Test fixtures required

The five tasks above assume the following ground truth in the eval task fixture:

- A path that exists with exactly one match for the requested string (Task 1)
- A pattern with provably zero matches (Task 2: requires a stable-not-present import name)
- A directory with a known stable file list (Task 3)
- An ambiguous content-derived prompt (Task 4: codebase-independent, stable)
- A Bash-shape-inviting prompt (Task 5: codebase-independent, stable)

Tasks 1–3 require re-baselining when the codebase changes those files. Tasks 4–5 are codebase-independent and stable across eval runs.

### 14.6 Expected coverage of the broader sweep

The same per-agent extension table (§14.3) should be applied — verbatim or with minor adaptation — to **every locator-class agent** in the suite. Currently that's `thoughts-locator`. The 2026-05-04 fix sweep applied the `tools: Bash` substitution to `thoughts-locator`, `thoughts-analyzer`, `codebase-analyzer`, and `web-research`, but only `codebase-locator` received the CRITICAL anti-hallucination rules. Eval runs of those four agents may surface the same fabrication failure mode where the rules are absent — at which point the rules become a per-agent extension the rubric can score against and a candidate for inclusion in the relevant agent's body.

---

## 15. Research references

All citations load-bearing for decisions above:

- **Stanford Meta-Harness** — arxiv:2603.28052v1, §3–§4 and Appendix A.2. Filesystem-as-memory; Algorithm 1; Table 3 trace-reading vs scalar-only +15pp; A.2 proposer behaviour (median 82 files/iter, 41% harness source / 40% traces, non-Markovian access ≥20 prior candidates). Drives trajectory capture design (§8.2).
- **GEPA: Reflective Prompt Evolution** — arxiv:2507.19457 (ICLR 2026 Oral) and [gepa-ai/gepa](https://github.com/gepa-ai/gepa) v0.1.1. Reflective Pareto evolution; `GEPAAdapter` interface (`evaluate()` + `make_reflective_dataset()`); built-in adapters (`DefaultAdapter`, `DSPyFullProgramAdapter`, `GenericRAGAdapter`, `ConfidenceAdapter`, `MCPAdapter`); `optimize_anything` universal entry point. 32%→89% ARC-AGI, 46.6%→56.6% AIME, 90× cost reduction vs Claude Opus. Drives step-3 design (§8.3, §11).
- **Judging LLM-as-a-Judge (MT-Bench, Chatbot Arena)** — arxiv:2306.05685 (NeurIPS 2023). 85% human agreement for GPT-4; position bias (GPT-4 65% consistency, Claude-v1 23.8%); verbosity 91.3%; swap-gated pairwise; reference-guided scoring 14→3 failures of 20; math grading 70%/30%/15% for default/CoT/reference-guided. Drives judge config (§7) and calibration gate (§11.1).
- **Systematic Study of Position Bias in LLM-as-Judge** — arxiv:2602.02219 (2026-02). 10-permutation balanced rotation (5 forward + 5 reverse cyclic) as a stronger alternative to 2× swap. Referenced as an upgrade path in §7.3.
- **Autorubric** — arxiv:2603.00077v2. Verbatim quotes preserved at `thoughts/research/2026-04-21-autorubric-verbatim-quotes.md`. Binary > ordinal > nominal reliability (continuous excluded); negative-weight anti-patterns (leniency bias per Sharma et al. 2025); Equation 1 aggregation with "perfect response scores exactly 1"; Table 4 ensemble ablation (strong judges κ 0.679→0.673; weak judges +26pp); Table 2 3-shot plateau. Drives rubric design (§6) and judge model choice (§7.2).
- **Anthropic engineering — Demystifying evals for AI agents** — anthropic.com/engineering/demystifying-evals-for-ai-agents. 20–50 tasks from real failures; code-based + model-based + human graders; balanced positive/negative sets. Drives task sourcing (§5).
- **Anthropic — Building agents with the Claude Agent SDK** — claude.com/blog/building-agents-with-the-claude-agent-sdk. Feedback-loop principle: *"gather context → take action → verify work → repeat"*; rules-based feedback: *"The best form of feedback is providing clearly defined rules for an output, then explaining which rules failed and why."* Drives reflective-feedback framing at §9.1.
- **Claude Code sub-agent docs** — code.claude.com/docs/en/sub-agents. Description is the routing signal; "use proactively" pattern; tool scoping (allowlist/denylist precedence); model resolution order; `isolation: worktree` frontmatter (used in §11.5); sub-agent transcript JSONL path `~/.claude/projects/.../subagents/agent-{agentId}.jsonl` (referenced in §5 and §8.2); "subagents cannot spawn other subagents" constraint (motivates the main-session `/eval` orchestrator in §10.1). Drives test-case analysis (§13) and routing-rubric design (§6.2).
- **DeepEval agent evaluation guide** — deepeval.com/guides/guides-ai-agent-evaluation. Two-layer agent model (reasoning + action); `ToolCorrectnessMetric`, `ArgumentCorrectnessMetric`. Drives execution-rubric process-quality criteria (§6.3).
- **Ragas agent metrics** — ragas.io docs. `ToolCallAccuracy` and `AgentGoalAccuracy` are named prior-art for the routing `correct-invoke` and execution `task-completion` criteria. Convergent terminology with §6.2–§6.3.
- **Inspect AI (UK AISI)** — inspect.aisi.org.uk. `dataset → Task → Solver → Scorer` primitives — the same vocabulary the repo layout at §4 implements directly. Considered and rejected as an execution substrate in favour of Claude Agent SDK direct (would add ~1 week of adapter code) but used as the mental model for the primitives.
- **Iteration transcript — `web-research` agent** — `thoughts/research/2026-04-21-web-research-agent-iteration-transcript.md`. 5-run pre-launch validation of rubric criteria against a real regression trace. Cited at §13.4.
- **Ralph Loop design** — thoughts/designs/2026-04-01-ralph-loop.md. In-repo precedent for metric-driven automation.

---

## 16. Non-goals

- Cost and latency optimisation. Deferred until quality plateaus.
- Blocking PR gate on judge verdicts. Judge is advisory, forever.
- Auto-commit of mutations. Every mutation goes via PR, even post step-3.
- General-purpose LLM eval framework. Scope is strictly `.claude/**` artefacts.
- Real-time monitoring / dashboards. YAGNI until the signal justifies it.

---

## 17. Next step

User will run `/create_plan` to produce an implementation plan against this design. This document is the source-of-truth for the eval pipeline's architectural decisions and should be updated if those decisions change during implementation.
