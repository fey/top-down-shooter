export const PLAYER_HP = 5;
export const PLAYER_SPEED = 200;
export const MAP_WIDTH = 1920;
export const MAP_HEIGHT = 1080;

// Спрайты Kenney крупнее заглушек 32×32, приводим к ~30px и задаём круговое
// тело (тела Arcade не вращаются — круг даёт стабильный коллайдер при повороте)
export const PLAYER_SPRITE_SCALE = 0.7;
export const ENEMY_SPRITE_SCALE = 0.7;
export const PLAYER_BODY_RADIUS = 20; // в пикселях текстуры; ×scale → ~14px на экране
export const ENEMY_BODY_RADIUS = 20;

export const BULLET_SPEED = 600;
export const BULLET_TTL = 2000;
export const BULLET_DAMAGE = 1;
export const PISTOL_COOLDOWN = 250;

export const SHOTGUN_COOLDOWN = 700; // втрое медленнее пистолета — плата за веер
export const SHOTGUN_PELLETS = 5;
export const SHOTGUN_SPREAD_RAD = 0.52; // ~30° от края до края (±15°)

// Винтовка: редкий выстрел, но сносит melee (2 HP) и shooter (3 HP) с одного.
// «Дальнобойность» — это не дистанция (пистолет и так бьёт дальше экрана 960 px),
// а скорость пули: 1600 px/s ⇒ полэкрана за 0.3 с, по бегущей цели можно целиться
// в неё, а не перед ней.
export const RIFLE_COOLDOWN = 900;
export const RIFLE_DAMAGE = 3;
export const RIFLE_BULLET_SPEED = 1600;

// Автомат: 10 выстрелов/с против 4 у пистолета, но платит неточностью.
// Урон 1 — уже минимум при HP врагов 2/3/5, поэтому ослабить темп можно только разбросом.
export const AUTOMAT_COOLDOWN = 100;
export const AUTOMAT_BULLET_SPEED = 700;
export const AUTOMAT_AIM_SPREAD_RAD = 0.2; // полный конус ~11°: ±10 px на 100 px, ±48 px на 480

export const MELEE_ENEMY_HP = 2;
export const MELEE_ENEMY_SPEED = 140;
export const MELEE_ENEMY_DAMAGE = 1;
export const MELEE_ENEMY_ATTACK_COOLDOWN = 600;
export const MELEE_SEARCH_TIMEOUT = 1500; // мс ожидания у lastKnownPos перед де-агро

export const SHOOTER_ENEMY_HP = 3;
export const SHOOTER_ENEMY_SPEED = 100;
export const SHOOTER_ENEMY_DAMAGE = 1;
export const SHOOTER_ENEMY_FIRE_COOLDOWN = 1500;
export const SHOOTER_RANGE = 350;
export const SHOOTER_BULLET_SPEED = 400;
export const SHOOTER_KITE_RETREAT_DIST = 262; // SHOOTER_RANGE * 0.75 — перепозиционироваться ближе этого
export const SHOOTER_KITE_ADVANCE_DIST = 402; // SHOOTER_RANGE * 1.15 — сближаться дальше этого

