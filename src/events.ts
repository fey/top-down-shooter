import type Phaser from "phaser";

/**
 * Имена и полезные нагрузки событий боя — один модуль на эмитентов и подписчиков.
 *
 * Раньше имена жили строковыми литералами в разных файлах: сущность эмитила «hpChanged»,
 * HUD подписывался на «hpChanged», и опечатка на одной стороне не ломала ни typecheck, ни
 * тесты — HUD просто молча перестал бы обновляться. Единственная защита от этого — чтобы
 * имя существовало в одном месте, а обе стороны его импортировали.
 *
 * Модуль верхнего уровня, а не в `scenes/`: события эмитят и сущности (`Player`, враги),
 * а импорт из `entities/` в `scenes/` перевернул бы зависимость — сущности не знают о сценах.
 */

export const HP_CHANGED = "hpChanged";
export const WEAPON_CHANGED = "weaponChanged";
export const ENEMIES_CHANGED = "enemiesChanged";
export const PLAYER_DIED = "playerDied";
export const PACK_ALERT = "packAlert";

/** Аргументы каждого события — ровно те, что уходят в emit и приходят в обработчик. */
export interface GameEventPayloads {
  /** Новое HP игрока. */
  [HP_CHANGED]: [hp: number];
  /** Человекочитаемое имя подобранного оружия — его показывает HUD. */
  [WEAPON_CHANGED]: [weaponName: string];
  /** Сколько врагов осталось живыми. */
  [ENEMIES_CHANGED]: [alive: number];
  [PLAYER_DIED]: [];
  /** Координаты врага, поднявшего тревогу: соседи в радиусе агрятся от этой точки. */
  [PACK_ALERT]: [x: number, y: number];
}

export type GameEvent = keyof GameEventPayloads;

/**
 * Обёртки над эмиттером Phaser существуют ради нагрузки, а не ради имени: сам
 * `EventEmitter` принимает `...args: any[]`, поэтому лишний или не тот аргумент проходил
 * бы молча. Через эти функции и имя, и аргументы проверяет typecheck.
 */
export function emitGameEvent<K extends GameEvent>(
  emitter: Phaser.Events.EventEmitter,
  event: K,
  ...args: GameEventPayloads[K]
): void {
  emitter.emit(event, ...args);
}

export function onGameEvent<K extends GameEvent>(
  emitter: Phaser.Events.EventEmitter,
  event: K,
  handler: (...args: GameEventPayloads[K]) => void,
): void {
  emitter.on(event, handler);
}

export function onceGameEvent<K extends GameEvent>(
  emitter: Phaser.Events.EventEmitter,
  event: K,
  handler: (...args: GameEventPayloads[K]) => void,
): void {
  emitter.once(event, handler);
}

export function offGameEvent<K extends GameEvent>(
  emitter: Phaser.Events.EventEmitter,
  event: K,
  handler: (...args: GameEventPayloads[K]) => void,
): void {
  emitter.off(event, handler);
}
