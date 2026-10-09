# Personal Gear Intelligence: private Validation / Growth readiness pack

Checked: 2026-10-10

This pack prepares measurement and business validation without publishing Personal Gear Intelligence, sending tester data, enabling an Affiliate program, or claiming revenue. All values in the revenue model are hypotheses rather than forecasts.

## Validation design

`validation-engine.js` defines a local-only, allowlisted event contract and an in-memory harness with `transport=none` and `external_sending_enabled=false`. It does not call PostHog or any other network service.

The measured path is:

`Landing → qualified demand → My Setup → Gear Taste → Next Upgrade → Decision → Why Not? → re-rank → purchase-route intent`

The schema covers My Setup start, Gear Taste completion, Next Upgrade reach, Why Not use, re-ranking use/success, recommendation acceptance/correction, DONT_UPGRADE acceptance, Save/Return intent, and Affiliate CTA intent. Attribution is limited to allowlisted `source`, `content_id`, `entry_offer`, `campaign`, `cohort`, and `locale` slugs. Raw URL/query, referrer, email, name, address, comment, and hardware free text are rejected.

Funnel counts are unique per explicitly supplied local `journey_id`; repeated events in one journey do not increase the denominator. Required fields, event sequence, elapsed time, and same-journey context consistency are checked. Out-of-order or context-switching journeys are excluded. Internal QA and suspected bots are excluded. This is only duplicate-event protection, not proof of independent human users. A later approved test must enforce tester independence operationally.

Metric denominators are fixed in code. Acceptance and Correction use all agree/disagree/unsure responses; Re-ranking Success uses completed re-ranks; Affiliate CTA intent uses only decisions explicitly eligible for a purchase route. DONT_UPGRADE acceptance, a fitting recommendation, and a successful correction/re-rank are all positive decision outcomes. Views, completions, clicks, and share intents are never called purchases or revenue.

Qualified demand additionally requires a declared shopping state and a current problem. A completed curiosity visit alone cannot pass a demand gate.

## 0→1 tester plan

The thresholds below are initial stop rules, not industry benchmarks.

| Cohort | Purpose | Success gate | Stop gate | Estimated human time |
|---|---|---|---|---:|
| 10 | Usability, safety, comprehension | ≥8 reach Next Upgrade; ≥7 understand the reason; median ≤7 min; severe errors/privacy incidents 0 | any severe error/privacy incident, or <8 reach | 8 h |
| 30 | Directional validity | ≥24 complete; ≥20 decided feedback; Acceptance ≥60%; Correction ≤30%; Re-rank Success ≥50%; DONT acceptance ≥70% | Correction >40% after one iteration, DONT acceptance <50%, or any severe error | 18 h |
| 100 | Acquisition and intent | Start ≥25%; Gear Taste/start ≥70%; Next Upgrade/start ≥50%; Why Not/decision ≥40%; eligible CTA intent ≥8%; Save/Return intent ≥15% | start <15% after one message iteration, <10 completions, or no concrete feedback/save/share after 200 qualified visits | 35 h |

Every cohort includes people who are dissatisfied, considering a purchase, and may correctly need no purchase. Purchase is never required. The event schema records elapsed time, reason comprehension, severe recommendation errors, and privacy incidents. `evaluateCohortGate` returns only `PASS`, `STOP`, or `INCONCLUSIVE`; a missing sample cannot silently pass. No recruitment or message sending is authorized by this pack.

## Growth hypotheses

Priority is based on the complete `content → setup/diagnosis → decision → monetizable action` path, not reach alone.

1. Comparison/diagnosis pages: highest-intent entry for current gear versus candidate decisions.
2. Free tools: Fix Before Buy and compatibility checks deliver value even when the correct result is DONT_UPGRADE.
3. SEO: exact comparison/problem pages can compound, but scaled product-page generation remains HOLD.
4. YouTube Shorts: useful for low-cost hook tests; success is qualified diagnosis starts, not views.
5. Reddit/global: strong qualitative research potential, but promotion and collection require rule-by-rule human review.
6. note: Japanese explanation and trust layer; it is a route to the decision tool, not the core asset.
7. X: fast message testing but weak purchase intent until downstream behavior is measured.

