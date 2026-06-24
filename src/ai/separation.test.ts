import { describe, expect, it } from "vitest";
import { wallSeparationForce } from "./separation";

const CELL = 64;
const STRENGTH = 10;

describe("wallSeparationForce", () => {
  it("в открытом поле (всё проходимо) сила нулевая", () => {
    const f = wallSeparationForce(100, 100, CELL, CELL, STRENGTH, () => true);
    expect(f).toEqual({ x: 0, y: 0 });
  });

  it("стена справа отталкивает влево, сила нормирована к strength", () => {
    // блокируем все клетки с col >= 2; точка (100,100) в col1 — восточные сэмплы попадают в стену
    const f = wallSeparationForce(100, 100, CELL, CELL, STRENGTH, (col) => col < 2);
    expect(f.x).toBeLessThan(0); // оттолкнуло влево, от стены
    expect(Math.hypot(f.x, f.y)).toBeCloseTo(STRENGTH, 6);
  });

  it("симметричное окружение стенами слева и справа гасит горизонтальную составляющую", () => {
    // блокируем крайние колонки (col 0 и col 2), точка в центре col1 (x=96) — отражение по x точное
    const f = wallSeparationForce(96, 100, CELL, CELL, STRENGTH, (col) => col === 1);
    expect(f.x).toBeCloseTo(0, 6);
  });
});
