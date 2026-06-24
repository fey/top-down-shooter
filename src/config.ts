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

export const ENEMY_AGGRO_RANGE = 250;
export const PACK_ALERT_RADIUS = 300;
export const MELEE_ATTACK_RANGE = 50;

export const PATH_CELL_SIZE = 64;
export const PATH_RECALC_DIST = 64; // отклонение цели от пути → пересчёт (1 клетка)
export const WAYPOINT_REACH_DIST = 24;
export const STUCK_TIME_MS = 350; // мс без движения → враг считается застрявшим
export const STUCK_MOVE_THRESHOLD = 6; // пикселей — меньше этого = не двигался
export const WALL_SEPARATION_STRENGTH = 10; // сила отталкивания от стен — меньше значение = плавнее скольжение вдоль стен
