# GameFit Personal Gear Intelligence v1

Status: Private S3 fixture-validation MVP. This branch adds an unlinked, `noindex` local UI under `private/`; it does not change the production UI, merge to `main`, deploy, add accounts, send email, create a database, or implement price monitoring.

## Product decision

GameFit is not a generic comparison table and does not optimize for the product most likely to earn commission. It combines:

`current setup + exact game/input context + explicit Gear Taste + current-gear delta + evidence + regret risk`

to answer three questions:

1. What is the weakest useful upgrade, if any?
2. Which candidate is a better fit for this person and this game/input method?
3. Is the evidence strong enough to buy now, or should GameFit say `DONT_UPGRADE`?

Recommendation and monetization remain separate. Affiliate eligibility, commission, merchant priority, and link availability are not scoring inputs. The top recommendation is unchanged when it has no affiliate destination.

## Preserved layers

- Wide Catalog keeps product identity separate from listings and monetization.
- Evidence Engine separates specs, compatible measurements, subjective consensus, issues, adoption, and price.
- Game DNA requires an exact `game_id + input_method` profile.
- Purchase Priority, Compatibility Guard, and Fix Before Buy run before purchase advice.
- Affiliate links are rendered only after recommendation ranking.

## 1. Gear Taste

`preference-engine.js` owns the explicit personal model. Version 2 supports category-scoped attributes for:

- `mouse`: shape, length, width, height, hump, weight, weight balance, click, coating, wheel, skates
- `keyboard`: layout, switch, actuation, rapid trigger, key weight, sound
- `monitor`: panel, resolution, refresh rate, response time, overshoot, VRR, brightness
- `mousepad`: surface speed, stopping power, texture, base/thickness, humidity resistance, durability, size
- `mouse_skates`: material, speed, control, edge rounding, thickness, break-in, durability
- `audio`: fit, bass/mid/treble, imaging, soundstage, latency, isolation, mic
- `controller`: layout, stick tension/latency, deadzone, trigger, back buttons, weight, grip, wireless latency
- `network`: connection type, latency, jitter, packet loss, stability, bufferbloat, Wi-Fi standard, Ethernet speed
- `cable`: connector, length, flexibility, weight, drag, durability, bandwidth, power delivery

An attribute preference stores `sentiment`, `value`, `direction_code`, optional reason, and optional exact game/input scope. `value` is the observed liked/disliked value; `direction_code` always means the user's desired direction. A context-specific entry never overwrites another game/input context. Unknown attributes and preferences without either a comparable value or desired direction are rejected instead of silently becoming free-form scoring inputs.

Hard avoids are structured rules with category, attribute, operator, value, reason, and optional game/input scope. Legacy boolean tags remain readable but do not drive Regret Shield until converted to structured rules.

## 2. Regret Shield

`personal-gear-engine.js` compares candidate attributes with:

- explicit hard-avoid rules; and
- structured attribute reasons from previously disliked or avoided products.

It returns two separate fields:

- `risk_level`: `low | medium | high | unknown`
- `confidence`: `Low | Medium | High`

`high risk / Low confidence` is valid and remains provisional. Missing candidate attributes or missing history returns `unknown / Low` with `insufficient_data`; absence of evidence is never treated as proof of safety. An exact known match against the user's explicit hard avoid is conservatively classified `AVOID` even when source confidence is Low; the explanation must still expose that Low confidence. Other high-risk matches require at least Medium confidence before blocking.

## 3. Upgrade Match

Every candidate receives one of:

- `SAFE / FAMILIAR`: meaningfully better while remaining close to known preferences
- `BETTER_FIT`: stronger preference fit than familiarity or price alone
- `VALUE_ALTERNATIVE`: adequate fit with strong value
- `EXPLORE`: plausible but less familiar or less certain
- `AVOID`: compatibility failure or supported Regret Shield block
- `DONT_UPGRADE`: current-gear delta is too small, evidence is insufficient, or a free/low-cost fix should happen first

`DONT_UPGRADE` is a valid successful decision, not an empty-result error.

## 4. Game-conditioned recommendation

The engine requires an exact Game DNA profile. Unknown combinations return `insufficient_context` and do not borrow another game or input method.

- VALORANT adoption or performance evidence cannot score Apex candidates.
- `apex + mnk` and `apex + controller` are separate contexts.
- Controller recommendations do not inherit mouse/keyboard signals.
- Candidate game fitness may use only the exact `game_id_input_method` key. Otherwise the engine may derive a low-confidence fit from declared performance traits; it never reuses another game's adoption rate.

The score combines game fit, explicit preference fit, current-gear delta, value, evidence strength, compatibility, and Regret Shield penalty. Affiliate fields are ignored.

