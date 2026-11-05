# V014.022 — Playwright Ordan journey (2026-11-05)

## Real result

GitHub Actions: https://github.com/gburdesedev/Project-genesis/actions/runs/42072017272
Test code: `tests/v014022_ordan_full_e2e.cjs`
Evidence artifact: https://github.com/gburdesedev/Project-genesis/actions/runs/42072017272/artifacts/13435803613

Chromium 1440x900, native keyboard/mouse; the harness injects only a read-only inspection function into the browser response, never changes quest state. It reached the intro and clicked **Herrero**. The actual game **did not start**: `gameStarted=false`, `tutorialStep=-1`, loader remains visible. The progress reached **15 of 17 required Herrero assets**. The remaining assets returned HTTP **404**, repeatedly:

- `anvilReal086` -> `https://cdn.jsdelivr.net/gh/dustinc555/mygame@main/assets/vendor/quaternius/fantasy_props_megakit/gltf/Anvil_Log.gltf`
- `bellowsReal086` -> `https://cdn.jsdelivr.net/gh/dustinc555/mygame@main/assets/vendor/quaternius/fantasy_props_megakit/gltf/Bellows.gltf`

The referenced `dustinc555/mygame` GitHub repository itself now returns 404; neither filename was found in the archived repo tree or current game main tree. This is a missing external-source dependency, **not evidence of WebGL memory exhaustion**. The loader retries without completing; Ordan's dialogue, crafting, mercenary, and expedition were **not exercised**.

GitHub workflow step succeeded because the diagnostic script preserves a report rather than failing CI when gameplay is blocked. **Do not interpret the green workflow as game success.**

## Existing gameplay configuration in archived V014.022

- `HERRERO_WORKSHOP_SETUP_REQUIRED=false` (intended Q1 repair tutorial is skipped in this build).
- `DIRECT_MERCENARY_AFTER_CRAFTS=true`.
- The full scripted Ordan market bridge exists but has not been playtested end-to-end here.

## Recovery scope (not performed)

Recover **the original** Quaternius CC0 glTF assets, with their required binary buffers and texture dependencies, through an authorized original pack download; store in an isolated public assets repository under versioned paths and point this experiment at those local assets. Verify GLTF buffer and texture paths, GLB conversion if needed, and run this same Playwright walkthrough again. **Never alter main or replace approved visuals without review.**
