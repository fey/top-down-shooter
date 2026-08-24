# Issue tracker: beads (bd)

Issues and specs for this repo live in **beads (`bd`)** — a local Dolt database synced over
`refs/dolt/data` on the git remote. `.beads/issues.jsonl` is a passive export, never the source of
truth: do not read or edit it to answer questions about issues, run `bd` instead.

GitHub Issues are **not** used for this repo. Never fall back to `gh issue create`.

Issue ids look like `top-down-shooter-7up` — a repo prefix plus a short suffix. Most commands accept
the bare suffix too.

## Conventions

- **Create an issue**: `bd create --title "..." --description "..." --type=bug|feature|task|epic|chore|decision --priority=2`
  - Priority is `0`–`4` (`0` = critical, `2` = default, `4` = backlog) — never the words high/medium/low.
  - Multi-line bodies: pass a `$'...'` string, or use `--description-file -` and pipe stdin.
  - Extra structure lives in dedicated flags, not in the description: `--acceptance`, `--design`, `--notes`.
  - `--validate` checks the description carries the sections the issue type expects.
- **Read an issue**: `bd show <id>` (add `--json` when you need to parse it). Comments are included.
- **List issues**: `bd list --status=open --json`, plus `--label`, `--label-any`, `--exclude-label`,
  `--priority`, `--type` filters. `bd ready` lists only issues with no open blockers — that's the
  frontier query, prefer it over filtering `bd list` by hand.
- **Search**: `bd search <query>` — run this before creating an issue, to avoid duplicates.
- **Comment**: `bd comment <id> "..."` (or `echo ... | bd comment <id> --stdin`).
- **Apply / remove labels**: `bd update <id> --add-label ... --remove-label ...`
  (`--set-labels` replaces the whole set).
- **Claim**: `bd update <id> --claim` (or `--assignee=<who>`). Claiming moves it to `in_progress`.
- **Close**: `bd close <id> --reason="..."`. Several at once: `bd close <id1> <id2> ...`.
  `--suggest-next` prints what the close just unblocked.
- **Never run `bd edit`** — it opens `$EDITOR` and blocks the agent. Use `bd update --title/--description/--notes/--design`.

`bd` auto-commits to Dolt. Pushing is still a session-close step: `git push` (and `bd dolt push`
when the beads remote needs it).

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

## When a skill says "publish to the issue tracker"

Run `bd create` with the appropriate `--type` and `--priority`.

## When a skill says "fetch the relevant ticket"

Run `bd show <id>` (`--json` if the skill needs fields rather than prose).

## Wayfinding operations

Used by `/wayfinder`. The **map** is an `epic` issue; **tickets** are its children.

- **Map**: `bd create --type=epic --label wayfinder:map --title "..."`, holding the
  Notes / Decisions-so-far / Fog body. Keep the body current with `bd update <map> --description ...`.
- **Child ticket**: `bd create --parent <map-id> --label wayfinder:<type>` where `<type>` is
  `research` / `prototype` / `grilling` / `task`. Children inherit the parent's labels unless
  `--no-inherit-labels` is passed.
- **Blocking**: native dependencies — `bd dep add <blocked-id> <blocker-id>`
  (equivalently `bd dep <blocker> --blocks <blocked>`). Inspect with `bd dep list <id>` or `bd blocked`;
  `bd dep cycles` catches accidental loops. A ticket is unblocked once every blocker is closed.
- **Frontier query**: `bd ready` — it already excludes issues with open blockers. Scope it to the map
  with `--label wayfinder:map`-derived children, drop anything already assigned; first in map order wins.
- **Claim**: `bd update <id> --claim` — the session's first write.
- **Resolve**: `bd comment <id> "<answer>"`, then `bd close <id> --reason="..."`, then append a
  context pointer to the map's Decisions-so-far.
- **Persistent knowledge** that outlives a single ticket goes to `bd remember "<insight>"`
  (search with `bd memories <keyword>`), not to a markdown file.
