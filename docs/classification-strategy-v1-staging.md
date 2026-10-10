# GameFit Classification Strategy v1 staging

Checked: 2026-10-11  
Status: staging only; production / Private Validation未接続

## 1. 01ポート結論

GameFitの分類は、他サイトに存在するかどうかだけでは決めない。

判断軸を以下へ固定する。

1. **Market proof** — 実トラフィック推定、DB規模、掲載数、継続運営実績
2. **Decision value** — 実際に購入/買替判断を改善するか
3. **Cognitive cost** — 初見の迷い、入力工数、自己分類の難しさ
4. **Differentiation** — 他社に少ない場合、GameFit独自価値へ転換できるか
5. **Maintenance cost** — AI自動化後も人間工数が膨らまないか

原則:

> 他社に多い = Core候補だが、差別化とは限らない。  
> 他社に少ない = 削除理由ではなく、Differentiation仮説として評価する。

## 2. Traffic / usage evidenceの読み方

重要な制約:

- 公開されている第三者traffic値は**推定値**。
- Domain全体の月間訪問数であり、特定のFilter / Finder / Compare機能の利用率ではない。
- Traffic推定値は絶対値より**相対的な市場規模シグナル**として使う。
- 特定機能のCVや利用率は各社が公開していない限り推測しない。

Semrush自身もtrafficをaggregated browsing/search/public dataからモデル推定しており、小規模サイトでは十分なデータがない場合があるとしている。

Source:
- https://www.semrush.com/website/

## 3. 大規模シグナル

### RTINGS — structured comparison / use-case taxonomy

August 2026 Semrush estimate:
- **9.56M visits/month**
- 2.35 pages/visit
- domain-wide estimate

Mouse database:
- **416 mice bought and tested**
- Mouse table classifies by Work / FPS / MMO / Raw Performance / Style / Shape / Weight / Price / Methodology.

Sources:
- https://www.semrush.com/website/rtings.com/overview/
- https://www.rtings.com/mouse/tools/table
- https://www.rtings.com/mouse/learn/how-we-test

Interpretation:
- Product category + use-case + measurable attribute classification has strong market proof.
- But RTINGS itself emphasizes standardized comparison and user-fit variables such as shape; this does not prove GameFit should invent granular per-game weights.

### PCPartPicker — compatibility / component structure

August 2026 Semrush estimate:
- **9.01M visits/month**
- 10.75 pages/visit
- 11:47 average session in the reported estimate

Third-party descriptions consistently describe the product around:
- component selection
- compatibility
- retailer/price comparison
- estimated system power
- saved/shared builds
- build guides by use case/budget

Sources:
- https://www.semrush.com/website/pcpartpicker.com/overview/
- https://www.itechguides.com/how-to-use-pcpartpicker-to-build-a-pc-a-step-by-step-guide/

Interpretation:
- Compatibility is not a niche feature; it is a core decision problem.
- PC classification should be component/system/target based, separate from peripheral gameplay traits.

### ProSettings — game-specific Pro reference

August 2026 third-party estimate:
- approximately **5.1M visits/month**
- domain-wide estimate

Current public scale checked:
- VALORANT hub: **754 Pro Players / 148 Teams**
- VALORANT mouse guide: sample based on **700 players**

Sources:
- https://analytics.explodingtopics.com/website/prosettings.net
- https://prosettings.net/games/valorant/
- https://prosettings.net/guides/valorant-mouse/

Interpretation:
- Pro/game-specific reference data has substantial demand.
- Raw Pro usage is already served well and is therefore weak differentiation by itself.
- GameFit differentiation is to show Pro reference **without changing ranking**, and surface mismatch with the user's own fit/history.

## 4. Specialist classification signal

### EloShapes — physical shape / spec comparison

Third-party traffic estimate:
- approximately **589K monthly visits** in the latest aggregate shown by HypeStat
- estimate only

Product scale:
- **1700+ gaming mice** in compare database

Classification:
- length / width / height / weight
- shape
- hand compatibility
- hump placement
- front flare
- side curvature
- sensor / polling / connectivity / buttons etc.

Sources:
- https://hypestat.com/info/eloshapes.com
- https://www.eloshapes.com/mouse/compare
- https://www.eloshapes.com/mouse/browse?view=table

Interpretation:
- Physical-fit/shape classification has meaningful specialist demand.
- It is not unique enough to become GameFit's headline differentiation.
- Best use: deferred tie-breaker when a mouse decision actually needs it.

### FPSLab — short fit finder

No reliable public domain-traffic estimate was found in this research pass.

Public product evidence:
- **173 mouse candidates**
- Finder uses **4 required questions**
  - hand size
  - grip
  - budget
  - control feel
- stated completion: about 20 seconds
- fit score separated from affiliate links

Sources:
- https://fpstools.com/gear/mouse-finder
- https://fpstools.com/gear/mice

Interpretation:
- This is useful structural evidence that short physical-fit finders are being built.
- It is **not** strong market-size proof.
- Therefore GameFit should preserve hand/grip as optional specialist input, not force it into universal onboarding.

## 5. Classification matrix

