import { describe, expect, it } from "vitest";
import { WEAPONS, type WeaponDef } from "../config";
import { Weapon } from "./Weapon";

/**
 * Генератор с заданной последовательностью. Неточность — единственная случайность выстрела,
 * и тест обязан ею управлять; лишние обращения к генератору здесь же и вскрываются.
 */
function rngOf(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)] ?? 0.5;
}

/** 0.5 → roll 0 → увода нет: выстрел точно по прицелу. */
const CENTER = 0.5;
/** 1 → roll 1 → максимальный увод вправо. */
const MAX_RIGHT = 1;

const AIM = 0.3; // произвольный угол прицела, лишь бы не ноль

describe("Weapon", () => {
  describe("темп", () => {
    it("первый выстрел проходит", () => {
      const w = new Weapon(WEAPONS.pistol, rngOf(CENTER));
      expect(w.tryFire(0, 0, AIM, 10_000)).toHaveLength(1);
    });

    it("второй выстрел внутри кулдауна даёт пустой залп", () => {
      const w = new Weapon(WEAPONS.pistol, rngOf(CENTER));
      w.tryFire(0, 0, AIM, 10_000);
      expect(w.tryFire(0, 0, AIM, 10_000 + WEAPONS.pistol.cooldown - 1)).toEqual([]);
    });

    it("выстрел ровно на границе кулдауна проходит", () => {
      const w = new Weapon(WEAPONS.pistol, rngOf(CENTER));
      w.tryFire(0, 0, AIM, 10_000);
      expect(w.tryFire(0, 0, AIM, 10_000 + WEAPONS.pistol.cooldown)).toHaveLength(1);
    });

    it("заблокированный выстрел не отодвигает окно темпа", () => {
      // Зажатая кнопка стреляет каждый кадр. Если бы окно сдвигал и отказ, следующий
      // выстрел уезжал бы в бесконечность и оружие замолкало.
      const { cooldown } = WEAPONS.pistol;
      const w = new Weapon(WEAPONS.pistol, rngOf(CENTER));
      w.tryFire(0, 0, AIM, 10_000);
      w.tryFire(0, 0, AIM, 10_000 + cooldown - 50); // отказ
      expect(w.tryFire(0, 0, AIM, 10_000 + cooldown)).toHaveLength(1);
    });
  });

  describe("веер и урон", () => {
    it("дробовик даёт по спецификации на каждую дробинку", () => {
      const w = new Weapon(WEAPONS.shotgun, rngOf(CENTER));
      expect(w.tryFire(0, 0, AIM, 10_000)).toHaveLength(WEAPONS.shotgun.pelletCount);
    });

    it("каждая дробинка несёт полный урон дескриптора", () => {
      // Дробовик снимает damage × pelletCount за одно нажатие — это его роль вблизи.
      const w = new Weapon(WEAPONS.shotgun, rngOf(CENTER));
      const shot = w.tryFire(0, 0, AIM, 10_000);
      expect(shot.map((s) => s.damage)).toEqual(
        Array(WEAPONS.shotgun.pelletCount).fill(WEAPONS.shotgun.damage),
      );
    });

    it("все дробинки выходят из точки стрелка", () => {
      const w = new Weapon(WEAPONS.shotgun, rngOf(CENTER));
      const shot = w.tryFire(120, -45, AIM, 10_000);
      for (const spec of shot) {
        expect(spec.x).toBe(120);
        expect(spec.y).toBe(-45);
      }
    });

    it("скорость пули берётся из дескриптора", () => {
      const w = new Weapon(WEAPONS.rifle, rngOf(CENTER));
      const [spec] = w.tryFire(0, 0, AIM, 10_000);
      expect(spec?.speed).toBe(WEAPONS.rifle.bulletSpeed);
    });

    it("веер симметричен относительно прицела и покрывает spreadRad от края до края", () => {
      const { spreadRad, pelletCount } = WEAPONS.shotgun;
      const w = new Weapon(WEAPONS.shotgun, rngOf(CENTER));
      const angles = w.tryFire(0, 0, AIM, 10_000).map((s) => s.angle);
      expect(angles[0] ?? Number.NaN).toBeCloseTo(AIM - spreadRad / 2);
      expect(angles[pelletCount - 1] ?? Number.NaN).toBeCloseTo(AIM + spreadRad / 2);
    });
  });

  describe("неточность", () => {
    // Ни одно оружие в реестре не имеет веера и неточности одновременно: у дробовика
    // aimSpreadRad = 0, у автомата pelletCount = 1. Инвариант «увод до раскладки» проверяем
    // на дескрипторе, который совмещает и то и другое — иначе он не покрыт вообще.
    const scatterShotgun: WeaponDef = { ...WEAPONS.shotgun, aimSpreadRad: 0.2, spreadRad: 0.4 };

    it("розыгрыш в центре конуса не уводит выстрел", () => {
      const w = new Weapon(WEAPONS.automat, rngOf(CENTER));
      const [spec] = w.tryFire(0, 0, AIM, 10_000);
      expect(spec?.angle ?? Number.NaN).toBeCloseTo(AIM);
    });

    it("уводит выстрел внутри паспортного конуса", () => {
      const w = new Weapon(WEAPONS.automat, rngOf(MAX_RIGHT));
      const [spec] = w.tryFire(0, 0, AIM, 10_000);
      expect(spec?.angle ?? Number.NaN).toBeCloseTo(AIM + WEAPONS.automat.aimSpreadRad / 2);
    });

    it("разыгрывается один раз на выстрел: веер смещается целиком, форма сохраняется", () => {
      // Генератор отдаёт разные значения. Если бы неточность разыгрывалась на каждую
      // дробинку, шаги веера стали бы неравными — дробь полетела бы вразброд.
      const w = new Weapon(scatterShotgun, rngOf(MAX_RIGHT, CENTER, MAX_RIGHT, CENTER, MAX_RIGHT));
      const angles = w.tryFire(0, 0, AIM, 10_000).map((s) => s.angle);
      const shiftedAim = AIM + scatterShotgun.aimSpreadRad / 2;
      const step = scatterShotgun.spreadRad / (scatterShotgun.pelletCount - 1);

      expect(angles[0] ?? Number.NaN).toBeCloseTo(shiftedAim - scatterShotgun.spreadRad / 2);
      for (let i = 1; i < angles.length; i++) {
        expect((angles[i] ?? Number.NaN) - (angles[i - 1] ?? Number.NaN)).toBeCloseTo(step);
      }
    });

    it("кривой генератор не расширяет конус за паспортный", () => {
      const honest = new Weapon(WEAPONS.automat, rngOf(MAX_RIGHT));
      const broken = new Weapon(WEAPONS.automat, rngOf(17));
      const [a] = honest.tryFire(0, 0, AIM, 10_000);
      const [b] = broken.tryFire(0, 0, AIM, 10_000);
      expect(b?.angle ?? Number.NaN).toBeCloseTo(a?.angle ?? Number.NaN);
    });
  });
});
