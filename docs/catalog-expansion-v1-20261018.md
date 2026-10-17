# GameFit Lab｜Device Catalog Expansion v1 ローカル検証報告

作成日: 2026-10-18

Stage: S4 TEST（維持）

作業ブランチ: `staging/catalog-expansion-v1-20261018`

起点 commit: `a7338e8329301157ebf87317dde4be3d25fbfab2`

起点 tree: `bccdaa594036f68fbb3c943d1c463458ba4855f3`

## 結論

ローカル候補として、既存48件のテスト用fixtureとは別に、メーカー公式ページで製品識別を確認した69製品を登録した。69件には66 base modelと3 variant、158 alias、114件の正規化したmanufacturer claimがある。13カテゴリ・17メーカーを含み、Basiliskだけで終了していない。

新規カタログの製品はローカル画面で製品名、英字alias、日本語alias、メーカー型番から検索・選択できる。製品識別、仕様確認済み項目、比較可能範囲、推薦可否を別フィールドにし、新規69件はすべて `recommendation_eligible=false`、`public_ui_connected=false` のままにした。既存fixtureに比較プロファイルがない追加製品を選ぶと、似た製品へ置換せず `CLARIFY` で停止する。

実装・生成物・回帰テストはローカルPASS。実ブラウザの直接操作は、Playwrightが未導入であり、新規依存を導入しなかったこと、さらに既存Windowsブラウザの操作基盤が現在URLを安全に特定できず停止したことから未実施である。したがってPC/390pxの実画面、ブラウザ保存→再読込、動的な外部リクエスト0件、スクリーンショットは未確認であり、PASSとは扱わない。

判定は「ローカルのcode/data candidateとしてGO、remote・既存テスター版・本番反映はHOLD」。main、remote、Production、既存テスター配信、参加者データ、Affiliate、外部送信を変更していない。

## 登録内容

| 区分 | 件数 |
|---|---:|
| 製品識別済み | 69 |
| base model | 66 |
| variant | 3 |
| alias | 158 |
| 正規化claim | 114 |
| 仕様確認済み項目を持つ製品 | 32 |
| comparison-ready scopeを持つ製品 | 31 |
| recommendation eligible | 0 |
| public UI connected / live deployed | 0 |
| source registry | 50 |
| ローカル選択肢のdistinct ID（既存fixtureを含む） | 110 |

| カテゴリ | 件数 | カテゴリ | 件数 |
|---|---:|---|---:|
| mouse | 10 | keyboard | 8 |
| mousepad | 9 | controller | 8 |
| cpu | 6 | gpu | 5 |
| storage | 5 | monitor | 5 |
| audio | 5 | mic | 3 |
| capture_card | 3 | network | 1 |
| power | 1 |  |  |

メーカー内訳は Logitech G 22、AMD 10、Razer 6、Kingston 5、Wooting 4、Microsoft Xbox 4、Elgato 4、Sony 3、Sony Interactive Entertainment 3、その他8メーカー各1である。

## 出典と権利境界

`data/catalog-source-registry-v1.js` にcanonical URL、origin、利用目的、対象カテゴリ、確認日、規約確認結果、抽出・再配布・自動化可否、未解決事項を保存した。内訳は、既存project reference 9、original unlocated 1、今回手作業で確認したメーカー公式source 40。`user_provided_verified` は、今回の資料内で個別URLと再利用条件まで独立確認できたsourceがなかったため0件であり、水増ししていない。

公式情報は製品識別と短い正規化spec claimに限定した。ページ本文、表、レビュー文章、画像、測定DBを転載していない。代表例は以下で、全50件はsource registryを正本とする。

- Razer Basilisk line / support: `https://www.razer.com/pc/gaming-mice/basilisk-line`
- Logitech G PRO mice / keyboards / audio / mousepadsの各公式catalogと個別product page
- Wooting products / Wooting 60HE+: `https://wooting.io/products`, `https://wooting.io/wooting-60he`
- Xbox / PlayStation / Nintendo / 8BitDoの公式controller page
- ASUS、LG、Sonyの公式monitor page
- Elgato、AVerMediaの公式capture/mic page
- Kingston、AMD、NVIDIA、TP-Linkの公式product/catalog page

