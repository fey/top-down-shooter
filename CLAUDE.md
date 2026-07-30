# CLAUDE.md

Этот файл содержит инструкции для Claude Code (claude.ai/code) при работе с репозиторием.
AGENTS.md — симлинк на этот файл; это один и тот же документ.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->
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
<!-- END BEADS INTEGRATION -->


## Обзор проекта

Небольшой браузерный top-down шутер: одна статичная карта, два типа врагов, в процессе разработки.
- **Текущее состояние** (архитектура, баланс, что реализовано): `docs/spec.md` — читать в первую очередь.
- **Оставшаяся работа** (milestone M8–M9): `docs/roadmap.md`.

## Стек

- **Phaser 4** (4.1.0, 2D игровой движок).
- **TypeScript** в strict-режиме.
- **Vite** для dev-сервера и сборки.
- **Biome** для lint + format (замена ESLint + Prettier) — единственный `biome.json`.

## Сборка и проверка

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

**Unit-тесты (vitest)** покрывают только чистое (Phaser-free) ядро: навигацию (`src/ai/grid.ts`),
боевые решения (`src/ai/behaviors/`), геометрию LoS (`src/ai/geometry.ts`), отталкивание от стен
(`src/ai/separation.ts`), кулдаун оружия и веер дробинок (`src/weapons/`), парсинг уровня
(`src/level/spawns.ts`) и инварианты
баланса (`src/config.test.ts`). Тесты колокейтятся рядом с модулем (`foo.ts` → `foo.test.ts`),
гоняются в окружении `node` и **не импортируют Phaser**. Перед коммитом изменений кода —
`make test` входит в quality gates наравне с `make typecheck` и `make check`.

**Геймплей тестами не покрыт** — проверка ручная (открыть dev-сервер, воспроизвести поведение).
У каждого milestone в `docs/roadmap.md` свой чеклист **Verify**.

**Проверка геймплея и управления — только вручную пользователем.** Не запускать Playwright и не симулировать ввод (нажатия клавиш, клики, drag) через браузерную автоматизацию для проверки управления персонажем, стрельбы и прочего геймплея. Вместо этого: запустить dev-сервер и попросить пользователя проверить, дав короткий чеклист, что именно смотреть. Разрешено без ограничений: открыть страницу, сделать скриншот, посмотреть консоль браузера (`navigate_page`, `take_screenshot`, `list_console_messages`).

## Обзор архитектуры

Полные детали — в `docs/spec.md`. Спецификация поиска пути врагов: `docs/superpowers/specs/2026-06-05-theta-star-pathfinding-design.md`.

## Соглашения и паттерны

- **Работать milestone за milestone.** Каждый `Mx` в `docs/roadmap.md` — отдельный commit/PR; после него игра должна запускаться и проверяться в браузере. Не смешивать изменения нескольких milestone в одном коммите.
- **Strict TypeScript.** Без `any`, без `// @ts-ignore` без объяснения причины.
- **Biome — единственный линтер/форматтер.** Не добавлять ESLint или Prettier; не бороться с дефолтами Biome.
- **Числа в `config.ts`, данные в `level1.ts`.** Не хардкодить настроечные константы и раскладку уровня прямо в сценах или сущностях.
- **Спецификация AI врагов.** Перед изменением поведения врагов (`src/entities/Enemy.ts`, `MeleeEnemy.ts`, `ShooterEnemy.ts`, `src/ai/`) прочитать `docs/spec.md` и `docs/superpowers/specs/2026-06-05-theta-star-pathfinding-design.md`. Изменения должны либо соответствовать спецификации, либо явно обновлять её в том же коммите.
- **Функциональное ядро, тонкая оболочка.** Логику решений (навигация, бой, геометрия) держать в чистых Phaser-free функциях/классах (`src/ai/grid.ts`, `src/ai/geometry.ts`, `src/ai/separation.ts`, `src/ai/behaviors/`), которые принимают снимок состояния (числа/`Vec2`) и возвращают решение. Классы-сущности (наследники `Phaser.Physics.Arcade.Sprite`) — тонкая оболочка: собирают снимок, вызывают ядро, применяют результат (`setVelocity`, спавн пуль, смена `state`). Ядро не импортирует `phaser` → покрывается unit-тестами. Новую ошибкоопасную логику добавлять в ядро с тестом, а не в `tick()`.
- **Сцены общаются через события.** HUD и другие оверлейные сцены подписываются на `scene.events` от `GameScene`; не получать экземпляр другой сцены напрямую.
- **Ключи сцен хранятся рядом со сценами.** Каждый файл сцены экспортирует собственную константу-ключ (`BOOT_SCENE_KEY` и т.д.). Импортировать ключ целевой сцены при вызове `scene.start()`.
- **За рамками прототипа** (см. roadmap): сохранения/прогресс, аудио, несколько уровней, управление с мобильного/геймпада, анимации спрайтов сверх статичного арта Kenney. Не добавлять без явного изменения скоупа.

## Стиль общения

При объяснении кода, архитектуры или игровой механики — раскрывать **почему**, а не только что:
- Объяснять причину архитектурного решения (например, почему две группы пуль вместо одной).
- Связывать концепции Phaser 4 с конкретным игровым поведением (например, что такое Arcade Physics body на практике).
- При изменении `config.ts` — упоминать, на какое игровое ощущение влияют числа.
- Кратко — один абзац с контекстом лучше, чем список фактов.
