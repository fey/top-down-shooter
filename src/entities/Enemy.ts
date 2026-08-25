import Phaser from "phaser";
import { type ChaseNavTarget, chaseDecision } from "../ai/behaviors/navigation";
import { anyWallBlocks } from "../ai/geometry";
import type { Vec2 } from "../ai/grid";
import type { NavGoal } from "../ai/PathFollower";
import { PathFollower } from "../ai/PathFollower";
import type { Pathfinder } from "../ai/Pathfinder";
import { ENEMY_BODY_RADIUS, ENEMY_SPRITE_SCALE } from "../config";
import type { WallDef } from "../types";
import type { Player } from "./Player";

/**
 * Состояния автомата поведения. Только те, что кому-то присваиваются: стрейф и уклонение
 * состояниями не являются — это действия внутри SHOOT (kiteAction, evaluateDodge), и
 * значение перечисления под них врало бы о модели поведения при чтении AI.
 */
export enum EnemyState {
  IDLE = "IDLE",
  PATROL = "PATROL",
  CHASE = "CHASE",
  ATTACK = "ATTACK",
  SHOOT = "SHOOT",
  SEARCH = "SEARCH",
}

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  override state: EnemyState = EnemyState.IDLE;
  protected pathfinder: Pathfinder | null = null;
  protected walls: WallDef[] | null = null;
  /** LoS к игроку, кэшируется наследниками в начале каждого tick(). */
  protected losCache = false;
  /** LoS на прошлом тике: по фронту «было → нет» решается пересчёт пути. */
  protected prevLosCache = false;

  /** Последняя позиция, где игрок был виден. Заполняется через rememberLastKnown(). */
  protected readonly lastKnownPos = new Phaser.Math.Vector2();
  protected hasLastKnown = false;

  // Боковое маневрирование (circle-strafe) — общее для стреляющих врагов.
  protected strafeSign = 1;
  protected strafeFlipTime = 0;

  /**
   * Следование по маршруту — отдельный владелец состояния, а не protected-поля базы.
   * null до setPathfinder: без карты враг идёт к цели напрямую.
   */
  private follower: PathFollower | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, hp: number) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(ENEMY_SPRITE_SCALE);
    const r = ENEMY_BODY_RADIUS;
    this.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    this.hp = hp;
  }

  setPathfinder(pf: Pathfinder): void {
    this.pathfinder = pf;
    this.follower = new PathFollower(pf);
  }

  setWalls(walls: WallDef[]): void {
    this.walls = walls;
  }

  protected hasLoS(player: Player): boolean {
    if (this.walls === null) return true;
    return !anyWallBlocks(this.x, this.y, player.x, player.y, this.walls);
  }

  /**
   * Снимок видимости на начало тика: сдвигает прошлое значение, пересчитывает текущее и,
   * если игрок виден, запоминает его позицию. Один вызов вместо трёх строк в каждом
   * наследнике — иначе легко забыть сдвинуть prevLosCache и потерять фронт потери LoS.
   */
  protected refreshLoS(player: Player): void {
    this.prevLosCache = this.losCache;
    this.losCache = this.hasLoS(player);
    if (this.losCache) {
      this.rememberLastKnown(player.x, player.y);
    }
  }

  /** Текущее закэшированное LoS-состояние — для дебаг-отрисовки. */
  getLosToPlayer(): boolean {
    return this.losCache;
  }

  /** Оставшиеся вейпоинты — для debug-оверлея. */
  getRemainingWaypoints(): Vec2[] {
    return this.follower?.remainingWaypoints() ?? [];
  }

  getLastPathTarget(): Vec2 | null {
    return this.follower?.pathTarget() ?? null;
  }

  /**
   * Агро извне: враг узнал о противнике, не увидев его — по попаданию или по
   * пуле, прошедшей рядом. Целью становится точка выстрела: враг идёт разбираться туда,
   * откуда стреляли, а не к игроку напрямую — иначе стрельба из-за угла давала бы врагу
   * знание, которого у него нет.
   *
   * Срабатывает только в состояниях, где враг ещё не в бою: уже преследующему или
   * стреляющему агро не нужно, а сброс цели сбил бы ему текущий манёвр.
   */
  aggro(sourceX: number, sourceY: number): void {
    const unaware =
      this.state === EnemyState.IDLE ||
      this.state === EnemyState.PATROL ||
      this.state === EnemyState.SEARCH;
    if (!unaware) return;
    this.rememberLastKnown(sourceX, sourceY);
    // Цель прыгнула, не меняя вида: последняя известная позиция переехала в точку
    // выстрела. Смену вида follower ловит сам, а такой прыжок — нет.
    this.follower?.reset();
    this.state = EnemyState.CHASE;
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.destroy();
    }
  }

  /** Запоминает последнюю известную позицию игрока (вызывать, когда есть LoS). */
  protected rememberLastKnown(x: number, y: number): void {
    this.lastKnownPos.set(x, y);
    this.hasLastKnown = true;
  }

  /** Поворачивает спрайт лицом к точке (восток спрайта = угол 0). */
  protected faceTarget(x: number, y: number): void {
    this.setRotation(Phaser.Math.Angle.Between(this.x, this.y, x, y));
  }

  /** Отступление по прямой от игрока, не разворачиваясь. */
  protected retreatFrom(player: Player, speed: number): void {
    const away = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
    this.setVelocity(Math.cos(away) * speed, Math.sin(away) * speed);
  }

  /**
   * Стрейф: движение перпендикулярно направлению на игрока со сменой стороны.
   * Знак направления переворачивается каждые flipPeriodMs мс.
   */
  protected applyStrafe(player: Player, speed: number, flipPeriodMs: number, now: number): void {
    if (now >= this.strafeFlipTime) {
      this.strafeSign *= -1;
      this.strafeFlipTime = now + flipPeriodMs;
    }
    const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const perp = angleToPlayer + this.strafeSign * (Math.PI / 2);
    this.setVelocity(Math.cos(perp) * speed, Math.sin(perp) * speed);
  }

  /**
   * Идти к цели: снимок в follower, скорость — на тело. Вид цели (`goal`) важнее её
   * координат — по его смене follower сам пересчитывает маршрут, поэтому наследникам
   * больше не нужно помнить про инвалидацию пути.
   */
  protected navigateTo(goal: NavGoal, target: Vec2, speed: number): void {
    if (!this.follower) {
      // Карты нет (враг создан без pathfinder) — идём напрямую.
      const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      return;
    }
    const v = this.follower.follow({
      x: this.x,
      y: this.y,
      goal,
      target,
      speed,
      now: this.scene.time.now,
    });
    this.setVelocity(v.x, v.y);
  }

  /**
   * Куда идти в CHASE. Решение чистое (`chaseDecision`), здесь только применение той
   * его части, которая трогает состояние врага: подмена пустой последней известной
   * позиции. Само движение оставлено наследнику — у melee и стрелка оно разное.
   */
  protected chaseTarget(player: Player): ChaseNavTarget {
    const nav = chaseDecision({ hasLos: this.losCache, hasLastKnown: this.hasLastKnown });
    if (nav.adoptPlayerAsLastKnown) this.rememberLastKnown(player.x, player.y);
    return nav.target;
  }

  abstract tick(player: Player): void;
}
