# Private S3: limited non-DONT validation

Checked: 2026-10-09

## Scope and gate

This pack validates one narrow lane: exact mouse SKUs for Apex or VALORANT with MnK on a Windows PC, using explicitly US/USD price fixtures. It does not authorize a general purchase recommendation, deployment, public release, or a production confidence label.

A result may leave `DONT_UPGRADE` only when every machine-readable check passes:

- exact game/input rule assessment whose source IDs resolve to at least two allowed, exact-SKU objective attribute claims; the rule ID, derivation, and calibration state must match the registered game/input rule;
- exact SKU/variant and a buyable lifecycle;
- evidence-supported current-to-candidate delta with at least two critical attributes, one preference-aligned benefit, no supported regression, and at least Medium delta confidence;
- rule-evaluated compatible path with no unknowns or issues;
- no matched or unresolved hard avoid;
- at least two relevant attributes at Evidence C or above;
- product Evidence C or above, calculated from the validated ledger;
- no affiliate input to ranking;
- completed setup checks and no high-priority Fix Before Buy item;
- fresh, in-stock listing whose region and currency match the evaluation context, with a checked date.

Recommendation confidence remains capped at Medium until real purchase outcomes and calibration thresholds pass.

Game fit itself is kept at a neutral `0.5` in this pack. The fixture verifies exact-context routing and attribute lineage; it does not claim that product evidence proves an Apex- or VALORANT-specific performance uplift.

## Evidence B candidates

The grade is calculated, never manually assigned.

| Exact candidate | Variant | Result | Important limit |
|---|---|---|---|
| Razer Viper V4 Pro black | `RZ01-05630100-R3U1` | B | 2026 launch; long-term reliability remains immature |
| Razer Viper V3 Pro black | `RZ01-05120100-R3U1` | B | recurring sensor report is an unquantified community signal |
| Logitech G PRO X2 SUPERSTRIKE | `910-007700` | B | recent product; specialist click assessment is mixed and long-term evidence is immature |

The ledger keeps official facts, measurements, specialist opinions, lifecycle facts, and issue signals as separate claims. RTINGS or other source tables, ratings, prose, images, graphs, videos, and thumbnails are not stored.

## End-to-end pairs

All three fixtures use the same current product (Viper V3 Pro) and candidate (Viper V4 Pro), the same product ledger, and the same compatibility method. Only exact context and personal preference/hard-avoid state changes.

1. VALORANT/MnK, familiar geometry plus a supported lighter direction: `SAFE / FAMILIAR`.
2. Apex/MnK, explicit lighter preference: `BETTER_FIT`.
3. Apex/MnK, explicit hard avoid for 50 g or lighter: `AVOID`.

This demonstrates that SAFE/AVOID is not stored as a fixed product label. Pro adoption, popularity, flagship status, and affiliate fields are not ranking inputs.

## Price and timing

Price snapshots store `current_price`, `currency`, `region`, `checked_at`, `availability`, listing URL, and lifecycle phase. A current price alone produces neither a Deal Score nor a “buy now” claim. Without at least three comparable history points, `historical_context_available=false`, `deal_score=null`, and `buy_timing=unknown`.

The validated snapshot is the canonical budget input. It must match the candidate `product_id` and exact `variant_id`; a convenience `price` field cannot override it, and SKU/region/currency mismatches fail closed.

## Evidence audit

The executable audit is `node scripts/run-evidence-audit.js`.

| Metric | Result |
|---|---:|
| Baseline claims | 130 |
| Claims after this pack | 144 |
| Blocking errors | 0 |
| Manual rights reviews | 15 |
| Duplicate URLs | 38 |
| Same corporate publisher groups | 38 |
| Missing exact variant queue | 82 |
| Contradictory normalized groups | 1 |

Duplicate URLs usually mean one source page supports several atomic facts; they remain one origin for independence. Missing variants are an enrichment queue, not silently inferred SKUs. The single contradiction is the intentionally preserved ARTISAN Zero community disagreement and remains a warning rather than an averaged value.

## Rights queue

Records are assigned `safe_for_internal_fact`, `manual_terms_review`, or `do_not_reuse_content`. Measurement, specialist, community, and adoption sources default to manual review. Internal use is limited to a source URL, methodology metadata, and a short GameFit-authored fact. No source content is copied.

## Feedback and Regret Shield

Personal feedback explains user-facing categories: rejected reason, desired direction, whether rank changed, why it changed, and whether confidence changed. Raw internal weights are not shown in that explanation. One person's feedback never changes the global model and cannot move `DONT_UPGRADE` or `AVOID` across the safety boundary.

Legacy and current hard-avoid formats are evaluated together. Missing hard-avoid attributes still require clarification.

## Independent red findings fixed

- null/string prices can no longer become zero-cost value wins;
- exact game fit requires a verified exact-context rule record; trait-derived fit cannot unlock purchase advice;
- compatibility marked compatible while containing an issue is rejected;
- a difference is not an improvement: neutral or regressive delta gets no positive score;
- legacy hard avoids can no longer be bypassed;
- invalid evidence, publisher mirrors, variant mismatches, and conflicting measurements cannot manufacture B/A;
- same-forum community posts without independent author identity collapse to one site cluster and cannot manufacture consensus;
- price records cannot masquerade as game-fit evidence, and a different SKU's fresh price cannot be substituted;
- personal reranking preserves AVOID/DONT safety boundaries.

## Private tester readiness

The tester specification includes a scenario, expected action, feedback question, optional post-purchase outcome question, privacy notice, and a no-purchase-needed path. Recruitment or external sending remains unauthorized.

## Decision

- Private implementation and fixture testing: TEST.
- Narrow non-DONT behavior in the three fixtures: TEST passed.
- General purchase recommendation, High confidence, main merge, deployment, or public release: HOLD.

## Verification

- `node --test tests/*.test.js`: 166 passed, 0 failed.
- `git diff --check`: clean (line-ending conversion warnings only).
- Automated browser execution: not run because Playwright is not installed or pinned; no dependency or CI change was added. The reproducible desktop/390 px checklist is in `docs/private-ui-manual-smoke.md`.
