# ShooterEnemy: canDodge hook + LoS cache — дизайн

**Дата:** 2026-05-27  
**Статус:** Approved

## Проблема

1. **Dodge через стену:** `checkAndTriggerDodge` в базовом классе `Enemy` не проверяет LoS — враг дёргается в сторону даже когда игрок целится через стену.
2. **Множественные вызовы `hasLoS`:** за один тик `hasLoS` вызывается 3–4 раза (lastKnownPos update, SHOOT, SEARCH, теперь canDodge), каждый раз итерируя по всем стенам.

## Решение

### Хук canDodge (Вариант B)

**`Enemy.ts`:**
```ts
protected canDodge(_player: Player): boolean {
  return true;
}
```
Вызывается в самом начале `checkAndTriggerDodge` как ранний выход:
```ts
checkAndTriggerDodge(player: Player): boolean {
  if (!this.canDodge(player)) return false;
  // ...существующая логика...
}
```

**`ShooterEnemy.ts`:**
```ts
protected override canDodge(_player: Player): boolean {
  return this.losCache;
}
```
MeleeEnemy не трогаем — наследует `return true`.

### LoS-кеш за тик

**`ShooterEnemy.ts`:**
- Новое поле: `private losCache = false`
- В самом начале `tick()`, до `checkAndTriggerDodge`:
  ```ts
  this.losCache = this.hasLoS(player);
  ```
- Везде внутри `tick()` заменить прямые вызовы `hasLoS(player)` на `this.losCache`
- `hasLoS` остаётся `private`, вызывается ровно один раз за тик

## Затрагиваемые файлы

| Файл | Изменение |
|------|-----------|
| `src/entities/Enemy.ts` | + `protected canDodge()`, вызов в `checkAndTriggerDodge` |
| `src/entities/ShooterEnemy.ts` | + `losCache`, пересчёт в начале tick, override `canDodge`, замена всех `hasLoS(player)` на `this.losCache` |

## Acceptance criteria

- [ ] ShooterEnemy не доджит, когда игрок целится через стену
- [ ] MeleeEnemy продолжает доджить без ограничений
- [ ] `hasLoS` вызывается ровно один раз за тик (убрать все остальные прямые вызовы)
- [ ] `make typecheck` и `make check` — без ошибок
