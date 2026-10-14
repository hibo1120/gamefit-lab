# SEO / LP / CRO Phase 1 measurement plan

Updated: 2026-10-14 (Asia/Tokyo)

## Purpose and boundary

Phase 1 completes the measurable path from a landing page or guide to the existing diagnosis. It does not redesign the full landing page, change recommendation or affiliate ranking, merge `main`, or deploy production. The Personal Gear Intelligence private validation remains a separate environment and data stream.

## Pre-change baseline

PostHog, trailing 30 days, verified on 2026-10-14:

| Event | Event count |
| --- | ---: |
| `diagnosis_page_viewed` | 4 |
| `diagnosis_cta_clicked` | 1 |
| `diagnosis_started` | 3 |
| `diagnosis_completed` | 3 |
| `diagnosis_invalid_input` | 1 |
| `$pageview` | 0 |

These are event counts, not unique people. The sample is too small to estimate a conversion rate or claim improvement. Existing counts occurred on 2026-10-07 and 2026-10-08 UTC.

During preview QA on 2026-10-14 UTC, one `landing_page_viewed` event with `utm_source=qa` reached PostHog before the preview-only recorder was installed. It is test traffic and must be excluded from all post-change baselines. The preview build now replaces the network client with an in-browser allowlisted recorder, so subsequent preview QA does not reach PostHog.

## Minimum event contract

`landing_page_viewed`

- `language`
- `region_version`
- `page_source`
- normalized `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `source` when present

`guide_page_viewed`

- all landing fields
- fixed `content_type=guide`
- normalized `game` only for a game guide
- allowlisted `budget_band` only for a budget guide

Both events are emitted at most once per document load. Automatic pageview, pageleave, autocapture, person profiles for anonymous visitors, and session recording remain disabled. The allowlist removes free text, full URLs, query strings, CPU/GPU text, names, and email addresses. GeoIP enrichment is disabled on every accepted event.

## Funnels to measure after production approval

Guide funnel:

1. `guide_page_viewed`
2. `diagnosis_cta_clicked`
3. `diagnosis_page_viewed`
4. `diagnosis_started`
5. `diagnosis_completed`

Landing funnel:

1. `landing_page_viewed`
2. `diagnosis_cta_clicked`
3. `diagnosis_page_viewed`
4. `diagnosis_started`
5. `diagnosis_completed`

`diagnosis_cta_clicked` is the explicit transition event for the current landing CTA. A direct diagnosis visit can start at `diagnosis_page_viewed`; it must not be forced into a landing conversion denominator.

## Copy decision

The differentiating hero remains: 「今のPC環境に、次の1円をどこへ使うべきか？」

The preview adds one supporting line connecting common search intents to the decision product. It also replaces 「公開テスト準備中」 with the factual state that the simple diagnosis and guides are currently public. This is a preview proposal until production approval.

No completion-time claim is shown. T00's 188 seconds is operator QA, not independent-user evidence. Reconsider a time label only after at least seven independent, completed real-user flows and report the observed median together with sample size; do not convert an operator run into a marketing claim.

## Technical SEO audit

| Area | Finding | Phase 1 action |
| --- | --- | --- |
| Title | Japanese live page has a usable but generic repository/site title | TEST a specific title after a rendered-preview check; no unverified template change now |
| Description | Guide pages and English pages have explicit descriptions; Japanese Markdown landing relies on the hosting template/content | LATER: add through a verified Jekyll layout, not a client-side metadata hack |
| Canonical | Japanese landing, diagnosis, guides, and English routes declare self-canonical URLs | KEEP |
| hreflang | Reciprocal Japanese/English alternates exist for paired routes | KEEP |
| Sitemap | Public diagnosis, guide, and English routes are listed | KEEP |
| Robots | Public routes are allowed and the sitemap is declared | KEEP; it is not access control |
| Internal links | Landing, diagnosis, and guides link to one another; guide CTAs are contextual | KEEP; do not add duplicate CTAs |
| Mobile | Existing 390px smoke coverage applies to diagnosis; preview QA covers landing and a guide | TEST in every preview |
| Broken links | Automated local route checks cover public guides, assets, sitemap, robots, diagnosis, and a known 404 | KEEP |

## Decision ledger

### DO NOW

- Add exactly the two acquisition denominator events.
- Preserve the explicit-event allowlist and disabled automatic capture.
- Keep the hero and add one natural search-intent bridge.
- Correct the public-status wording in preview.
- Save this baseline before collecting post-change observations.

### TEST

- Preview the Japanese landing at desktop and 390px.
- Verify one event per page load, no full URL/query-string leakage, and CTA `sendBeacon` behavior.
- After approved production release, wait for enough independent visits before comparing stage rates by source.

### LATER

- A specific Japanese landing title and description through a verified hosting template.
- A duration label after independent-user completion evidence.
- CRO copy variants only after the denominator is stable.

### NO-GO

- Enabling automatic `$pageview`, pageleave, autocapture, or session recording for this phase.
- Claiming conversion improvement from the current event counts.
- Adding duplicate CTAs, keyword stuffing, affiliate-ranking changes, or mixing Private Tester Preview traffic with public-site analysis.

## QA results

- Node regression: 52/52 passed.
- `git diff --check`: passed.
- Desktop landing preview: hero, search-intent bridge, factual status, one CTA, privacy disclosure, and no horizontal overflow confirmed.
- 390px landing preview: no horizontal overflow; CTA visible; no `undefined`, `null`, or old status text.
- Representative guide: one contextual CTA, correct title/H1, no overflow, and no `undefined`/`null` text.
- 390px diagnosis regression: five ranked results rendered, Affiliate area remained hidden, no horizontal overflow, no console error, and no `undefined`/`null` text.
- Preview headers/content: `noindex`, `nofollow`, `noarchive`, `robots.txt` disallow-all, no-store caching, and a visible preview banner.
- The repository's Playwright smoke scripts could not run because Playwright is not installed in this environment. No dependency was added; the same desktop/390px cases were executed through the available browser automation instead.

## 01–07 integrated review

1. Port: **TEST**. The denominator instrumentation is ready for a production approval decision, but the current event sample cannot support a CRO conclusion.
2. Scout: the strongest existing signal is a real `budget_50000` guide-to-diagnosis path; it supports measuring contextual guides before creating more pages, not a claim of proven demand.
3. Builder: minimum implementation only—two view events, one landing bridge line, factual status copy, a reproducible preview builder, and regression tests. Existing diagnosis and contextual guide CTAs remain intact.
4. Red: the main failure modes were false conversion claims, duplicate page events, PII/query leakage, preview contamination, and breaking private validation. Allowlisting, per-load deduplication, preview isolation, and separate branching address these; tiny-sample bias remains.
5. Measure: freeze the pre-change counts above. Analyze both event counts and unique users only after approved production exposure, exclude `utm_source=qa`, and never force direct diagnosis visits into the landing denominator.
6. Guard: automatic capture, `$pageview`, pageleave, replay, names, email, CPU/GPU free text, full URL, and full query strings remain out. The external preview is public-unlisted—not access-controlled—and therefore contains no private validation data.
7. Ops: no new paid dependency or service. Preview generation is one command; ongoing human work is limited to release approval, a post-release data check, and later copy decisions when sample size is adequate.
