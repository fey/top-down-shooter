import { describe, expect, it } from "vitest";
import type { WallDef } from "../types";
import { anyWallBlocks, segmentIntersectsRect } from "./geometry";

// Прямоугольник [10,20]×[10,20] для прямых проверок.
const RECT = { minX: 10, minY: 10, maxX: 20, maxY: 20 };
const hits = (ax: number, ay: number, bx: number, by: number) =>
  segmentIntersectsRect(ax, ay, bx, by, RECT.minX, RECT.minY, RECT.maxX, RECT.maxY);

describe("segmentIntersectsRect", () => {
  it("отрезок проходит сквозь прямоугольник → true", () => {
    expect(hits(0, 15, 30, 15)).toBe(true);
  });

  it("отрезок целиком мимо (выше) → false", () => {
    expect(hits(0, 5, 30, 5)).toBe(false);
  });

  it("отрезок целиком внутри → true", () => {
    expect(hits(12, 12, 18, 18)).toBe(true);
  });

  it("один конец внутри, другой снаружи → true", () => {
    expect(hits(15, 15, 100, 100)).toBe(true);
  });

  it("отрезок заканчивается, не доходя до прямоугольника → false", () => {
    expect(hits(0, 15, 5, 15)).toBe(false);
  });

  it("касание угла → true", () => {
    expect(hits(0, 0, 10, 10)).toBe(true);
  });

  it("вертикальный отрезок сквозь прямоугольник → true", () => {
    expect(hits(15, 0, 15, 30)).toBe(true);
  });

  it("вертикальный отрезок сбоку мимо → false", () => {
    expect(hits(25, 0, 25, 30)).toBe(false);
  });
});

describe("anyWallBlocks", () => {
  const wall: WallDef = { x: 15, y: 15, w: 10, h: 10 }; // [10,20]×[10,20]

  it("стена на линии → перекрывает", () => {
    expect(anyWallBlocks(0, 15, 30, 15, [wall])).toBe(true);
  });

  it("стена в стороне → не перекрывает", () => {
    expect(anyWallBlocks(0, 0, 5, 0, [wall])).toBe(false);
  });

  it("пустой список стен → ничего не перекрывает", () => {
    expect(anyWallBlocks(0, 0, 100, 100, [])).toBe(false);
  });

  it("перекрывает, если хотя бы одна из нескольких стен на линии", () => {
    const far: WallDef = { x: 500, y: 500, w: 10, h: 10 };
    expect(anyWallBlocks(0, 15, 30, 15, [far, wall])).toBe(true);
  });
});
