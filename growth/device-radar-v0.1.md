# Gear Updates / Device Radar v0.1 運用メモ

## 現在地

- Stage: S3 MVP / production未公開
- REAL USER RESULT: 0
- 初期公開候補: Razer Viper V4 Pro 1件
- 公開判断: 小規模なS4 TESTとしては条件付き推奨。main merge / production公開は人間承認後に行う。

初期候補を1件に絞った理由は、公式製品ページ、発表日、主要仕様、旧モデルの公式情報まで確認できる一方、独立実測を判断へ採用できる状態ではないため。内部状態は `WATCH`、根拠状態は `official_specs_only` とする。RTINGSとPC Gamerの原著レビューの存在は2026-10-15に確認済みだが、存在確認とGameFit判断への採用を分離する。

## 01〜07 QA

- 01 ポート: 診断を主導線のまま維持し、トップ掲載は最大3件。Device Radar単体の事業化ではなく、検索流入から診断理解へつなぐ検証資産とする。
- 02 スカウト: メーカー公式一次情報を確認できる製品だけを候補化。Variant、発売時期、旧モデルとの関係が曖昧なら公開しない。
- 03 ビルダー: 1つのJSONから一覧、詳細、トップ抜粋、sitemapを生成。静的HTMLを残しSEO本文をJavaScript依存にしない。
- 04 レッド: ニュース一覧、BUY NOW表現、Pro採用による性能証明、独立実測の水増し、Affiliateリンク、画像転載を排除。V3 Proユーザーには「急いで買い替え不要」を明記。
- 05 メジャー: 公開前の実ユーザー証拠は0。Search Consoleと明示イベントで流入から診断開始までを測る。
- 06 ガード: 外部画像なし。公式一次情報と、存在確認済みの原著レビューへのテキストリンクを役割別に表示し、メーカー公称をラベル表示。著作権と利用規約を「出典表示で解決」と扱わない。
- 07 オプス: 構造検証とページ生成を自動化し、公開は自動化しない。情報確認日の`last_verified_at`と記事の実質更新日`content_updated_at`を分ける。

### 日付の扱い

- `announcement_date`: メーカーが発表した日。
- `global_launch_date`: メーカー一次情報で確認できる世界ローンチ日。日本国内の発売開始日と同義にはしない。
- `jp_release_date`: 公式または正規代理店の原情報で確認できた国内発売日。未確認なら`null`と理由を残す。
- `jp_preorder_date`: 公式または正規代理店の原情報で確認できた国内予約開始日。未確認なら`null`と理由を残す。
- `sales_status` / `sales_status_verified_at`: 現在の購入導線・販売確認と確認日。発売日を推定しない。
- `content_updated_at`: 記事本文・判断・構造を実質変更した日。sitemap `lastmod`はこれだけを使い、再確認だけでは更新しない。
- 発表日とローンチ日が同日でも、一次情報上の表現を確認してから記録する。

### 独立ソースの扱い

hostname数は独立性の証明にしない。各ソースに提供元、原提供元、原著レポートID、企業グループ、転載元、独立性確認状態、測定方法、対象claim、採用状態を保持する。同一原著、同一原提供元、同一企業グループ、転載、ブランド管理下の別サブドメインは複数独立ソースに数えない。組織IDは大文字小文字・法人接尾辞等を正規化してメーカーIDと照合する。`official_specs_only`では採用済み独立ソースを許可せず、強い買い替え判断は対象claimと採用済み実測の対応を必須にする。独立性を自動判定できない場合は`unverified`、判断へ未採用なら`discovered_not_adopted`とし、存在確認だけで判断状態を昇格させない。

## 計測契約

`device_update_index_viewed`は一覧ページ、`device_update_viewed`は詳細ページで、それぞれ1読込につき1回。詳細の許可propertiesは次だけとする。

- `product_slug`
- `brand`
- `category`
- `evidence_state`
- `decision_state`
- `language`
- `region_version`
- `page_source`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `source`

診断CTAは既存の`diagnosis_cta_clicked`を`content_type=device_update`で再利用する。氏名、メール、URL全文、Query String全文、自由文、`utm_content`はUpdate閲覧イベントへ送らない。`autocapture`、`$pageview`、pageleave、session recordingはOFFのままとする。

localhost、127.0.0.1、`?qa=1`ではPostHog SDKを読み込まず、同じallowlist処理後のイベントをブラウザ内だけで捕捉する。外部流入UTMがUpdate詳細に付いている場合は、診断CTAの内部用UTMで上書きせず、許可済みの`utm_source`、`utm_medium`、`utm_campaign`だけを引き継ぐ。`source`はCTA元記事を示す。イベントが見えない場合は計測経路未到達・遮断・実利用0を区別し、到達確認なしに0件と断定しない。
QAモード中は同一originの内部リンクへ`qa=1`を継承し、一覧→詳細→診断のページ遷移後も本番計測へ混入させない。外部リンクへは付与しない。

## 公開後のValidation

確認する順番は次の通り。

1. Search ConsoleのUpdate index/detail impressionsとorganic clicks
2. `device_update_index_viewed`
3. `device_update_viewed`
4. `diagnosis_cta_clicked`（`content_type=device_update`）
5. `diagnosis_page_viewed`
6. `diagnosis_started`

初回判断は公開後6週間で行う。6週間でorganic clickが10未満なら記事数を増やさず、indexing、検索クエリ、title/description、内部リンクを先に点検する。Update詳細が100閲覧に達した時点で診断ファネルも判定し、診断CTAクリックが0なら導線または検索意図の不一致としてHOLDし、量産しない。これらの閾値は外部ベンチマークではなく初期運用仮説（Evidence D）であり、自社実測後に更新する。

## 人間工数の予測

監視で候補が出た後の1製品追加あたりの目安。

| 作業 | AI | 人間 |
| --- | ---: | ---: |
| 公式情報再確認・旧モデル比較 | 15〜25分 | 3〜5分 |
| 原稿・Evidence・判断案 | 15〜30分 | 5〜10分 |
| Guard / Red / Preview / test | 15〜30分 | 5〜10分 |
| 合計 | 45〜85分 | 13〜25分 |

継続更新は公開1製品につき月5〜15分を想定する。販売終了、仕様修正、独立実測追加があった月は別途15〜30分。初期のA+B比率は約85%、成熟後は監視→候補→下書き→Guard→Red→Previewを自動化して90%以上を目標とするが、公開承認はBのまま残す。

## 優先順位

- DO NOW: 1件だけで安全なPreviewと人間レビューを完了する。
- TEST: 公開後の検索流入、Update閲覧、診断CTA、診断開始を6週間または十分な母数まで観測する。
- LATER: 独立実測ソース追加、候補生成の半自動化、stale検知。実測で価値が出た後だけ行う。
- NO-GO: 自動公開、記事量産、外部製品画像転載、Affiliate購入リンク、Pro採用を性能証明に使うこと。
