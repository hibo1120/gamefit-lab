# GameFit 独立10人 Private Validation Runbook

Status: tester-URL preflight implementation complete; real participants 0/10

Build: `pgi-n10-preflight-v2`
Scope: private, moderated safety/usability test using either a facilitator-controlled local browser or an approved unlisted preview URL. No purchase, payment, public recruitment, monetization, or expansion beyond ten.

## Purpose and interpretation

This cohort tests whether selected independent people can use the flow without substantive help, understand the reason, and avoid predefined severe failures. It does not establish product-market fit, general safety, recommendation accuracy across the catalog, competitive superiority, willingness to pay, or revenue.

The Gate can return only:

- `PASS`: enough evidence to stop and ask a human whether a separately approved 30-person plan should be prepared.
- `INCONCLUSIVE`: incomplete, mixed-build, assisted, missing, biased, or insufficiently covered evidence. It is not a failure to be hidden by replacing participants.
- `STOP`: one confirmed safety, Affiliate, or privacy incident. Stop immediately; do not finish the other sessions.

## Delivery method

Before an external preview is approved, use a facilitator-controlled computer and a dedicated browser profile. Open only:

- Tester UI: `private/personal-gear.html`
- Facilitator console in a separate tab: `private/validation-console.html`

Do not ask a tester to install Node, clone a repository, or run terminal commands. That would select for technical users. A screen-share session is acceptable only when the facilitator controls the local browser and the tester gives consent; do not record audio, video, screen, chat, IP, or meeting metadata in the result file.

After a separate preview-deployment approval, distribute one pseudonymous hash-fragment slot per tester:

`https://<deployment-hash>.<preview-project>.pages.dev/private/personal-gear.html#T01`

through `#T10`. A URL fragment is read only in the browser and is not sent as part of the HTTP request. Do not put a name, email address, social handle, or contact identifier in the URL. Use the deployment-hash URL rather than the branch alias. The page remains unlinked, has HTML and HTTP `noindex`, sends no input or analytics, and stores answers only in localStorage. The hosting provider can still process ordinary request metadata such as IP address; the page discloses that boundary. The tester result is not strictly anonymous: the fixed slot and the one-to-one return channel can be associated during operations, so call it a participant-number/pseudonymous record.

The preview redirects `/private/validation-console.html` and its extensionless route to the custom 404. Run the facilitator console only from a local trusted checkout; never give its URL to a participant. The console imports one participant JSON at a time, rejects another build, reused slot, non-contiguous sequence, facilitator-only event, unknown metadata key, or sensitive free-form field, and then requires the facilitator review before the next import. These are structural checks, not a cryptographic signature; an exported file is not tamper-proof.

`noindex`, an unlinked page, and an opaque URL are not access control. If link leakage or source-code visibility is unacceptable, stop and use Cloudflare Access or a facilitator-controlled session instead. Access introduces login and identity processing and must receive a separate privacy/operations review.

Before each tester, the Start action asks to delete the prior Personal Gear profile while retaining the separate participant-number validation ledger. Never substitute a near-match for an unlisted current product; select “該当製品がない” and keep the resulting `CLARIFY` coverage gap.

## Participant allocation

Use one person per fixed slot `T01`–`T10`. Do not replace an incomplete or dissatisfied participant to improve the denominator.

Target mix, with overlap allowed:

| Dimension | Target |
|---|---:|
| Beginner / intermediate / enthusiast | 3 / 4 / 3 |
| Actively deciding | at least 4 |
| Current-gear dissatisfaction | at least 3 |
| No-purchase-may-be-best | at least 3 |
| DONT_UPGRADE paths | at least 3 |
| Limited non-DONT paths | at least 3 |
| Disagree → rerank paths | at least 2 |
| Controller users | at least 2 |
| Non-mouse categories | at least 3 |

Recruit privately from real or potential users who did not build GameFit and do not know the expected answer. Keep scheduling/contact information outside GameFit and delete it after scheduling. Never add names, email addresses, social handles, phone numbers, free text, exact address, IP, device IDs, or serial numbers to the validation JSON.

## Neutral invitation draft

> ゲーミング機材の買い替え判断ツールについて、非公開の使いやすさ・安全性テストを行っています。購入や費用負担は不要で、所要は15〜25分です。氏名・メールは結果に保存せず、参加者番号と選択式回答だけを記録します。途中で中止・削除を依頼できます。公開募集ではなく10人で終了します。参加できる場合は、担当者の端末、画面共有、または案内する非公開テストURLから自力操作をお願いします。

Do not promise benefit, a correct recommendation, discounts, payment, or access to a future public product.

## Facilitator script

Before handoff, say only:

> これは買い替え判断の使いやすさと安全性のテストです。購入は不要で、正解はありません。画面の説明だけで自力で進めてください。私は望ましい結論や操作方法を教えません。途中で止められ、記録の削除も依頼できます。

Do not mention expected DONT rates, known failures, Gate thresholds, Regret Shield logic, the likely best candidate, or the source of blind-comparison answers.

If the tester asks where to click, first reply: “今見えている情報だけで、次に何をすると思いますか？” If they still cannot proceed, give navigation-only help and record `navigation_only`. Never explain what conclusion to choose. Substantive help is recorded as `substantive` and the session cannot count toward the seven unassisted completions.

## Session procedure

