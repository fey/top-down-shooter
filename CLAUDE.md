# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This file also serves as the project instructions for any AI coding agent working on this repository.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->


## Project Status

Early-stage prototype, **pre-code**: only `docs/roadmap.md` exists so far. That file is the source of truth for scope, stack, structure, and milestone breakdown — read it before touching anything.

Goal: small browser top-down shooter (one static map, two weapons, two enemy types) built incrementally through milestones M1–M9 defined in the roadmap.

## Stack

- **Phaser 3** (2D game engine).
- **TypeScript** in strict mode.
- **Vite** for dev server and bundling (`npm run dev` / `npm run build`).
- **Biome** for lint + format (replaces ESLint + Prettier) — single `biome.json`.

None of these are installed yet; M1 sets them up.

## Build & Test

Once M1 is implemented, the standard scripts will be:

```bash
npm install
npm run dev         # Vite dev server
npm run build       # production build
npm run check       # Biome lint + format check
npm run typecheck   # tsc --noEmit
```

There are no automated tests planned — verification is manual per milestone (open the dev server, exercise the new behavior). Each milestone in `docs/roadmap.md` has its own **Verify** checklist.

## Architecture Overview

Planned (see `docs/roadmap.md` for full details). The big-picture shape:

- **Scenes** (`src/scenes/`) are the Phaser top-level state machine: `Boot → Preload → MainMenu → Game → GameOver`, with `HUDScene` running as an overlay on top of `Game`. The HUD communicates with `GameScene` only through `scene.events.emit(...)` events (`hpChanged`, `ammoChanged`, etc.) — do not reach into `GameScene` directly from the HUD.
- **GameScene** is the integration hub: it owns the player, enemy groups, wall (static physics) group, pickups, and two bullet groups (player bullets vs. enemy bullets). All collision wiring lives here.
- **Entities** (`src/entities/`) are thin Phaser sprite subclasses with an Arcade Physics body. Each owns its own AI/behavior tick. Enemies share a base `Enemy` class; concrete subtypes (`MeleeEnemy`, `ShooterEnemy`) differ only in their AI.
- **Weapons** (`src/weapons/`) are separate from entities: a weapon has `tryFire(scene, owner, targetVec)` and encapsulates cooldown, ammo, and bullet spawning. The player delegates firing to its currently equipped `Weapon`. New weapons = new `Weapon` subclass, no changes elsewhere.
- **Level data** (`src/level/level1.ts`) is plain data — arrays of walls, enemy spawns, pickups, and a start position. `GameScene` reads this on init. To change the level, edit data, not code.
- **Tuning numbers** (HP, speed, damage, cooldowns, ranges) live in `src/config.ts`. When balancing feels off, this is the only file you should be editing.

Two bullet groups (player vs. enemy) is intentional — keeps collision rules simple and avoids friendly-fire checks.

## Conventions & Patterns

- **Work milestone-by-milestone.** Each `Mx` in `docs/roadmap.md` is a separate commit/PR and must leave the game runnable and verifiable in the browser. Do not stack changes across milestones in one commit.
- **Strict TypeScript.** No `any`, no `// @ts-ignore` without a comment explaining why.
- **Biome is the only linter/formatter.** Don't add ESLint or Prettier; don't fight Biome's defaults.
- **Numbers in `config.ts`, data in `level1.ts`.** Don't hardcode tuning constants or level layout inside scenes or entities.
- **Scene communication via events.** HUD and other overlay scenes subscribe to `scene.events` from `GameScene`; don't grab the other scene's instance.
- **Out of scope for the prototype** (see roadmap): saves/progression, audio, multiple levels, pathfinding, mobile/gamepad controls, sprite animations beyond static Kenney art. Don't add these without explicit scope change.
