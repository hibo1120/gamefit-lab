# GameFit Lab

ゲーミング環境の追加予算を、PC・CPU/GPU・RAM・ストレージ・モニター・デバイスのどこへ使うと費用対効果が高いか診断する静的サイトです。「買わない・現状維持」も正式な結果として扱います。

- 公開サイト: https://hibo1120.github.io/gamefit-lab/
- 診断: https://hibo1120.github.io/gamefit-lab/diagnose.html
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
| `analytics.js` | PostHogイベント、送信値の許可リスト、fail-safe |
| `posthog-init.js` | 匿名・明示イベントのみのPostHog初期化 |
| `guides/` | SEO用の8ガイド |
| `tests/` | 診断、Affiliate、Analytics、SEO、リンクの回帰テスト |

データの流れは `games.js → diagnosis-engine.js → diagnose-page.js` です。診断結果の上位カテゴリを `affiliate.js` が `merchants.js` と照合します。広告主が無効、URLが空、カテゴリ不一致のいずれかならCTAは生成されません。

推薦カテゴリの内部キーは次の7種類です。

| キー | 表示 | Affiliate接続例 |
| --- | --- | --- |
| `keep` | 現状維持 | 接続しない |
| `monitor` | モニター | モニター販売先 |
| `ram` | RAM | メモリ販売先 |
| `storage` | ストレージ | SSD販売先 |
| `cpu_gpu` | CPU / GPU | パーツまたはBTO販売先 |
| `pc_replacement` | PC買替 | BTOメーカー |
| `device` | デバイス | マウス・キーボード販売先 |

公式動作環境は `official_*`、GameFit独自の診断目安は `gamefit_*` と分けています。画面上のスコアは公式保証値ではありません。

## ローカル確認とテスト

Node.js 18以上で、追加パッケージなしにテストできます。

```sh
node --test tests/*.test.js
```

ローカル表示はリポジトリのルートをHTTPサーバーで配信し、`diagnose.html` を開いて確認します。`file://` 直開きではなくHTTP経由を使ってください。
Playwrightを利用できる環境では `node tests/browser-smoke.js` でPC幅と390px幅の実ブラウザースモークテストも実行できます。

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
- `enabled`: 公開可否。承認・確認が終わるまでは必ず `false`
- `affiliate_url`: 承認されたHTTPS URL。未承認時は空文字
- `categories`: 接続できる推薦カテゴリ
- `destination_type`: `manufacturer_store`、`marketplace_search`など
- `disclosure_label`: 「広告」を含む表示ラベル
- `priority`: 同カテゴリ内の表示優先度
- `notes`: 審査状況や運用メモ

現在のMouse Computer、Razer、Amazon、楽天市場はすべて `enabled: false`、URL空欄です。本物のAffiliate URLは登録していません。

### Affiliateを有効化する手順

1. 広告主またはASPの承認状態と利用規約を人間が確認する。
2. 発行されたURLを `affiliate_url` にそのまま設定する。
3. 遷移先、カテゴリ、広告表記、計測パラメータをプレビューで確認する。
4. URLがHTTPSであることを確認する。
5. 最後に `enabled: true` へ変更する。
6. テストと本番確認でCTA、遷移先、`affiliate_clicked`を確認する。

`enabled: true` でもURLが空またはHTTPSでなければ表示されません。URLだけ設定して `enabled: false` の場合も表示されません。

## 将来の商品DB

`data/products.js` の `PRODUCT_SCHEMA` が最小インターフェースです。商品は広告主ID、公開可否、遷移先、価格の確認時刻、仕様、対応推薦カテゴリを持つ想定です。現在の商品配列は空で、価格スクレイピング、在庫取得、自動巡回は実装していません。

## PostHogイベント

| イベント | 発火 | 主なproperties |
| --- | --- | --- |
| `diagnosis_page_viewed` | 診断ページ表示 | UTM、`source` |
| `diagnosis_started` | セッション最初のフォーム操作 | `game`, `device_type` |
| `diagnosis_completed` | 診断成功 | FPS帯、目標FPS、Hz、RAM、ストレージ、予算、結果 |
| `diagnosis_invalid_input` | 入力エラー | 正規化済み`reason` |
| `diagnosis_cta_clicked` | ガイドから診断へ遷移 | ガイド、ゲーム、予算帯 |
| `affiliate_clicked` | 表示済み広告CTAのクリック | `merchant`, `category`, `destination_type`, `game`, `top_recommendation`, `source_page`, `budget_band` |

CPU/GPUの自由入力値は画面内の構成メモにだけ使い、Analyticsへ送りません。`analytics.js` の許可リストにないpropertiesとイベントは `beforeSend` で破棄します。PostHogが未読込・停止・例外の場合も診断とリンク遷移は継続します。

## 本番公開前チェック

- `git status`で意図したファイルだけが差分になっている。
- `node --test`が全件成功する。
- 4ゲーム、代表予算、不正入力で診断できる。
- 未承認広告主のCTAが表示されない。
- 承認済みのテスト設定では正しいリンクと`affiliate_clicked`が生成される。
- CPU/GPU自由入力値がPostHogへ送られない。
- PC幅と390px幅で横スクロールや重なりがない。
- ブラウザーのコンソールエラー、内部リンク404がない。
- `sitemap.xml`と`robots.txt`がHTTP 200である。
- 8ガイド、公式動作環境、広告・免責・プライバシー表記を確認する。
- `origin/main`へpush後、GitHub Pagesの反映コミットと公開URLを確認する。

## 運営方針・広告・免責

高額な商品を購入すること自体を目的とせず、「現状維持」「一部だけ交換」「PCを買い替える」を同じ基準で比較します。紹介リンク経由の購入で報酬を受け取る場合がありますが、報酬の有無だけを理由に商品を推奨しません。

性能・価格・仕様は構成、設定、ドライバ、アップデート等で変動します。最終的な購入判断ではメーカーの最新公式情報を確認してください。

匿名の利用状況分析にPostHogを使用します。氏名・メールアドレス等は診断で取得せず、自由入力のPC構成も送信しません。外部サービスの情報の取り扱いは各サービス提供者のプライバシーポリシーを確認してください。
