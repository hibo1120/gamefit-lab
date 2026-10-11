# GameFit Game DNA Core v2 staging audit

Checked: 2026-10-11  
Status: staging only; current `data/game-dna.js` / recommendation engine / Private Validation are unchanged.

## 1. 結論

01ポート最終判断:

- Exact Game/Input isolation: **GO / keep**
- Existing 11 motor-dimension Game DNA as game-specific ranking weights: **HOLD**
- Pro adoption as ranking input: **NO-GO**
- Generic FPS evidence as reference layer: **TEST**
- New staging contract: **GO / TEST**
- Current production/private recommendation engine replacement: **HOLD**

The core conclusion is deliberately simpler than the legacy model:

> GameFit should use **Game + Input Method primarily as a context gate**, not as permission to invent strong game-specific peripheral weights.

Until real outcomes show otherwise, Personal Preference, Current Gear Delta, Compatibility, Fix Before Buy, and Evidence should matter more than whether the same mouse is being considered for VALORANT, CS2, or Apex MnK.

## 2. 02スカウト — external evidence

### Independent FPS mouse evidence

RTINGS' Oct 5, 2026 FPS mouse guide says FPS mice are generally evaluated around low click/sensor latency, low weight, and shape/comfort; shape should match the user rather than a game label. RTINGS reports 415 mice bought and tested.

Source:
- https://www.rtings.com/mouse/reviews/best/fps

Interpretation:
- **Confirmed external fact:** there are generic FPS-relevant mouse attributes.
- **Signal:** these attributes are not presented as VALORANT-only or CS2-only.
- **Not proven:** the optimal weight/shape/latency trade-off differs enough by individual FPS title to justify a large GameFit ranking weight.

### Cross-game Pro adoption overlap

ProSettings snapshots checked in Oct 2026 show the same high-end mouse families recurring across different FPS titles.

Examples:
- Razer Viper V3 Pro appears in VALORANT, CS2, and Apex mouse lists.
- Logitech G Pro X Superlight / Superlight 2 families appear prominently in CS2 and Apex, and similar neutral/lightweight shapes are also common in VALORANT.
- Razer Viper V4 Pro appears in VALORANT, CS2, and Apex top usage lists.

Sources:
- https://prosettings.net/guides/valorant-mouse/
- https://prosettings.net/guides/cs2-mouse/
- https://prosettings.net/guides/apex-legends-mouse/

Interpretation:
- **Market signal:** game-specific adoption distributions differ.
- **Counter-signal to overfitting:** the same products span multiple competitive shooters.
- **Therefore:** adoption may be useful as exact game reference data, but it does not justify “this game needs a fundamentally different mouse scoring formula.”

### Monitor adoption shows a similar pattern

CS2 and Apex ProSettings monitor snapshots both include overlapping high-refresh ZOWIE models, while their distributions differ.

Sources:
- https://prosettings.net/guides/cs2-monitor/
- https://prosettings.net/guides/apex-legends-monitor/

Interpretation:
- High refresh / response characteristics appear broadly relevant to competitive shooters.
- Exact model adoption is game-specific reference context, not Personal Fit proof.

### Input separation remains real

EA's official Apex PC documentation explicitly supports mouse configuration and controller input, including sensitivity/configuration options.

Source:
- https://www.ea.com/games/apex-legends/about/pc-system-requirements

This supports keeping `apex_mnk` and `apex_controller` separate even if product-attribute game weighting is simplified.

## 3. 03ビルダー — architecture change proposed

New staging module:

`data/game-dna-core-v2.staging.js`

### Current staging policy

Each profile stores:

- exact `game_id`
- exact `input_method`
- `context_mode: exact_game_input`
- `ranking_mode: context_only`
- input-derived allowed categories
- empty game-specific attribute weights
- Pro adoption ranking effect = none
- PC performance kept as a separate future layer

Current staged profiles:

- VALORANT MnK
- Apex MnK
- Apex Controller
- CS2 MnK
- Overwatch 2 MnK
- Fortnite MnK

### Why PC performance is separate

