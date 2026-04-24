# Autorubric — Verbatim Quotes for Design Citation

**Date fetched:** 2026-04-21
**Source:** [Autorubric: Unifying Rubric-based LLM Evaluation (arXiv:2603.00077v2)](https://arxiv.org/html/2603.00077v2)
**Fetch agent:** `web-lookup` (sonnet + context7)
**Purpose:** Load-bearing citations for `thoughts/designs/2026-04-21-sub-agent-eval-pipeline.md`. Preserved verbatim so future design edits don't need to re-fetch and risk the arXiv URL drifting.

Cited in design doc at: §6.1 (criterion types), §6.4 (aggregation), §6.5 (weight asymmetry), §7.2 (no-ensemble decision), §11.4 (held-out split).

---

## 1. Criterion type ordering (§2) — cited at design §6.1

> "Binary criteria (MET/UNMET) are the simplest and yield the highest inter-rater reliability. Ordinal criteria use ordered levels (Likert scales) to capture gradations; we encourage narrow scales (3–5 levels) with clear behavioral anchors, since LLM judges exhibit central tendency bias on broad scales (Liu et al., 2023). Nominal criteria offer unordered categories for classification-style evaluation."

**Exclusion of continuous scales:**

> "As a design choice, continuous-valued criteria are intentionally excluded due to poor LLM calibration on unbounded numeric scales (Liu et al., 2023; Zheng et al., 2023)."

**Usage:** supports design §6.1's "Binary (MET/UNMET) — highest inter-rater reliability. Default" and "Unbounded numeric scales are excluded."

---

## 2. Equation 1 — weighted aggregation formula (§2) — cited at design §6.4

Formula as printed in the paper:

```
score = max(0, min(1, Σᵢ₌₁ⁿ vᵢ · wᵢ / Σ{wᵢ>0} wᵢ))
```

Surrounding text:

> "where wᵢ denotes weight and vᵢ denotes the verdict value (1 for MET, 0 for UNMET, or the option's explicit value for multi-choice criteria). Negative weights are excluded from the denominator so a perfect response scores exactly 1; clamping prevents penalties from pushing scores below zero."

**Usage:** the design renders this formula at line 177 — matches the paper. The surrounding text clarifies why the denominator uses only positive weights (so a clean run scores exactly 1) and why clipping to [0, 1] is applied. Worth inlining in §6.4 alongside the formula.

---

## 3. Negative-weight anti-patterns rationale (§2) — cited at design §6.5

> "Criteria carry configurable positive or negative weights. Negative criteria serve as penalties for anti-patterns, counteracting the leniency bias documented in LLM judges (Sharma et al., 2025)."

**Note:** Autorubric itself does not provide numeric evidence for leniency bias — it cites Sharma et al. 2025. Design §6.5's numeric claim ("Claude-v1 self-enhancement bias +25pp") comes from MT-Bench, not Autorubric. The citation chain should be:
- Mechanism (negative weights to counter leniency): **Autorubric §2**
- Quantification of leniency (+25pp): **MT-Bench arXiv:2306.05685 §3.3** (distinct source)

**Follow-up:** if the design wants Autorubric-native quantified evidence of leniency bias, a targeted `web-lookup` for Sharma et al. 2025 is the next step. Not currently critical.

---

## 4. Table 4 — ensembling ablation — cited at design §7.2

**Table 4 caption:**

> "Mitigation ablation on CHARM-100 (80 test items, 6 criteria). Each row toggles one factor from the Default configuration. Acc = exact criterion accuracy; κ = mean Cohen's κ (quadratic-weighted for ordinal); ρ = Spearman on scores; RMSE = score root mean squared error."

**Strong judge (Gemini-3-Flash):**
- Default: κ = 0.679
- +Ensemble (k=3, majority): κ = 0.673
- → Negligible, slightly negative lift on strong judges

**Weak judge (LLaMA-3.1-8B):**
- Default: κ = −0.001 (accuracy 41.2%)
- +Ensemble (k=3, majority): κ = 0.018
- +Ensemble (k=5, majority): κ = 0.044 (accuracy 67.5%)
- → +26pp absolute accuracy improvement for weak judges

**Usage:**
- Design §7.2 "Autorubric Table 4: ensembling strong judges yields negligible lift. No ensemble." → **confirmed verbatim.**
- Design §7.2 "Downgrade path if step-3 cost becomes a problem: Sonnet + k=3 same-model ensemble — the regime where Autorubric shows ensembling actually pays." → **also confirmed** — the LLaMA-3.1-8B row is the "weaker judge where ensembling helps" case, directly supporting the downgrade-path rationale.

---

## 5. Verdict-balanced few-shot exemplars — cited at design §7.2

> "Few-shot calibration includes example submissions with correct verdicts drawn from a training split, with verdict balancing to prevent the judge from inferring a base-rate prior (Hong et al., 2026)."

**Calibration gains (Table 2, RiceChem dataset):**

> "0-shot 77.2% → 3-shot 79.0% → 5-shot 80.0%"

**Usage:** supports design §7.2's "3-shot, verdict-balanced." The 3-shot choice is on the plateau (+1.8pp over 0-shot; 5-shot adds only another +1.0pp). Worth citing in §7.2 to justify not going to 5-shot.

---

## Residual gaps not covered by this lookup

- **Sharma et al. 2025** on LLM leniency bias — cited by Autorubric §2 but not fetched here. Would strengthen design §6.5 if negative-weight quantification becomes contested.
- **Full §3 "held-out split" rationale** — design §11.4 references Autorubric §3 for "single-set optimisation overfits to judge idiosyncrasies." This lookup did not extract §3 directly. If held-out-split justification is challenged during implementation, a follow-up lookup against §3 specifically.
- **Liu et al. 2023** on central tendency bias — cited inline in §2 but not fetched. Only matters if the 3–5 Likert scale choice is challenged.
