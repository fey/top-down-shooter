import Phaser from "phaser";
import { PATH_CELL_SIZE } from "../config";

interface WallDef {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Cell {
  col: number;
  row: number;
}

interface AStarNode {
  col: number;
  row: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

export class Pathfinder {
  private readonly grid: boolean[][];
  private readonly cols: number;
  private readonly rows: number;
  private readonly cellSize: number;

  constructor(walls: WallDef[], mapW: number, mapH: number, cellSize = PATH_CELL_SIZE) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(mapW / cellSize);
    this.rows = Math.ceil(mapH / cellSize);

    // Initialize all cells as walkable
    this.grid = Array.from({ length: this.rows }, () => new Array(this.cols).fill(true));

    // Mark cells blocked by walls (with padding = cellSize/2 to keep enemies away from edges)
    const pad = cellSize / 2;
    for (const wall of walls) {
      const left = wall.x - wall.w / 2 - pad;
      const top = wall.y - wall.h / 2 - pad;
      const right = wall.x + wall.w / 2 + pad;
      const bottom = wall.y + wall.h / 2 + pad;

      const colMin = Math.max(0, Math.floor(left / cellSize));
      const colMax = Math.min(this.cols - 1, Math.floor(right / cellSize));
      const rowMin = Math.max(0, Math.floor(top / cellSize));
      const rowMax = Math.min(this.rows - 1, Math.floor(bottom / cellSize));

      for (let r = rowMin; r <= rowMax; r++) {
        for (let c = colMin; c <= colMax; c++) {
          // biome-ignore lint/style/noNonNullAssertion: r/c are bounds-checked above
          this.grid[r]![c] = false;
        }
      }
    }
  }

  findPath(fromX: number, fromY: number, toX: number, toY: number): Phaser.Math.Vector2[] {
    const start = this.worldToCell(fromX, fromY);
    const end = this.worldToCell(toX, toY);

    // Clamp to grid bounds
    start.col = Phaser.Math.Clamp(start.col, 0, this.cols - 1);
    start.row = Phaser.Math.Clamp(start.row, 0, this.rows - 1);
    end.col = Phaser.Math.Clamp(end.col, 0, this.cols - 1);
    end.row = Phaser.Math.Clamp(end.row, 0, this.rows - 1);

    // If start cell is blocked (enemy in inflated wall zone), snap to nearest walkable
    if (!this.grid[start.row]?.[start.col]) {
      const fallback = this.nearestWalkable(start);
      if (!fallback) return [];
      start.col = fallback.col;
      start.row = fallback.row;
    }

    // If target cell is blocked, find nearest walkable cell
    if (!this.grid[end.row]?.[end.col]) {
      const fallback = this.nearestWalkable(end);
      if (!fallback) return [];
      end.col = fallback.col;
      end.row = fallback.row;
    }

    const cells = this.astar(start, end);
    if (cells.length === 0) return [];

    const waypoints: Phaser.Math.Vector2[] = cells.map((c) => this.cellToWorld(c));
    // Replace last waypoint with exact target position
    waypoints[waypoints.length - 1] = new Phaser.Math.Vector2(toX, toY);

    return waypoints;
  }

  private worldToCell(x: number, y: number): Cell {
    return {
      col: Math.floor(x / this.cellSize),
      row: Math.floor(y / this.cellSize),
    };
  }

  private cellToWorld(cell: Cell): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      cell.col * this.cellSize + this.cellSize / 2,
      cell.row * this.cellSize + this.cellSize / 2,
    );
  }

  private nearestWalkable(center: Cell): Cell | null {
    // BFS outward from center to find nearest walkable cell
    const visited = new Set<string>();
    const queue: Cell[] = [center];
    visited.add(`${center.col},${center.row}`);

    while (queue.length > 0) {
      const c = queue.shift();
      if (!c) break;
      if (this.grid[c.row]?.[c.col]) return c;
      for (const n of this.neighbors8(c)) {
        const key = `${n.col},${n.row}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(n);
        }
      }
    }
    return null;
  }

  private astar(start: Cell, end: Cell): Cell[] {
    const key = (c: Cell) => c.row * this.cols + c.col;

    const openMap = new Map<number, AStarNode>();
    const closed = new Set<number>();

    const startNode: AStarNode = {
      ...start,
      g: 0,
      h: this.heuristic(start, end),
      f: this.heuristic(start, end),
      parent: null,
    };
    openMap.set(key(start), startNode);

    while (openMap.size > 0) {
      // Pick node with lowest f
      let current: AStarNode | null = null;
      for (const node of openMap.values()) {
        if (!current || node.f < current.f) current = node;
      }
      if (!current) break;

      if (current.col === end.col && current.row === end.row) {
        return this.reconstructPath(current);
      }

      openMap.delete(key(current));
      closed.add(key(current));

      for (const neighbor of this.neighbors8(current)) {
        const nKey = key(neighbor);
        if (closed.has(nKey)) continue;
        if (!this.grid[neighbor.row]?.[neighbor.col]) continue;

        // Diagonal cost: Math.SQRT2; cardinal: 1
        const isDiag = neighbor.col !== current.col && neighbor.row !== current.row;
        const moveCost = isDiag ? Math.SQRT2 : 1;
        const tentativeG = current.g + moveCost;

        const existing = openMap.get(nKey);
        if (!existing || tentativeG < existing.g) {
          const h = this.heuristic(neighbor, end);
          openMap.set(nKey, {
            col: neighbor.col,
            row: neighbor.row,
            g: tentativeG,
            h,
            f: tentativeG + h,
            parent: current,
          });
        }
      }
    }

    return []; // no path found
  }

  private heuristic(a: Cell, b: Cell): number {
    // Chebyshev distance (allows diagonal movement)
    return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
  }

  private neighbors8(cell: Cell): Cell[] {
    const result: Cell[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = cell.row + dr;
        const c = cell.col + dc;
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          result.push({ col: c, row: r });
        }
      }
    }
    return result;
  }

  private reconstructPath(node: AStarNode): Cell[] {
    const path: Cell[] = [];
    let current: AStarNode | null = node;
    while (current) {
      path.unshift({ col: current.col, row: current.row });
      current = current.parent;
    }
    // Skip the first cell (start position) to avoid stuttering
    return path.slice(1);
  }
}