// SmartBot — соперник уровня игрока с продвинутым ИИ (см. docs/spec.md).
// HP/скорость как у игрока; оружие переиспользует PISTOL_COOLDOWN/BULLET_SPEED/BULLET_DAMAGE.
export const SMART_BOT_HP = 5; // как у игрока
export const SMART_BOT_SPEED = 200; // как у игрока
export const SMART_BOT_AGGRO_RANGE = 400; // умнее обычных врагов — раньше замечает игрока
export const SMART_BOT_COMBAT_RANGE = 350; // дистанция перехода в бой (SHOOT)
export const SMART_BOT_KITE_RETREAT_DIST = 220; // ближе — отступать от игрока
export const SMART_BOT_KITE_ADVANCE_DIST = 320; // дальше — сближаться через pathfinding
export const SMART_BOT_REACTION_MS = 180; // задержка реакции перед открытием огня (честность)
export const SMART_BOT_LOS_GRACE_MS = 400; // короче этого пропадание LoS — «мигание», реакцию не перевзводит
export const SMART_BOT_AIM_SPREAD = 0.08; // рад (~4.5°) — разброс прицела (скилл-модель)
export const SMART_BOT_DODGE_RADIUS = 130; // дистанция реакции на летящую пулю игрока
export const SMART_BOT_DODGE_DURATION = 250; // мс рывка вбок при уклонении
export const SMART_BOT_LOW_HP = 2; // порог HP для ухода в укрытие
export const SMART_BOT_STRAFE_FLIP_MS = 800; // период смены направления circle-strafe
export const SMART_BOT_RETREAT_MS = 1800; // макс. длительность отхода в укрытие
export const SMART_BOT_RETREAT_COOLDOWN_MS = 5000; // пауза перед следующим отходом (нет лечения — иначе вечно прячется)
export const SMART_BOT_PATROL_MIN_DIST = 350; // мин. дистанция новой точки патруля от текущей
export const SMART_BOT_SEARCH_DURATION = 4000; // мс обыска района у lastKnownPos перед возвратом к патрулю
export const SMART_BOT_SEARCH_RADIUS = 250; // радиус разброса точек обыска вокруг lastKnownPos

export const ENEMY_AGGRO_RANGE = 250;
export const PACK_ALERT_RADIUS = 300;
export const MELEE_ATTACK_RANGE = 50;

export const PATH_CELL_SIZE = 64;
export const PATH_RECALC_DIST = 64; // отклонение цели от пути → пересчёт (1 клетка)
export const WAYPOINT_REACH_DIST = 24;
export const STUCK_TIME_MS = 350; // мс без движения → враг считается застрявшим
export const STUCK_MOVE_THRESHOLD = 6; // пикселей — меньше этого = не двигался
export const WALL_SEPARATION_STRENGTH = 10; // сила отталкивания от стен — меньше значение = плавнее скольжение вдоль стен

// --- Тайминги (мс) ---
export const PLAYER_INVINCIBLE_MS = 500; // неуязвимость после получения урона
export const PLAYER_HIT_FLASH_MS = 150; // длительность красного тинта при уроне
export const SHOOTER_STRAFE_FLIP_MS = 1000; // период смены направления strafe у ShooterEnemy

// --- Размеры спрайтов и геометрия ---
export const BULLET_SPRITE_W = 8; // ширина генерируемой текстуры пули, px
export const BULLET_SPRITE_H = 4; // высота генерируемой текстуры пули, px
export const SMART_BOT_DODGE_LATERAL_MULT = 1.8; // боковой зазор угрозы = ENEMY_BODY_RADIUS × это

// --- Символьный рендер сущностей ---
// Игрок/враги рисуются процедурно (Graphics→generateTexture в PreloadScene): круг тела
// радиусом *_BODY_RADIUS + опциональный «ствол»-индикатор вдоль +X (rotation=0 ⇒ восток).
// Ствол-индикатор показывает направление прицела; в Вехе 2 у игрока он станет per-weapon.
export const INDICATOR_BARREL_LENGTH = 16; // длина ствола за кругом тела, px текстуры
export const INDICATOR_BARREL_WIDTH = 7; // толщина ствола, px текстуры

// Пикап оружия: светлая рамка, заливка цветом ствола и глиф оружия внутри.
// Размер чуть больше игрока (28px на экране) — иначе глиф нечитаем и пикап
// остаётся «непонятным квадратиком».
export const PICKUP_SIZE = 32; // сторона квадрата пикапа, px текстуры
export const PICKUP_FRAME_WIDTH = 3; // толщина рамки, px
export const PICKUP_GLYPH_FONT_PX = 24; // кегль глифа; влезает в 26px просвета внутри рамки