Existing growth links mainly lead to the older PC-budget diagnosis, so their existing clicks cannot validate PGI demand. A later approved test must lead to a PGI entry point and preserve the sanitized source/content fields.

The six initial hooks are connected to product functions rather than generic rankings:

- “買わなくていい人を先に判定” → DONT_UPGRADE / Current Gear Delta
- “そのケーブル、本当に必要？” → Compatibility Guard / Decision Brief
- “Wi-Fi 7でもPingが下がらない場合” → Network Fit / Fix Before Buy
- “プロ使用率が高くてもあなたには合わない” → Gear Taste / Regret Shield
- “Viper V3 ProからV4 Proに替える意味がある人／ない人” → Delta / Upgrade Match
- “240Hzなのに144Hzで使ってない？” → Fix Before Buy

Current market signals show that comparison and personalized-upgrade tools already exist: Newegg has an AI PC Upgrader, EloShapes and MouseMetric compete on catalog/shape breadth, and Japanese services such as ちくわの穴の中, デバイス比較紹介 LAB, ギアセン, and MOUSE DX cover diagnosis or multi-category comparison. Catalog size and an “AI diagnosis” label are therefore not a moat. GameFit's testable differentiation is the decision history from current gear and hard avoids through DONT_UPGRADE, correction, and post-purchase outcome.

## Monetization Map

Scores are ordinal hypotheses from 1 (low) to 5 (high); they are not observed economics.

| Route | Unit value | CV ease | Frequency | GameFit fit | Coverage | Human effort | Profit/effort | Gate |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Manufacturer Affiliate | 3 | 3 | 2 | 4 | 2 | 3 | 3 | after intent validation |
| Amazon/Rakuten mall Affiliate | 2 | 4 | 3 | 4 | 5 | 2 | 3 | after program approval |
| Cable/accessory | 1 | 3 | 2 | 3 | 4 | 2 | 2 | verified compatibility need only |
| Network device | 2 | 2 | 1 | 3 | 3 | 3 | 2 | after network validation |
| ISP/optical line | 5 | 1 | 1 | 2 | 2 | 5 | 2 | human and official review only |
| Premium Watch | 3 | 1 | 5 | 5 | 5 | 3 | 4 | after Save/Return willingness evidence |
| Separated sponsorship | 5 | 1 | 2 | 1 | 2 | 5 | 2 | last; labeled and ranking-isolated |

Amazon Japan's current public fee table places PC/electronics at 2% and states that terms may change. Rakuten's public guideline lists the relevant device categories at 2% with program caps. These facts make broad mall coverage useful but do not prove attractive unit economics. Commission must be checked at decision time and can never enter recommendation rank.

Product, merchant, listing/offer, and Affiliate program are now separate models. The same product can have multiple manufacturer or marketplace offers. Route selection considers valid HTTPS destination, exact product/variant/region/currency, stock, price freshness, approved domain, price, and deterministic ID—not commission. All real program records remain unapproved with empty tracking URLs.

## ISP / Network decision boundary

GameFit may decide what to check next, but it may not automatically select or recommend an ISP.

1. Require repeated wired-direct measurements across at least three windows and two days.
2. Complete router firmware, OS/network setting, and other local Fix Before Buy checks.
3. If a persistent issue is not established, return DONT_UPGRADE.
4. If it is established, require the user to verify area, building type, installation, contract, cancellation, campaign, and IPv6 conditions on official sites.
5. Even after those checks, return `HUMAN_OFFICIAL_REVIEW_REQUIRED`, not a provider recommendation or Affiliate CTA.

