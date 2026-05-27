# Pathfinding Improvements Design

**Date:** 2026-05-28  
**Status:** Implemented  
**Commit:** feat: smooth pathfinding via string pulling + wall separation force

---

## Problem

After A* computes a path through the grid, enemies would follow every cell-centre waypoint even when a more direct route exists. This produced:

1. **Unnatural zigzag movement** — enemies shuffled diagonally through open space instead of moving in straight lines.
2. **Wall-sticking** — enemies travelling near walls would hug them due to waypoint geometry, especially around corners.

---

## Solution 1: String Pulling (`src/ai/Pathfinder.ts`)

### What it does

After A* produces a list of cell-centre waypoints, `smoothPath()` removes redundant intermediate points by "pulling the string" taut between an anchor and subsequent waypoints.

### Algorithm

```
smoothPath(waypoints):
  result = [waypoints[0]]
  anchor = 0

  for i = 2 to waypoints.length - 1:
    if !gridLoS(waypoints[anchor], waypoints[i]):
      result.push(waypoints[i-1])   // last visible point becomes a bend
      anchor = i-1

  result.push(waypoints[last])
  return result
```

The key insight: if the anchor has line-of-sight to waypoint `i`, we can skip `i-1`. When LoS breaks, `i-1` is the last safe shortcut, so it becomes the new anchor.

### LoS check: DDA (Digital Differential Analysis)

`gridLoS(ax, ay, bx, by)` walks grid cells along the line from world point A to B using the DDA algorithm. If any intermediate cell is blocked in the precomputed grid, LoS is false.

DDA is preferred over Bresenham here because it naturally handles both horizontal-dominant and vertical-dominant lines without special cases.

The check operates on the **precomputed obstacle grid** (not the physics world), so it's O(max(Δcol, Δrow)) and safe to call per-frame.

### Control flag

`PATH_SMOOTH_ENABLED = true` in `config.ts`. Set to `false` to revert to raw A* waypoints for debugging.

---

## Solution 2: Wall Separation Force (`src/entities/Enemy.ts`)

### What it does

`getWallSeparationForce()` samples 8 directions (45° apart) at distance `PATH_CELL_SIZE` (64 px) from the enemy. For each sample that lands in a blocked grid cell, it accumulates a repulsion vector pointing from the cell centre toward the enemy, weighted by `1/distance`.

### Why 1/distance (not 1/distance²)

Squared distance makes the force drop off too quickly — enemies only feel repulsion when already touching the wall, which is too late. Linear falloff gives a gentler, wider-radius push that guides them away before they get close.

### Integration into movement

In `moveAlongPath()`, the wall force is **added** to the waypoint-directed velocity:

```typescript
const angle = Phaser.Math.Angle.Between(this.x, this.y, current.x, current.y);
const wallForce = this.getWallSeparationForce();
this.setVelocity(
  Math.cos(angle) * speed + wallForce.x,
  Math.sin(angle) * speed + wallForce.y,
);
```

The force is **not applied** in the "escape from blocked cell" early-return branch, because that branch already handles full override velocity for stuck-in-wall recovery.

### Tuning

`WALL_SEPARATION_STRENGTH = 80` in `config.ts`. Higher values push enemies further from walls at the cost of slightly less precise pathfollowing in tight corridors.

---

## New Public API on `Pathfinder`

| Method | Purpose |
|--------|---------|
| `isWalkable(col, row): boolean` | Cell-coordinate walkability check (bounds-safe) |
| `worldToGridCell(x, y): {col, row}` | World → grid cell conversion, used by Enemy for sampling |

---

## Files Changed

- `src/config.ts` — added `PATH_SMOOTH_ENABLED`, `WALL_SEPARATION_STRENGTH`
- `src/ai/Pathfinder.ts` — added `smoothPath()`, `gridLoS()`, `isWalkable()`, `worldToGridCell()`; wired `smoothPath` into `findPath()`
- `src/entities/Enemy.ts` — added `getWallSeparationForce()`; updated `moveAlongPath()` to apply it

---

## Trade-offs & Known Limitations

- **String pulling skips the start cell check**: `gridLoS` skips checking the cell containing the enemy's current position, since enemies are often at cell boundaries and the cell may be tagged as inflated-wall even when the enemy is physically clear. This matches the existing `isWalkableAt` usage in the escape branch.
- **Wall force vs. narrow corridors**: In very tight passages (one-cell-wide), the repulsion from both sides will partially cancel. This is intentional — the forces balance and the enemy moves straight through.
- **Performance**: `getWallSeparationForce()` calls `isWalkable()` 8× per frame per enemy. This is O(1) per call and negligible at typical enemy counts (< 20).
