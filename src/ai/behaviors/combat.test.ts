import { describe, expect, it } from "vitest";
import { evaluateDodge, kiteAction, predictAimAngle } from "./combat";

describe("kiteAction", () => {
  const retreat = 220;
  const advance = 320;

  it("ближе порога отступления → retreat", () => {
    expect(kiteAction(100, retreat, advance)).toBe("retreat");
  });

  it("дальше порога сближения → advance", () => {
    expect(kiteAction(400, retreat, advance)).toBe("advance");
  });

  it("в боевом окне → strafe", () => {
    expect(kiteAction(270, retreat, advance)).toBe("strafe");
  });

  it("на границах окна → strafe (границы не запускают манёвр)", () => {
    expect(kiteAction(retreat, retreat, advance)).toBe("strafe");
    expect(kiteAction(advance, retreat, advance)).toBe("strafe");
  });
});

describe("predictAimAngle", () => {
  const self = { x: 0, y: 0 };
  const bulletSpeed = 600;

  it("неподвижная цель → прицел точно в неё", () => {
    const angle = predictAimAngle(self, { x: 100, y: 0 }, { x: 0, y: 0 }, bulletSpeed, 100);
    expect(angle).toBeCloseTo(0, 6);
  });

  it("цель движется поперёк → прицел смещается в сторону её движения (упреждение)", () => {
    // цель справа на 600px (t=1с), движется вниз +y → целимся ниже неё
    const angle = predictAimAngle(self, { x: 600, y: 0 }, { x: 0, y: 100 }, bulletSpeed, 600);
    expect(angle).toBeGreaterThan(0); // угол повёрнут к +y
    expect(angle).toBeCloseTo(Math.atan2(100, 600), 6);
  });

  it("нулевая скорость цели эквивалентна прямому прицелу", () => {
    const moving = predictAimAngle(self, { x: 300, y: 300 }, { x: 0, y: 0 }, bulletSpeed, 424);
    const direct = Math.atan2(300, 300);
    expect(moving).toBeCloseTo(direct, 6);
  });
});

describe("evaluateDodge", () => {
  const self = { x: 0, y: 0 };
  const params = { dodgeRadius: 130, lateralThreshold: 36, speed: 200 };

  it("пуля летит прямо в цель и близко → рывок вбок с нужной скоростью", () => {
    // пуля слева, летит вправо прямо в (0,0)
    const dodge = evaluateDodge(self, { x: -50, y: 0 }, { x: 400, y: 0 }, params);
    expect(dodge).not.toBeNull();
    if (dodge) {
      expect(Math.hypot(dodge.x, dodge.y)).toBeCloseTo(params.speed, 6);
      // движение перпендикулярно курсу пули (по оси x) → только по y
      expect(dodge.x).toBeCloseTo(0, 6);
      expect(Math.abs(dodge.y)).toBeCloseTo(params.speed, 6);
    }
  });

  it("пуля далеко (вне dodgeRadius) → null", () => {
    const dodge = evaluateDodge(self, { x: -500, y: 0 }, { x: 400, y: 0 }, params);
    expect(dodge).toBeNull();
  });

  it("пуля удаляется от цели → null", () => {
    const dodge = evaluateDodge(self, { x: -50, y: 0 }, { x: -400, y: 0 }, params);
    expect(dodge).toBeNull();
  });

  it("пуля пролетает мимо (большое боковое отклонение) → null", () => {
    // близко по дистанции, но траектория уводит далеко вбок
    const dodge = evaluateDodge(self, { x: -50, y: 100 }, { x: 400, y: 0 }, params);
    expect(dodge).toBeNull();
  });

  it("стоящая пуля (скорость ~0) → null", () => {
    expect(evaluateDodge(self, { x: 10, y: 0 }, { x: 0, y: 0 }, params)).toBeNull();
  });
});
