# Game Context v2 staging

Checked: 2026-10-10
Status: staging only; not imported by production or Private Tester UI

## 1. 結論

- Game Context staging: **TEST** — `Game + Input Method`を推薦の必須軸として維持し、現時点のimport graphとreference DTOではRoleをreference-onlyへ隔離した。
- Role Reference: **HOLD** — 表示価値、理解度、再訪意向への増分は未実証。推薦rankingへの接続は禁止を維持する。
- Private Validation: 現行Tester build、build ID、HTML/JS/CSS、`data/game-dna.js`、`personal-gear-engine.js`、`private-validation-store.js`は変更していない。

## 2. 設計境界

推薦本体は引き続き `Game + Input Method + Personal Gear Intelligence` だけを使う。Roleは任意のPro参考情報であり、Product ranking、Upgrade Match、Game Fit、Evidence Grade、Regret Shield、Purchase Priority、DONT_UPGRADE、Confidence、Affiliate rankingへ一切入力しない。

今回追加しないもの：Role必須質問、Weapon、Combat/Player/Sensitivity Style、aggressive/defensive、role-based recommendation、自動scraper、production/private UI import、Affiliate連携。

## 3. ②スカウト：確認済み事実 / シグナル / 仮説

### 確認済み事実

| Game | 公式Role/Class | Pro Roleの扱い | reliability |
|---|---|---|---|
| VALORANT | Duelist / Initiator / Controller / Sentinel | 固定肩書にせず、直近Agent使用からderived recent role候補のみ | Taxonomy A、Pro推定D |
| Apex Legends | Assault / Controller / Recon / Skirmisher / Support | Legend classでありplayer固定Roleへ変換しない | Class A、Pro固定Roleなし |
| Overwatch | core roleはTank / Damage / Support | v1はcore roleのみ。2026年に確認できるsub-roleは除外 | Core taxonomy A、Hero mappingはvolatile |
| CS2 | GameFitが正本にできる公式固定player-role taxonomyを確認できず | disabled | 方針A、非公式roleは未採用 |
| Fortnite | GameFitが正本にできる公式固定player-role taxonomyを確認できず | disabled | 方針A、チーム慣行は未採用 |

一次情報：