RTINGSはsystematic reuseをHOLD、TFTCentralは原本と再利用条件未確認でHOLD、communityはspecific postと権利確認がないためHOLD。GameGeek、DPQP、JUNUJ/LBR、Geartics、ProSettings、EloShapesは候補発見または参考シグナルだけで、今回のclaim根拠には使っていない。

## 識別・仕様・比較・推薦の分離

- `identity_verified`: 公式ページの製品名または公式catalog掲載を確認した状態。
- `specs_verified_fields`: claim単位で公式sourceとlocatorがある項目だけ。
- `comparison_ready_scopes`: 同一scopeで比較候補になりうる項目。推薦可否ではない。
- `recommendation_eligible`: 追加69件は全件false。identity/specだけでは価値・適合・購入判断を証明しない。
- `public_ui_connected`: 全件false。今回の接続はlocal UIだけ。
- `selection_kind`: 既存fixture 48件は `fixture_profiled`、新規distinct 62件は `catalog_specs_partial` または `catalog_identity_only`。

69件のうち7 IDは既存fixtureと一致するため、UI adapterで重複表示せず、公式aliasを既存fixture選択肢へ合成した。カタログ側の `recommendation_eligible=false` は変更していない。既存fixtureの別プロファイルを新規カタログの公式仕様と混同しない。

### Basiliskの誤同定防止

- Razer Basilisk V3 Pro: `RZ01-04620`、product ID `mouse-razer-basilisk-v3-pro`
- Razer Basilisk V3 Pro 35K: `RZ01-0524`、product ID `mouse-razer-basilisk-v3-pro-35k`

英字 `Basilisk`、日本語 `バジリスク`、型番を別々に検索でき、`RZ01-04620` は35Kを返さない。所有機材のBasilisk V3 Proはnon-35Kへexact matchとし、35Kへの自動置換を明示的に禁止した。

Xbox純正コントローラーの型番なし報告はfamily ambiguous、ROCCAT brand-onlyとLogitech一般向けマウスのmodel不明報告はunresolvedのまま。応募者名、handle、message、参加者JSONはカタログへ含めていない。

## ローカルUI接続

`private/personal-gear.html` に検索欄と追加カテゴリを加え、`catalog-ui-adapter-v1.js` で既存48 fixtureと新規catalogをID重複なしで統合する。検索はNFKC正規化した製品名、メーカー、確認済みalias、型番をブラウザ内だけで処理する。0件時は「一覧にない」を残し、検索語を保存・送信しない。

新規catalog-only製品を選んだ場合は、選択IDだけを既存ローカルstorage schemaのsetupへ保存し、推薦candidateには渡さない。結果は `CLARIFY`、理由codeは `current_product_cataloged_not_recommendation_ready`。外部PostHog、fetch、XHR、WebSocket、sendBeaconを追加していない。

ローカルpreview builderのexplicit allowlistには、実行に必要なsource registry、catalog、fixture、adapterだけを追加した。ledger、docs、tests、facilitator consoleは配信bundleに入らない。これはlocal candidateの生成確認であり、既存テスター配信を更新していない。

## テストとGate

