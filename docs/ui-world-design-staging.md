# GameFit UI World / Decision Layout staging

Checked: 2026-10-11
Status: staging only; production / Private Validation未接続

## 1. 01ポート結論
採用候補は **Technical Calm**。

GameFitは「ゲーミングEC」でも「計測ラボそのもの」でもない。狙う世界観は dark / premium / competitive だが、calm / decision-first / evidence-aware を優先する。高価格や派手さを購買圧力として使わず、「買う」「買わない」「先に直す」を同格に扱う。

今回のstagingは外部サイトの文言・画像・表・CSS・UIをコピーせず、成功している情報設計の原則だけをGameFit独自のDecision UXへ再構成した。

## 2. 外部事例
### RTINGS
確認: MouseページにはCompare / 3D Compare / Results Table / Review List / Graph等の複数入口と、Tested / Updated / Methodology情報がある。
採用: 比較可能性とEvidenceへ降りられる透明性。
不採用: 初見で多数の評価軸を見せること、Personal Fitを単一総合点へ置換すること。
Source: https://www.rtings.com/mouse/reviews

### EloShapes
確認: 1,600〜1,700超のgaming mouseを対象に形状とtechnical specsの比較を中心にする。
採用: 差を文章だけでなく視覚化。
GameFit独自化: 市場全体比較ではなく「現在機材→候補」のdeltaへ限定。
不採用: 画像、3D/シルエット、UIそのもののコピー。
Source: https://www.eloshapes.com/mouse/compare

### ProSettings
確認: 2026-10-11取得時点のVALORANTページは754 Pro Players / 147 Teamsを表示し、Pro Settings & Gear List、検索、Player/Team導線を持つ。
採用: Pro gearへの需要はreference機能の市場シグナル。
不採用: Pro使用をPersonal Fitやperformance proofとして扱うこと。Pro/Roleを診断入口へ置くこと。
Source: https://prosettings.net/games/valorant/

### Logitech G
確認: Gaming mouse product listにFilters / Sortと並んでHelp Me Chooseがある。
採用: 大量カタログの前に「選ぶ支援」の入口を置く。
Source: https://www.logitechg.com/en-us/shop/c/gaming-mice

### Gaming brand visual language
SteelSeries / Logitech G / Razerを参照。
採用: dark surface、large type、high contrast、limited accent。
不採用: RGB多色、強い購買煽り、full-bleed campaign visualをDecision結果へ持ち込むこと。
Sources:
- https://steelseries.com/gaming-mice
- https://www.logitechg.com/en-us/shop/c/gaming-mice
- https://www.razer.com/pc/gaming-mice

## 3. UX研究からの制約
### Baymard mobile
Baymardは93 ecommerce sitesを対象に613 Mobile Product Page examples、578 Mobile Product List examplesを公開。小画面では重要画像やセクションの見落とし、一覧のoverview困難が問題になるとしている。
GameFit: mobileでdesktop情報量を縮小コピーしない。結論 / 次の1手 / current gear deltaを先にし、Pro / Evidence / secondary comparisonは折りたたむ。
Sources:
- https://baymard.com/mcommerce-usability/benchmark/mobile-page-types/product-page
- https://baymard.com/mcommerce-usability/benchmark/mobile-page-types/product-list

### Horizontal tabs
Baymardの大規模テストではProduct Page main sectionのHorizontal Tabsはpoor performanceで、2026 updateでも29%のsitesが使用。Expanded Sections / Vertically Collapsed Sectionsがbetter-performing。
GameFit: Evidence / Pro / 詳細理由はvertical detailsにする。
Source: https://baymard.com/research-articles/avoid-horizontal-tabs

### Choice complexity
Hick-Hyman lawはchoice reaction timeとalternatives/uncertaintyの関係を示すが、CHI 2020 reviewはHCIへ単純な「少ないほど良い」と適用することを批判し、visual searchやdecision makingの個別検討を推奨する。
GameFit: Roleを削る根拠をHickだけにしない。追加質問は推薦改善価値と迷い/自己分類負荷を実測して決める。
Sources:
- https://pubmed.ncbi.nlm.nih.gov/28434379/
- https://doi.org/10.1145/3313831.3376878

### Accessibility
WCAG 2.2 normal text contrast 4.5:1、large text 3:1。Target Size (Minimum)は24 CSS pxを基準に隣接target spacingも考慮する。
GameFit stagingではmain controlsを48px高とし、colorだけでDecision意味を表現しない。
Sources:
- https://www.w3.org/TR/wcag/
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

## 4. Color system
既存paletteを大きく変えず用途を厳格化:
- background #080b11
- surface #111722
- text #f4f7fb
- muted #a9b4c5
- brand / primary action #7cf6c4
- warning / Fix Before Buy #ffd479
- danger / incompatible or hard avoid only #ff8d9b
- info / confidence reference #9cc2ff

禁止:
- Buy=green / Don't buy=red
- Roleごとの派手な色をmain decisionへ持ち込む
- 複数Primary CTAを同時にMintで強調

## 5. Layout hierarchy
1. What GameFit does
2. Decision
3. Fix Before Buy
4. Current Gear Delta
5. Reason / Evidence
6. Optional Pro reference
7. Comparison only if needed

Roleはinitial flowに出さない。対応gameでもPro reference展開後の任意filter。ranking effectはnone。

## 6. 独自性
- Current Gear Delta Visual
- Buy / Don't Buy parity
- Fix Before Buy before purchase
- Evidence after conclusion
- Pro reference without ranking influence

## 7. 01〜07判定
02スカウト: 比較、Pro gear、Help Me Choose、visual comparisonに継続需要のシグナル。差別化仮説は情報量ではなくPersonal Delta + Don't Buy/Fix First。
03ビルダー: staging HTML/CSSのみ追加。外部image/font/scriptなし。synthetic contentのみ。
04レッド: dark=常に最適ではない、silhouetteが精密shapeと誤認される、Pro authority bias、Mint多用、競合研究による同質化を残存懸念とする。
05メジャー: production採用は理由理解率、次行動理解、unassisted completion、time-to-understand、result abandonment、Pro誤認率で判定。クリック増だけでGOにしない。
06ガード: layoutは原則/パターンのみ参照。外部画像/CSS/文章/表/3D modelをコピーしない。
07オプス: tokens共通化、Roleをmain flowへ入れない、Pro cardはsecondary、real product image必須設計にしない。

## 8. Stage
- Design direction: TEST
- Staging implementation: GO
- Production adoption: HOLD
- Private Validation mix-in: NO-GO
- Role main-flow UI: NO-GO
- Pro reference production: HOLD