- VALORANT: [公式Role紹介](https://playvalorant.com/en-us/console/)、[Jett](https://playvalorant.com/en-us/agents/jett/)、[Sova](https://playvalorant.com/en-us/agents/sova/)、[Omen](https://playvalorant.com/en-us/agents/omen/)、[Killjoy](https://playvalorant.com/en-us/agents/killjoy/)
- Apex Legends: [公式Characters hub](https://www.ea.com/games/apex-legends/apex-legends/game-objects/characters-hub)
- Overwatch: [公式Heroes](https://overwatch.blizzard.com/en-us/heroes/)
- CS2: [公式サイト](https://www.counter-strike.net/cs2)
- Fortnite: [公式Competitive rules](https://www.fortnite.com/competitive/rules-guidelines/rules-library/fortnite-competitive-master-rules)

「CS2/Fortniteに世界のどこにも公式Roleがない」という絶対命題ではない。2026-10-10時点でGameFitが安定した正本として採用できるpublisher定義を確認できないため、fail-closedでdisabledとした。

### 市場 / データシグナル

- VLR系の公開画面・非公式ライブラリには30/60/90日Agent利用を扱うシグナルがある。
- ProSettingsはPlayer/Team/Gearを扱う公開データベースで、Role sourceとは別のGear observation候補になる。
- ただし「閲覧できる」と「自動取得・再配布できる」は別。VLR規約は自動data mining/scrapingと体系的なデータベース化を禁止しているため、自動取得はNO-GO。

### 仮説

- 「最近同じRoleのAgentを多く使ったPro」という表示が、診断結果の理解・信頼・再訪意向を改善する可能性はある。
- Pro gearとRoleの相関がPersonal Fitや性能差を示す証拠はない。

## 4. ③ビルダー：実装

- `data/game-context-v2.staging.js`
  - GameProfile contract
  - 5 game policies
  - VALORANT 4 Role日本語label
  - publisher確認済み4 AgentだけのAgent→Role mapping
  - exact-key / recursive forbidden-field / source-policy validation
  - game-namespaced `role_key`（表示用`role_id`は指定どおり維持）
  - unknown fail-closed validation
- `data/pro-role-reference.staging.js`
  - Player identity / recent role / gear observationの分離
  - source-explicit join metadata
  - VALORANT 90日derived role仮説
  - adoption-only signal
  - ranking/fit/performance/Affiliate禁止fieldの再帰検査
  - source registry default-deny、strict date、finite integer、dedupe、stale拒否
  - caller上書き不可の固定derivation policyと、module発行済みRole objectだけを受理する境界
  - 発行済みRole object / distributionのdeep freeze（発行後改変を拒否）
  - claim別source scope（match usage / Agent taxonomy / Gear usage / adoption / team）
  - source上のsubject IDとcanonical playerを結ぶ、レビュー済みidentity link
  - match単位observationからround数・unique match数・期間を導出（独立した自己申告集計を廃止）
  - source subject→canonical playerの一意resolution ledgerと、catalog登録済みexact product/variant/category照合
  - player/match/observation IDはlowercase・英数字segment必須のcanonical形式を強制し、空白・大文字小文字差分・空segmentによる重複回避を拒否
  - exact product variant / game / input / sponsorship状態のGear observation
- `tests/game-context-v2-staging.test.js`
  - isolation、taxonomy、derived role、stale、join、bundle exclusionの回帰

90日derivationの閾値は事後的な都合合わせを避けるため、結果を見る前にversioned policyとfingerprintで固定した。ただし統計的に妥当性を証明した値ではなく、実Outcomeで校正していないため、返せるconfidenceはLowまで。source-backed集計300 rounds未満、8 unique match ID未満、期間14日未満、dominant share 60%未満、2位との差15 point未満、unknown 10%超、120日超のstaleはそれぞれunknown/mixedに落とす。tournament mode、patch、source registryも必須。round単位の一意性までは機械証明できないため手動監査対象であり、数値自体は採用基準ではなくheld-out二重レビューで検証すべき仮説である。

## 5. Ranking isolation

- Roleなしの既存recommendation inputが従来どおり成立。
- 3つの既存推薦pairすべてで、同じinputへ `role_id`、Role reference、Pro adoption、Affiliate値を追加しても出力全体がdeep-equal。
- 全GameProfile、Role observation、adoption referenceの `ranking_effect` は `none` のみ。
- reference-only DTOはnested `game_fitness` / `performance_traits` / `evidence_grade`等、engineが読むfieldを再帰的に拒否する。
- staging file/symbolはPrivate Tester HTML/JSと、そのHTMLが読み込む全scriptに参照されていない。並行して先行したPrivate Preview強化コミットのbuild ID `pgi-n10-preflight-v3`を変更していない。

## 6. ④レッド反証

| 攻撃 | 結果 / 防御 |
|---|---|
| Roleを聞くほどFitが上がる | 根拠なし。main diagnosisへ質問追加禁止 |
| Pro使用=性能 / 本人Fit | adoption-only。performance/personal-fit flagはfalse |
| sponsorship / Affiliate bias | 報酬fieldをreferenceから排除し、engine結果不変を検査 |
| flexを固定Role化 | dominanceとlead不足は`mixed_flex` |
| sample不足 | `unknown` |
| 未確認Agent | 全Agentを推測せず`unknown` |
| Apex classをplayer role化 | `legend_class_reference_only` + fixed role禁止 |
| CS2/Fortnite非公式taxonomy | disabled |
| source join誤認 | Role/Gearを別recordのまま保持し、claim scopeとjoin metadataを必須化 |
| player名衝突 | namespaced `player_id`に加え、source ID・source上のplayer ID・確認者を持つ発行済みidentity linkが一致しなければcardを生成しない。同一source subjectの別canonical IDへの二重割当もledgerで拒否 |
| 閾値の呼出側上書き | policy引数を廃止し、versioned定数以外を使用しない |
| 手作りRole DTO | moduleが発行したobjectだけを受理し、300 rounds / 14日 / dominance / official role / distribution整合も再検証 |
| 300 roundsと8 matchの無関係入力 | 1 match 1 observationの行から両方を導出し、canonical IDで重複を拒否。1 match 60 rounds超またはsource match total未確認はmanual reviewへ落とす |
| 無関係URLのEvidence流用 | taxonomy、match usage、Gear、adoption、teamのclaim scopeが一致しないsourceを拒否 |
| invalid/future/duplicate data | strict calendar、future、Infinity/小数/文字列rounds、重複Agent/observation/matchを拒否 |
| stale roster/role/gear/adoption | UTC実行日を基準にperiod endとchecked dateを判定。stale team/gearはcard生成拒否 |
| unknown / uncleared source | registry default-deny。`manual_terms_review`はcard生成不可 |
| sponsorship announcement | 実使用Evidenceとして拒否。commercial relationshipは必須 |
| adoption schemaの見かけ精度 | numerator/denominator、sampling frame、coverage、missingness、97日以内の期間、catalog一致したexact product/variant/category、120日以内のfreshnessを必須化 |
| ranking contamination | engine output deep-equal test |

残る反証：同じAIロジックが閾値を作りテストしているself-validation、実データTOS許諾なし、実ユーザー価値なし。したがってRole ReferenceはHOLD。

独立レッド最終再監査では、policy上書き、手作りDTO、claim scope取り違え、発行後改変、identity collision、match/sample分離、ID空白・case・空segment、stale adoption、catalog不一致、engine field混入を順次再現・修正し、P0/P1は0件となった。これはstaging契約のGOであり、UI採用やranking接続のGOではない。

## 7. ⑤メジャー

Role sectionあり/なしを将来participant単位でランダム化し、割当を永続化する。explicit exposure event、ITT、欠測、cross-over、game/input/expertise層を記録し、両群の推薦payload hashは100%同一に固定する。

- primary: result comprehension、実再訪（計測可能になった段階）
- secondary: stated return intent、recommendation trust、reference section engagement
- guardrail: Role section表示後のresult abandonment、結果理解までの時間、誤って「Pro使用=おすすめ」と理解した割合
- data-quality check: diagnosis completionはRole section表示前に確定するため、因果的な摩擦指標には使わない。randomization imbalanceの確認だけに使う。
- failure: result abandonment増加、理解時間悪化、または誤解率増加。クリック増だけでは採用しない。

30人規模は計測器と文言のpilotに留め、採用や「害なし」の判断には使わない。UI採用前にbaseline、MDE、非劣性幅、検出力、停止規則、複数指標、途中覗き見方針を事前登録する。最低harm gateは、DONT/AVOIDを覆す選択0件、Pro製品への購入意向upliftの95%上限+5pp未満、result/feedback completion差の95%下限-5pp超、time-to-next-action p75比の95%上限1.20未満。「Pro使用=高性能/自分向け」の誤認率を片側95%上限5%未満とするには、0件でも最低59 exposureが必要。現在のPrivate 10-person Validationへ混ぜない。

## 8. ⑥ガード

- 自動scrapingは開始しない。
- Source Registryはpublisher/owner、terms URL、取得方法、許可scope、加工・再配布・帰属状態、商業関係、確認者、確認日、失効日を必須化。不明・期限切れはUTC実行日でdefault-denyする。callerの`as_of`は未来日だけ拒否し、判定時計には使わないため、古い日付でfreshnessを回避できず日付変更でも有効観測を即時無効化しない。
- VLR: [Terms](https://www.vlr.gg/terms)上、自動取得・体系的収集を禁止しているため、書面許可または許諾APIなしではNO-GO。
- Riot: [Developer policies](https://developer.riotgames.com/policies/general)と[Legal](https://www.riotgames.com/en/legal)をproduction利用前に再確認。publisherページからは短い事実、URL、確認日だけを保持。
- ProSettings: [About](https://prosettings.net/about/)でデータ性は確認できるが、GameFitによる自動取得・再配布許諾は確認していない。manual_terms_reviewのまま。
- EAは[User Agreement](https://www.ea.com/legal/user-agreement)でrobot/scrapingを制限するため、公式taxonomyも小規模な手動fact確認に限定。
- 表、本文、画像、動画、サムネイル、プロフィール写真、ロゴを保存・転載しない。
- Role sourceとGear sourceを別source IDで保持し、複数sourceを1件に見せない。
- `test:` namespaceはmodule内のimmutable synthetic registryにある3 sourceだけを許可する。callerの自己申告sourceは拒否し、実データcardには使わない。
- staging JSは現状UI未importだが、repo root全体を静的配信するとURL直打ちで取得できる。実人物データ投入前にpublish manifestから除外し、Previewで404を確認することをpromotion blockerとする。現ファイルに実人物観測はない。

## 9. ⑦オプス

想定分類：

- A: schema validation、stale判定、unknown/flex判定、ranking isolation test
- B: 公式taxonomy差分検知後の人間承認
- C: 小規模なrole/gear observation確認、player identity disambiguation
- D: 規約・商用利用許諾の法務判断

公式taxonomyだけのstaging継続上限は月2時間。Pro referenceを5〜10人へ限定したpilotを始める場合は月8時間を上限とし、2か月連続で超えたらvolatile dataを削減またはHOLDする。四半期taxonomy確認、月次sample監査、例外処理を時間計測する。週次roster/gear全件手更新が必要な設計はNO-GO。checked date切れは非表示にする。

初期の権利・source allowlist整備は12〜24時間の一時工数として月次運用枠と分けて記録する。roster/team/meta/gear全件追跡へ広げて月16〜30時間になる案は採用しない。

## 10. 改善案と最終判断

### 今すぐ

- stagingのまま回帰テストに保持。
- Private Tester buildへ接続しない。
- 実データは追加せず、source permission/terms review待ち。
- publish対象からstaging assetを除外する仕組みができるまで、実人物recordを追加しない。

### 次フェーズ

- Private 10-person Validationを完了後、別cohortでRole section A/Bの事前登録計画を作る。
- 許諾済みsourceまたは手動少量Evidenceだけで5〜10人のreference cardを検証。
- 誤解率、理解度、診断摩擦、更新工数を測る。

### 保留

- 自動scraper、全Pro catalog、CS2/Fortnite Role、Apex固定Pro Role、Role推薦利用。

最終判断：Game Context stagingは**TEST**、Role ReferenceのUI採用は**HOLD**。Roleがなくても推薦は完全に成立し、Roleを加えてもrankingは変わらない。この境界は実測で価値が証明されるまで崩さない。

①ポート最終判定はstaging commit **GO / TEST**、⑥ガードはstaging限定GO、⑦オプスは上記工数上限つきGO。Private Testerへの接続、実人物データ投入、Role UI、推薦ranking利用はHOLDまたはNO-GOを維持する。

## 11. Tests

- command: `node --test tests/*.test.js`
- existing regression: 221
- new staging tests: 25
- expected total after preserving the remote preview hardening commit: 248 pass / 0 fail
- `git diff --check`: pass
- production/private browser smoke: 対象外。UIとTester bundleを変更していないため、新しい画面は存在しない。
