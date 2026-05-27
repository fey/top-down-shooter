# ShooterEnemy — LoS-aware AI: дизайн

**Дата:** 2026-05-27  
**Статус:** Approved

## Проблема

ShooterEnemy имеет два дефекта поведения:

1. **Агро через стену (IDLE):** враг агрится при `dist < ENEMY_AGGRO_RANGE` без проверки LoS — "видит" игрока сквозь стену.
2. **Потеря LoS в SHOOT:** при переходе в CHASE враг идёт к slot-позиции, которая не гарантирует видимость. Враг "реагирует", но не стреляет и не обходит стену.

## Решение: новый SEARCH-state

### Машина состояний

```
IDLE ──[dist < AGGRO_RANGE && hasLoS]──► CHASE
CHASE ──[dist ≤ SHOOTER_RANGE && hasLoS]──► SHOOT
CHASE ──[hasLoS потерян && lastKnownPos != null]──► SEARCH
SHOOT ──[dist < KITE_RETREAT]──► CHASE (переpозиционирование — без изменений)
SHOOT ──[!hasLoS]──► SEARCH  (было: CHASE)
SEARCH ──[hasLoS восстановлен]──► CHASE
SEARCH ──[достиг LKP (dist < WAYPOINT_REACH_DIST) && !hasLoS]──► IDLE
```

DODGE — ортогональное состояние, без изменений.

### Обновление lastKnownPos

Каждый тик (до switch), если `hasLoS(player)`:
```ts
this.lastKnownPos.set(player.x, player.y);
```

Таким образом `lastKnownPos` всегда содержит последнюю позицию, где враг *видел* игрока.

## Затрагиваемые файлы

| Файл | Изменение |
|------|-----------|
| `src/entities/Enemy.ts` | Добавить `SEARCH = "SEARCH"` в `EnemyState` |
| `src/entities/ShooterEnemy.ts` | Поле `lastKnownPos`, обновление каждый тик, логика IDLE/CHASE/SHOOT/SEARCH |
| `src/config.ts` | Без изменений (использовать `WAYPOINT_REACH_DIST` для порога LKP) |

## Детали реализации

### ShooterEnemy.ts

```ts
// Новое поле
private lastKnownPos = new Phaser.Math.Vector2(-9999, -9999);

// В начале tick(), до switch:
if (this.hasLoS(player)) {
  this.lastKnownPos.set(player.x, player.y);
}

// IDLE — добавить проверку LoS:
if (dist < ENEMY_AGGRO_RANGE && this.hasLoS(player)) { ... }

// CHASE — добавить при потере LoS:
if (!this.hasLoS(player)) {
  this.state = EnemyState.SEARCH;
  break;  // ← не продолжать логику кайтинга
}

// SHOOT — изменить переход при потере LoS:
// было: if (!this.hasLoS(player)) this.state = EnemyState.CHASE;
// стало:
if (!this.hasLoS(player)) {
  this.state = EnemyState.SEARCH;
  break;
}

// SEARCH — новый case:
case EnemyState.SEARCH: {
  if (this.hasLoS(player)) {
    this.state = EnemyState.CHASE;
    break;
  }
  this.moveAlongPath(this.lastKnownPos, SHOOTER_ENEMY_SPEED);
  const distToLkp = Phaser.Math.Distance.BetweenPoints(this, this.lastKnownPos);
  if (distToLkp < WAYPOINT_REACH_DIST) {
    this.setVelocity(0, 0);
    this.state = EnemyState.IDLE;
  }
  break;
}
```

## Acceptance criteria

- [ ] В IDLE враг не агрится, если между ним и игроком стена (проверить: спавн за стеной)
- [ ] В SHOOT при уходе игрока за стену враг идёт к последней видимой позиции
- [ ] Если игрок снова появляется в зоне видимости во время SEARCH — враг возобновляет преследование
- [ ] Если игрок ушёл далеко и LKP достигнута — враг возвращается в IDLE
- [ ] packAlert по-прежнему работает (агро по событию, не по LoS)
- [ ] Дебаг-оверлей корректно отображает SEARCH-state
