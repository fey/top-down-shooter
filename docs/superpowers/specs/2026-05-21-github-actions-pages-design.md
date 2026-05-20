# GitHub Actions CI/CD + GitHub Pages — Design

**Date:** 2026-05-21
**Project:** top-down-shooter (Phaser 3 + TypeScript + Vite)

## Context

The project exists locally only — no git remote, no CI. We need:
- Automated quality gates (lint, typecheck, build) on every push and PR
- Public demo hosted on GitHub Pages, auto-updated on every push to `main`

## Design

### Single workflow, two jobs

`.github/workflows/ci.yml`:

```
on: push (all branches) + pull_request
  └─ job: build
       ├─ npm ci
       ├─ biome check .          (lint + format)
       ├─ tsc --noEmit           (typecheck)
       ├─ vite build             (→ dist/)
       └─ upload-pages-artifact  (main only)

on: push to main
  └─ job: deploy  (needs: build)
       └─ deploy-pages
```

### Vite base URL

GitHub Pages serves from `/<repo-name>/`. Without `base: '/top-down-shooter/'` in `vite.config.ts`, all asset paths break (404s for JS/CSS).

### GitHub Pages source

Must be set to **GitHub Actions** in repository Settings → Pages. This enables the `upload-pages-artifact` / `deploy-pages` mechanism instead of the legacy branch-based approach.

## Decisions

| Option | Chosen | Reason |
|--------|--------|--------|
| One workflow file | ✅ | Project is small; splitting adds no benefit |
| `upload-pages-artifact` + `deploy-pages` | ✅ | Official GitHub mechanism; no extra branch |
| `peaceiris/actions-gh-pages` | ❌ | Legacy; creates `gh-pages` branch clutter |
| Two separate workflow files | ❌ | Overkill for this project size |
| Deploy on tag only | ❌ | User wants continuous deployment on main |

## Manual steps (one-time)

After pushing the code:
1. `gh repo create top-down-shooter --public`
2. `git remote add origin https://github.com/<username>/top-down-shooter.git && git push -u origin main`
3. Repository Settings → Pages → Source: **GitHub Actions**
