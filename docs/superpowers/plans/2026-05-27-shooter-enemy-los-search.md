# ShooterEnemy LoS/SEARCH State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Исправить логику ShooterEnemy — враг агрится только с прямой видимостью (LoS), при её потере идёт к последней известной позиции игрока (SEARCH state), затем возвращается в IDLE если не нашёл.

**Architecture:** Добавить `EnemyState.SEARCH` в базовый enum; в `ShooterEnemy` хранить `lastKnownPos` (обновляется каждый тик при наличии LoS) и реализовать SEARCH-кейс в `tick()`. IDLE-агро получает проверку LoS. SHOOT при потере LoS переходит в SEARCH вместо CHASE.

**Tech Stack:** TypeScript strict, Phaser 3 Arcade Physics, существующий `Pathfinder`/`moveAlongPath`.

---

### Task 1: Добавить SEARCH в EnemyState

**Files:**
- Modify: `src/entities/Enemy.ts`

- [ ] **Step 1: Добавить SEARCH в enum**

В файле `src/entities/Enemy.ts` найти:
```ts
export enum EnemyState {
  IDLE = "IDLE",
  CHASE = "CHASE",
  ATTACK = "ATTACK",
  SHOOT = "SHOOT",
  STRAFE = "STRAFE",
  DODGE = "DODGE",
}
```
Заменить на:
```ts
export enum EnemyState {
  IDLE = "IDLE",
  CHASE = "CHASE",
  ATTACK = "ATTACK",
  SHOOT = "SHOOT",
  STRAFE = "STRAFE",
  DODGE = "DODGE",
  SEARCH = "SEARCH",
}
```

- [ ] **Step 2: Убедиться что tsc не падает**

```bash
make typecheck
```
Ожидаемый результат: no errors (новый стейт нигде не обрабатывается — это ок, switch в ShooterEnemy падает в `default`).

- [ ] **Step 3: Commit**

```bash
rtk git add src/entities/Enemy.ts && rtk git commit -m "feat(ai): add SEARCH state to EnemyState"
```

---

### Task 2: Поле lastKnownPos + обновление в tick

**Files:**
- Modify: `src/entities/ShooterEnemy.ts`

- [ ] **Step 1: Добавить поле lastKnownPos**

В `ShooterEnemy` после `private strafeFlipTime = 0;` добавить:
```ts
private readonly lastKnownPos = new Phaser.Math.Vector2(-9999, -9999);
private hasSeenPlayer = false;
```

- [ ] **Step 2: Обновлять lastKnownPos в начале tick()**

В начале метода `tick(player: Player)`, сразу после строки:
```ts
if (this.checkAndTriggerDodge(player)) return;
```
добавить:
```ts
if (this.hasLoS(player)) {
  this.lastKnownPos.set(player.x, player.y);
  this.hasSeenPlayer = true;
}
```

- [ ] **Step 3: Проверить typecheck**

```bash
make typecheck
```
Ожидаемый результат: no errors.

- [ ] **Step 4: Commit**

```bash
rtk git add src/entities/ShooterEnemy.ts && rtk git commit -m "feat(ai): track last known player position in ShooterEnemy"
```

---

### Task 3: IDLE — агро только с LoS

**Files:**
- Modify: `src/entities/ShooterEnemy.ts`

- [ ] **Step 1: Добавить hasLoS в условие агро**

Найти блок:
```ts
case EnemyState.IDLE:
  this.setVelocity(0, 0);
  if (dist < ENEMY_AGGRO_RANGE) {
    this.scene.events.emit("requestSlot", this);
    this.state = EnemyState.CHASE;
    this.scene.events.emit("packAlert", this.x, this.y);
  }
  break;
```
Заменить на:
```ts
case EnemyState.IDLE:
  this.setVelocity(0, 0);
  if (dist < ENEMY_AGGRO_RANGE && this.hasLoS(player)) {
    this.scene.events.emit("requestSlot", this);
    this.state = EnemyState.CHASE;
    this.scene.events.emit("packAlert", this.x, this.y);
  }
  break;
```

- [ ] **Step 2: Проверить typecheck**

```bash
make typecheck
```
Ожидаемый результат: no errors.

- [ ] **Step 3: Ручная проверка в браузере**

```bash
make dev
```
Открыть игру. Встать за стену рядом с ShooterEnemy (синим) — враг не должен агриться. Выйти на линию видимости — должен агриться.

- [ ] **Step 4: Commit**

```bash
rtk git add src/entities/ShooterEnemy.ts && rtk git commit -m "fix(ai): ShooterEnemy aggroes only with LoS in IDLE"
```

---

### Task 4: SHOOT — переход в SEARCH при потере LoS

**Files:**
- Modify: `src/entities/ShooterEnemy.ts`

- [ ] **Step 1: Заменить переход SHOOT→CHASE на SHOOT→SEARCH**

Найти в `case EnemyState.SHOOT`:
```ts
// FUTURE: re-enable strafe when polished
// if (!this.hasLoS(player)) this.enterStrafe(now);
if (!this.hasLoS(player)) this.state = EnemyState.CHASE;
if (dist > SHOOTER_RANGE) this.state = EnemyState.CHASE;
```
Заменить на:
```ts
if (!this.hasLoS(player)) {
  this.state = EnemyState.SEARCH;
  break;
}
if (dist > SHOOTER_RANGE) this.state = EnemyState.CHASE;
```

Обратить внимание: `break` здесь важен — прерывает весь case до проверки dist, чтобы не конфликтовать.

- [ ] **Step 2: Проверить typecheck**

```bash
make typecheck
```
Ожидаемый результат: no errors.

- [ ] **Step 3: Commit**