## 5. Feedback and learning boundaries

Recommendation feedback is `agree | disagree | unsure`. A disagreement requires both reason codes and desired-direction codes.

Personal learning:

- remains in this user's local profile;
- is scoped by `game_id + input_method`;
- can re-rank immediately; and
- never changes a global score.

Global learning:

- is not enabled in the localStorage MVP;
- requires one coherent product/game/input target;
- requires at least three independent decided users by default;
- requires at least two independent direction-consistent post-purchase outcomes;
- requires the minimum agreement ratio; and
- rejects missing user/target fields and mixed targets.

Before any future global aggregation, only the latest decision and latest outcome per independent user count. Positive and negative consensus use separate outcome gates, so repeated records cannot manufacture agreement and well-supported regret can form a negative guard instead of being discarded.

Independent-user count alone is never enough.

## 6. Post-purchase Outcome

An outcome stores:

- `recommendation_id` and `model_version`
- a candidate snapshot so the historical decision remains reproducible
- product and prior product IDs
- exact game/input context
- satisfaction from 1 to 5 and consistent outcome label
- whether the product is still used
- whether the user returned to the previous product
- whether it was sold or exchanged
- structured reasons and timestamps

Contradictory states, such as `still_using=true` with `disposition=sold`, are rejected.

## 7. KPI definitions

The internal aggregation contract is:

- Recommendation Acceptance Rate = `agree / (agree + disagree)`
- Correction Rate = `disagree / (agree + disagree)`
- Re-ranking Success = successful corrected rankings / measured re-ranking attempts
- Purchase Satisfaction = mean 1–5 satisfaction among purchase outcomes
- Regret Rate = outcomes with satisfaction 1–2, return to previous, sale, or exchange / purchase outcomes
- Confidence Calibration = Brier score plus mean-confidence/observed-success gap for valid probabilities from 0 to 1

Every KPI includes its sample size. A zero denominator returns `null`, not zero.

## 8. MVP UX specification

The production UI is intentionally not implemented in this branch. The private validation flow is available at `private/personal-gear.html` and is not linked from the public site or sitemap. `noindex` and the missing link are not access control: this page must not be deployed until a separate production/privacy approval:

### My Setup Lite

Ask only current category/product and budget band. Game and input are collected as a separate exact context before a recommendation runs. Compatibility Guard and Fix Before Buy remain mandatory inputs before any future purchase advice.

### Gear Taste

Ask for one liked and one disliked attribute from current/past gear. Use the highest-information unanswered question instead of presenting the entire taxonomy. Target five to seven initial answers.

### Next Upgrade

Show `DONT_UPGRADE` alongside purchase candidates. Display current-gear delta, evidence confidence, and the exact game/input context.

### Regret Shield

Show matched hard avoids and past-dislike reasons. Keep risk and confidence separate. For Low confidence, ask for the missing attribute rather than asserting a result.

### Why Not?

Collect `agree / disagree / unsure`. For `disagree`, require short reason-code and desired-direction selections; no free text is required for MVP.

### Re-recommend

Apply personal learning immediately within the same game/input context. Show what changed and retain the original recommendation snapshot. Never present the update as global learning.

## 9. Real-product fixture and normalization contract

`data/personal-gear-fixtures.js` contains a 30-product, fixture-only pilot: six products in each of mouse, keyboard, monitor, mousepad, and audio. Each category includes one `staple`, `current_flagship`, `value`, `hidden_gem_candidate`, `new_low_evidence`, and `legacy` test stratum. These internal strata are omitted from the UI and are not recommendations, price claims, or market claims.

Every stored Evidence record must contain:

- source URL and source type
- checked date
- a short GameFit-authored raw fact
- normalized fact
- methodology family
- rights/use note
- product and source-origin identifiers

Unknown attributes are omitted. They are never inferred from a product name, family, review reputation, another region, or an earlier revision. Manufacturer pages support identity and explicit specifications; they do not create independent subjective consensus. Product Evidence grades are computed from the ledger at load time rather than declared in fixture rows. Adoption, trend, price, and Affiliate availability cannot promote an Evidence grade or personal-fit score.

`normalization-engine.js` preserves `raw_value` and separately creates a canonical `normalized_value` and `normalized_unit`. It currently normalizes grams/kilograms, millimetres/centimetres/inches, Hz/kHz/MHz, milliseconds/microseconds, common panel names, symmetric/ambidextrous wording, rapid-trigger booleans, and rear/back-hump synonyms. Invalid, non-finite, or physically impossible measurements are rejected.

