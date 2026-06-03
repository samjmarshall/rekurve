---
name: subagent-eval
description: Empirically evaluate and optimise Claude Code sub-agents via a blinded head-to-head against the production baseline, then decide each agent's model on data. Use when tuning a sub-agent's prompt, choosing or re-checking its model (e.g. after a new model release), proving an agent change before committing, or comparing a specialist agent against native Explore. Covers the loop: head-to-head harness, §6.3 rubric, model-decision rule, routing wiring, post-run safety review. To author a brand-new agent first, read AUTHORING.md.
---

# Sub-agent eval & optimise

Prove a sub-agent change with evidence before shipping it. Run three times to date (`codebase-*`, `thoughts-*`, `docs-*`) — reproduce that loop. **Quality is the deciding metric; cost/latency break ties only.**

## When to use

- **Optimise** — a sub-agent's prompt is being edited and the change needs proving.
- **Re-validate** — a new model shipped; re-check which model each agent should run.
- **Compare** — does a specialist actually beat the native `Explore` baseline?
- **Create** — authoring a new agent: read **[AUTHORING.md](AUTHORING.md)** first, then enter this loop.

This is a multi-agent `Workflow` (opt-in — it spends real tokens). Say "use a workflow" / confirm before launching.

## Workflow

1. **Frame & pick entry mode.** State the agent(s) under test and the decision to make (ship this prompt? which model?). For create, do AUTHORING.md first.
2. **Build the benchmark.** Per archetype the agent serves (e.g. locate / analyze):
   - Mine real prompts: `python3 .claude/eval/mine_subagents.py --print` → pull from `.claude/eval/mined/corpus.jsonl`.
   - Add a **golden** task (hand-written, clear oracle) and an **adversarial** task (zero-match / trap).
   - Write a **verified oracle** for each — confirm every expected path/value against the tree *now*.
   - ☐ Include at least one HARD task with headroom. Near-ceiling tasks don't discriminate — a well-curated repo makes even `Explore@haiku` score ~1.0 (see `docs-*` example).
3. **Run the head-to-head.** Adapt **[harness-template.js](harness-template.js)** and launch via `Workflow`. Candidates per task: native baseline (`Explore` @ its production model, usually haiku), specialist @ `sonnet`, specialist @ `opus`.
   - ☐ **Variance-control the deciding axis**: ≥3 runs × ≥2 judges per cell for the model decision; 1 run is fine for low-variance locates.
   - ☐ Judges are **blinded** (no candidate id) and **verify every claimed path/Status/citation against the tree** before scoring. See REFERENCE.md.
   - ☐ Registry gotcha: a just-created agent is NOT in the session's hot registry — either restart to register, or use the harness's adopt-on-disk bootstrap. See REFERENCE.md.
4. **Decide each model quality-first.** Default `sonnet`. Adopt `opus` for an agent ONLY if `mean(opus) ≥ mean(sonnet) + 0.05` AND it isn't dragged by over-templating. Model choice is **task-shaped, not class-shaped** — see REFERENCE.md § Model decision.
5. **Wire routing** (if creating/changing an agent's role). Add it to the command fan-outs (`create_plan.md`, `brainstorm.md`, `iterate_plan.md`) and tighten reciprocal when-not redirects in sibling agents' descriptions.
6. **Verify + safety.**
   - ☐ `make check` via **@agent-codebase-verification** (never run `make` directly).
   - ☐ **After any multi-agent run**: review the FULL `git status` + `git diff`; confirm the agent roster count is unchanged (`ls .claude/agents/*.md | wc -l`); `git restore` anything a sub-agent touched outside the intended seam. A stray sub-agent `Bash` call once deleted an unrelated agent file.
7. **Record.** Write `thoughts/research/<YYYY-MM-DD>-<family>-agent-headtohead.md`, mirroring an existing example: TL;DR → Setup → Results → Decisions applied → Key findings → Per-run JSON → Caveats → Fast follow. Be honest — a tie or a null result is a real finding.

## References

- **[REFERENCE.md](REFERENCE.md)** — §6.3 rubric, §6.4 aggregation, model-decision rule, judge-prompt pattern, registry/bootstrap gotcha, safety checklist, lessons from the 3 runs.
- **[AUTHORING.md](AUTHORING.md)** — how to write a new agent before validating it.
- **[harness-template.js](harness-template.js)** — parameterized `Workflow` head-to-head script; fill the tasks/oracles/candidates and launch.
- **System of record:** `thoughts/designs/2026-04-21-sub-agent-eval-pipeline.md` (§6.2 routing, §6.3 execution, §6.4 aggregation, §14.1 model floor).
- **Worked examples** (copy one): `thoughts/research/2026-06-02-codebase-agent-headtohead.md`, `…/2026-06-03-thoughts-agent-headtohead.md`, `…/2026-06-03-docs-agent-headtohead.md`.
- **Corpus tooling:** `.claude/eval/{mine_subagents,shape_tasks,harvest_hook}.py`.
