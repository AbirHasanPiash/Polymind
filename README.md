# Polymind

React single-page app for **Polymind** — every frontier model in one workspace. Streaming chat
with GPT, Claude and Gemini, side-by-side model comparison, image, voice and avatar-video
studios, usage analytics, a credit wallet, and an admin console. It talks to the
[Polymind server](https://github.com/AbirHasanPiash/Polymind-server) over REST and a WebSocket.

![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)
![Vite](https://img.shields.io/badge/Vite-7-646cff)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06b6d4)
![License](https://img.shields.io/badge/license-proprietary-lightgrey)

## Features

- **Streaming chat** — tokens render as they arrive, with Markdown, LaTeX and highlighted code;
  stop, regenerate, edit-and-resend, copy, read aloud
- **Model picker in the composer** — one click to open, one to choose; search, tier filters,
  keyboard navigation, price and context hints, recently used. Every entry comes from the API,
  so the picker can never offer a model the backend rejects
- **Auto routing** with the reason shown on each reply, and a **reasoning depth** control
  (Quick / Balanced / Deep)
- **Arena** — compare two or three models on the same prompt; replies stream side by side
- **Conversations** — recent chats in the sidebar (five at a glance, expandable) with pin,
  rename and delete; auto titles;
  full-text search; per-chat instructions with personas; export to Markdown or JSON; public
  share links
- **Studios** — images (GPT Image 2, GPT Image 1.5, Nano Banana 2 / Pro, reference-image
  editing), voice (Google and OpenAI voices with delivery hints), avatar video
- **Usage analytics** — spend by day, by model and by category, recent activity
- **Wallet & billing** — live balance, credit packages, Stripe Checkout and Razorpay
- **Account** — preferences (default model, custom instructions, saved prompts), password
  change and reset, account deletion; sessions refresh silently while the app is in use
- **Command palette** (⌘K) for navigation, recent chats, models and theme
- **One design system** — every colour comes from a single token set, so light and dark mode
  are consistent on every page; responsive from 320 px phones to wide desktops

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | React 19, TypeScript, Vite 7 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 (CSS-first tokens), Radix primitives, Inter + JetBrains Mono |
| Data | SWR for reads, Axios for writes |
| Realtime | Native WebSocket |
| Rendering | react-markdown, KaTeX, Prism (async) |
| Charts | Recharts |

## Getting started

**Requirements:** Node 20+ and a running backend.

```bash
git clone https://github.com/AbirHasanPiash/Polymind.git
cd Polymind

npm install
cp .env.example .env        # then set VITE_API_URL
npm run dev                 # http://localhost:5173
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build on port 4173 |
| `npm run lint` | ESLint (TypeScript + React Hooks rules) |

### Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_API_URL` | yes | Backend origin — no trailing slash, no `/api/v1`. The WebSocket URL is derived from it (`http` → `ws`, `https` → `wss`). |
| `VITE_GOOGLE_CLIENT_ID` | no | OAuth client for Google sign-in. |

Both are read and validated once in [`src/lib/env.ts`](src/lib/env.ts). Everything prefixed
`VITE_` is bundled into the client — never put a secret there.

## Project structure

```
src/
├── api/                client.ts (axios, auth, refresh) · types.ts (API shapes)
├── components/
│   ├── ui/             token-driven primitives (button, card, input, dialog, popover…)
│   ├── brand/          brand mark, provider marks
│   ├── layout/         sidebar, top bar (+ header slot), mobile tab bar, command palette
│   ├── chat/           composer, model picker, effort picker, messages, markdown, actions
│   ├── studio/         shared pieces of the media studios
│   ├── admin/          shared pieces of the admin console
│   ├── landing/        marketing page sections
│   └── auth/           sign-in and sign-up building blocks
├── context/            auth, theme, toasts, chat reset
├── hooks/              useChatSocket, useModelCatalogue, useChats, useFeatures, hotkeys…
├── layouts/            dashboard shell
├── lib/                env, formatting, model presentation metadata, storage helpers
├── pages/              one file per route (admin pages under pages/admin)
└── index.css           design tokens, base styles, utilities
```

`@/` resolves to `src/`. Contexts are split into a `*-context.ts` (state and hook) and a
`*Provider.tsx` (component), which keeps every component file exporting only components so
Fast Refresh can update a component without remounting the tree.

### Routes

| Path | Access | Page |
| --- | --- | --- |
| `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password` | public | landing and auth |
| `/share/:token` | public | read-only shared conversation |
| `/dashboard` | signed in | chat (`/dashboard/chat/:chatId` for a saved conversation) |
| `/dashboard/history` | signed in | search and manage conversations |
| `/dashboard/images`, `/voice`, `/avatar` | signed in | media studios |
| `/dashboard/usage`, `/billing`, `/settings` | signed in | analytics, wallet, account |
| `/dashboard/payment/success`, `/cancel` | signed in | post-checkout returns |
| `/dashboard/admin/{stats,users,packages,transactions}` | admin | admin console |

Everything past the landing and auth screens is code-split with `React.lazy`.

## How it works

### Design tokens

[`src/index.css`](src/index.css) defines the palette once (`--canvas`, `--surface`, `--line`,
`--fg`, `--accent`, semantic tones, provider tones) for light and dark, and exposes it to
Tailwind as `bg-surface`, `text-fg-muted`, `border-line`, `bg-accent` and friends. Pages use
those utilities and the primitives in `components/ui`; no page picks a raw palette colour, so
theming stays consistent by construction. `index.html` applies the saved theme before React
mounts, so there is no flash on load.

### Layout

The dashboard has one top bar. It carries only what the sidebar does not: page actions,
the credit balance and the theme toggle. Pages that need controls up there (the chat page's
connection status, instructions, share and export menu) render them into the bar through
`HeaderPortal`, so no page draws a second bar. The sidebar owns the brand mark; when it is
collapsed, hovering the mark reveals the expand control.

### Model catalogue

`useModelCatalogue` fetches `GET /api/v1/models` once (SWR dedupes every caller) and the
picker, the landing page and the message bubbles all render from it. `lib/models.ts` holds
only presentation metadata (provider labels and tones, tier labels, effort labels). Adding a
model means adding it to the backend registry — nothing in the client changes.

### Chat

`useChatSocket` owns the connection: the token travels in the first frame (never in the URL),
reconnects back off exponentially and resume the adopted conversation, and a heartbeat keeps
idle sockets alive. The model, arena model set and reasoning depth travel **with each
message**, so switching never reconnects. Incoming tokens are buffered per slot and flushed
once per animation frame; every message bubble is memoised, so a long answer re-renders only
the message being written.

### Sessions

The JWT lives in `localStorage` and is attached by an axios interceptor. While a tab is in
use, the token is refreshed shortly before it expires; a real 401 clears the session exactly
once and sends the user to sign in, remembering where they were heading.

## Conventions

- **Errors reach the user.** Every failed request goes through `getErrorMessage`, which
  unwraps FastAPI's `detail`, and is shown with the toast stack — never `window.alert`.
- **The backend is the source of truth.** Model lists, voice lists, image options and feature
  flags are fetched, not duplicated.
- **Effects clean up.** Polling is a conditional SWR `refreshInterval`, object URLs are
  revoked, timers are cleared on unmount.
- **Animate transform and opacity only**; `prefers-reduced-motion` is honoured globally.

## Deployment

Any static host works; the project ships a [`vercel.json`](vercel.json) with the SPA rewrite
and the `Cross-Origin-Opener-Policy` header Google sign-in needs, and a GitHub Actions
workflow that lints, type-checks and builds every push.

```bash
npm run build      # outputs dist/
```

Before going live: set `VITE_API_URL` to the production API, add the deployed origin to the
backend's `CORS_ORIGINS` and `FRONTEND_URL`, and make sure the backend is reachable over
HTTPS (browsers refuse a `ws://` socket from an `https://` page).

## License

Proprietary. All rights reserved © Polymind.
