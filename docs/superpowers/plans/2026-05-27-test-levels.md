# Test Levels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить 6 тест-уровней (level2–level7) для изолированной проверки melee AI, shooter AI, pathfinding, pack alerts и баланса, с отображением всех уровней в LevelSelectScene.

**Architecture:** Каждый уровень — отдельный файл `src/level/levelN.ts`, экспортирующий константу `LevelData`. `LevelSelectScene` импортирует все уровни и добавляет их в массив `LEVELS` — кнопки генерируются в цикле автоматически. Типы данных (`LevelData`, `WallDef`, `EnemySpawn`) не меняются.

**Tech Stack:** TypeScript strict, Phaser 4, Vite, Biome.

---

## Справка: граничные стены (одинаковы для всех уровней)

```typescript
// Вставлять в начало массива walls каждого уровня:
{ x: MAP_WIDTH / 2, y: 16, w: MAP_WIDTH, h: 32 },
{ x: MAP_WIDTH / 2, y: MAP_HEIGHT - 16, w: MAP_WIDTH, h: 32 },
{ x: 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
{ x: MAP_WIDTH - 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
```

MAP_WIDTH=1920, MAP_HEIGHT=1080. Внутренняя игровая область: x∈[32, 1888], y∈[32, 1048].

---

## Task 1: level2 — Solo Melee (перезапись)

**Files:**
- Modify: `src/level/level2.ts`

Один melee-враг на открытом поле. Никаких внутренних стен — чистый тест AI.

- [ ] **Шаг 1: Перезаписать src/level/level2.ts**

```typescript
import { MAP_HEIGHT, MAP_WIDTH } from "../config";
import type { LevelData } from "./level1";

export const level2: LevelData = {
  playerStart: { x: 200, y: 200 },
  walls: [
    { x: MAP_WIDTH / 2, y: 16, w: MAP_WIDTH, h: 32 },
    { x: MAP_WIDTH / 2, y: MAP_HEIGHT - 16, w: MAP_WIDTH, h: 32 },
    { x: 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    { x: MAP_WIDTH - 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
  ],
  enemySpawns: [{ type: "melee", x: 960, y: 540 }],
};
```

- [ ] **Шаг 2: Проверить типы**

```bash
rtk make typecheck
```

Ожидается: 0 ошибок.

---

## Task 2: level3 — Solo Shooter (новый)

**Files:**
- Create: `src/level/level3.ts`

Один shooter-враг + два вертикальных пилона для блокировки LoS. Пилон при x=700 блокирует прямую линию игрок→shooter: игрок уходит за пилон (x<684) → shooter теряет LoS → SEARCH состояние.

- [ ] **Шаг 1: Создать src/level/level3.ts**

```typescript
import { MAP_HEIGHT, MAP_WIDTH } from "../config";
import type { LevelData } from "./level1";

export const level3: LevelData = {
  playerStart: { x: 200, y: 540 },
  walls: [
    { x: MAP_WIDTH / 2, y: 16, w: MAP_WIDTH, h: 32 },
    { x: MAP_WIDTH / 2, y: MAP_HEIGHT - 16, w: MAP_WIDTH, h: 32 },
    { x: 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    { x: MAP_WIDTH - 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    // Вертикальный пилон 1 — блокирует LoS при y≈540
    { x: 700, y: 450, w: 32, h: 300 },
    // Вертикальный пилон 2 — дополнительное укрытие
    { x: 1100, y: 630, w: 32, h: 300 },
  ],
  enemySpawns: [{ type: "shooter", x: 1600, y: 540 }],
};
```

- [ ] **Шаг 2: Проверить типы**

```bash
rtk make typecheck
```

Ожидается: 0 ошибок.

---

## Task 3: level4 — Pathfinding Maze (новый)

**Files:**
- Create: `src/level/level4.ts`

4 вертикальных перегородки с чередующимися проходами (верх/низ). Враги в каждой секции вынуждены строить зигзагообразный маршрут, проходя через попеременно расположенные зазоры.

Геометрия зазоров (200px высота):
- Стены с зазором сверху (y=32–232 свободно): wall center y=640, h=816
- Стены с зазором снизу (y=848–1048 свободно): wall center y=440, h=816