Throughput alone does not establish latency quality or provider causation. Jitter, packet loss, bufferbloat, time-of-day, route, and wired/Wi-Fi differences remain separate evidence. NTT East's official availability search also warns that provider service areas can differ, so address/building eligibility cannot be inferred by GameFit. No address or IP is collected.

## Conversion Funnel

The private fixture runs four paths: a fitting recommendation, a DONT_UPGRADE accepted as useful, a disagreement corrected by re-ranking, and an early drop-off. It proves that:

- DONT_UPGRADE is a successful decision outcome rather than a funnel failure;
- correction and re-ranking can create value without manufacturing a purchase;
- CTA intent is calculated only for eligible decisions;
- one repeated journey cannot manufacture independent demand;
- internal QA/bot traffic is excluded;
- purchase-route intent separates destination type from commercial relationship.

The fixture is a harness test, not market evidence.

## Premium hypothesis

Free remains useful: My Setup, basic recommendation, Regret Shield, and basic Decision Brief.

Paid candidates are advanced Watch, price history/Buy Window, multiple setup profiles, long-term Gear Memory, and advanced comparison/counterfactual budget allocation. A paid feature must add recurring value or cover measurable recurring cost. Premium development is HOLD until Save/Return intent and willingness to pay are observed; the free recommendation must not be intentionally weakened.

## Human-time model

The mature model assigns catalog maintenance/evidence refresh/variant/affiliate/support to B, launch watch to A, and rights review to C. Weighted workload projects A+B at 95%, with 35 human hours/month at the modeled scale. This is a design target, not a measured automation rate.

The next test must time four weeks of catalog, evidence, rights, variant, launch, Affiliate, and support work. Expansion is HOLD if first-SKU verification exceeds a median 60 minutes, 50 active SKUs require more than 10 maintenance hours/month, tester support exceeds 10 minutes/person, or observed A+B remains below 80%. Mature target remains at least 90% A+B.

## Three-case revenue hypotheses

Formulae are executable in `business-model.js`. Human cost is included at JPY 2,500/hour. No scenario is a forecast.

| Scenario | Monthly users | Setup completion | Purchase intent | Affiliate clicks | Affiliate CV | Avg commission | Premium conversion / ARPU | Infra | Human h | Affiliate revenue | Premium revenue | Net profit | Net / human h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Pessimistic | 1,000 | 25% | 8% | 30% | 2% | ¥500 | 0% / ¥600 | ¥0 | 15 | ¥60 | ¥0 | -¥37,440 | -¥2,496 |
| Base | 10,000 | 40% | 15% | 40% | 4% | ¥800 | 0.5% / ¥600 | ¥3,000 | 35 | ¥7,680 | ¥30,000 | -¥52,820 | -¥1,509 |
| Success | 50,000 | 50% | 20% | 45% | 5% | ¥1,000 | 1.5% / ¥600 | ¥15,000 | 80 | ¥112,500 | ¥450,000 | ¥347,500 | ¥4,344 |

Even the success hypothesis is below the mature target of ¥5,000 net profit per human hour. The base case is negative after human time. This is a HOLD signal for scaling, not a reason to suppress DONT_UPGRADE or bias recommendations toward higher commission.

## ② Scout

The validated market signal is interest in comparison, current-setup advice, and free utilities—not demand for GameFit itself. Similar products prove supply as much as demand. The recommended entry is a narrow current-gear decision utility, followed by 10→30→100 qualified users. SEO should use original analysis and experience rather than mass-generated combination pages. Reddit/global is research-first and manual due spam/data-use rules. Premium requires proprietary outcome history or recurring monitoring value.

Useful references:

