# MeleeEnemy Pathfinding Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Исправить два бага MeleeEnemy — «встаёт за стеной» и «идёт длинным путём» — сохранив механику потери игрока (SEARCH → IDLE).

**Architecture:** Добавить `invalidatePath()` в базовый Enemy; переписать `tick()` в MeleeEnemy так, чтобы CHASE переходил в SEARCH только по достижении `lastKnownPos`, а не сразу при потере LoS; SEARCH становится паузой с таймаутом.

**Tech Stack:** TypeScript strict, Phaser 4, Biome (lint/format), Vite (build/dev), make (команды).

---

## File Map

| Файл | Действие |
|------|---------|
| `src/config.ts` | Добавить константу `MELEE_SEARCH_TIMEOUT` |
| `src/entities/Enemy.ts` | Добавить публичный метод `invalidatePath()` |
| `src/entities/MeleeEnemy.ts` | Переписать поля и `tick()` |
| `docs/superpowers/specs/2026-05-27-enemy-ai-current-design.md` | Обновить описание MeleeEnemy |

---

### Task 1: Добавить `MELEE_SEARCH_TIMEOUT` в config.ts

**Files:**
- Modify: `src/config.ts`

- [ ] **Step 1: Открыть `src/config.ts` и добавить константу после `MELEE_ENEMY_ATTACK_COOLDOWN`**

Найти строку:
```typescript
export const MELEE_ENEMY_ATTACK_COOLDOWN = 600;
```

Добавить после неё:
```typescript
export const MELEE_SEARCH_TIMEOUT = 1500; // мс ожидания у lastKnownPos перед де-агро
```

- [ ] **Step 2: Проверить типы**

```bash
make typecheck
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 3: Commit**

```bash
rtk git add src/config.ts && rtk git commit -m "feat: add MELEE_SEARCH_TIMEOUT config constant"
```

---

### Task 2: Добавить `invalidatePath()` в `Enemy.ts`

**Files:**
- Modify: `src/entities/Enemy.ts`

Метод сбрасывает `lastPathTarget` к sentinel-значению (-9999, -9999).
Это заставит `moveAlongPath` пересчитать путь при следующем вызове, потому что `targetMoved` будет true (расстояние от реальной цели до (-9999,-9999) всегда > PATH_RECALC_DIST).

- [ ] **Step 1: Добавить метод `invalidatePath()` в `Enemy.ts`**

Найти метод `getLastPathTarget()` (строки ~85-88):
```typescript
  getLastPathTarget(): Phaser.Math.Vector2 | null {
    if (this.lastPathTarget.x === -9999 && this.lastPathTarget.y === -9999) return null;
    return this.lastPathTarget;
  }
```

Добавить после него новый метод:
```typescript
  /**
   * Invalidates the cached path so the next moveAlongPath call
   * unconditionally recalculates. Use when the navigation target changes
   * abruptly (e.g., switching from slot to lastKnownPos on LoS loss).
   */
  invalidatePath(): void {
    this.lastPathTarget.set(-9999, -9999);
    this.waypoints = [];
    this.waypointIndex = 0;
    this.stuckCheckTime = 0;
  }
