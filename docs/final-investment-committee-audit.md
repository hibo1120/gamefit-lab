# GameFit Personal Gear Intelligence — 最終総合QA / 投資委員会監査

監査日: 2026-10-10  
対象: Draft PR #1 / `feature/personal-gear-intelligence-v1`  
基準Head: `4601d5c116ba72683f2681623b682f4f95b3d9e1`  
判定対象: private S3。`main`、公開、配信、課金、tester送信は対象外。

## 【最終結論】

総合 **49/100、HOLD**。

- private内部検証の継続: **TEST**
- 承認後の独立10人検証: **TEST候補**
- `main` merge / production deploy / 外部公開: **HOLD**
- Affiliate/Premium開始: **HOLD**
- Scale: **NO-GO**

コードが動くことと事業成立を分離した。安全境界の主要なfail-openは修正したが、独立ユーザー需要、購入後Outcome、権利確認、運用工数、獲得単価、実収益はいずれも未実測である。

## 【①ポート】

| 領域 | 点数 | 判定 | 根拠 |
|---|---:|---|---|
| Product readiness | 74 | TEST | private flowと限定pairは成立。全カテゴリの実判断や実ユーザー価値は未証明 |
| Evidence readiness | 65 | TEST | 144 claims、blocking 0。ただしrights手動確認15、variant queue 82、長期Evidence不足 |
| Validation readiness | 48 | TEST/HOLD | local harnessは利用可。独立10人への送信・同意・回収は未承認・未実施 |
| Growth readiness | 36 | HOLD | hookとchannel仮説のみ。GameFit固有のqualified start/CV実績なし |
| Monetization readiness | 21 | HOLD | program/offer分離は済むが、承認済URL・注文・非取消commission・WTPはゼロ |
| Operations readiness | 38 | TEST | 保守的A+Bは60%。Evidence/rights/supportの実時間なし |
| Scale readiness | 16 | NO-GO | moat、分布、単位経済性、Outcome蓄積が未成立 |

加重総合は48.65、四捨五入49。配分はProduct 20%、Evidence 15%、Validation 25%、Growth 15%、Monetization 10%、Operations 10%、Scale 5%。次の資源配分はValidation 40%、Evidence/rights 25%、UX理解度 15%、運用工数計測 10%、Growth message test準備 10%。

## 【②スカウト】

### 確認済み事実

