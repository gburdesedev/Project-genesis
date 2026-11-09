# Mercenary equipment integration · V001 (work branch only)

Status: domain module staged. Not mounted into PlayCanvas or shipped.

## Confirmed existing interfaces
- Existing inventory: `inventario_genesis_16x9.js` uses `ctx.getItems()`; actual object `id/uuid`, family, rarity and `channels`.
- Main inventory art and four tabs are separate. The mercenary interaction must **not** show them.
- Existing item sheet is provided by `nav.sheetForItem(ctx,item)`.

## Required host adapters before activation
- `getItems()`: return real fabricated inventory objects, with stable unique IDs (never indexes).
- `getMercenaries()`: return persistent roster, `id`, `name`, `equipment.weapon`, `equipment.shield`.
- `saveMercenaries(next)`: atomic persistence, must signal success/failure (async support not yet implemented).
- Host controls authoritative ownership and all gameplay restrictions.
- Render existing mercenary GLB and attach weapon/shield GLBs to bone anchors; swap only on successful save.
- Slot visual: 1 necklace, 1 ring per hand; other armor generic/locked for demo.

## Comparison in this interaction
- current weapon/shield versus selected compatible artisan creation.
- Render union of present channels, Base first; preserve real recorded order otherwise.
- Actual intensities, absence explicitly; never fabricate values.
- Reuse approved channel ornament artwork from object-creation result. Scroll list independent of header and action buttons. Expand techniques only when data supplies them.
- Art extraction V02 still needs clean transparent, text-free sprites and QA. Never treat flat reference crops as production-ready ORA layers.

## Important blockers
- Actual mercenary data model, persistence, recruitment/exit rules and item ownership API must be inspected and connected before using equip() in live play.
- Current module only provides synchronous persistence adapter; do not wire to asynchronous save without adding transaction/rollback protection.
- Domain state is an integration scaffold, not a finished runtime feature. No published game code changed.
