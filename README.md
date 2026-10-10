# GameFit Lab

ゲーミング環境の追加予算を、PC・CPU/GPU・メモリ・ストレージ・モニター・デバイスのどこへ使うと費用対効果が高いか診断する静的サイトです。「買わない・現状維持」も正式な結果として扱います。

- 公開サイト: https://hibo1120.github.io/gamefit-lab/
- 診断: https://hibo1120.github.io/gamefit-lab/diagnose.html
- Globalテスト: https://hibo1120.github.io/gamefit-lab/en/
- Global診断: https://hibo1120.github.io/gamefit-lab/en/diagnose.html
- 初期対応: VALORANT / Apex Legends / Fortnite / Monster Hunter Wilds

## アーキテクチャ

GitHub Pagesで配信できるよう、ビルド不要のHTML・CSS・JavaScriptで構成しています。

| ファイル | 役割 |
| --- | --- |
| `diagnose.html` | 診断フォーム、結果表示領域、広告・免責・プライバシー表記 |
| `diagnose-page.js` | DOM連携、入力、結果描画、公式リンク描画 |
| `diagnosis-engine.js` | 入力検証、スコアリング、推薦カテゴリの統一 |
| `data/games.js` | ゲーム名、公式動作環境、GameFit独自判断に使う目安 |
| `data/merchants.js` | 広告主、Affiliate URL、カテゴリ、公開可否 |
| `data/products.js` | 将来の商品DB向け最小スキーマ。現在の商品データは空 |
| `affiliate.js` | CTA生成条件、表示、クリック計測の共通処理 |
| `sharing.js` | 結果カテゴリ別の共有文、X Web Intent、診断URLコピー |
| `analytics.js` | PostHogイベント、送信値の許可リスト、fail-safe |
| `posthog-init.js` | 匿名・明示イベントのみのPostHog初期化 |
| `guides/` | SEO用の8ガイド |
| `growth/` | Shorts 12本、X 30本、note 6本、30日カレンダー、海外展開チェック |
| `en/` | Global最小版。英語UI、USD予算アダプター、英語ガイド4本 |
| `growth/en/` | Global需要検証用のShorts 6本、X 10本、Reddit調査案5本 |
| `tests/` | 診断、Affiliate、Analytics、SEO、リンクの回帰テスト |
| `private/` | Personal Gear Intelligenceの非公開・noindex・localStorage限定S3検証UI |
| `data/personal-gear-fixtures.js` | 8カテゴリ48製品のfixture-only Evidence ledger |
| `current-gear-delta.js` / `compatibility-engine.js` | 属性Evidence付きの現用品差分とfail-closed互換性判定 |
| `data/decision-briefs.js` / `catalog-lifecycle.js` | Learn Before Buy知識単位とon-demand enrichment運用 |
| `normalization-engine.js` | 単位・表記揺れをraw値と分離して正規化 |
| `storage-engine.js` | localStorage schema、Export/Reset/Delete、破損復旧境界 |

データの流れは `games.js → diagnosis-engine.js → diagnose-page.js` です。診断結果の上位カテゴリを `affiliate.js` が `merchants.js` と照合します。広告主が無効、URLが空、カテゴリ不一致のいずれかならCTAは生成されません。

推薦カテゴリの内部キーは次の7種類です。

| キー | 表示 | Affiliate接続例 |
| --- | --- | --- |
| `keep` | 現状維持 | 接続しない |
| `monitor` | モニター | モニター販売先 |
| `ram` | RAM | メモリ販売先 |
| `storage` | ストレージ | SSD販売先 |
| `cpu_gpu` | CPU / GPU | パーツまたはBTO販売先 |
| `pc_replacement` | PCの買い替え | BTOメーカー |
| `device` | デバイス | マウス・キーボード販売先 |

公式動作環境は `official_*`、GameFit独自の診断目安は `gamefit_*` と分けています。画面上のスコアは公式保証値ではありません。

## ローカル確認とテスト

Node.js 18以上で、追加パッケージなしにテストできます。

```sh
node --test tests/*.test.js
```

ローカル表示はリポジトリのルートをHTTPサーバーで配信し、`diagnose.html` を開いて確認します。`file://` 直開きではなくHTTP経由を使ってください。
Playwrightを利用できる環境では `node tests/browser-smoke.js` でPC幅と390px幅の実ブラウザ・スモークテストも実行できます。

Personal Gear IntelligenceのS3検証画面はローカルサーバー上の`/private/personal-gear.html`で確認します。本番サイトからはリンクせず、サイトマップにも含めません。商品・Evidenceはfixture専用であり、実購入向け公開データではありません。

## ゲームの追加方法

