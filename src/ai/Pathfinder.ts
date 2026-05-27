import Phaser from "phaser";
import { PATH_CELL_SIZE, PATH_SMOOTH_ENABLED } from "../config";

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

    if (PATH_SMOOTH_ENABLED) {
      return this.smoothPath(waypoints);
    }
    return waypoints;
  }

  /**
   * String pulling: remove unnecessary intermediate waypoints by checking
   * line-of-sight between an anchor and each subsequent waypoint. If LoS
   * holds, skip the intermediate point; when it breaks, commit the last
   * visible point and advance the anchor.
   */
  private smoothPath(waypoints: Phaser.Math.Vector2[]): Phaser.Math.Vector2[] {
    if (waypoints.length <= 2) return waypoints;

    // biome-ignore lint/style/noNonNullAssertion: waypoints.length > 2 guarantees index 0 exists
    const result: Phaser.Math.Vector2[] = [waypoints[0]!];
    let anchor = 0;

    for (let i = 2; i < waypoints.length; i++) {
      // biome-ignore lint/style/noNonNullAssertion: anchor < i <= waypoints.length - 1
      const anchorWp = waypoints[anchor]!;
      // biome-ignore lint/style/noNonNullAssertion: i < waypoints.length by loop condition
      const candidateWp = waypoints[i]!;
      if (!this.gridLoS(anchorWp.x, anchorWp.y, candidateWp.x, candidateWp.y)) {
        // LoS broken: commit the previous waypoint (i-1) as a bend point
        // biome-ignore lint/style/noNonNullAssertion: i >= 2, so i-1 >= 1 < waypoints.length
        result.push(waypoints[i - 1]!);
        anchor = i - 1;
      }
    }

    // Always include the final destination
    // biome-ignore lint/style/noNonNullAssertion: waypoints.length > 2 guarantees last index exists
    result.push(waypoints[waypoints.length - 1]!);
    return result;
  }

  /**
   * DDA line-of-sight check on the precomputed grid.
   * Takes world-space coordinates; returns false if any intermediate
   * grid cell along the line is blocked.
   *
   * NOTE: The destination cell (endpoint) is NOT checked by this method —
   * only intermediate cells are examined. This is safe in the `smoothPath`
   * context because A* guarantees that path endpoints are walkable. However,
   * callers reusing this method elsewhere should be aware of this caveat.
   */
  private gridLoS(ax: number, ay: number, bx: number, by: number): boolean {
    const c0 = Math.floor(ax / this.cellSize);
    const r0 = Math.floor(ay / this.cellSize);
    const c1 = Math.floor(bx / this.cellSize);
    const r1 = Math.floor(by / this.cellSize);

    const dc = Math.abs(c1 - c0);
    const dr = Math.abs(r1 - r0);
    const sc = c0 < c1 ? 1 : -1;
    const sr = r0 < r1 ? 1 : -1;
    let err = dc - dr;
    let c = c0;
    let r = r0;

    while (c !== c1 || r !== r1) {
      // Skip the start cell (enemy may be at a cell edge; check only intermediate cells)
      if (c !== c0 || r !== r0) {
        if (!this.isWalkable(c, r)) return false;
      }
      const e2 = 2 * err;
      const stepCol = e2 > -dr;
      const stepRow = e2 < dc;
      // When DDA steps diagonally, also check both cardinal neighbours —
      // same corner-cutting prevention as A*. Without this, smoothPath
      // creates diagonal shortcuts through 1-cell-wide corridor corners
      // that the enemy's physical body cannot actually pass through.
      if (stepCol && stepRow) {
        if (!this.isWalkable(c + sc, r)) return false;
        if (!this.isWalkable(c, r + sr)) return false;
      }
      if (stepCol) {
        err -= dr;
        c += sc;
      }
      if (stepRow) {
        err += dc;
        r += sr;
      }
    }
    return true;
  }

  /**
   * Returns true if the grid cell at (col, row) is within bounds and walkable.
   * Used by Enemy for wall separation force sampling.
   */
  public isWalkable(col: number, row: number): boolean {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return false;
    return this.grid[row]?.[col] === true;
  }

  /**
   * Converts a world-space position to its grid cell coordinates.
   * Public wrapper for Enemy's wall separation force calculations.
   */
  public worldToGridCell(x: number, y: number): { col: number; row: number } {
    return this.worldToCell(x, y);
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

        // Prevent diagonal corner-cutting: both cardinal neighbours must be walkable
        const dCol = neighbor.col - current.col;
        const dRow = neighbor.row - current.row;
        if (dCol !== 0 && dRow !== 0) {
          if (!this.grid[current.row]?.[neighbor.col]) continue;
          if (!this.grid[neighbor.row]?.[current.col]) continue;
        }

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

  /** Returns true if the world-space point (x, y) lies in a walkable grid cell. */
  isWalkableAt(x: number, y: number): boolean {
    const cell = this.worldToCell(x, y);
    return this.grid[cell.row]?.[cell.col] ?? false;
  }

  /**
   * Returns the world-space centre of the nearest walkable cell to (x, y),
   * or null if the entire grid is blocked (shouldn't happen in practice).
   */
  nearestWalkableWorld(x: number, y: number): Phaser.Math.Vector2 | null {
    const cell = this.worldToCell(x, y);
    const nearest = this.nearestWalkable(cell);
    return nearest ? this.cellToWorld(nearest) : null;
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
