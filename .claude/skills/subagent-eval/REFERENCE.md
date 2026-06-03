# Sub-agent eval — reference

Detail behind the [SKILL.md](SKILL.md) workflow. Authoritative source for the rubrics is the design doc `thoughts/designs/2026-04-21-sub-agent-eval-pipeline.md` (§6.2/§6.3/§6.4) — this file distils the parts you need to run a head-to-head, plus the lessons from three runs.

## §6.3 execution rubric (what the judge scores)

Binary per criterion unless noted. Score the full trajectory: tool calls, output, grounding.

| Criterion | Weight | Meaning |
|---|---|---|
| Task-completion | +2 | Did it satisfy the task per the oracle? |
| Real-tool-invocation | +2 | `tool_uses ≥ 1` — real calls, not text-shaped fakes. In a `Workflow` you can't read the transcript count mid-run, so judge a **proxy**: do cited paths actually resolve on disk? |
| Factual-grounding | +2 | Claims carry verifiable refs (`path:line`, ADR #, Status) the judge confirmed against the tree. |
| Tool-scoping | +1 | Stayed within role; no wasted scope (locator = locations only; analyzer = decision/insight only). |
| Stop-discipline | +1 | Stopped without over-iterating. |
| Output-contract | +1 | Matches the prescribed output format. |
| Hallucinated paths/URLs | −1.5 | Cited anything not on disk. Verify each. |
| Unsolicited suggestions | −1.5 | Appended unrequested critique/recommendations (incl. self-inferred staleness an analyzer should have *read* from a recorded Status). |
| Refused valid task | −1.5 | Illegitimately refused. |
| Length-budget exceeded | −0.5 | Bloated past need. |

## §6.4 aggregation (clipped 0–1)

```
score = max(0, min(1, Σ(verdictᵢ · weightᵢ) / Σ{positive weights}))
```

Positive-weight denominator = **9** (2+2+2+1+1+1), so a clean run scores exactly 1.0; penalties pull down but never below 0. Compute this in JS from the judge's booleans — don't ask the model to do the arithmetic.

## §6.2 routing rubric (descriptions only)

Score the agent `description` field, not execution: Correct-invoke on positives (+2), Non-invoke on negatives (+2), Scope-clarity what/when/when-not (0/0.5/1.0), Verbosity penalty if >60 words without routing value (−0.5). Run this as a separate pass when you change descriptions.

## Model decision rule

Default **sonnet** for every agent. Adopt **opus** only if, on the deciding (variance-controlled) axis, `mean(opus) ≥ mean(sonnet) + 0.05` AND opus isn't dragged by over-templating. Bar haiku for anything needing anti-hallucination discipline (§14.1: haiku could not follow the CRITICAL rules in 2026-05-04 testing).

**Model choice is task-shaped, not class-shaped.** Proven across three runs:
- `codebase-analyzer` = **opus** — deep CODE tracing rewards it.
- `thoughts-analyzer`, `docs-analyzer` = **sonnet** — on PROSE distillation, opus over-templates/pads (appends unrequested sections), losing scope/length points faster than its grounding edge earns. Don't reason "analyzer = deep = opus".
- Nuance: opus's padding is **open-ended-distillation-shaped** — on a pointed "what is X and its Status?" it was clean; on "summarize this as shipped" it padded. Sonnet still wins (opus = no upside + higher cost).

## Judge-prompt pattern

- **Blinded**: pass only the task, the verified oracle, and the response text — never the candidate id/model.
- **Verify-first**: instruct the judge to `ls`/`grep`/Read the tree and confirm every claimed path/ADR/Status BEFORE scoring. Judges have tool access in a `Workflow`.
- **Structured output**: force a JSON schema of per-criterion booleans + a `verification` string + `rationale`. Add task-specific discriminator booleans when useful (e.g. `reportedSupersession`, `presentedStaleAsCurrent`).
- **Panel**: ≥2 judges on the deciding axis; average their §6.4 scores per run, then average runs per cell.

## Registry / bootstrap gotcha

A sub-agent file created **this session** is NOT in the harness's hot agent registry — `agentType: 'new-agent'` fails with "not found". Two options:
1. **Restart** the Claude Code session, then invoke the agents as real registered types (cleanest — drops the bootstrap confound).
2. **Adopt-on-disk bootstrap** (no restart): invoke a tool-equipped workflow agent with a preamble — *"Read `.claude/agents/<name>.md` in full and adopt everything below its frontmatter as your operating contract, then do: <task>"*. This exercises the exact prompt and forces a real Read. Document it as a caveat: the tool allowlist is then enforced by instruction, not the harness wrapper.

The native baseline (`Explore`) is always registered, so the comparison stays fair either way.

## Safety review (mandatory after any multi-agent run)

- ☐ `git status --porcelain` — every change is inside the intended seam (the agent file(s), command wiring, research doc). `thoughts/` is gitignored, so the research doc won't appear — confirm it's on disk separately.
- ☐ `ls .claude/agents/*.md | wc -l` — roster count unchanged (catch a stray deletion).
- ☐ `git restore` / remove anything a sub-agent wrote outside the seam.
- The agents' read-only-`Bash` Grounding fence is the structural mitigation; verify after the fact regardless.

## Lessons from the three runs

- **Need headroom to discriminate.** A well-curated repo (explicit Status frontmatter, clear titles, cross-links) lets even `Explore@haiku` hit ~1.0 on analyze tasks — so the specialist *ties* rather than beats. Build at least one hard/adversarial task, and report ties honestly. The specialist's edge often lives in LOCATE + routing discipline, not analyze accuracy.
- **Real-tool-invocation is a proxy** in a Workflow (no transcript `tool_uses` mid-run) — the judge's path-verification covers the fabricated-path case.
- **Variance is large** on prose tasks — a single run swings; the ≥3×≥2 control is what makes the model decision trustworthy.
- **Corpus grows itself** — the `SubagentStop` harvest hook appends real runs to `corpus.jsonl`; mine before each eval to benchmark on real prompts.
