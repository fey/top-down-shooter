# Top-Down Shooter — спецификация (текущее состояние)

Браузерный прототип top-down шутера: один статичный уровень, два типа врагов, одно оружие. Этот документ описывает **то, что реализовано сейчас**. Оставшаяся работа — в [`docs/roadmap.md`](roadmap.md).

## Стек

- **Phaser 4** (4.1.0) — 2D-движок.
- **TypeScript** в строгом режиме (`strict: true`).
- **Vite** — dev-сервер и сборка.
- **Biome** — линт и форматирование (вместо ESLint + Prettier), единый `biome.json`.

## Команды

```bash
make install    # npm ci
make dev        # Vite dev server
make build      # tsc + vite build
make preview    # vite preview
make check      # Biome lint + format check
make format     # Biome format --write
make typecheck  # tsc --noEmit
make clean      # rm -rf dist
```

## Структура файлов

```
top-down-shooter/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  biome.json
  Makefile
  public/
    assets/
      sprites/        # спрайты Kenney
  src/
    main.ts           # точка входа, конфиг Phaser
    config.ts         # все числовые параметры (HP, урон, скорости, AI)
    scenes/
      BootScene.ts         # точка входа, запускает PreloadScene
      PreloadScene.ts      # генерирует текстуры процедурно (Phaser Graphics)
      LevelSelectScene.ts  # выбор уровня (Level 1 / Level 2)
      GameScene.ts         # основная игровая сцена
      GameOverScene.ts     # экран победы/поражения
    entities/
      Player.ts            # игрок: движение, прицеливание, стрельба, HP
      Enemy.ts             # базовый класс: state machine, dodge, pathfinding
      MeleeEnemy.ts        # ближний бой: преследует, бьёт при контакте
      ShooterEnemy.ts      # дальний бой: LoS, SEARCH, стрельба, кайтинг
      Bullet.ts            # снаряд с TTL и коллизиями
    weapons/
      Weapon.ts            # базовый класс: кулдаун, спавн пуль
      Pistol.ts            # единственное оружие (пока)
    ai/
      Pathfinder.ts        # A* pathfinding по сетке с обходом стен
      SlotCoordinator.ts   # распределяет 8 позиций флангирования вокруг игрока
    level/
      level1.ts            # боевой уровень: стены, 4 melee + 2 shooter врага
      level2.ts            # тренировочный уровень: только стены периметра, без врагов
    debug/
      DebugOverlay.ts      # оверлей: FPS, HP, позиция, состояния врагов
```

## Архитектура

### Поток сцен

```
Boot → Preload → LevelSelect → Game → GameOver
```

- **BootScene** — точка входа, немедленно запускает PreloadScene.
- **PreloadScene** — генерирует все текстуры через `Phaser.GameObjects.Graphics` (спрайты не загружаются из файлов). После завершения — LevelSelectScene.
- **LevelSelectScene** — меню с двумя уровнями, клавиши 1/2 или клик.
- **GameScene** — главная сцена. Читает данные уровня из `level/level*.ts`, создаёт игрока, врагов, стены, управляет коллизиями. ESC → LevelSelect, F1 → debug path overlay.
- **GameOverScene** — финальный экран с текстом WIN/LOSE. Для рестарта — обновление страницы (или ESC/клик для перехода к выбору уровня — реализовано частично).

### Игрок (`Player`)

Sprite + Arcade Physics body. Управление: WASD (нормализованный вектор), мышь — прицеливание, ЛКМ — стрельба. Хранит HP и текущее оружие (сейчас только `Pistol`). При смерти эмитирует событие в GameScene.

### Оружие (`Weapon / Pistol`)

Интерфейс `tryFire(scene, owner, targetVec)`. Pistol: одна пуля в направлении курсора, кулдаун 250 мс, скорость пули 600 px/s. Shotgun не реализован.

### Враги

**Базовый класс `Enemy`:**
- State machine: `IDLE → CHASE → ATTACK / SHOOT / SEARCH`, с прерывателем `DODGE`.
- **Dodge**: если игрок прицелился в врага (угол < `DODGE_ANGLE_THRESHOLD`), враг уклоняется перпендикулярно, кулдаун — `DODGE_COOLDOWN`. Может быть переопределён в подклассах (`canDodge()` hook).
- **Pack alerts**: при агро враг оповещает соседних (`PACK_ALERT_RADIUS`) бездействующих врагов.
- **Slot-based positioning**: `SlotCoordinator` назначает врагам одну из 8 позиций вокруг игрока. При смерти слот освобождается.
- **Pathfinding**: `Pathfinder` (A* на сетке 64×64 px) строит маршрут до цели, пересчитывается при отклонении > `PATH_RECALC_DIST`.

