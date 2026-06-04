# Theta* Any-Angle Pathfinding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить A\* + string pulling на Theta\* (any-angle), чтобы враги ходили по натянутым прямым маршрутам без изломов «вбок».

**Architecture:** Вся логика поиска живёт в `src/ai/Pathfinder.ts`; интерфейс `findPath()` не меняется, поэтому `Enemy.moveAlongPath` и сущности врагов не трогаем (кроме переименования геттера для debug-оверлея). Спека: `docs/superpowers/specs/2026-06-05-theta-star-pathfinding-design.md`.

**Tech Stack:** Phaser 4, TypeScript (strict), Vite, Biome. Автотестов нет — после каждой задачи `make typecheck && make check`, в конце ручная проверка через `make dev` + F1-оверлей.

**Трекинг:** перед началом создать beads-issue (`bd create --title="Theta* any-angle pathfinding" --type=feature --priority=2`), взять в работу (`bd update <id> --claim`), закрыть после финальной задачи.

⚠️ В рабочем дереве есть чужие незакоммиченные изменения (удаление `docs/superpowers/*`, `src/level/levels.ts`, untracked-файлы). Коммитить ТОЛЬКО файлы этого плана через явный pathspec: `git commit -m "..." -- <файлы>`.

---

### Task 1: Theta* вместо A* в Pathfinder

**Files:**
- Modify: `src/ai/Pathfinder.ts` (метод `astar` → `thetaStar`, эвристика, новые хелперы `dist`/`cellLoS`)

- [ ] **Step 1: Заменить `astar()` на `thetaStar()`**

В `src/ai/Pathfinder.ts` заменить целиком метод `private astar(...)` (строки ~230–294) на:

```typescript
  /**
   * Theta* (basic): любой узел может наследовать родителя «через голову»
   * current, если от parent(current) до соседа есть grid-LoS. Стоимости
   * и эвристика евклидовы — путь получается any-angle, натянутым,
   * без пост-сглаживания.
   */
  private thetaStar(start: Cell, end: Cell): Cell[] {
    const key = (c: Cell) => c.row * this.cols + c.col;

    const openMap = new Map<number, AStarNode>();
    const closed = new Set<number>();

    const startNode: AStarNode = {
      ...start,
      g: 0,
      h: this.heuristic(start, end),
      f: this.heuristic(start, end),
      parent: null,
    };
    openMap.set(key(start), startNode);

    while (openMap.size > 0) {
      // Pick node with lowest f (линейный скан — сетка ~510 клеток, куча не нужна)
      let current: AStarNode | null = null;
      for (const node of openMap.values()) {
        if (!current || node.f < current.f) current = node;
      }
      if (!current) break;

      if (current.col === end.col && current.row === end.row) {
        return this.reconstructPath(current);
      }

      openMap.delete(key(current));
      closed.add(key(current));

      for (const neighbor of this.neighbors8(current)) {
        const nKey = key(neighbor);
        if (closed.has(nKey)) continue;
        if (!this.grid[neighbor.row]?.[neighbor.col]) continue;

        // Prevent diagonal corner-cutting: both cardinal neighbours must be walkable
        const dCol = neighbor.col - current.col;
        const dRow = neighbor.row - current.row;
        if (dCol !== 0 && dRow !== 0) {
          if (!this.grid[current.row]?.[neighbor.col]) continue;
          if (!this.grid[neighbor.row]?.[current.col]) continue;
        }

        // Theta*: если от parent(current) до соседа есть LoS — наследуем
        // родителя через голову current (path 2), иначе обычный шаг A* (path 1)
        let candidateParent = current;
        let tentativeG: number;
        const grandparent = current.parent;
        if (grandparent && this.cellLoS(grandparent, neighbor)) {
          candidateParent = grandparent;
          tentativeG = grandparent.g + this.dist(grandparent, neighbor);
        } else {
          tentativeG = current.g + this.dist(current, neighbor);
        }

        const existing = openMap.get(nKey);
        if (!existing || tentativeG < existing.g) {
          const h = this.heuristic(neighbor, end);
          openMap.set(nKey, {
            col: neighbor.col,
            row: neighbor.row,
            g: tentativeG,
            h,
            f: tentativeG + h,
            parent: candidateParent,
          });
        }
      }
    }

    return []; // no path found
  }

  /** Euclidean distance в клетках — единая метрика для g-стоимости Theta*. */
  private dist(a: Cell, b: Cell): number {
    return Math.hypot(a.col - b.col, a.row - b.row);
  }

  /** Grid-LoS между центрами двух клеток (обёртка над gridLoS в мировых координатах). */
  private cellLoS(a: Cell, b: Cell): boolean {
    const aw = this.cellToWorld(a);
    const bw = this.cellToWorld(b);
    return this.gridLoS(aw.x, aw.y, bw.x, bw.y);
  }
```

- [ ] **Step 2: Заменить эвристику на евклидову**

Там же заменить метод `heuristic`:

