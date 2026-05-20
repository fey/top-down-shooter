# M3: Стрельба и пистолет — Design Spec

## Контекст

M2 реализовала движение игрока, стены и камеру. M3 добавляет первое оружие: игрок стреляет пулями по ЛКМ, пули уничтожаются при ударе о стену или по истечении TTL.

## Архитектура

### Новые файлы

**`src/entities/Bullet.ts`**
- `extends Phaser.Physics.Arcade.Sprite`
- Конструктор: `(scene, x, y, vx, vy)` — задаёт velocity сразу
- TTL через `scene.time.addEvent` на `BULLET_TTL` мс → `this.destroy()`
- Текстура: генерируется в `PreloadScene` как маленький белый прямоугольник (`"bullet"`, 8×4)

**`src/weapons/Weapon.ts`**
- Абстрактный базовый класс
- Поля: `cooldown: number`, `bulletSpeed: number`, `_lastFired: number = 0`
- `tryFire(bulletGroup, x, y, angle): void` — проверяет кулдаун, вызывает `spawnBullets`
- `protected abstract spawnBullets(bulletGroup, x, y, angle): void`

**`src/weapons/Pistol.ts`**
- `extends Weapon`
- Конструктор задаёт `cooldown = PISTOL_COOLDOWN`, `bulletSpeed = BULLET_SPEED`
- `spawnBullets` — спавнит одну `Bullet` по вектору `angle`

### Изменения существующих файлов

**`src/config.ts`**
```ts
export const BULLET_SPEED = 600;
export const BULLET_TTL = 2000;
export const PISTOL_COOLDOWN = 250;
```

**`src/scenes/PreloadScene.ts`**
- Добавить генерацию текстуры `"bullet"`: белый прямоугольник 8×4

**`src/scenes/GameScene.ts`**
- Создаёт `bulletGroup: Phaser.Physics.Arcade.Group`
- Передаёт группу в конструктор `Player`
- Регистрирует коллизию: `physics.add.collider(bulletGroup, wallGroup, (b) => b.destroy())`

**`src/entities/Player.ts`**
- Принимает `bulletGroup` в конструкторе
- Создаёт `this.weapon = new Pistol()`
- В `update()`: если `scene.input.activePointer.isDown` → вычисляет угол к курсору → вызывает `weapon.tryFire(bulletGroup, x, y, angle)`

## Владение группой

`GameScene` создаёт `bulletGroup` и передаёт её в `Player` — сцена владеет группами коллизий. Это соответствует архитектуре из роадмапа: "все коллизии — в GameScene".

## Конфиг

Все числа (скорость, TTL, кулдаун) — в `src/config.ts`. В классах — только ссылки на константы.

## Верификация

1. `npm run dev` → открыть браузер
2. ЛКМ → пули летят в направлении курсора
3. Пуля исчезает при ударе о стену
4. Пуля исчезает через 2 сек без попадания
5. Частота стрельбы ограничена (кулдаун 250 мс)
6. `npm run check` и `npm run typecheck` — без ошибок
