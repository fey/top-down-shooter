# Top-Down Shooter — спецификация (текущее состояние)

Браузерный прототип top-down шутера: один статичный уровень, три типа врагов, одно оружие. Этот документ описывает **то, что реализовано сейчас**. Оставшаяся работа — в [`docs/roadmap.md`](roadmap.md).

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
make test       # vitest run — unit-тесты чистого ядра
make clean      # rm -rf dist
```

**Тестируемость.** Ошибкоопасная логика (поиск пути, боевые решения, геометрия LoS,
отталкивание от стен, кулдаун, парсинг уровня) вынесена в чистые Phaser-free модули
(`src/ai/grid.ts`, `src/ai/geometry.ts`, `src/ai/separation.ts`, `src/ai/behaviors/`,
`src/level/spawns.ts`) и покрыта unit-тестами vitest. Классы-сущности — тонкая оболочка
над этим ядром. Геймплей по-прежнему проверяется вручную.

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
      Enemy.ts             # базовый класс: state machine, pathfinding
      MeleeEnemy.ts        # ближний бой: преследует, бьёт при контакте
      ShooterEnemy.ts      # дальний бой: LoS, SEARCH, стрельба, кайтинг
      SmartBot.ts          # умный бот уровня игрока: упреждение, уклонение, укрытия, маневр
      Bullet.ts            # снаряд с TTL и коллизиями
    weapons/
      Weapon.ts            # базовый класс: кулдаун, спавн пуль
      Pistol.ts            # единственное оружие (пока)
    ai/
      Pathfinder.ts        # Theta* (any-angle) pathfinding по сетке с обходом стен
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
- State machine: `IDLE → CHASE → ATTACK / SHOOT / SEARCH`.
- **Pack alerts**: при агро враг оповещает соседних (`PACK_ALERT_RADIUS`) бездействующих врагов.
- **Pathfinding**: `Pathfinder` (Theta* на сетке 64×64 px) строит натянутый any-angle маршрут; если прямая до цели свободна — идёт напрямую без поиска. Путь пересчитывается при отклонении цели > `PATH_RECALC_DIST`.
- Скучивание врагов предотвращают коллизии Arcade Physics (enemy↔enemy collider), отдельной системы позиционирования нет.

**`MeleeEnemy`** (красный):
- IDLE → CHASE при агро. В CHASE — идёт прямо к игроку через pathfinding.
- ATTACK при дистанции ≤ `MELEE_ATTACK_RANGE`: наносит урон с кулдауном.

**`ShooterEnemy`** (синий):
- IDLE → CHASE при LoS + агро-дистанции. В CHASE — навигация к позиции игрока.
- SHOOT при LoS в зоне `SHOOTER_RANGE`: стреляет с кулдауном 1500 мс, кайтит (отступает ближе `SHOOTER_KITE_RETREAT_DIST`, сближается дальше `SHOOTER_KITE_ADVANCE_DIST`).
- SEARCH при потере LoS: идёт к последней известной позиции игрока.
- LoS кешируется один раз за тик (`losCache`).
- STRAFE реализован в коде, но отключён (`// FUTURE`).

**`SmartBot`** (зелёный) — соперник **уровня игрока** с продвинутым ИИ в духе ботов Quake 3:
- Характеристики как у игрока: HP 5, скорость 200, то же оружие `Pistol` (кулдаун 250 мс,
  скорость пули 600), стреляет в группу `enemyBullets`.
- Состояния: `PATROL → CHASE → SHOOT → SEARCH → PATROL` (поверх общего `EnemyState`), плюс
  отдельный режим отхода в укрытие, перекрывающий автомат.
- **Патрулирование** (`PATROL`, стартовое состояние): бот не простаивает, а роумит по карте —
  идёт к случайной проходимой точке (`Pathfinder.randomWalkableWorld`, дистанция ≥
  `SMART_BOT_PATROL_MIN_DIST`), по достижении выбирает новую. При обнаружении игрока
  (LoS + `SMART_BOT_AGGRO_RANGE`) → `CHASE`.
