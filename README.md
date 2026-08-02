# OhMyMail

> A professional email template composer. Write in Markdown, preview live, and brand every detail — all local, no backend required.

OhMyMail is a single-page email template composer for developers and marketers who need polished, on-brand emails without a SaaS account. You write Markdown in a split-pane editor with a live HTML preview, add structure with slash commands, customize the branding (colors, fonts, header and footer), and export a self-contained HTML email, raw Markdown, or a PDF. All state lives in the browser's `localStorage`.

## Features

- **Split-pane editor** — Markdown on the left, rendered email preview on the right, with a draggable divider
- **Two editing modes** — a guided block editor (sortable blocks with `@dnd-kit`) or a pure Markdown text editor; both support slash commands with fuzzy search
- **Slash commands** — type `/` to insert headings, buttons, dividers, badges, links, images, GIFs, inline icons (with picker), headers, footers, branding blocks, font overrides, spacers, columns and social links
- **Branding panel** — company name, logo URL, primary and accent colors, Google Fonts family and size, plus independent colors and corner radii for header, footer and body
- **Template management** — save, load, duplicate, rename and delete named templates, stored locally
- **Export** — self-contained HTML email (inline CSS via `juice`, `Ctrl+Shift+E`), raw Markdown, or PDF through the browser print dialog (`Ctrl+P`)
- **Auto-save** — the current draft persists automatically to `localStorage` (`mailforge_autosave`), along with title, templates and branding config
- **Keyboard shortcuts** — `Ctrl+S` saves a template, `Ctrl+Shift+E` exports HTML, `Ctrl+P` exports PDF, `Tab` inserts an indent

## Tech stack

- React 19 + TypeScript (strict) with the React Compiler
- Vite
- TailwindCSS v4
- `marked` (Markdown to HTML)
- `juice` (CSS inlining for email-safe output)
- `@dnd-kit` (sortable blocks)
- `lucide-react` (icons)
- `nanoid` (identifiers)
- ESLint + OxLint, Husky + Commitlint

## Getting started

Requires [Bun](https://bun.sh).

```bash
bun install
bun dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Script              | Description                       |
| ------------------- | --------------------------------- |
| `bun dev`           | Start the Vite dev server         |
| `bun run build`     | Type-check and build to `dist/`   |
| `bun run lint`      | Run ESLint                        |
| `bun run preview`   | Preview the production build      |

## License

Apache-2.0

---

Part of the OhMy suite: OhMyForms, OhMyDocs, OhMyMail, OhMyGrid, OhMyCharts, OhMyGantt. A family of small, focused web tools with a browser-only philosophy.
