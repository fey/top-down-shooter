# ShooterEnemy: canDodge hook + LoS cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Запретить ShooterEnemy доджить через стену и убрать дублирующие вызовы `hasLoS` за тик.

**Architecture:** В базовый класс `Enemy` добавляется protected-хук `canDodge()`, возвращающий `true` по умолчанию; `ShooterEnemy` переопределяет его через кешированный результат LoS. В начале `tick()` вычисляется `losCache` один раз и используется везде вместо прямых вызовов `hasLoS()`.

**Tech Stack:** TypeScript strict, Phaser 3.

---

### Task 1: Хук canDodge в Enemy

**Files:**
- Modify: `src/entities/Enemy.ts`

- [ ] **Step 1: Добавить protected canDodge и вызов в checkAndTriggerDodge**

Найти в `src/entities/Enemy.ts` метод `checkAndTriggerDodge`. Добавить перед ним protected-метод и ранний выход в начале checkAndTriggerDodge:

```ts
  // Подклассы переопределяют для условного запрета доджа (например, нет LoS)
  protected canDodge(_player: Player): boolean {
    return true;
  }

  // Returns true while in DODGE — caller skips its own tick logic
  checkAndTriggerDodge(player: Player): boolean {
    const now = this.scene.time.now;

    if (this.state === EnemyState.DODGE) {
      if (now >= this.dodgeEndTime) {
        this.state = this.prevState;
      } else {
        this.setVelocity(this.dodgeVel.x, this.dodgeVel.y);
      }
      return true;
    }

    if (this.state === EnemyState.IDLE) return false;
    if (now - this.lastDodgeTime < DODGE_COOLDOWN) return false;
    if (!this.canDodge(player)) return false;   // ← новая строка

    const aimAngle = player.rotation - Math.PI / 2;
    const angleToEnemy = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
    const diff = Math.abs(Phaser.Math.Angle.Wrap(aimAngle - angleToEnemy));

    if (diff < DODGE_ANGLE_THRESHOLD) {
      this.prevState = this.state;
      this.state = EnemyState.DODGE;
      this.lastDodgeTime = now;
      this.dodgeEndTime = now + DODGE_DURATION;

      const side = Math.random() < 0.5 ? 1 : -1;
      const speed = this.baseSpeed * DODGE_SPEED_MULT;
      const perpAngle = angleToEnemy + side * (Math.PI / 2);
      this.dodgeVel.set(Math.cos(perpAngle) * speed, Math.sin(perpAngle) * speed);
    }

    return false;
  }
```

- [ ] **Step 2: Проверить typecheck**

```bash
make typecheck
```
Ожидаемый результат: no errors.

- [ ] **Step 3: Commit**

```bash
rtk git add src/entities/Enemy.ts && rtk git commit -m "feat(ai): add canDodge hook to Enemy base class"
```

---

### Task 2: losCache + override canDodge в ShooterEnemy

**Files:**
- Modify: `src/entities/ShooterEnemy.ts`

- [ ] **Step 1: Добавить поле losCache**

Найти в `src/entities/ShooterEnemy.ts` блок полей класса (после `private hasSeenPlayer = false;`). Добавить:

```ts
  private losCache = false;
```

- [ ] **Step 2: Заменить начало tick() — вычислять losCache первым**

Найти начало метода `tick(player: Player)`:
```ts
  tick(player: Player): void {
    if (this.checkAndTriggerDodge(player)) return;

    if (this.hasLoS(player)) {
      this.lastKnownPos.set(player.x, player.y);
      this.hasSeenPlayer = true;
    }
```
Заменить на:
```ts
  tick(player: Player): void {
    this.losCache = this.hasLoS(player);
    if (this.losCache) {
      this.lastKnownPos.set(player.x, player.y);
      this.hasSeenPlayer = true;
    }
    if (this.checkAndTriggerDodge(player)) return;
```

Важно: `losCache` вычисляется **до** `checkAndTriggerDodge`, чтобы `canDodge` видел свежее значение.

- [ ] **Step 3: Добавить override canDodge**

После метода `tick()`, перед `enterStrafe`, добавить:

```ts
  protected override canDodge(_player: Player): boolean {
    return this.losCache;
  }
```

- [ ] **Step 4: Заменить все hasLoS(player) на this.losCache в switch**

В теле switch-statement заменить каждый вызов `this.hasLoS(player)` на `this.losCache`.

Найти и заменить (4 вхождения):

```ts
// IDLE — было:
if (dist < ENEMY_AGGRO_RANGE && this.hasLoS(player)) {
// стало:
if (dist < ENEMY_AGGRO_RANGE && this.losCache) {

// CHASE — было:
if (this.hasSeenPlayer && !this.hasLoS(player)) {
// стало:
if (this.hasSeenPlayer && !this.losCache) {

// CHASE — было:
if (dist <= SHOOTER_RANGE && this.hasLoS(player)) {
// стало:
if (dist <= SHOOTER_RANGE && this.losCache) {

// SHOOT — было:
if (!this.hasLoS(player)) {
// стало:
if (!this.losCache) {

// SEARCH — было:
if (this.hasLoS(player)) {
// стало:
if (this.losCache) {
```

- [ ] **Step 5: Проверить typecheck и lint**

```bash
make typecheck && make check
```
Ожидаемый результат: no errors, no fixes applied.

- [ ] **Step 6: Commit**

```bash
rtk git add src/entities/ShooterEnemy.ts && rtk git commit -m "feat(ai): cache LoS per tick, override canDodge in ShooterEnemy"
```

---

### Task 3: Ручная проверка

- [ ] **Step 1: Запустить dev-сервер**

```bash
make dev
```

- [ ] **Step 2: Dodge через стену**

Встать за стеной и навести прицел на ShooterEnemy (синего). Враг **не должен** дёргаться. Выйти на открытое место и навести прицел — должен доджить.

- [ ] **Step 3: MeleeEnemy доджит как прежде**

Навести прицел на красного врага через стену и на открытом месте — должен доджить в обоих случаях (у MeleeEnemy нет LoS-ограничений).

- [ ] **Step 4: Push**

```bash
rtk git push
```
