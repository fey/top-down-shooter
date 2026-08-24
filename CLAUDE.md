# CLAUDE.md

Этот файл содержит инструкции для Claude Code (claude.ai/code) при работе с репозиторием.
AGENTS.md — симлинк на этот файл; это один и тот же документ.


## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent skills

### Issue tracker

Issues live in **beads (`bd`)**, not GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, used verbatim as `bd` labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at the root, ADRs in `docs/adr/`. See `docs/agents/domain.md`.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

## Обзор проекта

Браузерный top-down шутер, прототип в разработке: три карты, нарисованные в Tiled, три типа
врагов (melee, shooter и `SmartBot` — соперник уровня игрока), четыре оружия, которые меняются
только подбором пикапа с пола.

**Стек — на чём сидим сейчас** (обновление: `make update-deps`, следом правка этой таблицы):

| Пакет | Версия |
|-------|--------|
| Phaser | 4.2.1 |
| TypeScript | 7.0.2 |
| Vite | 8.2.2 |
| Vitest | 4.1.11 |
| Biome | 2.5.10 |
| Node | 24 локально, 20 в CI |

Каждый из них — мажор свежее того, что модель помнит по умолчанию: у Phaser 4 другой API, чем у
Phaser 3, у Biome 2 — другой формат конфига, чем у Biome 1, TypeScript 7 — нативная реализация
компилятора. Писать по идиомам установленной версии, сверяясь с `node_modules` или документацией
этого мажора; диапазоны в `package.json` (`^`) — источник правды для самих чисел.

Куда смотреть:

| Документ | Когда читать |
|----------|--------------|
| `docs/spec.md` | Первым. Что реализовано сейчас: архитектура, поведение врагов, все числа баланса |
| `CONTEXT.md` | Глоссарий проекта. Перед тем как назвать сущность в коде, коммите или ответе |
| `docs/roadmap.md` | Оставшаяся работа (M9 — полировка) и что сознательно за скоупом |
| `docs/how-to-add-level.md` | Задача трогает карты: настройки Tiled, слои, экспорт, регистрация |
| `docs/pathfinding-debug.md` | Отладка навигации: F1-оверлей и как читать его линии |
| `docs/superpowers/specs/2026-06-05-theta-star-pathfinding-design.md` | Изменение поиска пути |

`CONTEXT.md` закрепляет язык проекта («символьный рендер», «глиф», «веер» против «неточности»,
«пикап», «спавн»). Эти слова употребляются в коде и спецификации — писать синонимы значит
разойтись с ними.

## Сборка и проверка

Команды — цели `Makefile` (`make dev`, `make build`, `make preview`, `make clean`, …).

**Quality gates перед коммитом кода:** `make typecheck`, `make check`, `make test`. CI гоняет их же
на каждый push и PR (`make check`, `make test`, `make build` — последний включает `tsc --noEmit`).

Один тест-файл и фильтр по имени теста мимо Makefile:

```bash
npx vitest run src/ai/grid.test.ts       # один файл
npx vitest run -t "diagonal"             # тесты, чьё имя содержит подстроку
npm run test:watch                       # watch-режим
```

**Unit-тесты (vitest)** покрывают только чистое (Phaser-free) ядро: навигацию (`src/ai/grid.ts`),
боевые решения (`src/ai/behaviors/`), геометрию LoS (`src/ai/geometry.ts`), отталкивание от стен
(`src/ai/separation.ts`), кулдаун, веер и неточность оружия (`src/weapons/`), парсинг уровня
(`src/level/spawns.ts`), форматирование HUD (`src/ui/hud.ts`) и инварианты баланса
(`src/config.test.ts`). Тесты колокейтятся рядом с
модулем (`foo.ts` → `foo.test.ts`), гоняются в окружении `node` и **не импортируют Phaser**.

**Геймплей тестами не покрыт** — проверка ручная (открыть dev-сервер, воспроизвести поведение).
У каждого milestone в `docs/roadmap.md` свой чеклист **Verify**.

**Проверка геймплея и управления — только вручную пользователем.** Не запускать Playwright и не
симулировать ввод (нажатия клавиш, клики, drag) через браузерную автоматизацию для проверки
управления персонажем, стрельбы и прочего геймплея. Вместо этого: запустить dev-сервер и попросить
пользователя проверить, дав короткий чеклист, что именно смотреть. Разрешено без ограничений:
открыть страницу, сделать скриншот, посмотреть консоль браузера (`navigate_page`, `take_screenshot`,
`list_console_messages`).

## Обзор архитектуры

Полные детали — в `docs/spec.md`; ниже только скелет, чтобы не читать пять файлов ради ориентации.