```typescript
  private heuristic(a: Cell, b: Cell): number {
    // Euclidean — согласована с евклидовыми стоимостями Theta* (admissible)
    return this.dist(a, b);
  }
```

- [ ] **Step 3: Обновить вызов в `findPath`**

В `findPath` заменить строку `const cells = this.astar(start, end);` на:

```typescript
    const cells = this.thetaStar(start, end);
```

- [ ] **Step 4: Проверка**

Run: `make typecheck && make check`
Expected: обе команды без ошибок.

- [ ] **Step 5: Commit**

```bash
git add src/ai/Pathfinder.ts
git commit -m "feat: replace A* with Theta* any-angle search in Pathfinder" -- src/ai/Pathfinder.ts
```

---

### Task 2: LoS-шорткат, трим старта, удаление string pulling

**Files:**
- Modify: `src/ai/Pathfinder.ts` (метод `findPath`, удалить `smoothPath`)
- Modify: `src/config.ts` (удалить `PATH_SMOOTH_ENABLED`)

- [ ] **Step 1: Переписать `findPath`**

Заменить метод `findPath` целиком на:

```typescript
  findPath(fromX: number, fromY: number, toX: number, toY: number): Phaser.Math.Vector2[] {
    // LoS-шорткат: прямая до цели свободна — поиск не нужен.
    // gridLoS не проверяет клетку самой цели: если игрок стоит в инфляционной
    // зоне стены, идти прямо к нему — желаемое поведение (лучше, чем обход).
    if (this.gridLoS(fromX, fromY, toX, toY)) {
      return [new Phaser.Math.Vector2(toX, toY)];
    }

    const start = this.worldToCell(fromX, fromY);
    const end = this.worldToCell(toX, toY);

    // Clamp to grid bounds
    start.col = Phaser.Math.Clamp(start.col, 0, this.cols - 1);
    start.row = Phaser.Math.Clamp(start.row, 0, this.rows - 1);
    end.col = Phaser.Math.Clamp(end.col, 0, this.cols - 1);
    end.row = Phaser.Math.Clamp(end.row, 0, this.rows - 1);

    // If start cell is blocked (enemy in inflated wall zone), snap to nearest walkable
    if (!this.grid[start.row]?.[start.col]) {
      const fallback = this.nearestWalkable(start);
      if (!fallback) return [];
      start.col = fallback.col;
      start.row = fallback.row;
    }

    // If target cell is blocked, find nearest walkable cell
    if (!this.grid[end.row]?.[end.col]) {
      const fallback = this.nearestWalkable(end);
      if (!fallback) return [];
      end.col = fallback.col;
      end.row = fallback.row;
    }

    const cells = this.thetaStar(start, end);
    if (cells.length === 0) return [];

    const waypoints: Phaser.Math.Vector2[] = cells.map((c) => this.cellToWorld(c));
    // Replace last waypoint with exact target position
    waypoints[waypoints.length - 1] = new Phaser.Math.Vector2(toX, toY);

    return this.trimStart(fromX, fromY, waypoints);
  }

  /**
   * Убирает квантование старта: Theta* стартует из центра клетки врага,
   * поэтому первые вейпоинты могут лежать «вбок» от реальной позиции.
   * Отбрасываем ведущие точки, пока следующая за ними видна напрямую.
   */
  private trimStart(
    fromX: number,
    fromY: number,
    waypoints: Phaser.Math.Vector2[],
  ): Phaser.Math.Vector2[] {
    let first = 0;
    while (first + 1 < waypoints.length) {
      const next = waypoints[first + 1];
      if (!next || !this.gridLoS(fromX, fromY, next.x, next.y)) break;
      first++;
    }
    return waypoints.slice(first);
  }
```

- [ ] **Step 2: Удалить `smoothPath`**

Удалить целиком метод `private smoothPath(...)` вместе с его doc-комментарием (string pulling больше не вызывается). Метод `gridLoS` НЕ удалять — его используют шорткат, трим и `cellLoS`. В doc-комментарии `gridLoS` заменить упоминание «in the `smoothPath` context» на «in the Theta* / shortcut context».

- [ ] **Step 3: Удалить `PATH_SMOOTH_ENABLED`**

В `src/ai/Pathfinder.ts` поправить импорт:

```typescript
import { PATH_CELL_SIZE } from "../config";
```

В `src/config.ts` удалить строку:

```typescript
export const PATH_SMOOTH_ENABLED = true;
```

- [ ] **Step 4: Проверка**

Run: `make typecheck && make check`
Expected: чисто. Если Biome ругается на неиспользуемое — значит, остался мёртвый код из Step 2.

- [ ] **Step 5: Commit**

```bash
git add src/ai/Pathfinder.ts src/config.ts
git commit -m "feat: LoS shortcut and start trim in findPath, drop string pulling" -- src/ai/Pathfinder.ts src/config.ts
```

---

### Task 3: PATH_RECALC_DIST 128 → 64

**Files:**
- Modify: `src/config.ts:43`

