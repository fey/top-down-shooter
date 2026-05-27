/**
 * Shared geometry types used across physics, LoS, and pathfinding.
 */

/** Rectangle wall: (x, y) is the centre, w/h are full pixel dimensions. */
export interface WallDef {
  x: number;
  y: number;
  w: number;
  h: number;
}