// --- HUD (оверлейная сцена поверх игры) ---
// Три показателя, которые нужны в бою: сколько осталось жить, чем стреляешь и сколько
// врагов ещё живо. HP и оружие в левом нижнем углу (взгляд там же, где персонаж),
// счётчик врагов — в правом верхнем, чтобы не спорить с дебаг-оверлеем слева сверху.
export const HUD_MARGIN = 14; // отступ от края экрана, px
export const HUD_HP_FONT_PX = 26; // HP — самый крупный элемент HUD
export const HUD_WEAPON_FONT_PX = 18;
export const HUD_ENEMIES_FONT_PX = 20;
export const HUD_LINE_GAP = 8; // зазор между строкой HP и строкой оружия, px
export const HUD_HP_LOW = 2; // HP, начиная с которого счётчик краснеет (два попадания до смерти)

// --- Меню и экраны ---
export const MENU_TITLE_FONT_PX = 52; // заголовок главного меню
export const MENU_OUTCOME_FONT_PX = 64; // «ПОБЕДА» / «ПОРАЖЕНИЕ» — крупнее всех надписей
export const MENU_HEADING_FONT_PX = 36; // заголовок экрана внутри петли («Выберите уровень»)
export const MENU_SUBTITLE_FONT_PX = 20;
export const MENU_BTN_FONT_PX = 26;
export const MENU_BTN_SPACING = 56; // шаг между кнопками в вертикальном столбце, px

// --- Палитра ---
// Тинты спрайтов (0xRRGGBB)
export const COLOR_PLAYER_HIT_TINT = 0xff4444; // красная вспышка игрока при уроне
export const COLOR_BULLET = 0xffff88; // цвет генерируемой текстуры пули
// Цвета тел сущностей в символьном рендере
export const COLOR_PLAYER_BODY = 0x4488ff; // синий — игрок
export const COLOR_MELEE_BODY = 0xff4444; // красный — melee-враг (без ствола)
export const COLOR_SHOOTER_BODY = 0xff8844; // оранжевый — shooter-враг
export const COLOR_SMART_BODY = 0x44ff88; // зелёный — SmartBot
export const COLOR_BARREL = 0x222222; // тёмный ствол-индикатор (пистолет, враги)
export const COLOR_BARREL_SHOTGUN = 0x9a6b2f; // рыжее «дерево» — дробовик виден издалека
export const COLOR_BARREL_RIFLE = 0x7f8fa6; // холодная сталь — винтовка
export const COLOR_BARREL_AUTOMAT = 0x6f8f3f; // хаки — автомат
export const COLOR_PICKUP_FRAME = 0xdddddd; // рамка пикапа — контраст с тёмным полом
// Debug-отрисовка путей (F1)
export const COLOR_DEBUG_MELEE = 0xff4444;
export const COLOR_DEBUG_SHOOTER = 0x4444ff;
export const COLOR_DEBUG_SMART = 0x44ff88;
export const COLOR_DEBUG_TARGET = 0xffff00;
// UI / фоны сцен (CSS-строки)
export const COLOR_BG_GAME = "#1a1a1a";
export const COLOR_BG_MENU = "#111111";
export const COLOR_BG_GAMEOVER = "#000000";
export const COLOR_TEXT = "#ffffff";
export const COLOR_TEXT_MUTED = "#aaaaaa";
export const COLOR_MENU_BTN = "#aaffaa";
export const COLOR_MENU_BTN_HOVER = "#ffffff";
export const COLOR_MENU_BTN_BG = "#223322";
export const COLOR_WIN = "#88ff88";
export const COLOR_LOSE = "#ff4444";
export const COLOR_HUD_HP_LOW = COLOR_LOSE; // HP на пороге HUD_HP_LOW — тем же красным, что «ПОРАЖЕНИЕ»

// --- Реестр оружия ---
// Оружие — данные, а не подклассы: один `Weapon` читает дескриптор. Добавить пушку =
// добавить запись здесь (текстура игрока и цвет пикапа генерируются из barrel).
// Идёт последним в файле: дескрипторы ссылаются на константы и цвета выше.