PC / GPU / CPU / RAM / Storage decisions have a different causal structure from mouse/keyboard/controller fit.

A PC performance layer should use:

- game
- resolution
- target FPS
- graphics settings
- CPU/GPU/system constraints

It should not be forced into the same “flicking / tracking / recoil” taxonomy used for peripheral context.

This staging does **not** implement that PC layer yet.

## 4. Legacy 11-dimension audit

Existing dimensions:

- flicking
- micro_correction
- precise_tracking
- reactive_tracking
- target_switching
- vertical_movement
- recoil_control
- movement_precision
- key_input_demand
- visual_clarity
- audio_positioning

04レッド conclusion:

These are understandable gameplay descriptors, but GameFit currently lacks strong independent evidence that assigning different low/medium/high weights by title improves **gear purchase decisions**.

Risks:

1. Pseudo-personalization: the game name changes a score even when the resulting gear should be the same.
2. False precision: “high tracking” looks quantitative without outcome calibration.
3. Double counting: generic gaming quality and personal preference can be reintroduced as “game fit.”
4. Maintenance: every balance/meta/game update invites unnecessary manual review.
5. Explainability: users may reasonably ask why a game changed a mouse score by 25%.
6. Confirmation loop: synthetic fixtures can validate weights originally invented by the same model.

Therefore the staging module explicitly prohibits these fields from its context-only DTO.

## 5. Existing engine finding

The current `personal-gear-engine.js` gives Game Fit 25% of the raw candidate formula, but exact game/input fitness becomes decision-ready only when highly constrained Evidence/rule metadata resolves. The explicit `GAME_INPUT_RULES` currently cover only Apex MnK mouse and VALORANT MnK mouse.

This conservative implementation prevents many unsupported purchases, but it also means the broad legacy 11-dimension taxonomy is more expansive than the actually verified Game Fit evidence.

Staging recommendation:

- Do not add more motor dimensions.
- Do not expand game-specific weighting merely to make the system feel personalized.
- First prove that a game-specific rule changes outcomes compared with a generic competitive-gaming + Personal Fit baseline.

## 6. 05メジャー — future validation

No fixed “game-specific weight” should be promoted from staging until a pre-registered comparison exists.

Future test question:

> Does adding an exact game-specific peripheral rule improve real post-purchase outcomes beyond a baseline using exact Game/Input isolation + Personal Preference + Current Gear Delta + Compatibility + Evidence?

Minimum design requirements:

- same catalog
- same candidate set
- same Personal Preference
- same current-gear data
- baseline and game-specific variants frozen before outcomes
- real purchase/use outcomes
- no Pro/Affiliate information in the ranking variant
- report both benefit and harm
- no synthetic data in outcome calibration

No arbitrary sample threshold is set now because GameFit does not yet have a baseline outcome rate or variance estimate.

## 7. 06ガード

- ProSettings material is reference/adoption evidence only; no text, tables, images, or profiles are copied into GameFit.
- RTINGS methodology/result prose is not republished; only small normalized factual concepts and source metadata are retained.
- Automated scraping is not authorized by this staging work.
- Source URLs are stored for internal traceability.
- Game-specific adoption remains separate from recommendation ranking.

## 8. 07オプス

Simplifying Game DNA reduces recurring manual work.

Expected effect:

- fewer game balance/meta reviews
- fewer subjective low/medium/high weight edits
- no Role/Weapon/Style taxonomy maintenance in ranking
- game/input support still needs explicit maintenance
- game-specific Pro adoption can stay in an optional reference pipeline

If a future validated game-specific rule exists, add only that rule rather than reopening the entire 11-dimension matrix.

## 9. Stage decision

- `data/game-dna-core-v2.staging.js`: **TEST**
- Current `data/game-dna.js`: **keep unchanged for Private Validation**
- Current recommendation engine: **keep unchanged**
- Legacy motor dimensions: **HOLD for ranking / internal hypothesis only**
- Exact Game/Input context: **GO**
- Pro adoption ranking: **NO-GO**
- Game-specific attribute weighting: **HOLD until real outcomes**
- Separate PC performance context: **NEXT PHASE candidate**
