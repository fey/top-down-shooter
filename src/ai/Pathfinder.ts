import Phaser from "phaser";
import { PATH_CELL_SIZE } from "../config";
import type { WallDef } from "../types";
import { Grid, type Vec2 } from "./grid";

/**
 * Тонкая Phaser-обёртка над {@link Grid}. Хранит сетку проходимости и
 * делегирует ей весь поиск пути / LoS, а наружу отдаёт Phaser.Math.Vector2
 * (как ожидают Enemy и debug-оверлей). Вся тестируемая логика — в Grid.
 */
export class Pathfinder {
  private readonly g: Grid;

  constructor(walls: WallDef[], mapW: number, mapH: number, cellSize = PATH_CELL_SIZE) {
    this.g = Grid.fromWalls(walls, mapW, mapH, cellSize);
  }

  findPath(fromX: number, fromY: number, toX: number, toY: number): Phaser.Math.Vector2[] {
    return this.g.findPath(fromX, fromY, toX, toY).map(toVector2);
  }

  /** Returns true if the grid cell at (col, row) is within bounds and walkable. */
  isWalkable(col: number, row: number): boolean {
    return this.g.isWalkable(col, row);
  }

  /** Converts a world-space position to its grid cell coordinates. */
  worldToGridCell(x: number, y: number): { col: number; row: number } {
    return this.g.worldToCell(x, y);
  }

  /** Returns true if the world-space point (x, y) lies in a walkable grid cell. */
  isWalkableAt(x: number, y: number): boolean {
    return this.g.isWalkableAt(x, y);
  }

  /** World-space centre of a random walkable cell (for AI roaming/patrol). */
  randomWalkableWorld(): Phaser.Math.Vector2 | null {
    const p = this.g.randomWalkableWorld();
    return p ? toVector2(p) : null;
  }

  /** World-space centre of the nearest walkable cell to (x, y). */
  nearestWalkableWorld(x: number, y: number): Phaser.Math.Vector2 | null {
    const p = this.g.nearestWalkableWorld(x, y);
    return p ? toVector2(p) : null;
  }
}

function toVector2(p: Vec2): Phaser.Math.Vector2 {
  return new Phaser.Math.Vector2(p.x, p.y);
}