```bash
rtk git add src/entities/ShooterEnemy.ts && rtk git commit -m "fix(ai): ShooterEnemy transitions to SEARCH on LoS loss in SHOOT"
```

---

### Task 5: CHASE — переход в SEARCH при потере LoS

**Files:**
- Modify: `src/entities/ShooterEnemy.ts`

- [ ] **Step 1: Добавить переход CHASE→SEARCH**

Найти блок `case EnemyState.CHASE`:
```ts
case EnemyState.CHASE: {
  const target = this.getSlotPos(player);
  this.moveAlongPath(target, SHOOTER_ENEMY_SPEED);
  if (dist <= SHOOTER_RANGE) {
    if (this.hasLoS(player)) {
      this.state = EnemyState.SHOOT;
    } else {
      // FUTURE: re-enable strafe when polished
      // this.enterStrafe(now);
    }
  }
  break;
}
```
Заменить на:
```ts
case EnemyState.CHASE: {
  if (this.hasSeenPlayer && !this.hasLoS(player)) {
    this.state = EnemyState.SEARCH;
    break;
  }
  const target = this.getSlotPos(player);
  this.moveAlongPath(target, SHOOTER_ENEMY_SPEED);
  if (dist <= SHOOTER_RANGE && this.hasLoS(player)) {
    this.state = EnemyState.SHOOT;
  }
  break;
}
```

Пояснение: `hasSeenPlayer` гарантирует, что враг не уходит в SEARCH сразу при старте CHASE до первого контакта с игроком (на случай pack-alert без LoS).

- [ ] **Step 2: Проверить typecheck**

```bash
make typecheck
```
Ожидаемый результат: no errors.

- [ ] **Step 3: Commit**

```bash
rtk git add src/entities/ShooterEnemy.ts && rtk git commit -m "fix(ai): ShooterEnemy transitions to SEARCH on LoS loss in CHASE"
```

---

### Task 6: Реализовать SEARCH state

**Files:**
- Modify: `src/entities/ShooterEnemy.ts`

- [ ] **Step 1: Добавить import WAYPOINT_REACH_DIST**

Найти в импортах `ShooterEnemy.ts`:
```ts
import {
  ENEMY_AGGRO_RANGE,
  SHOOTER_BULLET_SPEED,
  SHOOTER_ENEMY_DAMAGE,
  SHOOTER_ENEMY_FIRE_COOLDOWN,
  SHOOTER_ENEMY_HP,
  SHOOTER_ENEMY_SPEED,
  SHOOTER_KITE_ADVANCE_DIST,
  SHOOTER_KITE_RETREAT_DIST,
  SHOOTER_RANGE,
} from "../config";
```
Заменить на:
```ts
import {
  ENEMY_AGGRO_RANGE,
  SHOOTER_BULLET_SPEED,
  SHOOTER_ENEMY_DAMAGE,
  SHOOTER_ENEMY_FIRE_COOLDOWN,
  SHOOTER_ENEMY_HP,
  SHOOTER_ENEMY_SPEED,
  SHOOTER_KITE_ADVANCE_DIST,
  SHOOTER_KITE_RETREAT_DIST,
  SHOOTER_RANGE,
  WAYPOINT_REACH_DIST,
} from "../config";
```

- [ ] **Step 2: Добавить case SEARCH в switch**

В методе `tick()`, перед `default:` добавить:
```ts
case EnemyState.SEARCH: {
  if (this.hasLoS(player)) {
    this.state = EnemyState.CHASE;
    break;
  }
  this.moveAlongPath(this.lastKnownPos, SHOOTER_ENEMY_SPEED);
  const distToLkp = Phaser.Math.Distance.BetweenPoints(this, this.lastKnownPos);
  if (distToLkp < WAYPOINT_REACH_DIST) {
    this.setVelocity(0, 0);
    this.hasSeenPlayer = false;
    this.state = EnemyState.IDLE;
  }
  break;
}
```

- [ ] **Step 3: Проверить typecheck**

```bash
make typecheck
```
Ожидаемый результат: no errors.

- [ ] **Step 4: Проверить lint**

```bash
make check
```
Ожидаемый результат: no errors/warnings.

- [ ] **Step 5: Commit**

```bash
rtk git add src/entities/ShooterEnemy.ts && rtk git commit -m "feat(ai): implement SEARCH state for ShooterEnemy"
```

---

### Task 7: Ручная проверка полного сценария

- [ ] **Step 1: Запустить dev-сервер**

```bash
make dev
```

- [ ] **Step 2: Сценарий 1 — агро за стеной**

Встать за стеной рядом с ShooterEnemy. Убедиться что враг остаётся в IDLE (не движется). Выйти на открытое место — враг должен агриться.

- [ ] **Step 3: Сценарий 2 — потеря LoS в SHOOT**

Зайти в зону видимости врага, дать ему начать стрелять (SHOOT state). Зайти за стену — враг должен пойти к последней позиции, где видел игрока. Если игрок там не стоит — вернуться в IDLE.

- [ ] **Step 4: Сценарий 3 — восстановление LoS во время SEARCH**

Враг идёт к LKP (SEARCH) — выйти ему навстречу в зону видимости. Враг должен переключиться обратно в CHASE и продолжить преследование.

- [ ] **Step 5: Сценарий 4 — packAlert**

Убить одного врага рядом с другим ShooterEnemy за стеной. packAlert должен агрить врага даже без LoS (это корректное поведение — он уже знает об игроке через "звук"). Проверить что после packAlert враг идёт в CHASE, а не застревает в SEARCH сразу (благодаря флагу `hasSeenPlayer`).

- [ ] **Step 6: Финальный commit + push**

```bash
rtk git push
```