1. `data/games.js` の `games` に一意な `id` を追加する。
2. 公式一次情報を確認し、`official_requirement_source`、`official_minimum`、`official_recommended` を記載する。
3. GameFit独自目安を `ram_requirement.gamefit_*` と `storage_requirement.gamefit_policy` に記載する。
4. `game_type`、`performance_characteristics`、`competitive_high_fps`、`notes` を記載する。
5. `tests/data.test.js` と `tests/diagnosis.test.js` に読み込み・代表ケースを追加する。
6. 公式情報と独自判断が混同されていないか、PC・390px表示と公式リンクを確認する。

ゲーム選択肢と公式リンクはデータから自動生成されるため、通常は `diagnose.html` の編集は不要です。新しい特性でスコア規則が必要な場合だけ、`diagnosis-engine.js` に小さなルールを追加します。

## Affiliate広告主の追加方法

`data/merchants.js` に次の項目を持つレコードを追加します。

- `merchant_id`: Analyticsにも使う英数字ID
- `merchant_name`: 画面表示名
- `region`: `JP`、`US`などの販売地域
- `currency`: `JPY`、`USD`などの通貨
- `enabled`: 公開可否。承認・確認が終わるまでは必ず `false`
- `affiliate_url`: 承認されたHTTPS URL。未承認時は空文字
- `categories`: 接続できる推薦カテゴリ
- `destination_type`: `manufacturer_store`、`marketplace_search`など
- `disclosure_label`: 「広告」を含む表示ラベル
- `priority`: 同カテゴリ内の表示優先度
- `notes`: 審査状況や運用メモ

日本向けのMouse Computer、Razer、Amazon、楽天市場と、Global検証用のRazer US、Lenovo US、Newegg、Amazon USはすべて `enabled: false`、URL空欄です。本物のAffiliate URLは登録していません。診断画面は地域が一致する広告主だけを候補にするため、日本向けURLを英語版へ誤表示しません。

### Affiliateを有効化する手順

1. 広告主またはASPの承認状態と利用規約を人間が確認する。
2. 発行されたURLを `affiliate_url` にそのまま設定する。
3. 遷移先、カテゴリ、広告表記、計測パラメータをプレビューで確認する。
4. URLがHTTPSであることを確認する。
5. 最後に `enabled: true` へ変更する。
6. テストと本番確認でCTA、遷移先、`affiliate_clicked`を確認する。

`enabled: true` でもURLが空またはHTTPSでなければ表示されません。URLだけ設定して `enabled: false` の場合も表示されません。

## 将来の商品DB

`data/products.js` の `PRODUCT_SCHEMA` が最小インターフェースです。商品は広告主ID、地域、通貨、公開可否、遷移先、価格の確認時刻、仕様、対応推薦カテゴリを持つ想定です。現在の商品配列は空で、価格スクレイピング、在庫取得、自動巡回は実装していません。

## PostHogイベント

| イベント | 発火 | 主なproperties |
| --- | --- | --- |
| `diagnosis_page_viewed` | 診断ページ表示 | UTM、`source`、言語・地域版・ページ |
| `diagnosis_started` | 地域版ごとのセッション最初のフォーム操作 | `game`, `device_type`, UTM、`source`、言語・地域版・ページ |
| `diagnosis_completed` | 診断成功 | FPS帯、目標FPS、Hz、RAM、ストレージ、予算、結果 |
| `diagnosis_invalid_input` | 入力エラー | 正規化済み`reason` |
| `diagnosis_cta_clicked` | ガイドから診断へ遷移 | ガイド、ゲーム、予算帯 |
| `affiliate_clicked` | 表示済み広告CTAのクリック | 広告主、カテゴリ、結果、予算帯、UTM、`source` |
| `result_shared` | X共有または診断URLコピー | `platform`, `game`, `top_recommendation` |

CPU/GPUの自由入力値は画面内の構成メモにだけ使い、Analyticsへ送りません。`analytics.js` の許可リストにないpropertiesとイベントは `beforeSend` で破棄します。PostHogが未読込・停止・例外の場合も診断とリンク遷移は継続します。

全イベントに `language`（`ja` / `en`）、`region_version`（`jp` / `global`）、`page_source` を付けます。日本版とGlobal版は同じイベント名と推薦カテゴリを使うため、同じファネルで比較できます。英語版の予算は `$100 / $300 / $500 / $1,000 / $1,500 / $2,000+` の独立した意思決定帯で、円からの為替換算ではありません。`en/locale.js` がこの表示帯を共有診断エンジンの相対予算帯へ接続し、スコア規則のコピーを防ぎます。

### Growth流入の比較

`growth/`内のURLは次の規則で統一しています。