```
Player(200,540) │ W1(448) gap↑ │ W2(832) gap↓ │ W3(1216) gap↑ │ W4(1600) gap↓ │ zone4
```

- [ ] **Шаг 1: Создать src/level/level4.ts**

```typescript
import { MAP_HEIGHT, MAP_WIDTH } from "../config";
import type { LevelData } from "./level1";

export const level4: LevelData = {
  playerStart: { x: 200, y: 540 },
  walls: [
    { x: MAP_WIDTH / 2, y: 16, w: MAP_WIDTH, h: 32 },
    { x: MAP_WIDTH / 2, y: MAP_HEIGHT - 16, w: MAP_WIDTH, h: 32 },
    { x: 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    { x: MAP_WIDTH - 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    // Перегородка 1 (x=448): зазор сверху y=32–232
    { x: 448, y: 640, w: 32, h: 816 },
    // Перегородка 2 (x=832): зазор снизу y=848–1048
    { x: 832, y: 440, w: 32, h: 816 },
    // Перегородка 3 (x=1216): зазор сверху y=32–232
    { x: 1216, y: 640, w: 32, h: 816 },
    // Перегородка 4 (x=1600): зазор снизу y=848–1048
    { x: 1600, y: 440, w: 32, h: 816 },
  ],
  enemySpawns: [
    { type: "melee", x: 640,  y: 540 },
    { type: "melee", x: 1024, y: 540 },
    { type: "melee", x: 1408, y: 540 },
    { type: "melee", x: 1744, y: 540 },
  ],
};
```

- [ ] **Шаг 2: Проверить типы**

```bash
rtk make typecheck
```

Ожидается: 0 ошибок.

---

## Task 4: level5 — Melee Dojo (новый)

**Files:**
- Create: `src/level/level5.ts`

4 колонны-пилона 96×96px + 6 melee в форме дуги справа. Проверяем: slot positioning (не все атакуют одновременно), dodge при прицеливании, pack alert при агрессии первого врага.

- [ ] **Шаг 1: Создать src/level/level5.ts**

```typescript
import { MAP_HEIGHT, MAP_WIDTH } from "../config";
import type { LevelData } from "./level1";

export const level5: LevelData = {
  playerStart: { x: 200, y: 540 },
  walls: [
    { x: MAP_WIDTH / 2, y: 16, w: MAP_WIDTH, h: 32 },
    { x: MAP_WIDTH / 2, y: MAP_HEIGHT - 16, w: MAP_WIDTH, h: 32 },
    { x: 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    { x: MAP_WIDTH - 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    // 4 квадратных колонны
    { x: 700,  y: 350, w: 96, h: 96 },
    { x: 1100, y: 350, w: 96, h: 96 },
    { x: 700,  y: 730, w: 96, h: 96 },
    { x: 1100, y: 730, w: 96, h: 96 },
  ],
  enemySpawns: [
    { type: "melee", x: 900,  y: 200 },
    { type: "melee", x: 1300, y: 300 },
    { type: "melee", x: 1600, y: 400 },
    { type: "melee", x: 1700, y: 540 },
    { type: "melee", x: 1600, y: 680 },
    { type: "melee", x: 1300, y: 780 },
  ],
};
```

- [ ] **Шаг 2: Проверить типы**

```bash
rtk make typecheck
```

Ожидается: 0 ошибок.

---

## Task 5: level6 — Shooter Range (новый)

**Files:**
- Create: `src/level/level6.ts`

4 вертикальных колонны + 4 shooter, расположенных в шахматном порядке (верх/низ). Каждый shooter занимает разную дистанцию от игрока. Для SEARCH: игрок заходит за пилон при x=600 → ближние shooter теряют LoS.

- [ ] **Шаг 1: Создать src/level/level6.ts**