```

- [ ] **Step 2: Проверить типы**

```bash
make typecheck
```

Ожидаемый результат: 0 ошибок.

- [ ] **Step 3: Commit**

```bash
rtk git add src/entities/Enemy.ts && rtk git commit -m "feat: add Enemy.invalidatePath() for forced path recalc"
```

---

### Task 3: Переписать `MeleeEnemy.ts` — dual-target CHASE и SEARCH-таймаут

**Files:**
- Modify: `src/entities/MeleeEnemy.ts`

**Логика:**
- Добавить поля: `prevLosCache` (отслеживать переход LoS true→false) и `searchEnteredTime` (метка времени входа в SEARCH).
- CHASE: если `losCache` → путь к слоту (как раньше); если LoS только что потерян → `invalidatePath()` + путь к `lastKnownPos`; если уже без LoS, но ещё не добрались → продолжать к `lastKnownPos`; при достижении `lastKnownPos` — перейти в SEARCH.
- SEARCH: стоять, ждать `MELEE_SEARCH_TIMEOUT`; если LoS вернулся → CHASE; если таймаут → IDLE.
- Удалить ненужный импорт `WAYPOINT_REACH_DIST` (он уже используется, оставить) — нет, он нужен.
- Добавить импорт `MELEE_SEARCH_TIMEOUT` и `WAYPOINT_REACH_DIST` (уже есть).

- [ ] **Step 1: Добавить `MELEE_SEARCH_TIMEOUT` в импорт `MeleeEnemy.ts`**

Текущий импорт:
```typescript
import {
  ENEMY_AGGRO_RANGE,
  MELEE_ATTACK_RANGE,
  MELEE_ENEMY_ATTACK_COOLDOWN,
  MELEE_ENEMY_DAMAGE,
  MELEE_ENEMY_HP,
  MELEE_ENEMY_SPEED,
  MELEE_SLOT_RADIUS,
  WAYPOINT_REACH_DIST,
} from "../config";
```

Заменить на:
```typescript
import {
  ENEMY_AGGRO_RANGE,
  MELEE_ATTACK_RANGE,
  MELEE_ENEMY_ATTACK_COOLDOWN,
  MELEE_ENEMY_DAMAGE,
  MELEE_ENEMY_HP,
  MELEE_ENEMY_SPEED,
  MELEE_SEARCH_TIMEOUT,
  MELEE_SLOT_RADIUS,
  WAYPOINT_REACH_DIST,
} from "../config";
```

- [ ] **Step 2: Добавить приватные поля**

Текущие поля класса:
```typescript
  private lastAttackTime = 0;
  private losCache = false;
  private readonly lastKnownPos = new Phaser.Math.Vector2(-9999, -9999);
```

Заменить на:
```typescript
  private lastAttackTime = 0;
  private losCache = false;
  private prevLosCache = false;
  private searchEnteredTime = 0;
  private readonly lastKnownPos = new Phaser.Math.Vector2(-9999, -9999);
```

- [ ] **Step 3: Переписать метод `tick()`**

Текущий `tick()` (строки 33–89):
```typescript
  tick(player: Player): void {
    this.losCache = this.hasLoS(player);
    if (this.losCache) {
      this.lastKnownPos.set(player.x, player.y);
    }
    if (this.checkAndTriggerDodge(player)) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.state) {
      case EnemyState.IDLE:
        this.setVelocity(0, 0);
        if (dist < ENEMY_AGGRO_RANGE && this.losCache) {
          this.scene.events.emit("requestSlot", this);
          this.state = EnemyState.CHASE;
          this.scene.events.emit("packAlert", this.x, this.y);
        }
        break;

      case EnemyState.CHASE: {
        if (!this.losCache) {
          // Если никогда не видели (packAlert без LoS) — взять текущую позицию как fallback
          if (this.lastKnownPos.x === -9999) {
            this.lastKnownPos.set(player.x, player.y);
          }
          this.state = EnemyState.SEARCH;
          break;
        }
        this.moveAlongPath(this.getSlotPos(player), MELEE_ENEMY_SPEED);
        if (dist < MELEE_ATTACK_RANGE) this.state = EnemyState.ATTACK;
        break;
      }

      case EnemyState.SEARCH: {
        if (this.losCache) {
          this.state = EnemyState.CHASE;
          break;
        }
        this.moveAlongPath(this.lastKnownPos, MELEE_ENEMY_SPEED);
        const distToLkp = Phaser.Math.Distance.BetweenPoints(this, this.lastKnownPos);
        if (distToLkp < WAYPOINT_REACH_DIST) {
          this.setVelocity(0, 0);
          this.state = EnemyState.IDLE;
        }
        break;
      }

      case EnemyState.ATTACK:
        this.setVelocity(0, 0);
        this.tryAttack(player);
        if (dist > MELEE_ATTACK_RANGE) this.state = EnemyState.CHASE;
        break;

      default:
        break;
    }
  }
