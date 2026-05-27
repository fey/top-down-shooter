# Как добавить новый уровень

Все уровни создаются в **Tiled Map Editor** и экспортируются в JSON. Игра загружает эти файлы через Phaser Tilemaps — редактировать TypeScript для добавления уровня не нужно, только зарегистрировать новый JSON в двух местах.

---

## 1. Настройки карты в Tiled

- **Ориентация:** Orthogonal  
- **Формат слоёв:** Tile Layer Format → CSV (или Base64, но не сжатый — Phaser читает оба)  
- **Размер тайла:** 64 × 64 пикселей  
- **Размер карты:** любой (в тайлах). Например, 30 × 17 тайлов = 1920 × 1088 пикселей

---

## 2. Тайлсет

Подключи тайлсет `tilesheet_complete.png` (файл лежит в `public/assets/tilesheet_complete.png`):

- **Name в Tiled:** `tilesheet_complete` ← точное название, игра ищет его по этой строке
- **Tile width / height:** 64 × 64
- **Grid width / height:** 64 × 64 (без отступов)

> Для нового `.tmx` файла: Map → New Tileset → укажи путь к `tilesheet_complete.png`.

---

## 3. Обязательные слои

Создай **ровно три слоя** с такими именами (регистр важен):

| Имя слоя | Тип в Tiled | Назначение |
|----------|-------------|------------|
| `floor`  | Tile Layer  | Фоновые тайлы. Рисуй что угодно — физики нет |
| `walls`  | Tile Layer  | Непроходимые тайлы. Все непустые клетки становятся стенами |
| `spawns` | Object Layer| Точки появления персонажей (см. раздел 4) |

---

## 4. Объекты в слое `spawns`

Добавляй через **Insert Rectangle** или **Insert Point** в слое `spawns`.  
Позиция объекта — это координаты спауна в пикселях (совпадают с Phaser-координатами без конвертации).

Для каждого объекта задай поле **Class** (или **Type** в старых версиях Tiled):

| Class / Type    | Количество | Описание |
|-----------------|-----------|----------|
| `player_start`  | **ровно 1** | Стартовая позиция игрока |
| `melee`         | любое     | Ближний боец |
| `shooter`       | любое     | Стреляющий враг |

Если `player_start` отсутствует, игра выдаст предупреждение и поставит игрока в (100, 100).

---

## 5. Экспорт в JSON

**File → Export As** → выбери формат **JSON map files (\*.json)**

Сохрани в:
```
public/assets/maps/levelN.json
```
где `N` — порядковый номер нового уровня.

> Убедись, что тайлсет встроен в JSON (Embed tileset), иначе Phaser не найдёт тайлы.  
> В Tiled: правой кнопкой по тайлсету → Embed Tileset (если пункт активен).

---

## 6. Регистрация уровня в игре

### PreloadScene.ts — загрузка ресурса

Файл: `src/scenes/PreloadScene.ts`

Добавь строку в метод `preload()`:

```ts
this.load.tilemapTiledJSON("levelN-map", "assets/maps/levelN.json");
```

### LevelSelectScene.ts — добавление в меню

Файл: `src/scenes/LevelSelectScene.ts`

Добавь запись в массив `LEVELS`:

```ts
{ label: "N — Название уровня", config: { key: "levelN-map" } },
```

Клавиатурный шорткат назначается автоматически (цифра 1, 2, 3… по порядку в массиве).

---

## Быстрый чеклист

- [ ] Создана карта с тайлсетом `tilesheet_complete` (тайл 64×64)
- [ ] Три слоя: `floor`, `walls`, `spawns`
- [ ] В `spawns` есть ровно один объект с Class = `player_start`
- [ ] Тайлсет встроен в JSON (Embed Tileset)
- [ ] JSON сохранён в `public/assets/maps/levelN.json`
- [ ] В `PreloadScene.ts` добавлена строка `tilemapTiledJSON`
- [ ] В `LevelSelectScene.ts` добавлена запись в `LEVELS`
- [ ] `make typecheck` и `make check` проходят без ошибок