- [ ] **Step 1: Изменить константу**

```typescript
export const PATH_RECALC_DIST = 64; // отклонение цели от пути → пересчёт (1 клетка)
```

Игровое ощущение: враги реагируют на перемещение игрока вдвое быстрее — меньше ходьбы к устаревшим позициям. Пересчёт стал дёшев: в открытом поле это один DDA-проход LoS-шортката.

- [ ] **Step 2: Проверка**

Run: `make typecheck && make check`
Expected: чисто.

- [ ] **Step 3: Commit**

```bash
git add src/config.ts
git commit -m "tune: halve PATH_RECALC_DIST so paths follow the player closer" -- src/config.ts
```

---

### Task 4: Честный debug-оверлей

**Files:**
- Modify: `src/entities/Enemy.ts` (метод `getWaypoints` → `getRemainingWaypoints`)
- Modify: `src/scenes/GameScene.ts` (метод `drawDebugPaths`)

- [ ] **Step 1: Заменить геттер в Enemy**

В `src/entities/Enemy.ts` заменить:

```typescript
  getWaypoints(): Phaser.Math.Vector2[] {
    return this.waypoints;
  }
```

на:

```typescript
  /** Оставшиеся вейпоинты (с текущего waypointIndex) — для debug-оверлея. */
  getRemainingWaypoints(): Phaser.Math.Vector2[] {
    return this.waypoints.slice(this.waypointIndex);
  }
```

- [ ] **Step 2: Обновить GameScene**

В `src/scenes/GameScene.ts` в `drawDebugPaths` заменить:

```typescript
      const waypoints = enemy.getWaypoints();
```

на:

```typescript
      const waypoints = enemy.getRemainingWaypoints();
```

- [ ] **Step 3: Проверка**

Run: `make typecheck && make check`
Expected: чисто (других вызовов `getWaypoints` в проекте нет — проверить: `grep -rn "getWaypoints" src/`).

- [ ] **Step 4: Commit**

```bash
git add src/entities/Enemy.ts src/scenes/GameScene.ts
git commit -m "fix: debug overlay draws only remaining waypoints" -- src/entities/Enemy.ts src/scenes/GameScene.ts
```

---

### Task 5: Обновить docs/spec.md

**Files:**
- Modify: `docs/spec.md` (строка ~57, ~95, таблица баланса)

- [ ] **Step 1: Обновить упоминания A\***

В дереве файлов:

```
      Pathfinder.ts        # Theta* (any-angle) pathfinding по сетке с обходом стен
```

В разделе «Враги», пункт Pathfinding:

```markdown
- **Pathfinding**: `Pathfinder` (Theta* на сетке 64×64 px) строит натянутый any-angle маршрут; если прямая до цели свободна — идёт напрямую без поиска. Путь пересчитывается при отклонении цели > `PATH_RECALC_DIST`.
```

В таблице баланса заменить строку `PATH_RECALC_DIST`:

```markdown
| `PATH_RECALC_DIST` | 64 px | отклонение цели от пути → пересчёт |
```

- [ ] **Step 2: Commit**

```bash
git add docs/spec.md
git commit -m "docs: spec.md reflects Theta* pathfinding" -- docs/spec.md
```

---

### Task 6: Ручная верификация и завершение

- [ ] **Step 1: Сборка**

Run: `make build`
Expected: сборка успешна (warning про chunk size > 500 kB — известный, не блокер).

- [ ] **Step 2: Ручная проверка в браузере**

Run: `make dev`, открыть уровень с врагами, включить F1-оверлей. Чеклист из спеки:

1. Открытое поле: путь — одна прямая линия от врага до цели, без изломов.
2. Цель за кустом/стеной: натянутая ломаная, огибает угол вплотную (с учётом паддинга 32 px), без лесенок.
3. Враг не дёргается вбок в момент пересчёта пути.
4. Узкий проход (1 клетка): враг проходит, не цепляясь за углы.
5. Оверлей показывает только оставшийся путь (пройденные точки исчезают).

- [ ] **Step 3: Закрыть issue и запушить**

```bash
bd close <id> --reason="Theta* реализован, ручная верификация пройдена"
git pull --rebase   # при конфликте с чужими незакоммиченными правками — git stash не делать, сообщить пользователю
git push
git status          # ветка должна быть up to date with origin
```

---

## Self-Review (выполнен)

- Покрытие спеки: thetaStar (Task 1), LoS-шорткат + трим + удаление smoothPath/PATH_SMOOTH_ENABLED (Task 2), PATH_RECALC_DIST (Task 3), оверлей (Task 4), верификация (Task 6) + обновление docs/spec.md (Task 5). Гэпов нет.
- Плейсхолдеров нет; весь код приведён полностью.
- Сигнатуры согласованы: `thetaStar(start, end)`, `dist(a, b)`, `cellLoS(a, b)`, `trimStart(fromX, fromY, waypoints)`, `getRemainingWaypoints()`.