```

Заменить на:
```typescript
  tick(player: Player): void {
    this.prevLosCache = this.losCache;
    this.losCache = this.hasLoS(player);
    if (this.losCache) {
      this.lastKnownPos.set(player.x, player.y);
    }
    if (this.checkAndTriggerDodge(player)) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.state) {
      case EnemyState.IDLE:
        this.setVelocity(0, 0);
        if (dist < ENEMY_AGGRO_RANGE && this.losCache) {
          this.scene.events.emit("requestSlot", this);
          this.state = EnemyState.CHASE;
          this.scene.events.emit("packAlert", this.x, this.y);
        }
        break;

      case EnemyState.CHASE: {
        if (this.losCache) {
          // Есть прямая видимость — идём к слоту (флангирующая позиция)
          this.moveAlongPath(this.getSlotPos(player), MELEE_ENEMY_SPEED);
          if (dist < MELEE_ATTACK_RANGE) this.state = EnemyState.ATTACK;
        } else {
          // LoS потерян — идём к последней известной позиции игрока
          if (this.lastKnownPos.x === -9999) {
            // Агро пришло через packAlert — брать текущую позицию как fallback
            this.lastKnownPos.set(player.x, player.y);
          }
          // При только что потерянном LoS — принудительно пересчитать путь,
          // чтобы не использовать устаревший маршрут к слоту
          if (this.prevLosCache) {
            this.invalidatePath();
          }
          this.moveAlongPath(this.lastKnownPos, MELEE_ENEMY_SPEED);
          // Переходим в SEARCH только когда физически добрались до lastKnownPos
          const distToLkp = Phaser.Math.Distance.BetweenPoints(this, this.lastKnownPos);
          if (distToLkp < WAYPOINT_REACH_DIST) {
            this.searchEnteredTime = this.scene.time.now;
            this.state = EnemyState.SEARCH;
          }
        }
        break;
      }

      case EnemyState.SEARCH: {
        // Добрались до lastKnownPos, но игрока не видим — ждём и смотрим
        if (this.losCache) {
          this.state = EnemyState.CHASE;
          break;
        }
        this.setVelocity(0, 0);
        if (this.scene.time.now - this.searchEnteredTime >= MELEE_SEARCH_TIMEOUT) {
          this.state = EnemyState.IDLE;
        }
        break;
      }

      case EnemyState.ATTACK:
        this.setVelocity(0, 0);
        this.tryAttack(player);
        if (dist > MELEE_ATTACK_RANGE) this.state = EnemyState.CHASE;
        break;

      default:
        break;
    }
  }
```

- [ ] **Step 4: Проверить типы и линтер**

```bash
make typecheck && make check
```

Ожидаемый результат: 0 ошибок TypeScript, 0 ошибок Biome.
Если Biome выдаёт предупреждения о форматировании — исправить: `make format`.

- [ ] **Step 5: Commit**

```bash
rtk git add src/entities/MeleeEnemy.ts && rtk git commit -m "fix: dual-target CHASE and SEARCH timeout for MeleeEnemy"
```

---

### Task 4: Обновить спецификацию AI врагов

**Files:**
- Modify: `docs/superpowers/specs/2026-05-27-enemy-ai-current-design.md`

- [ ] **Step 1: Обновить секцию MeleeEnemy**

Найти секцию `## MeleeEnemy (ближний бой)` и заменить описание состояний CHASE и SEARCH.

Старый текст:
```markdown
**CHASE** — идёт к своему слоту (30 px от игрока) по A\*. Обновляет `lastKnownPos` каждый тик, пока видит игрока. При потере LoS — переходит в SEARCH. При дистанции ≤ 50 px — переходит в ATTACK.

**SEARCH** — идёт к последней известной позиции игрока (`lastKnownPos`). Если LoS восстановился — возвращается в CHASE. Если достиг `lastKnownPos` (ближе 24 px) и игрока там нет — де-агрится в IDLE.
```

