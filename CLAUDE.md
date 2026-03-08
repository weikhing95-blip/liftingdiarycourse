# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Docs-First Requirement

**Before generating any code, Claude Code MUST first check the `/docs` directory for relevant documentation.** All implementation decisions should align with the specs, designs, and guidelines found there. If a relevant doc exists, follow it — do not infer or invent patterns that contradict it.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

- /docs/ui.md
- /docs/data-fetching.md

## Architecture

This is a **Next.js 16** app using the App Router (`src/app/`), React 19, TypeScript (strict mode), and Tailwind CSS v4.

- **Routing**: File-based via `src/app/` — each `page.tsx` is a route, `layout.tsx` wraps children
- **Styling**: Tailwind CSS v4 imported via `@import "tailwindcss"` in `globals.css` (no `tailwind.config.js` needed)
- **Path alias**: `@/*` maps to `./src/*`
- **Fonts**: Geist Sans and Geist Mono loaded via `next/font/google` in the root layout, exposed as CSS variables `--font-geist-sans` and `--font-geist-mono`

Currently a fresh `create-next-app` scaffold — no database, auth, or business logic yet.
