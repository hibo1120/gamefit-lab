# GameFit PC Performance Context v1 staging

Checked: 2026-10-11
Status: staging only; current Peripheral engine / Private Validation unchanged.

## 1. 01ポート結論

PC/GPU/CPU/RAM/StorageはPeripheral Game DNAから分離する。

**PC Performance Context: TEST / staging GO**

基本構造:

1. Game + Current PC baseline
2. Requirements compatibility
3. Performance target only when needed
4. Free checks before hardware replacement
5. Verified limiter evidence
6. Compatibility
7. Upgrade candidate or keep current system

GameFitは「CPU/GPU bottleneck %」を見せるサイトにはしない。

## 2. 02スカウト — market / usage evidence

### Technical.city

Semrush August 2026 estimate:
- **10.14M visits/month**
- 2.72 pages/visit
- 06:14 average session

The domain prominently serves CPU/GPU comparisons and game-system-requirement workflows.

Source:
- https://www.semrush.com/website/technical.city/overview/

### PCPartPicker

Semrush August 2026 estimate:
- **9.01M visits/month**
- strong multi-page engagement

Core demand:
- parts
- compatibility
- prices
- build planning

Source:
- https://www.semrush.com/website/pcpartpicker.com/overview/

### PCGameBenchmark

Semrush August 2026 estimate:
- **624.65K visits/month**
- 5.06 pages/visit
- 04:22 average session

Its public flow uses current CPU, current GPU, game, FPS estimation, and upgrade ideas.
The site says it has tested millions of PC setups and tracks over 100,000 PC games.

Sources:
- https://www.semrush.com/website/pcgamebenchmark.com/overview/
- https://www.pcgamebenchmark.com/

### System Requirements Lab / Can You RUN It

This is stronger than domain traffic estimation because the site publicly exposes usage counts.

Current page checked:
- tracks **19,000+** PC game requirements
- claims the service performs **millions of checks every month**
- VALORANT: **29,393** checks in the displayed last-30-day snapshot
- Fortnite: **23,862**
- Counter-Strike 2: **23,694**

The service compares CPU, GPU, RAM, OS / DirectX and minimum vs recommended requirements, then provides component-level results and upgrade suggestions.

Source:
- https://svc.systemrequirementslab.com/cyri/

Interpretation:
- Game-specific PC compatibility/performance questions have direct demonstrated usage.
- VALORANT / Fortnite / CS2 have especially strong GameFit overlap.
- Apex remains in scope even though its current check count is below the current top group.
- No current evidence here justifies removing Overwatch 2; absence is not a deletion signal.

### CanIRun.gg

Public scale:
- **14,075 games**
- **182 GPUs**
- **97 CPUs**

Basic input:
- GPU
- CPU
- RAM

Source:
- https://canirun.gg/

Interpretation:
Simple baseline input has market precedent.

## 3. 03ビルダー — progressive PC input

### Baseline — ask first
- Game
- CPU
- GPU
- RAM

Optional only if needed:
- VRAM
- OS
- free storage
- storage type

This is enough for requirements compatibility, not an upgrade recommendation.

### Performance Target — ask only when user wants more
- Resolution
- Target FPS
- Graphics preset

Advanced:
- Ray tracing
- Upscaling
- Frame generation

Do not ask all advanced fields by default.

### Observed verification — only before naming what to replace
Possible inputs:
- actual FPS
- 1% lows
- GPU / CPU utilization
- temperatures
- RAM / VRAM usage
- frame time

The staging contract does not itself infer a limiter from one number.
A separate verified limiter assessment is required.

## 4. 04レッド — counterarguments

### False precision
A predicted 27% bottleneck or exact FPS can look scientific without enough evidence.

Policy:
- no bottleneck percentage
- no exact FPS guarantee
- range/estimate only with methodology provenance

### Requirement pass != target met
Passing minimum/recommended requirements does not prove 1440p/240 FPS.

GameFit separates:
- Can it run?
- Does it meet your target?
- What should change?

### One utilization number != limiter
High GPU usage can be normal.
Low GPU usage can be caps, menus, CPU, thermal, driver, memory, game engine or measurement error.

No replacement recommendation without repeatable verified limiter evidence.

### Target met
If the user's real target is already met, TARGET_MET is a successful no-upgrade answer.

### Huge catalog temptation
Competitors cover 14K–100K+ games.
GameFit should not copy catalog breadth before proving decision value.

Start with the existing GameFit game set and expand from observed demand.

## 5. 05メジャー — validation

First validation should compare:

A. Requirements-only result
B. Requirements + target-aware result
C. Target-aware + verified limiter + Fix Before Buy

Primary:
- correct next-action comprehension
- unnecessary upgrade intent
- target-met acceptance
- upgrade-priority correction rate

Later real outcomes:
- measured FPS / 1% low change
- satisfaction
- return/sale
- upgrade cost vs achieved target

Do not calibrate using synthetic FPS outcomes.

## 6. 06ガード

- Official game requirements are preferred for minimum/recommended requirements.
- Benchmark/FPS sources require methodology and rights review.
- Do not scrape competitor benchmark tables.
- Traffic and usage counts remain attributed.
- Hardware detector features would require a separate Privacy/security review before implementation.

## 7. 07オプス

The market proves demand, but large catalogs are operationally expensive.

Recommended launch scope:
- GameFit existing games first
- CPU/GPU/RAM baseline
- only a small verified hardware catalog
- no automatic “all Steam games” expansion

A/B:
- automate requirements ingestion only after source rights and update reliability are solved.

Human-time risk:
- game patches
- hardware aliases / laptop variants
- benchmark methodology changes
- driver changes
- exact GPU/CPU SKU mapping

## 8. Priority from observed demand

For PC Performance Context validation:

1. VALORANT
2. Fortnite
3. CS2
4. Apex
5. Overwatch 2

This is not a permanent product-priority ranking.
The first three receive stronger current public usage evidence from System Requirements Lab.
Apex and Overwatch remain in the GameFit portfolio and are not removed.

## 9. Stage

- PC Performance Context staging: **GO / TEST**
- Requirements compatibility: **GO concept**
- Target-aware decision: **TEST**
- Fix Before Buy before replacement: **TEST**
- Verified limiter gate: **GO concept**
- Exact bottleneck percentage: **NO-GO**
- Exact FPS guarantee: **NO-GO**
- Huge game catalog: **HOLD**
- Private Validation integration: **NO-GO for current cohort**
