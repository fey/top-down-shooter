import { describe, expect, it } from "vitest";
import { Grid } from "./grid";

const CELL = 10;

/**
 * Строит Grid из ASCII-карты: '.' — проходимо, '#' — стена.
 * Центр клетки (col,row) в мировых координатах = (col*10+5, row*10+5).
 */
function gridFrom(rows: string[]): Grid {
  const cells = rows.map((line) => [...line].map((ch) => ch === "."));
  const width = cells[0]?.length ?? 0;
  return new Grid(cells, width, cells.length, CELL);
}

/** Достаёт точку, падая с понятной ошибкой если её нет (без non-null assertion). */
function expectPoint(p: { x: number; y: number } | null): { x: number; y: number } {
  if (p === null) throw new Error("expected a point, got null");
  return p;
}

/** Мировой центр клетки. */
function center(col: number, row: number): { x: number; y: number } {
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

describe("Grid.gridLoS", () => {
  it("видит насквозь пустую сетку по прямой", () => {
    const g = gridFrom(["..."]);
    expect(g.gridLoS(5, 5, 25, 5)).toBe(true);
  });

  it("стена на пути блокирует видимость", () => {
    const g = gridFrom([".#."]);
    expect(g.gridLoS(5, 5, 25, 5)).toBe(false);
  });

  it("не срезает угол по диагонали (corner-cutting запрещён)", () => {
    // .#
    // #.
    const g = gridFrom([".#", "#."]);
    expect(g.gridLoS(5, 5, 15, 15)).toBe(false);
  });

  it("видит по чистой диагонали при свободных кардинальных соседях", () => {
    const g = gridFrom(["..", ".."]);
    expect(g.gridLoS(5, 5, 15, 15)).toBe(true);
  });
});

describe("Grid.isWalkable", () => {
  it("возвращает false за пределами сетки", () => {
    const g = gridFrom([".."]);
    expect(g.isWalkable(-1, 0)).toBe(false);
    expect(g.isWalkable(2, 0)).toBe(false);
    expect(g.isWalkable(0, 1)).toBe(false);
  });

  it("отражает проходимость клеток", () => {
    const g = gridFrom([".#"]);
    expect(g.isWalkable(0, 0)).toBe(true);
    expect(g.isWalkable(1, 0)).toBe(false);
  });
});

describe("Grid.findPath", () => {
  it("прямая видимость → один вейпоинт точно в цель (без поиска)", () => {
    const g = gridFrom(["...", "...", "..."]);
    const path = g.findPath(5, 5, 25, 25);
    expect(path).toHaveLength(1);
    expect(path[0]).toEqual({ x: 25, y: 25 });
  });

  it("обходит стену: путь длиннее одного шага, последняя точка — точная цель", () => {
    // вертикальная стена в колонке 1 с проходом по нижнему ряду
    const g = gridFrom([".#.", ".#.", ".#.", ".#.", "..."]);
    const path = g.findPath(5, 5, 25, 5);
    expect(path.length).toBeGreaterThan(1);
    expect(path.at(-1)).toEqual({ x: 25, y: 5 });
    // все промежуточные вейпоинты лежат в проходимых клетках
    for (const wp of path.slice(0, -1)) {
      expect(g.isWalkableAt(wp.x, wp.y)).toBe(true);
    }
  });

  it("нет пути к изолированной цели → пустой массив", () => {
    // нижне-левая клетка окружена стенами
    const g = gridFrom([".#.", "###", ".#."]);
    expect(g.findPath(5, 5, 5, 25)).toEqual([]);
  });
});

describe("Grid.nearestWalkableWorld", () => {
  it("из заблокированной клетки возвращает центр ближайшей проходимой", () => {
    // #.
    // ..
    const g = gridFrom(["#.", ".."]);
    const p = expectPoint(g.nearestWalkableWorld(5, 5)); // точка в заблокированной (0,0)
    expect(g.isWalkableAt(p.x, p.y)).toBe(true);
  });

  it("из проходимой клетки возвращает её же центр", () => {
    const g = gridFrom([".."]);
    expect(g.nearestWalkableWorld(15, 5)).toEqual(center(1, 0));
  });
});

describe("Grid.randomWalkableWorld", () => {
  it("с детерминированным rng попадает в проходимую клетку", () => {
    const g = gridFrom(["#.", ".."]);
    // rng=()=>0 → col0,row0 (стена) на всех попытках → fallback-скан вернёт первую проходимую
    const p = expectPoint(g.randomWalkableWorld(() => 0));
    expect(g.isWalkableAt(p.x, p.y)).toBe(true);
  });

  it("null, если вся сетка — стены", () => {
    const g = gridFrom(["##", "##"]);
    expect(g.randomWalkableWorld(() => 0)).toBeNull();
  });
});

describe("Grid.fromWalls", () => {
  it("стена блокирует занятые ею клетки, оставляя соседние проходимыми", () => {
    // карта 30×10 (3×1 клетки), стена ровно в средней клетке [10..20)
    const g = Grid.fromWalls([{ x: 15, y: 5, w: 10, h: 10 }], 30, 10, CELL);
    expect(g.isWalkable(0, 0)).toBe(true);
    expect(g.isWalkable(1, 0)).toBe(false);
    expect(g.isWalkable(2, 0)).toBe(true);
  });
});
