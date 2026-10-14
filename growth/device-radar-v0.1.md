# Gear Updates / Device Radar v0.1 運用メモ

## 現在地

- Stage: S3 MVP / production未公開
- REAL USER RESULT: 0
- 初期公開候補: Razer Viper V4 Pro 1件
- 公開判断: 小規模なS4 TESTとしては条件付き推奨。main merge / production公開は人間承認後に行う。

初期候補を1件に絞った理由は、公式製品ページ、発表日、主要仕様、旧モデルの公式情報まで確認できる一方、独立実測を判断へ採用できる状態ではないため。状態は `WATCH`、Evidenceは `official_specs_only` とする。

## 01〜07 QA

- 01 ポート: 診断を主導線のまま維持し、トップ掲載は最大3件。Device Radar単体の事業化ではなく、検索流入から診断理解へつなぐ検証資産とする。
- 02 スカウト: メーカー公式一次情報を確認できる製品だけを候補化。Variant、発売時期、旧モデルとの関係が曖昧なら公開しない。
- 03 ビルダー: 1つのJSONから一覧、詳細、トップ抜粋、sitemapを生成。静的HTMLを残しSEO本文をJavaScript依存にしない。
- 04 レッド: ニュース一覧、BUY NOW表現、Pro採用による性能証明、独立実測の水増し、Affiliateリンク、画像転載を排除。V3 ProユーザーにはNO RUSHを明記。
- 05 メジャー: 公開前の実ユーザー証拠は0。Search Consoleと明示イベントで流入から診断開始までを測る。
- 06 ガード: 外部画像なし、公式リンクのみ、メーカー公称をラベル表示。著作権と利用規約を「出典表示で解決」と扱わない。
- 07 オプス: 構造検証とページ生成を自動化し、公開は自動化しない。`last_verified_at`と販売状態を更新対象にする。

## 計測契約

`device_update_viewed`は詳細ページ1読込につき1回。許可propertiesは次だけとする。

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

## 公開後のValidation

確認する順番は次の通り。

1. Search ConsoleのUpdate index/detail impressionsとorganic clicks
2. `device_update_viewed`
3. `diagnosis_cta_clicked`（`content_type=device_update`）
4. `diagnosis_page_viewed`
5. `diagnosis_started`

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