| Gate | 結果 | 証拠・影響 |
|---|---|---|
| source registry validation | PASS | 50 source、ID/URL/origin/category/permissionを検証 |
| catalog validation | PASS | 69 product、114 claim、重複ID/alias、source参照、unsafe textを検証 |
| fixture regression boundary | PASS | 既存fixtureは48件のまま。catalog countと分離 |
| Basilisk identity/search contract | PASS | 英字・かな・両型番、35K分離をunit test |
| import idempotency | PASS | 同一catalog再importで69件を維持 |
| recommendation fail-closed | PASS | catalog-onlyは推薦candidateに入らずCLARIFY |
| local-only/no-send source contract | PASS | private HTMLに外部URLなし、JSにsend pathなし、preview CSP `connect-src 'none'` |
| preview allowlist build | PASS | 追加dependencyが存在し、internal-only fileを除外 |
| 全既存回帰 | PASS | `node --test tests/*.test.js`: 313/313 |
| diff whitespace/syntax | PASS | `git diff --check`、catalog module load、test parse |
| Playwright browser smoke | 未実施 | module未導入。禁止されている新規依存導入は行わず停止 |
| 既存Windowsブラウザ直接操作 | 未実施 | 操作基盤がcurrent URLを安全に特定できず自動停止 |
| PC/390px実画面・keyboard・0件・save/reload | 未確認 | smoke test手順は追加したが、実ブラウザ実行結果ではない |
| browser network log / console / screenshot | 未確認 | source/CSPの裏付けのみ。動的確認・画像は作成していない |
| existing tester / public / production | 未変更 | deploy、push、main、remote操作なし |
| real-user value | 未検証 | catalog規模やlocal testを実利用成果と数えない |

## 残るqueue

次回候補はPC/BTO、RAM、DAC/amp、mouse skates、cable variant、hub、KVM、dock、monitor arm、other category整理。各カテゴリは公式model/SKU、region、互換条件を先に確定し、比較・推薦は別Gateにする。今回の69件を推薦や公開へ自動昇格しない。

## 01〜07レビュー（同一担当の7観点。独立審査ではない）

### 01 ポート

S4 TEST維持。local code/data candidateはGO。remote、既存tester配布、public/productionはHOLD。catalog件数は事業価値の実測ではない。

### 02 スカウト

メーカー公式の現行identity/specを根拠に対象幅を広げたが、検索需要、流入、利用、購入は未検証。市場調査sourceを商品性能や推薦根拠へ昇格していない。

### 03 ビルダー

registry→catalog/claims→adapter→local selectionという生成経路を明示し、69件を実登録した。既存fixtureの6件/カテゴリ制限をcatalog schemaへ持ち込んでいない。実ブラウザGateだけは未確認。

### 04 レッド

反証対象は、35Kへの誤置換、familyをexact SKU扱い、仕様欠落の補完、公式specからの推薦飛躍、alias衝突、重複import、HTML注入、外部送信、既存48件の破壊。unit/static/build testsは反証した。画面崩れ、focus順、storage再読込、動的networkはブラウザ未実施のため反証未完了。

### 05 メジャー

`LOCAL_CODE PASS`、`LOCAL_GENERATED_BUNDLE PASS`、`LOCAL_BROWSER 未確認`、`TESTER/LIVE 未変更・未確認`、`REAL_USER_VALUE 未検証`を分離する。69製品・114 claim・313 testsは成果物量と技術検証であり、需要や満足度ではない。

### 06 ガード

個人名、メール、自由入力、応募message、参加者JSON、secretを登録していない。source reuseはmanual factに限定し、RTINGS/TFTCentral/communityはHOLD。Affiliate、外部analytics、public UIは無効のまま。

### 07 オプス

追加契約・有料実行・新規依存なし。追加費用は確認範囲で0円だが、最大損失0円を保証しない。人間作業時間はこの実行環境から正確に計測できず未計測。使用モデルの表示名も取得できず未確認。

## 復旧案と次の承認点

今回は外部状態を変更していないため、本番rollbackは不要。ローカル候補を破棄する場合はこの専用worktree/branchだけを除外または削除し、起点 `a7338e8` に影響させない。将来remoteへ反映する場合は、この候補commitを新規branchへpushしDraft PRで差分レビューする。既存テスター版または本番へ配る前に、依存追加なしで実行できる承認済みbrowser環境を用意し、PC/390px、keyboard、0件、Basilisk 2 model、選択保存→再読込、console、network 0件、生成bundle hashを再確認する。

main merge、production deploy、既存tester配信更新、Access変更、参加者データ変更、Affiliate、外部送信、課金は別承認が必要であり、今回の候補作成からは承認されていない。
