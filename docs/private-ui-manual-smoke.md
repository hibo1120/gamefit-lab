# Private Personal Gear UI manual smoke checklist

Run from a local static server only. Do not deploy or send data externally.

Test at 1440 px desktop and 390 px mobile:

1. Open `private/personal-gear.html`; confirm `noindex,nofollow,noarchive`, shared-device notice, and “no external transmission”.
2. Complete `My Setup Lite → Gear Taste → Game / Input → Next Upgrade → Upgrade Match → Regret Shield → Why Not? → Re-recommendation`.
3. Confirm an unregistered game/input pair does not reuse another profile.
4. Confirm missing price, unknown compatibility, raw scalar delta, unresolved hard avoid, or source-free game fit returns `DONT_UPGRADE`/clarification.
5. Confirm the same product can be SAFE for one profile and AVOID for another.
6. Submit disagree + reason + desired direction; confirm the explanation identifies preference/rank/confidence changes and an AVOID item cannot be promoted.
7. Export data; confirm only the local schema is present and no generated user identifier exists.
8. Corrupt the saved JSON; confirm recovery export works without overwriting the corrupt value.
9. Reset, then Delete all; confirm another application's localStorage key remains untouched.
10. Check console and requests: no errors and no external requests.
11. Confirm layout has no horizontal overflow at 390 px.

Automation is optional. The repository has a Playwright smoke script but no package manifest or pinned browser dependency; this pack does not add a dependency or CI change.
