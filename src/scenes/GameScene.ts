import Phaser from "phaser";
import { type BulletTrace, whizzSource } from "../ai/behaviors/alert";
import type { Pathfinder } from "../ai/Pathfinder";
import {
  COLOR_BG_GAME,
  ENEMY_WHIZZ_RADIUS,
  PACK_ALERT_RADIUS,
  PLAYER_HP,
  WEAPONS,
} from "../config";
import { DebugOverlay } from "../debug/DebugOverlay";
import { drawPathGrid } from "../debug/grid";
import { drawDebugPaths } from "../debug/paths";
import { Bullet } from "../entities/Bullet";
import { type Enemy, EnemyState } from "../entities/Enemy";
import type { Player } from "../entities/Player";
import type { WeaponPickup } from "../entities/WeaponPickup";
import {
  ENEMIES_CHANGED,
  emitGameEvent,
  offGameEvent,
  onceGameEvent,
  onGameEvent,
  PACK_ALERT,
  PLAYER_DIED,
} from "../events";
import { loadTiledLevel } from "../level/LevelLoader";
import { DEFAULT_LEVEL, type LevelConfig } from "../level/levels";
import { GAME_OVER_SCENE_KEY } from "./GameOverScene";
import { HUD_SCENE_KEY, type HudInitData } from "./HUDScene";
import { LEVEL_SELECT_SCENE_KEY } from "./LevelSelectScene";

/**
 * Состояния, в которых враг ещё не ведёт бой и потому реагирует на чужую стрельбу.
 * Тот же набор проверяет Enemy.aggro; здесь он нужен, чтобы не гонять геометрию
 * по врагам, которые всё равно ничего не услышат.
 */
const UNAWARE_STATES: ReadonlySet<EnemyState> = new Set([
  EnemyState.IDLE,
  EnemyState.PATROL,
  EnemyState.SEARCH,
]);

