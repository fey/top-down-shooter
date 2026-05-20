# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
AGENTS.md is a symlink to this file — they are the same document.


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


## Project Overview

Small browser top-down shooter: one static map, two weapons, two enemy types.
Built milestone-by-milestone (M1–M9) as defined in `docs/roadmap.md` — read it before touching anything.

## Stack

- **Phaser 3** (2D game engine).
- **TypeScript** in strict mode.
- **Vite** for dev server and bundling.
- **Biome** for lint + format (replaces ESLint + Prettier) — single `biome.json`.

## Build & Test

```bash
make install    # npm ci
make dev        # Vite dev server
make build      # tsc + vite build
make preview    # vite preview
make check      # Biome lint + format check
make format     # Biome format --write
make typecheck  # tsc --noEmit
make clean      # rm -rf dist
```

No automated tests — verification is manual (open dev server, exercise the behavior). Each milestone in `docs/roadmap.md` has its own **Verify** checklist.

## Architecture Overview

The big-picture shape (see `docs/roadmap.md` for full details):

- **Scenes** (`src/scenes/`) are the Phaser top-level state machine: `Boot → Preload → MainMenu → Game → GameOver`, with `HUDScene` running as an overlay on top of `Game`. The HUD communicates with `GameScene` only through `scene.events.emit(...)` events (`hpChanged`, `ammoChanged`, etc.) — do not reach into `GameScene` directly from the HUD.
- **GameScene** is the integration hub: it owns the player, enemy groups, wall (static physics) group, pickups, and two bullet groups (player bullets vs. enemy bullets). All collision wiring lives here.
- **Entities** (`src/entities/`) are thin Phaser sprite subclasses with an Arcade Physics body. Each owns its own AI/behavior tick. Enemies share a base `Enemy` class; concrete subtypes (`MeleeEnemy`, `ShooterEnemy`) differ only in their AI.
- **Weapons** (`src/weapons/`) are separate from entities: each weapon encapsulates cooldown, ammo, and bullet spawning. The player delegates firing to its currently equipped `Weapon`. New weapons = new `Weapon` subclass, no changes elsewhere.
- **Level data** (`src/level/level1.ts`) is plain data — arrays of walls, enemy spawns, pickups, and a start position. `GameScene` reads this on init. To change the level, edit data, not code.
- **Tuning numbers** (HP, speed, damage, cooldowns, ranges) live in `src/config.ts`. When balancing feels off, this is the only file you should be editing.

Two bullet groups (player vs. enemy) is intentional — keeps collision rules simple and avoids friendly-fire checks.

## Conventions & Patterns

- **Work milestone-by-milestone.** Each `Mx` in `docs/roadmap.md` is a separate commit/PR and must leave the game runnable and verifiable in the browser. Do not stack changes across milestones in one commit.
- **Strict TypeScript.** No `any`, no `// @ts-ignore` without a comment explaining why.
- **Biome is the only linter/formatter.** Don't add ESLint or Prettier; don't fight Biome's defaults.
- **Numbers in `config.ts`, data in `level1.ts`.** Don't hardcode tuning constants or level layout inside scenes or entities.
- **Scene communication via events.** HUD and other overlay scenes subscribe to `scene.events` from `GameScene`; don't grab the other scene's instance.
- **Scene keys co-located with scenes.** Each scene file exports its own key constant (`BOOT_SCENE_KEY`, etc.). Import the target scene's key when calling `scene.start()`.
- **Out of scope for the prototype** (see roadmap): saves/progression, audio, multiple levels, pathfinding, mobile/gamepad controls, sprite animations beyond static Kenney art. Don't add these without explicit scope change.

## Communication Style

When explaining code, architecture, or game mechanics — cover the **why**, not just the what:
- Explain the reason behind a design decision (e.g. why two bullet groups instead of one).
- Connect Phaser 3 concepts to concrete game behavior (e.g. what Arcade Physics body means in practice).
- When touching `config.ts`, mention which gameplay feel the numbers affect.
- Keep it concise — one paragraph of context beats a bullet list of facts.

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%)
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->