| Classification | Market proof | Differentiation | Cognitive cost | Surface | Decision |
|---|---|---|---|---|---|
| Product / component category | Very high | Low | Low | Core input | GO |
| Exact Game + Input | High | Medium | Low | Core input | GO |
| Compatibility | Very high | Medium | Low | Core guard | GO |
| Budget | High | Low | Medium | Deferred | TEST |
| Hand / grip / physical fit | Medium | Medium | Medium | Deferred | TEST |
| Pro adoption | Very high | Low raw / Medium when personalized | Low | Reference | TEST |
| Role / Weapon / Combat Style | Low | Medium possible | High | Research / optional filter | HOLD |
| Current Gear Delta | High adjacent evidence | **High** | Low | Result core | GO |
| Fix Before Buy | Low direct proof | **High** | Low | Result core | TEST |
| DONT_UPGRADE | Low direct proof | **High** | Low | Result core | TEST |
| PC performance target | Very high adjacent evidence | Medium | Medium | Separate PC Context | TEST |
| Game-specific peripheral weights | Low | Low | High | Research only | HOLD |

## 6. 02スカウト — what is proven vs opportunity

### Market-proven primitives

- Product/category browsing
- measurable product comparison
- compatibility
- budget
- Pro settings/gear reference
- physical shape/fit filters

GameFit should not spend differentiation effort pretending these are novel.

### Differentiation opportunities

#### A. Current Gear Delta

Adjacent demand is strong:
- RTINGS comparison tools
- EloShapes pairwise shape/spec comparison

But GameFit changes the frame from:

> Product A vs Product B

to:

> **Your current gear → what materially changes?**

This should stay central.

#### B. Fix Before Buy

Large incumbent traffic proof is not established here.

Adjacent tools such as PC bottleneck/upgrade planners increasingly use:
- diagnose limiter
- verify settings
- rule out free causes
- upgrade only after confirmation

This is a market signal, not large-scale proof.

GameFit should preserve and validate it because it directly supports trust and unnecessary-purchase avoidance.

#### C. DONT_UPGRADE

Most review/affiliate flows culminate in a product shortlist.

A formal “keep what you have” result is much less visible in the large reference sites reviewed.

This absence is **not evidence that users do not want it**.

It may instead be structurally underprovided because comparison/affiliate sites monetize a purchase path.

GameFit should test DONT_UPGRADE as a core trust differentiator.

## 7. 03ビルダー — surface architecture

### Core input
- Game
- Input
- Gear category
- Current product

### Core automatic guard
- Compatibility
- Evidence
- Fix Before Buy checks where applicable

### Deferred only when needed
- Budget
- Hand size
- Grip
- fine-grained preference

### Result core
- Decision
- Current Gear Delta
- Fix Before Buy
- DONT_UPGRADE / CONSIDER / CLARIFY
- Why Not?

### Reference only
- Pro adoption
- Role filter where supported

### Research-only
- Weapon
- Combat Style
- granular game-specific peripheral weight matrices

## 8. 04レッド — counterarguments

### “Big traffic means their classification causes success”
False.
Domain traffic does not identify which feature caused the visit or conversion.

### “Small sites mean hand/grip is unimportant”
False.
EloShapes has a meaningful specialist traffic estimate and 1700+ product database, while FPSLab lacks reliable traffic data but shows the pattern exists.

### “No major site has DONT_UPGRADE, therefore remove it”
Rejected.
Major review/affiliate economics may structurally favor product selection. Absence is a possible differentiation signal.

### “Game-specific Pro usage means game-specific weighting”
Rejected.
Same top mouse families recur across multiple FPS games. Adoption stays reference-only.

### “Add every proven classification to onboarding”
Rejected.
Proven demand does not remove cognitive cost. Budget/hand/grip remain deferred.

## 9. 05メジャー — validation order

Market data determines what deserves a test, not what automatically ships.

Priority experiments:

1. Current Gear Delta understanding/value
2. DONT_UPGRADE acceptance and trust
3. Fix Before Buy completion/value
4. Budget upfront vs deferred
5. Hand/grip asked upfront vs only when candidate ambiguity remains
6. Pro reference shown vs hidden
7. Role filter within Pro reference

Do not test Weapon/Combat Style until a credible hypothesis predicts a material decision change.

Metrics:
- unassisted completion
- reason comprehension
- time to first useful decision
- correction rate
- DONT acceptance
- unnecessary-purchase intent
- return intent
- post-purchase outcome later

## 10. 06ガード

- Traffic estimates remain attributed as estimates.
- No feature-level usage rate is fabricated from domain traffic.
- External layouts/data are not copied.
- Pro data remains reference/adoption only.
- Small-site ideas are patterns to test, not permission to scrape or reuse data.

## 11. 07オプス

Lowest-maintenance high-value structure:

Core:
- category
- game/input
- compatibility
- current-gear delta

Deferred:
- budget
- hand/grip

Reference:
- Pro

Avoid maintaining:
- global Role/Weapon/Style matrices
- per-game subjective peripheral weight tables

Differentiation features should survive only if they improve:
**monthly net profit / monthly human hours**
after real validation.

## 12. Stage decision

- Classification strategy staging: **GO / TEST**
- Market-proven core primitives: **GO**
- Current Gear Delta: **GO as differentiation core**
- Fix Before Buy: **TEST, preserve**
- DONT_UPGRADE: **TEST, preserve**
- Budget defer: **TEST**
- Hand/grip defer: **TEST**
- Pro reference: **TEST / reference-only**
- Role/Weapon/Combat Style: **HOLD, preserve as optional/research**
- Game-specific peripheral weights: **HOLD**
- Separate PC Performance Context: **STAGING STARTED**
