# Meet PRO

A video conferencing web app built with Quasar (Vue 3) and the ZEGOCLOUD Video
Conference UIKit. Create a room in one click, share the link, and up to 10
participants can join from any device.

Live Preview: [https://meet-clone-seven.vercel.app](https://meet-clone-seven.vercel.app)

## Features

- **One-click meetings** — generate a random room ID, or join an existing room by ID
- **Shareable links** — every room is addressable at `/room/:roomID`
- **Up to 10 participants**, camera and microphone enabled on join
- **Fully responsive** — one layout from 320px phones to desktop, safe-area aware
  on notched devices
- **Secret-free client bundle** — the ZEGOCLOUD Server Secret never leaves the
  server; the browser receives only a short-lived token

## Tech stack

| Layer     | Choice                                                |
| --------- | ----------------------------------------------------- |
| Framework | Quasar v2 (`@quasar/app-vite` 3.x), SPA mode          |
| UI        | Vue 3.5 SFCs, TypeScript, vue-router 5 (history mode) |
| Build     | Vite 8                                                |
| Video     | `@zegocloud/zego-uikit-prebuilt`                      |
| Backend   | Vercel serverless functions (`api/`)                  |
| Tooling   | oxfmt + oxlint                                        |

## How authentication works

The ZEGOCLOUD Server Secret can mint a token for any room and any identity, so
it never reaches the browser. A serverless function signs tokens instead:

```
Browser                          /api/zego-token (server)        ZEGOCLOUD
   |                                      |                          |
   |-- GET /api/zego-token -------------->|                          |
   |                                      | reads ZEGO_APP_ID and    |
   |                                      | ZEGO_SERVER_SECRET from  |
   |                                      | process.env              |
   |                                      | mints a random 12-char   |
   |                                      | userID, signs a Token04  |
   |                                      | valid for 1 hour         |
   |<-- { appID, userID, token, ... } ----|                          |
   |                                                                 |
   | builds a kit token locally from                                 |
   | (appID, token, roomID, userID)                                  |
   |                                                                 |
   |-- joinRoom() -------------------------------------------------->|
```

The client calls `generateKitTokenForProduction`, not `generateKitTokenForTest` —
the test variant expects the Server Secret in the browser.

`GET /api/zego-token` responds with:

| Status | Body                                        | When                                          |
| ------ | ------------------------------------------- | --------------------------------------------- |
| `200`  | `{ appID, userID, token, expiresIn: 3600 }` | Success                                       |
| `405`  | `{ error: "Method not allowed" }`           | Any method other than `GET`                   |
| `500`  | `{ error: "Server is not configured" }`     | `ZEGO_APP_ID` or `ZEGO_SERVER_SECRET` missing |
| `500`  | `{ error: "Could not issue a token" }`      | Signing failed                                |

The `userID` is minted server-side rather than accepted from the query string, so
a caller cannot request a token for an identity of its choosing. Responses are
sent with `Cache-Control: no-store`.

## Prerequisites

- **Node.js** `>= 26`, `^24`, or `^22.12`
- A **ZEGOCLOUD account** with a Video Conference project —
  [console.zegocloud.com](https://console.zegocloud.com)
- Optional, for running the serverless functions the way Vercel does:
  the [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`)

## Getting started

```bash
git clone https://github.com/imahmadzohaib/Meet-Clone.git
```

```bash
npm install
```

Copy the environment template and fill in your ZEGOCLOUD credentials:

```bash
cp .env.example .env
```

```bash
npm run dev
```

The app starts on <http://localhost:9000>.

## Environment variables

Both values are **server-only**. They are read by `api/zego-token.js` at runtime
and are never referenced from client code.

| Variable             | Description                                      |
| -------------------- | ------------------------------------------------ |
| `ZEGO_APP_ID`        | Numeric AppID from the ZEGOCLOUD console         |
| `ZEGO_SERVER_SECRET` | 32-character Server Secret from the same console |

> **Do not prefix these with `VITE_` or `QCLI_`,** and do not add them to
> `quasar.config.js > build.env`. Quasar auto-loads `.env` files and Vite replaces
> every `import.meta.env` reference with a literal string at build time, so
> anything the client bundle can reach is published to every visitor who opens
> DevTools. `QCLI_` is Quasar's client env prefix — that naming boundary, not file
> permissions, is what keeps a value private.

## Scripts

| Script               | What it does                                                           |
| -------------------- | ---------------------------------------------------------------------- |
| `npm run dev`        | Dev server with HMR on port 9000, `/api/*` executed in Node            |
| `npm run dev:api`    | `vercel dev` — runs the functions on Vercel's own runtime (CLI needed) |
| `npm run build`      | Production build to `dist/spa`, then the bundle-secret scan            |
| `npm run lint`       | Format and autofix with oxfmt + oxlint                                 |
| `npm run lint:check` | Check formatting and linting without writing                           |

## Project structure

```
api/
  zego-token.js            Serverless function: mints a short-lived token
  _lib/token04.js          Token04 signing helper (`_` prefix = not a route)
scripts/
  vite-plugin-api-dev.js   Runs api/* in Node during `quasar dev`
  check-bundle-secrets.mjs Post-build guard against a leaked secret
src/
  pages/IndexPage.vue          Landing page: create or join a room
  pages/SingleRoom/IndexPage.vue  The call itself, mounts the ZEGOCLOUD UIKit
  pages/ErrorNotFound.vue      404
  layouts/MainLayout.vue       Shell (no header or footer)
  router/routes.js             `/`, `/room/:roomID`, catch-all
  css/app.scss                 Global mobile rules
  utils/index.ts               Random room-ID generator
quasar.config.js           Build config, Vite overrides, dev-server fs.deny
vercel.json                Build command, output dir, SPA rewrite
```

## Security measures

Three independent layers, in the order they take effect:

1. **No `env` block in `quasar.config.js`.** Nothing server-side is exposed to
   `import.meta.env`, so nothing can be inlined into the bundle. This is the one
   that actually matters.
2. **Post-build scan** (`scripts/check-bundle-secrets.mjs`). After every
   `npm run build` it walks `dist/spa` looking for the literal value of
   `ZEGO_SERVER_SECRET` (and its `QCLI_`/`VITE_` variants) and fails the build if
   it finds one. A backstop, not a substitute for layer 1.
3. **Dev-server file blocklist** (`build.extendViteConf` → `server.fs.deny`).
   Denies `.env*`, `.vercel/`, `api/`, `scripts/`, `quasar.config.js`, and
   `vercel.json` over HTTP in development, with Vite's own defaults pinned so a
   future upstream change cannot silently drop them.

If a Server Secret is ever committed or shipped in a bundle, rotate it in the
ZEGOCLOUD console — a scan finding is a rotation event, not just a build failure.

## Deployment (Vercel)

`vercel.json` is already configured: build with `npm run build`, serve `dist/spa`,
and rewrite everything except `/api/*` to `index.html` so the history-mode router
handles deep links.

**Set the environment variables before your first deploy.** In Vercel →
Project Settings → Environment Variables, add `ZEGO_APP_ID` and
`ZEGO_SERVER_SECRET` for every environment you deploy to. Without them
`/api/zego-token` returns `500 Server is not configured` and no one can join a
room.

## Responsive design notes

- Breakpoint switching is **CSS-only** — Quasar's `gt-xs` / `lt-sm` visibility
  classes and scoped media queries. `$q.screen` is a JS-cached value that can
  report a stale width, so nothing in this app gates layout on it.
- Heights use `100dvh` with a `100vh` fallback, so a collapsing mobile browser
  toolbar cannot hide the call controls. `QPage` gets its `min-height` from
  `:style-fn` for the same reason.
- `index.html` sets `viewport-fit=cover` and both pages pad themselves with
  `env(safe-area-inset-*)`, which resolve to `0` on hardware without a notch.
- Inputs are `16px` on mobile so iOS does not zoom the page on focus; tap targets
  are at least 44px.
- The hero uses `bg-grey-7` rather than a lighter grey to keep white text above
  the WCAG AA 4.5:1 contrast minimum.

## Troubleshooting

**`SyntaxError: Unexpected token 'c', "const rand"... is not valid JSON`**
The dev server served `api/zego-token.js` to the browser as a module instead of
executing it. `scripts/vite-plugin-api-dev.js` fixes this; confirm it is still
registered in `quasar.config.js` → `build.extendViteConf`.

**`SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON`**
`/api/zego-token` returned the SPA's `index.html`, which means the function is not
deployed. Check that `api/` is committed and pushed, and that the deployment you
are testing is the one built from that commit.

**`500 Server is not configured`**
`ZEGO_APP_ID` or `ZEGO_SERVER_SECRET` is missing from the environment — locally in
`.env`, or in Vercel's project settings.

**Tailwind classes have no effect.**
`tailwindcss` is in `package.json` but is not wired up: `postcss.config.js`
registers only autoprefixer and there is no `@import "tailwindcss"` in `src/`. Use
Quasar's utility classes and scoped SCSS, or set Tailwind up deliberately.

## License

This package is marked `private` and ships without a license file. Add one before
publishing or accepting outside contributions.

## Author

Ahmad Zohaib — <https://imahmadzohaib.github.io/AhmadZohaib/>
