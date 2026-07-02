# TouchGrass

TouchGrass is a PromptParty-ready interactive web app: a full-frame pixel-art grass patch where visitors can move the cursor through animated grass and click or tap to grow white flowers.

The app is intentionally lightweight and iframe-friendly. It uses a procedural Canvas 2D renderer, stores flower drawings locally in the browser, and has no backend requirement for v1.

## Stack

- Vite
- React
- TypeScript
- Canvas 2D
- Plain CSS
- Vercel static deployment

## Local Development

```bash
npm install
npm run dev
```

## Checks

```bash
npm run lint
npm run check
npm run build
```

## Interaction

- Move the cursor or finger over the grass to push blades aside.
- Click or tap to grow a white flower.
- Flowers persist in `localStorage` under `touchgrass.flowers.v1`.
- The renderer respects `prefers-reduced-motion` by reducing nonessential wind movement.

## Visual References

Reference images provided with the project brief are stored in `docs/reference/`.