**`MeleeEnemy`** (красный):
- IDLE → CHASE при агро. В CHASE — идёт к назначенному слоту вокруг игрока через pathfinding.
- ATTACK при дистанции ≤ `MELEE_ATTACK_RANGE`: наносит урон с кулдауном.
- Dodge не ограничен LoS.

**`ShooterEnemy`** (синий):
- IDLE → CHASE при LoS + агро-дистанции. В CHASE — навигация к позиции игрока.
- SHOOT при LoS в зоне `SHOOTER_RANGE`: стреляет с кулдауном 1500 мс, кайтит (отступает ближе `SHOOTER_KITE_RETREAT_DIST`, сближается дальше `SHOOTER_KITE_ADVANCE_DIST`).
- SEARCH при потере LoS: идёт к последней известной позиции игрока.
- LoS кешируется один раз за тик (`losCache`). Dodge только при наличии LoS (`canDodge()` переопределён).
- STRAFE реализован в коде, но отключён (`// FUTURE`).

### Уровни

Файл `level/levelN.ts` экспортирует объект с:
- `playerStart: {x, y}` — стартовая позиция игрока;
- `walls: {x, y, w, h}[]` — прямоугольники стен (статичная физика);
- `enemies: {type: 'melee'|'shooter', x, y}[]` — спавны врагов;
- `pickups: {kind: 'health'|'ammo_pistol'|'ammo_shotgun', x, y}[]` — пикапы (зарезервировано, не реализованы).

### GameScene — точки интеграции

- Две группы пуль: `playerBullets` и `enemyBullets` (разделение упрощает collision rules).
- Коллизии: пули↔стены (уничтожение), playerBullets↔враги (урон), enemyBullets↔игрок (урон), игрок↔стены, враги↔стены.
- Тик AI каждого врага вызывается в `update()`.
- Pack alert срабатывает при агро: `GameScene.alertPackNear(enemy)`.
- При 0 живых врагов → GameOver (WIN). При смерти игрока → GameOver (LOSE).

## Баланс (`src/config.ts`)

| Параметр | Значение | Пояснение |
|----------|----------|-----------|
| `PLAYER_HP` | 5 | |
| `PLAYER_SPEED` | 200 px/s | |
| `MAP_WIDTH` | 1920 px | |
| `MAP_HEIGHT` | 1080 px | |
| `BULLET_SPEED` | 600 px/s | пули игрока |
| `BULLET_TTL` | 2000 мс | |
| `BULLET_DAMAGE` | 1 | |
| `PISTOL_COOLDOWN` | 250 мс | |
| `MELEE_ENEMY_HP` | 2 | |
| `MELEE_ENEMY_SPEED` | 140 px/s | |
| `MELEE_ENEMY_DAMAGE` | 1 | |
| `MELEE_ENEMY_ATTACK_COOLDOWN` | 600 мс | |
| `SHOOTER_ENEMY_HP` | 3 | |
| `SHOOTER_ENEMY_SPEED` | 100 px/s | |
| `SHOOTER_ENEMY_DAMAGE` | 1 | |
| `SHOOTER_ENEMY_FIRE_COOLDOWN` | 1500 мс | |
| `SHOOTER_RANGE` | 350 px | дистанция стрельбы |
| `SHOOTER_BULLET_SPEED` | 400 px/s | |
| `SHOOTER_KITE_RETREAT_DIST` | 262 px | 75% range — отступить ближе |
| `SHOOTER_KITE_ADVANCE_DIST` | 402 px | 115% range — сблизиться дальше |
| `ENEMY_AGGRO_RANGE` | 250 px | |
| `PACK_ALERT_RADIUS` | 300 px | радиус оповещения союзников |
| `MELEE_ATTACK_RANGE` | 50 px | |
| `MELEE_SLOT_RADIUS` | 30 px | |
| `DODGE_COOLDOWN` | 1500 мс | |
| `DODGE_DURATION` | 300 мс | |
| `DODGE_ANGLE_THRESHOLD` | 0.44 рад | ~25°, прицеливание = уклонение |
| `DODGE_SPEED_MULT` | 1.8× | множитель скорости при уклонении |
| `PATH_CELL_SIZE` | 64 px | размер ячейки pathfinding-сетки |
| `PATH_RECALC_DIST` | 128 px | отклонение от пути → пересчёт |
| `WAYPOINT_REACH_DIST` | 24 px | дистанция «достиг вейпоинта» |