- **Поток сцен:** `Boot → Preload → MainMenu → LevelSelect → Game (+ HUD) → GameOver ⇄ MainMenu`.
  Каждая сцена экспортирует собственную константу-ключ; `GameScene` — единственное место, где
  сходятся коллизии, тик AI и условия победы/поражения. `HUDScene` идёт параллельно бою
  (`scene.launch`), `GameOver` умеет перезапустить уровень без перезагрузки страницы.
- **Уровень — данные, а не код.** Tiled-JSON в `public/assets/maps/<key>.json` со слоями
  `floor` / `walls` / `spawns` → `LevelLoader` → чистые `level/spawns.ts` (классификация объекта,
  чтение оружия пикапа) → `EnemyFactory`. Новая карта = экспорт JSON + строка в реестре
  `src/level/levels.ts`.
- **Оружие — данные, а не подклассы.** Реестр `WEAPONS` в `config.ts` хранит `WeaponDef`, единственный
  класс `Weapon` его исполняет. Новая пушка = запись в реестре: текстуры игрока и пикапа
  сгенерируются из `barrel` и `glyph` сами.
- **Символьный рендер.** Спрайты не грузятся из файлов: `PreloadScene` генерирует текстуры сущностей
  процедурно из чисел `config.ts`. Размер текстуры зависит от длины ствола, поэтому после смены
  оружия тело пересчитывается (`Player.equip` → `syncBody`).
- **Две группы пуль** (`playerBullets`, `enemyBullets`) — разделение делает правила коллизий
  однозначными.
- **События `GameScene`:** `hpChanged`, `weaponChanged`, `enemiesChanged`, `playerDied`,
  `enemyDied`, `packAlert`.

## Соглашения и паттерны

- **Работать milestone за milestone.** Каждый `Mx` в `docs/roadmap.md` — отдельный commit/PR; после
  него игра должна запускаться и проверяться в браузере. Не смешивать изменения нескольких milestone
  в одном коммите.
- **Strict TypeScript.** Без `any`, без `// @ts-ignore` без объяснения причины.
- **Biome — единственный линтер/форматтер.** Не добавлять ESLint или Prettier; не бороться с
  дефолтами Biome.
- **Числа — в `config.ts`, раскладка уровня — в Tiled-карте.** Настроечные константы не хардкодить в
  сценах и сущностях; позиции игрока, врагов и пикапов задавать объектами слоя `spawns`, а не кодом.
- **Спецификация AI врагов.** Перед изменением поведения врагов (`src/entities/Enemy.ts`,
  `MeleeEnemy.ts`, `ShooterEnemy.ts`, `SmartBot.ts`, `src/ai/`) прочитать `docs/spec.md` и
  `docs/superpowers/specs/2026-06-05-theta-star-pathfinding-design.md`. Изменения должны либо
  соответствовать спецификации, либо явно обновлять её в том же коммите.
- **Функциональное ядро, тонкая оболочка.** Логику решений (навигация, бой, геометрия) держать в
  чистых Phaser-free функциях/классах (`src/ai/grid.ts`, `src/ai/geometry.ts`, `src/ai/separation.ts`,
  `src/ai/behaviors/`), которые принимают снимок состояния (числа/`Vec2`) и возвращают решение.
  Классы-сущности (наследники `Phaser.Physics.Arcade.Sprite`) — тонкая оболочка: собирают снимок,
  вызывают ядро, применяют результат (`setVelocity`, спавн пуль, смена `state`). Ядро не импортирует
  `phaser` → покрывается unit-тестами. Источники случайности (`Math.random`) остаются в оболочке,
  ядро принимает бросок параметром. Новую ошибкоопасную логику добавлять в ядро с тестом, а не в
  `tick()`.
- **Сцены общаются через события.** Оверлейные сцены и оверлеи подписываются на `scene.events` от
  `GameScene` (так устроены `debug/DebugOverlay` и `scenes/HUDScene`); экземпляр другой сцены
  напрямую не получать — `GameScene` сама отдаёт свой эмиттер данными `scene.launch`.
- **Ключи сцен хранятся рядом со сценами.** Каждый файл сцены экспортирует собственную константу-ключ
  (`BOOT_SCENE_KEY` и т.д.). Импортировать ключ целевой сцены при вызове `scene.start()`.
- **За рамками прототипа** (см. roadmap): сохранения/прогресс, аудио, патроны и боезапас, управление с
  мобильного/геймпада, анимации спрайтов сверх статичного арта Kenney. Не добавлять без явного
  изменения скоупа.

## Стиль общения

При объяснении кода, архитектуры или игровой механики — раскрывать **почему**, а не только что:
- Объяснять причину архитектурного решения (например, почему две группы пуль вместо одной).
- Связывать концепции Phaser 4 с конкретным игровым поведением (например, что такое Arcade Physics body на практике).
- При изменении `config.ts` — упоминать, на какое игровое ощущение влияют числа.
- Кратко — один абзац с контекстом лучше, чем список фактов.