```typescript
import { MAP_HEIGHT, MAP_WIDTH } from "../config";
import type { LevelData } from "./level1";

export const level6: LevelData = {
  playerStart: { x: 200, y: 540 },
  walls: [
    { x: MAP_WIDTH / 2, y: 16, w: MAP_WIDTH, h: 32 },
    { x: MAP_WIDTH / 2, y: MAP_HEIGHT - 16, w: MAP_WIDTH, h: 32 },
    { x: 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    { x: MAP_WIDTH - 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    // Вертикальные колонны для укрытия
    { x: 600,  y: 400, w: 32, h: 400 },
    { x: 900,  y: 680, w: 32, h: 400 },
    { x: 1200, y: 400, w: 32, h: 400 },
    { x: 1500, y: 680, w: 32, h: 400 },
  ],
  enemySpawns: [
    { type: "shooter", x: 750,  y: 240 },
    { type: "shooter", x: 1050, y: 840 },
    { type: "shooter", x: 1350, y: 240 },
    { type: "shooter", x: 1650, y: 840 },
  ],
};
```

- [ ] **Шаг 2: Проверить типы**

```bash
rtk make typecheck
```

Ожидается: 0 ошибок.

---

## Task 6: level7 — Mixed Pack (новый)

**Files:**
- Create: `src/level/level7.ts`

Смешанная группа: 3 melee + 2 shooter рядом. Shooter с LoS на игрока aggro первым (SHOOTER_AGGRO_RANGE эффективнее за счёт позиции) → pack alert будит melee в PACK_ALERT_RADIUS 300px.

Проверка расстояний:
- Shooter (950, 340) → melee (800, 500): ≈210px ✓ (в пределах 300px)
- Shooter (950, 340) → melee (860, 580): ≈252px ✓
- Shooter (950, 340) → melee (800, 650): ≈380px (может не получить напрямую, но получит от соседних melee)

- [ ] **Шаг 1: Создать src/level/level7.ts**

```typescript
import { MAP_HEIGHT, MAP_WIDTH } from "../config";
import type { LevelData } from "./level1";

export const level7: LevelData = {
  playerStart: { x: 200, y: 540 },
  walls: [
    { x: MAP_WIDTH / 2, y: 16, w: MAP_WIDTH, h: 32 },
    { x: MAP_WIDTH / 2, y: MAP_HEIGHT - 16, w: MAP_WIDTH, h: 32 },
    { x: 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    { x: MAP_WIDTH - 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    // L-образная стена (горизонтальная часть)
    { x: 1050, y: 480, w: 500, h: 32 },
    // L-образная стена (вертикальная часть)
    { x: 1284, y: 640, w: 32, h: 320 },
  ],
  enemySpawns: [
    // melee кластер — за L-стеной
    { type: "melee", x: 800, y: 500 },
    { type: "melee", x: 860, y: 580 },
    { type: "melee", x: 800, y: 650 },
    // shooter — с открытой видимостью на игрока
    { type: "shooter", x: 950,  y: 340 },
    { type: "shooter", x: 1200, y: 700 },
  ],
};
```

- [ ] **Шаг 2: Проверить типы**

```bash
rtk make typecheck
```

Ожидается: 0 ошибок.

---

## Task 7: LevelSelectScene — регистрация всех уровней

**Files:**
- Modify: `src/scenes/LevelSelectScene.ts`

Расширить массив `LEVELS` 5 новыми записями. Скорректировать вертикальный layout (7 кнопок): кнопки смещаются вверх через `startY`. Добавить клавиши 3–7 по паттерну 1–2.

- [ ] **Шаг 1: Заменить содержимое src/scenes/LevelSelectScene.ts**