export const GAME_SCENE_KEY = "Game";
export type { LevelConfig };

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.StaticGroup;
  private pathfinder!: Pathfinder;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private debugPaths = false;
  private gameOver = false;
  private levelHadEnemies = false; // уровень стартовал с врагами → у него есть условие победы
  private enemiesAlive = 0;
  private levelConfig: LevelConfig = DEFAULT_LEVEL;

  constructor() {
    super(GAME_SCENE_KEY);
  }

  init(data: { level?: LevelConfig }): void {
    this.levelConfig = data.level ?? DEFAULT_LEVEL;
    this.gameOver = false;
    this.levelHadEnemies = false;
    this.enemiesAlive = 0;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_BG_GAME);

    this.playerBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    this.enemyBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    this.enemyGroup = this.physics.add.group();
    this.pickups = this.physics.add.staticGroup();
    this.pathGraphics = this.add.graphics().setDepth(50);

    // Загрузка уровня: создаёт игрока, врагов, пикапы и pathfinder; коллизии/камеру вешаем здесь
    const level = loadTiledLevel(this, this.levelConfig.key, {
      playerBullets: this.playerBullets,
      enemyBullets: this.enemyBullets,
      enemyGroup: this.enemyGroup,
      pickups: this.pickups,
    });
    this.player = level.player;
    this.pathfinder = level.pathfinder;
    this.enemiesAlive = this.enemyGroup.countActive(true);
    this.levelHadEnemies = this.enemiesAlive > 0;

    // Статичная дебаг-сетка pathfinding: рисуется один раз, видимость — по F1.
    // Как и оверлей состояния, это инструмент разработки: в продакшн-сборке сетки нет,
    // иначе игрок в релизе включал бы F1 и видел внутренности навигации.
    this.gridGraphics = this.add.graphics().setDepth(40).setVisible(false);
    if (import.meta.env.DEV) {
      drawPathGrid(this.gridGraphics, this.pathfinder, level.mapW, level.mapH);
    }

    this.setupCollisions(level.wallLayer);

    // Обработчики держим в переменных и снимаем на shutdown: сцена — один и тот же
    // экземпляр с одним и тем же эмиттером, а create() вызывается на каждый рестарт
    // уровня. Без снятия подписки после второго боя копились бы и дублировали работу.
    const onPackAlert = (x: number, y: number) => {
      for (const obj of this.enemyGroup.getChildren()) {
        const e = obj as Enemy;
        if (e.state === EnemyState.IDLE) {
          const d = Phaser.Math.Distance.Between(x, y, e.x, e.y);
          if (d < PACK_ALERT_RADIUS) {
            e.state = EnemyState.CHASE;
          }
        }
      }
    };
    onGameEvent(this.events, PACK_ALERT, onPackAlert);

    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, level.mapW, level.mapH);

    const onPlayerDied = () => {
      this.gameOver = true;
      this.scene.start(GAME_OVER_SCENE_KEY, { win: false, level: this.levelConfig });
    };
    onceGameEvent(this.events, PLAYER_DIED, onPlayerDied);

    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).once("down", () => {
      this.scene.start(LEVEL_SELECT_SCENE_KEY);
    });

    if (import.meta.env.DEV) {
      this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F1).on("down", () => {
        this.debugPaths = !this.debugPaths;
        this.gridGraphics.setVisible(this.debugPaths);
        if (!this.debugPaths) this.pathGraphics.clear();
      });
    }

    // HUD — параллельная сцена поверх боя. Ей отдаётся эмиттер этой сцены (события
    // hpChanged / weaponChanged / enemiesChanged) и начальный снимок: подписка ловит
    // только изменения, а стартовые значения взять ей больше негде.
    const hudData: HudInitData = {
      events: this.events,
      hp: this.player.hp,
      maxHp: PLAYER_HP,
      weaponName: this.player.weaponDef.name,
      enemiesLeft: this.enemiesAlive,
    };
    this.scene.launch(HUD_SCENE_KEY, hudData);

    this.events.once("shutdown", () => {
      this.scene.stop(HUD_SCENE_KEY);
      offGameEvent(this.events, PACK_ALERT, onPackAlert);
      offGameEvent(this.events, PLAYER_DIED, onPlayerDied);
    });

    // Дебаг-оверлей — инструмент разработки: в продакшн-сборке его нет вовсе
    // (import.meta.env.DEV — константа Vite, ветка вырезается при сборке).
    if (import.meta.env.DEV) {
      new DebugOverlay(this, this.player, this.enemyGroup);
    }
  }

  /** Навешивает все коллизии: враг↔враг, пули↔цели, всё↔стены (если стены есть). */
  private setupCollisions(wallLayer: Phaser.Tilemaps.TilemapLayer | null): void {
    // Enemy↔enemy collision (mode-independent)
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);

    // Enemy bullets → player
    this.physics.add.overlap(this.enemyBullets, this.player, (_playerObj, bulletObj) => {
      const bullet = bulletObj as Bullet;
      const dmg = bullet.damage;
      bullet.destroy();
      this.player.takeDamage(dmg);
    });

    // Player → weapon pickups: overlap (не collider) — игрок проходит сквозь, оружие меняется
    this.physics.add.overlap(this.player, this.pickups, (_playerObj, pickupObj) => {
      const pickup = pickupObj as WeaponPickup;
      this.player.equip(WEAPONS[pickup.weaponId]);
      pickup.destroy();
    });

    // Player bullets → enemies
    this.physics.add.overlap(
      this.playerBullets,
      this.enemyGroup,
      (bulletObj, enemyObj) => {
        const bullet = bulletObj as Bullet;
        const enemy = enemyObj as Enemy;
        // Агро до урона: takeDamage может уничтожить врага, и вызов ушёл бы в пустоту.
        enemy.aggro(bullet.firedFromX, bullet.firedFromY);
        bullet.destroy();
        enemy.takeDamage(bullet.damage);
      },
      undefined,
      this,
    );

    if (!wallLayer) return;
    this.physics.add.collider(this.player, wallLayer);
    this.physics.add.collider(this.enemyGroup, wallLayer);
    this.physics.add.collider(this.playerBullets, wallLayer, (bullet) => {
      (bullet as Phaser.GameObjects.GameObject).destroy();
    });
    this.physics.add.collider(this.enemyBullets, wallLayer, (bullet) => {
      (bullet as Phaser.GameObjects.GameObject).destroy();
    });
  }

  /**
   * Пуля игрока, прошедшая рядом, поднимает врага так же, как попадание: он идёт к точке
   * выстрела. Проверка живёт в сцене, а не в tick() врага, потому что врагу неоткуда
   * знать про группу пуль — снимок собирается здесь, решение принимает чистая whizzSource.
   *
   * Перебор пуль × врагов допустим: и тех и других на уровне десятки, а фильтр по
   * состоянию отсекает всех, кто уже в бою.
   */
  private alertEnemiesNearBullets(): void {
    const unaware: Enemy[] = [];
    for (const obj of this.enemyGroup.getChildren()) {
      const enemy = obj as Enemy;
      if (enemy.active && UNAWARE_STATES.has(enemy.state)) unaware.push(enemy);
    }
    if (unaware.length === 0) return;

    const traces: BulletTrace[] = [];
    for (const obj of this.playerBullets.getChildren()) {
      const bullet = obj as Bullet;
      if (bullet.active) {
        traces.push({
          x: bullet.x,
          y: bullet.y,
          firedFromX: bullet.firedFromX,
          firedFromY: bullet.firedFromY,
        });
      }
    }
    if (traces.length === 0) return;

    for (const enemy of unaware) {
      const source = whizzSource(traces, enemy.x, enemy.y, ENEMY_WHIZZ_RADIUS);
      if (source) enemy.aggro(source.x, source.y);
    }
  }

  override update(): void {
    if (this.gameOver) return;

    if (this.player.active) this.player.update();

    this.alertEnemiesNearBullets();

    for (const enemy of this.enemyGroup.getChildren()) {
      if (enemy.active) (enemy as Enemy).tick(this.player);
    }

    // Считаем живых каждый кадр, но событие даём только на изменение — так HUD не
    // перерисовывает строку 60 раз в секунду, а условие победы читает то же число.
    const alive = this.enemyGroup.countActive(true);
    if (alive !== this.enemiesAlive) {
      this.enemiesAlive = alive;
      emitGameEvent(this.events, ENEMIES_CHANGED, alive);
    }

    if (this.levelHadEnemies && alive === 0) {
      this.gameOver = true;
      this.scene.start(GAME_OVER_SCENE_KEY, { win: true, level: this.levelConfig });
    }

    if (import.meta.env.DEV && this.debugPaths) {
      drawDebugPaths(
        this.pathGraphics,
        this.enemyGroup.getChildren().map((obj) => obj as Enemy),
        this.player,
      );
    }
  }
}
