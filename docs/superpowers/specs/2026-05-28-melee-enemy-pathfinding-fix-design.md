# MeleeEnemy Pathfinding Fix — Design

Дата: 2026-05-28

## Проблема

У MeleeEnemy два взаимосвязанных бага:

### Баг 1: враг «встаёт за стеной» и не обходит препятствия

Маршрут событий:
1. CHASE: потерял LoS → немедленно переходит в SEARCH
2. SEARCH: идёт к `lastKnownPos`, добирается туда
3. SEARCH → IDLE (де-агро)
4. IDLE: агро требует LoS → если игрок рядом за стеной — враг стоит неподвижно навсегда

### Баг 2: враг иногда идёт длинным путём

В CHASE цель пути — `getSlotPos(player)` (слот ≈ 30 px от игрока под флангирующим углом).
При переходе в SEARCH `lastPathTarget` всё ещё указывает на слот.
Расстояние от слота до `lastKnownPos` обычно < `PATH_RECALC_DIST` (128 px) → путь **не пересчитывается**.
Враг продолжает идти по старому маршруту к слоту, который может быть с другой стороны от угла — отсюда длинный обход.

---

## Решение

### Принцип

Механика «сбить с толку» (SEARCH → IDLE при потере игрока) **сохраняется**, но SEARCH должен активироваться не сразу при потере LoS, а только когда враг физически добрался до `lastKnownPos` и всё ещё не видит игрока.

### Изменение 1: dual-target CHASE

CHASE больше не переходит в SEARCH сразу при потере LoS.

Вместо этого в CHASE два режима:
- **LoS есть** → `moveAlongPath(getSlotPos(player), ...)` — как сейчас
- **LoS только что потерян** → `invalidatePath()` + `moveAlongPath(lastKnownPos, ...)` (принудительный пересчёт)
- **LoS нет, идём к lastKnownPos** → переходить в SEARCH только когда `distToLkp < WAYPOINT_REACH_DIST`

Переход CHASE → SEARCH: только по достижении `lastKnownPos` при отсутствии LoS.

### Изменение 2: SEARCH как «пауза и осмотр»

Враг добрался до последней известной позиции, не видит игрока:
- Останавливается (velocity = 0)
- Ждёт `MELEE_SEARCH_TIMEOUT` (1500 мс), каждый тик проверяет LoS
- Если LoS вернулся → CHASE
- Если таймаут истёк → IDLE

### Изменение 3: `invalidatePath()` в Enemy (base)

Новый публичный метод, сбрасывающий `lastPathTarget` до «недостижимой» точки → при следующем вызове `moveAlongPath` путь пересчитается принудительно.

---

## Диаграмма состояний (новая)

```
IDLE ──(dist < 250 && LoS)──> CHASE

CHASE:
  LoS есть  → moveAlongPath(slot)
              (dist ≤ 50) → ATTACK
  LoS потерян → invalidatePath() + moveAlongPath(lastKnownPos)
              (дошёл до lastKnownPos && нет LoS) → SEARCH

SEARCH:
  LoS вернулся → CHASE
  таймаут 1500 мс → IDLE

ATTACK:
  (dist > 50) → CHASE
```

---

## Файлы изменений

| Файл | Что меняется |
|------|-------------|
| `src/config.ts` | Добавить `MELEE_SEARCH_TIMEOUT = 1500` |
| `src/entities/Enemy.ts` | Добавить публичный `invalidatePath()` |
| `src/entities/MeleeEnemy.ts` | Переписать `tick()`: dual-target CHASE, SEARCH-таймаут |
| `docs/superpowers/specs/2026-05-27-enemy-ai-current-design.md` | Обновить секцию MeleeEnemy |

---

## Чего не меняем

- Агро в IDLE: остаётся `dist < ENEMY_AGGRO_RANGE && LoS` — натуральный первый контакт только при видимости
- ShooterEnemy: не трогаем
- Слоты, флангирование, dodge: не трогаем
- Pack alert: не трогаем