- Shorts: `utm_source=youtube&utm_medium=shorts`
- X: `utm_source=x&utm_medium=social`
- note: `utm_source=note&utm_medium=article`
- 共通campaign: `gamefit_growth_v1`
- 個別判別: `utm_content`と`source`へcontent IDを設定

PostHogでは`utm_source`、`utm_medium`、`utm_campaign`、`utm_content`、`source`で絞り、`diagnosis_page_viewed → diagnosis_started → diagnosis_completed → affiliate_clicked`のユニークユーザーファネルを作成します。`diagnosis_started`以降にも同じ流入値を明示的に付けるため、媒体別・コンテンツ別の開始率、完了率、将来のAffiliateクリック率を比較できます。URLから許可済みの識別子だけを取得し、任意のクエリや自由入力はイベントへ含めません。

結果画面のX共有はXのWeb Intentを開くだけで、X APIや外部アカウント連携は使いません。共有文は結果カテゴリだけから生成し、CPU/GPU自由入力値を含めません。URLコピーも公開中の診断URLと共有専用UTMだけをコピーします。

### Global小規模検証

`growth/en/` の全URLは `utm_campaign=gamefit_global_test` を使い、`utm_source`は `youtube`、`x`、`reddit`、`utm_medium`は順に `shorts`、`social`、`community`です。content IDはすべて `en_` で始まり、日本向け素材と重複しません。SNSへの投稿は自動化せず、人間が各媒体・コミュニティの規則と最新情報を確認して手動で行います。

初期判断は50〜100訪問を目安に、次を比較します。

- 訪問→診断開始率、開始→完了率、完了数（言語・媒体・content ID別）
- ランディング/ガイドの`diagnosis_cta_clicked`率、流入`source`、`keep`を含む推薦カテゴリ分布、結果共有率
- PostHogでプライバシーを保った集計値として利用できる場合だけ国・地域傾向を確認し、IPアドレスや個人を特定する入力は収集しない
- 自由記述で得る「結果が妥当か」「どの入力が不足か」という明確な反応
- Affiliate承認後のみ、地域が一致する`affiliate_clicked`の有無

大規模な英語コンテンツDBや商品DBの再開を検討する入口は、(a) Global診断が50件以上完了、(b) 有効化後のAffiliate成果が発生、(c) SNS・コミュニティで再訪、共有、具体的改善要求など明確な需要シグナルが得られる、のいずれかです。いずれかを満たしても自動的に大型開発へ進まず、流入意図と結果の妥当性を人間が確認します。条件を満たさない段階では価格DB、セール監視、大規模互換性DBを作らず、コピーと入力負荷を先に検証します。

## 本番公開前チェック

- `git status`で意図したファイルだけが差分になっている。
- `node --test`が全件成功する。
- 4ゲーム、代表予算、不正入力で診断できる。
- 未承認広告主のCTAが表示されない。
- 承認済みのテスト設定では正しいリンクと`affiliate_clicked`が生成される。
- CPU/GPU自由入力値がPostHogへ送られない。
- 結果共有文にCPU/GPU自由入力値が含まれず、X IntentとコピーURLのUTMが正しい。
- Growth URLの媒体、campaign、content IDが`content_calendar.csv`と一致する。
- PC幅と390px幅で横スクロールや重なりがない。
- ブラウザのコンソールエラー、内部リンク404がない。
- `sitemap.xml`と`robots.txt`がHTTP 200である。
- 8ガイド、公式動作環境、広告・免責・プライバシー表記を確認する。
- Globalのトップ、診断、英語4ガイド、言語切替、hreflang、canonical、OG/Twitter、USD 6予算帯を確認する。
- Globalの全Affiliate CTAが非表示で、US向けプレースホルダーが無効・URL空欄であることを確認する。
- `language=en`、`region_version=global`、`page_source`が各イベントへ付き、CPU/GPU自由入力が送られないことを確認する。
- `origin/main`へpush後、GitHub Pagesの反映コミットと公開URLを確認する。

## 運営方針・広告・免責

高額な商品を購入すること自体を目的とせず、「現状維持」「一部だけ交換」「PCを買い替える」を同じ基準で比較します。紹介リンク経由の購入で報酬を受け取る場合がありますが、報酬の有無だけを理由に商品を推奨しません。

性能・価格・仕様は構成、設定、ドライバ、アップデート等で変動します。最終的な購入判断ではメーカーの最新公式情報を確認してください。

匿名の利用状況分析にPostHogを使用します。氏名・メールアドレス等は診断で取得せず、自由入力のPC構成も送信しません。外部サービスの情報の取り扱いは各サービス提供者のプライバシーポリシーを確認してください。
