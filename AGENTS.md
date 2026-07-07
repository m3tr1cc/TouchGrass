# AGENTS.md

## Project identity

TouchGrass is a customer-facing PromptParty project: a full-frame interactive grass canvas where users move through animated grass and grow white flowers by clicking or tapping. Treat this repository as production application code, not a disposable mockup or landing page.

## Core stack

Use this stack unless a task explicitly changes it:

- Vite
- React
- TypeScript
- Canvas 2D
- Plain CSS
- Vercel static deployment

Do not migrate this app to Next.js, add a backend, add auth, add a database, or introduce heavy UI frameworks unless the task explicitly requires it.

## Product mindset

This is a real interactive app. Do not implement fake interactions, placeholder-only rendering, decorative buttons that do nothing, or flows that imply unavailable behavior.

The core experience must stay focused:

- the app fills the PromptParty iframe or preview frame
- grass is always visible and covers the full frame
- idle animation feels organic and calm
- pointer hover visibly parts the grass
- click/tap grows a flower at the selected location
- click/tap and drag grows spaced flower streaks
- the yellow flower center is the placement coordinate; do not anchor placement at the stem base
- flower drawings clear on refresh so every feed encounter starts fresh

## Supabase migrations

For every task, explicitly check whether the requested change requires a Supabase schema, RLS, seed, function, trigger, or policy migration.

If a migration is needed:

- create a real Supabase migration in the repository's migrations directory
- apply the migration before finishing the task
- verify app code matches the migrated schema and policies
- include migration status in the final handoff

Do not leave required database changes as TODOs, manual dashboard edits, or unapplied migration files.

## Required commands

Before finishing, run:

```bash
npm run lint
npm run check
npm run build
```

## Visual direction

The grass patch should follow the supplied green pixel-art grass reference: dense, tiled, saturated greens, with blocky vertical and diagonal grass marks.

The flower should use the transparent sprite at `public/flower-sprite.png`, extracted from the supplied pixel reference. Keep the yellow flower center as the drawing coordinate and preserve gentle wind motion.

Avoid UI chrome, cards, text overlays, marketing sections, nav bars, and decorative elements that compete with the canvas. The first screen is the product.

## Accessibility and motion

Respect `prefers-reduced-motion` by reducing nonessential animation. Keep touch and pointer input working across desktop and mobile. Do not trap scroll or focus outside the embedded app requirements.

## Pull request handoff

At the end of every task after bootstrap, after all required checks have passed and task-specific verification is complete, create a pull request with the latest changes. Do not consider a future task complete until changes are committed, pushed, and a PR is opened.