Attribute Evidence is independent from the product-level grade. Shape, click, weight, latency, glide, response time, imaging, or any other attribute can have its own A–D grade, confidence, source count, methodology set, conflict flag, normalized facts, and data gaps. Missing attribute evidence remains Low and does not inherit a product-level grade. Regret Shield uses the confidence of the compared attribute first.

The real-product pilot deliberately omits an unverified current-gear performance delta and unknown compatibility. Therefore the private UI safely returns `DONT_UPGRADE` rather than inventing a positive upgrade. The six Upgrade Match branches and re-ranking mechanics are exercised separately with adversarial synthetic fixtures; this is pipeline safety validation, not recommendation-accuracy validation.

## 10. Local storage and privacy

Future UI storage key: `gamefit.personal_gear.v1`.

The document shape is:

```json
{
  "schema_version": 1,
  "profile": {},
  "recommendations": [],
  "feedback": [],
  "outcomes": [],
  "kpi_events": [],
  "updated_at": null
}
```

Storage stays on the current browser origin. The private UI provides JSON Export, Reset, and Delete all; displays the schema version; warns about shared devices, private browsing, and storage eviction; and never implies device sync. Corrupt or future-schema data is not overwritten automatically: the UI enters read-only recovery mode and exports the unchanged original bytes as a recovery text file until the user explicitly resets or deletes it. Deletion is limited to keys beginning with `gamefit.personal_gear.`. Writes are validated, size-limited, and atomic at the storage API boundary so a failed quota write keeps the last good record.

No user ID or other personal identifier is generated. No login, email, notification, analytics, external request, cloud DB, or cross-user learning is included in the private page.

## 11. Evidence and copyright

External articles, videos, specialist reviews, and lab results are back-office Evidence only. GameFit stores its own normalized fact or trend plus source metadata; it does not republish review prose, images, thumbnails, videos, proprietary tables, graphs, 3D models, or transcripts.

Minimum source ledger fields are `source_id`, source-origin ID, URL, source type, checked/retrieved date, product variant, locale, methodology family, evidence type, a concise plain-text GameFit-authored raw fact, normalized fact, rights/use note, explicit independence, and commercial relationship. Same-origin mirrors do not count as independent consensus. Independence is opt-in only. Subjective claims without an explicit stance do not create consensus. Conflicting claims remain `mixed`. Measurements from incompatible methodologies remain separate.

For any future automated collection, add and review `access_method`, `terms_checked_at`, `license_url`, `automation_allowed`, `redistribution_allowed`, and `permission_status` before collection begins. The current pilot is manual, small-volume citation and paraphrase only; it does not authorize scraping or redistribution.

Manufacturer specifications are preferred for dimensions, weight, layout, connection standards, and supported features. Lab/subjective attributes remain confidence-scored and must respect source terms. Pro adoption is a game/time-window market signal, never personal fit proof and never cross-game evidence.

## 12. Adversarial and calibration fixtures

`data/adversarial-fixtures.js` defines expected safe behavior for disliked familiar shapes, flagship products with negligible delta, Pro-adoption/popularity pressure, Affiliate and non-Affiliate ordering, new Grade-D products, contradictory community opinion, incompatibility, 240 Hz panels configured at 144 Hz, Apex controller/mouse contamination, missing hard-avoid attributes, and raw/normalized type mismatches.

The calibration samples deliberately include High-confidence failures and Low-confidence successes. They are marked synthetic and `has_real_outcomes:false`. Brier score and calibration gap calculated from them test the pipeline only; they are not evidence that real-world Confidence is calibrated.

## 13. Test and release gates

Required branch tests cover:

- category-specific preference reason tags
- structured hard avoids
- Regret Shield confidence and non-assertion under missing data
- exact game/input separation, including Apex MnK/controller
- Personal/Global learning separation
- affiliate exclusion from ranking
- immediate personal re-ranking without double application or context leakage
- post-purchase outcome consistency
- all six KPIs, including confidence calibration
- strict real-product Evidence-ledger validation and copyright-field rejection
- raw/normalized unit and synonym equivalence
- attribute-level confidence, conflict retention, and no product-grade inheritance
- missing hard-avoid clarification and type-normalized hard-avoid matching
- popular-product, Pro-adoption, Affiliate, duplicate-origin, and fake-consensus attacks
- corrupt/future localStorage recovery, scoped deletion, and quota-failure safety
- private UI flow, personal-only re-ranking, shared-device warning, and external-request absence
- all existing regression tests

Merge/deploy remain separate human decisions. S3 stays HOLD for `main` until a human reviews the fixture facts and source permissions. Production launch additionally requires independent lab/subjective coverage for recommendation-critical attributes, verified current-gear delta and compatibility inputs, real post-purchase outcomes, and real-world confidence calibration.