Новый текст:
```markdown
**CHASE** — два режима в зависимости от LoS:
- *LoS есть* → идёт к своему слоту (30 px от игрока) по A\*. Обновляет `lastKnownPos` каждый тик. При дистанции ≤ 50 px → ATTACK.
- *LoS потерян* → принудительно пересчитывает путь (`invalidatePath()`) и идёт к `lastKnownPos` по A\*. Как только достиг `lastKnownPos` (ближе 24 px) → SEARCH.

**SEARCH** — враг добрался до `lastKnownPos`, но не видит игрока. Стоит на месте, ждёт `MELEE_SEARCH_TIMEOUT` (1500 мс). Если за это время LoS восстановился — возвращается в CHASE. Если таймаут истёк — де-агрится в IDLE.
```

- [ ] **Step 2: Обновить диаграмму переходов в конце файла**

Найти:
```
MeleeEnemy:
  IDLE ──(dist < 250)──> CHASE ──(dist ≤ 50)──> ATTACK
                          ↑                        │
                          └──────(dist > 50)───────┘
  Любое (кроме IDLE) ←──(dodge cooldown)──> DODGE ──(300мс)──> предыдущее
```

Заменить на:
```
MeleeEnemy:
  IDLE ──(dist < 250 && LoS)──> CHASE
  CHASE (LoS)  ──(dist ≤ 50)──> ATTACK
  CHASE (!LoS) ──(достиг lastKnownPos)──> SEARCH
  ATTACK ──(dist > 50)──> CHASE
  SEARCH ──(LoS вернулся)──> CHASE
         ──(1500 мс)──> IDLE
  Любое (кроме IDLE) + LoS ←──> DODGE ──(300мс)──> предыдущее
```

- [ ] **Step 3: Commit**

```bash
rtk git add docs/superpowers/specs/2026-05-27-enemy-ai-current-design.md && rtk git commit -m "docs: update MeleeEnemy AI spec with dual-target CHASE and SEARCH timeout"
```

---

### Task 5: Ручная проверка в браузере

Автотестов нет — проверка через dev-сервер.

- [ ] **Step 1: Запустить dev-сервер**

```bash
make dev
```

Открыть http://localhost:5173, выбрать **Level 1** (основной уровень с 4 melee + 2 shooter).

- [ ] **Step 2: Проверить баг 1 — «встаёт за стеной»**

1. Заагрить mili-врага (подойти на расстояние видимости)
2. Зайти за стену так, чтобы враг потерял LoS
3. Стоять за стеной

**Ожидаемое поведение:** враг должен обойти стену и попытаться добраться до точки, где последний раз видел игрока, затем кратко постоять (1–1.5 сек) и де-агриться, если не нашёл.

**Было (баг):** враг сразу уходил в SEARCH и мог "встать" у стены, не двигаясь.

- [ ] **Step 3: Проверить баг 2 — «длинный путь»**

1. Заагрить врага
2. Быстро зайти за ближайший угол

**Ожидаемое поведение:** враг идёт за игроком коротким путём через ближайший проём/угол.

**Было (баг):** враг иногда огибал длинным маршрутом, т.к. путь к слоту не пересчитывался.

- [ ] **Step 4: Проверить уровень Level 4 (melee dojo, если существует)**

В `LevelSelectScene` выбрать уровень с mili-врагами и препятствиями (уровень 4 — melee dojo согласно roadmap). Повторить шаги 2–3.

- [ ] **Step 5: Проверить что ShooterEnemy не сломан**

Выбрать уровень с шутерами (Level 5 — shooter range) и убедиться, что их поведение не изменилось.

- [ ] **Step 6: Финальный коммит (если есть незафиксированные изменения)**

```bash
rtk git status
```

Если чисто — всё сделано. Если есть незафиксированные изменения — разобраться.

---

## Итог

После завершения всех задач:
- MeleeEnemy корректно обходит препятствия в CHASE при потере LoS
- SEARCH активируется только когда враг физически добрался до `lastKnownPos`
- Механика потери игрока сохранена: SEARCH → IDLE через 1500 мс
- Спецификация AI обновлена
