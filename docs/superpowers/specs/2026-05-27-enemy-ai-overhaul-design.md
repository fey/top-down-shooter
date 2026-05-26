# Enemy AI Overhaul — Design Spec

**Date:** 2026-05-27  
**Status:** Approved

## Context

Текущие враги двигаются примитивно: MeleeEnemy летит напрямую к игроку, ShooterEnemy замирает при потере LoS. Враги застревают в углах, предсказуемы и не дают ощущения опасности. Задача — добавить стейт-машину, слот-фланкирование, pack alert и уклон от прицела, не вводя pathfinding.

---

## Стейт-машина

Каждый враг получает поле `state: EnemyState`. `tick()` становится диспетчером состояний.

**MeleeEnemy:** `IDLE → CHASE → ATTACK`, плюс `DODGE` как прерывающее состояние  
**ShooterEnemy:** `IDLE → CHASE → SHOOT → STRAFE`, плюс `DODGE`

| Состояние | Описание |
|-----------|----------|
| `IDLE`    | Стоит. Проверяет агро-радиус. При обнаружении игрока — CHASE + pack alert |
| `CHASE`   | Движется к слоту вокруг игрока (см. ниже) |
| `ATTACK`  | *(melee)* Стоит, наносит урон при `dist < MELEE_ATTACK_RANGE` |
| `SHOOT`   | *(shooter)* Стоит, стреляет при наличии LoS |
| `STRAFE`  | *(shooter)* Двигается перпендикулярно к игроку, ища LoS |
| `DODGE`   | Короткий рывок перпендикулярно прицелу (~0.3 с), возврат в `prevState` |

---

## Слот-фланкирование

Вокруг игрока 8 слотов через 45°. При входе в CHASE враг занимает ближайший свободный слот своего кольца и движется к позиции этого слота.

- **MeleeEnemy** → внутреннее кольцо, `MELEE_SLOT_RADIUS` = 30px (угол подхода важнее радиуса)
- **ShooterEnemy** → внешнее кольцо, радиус = `SHOOTER_RANGE` = 350px

`SlotCoordinator` в `GameScene` хранит `Map<Enemy, slotIndex>`:
- `assignSlot(enemy, player)` — берёт текущий угол от игрока до врага, находит ближайший свободный слот, записывает `enemy.flankAngle`
- `releaseSlot(enemy)` — вызывается при смерти врага

Позиция слота пересчитывается каждый тик, поэтому враги "ведут" за движущимся игроком.

---

## Pack Alert

При переходе любого врага из IDLE → CHASE он эмитит:
```typescript
this.scene.events.emit('enemyAlert', this.x, this.y);
```

`GameScene` подписывается в `create()` и будит всех IDLE-врагов в радиусе `PACK_ALERT_RADIUS` от точки алерта, назначая каждому слот.

---

## Уклон от прицела (Dodge)

Каждый тик не-IDLE враг проверяет через `checkAndTriggerDodge(player)`:

1. Угол прицела игрока (`player.rotation - π/2`) совпадает с направлением на врага в пределах `DODGE_ANGLE_THRESHOLD` (~25°)?
2. Прошёл `DODGE_COOLDOWN` (1500 мс) с последнего уклона?

Если оба условия:
- Сохранить `prevState`, записать `lastDodgeTime`
- Случайно выбрать направление уклона (+90° или −90° от линии прицела)
- Перейти в `DODGE`
- Через `DODGE_DURATION` (300 мс) — вернуть `prevState`

Метод возвращает `true` если текущее состояние `DODGE` → подкласс пропускает свой тик.

---

## Wall Avoidance

При каждом шаге движения к углу добавляется случайный джиттер `±MOVE_JITTER` (~±10°). Предотвращает залипание в углах без pathfinding.

---

## Изменения в коде

### `src/config.ts` — новые константы
```
ENEMY_AGGRO_RANGE      = 250
PACK_ALERT_RADIUS      = 300
MELEE_ATTACK_RANGE     = 50
MELEE_SLOT_RADIUS      = 30
DODGE_COOLDOWN         = 1500
DODGE_DURATION         = 300
DODGE_ANGLE_THRESHOLD  = 0.44   // ~25°
DODGE_SPEED_MULT       = 1.8
MOVE_JITTER            = 0.17   // ~10°
```

### `src/entities/Enemy.ts`
- Добавить `export enum EnemyState { IDLE, CHASE, ATTACK, SHOOT, STRAFE, DODGE }`
- Поля: `state`, `prevState`, `flankAngle`, `flankRadius`, `lastDodgeTime`, `dodgeEndTime`, `dodgeDir: Phaser.Math.Vector2`
- `getSlotPosition(player)` → `Phaser.Math.Vector2`
- `checkAndTriggerDodge(player): boolean`
- `applyJitter(angle): number`
- `takeDamage` эмитит `'enemyDied'` перед `destroy()`

### `src/entities/MeleeEnemy.ts`
Переписать `tick()` как стейт-машину. IDLE → CHASE → ATTACK, проверка dodge в начале.

### `src/entities/ShooterEnemy.ts`
Переписать `tick()` как стейт-машину. IDLE → CHASE → SHOOT ↔ STRAFE, проверка dodge в начале.  
STRAFE: вектор движения перпендикулярен линии игрок→враг; через ~1 с без LoS меняет сторону.

### `src/scenes/GameScene.ts`
- Добавить `SlotCoordinator` (inline класс или отдельный файл `src/ai/SlotCoordinator.ts`)
- Подписаться на `'enemyAlert'` и `'enemyDied'`
- **Убрать** существующий overlap-колбэк `melee↔player` — атака теперь управляется изнутри `tick()`

---

## Порядок реализации

1. `src/config.ts` — добавить константы
2. `src/entities/Enemy.ts` — enum, поля, вспомогательные методы
3. `src/scenes/GameScene.ts` — `SlotCoordinator`, подписки на события
4. `src/entities/MeleeEnemy.ts` — стейт-машина
5. `src/entities/ShooterEnemy.ts` — стейт-машина

---

## Верификация

- `make typecheck` — 0 ошибок TypeScript
- `make check` — Biome без нарушений
- В браузере (`make dev`):
  - Враги стоят IDLE пока игрок далеко
  - Подойти к одному → он и соседи в радиусе 300px переходят в CHASE с разных углов
  - Навестись прицелом на врага → рывок вбок (~0.3 с), возврат к поведению
  - ShooterEnemy за стеной → страфится, ищет линию прицела
  - Враги не залипают намертво в углах
