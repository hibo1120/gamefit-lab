# Cloudflare Pages private preview deployment

Status: approved for the 10-person private validation preflight only.

## Build

Use:

- Branch: `feature/personal-gear-intelligence-v1`
- Build command: `node scripts/build-private-preview.js`
- Build output directory: `preview-dist`
- Root directory: repository root

The build script creates a deployment package from an explicit allowlist. Do not set the Pages build output directory to the repository root.

The preview bundle intentionally excludes the facilitator console, docs, tests, scripts, internal reports, exports, and other non-tester files. The tester HTML is also generated without the local facilitator-only control block.

## Pages deployment controls

For the dedicated test project:

- Free plan only.
- Disable automatic production branch deployments.
- Preview deployments: Custom branches.
- Include only `feature/personal-gear-intelligence-v1`.
- Do not attach a custom production domain.
- Do not enable Analytics, Functions, Workers, or Affiliate functionality.
- Distribute only the unique deployment-hash URL, not a branch alias.

## T00 safety gate

Before T00, verify on the real deployment URL:

- HTTPS.
- `X-Robots-Tag: noindex, nofollow, noarchive`.
- `Cache-Control: no-store`.
- CSP contains `connect-src 'none'` and `frame-ancestors 'none'`.
- No tester input appears in network requests.
- No fetch/XHR/WebSocket/sendBeacon/analytics calls.
- URL fragment `#T00` is not sent in the HTTP request.
- `/private/validation-console.html` and `/private/validation-console` are unavailable.
- Known internal paths such as `/docs/`, `/tests/`, `/scripts/`, `/.git/`, and `/.env` are unavailable.
- Main GitHub Pages is unchanged.

Only after this gate passes may T00 run. T00 remains internal QA and never counts toward the ten real testers.

## Build identity

Current cohort build: `pgi-n10-preflight-v3`.

Any participant-facing code change after T01 starts requires a new build ID and a new cohort. Do not pool pre-change and post-change results.
