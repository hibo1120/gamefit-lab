# GameFit Decision Flow staging

Checked: 2026-10-11
Status: staging only; production / Private Validation未接続

## 1. 01ポート結論

Decision Flowは **TEST / staging GO**。

入口から最初のDecisionまでの必須入力を次の3段階へ限定する仮説を採用した。

1. Game
2. Input Method
3. 見直す機材 + 現在機材

Role、Weapon、Combat Style、Sensitivity Style、予算、細かなPreferenceは初回必須入力にしない。

ただし「質問を減らせば必ずCVが上がる」という主張はしない。必要情報不足でCLARIFYが増える可能性があるため、実測で評価する。

## 2. 02スカウト — 外部事例・研究

### RTINGS
2026-10時点で415〜416 mice bought and testedを掲げ、comparison pageではOur VerdictをFull Comparisonより先に置き、主要差分を先に理解できる構造。
GameFitへの示唆: 全詳細を先に入力/表示せず、まずDecisionとMain Differenceを返す。

Sources:
- https://www.rtings.com/mouse/reviews/best/mouse
- https://www.rtings.com/mouse/tools/compare

### PCPartPicker
System Builderはcomponent selectionとcompatibilityを中心に進める代表的なdecision-support pattern。
GameFitへの示唆: 製品一覧を先に見せるより、ユーザーの現在構成と制約を中心にする。
Source:
- https://pcpartpicker.com/list/

### NN/g Progressive Disclosure
Secondary/advanced optionsを後段へ送り、primary optionsへ注意を集中する原則。
GameFitへの適用: Role / Pro / detailed Preferenceは初回診断のprimary requirementから外す。
Source:
- https://www.nngroup.com/articles/progressive-disclosure/

### NN/g Explicit Differences
似た選択肢は差分を明示しないと誤選択や誤解が起きる。
GameFitへの適用: 「今の機材との差」を抽象総合点より先に示す。
Source:
- https://www.nngroup.com/articles/explicit-differences/

### Baymard Mobile Product Page / Lists
613 mobile Product Page examples / 93 ecommerce sites、578 mobile Product List examples / 93 sitesのbenchmarkで、small screenではcontent overviewと比較負荷が継続的な課題。
GameFitへの適用: desktopフォームをそのままmobileへ縮小せず、3-step core + secondary disclosureにする。
Sources:
- https://baymard.com/mcommerce-usability/benchmark/mobile-page-types/product-page
- https://baymard.com/mcommerce-usability/benchmark/mobile-page-types/product-list

### Baymard form evidence（隣接領域）
Checkout研究ではoptional/irrelevant fieldsが一部participantのflowを5〜30%長くするケース、22%がcheckout complexityを理由にabandonしたsurvey結果がある。
これはcheckout固有のEvidenceでありGameFitへ直接一般化しない。GameFitでは「不要質問を後段へ送る」仮説を支持する隣接シグナルとしてのみ扱う。

Sources:
- https://baymard.com/research-articles/current-state-of-checkout-ux
- https://baymard.com/research-articles/required-optional-form-fields
- https://baymard.com/research-articles/collections/cart-and-checkout

## 3. 03ビルダー — UX構造

### 初回必須

- Game
- Input
- Gear category
- Current product

### 初回から外す

- Role
- Weapon
- combat/player style
- sensitivity style
- Budget
- detailed taste

### Category Progressive Disclosure

primary:
- MnK: Mouse / Keyboard
- Controller: Controller

secondary:
- Mousepad
- Monitor
- Audio
- Network
- Cable

目的はカテゴリ削除ではなく、初見で同列選択肢を増やしすぎないこと。

### Budget defer仮説

DONT_UPGRADE / Fix Before Buy / CLARIFYなら購入予算はDecisionに不要な可能性がある。
Purchase comparisonが必要な場合だけBudgetを追加質問する。

これは未実証仮説であり、現行Private Validation flowは変更しない。

## 4. 04レッド反証

### 懸念1: 入力不足でCLARIFYが増える
対策:
- first decisionは「完全なProduct ranking」ではなく、Buy / Don't Buy / Fix First / Need More Info。
- purchase candidateが必要な場合のみ追加質問。

### 懸念2: Secondary categoryが見つからない
対策:
- 「その他の機材を見る」を明示。
- category miss / open rateを計測対象にする。

### 懸念3: 対応Inputが少ないゲームで失望
対策:
- GAME_INPUTSはexact allowlist。
- unsupported inputへ別game/inputをfallbackしない。
- productionでは対応外を明示する。

### 懸念4: Product searchで一覧にない
対策:
- 「一覧にない」を正式導線。
- 近似SKUへ勝手に置換しない。

### 懸念5: Budget deferで購入候補が遅くなる
対策:
- comparison pathに入った瞬間だけBudgetを聞く。
- A/Bでupfront vs deferredを比較するまでproduction固定しない。

### 懸念6: 「3つだけ」が実際はcurrent productを含め4入力
表現上の3つは3段階を意味するため、production copyでは誤解があれば「3ステップ」に変更する。

## 5. 05メジャー — 実測計画

Private 10人Validationとは混ぜない。

将来のDecision Flow test:

Primary:
- Landing → Start
- Step1 → Step2
- Step2 → Step3
- Step3 → Decision
- unassisted completion
- Decision reason comprehension

Guardrail:
- current product not listed rate
- secondary category open rate
- backtracking rate
- unsupported input rate
- CLARIFY rate
- time to first Decision
- 「予算を先に聞かれないのが不自然」率
- Role/Styleを聞かないことで不足感が出る率

A/B hypothesis:
A: Budget upfront
B: Budget deferred

採用基準は事前設定し、views/clicksだけで判断しない。

## 6. 06ガード

- stagingはreal user dataを送信しない。
- external requestなし。
- external CSS/image/fontなし。
- real recommendation engine未接続。
- product namesはcurrent gear入力例のみで、性能主張なし。
- Role/Proデータ未接続。

## 7. 07オプス

A:
- game→input allowlist
- category disclosure
- validation

B:
- supported game/input更新後の承認

C:
- catalog missの対応

人間工数増加要因:
- current product search coverage
- unsupported game/input問い合わせ

抑制策:
- nearest product substitution禁止
- missing productをenrichment queueへ送る将来設計
- Role/Weapon taxonomyのmain flow保守を持たない

## 8. Stage

- Entry / diagnosis direction: TEST
- Staging implementation: GO
- Budget defer: TEST
- Role required input: NO-GO
- Weapon / combat style required input: NO-GO
- Production adoption: HOLD
- Private Validation変更: NO-GO
