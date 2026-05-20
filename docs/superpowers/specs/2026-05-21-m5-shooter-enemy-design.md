# M5: ShooterEnemy — Design Spec

## Context

M4 добавил MeleeEnemy: враги бегут к игроку и бьют в ближнем бою. M5 добавляет второй тип врага — ShooterEnemy: останавливается на дистанции и стреляет пулями. Также добавляется группа вражеских пуль с коллизиями, и простая LoS-проверка перед выстрелом.

## Решения дизайна

- **Логика выстрела — inline в ShooterEnemy** (не выносим в weapon-класс: Weapon создан для игрока, в M6 получит ammo; ShooterEnemy — единственный стреляющий враг, преждевременная абстракция не нужна).
- **Группа пуль передаётся через конструктор** (как bulletGroup в Player — чисто, тестируемо).
- **wallGroup передаётся через конструктор** (для LoS-проверки, консистентно с пулями).
- **LoS реализован** через `Phaser.Geom.Intersects.LineToRectangle` по каждой стене.

## Новые файлы

### `src/entities/ShooterEnemy.ts`

```ts
class ShooterEnemy extends Enemy {
  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    enemyBullets: Phaser.Physics.Arcade.Group,
    wallGroup: Phaser.Physics.Arcade.StaticGroup
  )

  tick(player: Player): void
  // AI:
  // 1. dist = distance(this, player)
  // 2. if dist > SHOOTER_RANGE → setVelocity toward player
  // 3. else → setVelocity(0, 0)
  // 4. LoS: for each wall in wallGroup → LineToRectangle(line, wall.getBounds())
  // 5. if los clear && cooldown passed → spawnBullet(angle) + lastFiredTime = now

  private hasLoS(player: Player): boolean
  private spawnBullet(angle: number): void
  // new Bullet(scene, x, y) → enemyBullets.add(bullet) → bullet.setVelocity(...)
}
```

Текстура: `"enemy_shooter"`, тинт `0x4444ff` (синий). Генерируется в PreloadScene аналогично `enemy_melee`.

## Изменения существующих файлов

### `src/config.ts`

Новые константы:
```ts
SHOOTER_ENEMY_HP = 3
SHOOTER_ENEMY_SPEED = 100
SHOOTER_ENEMY_DAMAGE = 1
SHOOTER_ENEMY_FIRE_COOLDOWN = 1500  // ms
SHOOTER_RANGE = 350                  // px — дистанция остановки
SHOOTER_BULLET_SPEED = 400           // px/s (медленнее пуль игрока)
```

### `src/scenes/PreloadScene.ts`

Добавить генерацию текстуры `"enemy_shooter"` (синий прямоугольник, аналог `"enemy_melee"`).

### `src/scenes/GameScene.ts`

1. Создать `enemyBullets: Phaser.Physics.Arcade.Group` (classType: Bullet).
2. Добавить коллайдеры:
   - `physics.add.collider(enemyBullets, wallGroup)` → destroy bullet
   - `physics.add.overlap(enemyBullets, player)` → player.takeDamage + destroy bullet
3. Спавнить 2 ShooterEnemy (передавать `enemyBullets`, `wallGroup`).
4. В update loop: привести `enemy` к `ShooterEnemy | MeleeEnemy` по типу, вызвать `tick(player)`.

## LoS-алгоритм

```ts
private hasLoS(player: Player): boolean {
  const line = new Phaser.Geom.Line(this.x, this.y, player.x, player.y);
  for (const wall of this.wallGroup.getChildren()) {
    const bounds = (wall as Phaser.GameObjects.GameObject & { getBounds(): Phaser.Geom.Rectangle }).getBounds();
    if (Phaser.Geom.Intersects.LineToRectangle(line, bounds)) return false;
  }
  return true;
}
```

## Verify (из roadmap M5)

- ShooterEnemy держит дистанцию (`SHOOTER_RANGE`).
- Стреляет в сторону игрока только при чистом LoS.
- Пули врага наносят урон игроку при попадании.
- Пули врага останавливаются на стенах.
- MeleeEnemy поведение не сломано.
- `npm run check` и `npm run typecheck` — зелёные.