- **Упреждающий прицел**: целится в экстраполированную позицию игрока (`pos + velocity·dist/bulletSpeed`).
  Модель «честности»: задержка реакции `SMART_BOT_REACTION_MS` перед открытием огня + случайный
  разброс `SMART_BOT_AIM_SPREAD` на каждый выстрел (поворот корпуса — без разброса). Задержка
  реакции взводится один раз на завязку боя: короткое мигание LoS (короче `SMART_BOT_LOS_GRACE_MS`)
  её не перевзводит, поэтому в устоявшемся бою темп стрельбы = кулдаун оружия (как у игрока).
- **Уклонение**: сканирует `playerBullets`; при летящей в него пуле (близко + малое боковое
  отклонение) делает рывок перпендикулярно её курсу на `SMART_BOT_DODGE_DURATION`, перебивая маневр.
- **Боевое маневрирование**: удержание дистанции (отступает ближе `SMART_BOT_KITE_RETREAT_DIST`,
  сближается дальше `SMART_BOT_KITE_ADVANCE_DIST`) + circle-strafe со сменой направления.
- **Тактика укрытий**: при HP ≤ `SMART_BOT_LOW_HP` ищет ближайшую проходимую точку без LoS к игроку
  (`Pathfinder` + геометрия стен) и уходит туда, не стреляя; затем возвращается в бой. Лечения в
  прототипе нет, поэтому отход однократный с кулдауном `SMART_BOT_RETREAT_COOLDOWN_MS`.
- **Поиск** (`SEARCH`, потеря LoS): идёт к последней увиденной позиции (`lastKnownPos`); дойдя,
  не замирает, а обыскивает район `SMART_BOT_SEARCH_DURATION` мс — ходит по случайным проходимым
  точкам в радиусе `SMART_BOT_SEARCH_RADIUS`. Вернулась LoS → бой; по таймауту → `PATROL`.
- Спавн через объект `smart` в Tiled-слое `spawns`; попадает в общий `enemyGroup`.

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
| `SMART_BOT_HP` | 5 | как у игрока |
| `SMART_BOT_SPEED` | 200 px/s | как у игрока |
| `SMART_BOT_AGGRO_RANGE` | 400 px | раньше замечает игрока |
| `SMART_BOT_COMBAT_RANGE` | 350 px | дистанция перехода в бой |
| `SMART_BOT_KITE_RETREAT_DIST` | 220 px | ближе — отступать |
| `SMART_BOT_KITE_ADVANCE_DIST` | 320 px | дальше — сближаться |
| `SMART_BOT_REACTION_MS` | 180 мс | задержка реакции (честность) |
| `SMART_BOT_LOS_GRACE_MS` | 400 мс | короче — пропадание LoS считается «миганием» |
| `SMART_BOT_AIM_SPREAD` | 0.08 рад | разброс прицела (~4.5°) |
| `SMART_BOT_DODGE_RADIUS` | 130 px | дистанция реакции на пулю |
| `SMART_BOT_DODGE_DURATION` | 250 мс | длительность рывка вбок |
| `SMART_BOT_LOW_HP` | 2 | порог ухода в укрытие |
| `SMART_BOT_STRAFE_FLIP_MS` | 800 мс | период смены направления strafe |
| `SMART_BOT_RETREAT_MS` | 1800 мс | макс. длительность отхода |
| `SMART_BOT_RETREAT_COOLDOWN_MS` | 5000 мс | пауза перед следующим отходом |
| `SMART_BOT_PATROL_MIN_DIST` | 350 px | мин. дистанция новой точки патруля |
| `SMART_BOT_SEARCH_DURATION` | 4000 мс | обыск района у lastKnownPos |
| `SMART_BOT_SEARCH_RADIUS` | 250 px | радиус разброса точек обыска |
| `ENEMY_AGGRO_RANGE` | 250 px | |
| `PACK_ALERT_RADIUS` | 300 px | радиус оповещения союзников |
| `MELEE_ATTACK_RANGE` | 50 px | |
| `PATH_CELL_SIZE` | 64 px | размер ячейки pathfinding-сетки |
| `PATH_RECALC_DIST` | 64 px | отклонение цели от пути → пересчёт |
| `WAYPOINT_REACH_DIST` | 24 px | дистанция «достиг вейпоинта» |
