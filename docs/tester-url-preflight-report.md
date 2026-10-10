# Tester URL開始前 最終準備レポート

監査日: 2026-10-10

対象: Draft PR #1 / `feature/personal-gear-intelligence-v1`

Build: `pgi-n10-preflight-v2`

## Synthetic QA結果

24の敵対archetypeを初心者・中級・マニアへ展開した72 persona（各24件）で実行した。すべてのpersonaで次の7段階を記録した。

`input → recommendation → explanation → user objection → Why Not相当の確認 → rerank → final decision`

結果:

- Synthetic Gate: **PASS**
- 重大な安全チェック失敗: 0
- Game/Input混入: 0
- unsafeな非DONT判定: 0
- hard avoid違反: 0
- Compatibility bypass: 0
- Evidence過大表示: 0
- Affiliate / Flagship / Pro adoptionによる順位変化: 0
- 高価格そのものを有利に扱うケース: 0
- OutcomeなしでHigh confidenceになったケース: 0
- UI向け説明への内部enum露出: 0

判定分布:

| 判定 | 件数 |
|---|---:|
| DONT_UPGRADE | 58 |
| CLARIFY | 12 |
| CONSIDER_UPGRADE | 2 |

最上位候補の分類:

| 分類 | 件数 |
|---|---:|
| DONT_UPGRADE | 57 |
| SAFE / FAMILIAR | 1 |
| BETTER_FIT | 1 |
| AVOID | 1 |
| 候補なし | 12 |

60件でdisagree後の本人向け再ランキングまで実行した。未登録製品またはGame/Input不一致の12件は、似た製品を代用せずCLARIFYで停止した。

行動出力の組み合わせは26種類であり、23/24 archetypeでは知識レベルを変えても結果が同じだった。`finite_flow`やWhy Not表示はharnessが確認する工学的回帰で、実際の操作完遂・理解・需要の証拠ではない。72件は実ユーザー10人の分母へ一切加えない。

再現方法:

`node scripts/run-synthetic-validation.js`

## 日本語品質

前回の日本語ネイティブ品質監査に加え、Tester開始文、参加者番号slot、結果書き出し、ホスティング境界を再確認した。利用者向け画面では内部英語名称を表示しない。結果は「結論 → 理由 → 詳細」の順を維持し、情報不足時は「もう少し情報が必要です」とする。

## 修正した文言

- 見出しを「買い替える前に、次の一手を考える」へ変更し、購入前提に見える表現を弱めた。
- 冒頭で「入力中に内容が自動送信されることはありません」と明示し、終了時に参加者番号付き結果を本人が書き出して渡す境界を同意前に表示。
- 「独立10人テストを開始」を「テストを始める前に」へ変更。
- 「開発者・実装担当」を「このサービスの開発には参加しておらず、表示される結果を事前に知らない」へ変更。
- URL参加者向けに「このテスト結果を書き出す」を追加。氏名・メール・自由記述を含まない参加者番号付き記録であることを表示。
- localStorage記録、参加者download、担当者受領ファイルの削除主体・時期を分けて表示。
- ページ配信時には配信事業者が通常のアクセス情報を処理し得る一方、機材・好み・回答は送らない境界を明記。

## Tester URL推奨方式

推奨は、**Cloudflare Pagesの専用preview deploymentをunlistedで使い、deployment hash URLだけを10人へ個別配布する方式**。今回は実際のproject作成・接続・deployを行っていない。

URL構造:

`https://<deployment-hash>.<preview-project>.pages.dev/private/personal-gear.html#T01`

から `#T10`。`#T01`はURL fragmentで、HTTP requestや通常のreferrerには含まれない。名前や連絡先をURLへ入れない。推測しやすいbranch aliasは配布しない。

設定:

- production deployment: 無効
- preview branch: `feature/personal-gear-intelligence-v1`だけ
- build command: なし
- output: repository root
- Functions / Workers / Analytics / Affiliate: なし
- HTML meta: `noindex,nofollow,noarchive`
- HTTP header: `X-Robots-Tag: noindex, nofollow, noarchive`
- `Cache-Control: no-store`
- `connect-src 'none'`, `frame-ancestors 'none'`
- 本番トップ・sitemapからリンクしない
- preview上の`/private/validation-console.html`とextensionless routeは`_redirects`で404へ送る。担当者管理画面はローカルcheckoutだけで使用

費用: Cloudflare Pages Free範囲を想定。公式のFree limitでは月500 builds、1 concurrent build、1 projectあたり20,000 filesであり、本テスト規模は範囲内。ただし契約・課金画面が出た場合は停止する。

公開範囲: URLを知っている人は閲覧できるpublic-unlisted。検索非掲載とアクセス制御は別物。

最大リスク:

