# Project Genesis release rules

Every published user-visible implementation must have a new numeric version, visible in the game and recorded in the release commit. Keep the HTML title, HUD version, build metadata and changed resource cache keys aligned. The mobile memory/landscape correction is v0.11.001; increment the final component for the next release.

Before editing, read the latest main branch and check deployment status. Avoid overwriting concurrent changes; use a ref update with the expected main SHA. Keep this PlayCanvas project separate from Unreal and the Blender asset-production repository.

Menu layout must preserve the approved original artwork composition and minigame positions at every size. Scale the complete artboard uniformly; do not stack, reorder, hide frames or replace the art with a new compact layout. v0.11.002 restores that composition.
