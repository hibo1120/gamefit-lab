# Private Personal Gear UI manual smoke checklist

Run from a local static server only. Do not deploy or send data externally.

Test at 1440 px desktop and 390 px mobile:

1. Open `private/personal-gear.html`; confirm `noindex,nofollow,noarchive`, shared-device notice, and “no external transmission”.
2. Complete `現在の機材 → 好みと苦手 → ゲームと入力方法 → 次に見直すもの → 結果について回答 → 候補の見直し`.
3. Confirm an unregistered game/input pair does not reuse another profile.
4. Confirm missing price, unknown compatibility, raw scalar delta, unresolved hard avoid, or source-free game fit returns `DONT_UPGRADE`/clarification.
5. Confirm the same product can be SAFE for one profile and AVOID for another.
6. Submit disagree + reason + desired direction; confirm the explanation identifies preference/rank/confidence changes and an AVOID item cannot be promoted.
7. Export data; confirm only the local schema is present and no generated user identifier exists.
8. Corrupt the saved JSON; confirm recovery export works without overwriting the corrupt value.
9. Initialize, then delete the Personal Gear input; confirm the anonymous validation ledger and another application's localStorage key remain untouched.
10. Check console and requests: no errors and no external requests.
11. Confirm layout has no horizontal overflow at 390 px.

Automation is optional. The repository has a Playwright smoke script but no package manifest or pinned browser dependency; this pack does not add a dependency or CI change.

## Latest manual result

2026-10-10 (tester URL preflight): PASS in the local Codex in-app browser at 1440×1000 and 390×844 using `#T01`. Before consent, the test setup was visible while the main flow and tester-ID field were hidden. The heading “買い替える前に、次の一手を考える”, participant-number/return notice, `noindex,nofollow,noarchive`, local-only storage, hosting-provider request-metadata disclosure, and custom 404 were confirmed. The local facilitator console exposed the one-file import control and stayed within 390 px. There was no horizontal overflow, raw enum, `undefined` / `null`, debug text, console error, console warning, or external send path. The start and file-import buttons were intentionally not pressed in this visual pass because they mutate local participant/ledger state; DONT/rerank export→validated import→facilitator-review boundaries are covered by automated tests. Cloudflare `_headers` and `_redirects` still require verification on the approved real preview.

2026-10-10 (Japanese-native quality pass): PASS in the local Codex in-app browser at 1440×1000 and 390×844. The public diagnosis produced five results without point scores or horizontal overflow. The private flow reached five conservative recommendation cards, showed Japanese labels instead of raw enums, expanded the reason/evidence/compatibility details, and completed feedback plus a five-card rerank. The participant page, facilitator console, and custom 404 had no horizontal overflow; `noindex`, shared-device warning, local-only storage, collapsed retention details, Japanese gate status, and no external resource were confirmed. Browser console errors/warnings were empty. Export, recovery, and destructive Delete actions were not repeated in this visual pass; their scope and failure paths are covered by automated tests. The optional Playwright script could not run because the repository intentionally has no Playwright dependency, so the in-app browser was used without adding packages.
