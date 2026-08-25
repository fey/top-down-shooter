import { describe, expect, it } from "vitest";
import {
  PATH_CELL_SIZE,
  PATH_ESCAPE_SPEED_MULT,
  PATH_RECALC_DIST,
  STUCK_TIME_MS,
  WAYPOINT_REACH_DIST,
} from "../config";
import type { Vec2 } from "./grid";
import { type NavQueries, PathFollower } from "./PathFollower";

const SPEED = 100;

/**
 * Заглушка запросов к карте: по умолчанию всё проходимо, путь — один вейпоинт.
 * Счётчик findPath и есть главный наблюдаемый факт: пересчитал модуль путь или нет.
 */
function navStub(overrides: Partial<NavQueries> = {}) {
  const calls = { findPath: 0 };
  let path: Vec2[] = [{ x: 300, y: 0 }];
  const nav: NavQueries = {
    findPath: () => {
      calls.findPath++;
      return path.map((p) => ({ ...p }));
    },
    isWalkable: () => true,
    isWalkableAt: () => true,
    nearestWalkableWorld: () => null,
    ...overrides,
  };
  return {
    nav,
    calls,
    setPath(next: Vec2[]) {
      path = next;
    },
  };
}

describe("PathFollower", () => {
  it("тот же путь переиспользуется, пока цель и её вид не сменились", () => {
    const { nav, calls } = navStub();
    const f = new PathFollower(nav);
    const req = { x: 0, y: 0, goal: "player" as const, target: { x: 300, y: 0 }, speed: SPEED };

    f.follow({ ...req, now: 1000 });
    f.follow({ ...req, now: 1010 });
    expect(calls.findPath).toBe(1);
  });

  it("смена вида цели пересчитывает путь, даже если точка осталась той же", () => {
    // Главный инвариант модуля: раньше это делал ручной invalidatePath() в оболочке,
    // и забытый вызов давал врага, идущего по маршруту к прошлой цели.
    const { nav, calls } = navStub();
    const f = new PathFollower(nav);
    const target = { x: 300, y: 0 };

    f.follow({ x: 0, y: 0, goal: "player", target, speed: SPEED, now: 1000 });
    f.follow({ x: 0, y: 0, goal: "lastKnown", target, speed: SPEED, now: 1010 });
    expect(calls.findPath).toBe(2);
  });

  it("уход цели дальше PATH_RECALC_DIST пересчитывает путь", () => {
    const { nav, calls } = navStub();
    const f = new PathFollower(nav);
    const base = { x: 0, y: 0, goal: "player" as const, speed: SPEED };

    f.follow({ ...base, target: { x: 300, y: 0 }, now: 1000 });
    f.follow({ ...base, target: { x: 300 + PATH_RECALC_DIST / 2, y: 0 }, now: 1010 });
    expect(calls.findPath, "сдвиг в пределах порога").toBe(1);
    f.follow({ ...base, target: { x: 300 + PATH_RECALC_DIST * 2, y: 0 }, now: 1020 });
    expect(calls.findPath, "сдвиг за порог").toBe(2);
  });

  it("reset() заставляет пересчитать путь: цель прыгнула, не меняя вида", () => {
    // На это опирается Enemy.aggro — точка выстрела перемещает lastKnownPos скачком.
    const { nav, calls } = navStub();
    const f = new PathFollower(nav);
    const req = { x: 0, y: 0, goal: "lastKnown" as const, target: { x: 300, y: 0 }, speed: SPEED };

    f.follow({ ...req, now: 1000 });
    f.reset();
    f.follow({ ...req, now: 1010 });
    expect(calls.findPath).toBe(2);
  });

  it("путь не найден — прямое движение на цель с полной скоростью", () => {
    const { nav, setPath } = navStub();
    setPath([]);
    const f = new PathFollower(nav);

    const v = f.follow({
      x: 0,
      y: 0,
      goal: "player",
      target: { x: 300, y: 0 },
      speed: SPEED,
      now: 1000,
    });
    expect(v.x).toBeCloseTo(SPEED);
    expect(v.y).toBeCloseTo(0);
  });

  it("из заблокированной клетки выбирается к ближайшей проходимой с ускорением", () => {
    // Ускорение нужно, чтобы отклик коллизии не задавил выталкивание обратно в стену.
    const { nav, calls } = navStub({
      isWalkableAt: () => false,
      nearestWalkableWorld: () => ({ x: 0, y: 100 }),
    });
    const f = new PathFollower(nav);

    const v = f.follow({
      x: 0,
      y: 0,
      goal: "player",
      target: { x: 300, y: 0 },
      speed: SPEED,
      now: 1000,
    });
    expect(v.x).toBeCloseTo(0);
    expect(v.y).toBeCloseTo(SPEED * PATH_ESCAPE_SPEED_MULT);
    expect(calls.findPath, "путь при выходе из стены не строится").toBe(0);
  });

  it("застревание: сперва пропуск вейпоинта, при повторе — пересчёт пути", () => {
    const { nav, calls, setPath } = navStub();
    setPath([
      { x: 300, y: 0 },
      { x: 600, y: 0 },
    ]);
    const f = new PathFollower(nav);
    const req = { x: 0, y: 0, goal: "player" as const, target: { x: 600, y: 0 }, speed: SPEED };

    f.follow({ ...req, now: 1000 });
    expect(calls.findPath).toBe(1);
    expect(f.remainingWaypoints()).toHaveLength(2);

    // Не сдвинулись за окно проверки → стадия 0: пропустить текущий вейпоинт.
    f.follow({ ...req, now: 1000 + STUCK_TIME_MS + 50 });
    expect(calls.findPath, "пропуск вейпоинта путь не пересчитывает").toBe(1);
    expect(f.remainingWaypoints()).toHaveLength(1);

    // Снова не сдвинулись → стадия 1: полный пересчёт.
    f.follow({ ...req, now: 1000 + 2 * (STUCK_TIME_MS + 50) });
    expect(calls.findPath).toBe(2);
  });

  it("смена вида цели сбрасывает стадию восстановления, а не только маршрут", () => {
    // Паритет с прежним invalidatePath(), который сбрасывал stuckRecoveryStage. Иначе
    // враг, застрявший на прошлой задаче, на свежем маршруте получает сразу пересчёт
    // вместо пропуска вейпоинта — и теряет более дешёвый шаг восстановления.
    const { nav, calls, setPath } = navStub();
    setPath([
      { x: 300, y: 0 },
      { x: 600, y: 0 },
    ]);
    const f = new PathFollower(nav);
    const stuck = { x: 0, y: 0, speed: SPEED };

    f.follow({ ...stuck, goal: "patrol", target: { x: 600, y: 0 }, now: 1000 });
    // Застряли на прошлой задаче → стадия 1.
    f.follow({
      ...stuck,
      goal: "patrol",
      target: { x: 600, y: 0 },
      now: 1000 + STUCK_TIME_MS + 50,
    });
    expect(calls.findPath, "пропуск вейпоинта, не пересчёт").toBe(1);

    // Сменился вид цели: маршрут строится заново, стадия обязана обнулиться вместе с ним.
    f.follow({ ...stuck, goal: "player", target: { x: 600, y: 0 }, now: 3000 });
    expect(calls.findPath).toBe(2);

    // Первое застревание на новой задаче должно дать снова пропуск вейпоинта.
    f.follow({
      ...stuck,
      goal: "player",
      target: { x: 600, y: 0 },
      now: 3000 + STUCK_TIME_MS + 50,
    });
    expect(calls.findPath, "стадия не обнулилась — сразу пересчёт").toBe(2);
    expect(f.remainingWaypoints()).toHaveLength(1);
  });

  it("последний вейпоинт достигнут — остановка и пустой маршрут", () => {
    const { nav, setPath } = navStub();
    setPath([{ x: WAYPOINT_REACH_DIST / 2, y: 0 }]);
    const f = new PathFollower(nav);

    const v = f.follow({
      x: 0,
      y: 0,
      goal: "patrol",
      target: { x: 0, y: 0 },
      speed: SPEED,
      now: 1000,
    });
    expect(v).toEqual({ x: 0, y: 0 });
    expect(f.remainingWaypoints()).toHaveLength(0);
  });

  it("отталкивание от стен добавляется при следовании по пути", () => {
    // Стена в клетке снизу: движемся вправо, поперечная составляющая уводит вверх.
    const blocked = { col: 1, row: 2 };
    const { nav, setPath } = navStub({
      isWalkable: (col, row) => !(col === blocked.col && row === blocked.row),
    });
    setPath([{ x: 300, y: 100 }]);
    const f = new PathFollower(nav);

    const v = f.follow({
      x: 100,
      y: 100,
      goal: "player",
      target: { x: 300, y: 100 },
      speed: SPEED,
      now: 1000,
    });
    expect(v.y, "отталкивание от стены снизу уводит вверх").toBeLessThan(0);
    expect(Math.floor((100 + PATH_CELL_SIZE) / PATH_CELL_SIZE)).toBe(blocked.row);
  });

  it("при прямом движении без пути отталкивание не применяется", () => {
    // Паритет с прежним Enemy.moveAlongPath: сила действовала только на ветке
    // следования по вейпоинтам — иначе враг без пути уползал бы вбок от цели.
    const { nav, setPath } = navStub({
      isWalkable: (col, row) => !(col === 1 && row === 2),
    });
    setPath([]);
    const f = new PathFollower(nav);

    const v = f.follow({
      x: 100,
      y: 100,
      goal: "player",
      target: { x: 300, y: 100 },
      speed: SPEED,
      now: 1000,
    });
    expect(v.y).toBe(0);
    expect(v.x).toBeCloseTo(SPEED);
  });
});