- URL転送・漏えいで第三者が画面とfixtureを閲覧できる。
- 配信事業者がIP、時刻、User-Agent等の通常のrequest metadataを処理し得る。
- atomic preview URLが削除まで残る。
- testerが参加者番号付きJSONを返送しない場合、結果を集計できない。
- JSONは構造・build・slot・連番を検証するが暗号署名はなく、真正性は1対1の返送チャネルと担当者確認に依存する。

代替方式:

1. Cloudflare Access: 本当のアクセス制御が必要な場合。loginとidentity processingが増えるため、現在の「login不要・個人識別子なし」より運用・Privacy負担が大きい。
2. 担当者端末または同意済み画面共有: 外部URLなし。最も閉じているが、日程調整と立会い工数が増える。
3. GitHub Pages: private repositoryのPages制約とmainサイトへの影響を避けるため、今回のTester previewには使わない。

根拠: [Cloudflare Pages preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)、[branch deployment controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/)、[custom headers](https://developers.cloudflare.com/pages/configuration/headers/)、[Pages Free limits](https://developers.cloudflare.com/pages/platform/limits/)。

## ⑥ガード公開判定

**unlisted previewは条件付きTEST。本当のprivate accessとは呼ばない。**

入力はlocalStorageだけに保存し、画面コードにfetch、XHR、WebSocket、sendBeacon、PostHogを含めない。CSPでもconnectを禁止する。参加者slotはURL fragmentで渡し、URL自体に個人名・連絡先を入れない。ただし返送チャネル上では担当者がslotと参加者を一時的に対応付けられるため、厳密な匿名ではなく仮名化記録として扱う。

この条件では、購入要求も自由記述もなく、漏えい時の主な対象はUIと公開仕様由来fixtureであるため、最大10人のunlisted testは比例的と判断する。ただし、URL漏えいを許容できない場合や未公開知財を秘密として扱う場合はAccessが必須となり、deploy前に再承認する。実URLではT01配布前にT00を使い、HTTPS、headers、no-store、console redirect、外部通信0、export→返送→import→担当者review→Gateの1往復を確認する。

## 10人Gate

実ユーザーGateは変更しない。

PASS:

- 重大誤推薦 0
- Privacy incident 0
- Game/Input contamination 0
- hard avoid violation 0
- critical compatibility violation 0
- flow完了 7/10以上
- 理由理解 7/10以上

重大事象が1件でも確認された場合は、その時点でSTOPし残りへ送らない。Synthetic PASSはこのGateを代替しない。build変更後は既存結果と混ぜず、新しいcohortとして扱う。

## Soft Public Beta計画

| Phase | 範囲 | 開始条件 | 終了判断 |
|---|---|---|---|
| 1 | 独立Tester 10人 | previewの最終承認 | 10人Gate PASS / STOP / INCONCLUSIVE |
| 2 | Soft Public Beta 50〜100 qualified visits | 10人Gate PASSと別承認 | 完了率・理解・修正価値・重大事象で判定 |
| 3 | X Topic Seeding 3〜7日 | Phase 2で下流行動を確認 | 再生数でなく診断開始・Decision到達を確認 |
| 4 | Shorts / X 5〜10本 | Phase 3でqualified流入を確認 | Why Not・rerank・Save/Return intentまで評価 |
| 5 | Growth拡大 | 安全・価値・運用工数が同時に基準達成 | チャネル別利益・人間時間で配分 |

主要funnelは `Landing → My Setup → Decision → Why Not → Re-rank → Save/Return/Purchase intent`。PVや再生数だけでGOにしない。DONT_UPGRADE受容も成功に含める。

## X/Shorts開始条件

現時点はHOLD。投稿・公開募集はしない。

開始条件:

1. 独立10人Gate PASS。
2. P0/P1未解消0。
3. Tester URLと削除運用の確認完了。
4. 投稿内容から診断開始、Decision、Why Notまで追跡できる。
5. GameFit関連テーマだけを使い、無関係なwarm-up投稿をしない。

準備対象は「買わなくてよい人」「240 Hzなのに144 Hz設定」「Wi-Fi 7とPing」「ケーブル規格の過剰購入」「プロ使用率と個人Fit」など、製品推薦より先にGameFit機能へ接続するテーマとする。

## ⑤メジャー

- Synthetic結果に `synthetic:true` と `real_tester_eligible:false` を固定し、real 10人Gateから除外。
- 72 personaすべてに7段階traceと個別safety checksを保持。
- real validationは固定build `pgi-n10-preflight-v2`、T01〜T10、順序付きevent、elapsed timeを使用。
- existing event schemaはLanding、My Setup、Decision、Why Not、rerank、Save/Return、Purchase route intentを区別。
- CLARIFYはRecommendation Acceptanceの分母へ入れず、DONT_UPGRADE受容は成功候補として扱う。
- SyntheticデータをConfidence calibrationや実Outcomeへ流用しない。

## ⑦オプス

URL modeの想定人間工数:

- preview作成・header確認: 45〜90分（初回のみ）
- T01〜T10 URL割当と案内: 30〜60分
- 1人あたり質問対応・JSON受領・安全確認: 15〜25分
- 10人集計・四役review: 2〜3時間
- 合計目安: 6〜9時間

最大工数リスクは、testerのファイル返送失敗、ブラウザ保存制限、未登録製品のCLARIFY増加、個別日程調整。FAQを増やして回答を誘導せず、「どこで止まったか」だけを記録する。

## ②スカウト

unlisted previewは導入摩擦が低く、login方式より初心者を除外しにくい。一方、URL到達自体は需要シグナルではない。差別化の検証対象は「買わない判断」「無料確認を先に出す」「人気と本人Fitを分ける」が理由理解と再ランキング改善につながるかである。

Cloudflare公式ではpreview URLは標準でpublic、`X-Robots-Tag: noindex`付きで、Accessを使うと認証制限が可能。よって「URLを知る人だけ」と「許可された人だけ」を同義にしない。

## ③ビルダー

- 72-persona synthetic fixtureと実行engineを追加。
- 各personaのfull trace、safety check、bias permutationを自動化。
- Tester向け冒頭文を簡潔な日本語へ変更。
- `#T01`〜`#T10`の参加者番号slotを実装。
- 参加者本人の1slotだけを書き出す機能を追加。
- 担当者のローカル管理画面へ1slotずつ取り込み、build・出所・連番・重複・未知metadata・担当者専用eventを拒否してからレビュー確定する導線を追加。
- event外側も`name` / `properties`の完全一致とし、連絡先や自由記述を追加して取り込む経路を拒否。
- preview上の担当者管理画面は`_redirects`で404へ送り、ローカルの信頼済みcheckoutでだけ使用。
- private routeへnoindex、no-store、CSP、frame denialを準備。
- build IDをv2へ更新し、変更前cohortとの混在を防止。

## ④レッド

重点反証:

- syntheticを実ユーザーへ水増しできない。
- Game/Input不一致は候補なしCLARIFY。
- hard avoid一致はAVOID、未知は非DONTへ進まない。
- Compatibility unknownとEvidence不足を0扱いしない。
- Affiliate、commission、flagship、popularity、Pro adoptionの追加で順位不変。
- 高価格を性能の代理にしない。
- OutcomeなしではHigh confidenceを解禁しない。
- noindexをアクセス制御と呼ばない。
- CDN request metadataと入力データの送信を混同しない。

Syntheticで再現したP0/P1は0。残る最大リスクはreal testerの理解度、URL漏えい、結果ファイル回収、ホスティング事業者のrequest metadataである。

独立レッドが発見したURL結果の中央集約欠落、管理画面のpreview露出、仮名化記録を匿名と呼ぶ問題、event envelope/metadataへの未知値混入、保持期間表示の不一致は修正して回帰化した。最終差分の既知P0/P1は0。残るP2はSyntheticの自己循環、JSONに暗号署名がないこと、実deployでのheader/redirect未確認である。

## ①ポート

- **GO**: Synthetic QA、日本語・URL mode実装、preview設定準備。
- **TEST**: P0/P1/P2修正済み。承認後のunlisted preview、T00往復確認、独立10人。
- **HOLD**: 外部deploy、main merge、Soft Public Beta、X/Shorts、Affiliate、収益化。
- **NO-GO**: Syntheticを実ユーザーGateの代替にすること、noindexを認証扱いすること、承認前deploy。

## テスト結果

- Synthetic personas: 72 / 72 completed
- Synthetic safety findings: 0
- `node --test tests/*.test.js`: **221 / 221 pass**
- `node scripts/run-synthetic-validation.js`: **72 / 72 complete、failure 0、real tester count 0**
- `git diff --check`: **pass**（改行コード変換の注意のみ）
- desktop 1440×1000 / mobile 390×844 smoke: **pass**。横スクロール、raw enum、`undefined` / `null`、debug表示、console error / warningはいずれも0。`#T01`でID入力欄を隠し、同意前に本編へ進めないこと、`noindex,nofollow,noarchive`、カスタム404を確認。

## 残る本人操作：最大1つ

**Cloudflare Pagesのテスト専用preview deploymentと、既存の1対1連絡手段を結果返送に使うことの一括最終承認。**

承認後は、production deployment無効、対象branch限定、Analytics/Functionsなし、preview URLの`X-Robots-Tag`とHTTPSを確認する。まずT00の1往復を通し、その後T01〜T10を発行する。main、本番サイト、公開Growthには触れない。