- Logitech FY2026 Gaming売上は約14.14億ドル、前年比6%増。周辺市場の存在は確認できるがGameFit需要の証明ではない。
- 日本には[ちくわの穴の中](https://chikuwanoana.com/)、[Device LAB](https://device-lab.jp/)、[ギアセン](https://gearsen.com/)、[MOUSE DX](https://www.mouse-dx.com/about)があり、診断・比較・価格・Pro利用などは既存供給である。
- 海外には[EloShapes](https://backup.eloshapes.com/)、[MouseFit](https://www.mousefit.pro/)、[AimBench](https://aimbench.com/)、[RigArmory](https://rigarmory.com/)、[Gamepadla](https://gamepadla.com/verified/)があり、形状比較、current setup、upgrade path、実測は単独moatにならない。
- [ChatGPT Shopping Research](https://openai.com/index/chatgpt-shopping-research/)、Google Shopping、Copilot Shoppingも嗜好学習・比較・価格確認へ進出しており、generic AI代替は強い。
- Amazon JPのPC等は原則2%。審査・返品・プログラム変更リスクがあり、Affiliateは推薦品質と分離が必要。
- RTINGSとRedditは体系的取得・商用利用に権利/規約上の境界がある。現在のURL＋短いGameFit独自fact方針を維持し、manual queueを解消するまで外部利用しない。

### 市場シグナルと仮説

需要シグナルは「比較」「現行セットとの差」「失敗回避」「無料Fix」にある。ただしGameFitへの支払意思は未確認。最有力wedgeは以下の連続データである。

`current gear → 属性別好き嫌い → hard avoid → 推薦修正 → 購入 → 継続使用/後悔`

localStorage内だけの現状ではearned moatではなく、将来構築可能なmoatに留まる。

## 【③ビルダー】

新機能拡張ではなく、監査で再現した安全欠陥を修正した。

- 既存公開診断用Affiliate APIを元の動作へ戻し、PGIのDONT/AVOID/CLARIFY抑止を専用APIへ分離
- Compatibilityの空文字、非数値、negative capacity、文字列Wi-Fi bands、high polling unsupportedをfail closed化
- methodology-sensitive deltaは両側に共通methodologyがある場合だけ比較
- attribute Evidenceは有効期限・完全性・測定verificationを通過したclaimだけでgrade算出
- game-fit source IDは完全なURL、日付、exact variant、rights status、測定verificationを再検証
- candidate側の高優先Fix Before Buyを入力側の空配列で迂回できないよう修正
- setup checkをcode列だけで完了扱いせず、観測済みresult付き構造へ変更
- 価格日付を実在日まで検証し、URL hostname、exact product/variant/region/currency、異なる過去日をDeal Score条件化
- Global learningは独立性確認methodとOutcome verificationがないrecordを拒否
- High confidenceは実Outcome限定、30独立ユーザー、30 calibration、10 holdout、同一category/game/input、verified outcomeを要求
- localStorageのprofile v1→v2 migration、future schema保護、nested shape検証、365日retentionを強化
- `VALUE_ALTERNATIVE`を「予算内」だけで出さず、同一用途・価格比較Evidenceを要求
- 返品/取消、merchant closure haircut、refund、payment fee、data maintenanceを収益モデルへ追加
- 壊れたRazer V4 Pro公式URLを現行公式URLへ修正

## 【④レッド】

他役の結論を前提にせず、候補・Evidence・価格・互換性・保存・収益を敵対入力で再現した。

### 修正済み

- candidate内のpriority 100 Fixを無視してSAFEになる
- URL/日付/rightsのない参照claimでgame fitをverified扱いする
- `2026-02-30`や`https://`だけのpriceをfresh/known扱いする
- high polling host support=falseをcompatible扱いする
- Wi-Fi bands文字列で例外になる
- missing methodologyを同一method扱いする
- unverified/stale measurementがattribute confidenceを上げる
- synthetic outcomeでHigh confidence gateを開ける
- fake user key / unverified outcomeでGlobal learningを開ける
- 古いfeedbackを配列末尾に置くと「最新」と誤認する
- value未定義のnormalized factでEvidence gradeを上げる
- 予算内というだけでVALUE_ALTERNATIVEになる
- undated eventがretentionを無期限回避する
- PGI用Affiliate抑止が既存公開診断の挙動まで変える

### 残存リスク

- 48 fixtureは実市場catalogではない。実測/variant/availabilityの継続更新負荷は未測定。
- localStorageは横断学習を生まず、共有端末・消去・回収不能の制約がある。
- private UIは安全側に倒れ、多くのカテゴリでDONTのみ。非DONT UXの理解度は代表mouse pair以外で未確認。
- mouse_skatesは属性モデルにあるがprivate UI/実商品fixtureが不足。
- rights manual review 15件、HEAD 403/timeout 4 URLは人間確認待ち。
- Playwright依存は未導入。Codex in-app browserによるdesktop 1440px / mobile 390pxの手動smokeは通過したが、再現可能な自動E2Eは未整備。
- DONT_UPGRADEは信頼を作る可能性と同時に、短期Affiliate CVを下げる。収益のために判定を弱めない。
- 汎用AIや競合はUIを模倣できる。Outcome/Evidence校正が蓄積されるまで防御力は低い。

## 【推奨安全性】

限定されたmouse pairでは、exact game/input、exact SKU、current delta、known-safe compatibility、hard avoid clear、relevant Evidence C以上、fresh exact price、observed setup checksを全て満たす時だけ非DONTを許可する。

その他はDONT_UPGRADE / CLARIFY / AVOID。Popularity、Pro adoption、Affiliate報酬、Flagship、新製品という理由だけでは順位やconfidenceを上げない。High confidenceは実Outcomeなしでは解禁しない。

## 【Evidence / Rights】

Evidence audit結果:

| 指標 | 結果 |
|---|---:|
| Claims | 144 |
| Blocking errors | 0 |
| Manual rights review | 15 |
| Duplicate URL | 38 |
| Same corporate publisher | 38 |
| Missing exact variant queue | 82 |
| Conflicting normalized value | 1 |

URL監査では69 unique URLを確認。64は直接応答、Razerの404 1件は現行公式URLへ修正、3件の403と1件のtimeoutは「無効」と断定せずmanual browser reviewへ残した。

manual rights queueはRTINGS 4件、TechRadar 3件、ProSettings 3件、Razer community 1件、Tom's Hardware 1件、Reddit 2件、その他独立lab 1件の計15件。本文・画像・表・グラフ・動画・thumbnailは保存せず、source URL、methodology、短いGameFit独自factのみ保持する。公開/商用利用前に各termsを人間確認する。

## 【Privacy】

- 外部送信、Analytics、ID自動生成、ログイン、DBなし
- schema versionとprofile schema versionを分離
- future schemaは上書きせずread-only recovery
- Export / recovery export / Reset / Delete all
- sensitive key、prototype key、未知root/profile/setup key、型崩れを拒否
- timestampのないeventはretention対象から除外し、365日超を削除
- shared-device注意を維持

本物のGlobal learningにはserver-side independence/dedup/consentが必要。現在は実装境界だけであり、外部収集は未承認。

## 【UX】

private flowは以下を保持する。

`My Setup Lite → Gear Taste → Game / Input → Next Upgrade → Upgrade Match → Regret Shield → Why Not? → 再推薦`

初心者表示は結論を短くし、詳細で理由、懸念、Evidence、Compatibility、買わなくてもできることを表示。manual checklistは`private-ui-manual-smoke.md`。

2026-10-10のlocal browser smokeでは、1440pxと390pxの双方でHTTP表示、noindex、共有端末注意、外部送信なし、My Setup→Taste→Game/Input→DONT/AVOID→Why Not→rerank、5 candidate cards、Global learning無効、横overflowなし、console error/warningなしを確認した。resource entryに外部URLはなかった。Playwright packageを追加していないため、専用scriptによる自動smokeは未実施。

## 【Moat】

### Earned moat

現時点では **なし**。fixture、ルール、local UIは複製可能。

### Buildable moat

- exact current→candidate deltaの校正履歴
- hard avoidと個人修正の縦断履歴
- game/input別の購入後満足・後悔Outcome
- contradictory Evidenceとvariantを管理する運用データ
- DONT_UPGRADEを含むconfidence calibration

これらを同意済み独立ユーザーから蓄積し、単純heuristic/generic AIより良いことをblind testで示す必要がある。

## 【Growth】

優先順位:

1. 承認後の独立10人private validation
2. exact current gear vs candidate / Fix Before Buyの無料utility
3. 狭い高意図SEO
4. Shorts hook test。ただし再生数ではなくqualified setup startで判定
5. Redditは調査優先・手動
6. note、Xはmessage test

大量SEO、Reddit自動収集、ISP推薦、スポンサー、広告はHOLD。Content→diagnosis→decisionの追跡なしに再生/表示を需要と扱わない。

## 【Monetization】

product、merchant、listing/offer、affiliate programは分離済み。commissionは推薦rank inputに含めない。同一製品に複数routeを持てるが、選択基準はexact variant、地域、通貨、在庫、鮮度、価格であり報酬ではない。

優先仮説はmall/manufacturer Affiliate、次に継続価値が証明されたWatch。Cable/Network/ISPはverified needがある場合だけ。ISPはエリア、建物、工事、IPv6、契約/解約条件の公式・人間確認が必須で、自動推薦はNO-GO。

## 【事業モデル】

税抜・仮説値。人件費は¥2,500/h。

| Scenario | Realized revenue | Cash/infra/data cost | Human cost | Net profit | Net / human h |
|---|---:|---:|---:|---:|---:|
| 悲観 | ¥20 | ¥5,000 | ¥37,500 | -¥42,480 | -¥2,832 |
| 標準 | ¥30,192 | ¥13,000 | ¥87,500 | -¥70,308 | -¥2,009 |
| 成功 | ¥488,250 | ¥65,000 | ¥200,000 | ¥223,250 | ¥2,791 |

成功ケースでも目標¥5,000/h未達。標準ケースは赤字で、Affiliateだけでは弱い。A+Bの保守的baselineは60%（A15/B45/C30/D10）。成熟90%は目標であり、観測値ではない。

## 【10人 / 30人 / 100人検証条件】

### 10人 — safety/usability TEST

- 構成: DONT 3、非DONT 3、rerank 2、その他2。購入不要scenario必須。
- 成功: 重大誤推薦0、privacy incident 0、理由理解7/10以上、flow完了7/10以上。
- 停止: hard avoid/compatibility/game-input違反1件、誘導的Affiliate説明、同意/削除不備。

### 30人 — directional validity TEST

- 10人gate通過後のみ。
- simple heuristic/generic AIとのblind比較。
- GameFitが理由理解、修正後fit、DONT受容、重大誤りで明確に劣らないこと。
- 高Correction、rerank不成功、カテゴリ別偏り、support >10分/人ならHOLD。

### 100人 — business signal HOLD

- 30人gate通過後のみ。
- source/content単位でqualified start、completion、Save/Return intent、purchase intent、実Outcomeを計測。
- 非取消注文20件/2暦月、単一merchant売上依存70%未満、保守的Net/hの改善を確認するまでMonetization/Scaleへ進めない。

## 【不足機能の棚卸し】

### GO（最大3）

1. local-only funnel instrumentationと匿名Export/E2E
2. exact comparison 1本を最後まで説明できるdecision path
3. realized revenue・人間工数・Outcome ledger

### HOLD

- Watch/通知/価格履歴本実装
- multiple setup profiles / long-term Gear Memory
- Controller以外を含む全カテゴリ非DONT拡大
- public content量産、Affiliate実リンク、ISP比較
- Global learning backend、DB、login

### NO-GO

- Evidence/OutcomeなしのHigh confidence
- commissionで順位変更
- Pro adoptionやFlagshipを個人fitの代替にする
- 無差別catalog深掘り
- main merge / deploy / public launch / tester送信を今回実施すること

## 【Test / HOLD / NO-GO】

- **TEST**: private code、fixture、manual QA、承認後10人検証
- **HOLD**: main merge、public Growth、Affiliate/Premium、30/100人、Global learning
- **NO-GO**: Scale、High confidence、ISP自動推薦、収益目的の安全gate緩和

## 【テスト】

- `node --test tests/*.test.js`: **197/197 pass**（ローカルHTTP試験を含む権限付き実行）
- sandbox内初回: 196件中195 pass、1件は`127.0.0.1`への`EACCES`でコード失敗ではない
- `node scripts/run-evidence-audit.js`: 144 claims、blocking 0、manual rights 15
- `git diff --check`: clean（Windowsの将来CRLF変換warningのみ）
- local browser smoke: 1440px / 390px pass。Playwright standalone scriptは依存未導入のため未実行

## 【次Stage判定】

現在Stageは **S3 private MVP / HOLD**。次は独立10人testの承認準備であり、機能追加ではない。10人gateを通過するまで30人、公開、収益化へ進めない。

## 【Mergeしてよいか】

**まだmergeしない。** Draft PRを維持する。manual rights queue、独立10人安全検証、再現可能なbrowser E2E、実運用工数のいずれも未完了だからである。
