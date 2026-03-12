# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # Run ESLint
npm run deploy   # Deploy to Vercel (requires Vercel CLI auth)
```

No test suite is configured.

## Architecture

Single-page Next.js 15 app (App Router). The entire application lives in one client component: `components/InitiativeTracker.tsx`.

**Data model** — all state is held in a single `State` object and persisted to `sessionStorage` (key: `initiative-tracker-session`). Reloading the page restores the session; closing the tab clears it.

```ts
type State = {
  participants: { name: string; hp: string }[];
  phases: string[];                          // ["Phase 1", "Phase 2", ...]
  values: Record<string, PhaseCellState>;    // keyed as "rowIndex-colIndex"
};

type PhaseCellState = "waiting" | "active" | "done" | "dead" | "revived";
```

**Turn progression** — exactly one cell is `"active"` at a time. Clicking Done/Dead/Revived on the active cell calls `findNextActive`, which advances down the participant list, wrapping to the next phase column. When the last participant in the last phase finishes, a new phase column is automatically appended.

**Dead/Revive logic** — marking a cell `"dead"` propagates forward: subsequent phase cells for that row auto-resolve as dead unless the character was `"revived"` in an intervening phase. The revive button only appears when the character was dead in a prior phase and has not yet been revived.

**Invariant** — `ensureSingleActive` is called on every state mutation and on load to guarantee exactly one active cell exists (or zero if the board is empty).

## Styling

- **Tailwind CSS v4** — configured via `postcss.config.mjs`; theme customization goes in `app/globals.css` under `@theme {}`.
- **CSS Modules** — `InitiativeTracker.module.css` handles the notebook aesthetic (paper texture, ruled rows, sticky column shadow). Prefer CSS Modules for effects that Tailwind can't express cleanly.
- **Font** — "Playwrite NZ Basic" (Google Fonts, handwritten style) is set as `--font-sans` in the theme and applied globally.
- **Icons** — `@hugeicons/react` with `@hugeicons/core-free-icons`. Import icon constants from `@hugeicons/core-free-icons` and render with `<HugeiconsIcon icon={...} size={n} />`.

## UI Components

`components/ui/alert-dialog.tsx` is a custom, hand-rolled implementation (no Radix/shadcn dependency). It uses React context for controlled/uncontrolled open state. Add other primitives to `components/ui/` following the same pattern if needed.