```typescript
import Phaser from "phaser";
import type { LevelData } from "../level/level1";
import { level1 } from "../level/level1";
import { level2 } from "../level/level2";
import { level3 } from "../level/level3";
import { level4 } from "../level/level4";
import { level5 } from "../level/level5";
import { level6 } from "../level/level6";
import { level7 } from "../level/level7";
import { GAME_SCENE_KEY } from "./GameScene";

export const LEVEL_SELECT_SCENE_KEY = "LevelSelect";

const LEVELS: Array<{ label: string; data: LevelData }> = [
  { label: "1 — Боевой (враги)",     data: level1 },
  { label: "2 — Solo Melee",         data: level2 },
  { label: "3 — Solo Shooter",       data: level3 },
  { label: "4 — Pathfinding Maze",   data: level4 },
  { label: "5 — Melee Dojo",         data: level5 },
  { label: "6 — Shooter Range",      data: level6 },
  { label: "7 — Mixed Pack",         data: level7 },
];

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super(LEVEL_SELECT_SCENE_KEY);
  }

  create(): void {
    const { width, height } = this.scale;
    const BUTTON_SPACING = 56;
    const startY = height / 2 - ((LEVELS.length - 1) / 2) * BUTTON_SPACING;

    this.cameras.main.setBackgroundColor("#111111");

    this.add
      .text(width / 2, startY - 70, "Выберите уровень", {
        fontSize: "36px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    LEVELS.forEach(({ label, data }, i) => {
      const y = startY + i * BUTTON_SPACING;
      const btn = this.add
        .text(width / 2, y, label, {
          fontSize: "26px",
          color: "#aaffaa",
          backgroundColor: "#223322",
          padding: { x: 20, y: 8 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      btn.on("pointerover", () => btn.setStyle({ color: "#ffffff" }));
      btn.on("pointerout", () => btn.setStyle({ color: "#aaffaa" }));
      btn.on("pointerdown", () => this.scene.start(GAME_SCENE_KEY, { level: data }));
    });

    const KC = Phaser.Input.Keyboard.KeyCodes;
    const keyCodes = [KC.ONE, KC.TWO, KC.THREE, KC.FOUR, KC.FIVE, KC.SIX, KC.SEVEN];
    keyCodes.forEach((code, i) => {
      this.input.keyboard
        ?.addKey(code)
        .once("down", () => this.scene.start(GAME_SCENE_KEY, { level: LEVELS[i]?.data }));
    });
  }
}
```

- [ ] **Шаг 2: Проверить типы и линтер**

```bash
rtk make typecheck && rtk make check
```

Ожидается: 0 ошибок TypeScript, 0 ошибок Biome.

- [ ] **Шаг 3: Коммит**

```bash
rtk git add src/level/level2.ts src/level/level3.ts src/level/level4.ts \
            src/level/level5.ts src/level/level6.ts src/level/level7.ts \
            src/scenes/LevelSelectScene.ts
rtk git commit -m "feat: add test levels 2-7 (solo melee, solo shooter, pathfinding maze, melee dojo, shooter range, mixed pack)"
```

---

## Ручная проверка (после Task 7)

```bash
make dev
```

Открыть http://localhost:5173 в браузере.

**Чеклист:**

- [ ] LevelSelectScene показывает 7 кнопок, все видны на экране без обрезания
- [ ] Клавиши 1–7 запускают соответствующий уровень
- [ ] **Level 2 (Solo Melee):** один красный квадрат в центре; игрок подходит → aggro, атака, dodge при прицеливании
- [ ] **Level 3 (Solo Shooter):** синий квадрат справа; игрок подходит → стрельба; игрок уходит за пилон x=700 → SEARCH (shooter движется); игрок выходит → возобновляет стрельбу
- [ ] **Level 4 (Pathfinding Maze):** 4 перегородки видны; 4 врага за ними; все пробираются к игроку через зазоры, не застревают
- [ ] **Level 5 (Melee Dojo):** 4 колонны, 6 melee в дуге; не все атакуют одновременно (slot система)
- [ ] **Level 6 (Shooter Range):** 4 колонны, 4 shooter в шахматном порядке; игрок за пилон x=600 → часть теряет LoS и входит в SEARCH
- [ ] **Level 7 (Mixed Pack):** L-стена видна; shooter aggro первым → melee рядом просыпаются от pack alert
- [ ] ESC из любого уровня → возврат в LevelSelectScene

---

## Проверка self-review

**Spec coverage:**
- Solo Melee ✓ (Task 1)
- Solo Shooter ✓ (Task 2)
- Pathfinding Maze ✓ (Task 3)
- Melee Dojo ✓ (Task 4)
- Shooter Range ✓ (Task 5)
- Mixed Pack ✓ (Task 6)
- LevelSelectScene с 7 уровнями ✓ (Task 7)

**Placeholders:** нет.

**Type consistency:** все файлы используют `LevelData` из `./level1`, тип `EnemySpawn.type` = `"melee" | "shooter"` — соответствует существующему интерфейсу во всех задачах.