- [Newegg PC Upgrader Tool](https://kb.newegg.com/knowledge-base/pc-upgrader-tool)
- [Google helpful content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google high-quality review guidance](https://developers.google.com/search/docs/specialty/ecommerce/write-high-quality-reviews)
- [Reddit spam policy](https://support.reddithelp.com/hc/en-us/articles/360043504051-Spam)
- [Amazon Japan fee schedule](https://affiliate.amazon.co.jp/help/node/topic/GRXPHT8U84RAYDXZ)
- [Rakuten Affiliate guidelines](https://affiliate.rakuten.co.jp/guideline/rule/)
- [NTT East official service-area search](https://flets.com/app2/search_c.html)
- [Consumer Affairs Agency stealth-marketing FAQ](https://www.caa.go.jp/policies/policy/representation/fair_labeling/faq/stealth_marketing/)

## ③ Builder

Implemented a local event schema/harness, fixed denominators, qualified-demand semantics, private funnel fixtures, 10/30/100 tester gates, growth hooks and channel priorities, separated Affiliate program/purchase-route models, strict listing selection, ISP boundary rules, premium/free split, a weighted human-time model, and executable three-case revenue calculations.

## ④ Red

Independent attack reproduced two release blockers and one validation flaw:

- a `keep` result could show an Affiliate CTA for a lower-ranked product;
- invalid/negative, wrong-SKU, wrong-region, stale, or unsafe listings could win a convenience price sort;
- duplicate completions could inflate raw event counts.

These were fixed with conflict-safe top-decision CTA suppression, mandatory exact-context listing filters shared by Purchase Route selection, journey-level ordered counting, required demand fields, context consistency, and QA/bot exclusion. A lone re-rank event cannot create a success, and cohort gates now have executable PASS/STOP/INCONCLUSIVE outcomes. Additional adversarial tests cover contradictory purchase intent, mixed result schemas, unknown stock, unqualified traffic, commission permutations, ISP uncertainty, and DONT_UPGRADE success.

Residual risks remain: actual independent people are not proven by a local journey ID; clicks are not orders; returns erase realized commission; localStorage outcomes cannot yet be aggregated; Evidence/rights/variant maintenance is unmeasured; generic AI and competitors can copy the interface; Affiliate terms and search/social distribution can change. Scaling is NO-GO until these are measured.

Hard later gates: at least one approved, non-refunded commission for plumbing; at least 20 confirmed non-refunded orders across two calendar months for viability; no merchant above 70% of realized revenue; category/game-input-specific decided feedback and linked outcomes; and a blind comparison against a simple heuristic/generic AI. DONT_UPGRADE must never be reduced merely to increase CTR.

## ① Port

| Readiness | Decision | Reason |
|---|---|---|
| Product | TEST | Narrow private decision flow works; user value remains unmeasured |
| Evidence | TEST | selected fixtures are useful, but rights/variant/long-term queues remain |
| Validation | HOLD for real users; GO for local design | measurement is ready, recruitment/sending is not authorized |
| Growth | HOLD | hypotheses and hooks exist; no PGI channel result exists |
| Monetization | HOLD | all programs are disabled and no order/commission exists |
| Operations | TEST | projected A+B is 95%; real time has not been logged |
| Scale/revenue | NO-GO | code and modeled scenarios are not business evidence |

Priority allocation: Validation/measurement 35%, Evidence/rights 20%, Growth hypotheses 20%, human-time automation 10%, monetization intent 10%, revenue/stop dashboard 5%. Next-gate cap: 20–30 human hours and ¥0.

## Tests

`node --test tests/*.test.js`: 185 passed, 0 failed. The first sandboxed run produced one local-loopback `EACCES`; the authorized local rerun passed its HTTP smoke test. `git diff --check`: clean, with line-ending conversion warnings only. No browser dependency, external Analytics, Affiliate URL, deployment, or tester sending was added.

## Next-stage conditions

Remain in private S3. The next authorized step is a controlled 10-person usability test, not public Growth or monetization. It requires a separate approval because it involves external tester contact/data handling. Do not advance to 30 until the 10-person safety gate passes; do not advance to 100 until directional validity passes.

Main merge, deployment, publication, Affiliate enablement, Premium development, ISP ranking, ad spend, sponsor outreach, and tester sending remain HOLD/NO-GO.