/** Ствол-индикатор в символьном рендере: геометрия и цвет, по которым генерируется текстура. */
export interface BarrelDef {
  length: number; // px текстуры, выступает за круг тела
  width: number; // толщина, px текстуры
  color: number; // 0xRRGGBB
}

/** Дескриптор оружия. `pelletCount`/`spreadRad` описывают веер (1 и 0 — одиночный выстрел). */
export interface WeaponDef {
  id: string;
  name: string; // человекочитаемое имя для HUD; уникально по реестру
  glyph: string; // один символ на пикапе; уникален по реестру (проверяется config.test.ts)
  cooldown: number; // мс между выстрелами
  bulletSpeed: number; // px/s
  damage: number; // HP за пулю (у веера — за каждую дробинку)
  pelletCount: number;
  spreadRad: number; // полный угол веера (крайняя левая ↔ крайняя правая дробинка)
  aimSpreadRad: number; // полный конус случайной неточности; 0 — оружие идеально точное
  barrel: BarrelDef;
}

export const WEAPONS = {
  pistol: {
    id: "pistol",
    name: "Пистолет",
    glyph: "P",
    cooldown: PISTOL_COOLDOWN,
    bulletSpeed: BULLET_SPEED,
    damage: BULLET_DAMAGE,
    pelletCount: 1,
    spreadRad: 0,
    aimSpreadRad: 0,
    barrel: {
      length: INDICATOR_BARREL_LENGTH,
      width: INDICATOR_BARREL_WIDTH,
      color: COLOR_BARREL,
    },
  },
  shotgun: {
    id: "shotgun",
    name: "Дробовик",
    glyph: "S",
    cooldown: SHOTGUN_COOLDOWN,
    bulletSpeed: BULLET_SPEED,
    damage: BULLET_DAMAGE,
    pelletCount: SHOTGUN_PELLETS,
    spreadRad: SHOTGUN_SPREAD_RAD,
    aimSpreadRad: 0,
    // Короче и заметно толще пистолетного — силуэт читается без подписи
    barrel: { length: 12, width: 12, color: COLOR_BARREL_SHOTGUN },
  },
  rifle: {
    id: "rifle",
    name: "Винтовка",
    glyph: "R",
    cooldown: RIFLE_COOLDOWN,
    bulletSpeed: RIFLE_BULLET_SPEED,
    damage: RIFLE_DAMAGE,
    pelletCount: 1,
    spreadRad: 0,
    aimSpreadRad: 0, // идеально точная — этим и оправдан редкий выстрел
    // Самый длинный и тонкий ствол — снайперский силуэт
    barrel: { length: 26, width: 5, color: COLOR_BARREL_RIFLE },
  },
  automat: {
    id: "automat",
    name: "Автомат",
    glyph: "A",
    cooldown: AUTOMAT_COOLDOWN,
    bulletSpeed: AUTOMAT_BULLET_SPEED,
    damage: BULLET_DAMAGE,
    pelletCount: 1,
    spreadRad: 0,
    aimSpreadRad: AUTOMAT_AIM_SPREAD_RAD,
    // Средний по всем осям — между пистолетом и винтовкой
    barrel: { length: 20, width: 8, color: COLOR_BARREL_AUTOMAT },
  },
} as const satisfies Record<string, WeaponDef>;

/** Идентификаторы оружия, известные реестру (для чтения из Tiled-свойств пикапов). */
export type WeaponId = keyof typeof WEAPONS;

/** Проверяет, что строка из данных уровня — валидный id оружия. */
export function isWeaponId(id: string): id is WeaponId {
  return id in WEAPONS;
}

/**
 * Ключ текстуры игрока для данного оружия. Текстуры генерируются в PreloadScene по одной
 * на запись реестра — ключ строится здесь, чтобы генератор и `Player.equip` не разъехались.
 */
export function playerTextureKey(def: WeaponDef): string {
  return `player_${def.id}`;
}

/** Ключ текстуры пикапа для данного оружия (генерируется там же, где текстуры игрока). */
export function pickupTextureKey(def: WeaponDef): string {
  return `pickup_${def.id}`;
}
