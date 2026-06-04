import Phaser from "phaser";
import { PATH_CELL_SIZE } from "../config";
import type { WallDef } from "../types";

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

    // Mark only the cells actually occupied by walls. No inflation: clearance
    // around walls comes from Theta*/gridLoS corner-cutting checks, the wall
    // separation force in Enemy, and the physics collider — inflating here
    // killed entire walkable tiles next to grid-aligned walls.
    for (const wall of walls) {
      const left = wall.x - wall.w / 2;
      const top = wall.y - wall.h / 2;
      const right = wall.x + wall.w / 2;
      const bottom = wall.y + wall.h / 2;

      // Half-open interval: a wall whose edge lies exactly on a cell boundary
      // must not block the neighbouring cell (hence the -1 on max edges).
      const colMin = Math.max(0, Math.floor(left / cellSize));
      const colMax = Math.min(this.cols - 1, Math.floor((right - 1) / cellSize));
      const rowMin = Math.max(0, Math.floor(top / cellSize));
      const rowMax = Math.min(this.rows - 1, Math.floor((bottom - 1) / cellSize));

      for (let r = rowMin; r <= rowMax; r++) {
        for (let c = colMin; c <= colMax; c++) {
          // biome-ignore lint/style/noNonNullAssertion: r/c are bounds-checked above
          this.grid[r]![c] = false;
        }
      }
    }
  }

  findPath(fromX: number, fromY: number, toX: number, toY: number): Phaser.Math.Vector2[] {
    // LoS-шорткат: прямая до цели свободна — поиск не нужен.
    // gridLoS не проверяет клетку самой цели. Это безопасно, пока цель —
    // живая или последняя увиденная позиция игрока (физически проходимая).
    // Для произвольных точек рядом с геометрией шорткат, в отличие от полного
    // поиска, НЕ привязывает заблокированную цель к ближайшей проходимой клетке.
    if (this.gridLoS(fromX, fromY, toX, toY)) {
      return [new Phaser.Math.Vector2(toX, toY)];
    }

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

    const cells = this.thetaStar(start, end);
    if (cells.length === 0) return [];

    const waypoints: Phaser.Math.Vector2[] = cells.map((c) => this.cellToWorld(c));
    // Replace last waypoint with exact target position
    waypoints[waypoints.length - 1] = new Phaser.Math.Vector2(toX, toY);

    return this.trimStart(fromX, fromY, waypoints);
  }

  /**
   * Убирает квантование старта: Theta* стартует из центра клетки врага,
   * поэтому первые вейпоинты могут лежать «вбок» от реальной позиции.
   * Отбрасываем ведущие точки, пока следующая за ними видна напрямую.
   */
  private trimStart(
    fromX: number,
    fromY: number,
    waypoints: Phaser.Math.Vector2[],
  ): Phaser.Math.Vector2[] {
    let first = 0;
    while (first + 1 < waypoints.length) {
      const next = waypoints[first + 1];
      if (!next || !this.gridLoS(fromX, fromY, next.x, next.y)) break;
      first++;
    }
    return waypoints.slice(first);
  }

  /**
   * DDA line-of-sight check on the precomputed grid.
   * Takes world-space coordinates; returns false if any intermediate
   * grid cell along the line is blocked.
   *
   * NOTE: The destination cell (endpoint) is NOT checked by this method —
   * only intermediate cells are examined. This is safe in the Theta* / shortcut
   * context because Theta* guarantees that path endpoints are walkable. However,
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
      // same corner-cutting prevention as Theta*. Without this, the LoS
      // shortcut creates diagonal shortcuts through 1-cell-wide corridor corners
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

  /**
   * Theta* (basic): любой узел может наследовать родителя «через голову»
   * current, если от parent(current) до соседа есть grid-LoS. Стоимости
   * и эвристика евклидовы — путь получается any-angle, натянутым,
   * без пост-сглаживания.
   */
  private thetaStar(start: Cell, end: Cell): Cell[] {
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
      // Pick node with lowest f (линейный скан — сетка ~510 клеток, куча не нужна)
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

        // Theta*: если от parent(current) до соседа есть LoS — наследуем
        // родителя через голову current (path 2), иначе обычный шаг A* (path 1)
        let candidateParent = current;
        let tentativeG: number;
        const grandparent = current.parent;
        if (grandparent && this.cellLoS(grandparent, neighbor)) {
          candidateParent = grandparent;
          tentativeG = grandparent.g + this.dist(grandparent, neighbor);
        } else {
          tentativeG = current.g + this.dist(current, neighbor);
        }

        const existing = openMap.get(nKey);
        if (!existing || tentativeG < existing.g) {
          const h = this.heuristic(neighbor, end);
          openMap.set(nKey, {
            col: neighbor.col,
            row: neighbor.row,
            g: tentativeG,
            h,
            f: tentativeG + h,
            parent: candidateParent,
          });
        }
      }
    }

    return []; // no path found
  }

  /** Euclidean distance в клетках — единая метрика для g-стоимости Theta*. */
  private dist(a: Cell, b: Cell): number {
    return Math.hypot(a.col - b.col, a.row - b.row);
  }

  /** Grid-LoS между центрами двух клеток (обёртка над gridLoS в мировых координатах). */
  private cellLoS(a: Cell, b: Cell): boolean {
    const aw = this.cellToWorld(a);
    const bw = this.cellToWorld(b);
    return this.gridLoS(aw.x, aw.y, bw.x, bw.y);
  }

  private heuristic(a: Cell, b: Cell): number {
    // Euclidean — согласована с евклидовыми стоимостями Theta* (admissible)
    return this.dist(a, b);
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