1. Open the facilitator console and confirm the prior Gate is not `STOP`.
2. In the Tester UI select the next fixed ID, expertise, and applicable purchase contexts.
3. Confirm independence and informed consent. Start; the UI clears only prior Personal Gear data.
4. Hand control to the tester. The intended flow is My Setup → Gear Taste → Game/Input → Next Upgrade → Decision → Regret Shield → optional Why Not → optional rerank.
5. Do not force a disliked attribute. “特になし” is valid.
6. Do not replace an unlisted product with a similar SKU. `CLARIFY` is the expected safe coverage outcome.
7. The tester submits the coded self-review and returns the device.
8. Ask the tester to explain the recommendation reason in their own words. Do not store the words. Mark only whether the explanation is materially correct.
9. In the facilitator console, record assistance and each safety flag separately. Finalize.
10. Local/facilitated mode: export the participant-number ledger after each finalized tester to an encrypted local project folder; do not email or upload it. URL mode: the tester exports only their slot record and returns it through the one-to-one channel approved with the preview. Keep scheduling/contact data outside the result folder. Import the file into the local facilitator console, confirm the build and slot, ask the participant to explain the result in their own words without storing the words, and complete the facilitator review. Ask the participant to delete their downloaded copy after receipt; remove the channel attachment when the service permits and delete the local result within 30 days after the cohort ends.

Before inviting T01, run a T00 round trip on the approved preview: complete a DONT or disagree→rerank path, export, return, import, reject a duplicate/wrong-build copy, finalize a facilitator review, and confirm the Gate remains `INCONCLUSIVE`. T00 is internal QA and must never count toward the ten.

## Immediate STOP

Record and stop at the first confirmed instance of:

- dangerous recommendation;
- hard avoid violation;
- cross-game or cross-input contamination;
- clearly incompatible recommendation;
- ranking change caused by Affiliate status or commission;
- privacy leak or collection outside the consent notice.

The store locks the cohort after STOP. Preserve the export, identify affected code and cases, fix and regression-test, then start a new build/cohort. Never pool pre-fix and post-fix results.

## Required participant record

The local ledger records only a fixed participant number and structured codes:

- independent participant profile and consent;
- flow milestones and elapsed time;
- category, game, input, build, decision, top candidate ID;
- Regret Shield risk/confidence;
- agree/disagree/unsure;
- disagree reason codes and desired-direction codes;
- rerank attempt and success;
- DONT_UPGRADE acceptance;
- self-reported intended judgment and UX/privacy issue codes;
- facilitator teach-back result, assistance level, and individual STOP flags.

The ledger excludes free text and contact data. Browser-held validation records are pruned after 30 days the next time the facilitator console loads. Exported JSON files are not automatically deleted: the facilitator must store them only in the approved test location and delete them within 30 days after the 10-person test ends. The participant-facing `入力内容を削除` control removes only the Personal Gear profile and decision history; the facilitator console has a separate validation-ledger delete control.

## Blind comparison (optional secondary test)

Use at most six of the ten people and one of the six counterbalanced orders per person. This does not affect the safety Gate.

1. Freeze one redacted structured profile, candidate set, Evidence packet, and source budget.
2. Produce exactly one response each from GameFit, a frozen simple heuristic, and a generic AI.
3. For generic AI use a new memory-off session, fixed model/date/prompt/web state, and the first valid answer. Do not send real tester data. Store only its hash and provenance outside the tester packet.
4. Normalize each answer to `keep`, `buy`, `avoid`, `clarify`, or `compare_more`; remove method names and distinctive GameFit labels; keep length and sections comparable.
5. Give the tester only A/B/C. Score each independently from 1–5 for agreement, clarity, personal fit, and avoiding unnecessary purchases; then force-rank A/B/C.
6. Lock ratings before revealing the operator key. Keep keys separate from participant packets.

Report paired first-place counts and criterion medians only. Do not report statistical superiority, demand, safety, or a win rate from six people.

## Gate calculation

`PASS` requires all of the following:

- ten fixed independent observed participant profiles and ten facilitator reviews;
- one fixed build ID for the entire cohort;
- at least seven ordered full flows completed without assistance;
- at least seven facilitator-coded correct reason explanations;
- zero confirmed dangerous recommendation, privacy incident, game/input contamination, hard-avoid violation, major compatibility violation, or Affiliate rank influence.

Median completion time, Acceptance, Correction, Re-ranking Success, DONT acceptance, coverage-gap rate, category mix, and support time are reference metrics only for this cohort.

`INCONCLUSIVE` includes fewer than ten final reviews, missing required fields, mixed builds, insufficient coverage, unknown independence, or fewer than seven unassisted/understood sessions without a severe incident.

## Four-role review after each tester

- Scout: identify whether the observation is a real decision-support signal or merely completion/agreeableness.
- Builder: record the smallest reproducible UX or logic issue; do not edit during an active build cohort.
- Red: test facilitator influence, social desirability, selection bias, contamination, missing-event and replacement bias.
- Port: choose Continue, Freeze for analysis, or STOP. Minor fixes are queued; any code change starts a new cohort version.

## End of ten

Stop. Do not contact an eleventh participant or begin 30-person testing. Produce the requested participant composition, observed metrics, incidents, blind result, four-role judgments, Gate result, and a separate human decision on whether a 30-person plan should be authorized.
