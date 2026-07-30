import { describe, expect, it } from "vitest";
import { computePelletAngles } from "./pellets";

const EPS = 1e-9;

/** Поэлементное сравнение с допуском — у веера углы дробные. */
function expectAnglesClose(actual: number[], expected: number[]): void {
  expect(actual).toHaveLength(expected.length);
  for (const [i, want] of expected.entries()) {
    expect(actual[i] ?? Number.NaN).toBeCloseTo(want);
  }
}

describe("computePelletAngles", () => {
  it("одна дробинка летит точно в направлении прицела", () => {
    expect(computePelletAngles(1.23, 1, 0.26)).toEqual([1.23]);
  });

  it("возвращает ровно pelletCount углов", () => {
    expect(computePelletAngles(0, 5, 0.26)).toHaveLength(5);
  });

  it("веер симметричен относительно прицела и покрывает ровно spreadRad", () => {
    // Средняя дробинка при нечётном count — точно по прицелу, крайние — на ±spreadRad/2
    expectAnglesClose(computePelletAngles(0, 5, 0.4), [-0.2, -0.1, 0, 0.1, 0.2]);
  });

  it("углы распределены равномерно", () => {
    expectAnglesClose(computePelletAngles(0, 4, 0.6), [-0.3, -0.1, 0.1, 0.3]);
  });

  it("веер поворачивается вместе с прицелом", () => {
    const base = 2.5;
    const centered = computePelletAngles(0, 5, 0.4);
    expectAnglesClose(
      computePelletAngles(base, 5, 0.4),
      centered.map((a) => a + base),
    );
  });

  it("нулевой разброс — все дробинки в одну точку", () => {
    for (const a of computePelletAngles(1, 3, 0)) {
      expect(Math.abs(a - 1)).toBeLessThan(EPS);
    }
  });

  it("некорректный pelletCount трактуется как одиночный выстрел", () => {
    expect(computePelletAngles(0.5, 0, 0.3)).toEqual([0.5]);
    expect(computePelletAngles(0.5, -2, 0.3)).toEqual([0.5]);
  });
});
