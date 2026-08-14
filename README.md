# MultiAIModel Frontend

React single-page app for **MultiAIModel** — streaming chat across GPT, Claude and Gemini, image,
speech and avatar-video generation, a credit wallet, and the admin console. It talks to the
[MultiAIModel backend](../ai-platform-backend) over REST and a WebSocket.

![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)
![Vite](https://img.shields.io/badge/Vite-7-646cff)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06b6d4)
![License](https://img.shields.io/badge/license-proprietary-lightgrey)

## Features

- **Streaming chat** — tokens render as they arrive, with markdown, LaTeX and highlighted code
- **Model picker** — the catalogue is loaded from the API, so it can never offer a model the backend rejects
- **Media studios** — image generation (with reference images), text to speech, and talking-avatar video
- **Wallet & billing** — live credit balance, credit packages, Stripe Checkout and Razorpay
- **Admin console** — revenue and usage analytics, user management, package management
- **Light & dark themes** — applied before first paint, so there is no flash on load
- **Responsive** — one layout from 320 px phones to wide desktops

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | React 19, TypeScript, Vite 7 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 (CSS-first config), shadcn-style primitives |
| Data | SWR for reads, Axios for writes |
| Realtime | Native WebSocket |
| Rendering | react-markdown, KaTeX, Prism (async) |
| Charts | Recharts |

## Getting started

**Requirements:** Node 20+ and a running backend.

```bash
git clone https://github.com/AbirHasanPiash/multimodal-ai-frontend.git
cd multimodal-ai-frontend

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
| `VITE_GOOGLE_CLIENT_ID` | no | OAuth client for Google sign-in. Falls back to a built-in client id; set it to point staging and production at different OAuth clients. |

Both are read and validated once in [`src/lib/env.ts`](src/lib/env.ts), so a missing value fails
loudly at startup instead of producing requests to `undefined/api/v1/...`. Everything prefixed
`VITE_` is bundled into the client — never put a secret there.

## Project structure

```
src/
├── api/client.ts       axios instance: auth header, error normalisation, 401 handling
├── components/
│   ├── auth/           sign-in and sign-up building blocks
│   ├── chat/           message bubble, markdown renderer, code block
│   ├── Dashboard/      sidebar and header
│   ├── landing/        marketing page: nav, hero console, model wall, scroll reveal
│   └── ui/             shadcn-style primitives and the toast stack
├── context/            auth, theme, toasts, chat reset (state + provider split per file)
├── hooks/              useChatSocket, useModelCatalogue, useReveal, useScrolledPast
├── layouts/            dashboard shell
├── lib/                env, formatting, downloads, class merging
├── pages/              one file per route
└── types/              typings for untyped third-party scripts
```

Contexts are split into a `*-context.ts` (state and hook) and a `*Provider.tsx` (component). That
keeps every component file exporting only components, which is what lets Fast Refresh update a
component without remounting the tree. `@/` resolves to `src/`.

### Routes

| Path | Access | Page |
| --- | --- | --- |
| `/`, `/login`, `/signup` | public | landing and auth |
| `/dashboard` | signed in | chat (`/dashboard/chat/:chatId` for a saved conversation) |
| `/dashboard/history` | signed in | past conversations |
| `/dashboard/tts`, `/images`, `/avatar` | signed in | media studios |
| `/dashboard/billing`, `/settings` | signed in | wallet, packages, account |
| `/dashboard/payment/success`, `/cancel` | signed in | post-checkout returns |
| `/dashboard/admin/{users,packages,stats}` | admin | admin console |

Everything past the landing and auth screens is code-split with `React.lazy`.

## How it works

### Authentication

The JWT lives in `localStorage` and is attached by an axios request interceptor. A response
interceptor watches for `401`: it clears the token once and raises an app-wide event, so an expired
session signs the user out cleanly instead of leaving them on pages that silently fail. Guarded
routes wait for the session check before deciding, and remember where the user was heading.

### Chat

`useChatSocket` owns the connection. It reconnects with exponential backoff (1 s → 30 s, capped)
and stops entirely on close code `1008`, which the backend uses for "invalid token or out of
credits" — a case retrying cannot fix. The selected model travels **with each message**, so
switching models mid-conversation does not drop the socket, and a server-assigned `chat_id` is
adopted in place rather than triggering a reconnect that would cut off the streaming reply.

Incoming tokens are buffered and flushed once per animation frame rather than on every chunk, and
each message bubble is memoised, so a long answer re-renders only the message being written — not
the whole transcript with its markdown and code highlighting.

### Rendering performance

The Suspense boundary sits *inside* the dashboard shell, so the sidebar and header stay put while a
page loads. The markdown/KaTeX/Prism stack and Recharts live in the chunks that use them, and Prism
grammars are fetched per language on first use. Chunking is deliberately left to Rollup's default
route-based splitting — forcing `manualChunks` hoisted those heavy bundles into the landing page's
preloads.

### Theming

`index.html` runs a small inline script before React mounts that puts the saved theme class on
`<html>` and sets `color-scheme`. Every surface colour comes from CSS variables in
[`src/index.css`](src/index.css); `ThemeProvider` keeps them in sync afterwards and follows the OS
while the preference is "system".

## Conventions

- **Errors reach the user.** Every failed request goes through `getErrorMessage`, which unwraps
  FastAPI's `detail`, so people see "Insufficient credits" rather than "Something went wrong".
  Feedback is shown with the toast stack — never `window.alert`.
- **The backend is the source of truth.** Model lists and image size/quality combinations are
  fetched from the API rather than duplicated here.
- **Effects clean up.** Polling is expressed as a conditional SWR `refreshInterval`, object URLs
  are revoked, and timers are cleared on unmount.
- **Animate transform and opacity only**, so motion is composited and never triggers layout.
  `prefers-reduced-motion` is honoured globally.

## Deployment

Any static host works; the project ships a [`vercel.json`](vercel.json) with the SPA rewrite and the
`Cross-Origin-Opener-Policy` header Google sign-in needs.

```bash
npm run build      # outputs dist/
```

Before going live: set `VITE_API_URL` to the production API, add the deployed origin to the
backend's `CORS_ORIGINS`, and make sure the backend is reachable over HTTPS (browsers refuse a
`ws://` socket from an `https://` page).

## License

Proprietary. All rights reserved © MultiAIModel.
