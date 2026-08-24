import { describe, expect, it } from "vitest";
import { type BulletTrace, whizzSource } from "./alert";

const bullet = (x: number, y: number, firedFromX = 0, firedFromY = 0): BulletTrace => ({
  x,
  y,
  firedFromX,
  firedFromY,
});

// Враг слышит выстрел, а не видит стрелка: свист пули агрит его на точку, откуда
// прилетела пуля, а не на текущую позицию игрока. Поэтому проверяется, что возвращается
// именно точка выстрела, и что порог радиуса не «съезжает».
describe("whizzSource", () => {
  it("нет пуль — свиста нет", () => {
    expect(whizzSource([], 100, 100, 120)).toBeNull();
  });

  it("пуля дальше радиуса — свиста нет", () => {
    expect(whizzSource([bullet(400, 100)], 100, 100, 120)).toBeNull();
  });

  it("пуля ближе радиуса — возвращает точку выстрела, а не позицию пули", () => {
    expect(whizzSource([bullet(150, 100, 700, 40)], 100, 100, 120)).toEqual({ x: 700, y: 40 });
  });

  it("ровно на радиусе — ещё не свист (порог строгий)", () => {
    expect(whizzSource([bullet(220, 100)], 100, 100, 120)).toBeNull();
    expect(whizzSource([bullet(219, 100)], 100, 100, 120)).not.toBeNull();
  });

  it("несколько пуль — берётся источник ближайшей", () => {
    const bullets = [bullet(190, 100, 1, 1), bullet(140, 100, 2, 2), bullet(160, 100, 3, 3)];
    expect(whizzSource(bullets, 100, 100, 120)).toEqual({ x: 2, y: 2 });
  });

  it("расстояние считается по обеим осям", () => {
    // (170, 170) от (100, 100) — диагональ ≈ 99 px, внутри радиуса
    expect(whizzSource([bullet(170, 170, 5, 5)], 100, 100, 120)).toEqual({ x: 5, y: 5 });
    // (200, 200) — диагональ ≈ 141 px, снаружи
    expect(whizzSource([bullet(200, 200)], 100, 100, 120)).toBeNull();
  });
});
