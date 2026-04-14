# Implementation: Blob UI and ElevenLabs ConvAI

This document describes how the pink blob interface and ElevenLabs Conversational AI are wired in the Next.js app.

## Stack

- **Framework:** Next.js (App Router), React client component for the interactive blob.
- **Voice agent SDK:** `@elevenlabs/client` (`Conversation.startSession`).
- **Local speech (no ElevenLabs):** Browser **Web Speech API** — `speechSynthesis` for TTS and optional `SpeechRecognition` for “repeat after me.”

## File map

| Path | Role |
|------|------|
| `app/page.tsx` | Server Component: reads safe ConvAI config via `getConvaiPublicConfig()`, passes `convai` into `BlobPink`. |
| `app/api/convai/bootstrap/route.ts` | `GET` (and `OPTIONS` for CORS) — returns JSON from `getConvaiBootstrap(process.env)`. Marked `force-dynamic` so env is read at request time. |
| `lib/convai-bootstrap.ts` | Core bootstrap logic: validates `ELEVENLABS_AGENT_ID`, chooses public vs API-key modes, calls ElevenLabs REST to mint token or signed URL when needed. |
| `lib/convai-bootstrap-types.ts` | TypeScript types and `isBootstrapError()` guard for bootstrap JSON. |
| `lib/convai-public-config.ts` | **Server-only** booleans + public path for UI hints (no secrets, no agent id strings sent to the client as config). |
| `components/BlobPink.tsx` | `"use client"` — SVG blob, mouth animation, Web Speech controls, fetch bootstrap + `Conversation.startSession`. |
| `components/ConvaiHint.tsx` | Footer copy derived from `ConvaiPublicConfig`. |
| `app/globals.css` | Layout and blob styling (`.blob-root`, `.blob-stage`, etc.). |
| `next.config.ts` | Redirects `/blob_face_pink.html` → `/` for old bookmarks. |

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ELEVENLABS_AGENT_ID` | Yes (for voice chat) | Agent identifier; bootstrap fails without it. |
| `ELEVENLABS_API_KEY` | No | If set, server mints **token** (WebRTC) or **signed URL** (WebSocket) via ElevenLabs API; if unset, bootstrap returns **public** mode with `agentId` only. |
| `ELEVENLABS_CONNECTION` | No | `webrtc` (default) or `websocket`; drives bootstrap shape and minting path when API key is present. |
| `ELEVENLABS_ENVIRONMENT` | No | Passed through when not `production` (e.g. ElevenLabs environment slug). |

Local development: prefer **`.env.local`** (Next.js convention). Production: set the same keys in the host (e.g. Vercel project settings).

Secrets **must not** use `NEXT_PUBLIC_*`; they stay on the server.

## Bootstrap API

**Endpoint:** `GET /api/convai/bootstrap`

**CORS:** `Access-Control-Allow-Origin: *` (and matching preflight headers) so the route can be called cross-origin if needed.

**Responses (success shapes):**

1. **`mode: "public"`** — `agentId`, optional `connectionType`, optional `environment`. Used when there is no `ELEVENLABS_API_KEY`.
2. **`mode: "token"`** — `token`, `connectionType` (typically WebRTC). Minted via ElevenLabs `.../convai/conversation/token`.
3. **`mode: "signedUrl"`** — `signedUrl`, `connectionType: "websocket"`. Minted via ElevenLabs `.../convai/conversation/get-signed-url`.

**Error:** JSON `{ "error": string }` with non-2xx status (e.g. missing agent id, upstream ElevenLabs failure).

Types live in `lib/convai-bootstrap-types.ts`.

## Client: starting a ConvAI session

1. `BlobPink` resolves bootstrap URL with `bootstrapUrl()` — same-origin `window.location.origin + "/api/convai/bootstrap"` in the browser, with fallbacks for tests/globals.
2. `fetch(bootstrapUrl())` → parse JSON → reject if HTTP error or `error` field.
3. Request **microphone** via `navigator.mediaDevices.getUserMedia({ audio: true })`.
4. Build the object passed to `Conversation.startSession` from bootstrap mode:
   - **token:** `conversationToken`, `connectionType`, callbacks, optional `environment`.
   - **signedUrl:** `signedUrl`, `connectionType: "websocket"`, callbacks, optional `environment`.
   - **public:** `agentId`, `connectionType`, callbacks, optional `environment`.
5. Callbacks update UI: `onConnect`, `onDisconnect`, `onError`, `onStatusChange`, `onModeChange` (drives mouth “talking” vs idle), `onMessage` (append-only transcript).

Ending the session calls `endSession()` on the live conversation handle and resets mouth/UI state.

## Blob mouth animation

- Idle: curved smile path visible; “talk” group hidden.
- Speaking (Web Speech **or** agent `onModeChange` → `speaking`): smile hidden, ellipses visible; a `requestAnimationFrame` loop oscillates ellipse radii with a sine-based “jaw” motion.
- Refs (`mouthSmileRef`, `mouthTalkRef`, `mouthOuterRef`, `mouthInnerRef`) mutate SVG attributes directly for smooth updates.

## Web Speech path (separate from ElevenLabs)

- **Speak:** `SpeechSynthesisUtterance` with selected voice and rate; `onstart` / `onend` tie into the same mouth enter/exit helpers.
- Starting ElevenLabs or issuing **Speak** cancels the other path (`speechSynthesis.cancel()`, `endElevenLabsSession()` where applicable).
- **Repeat after me:** optional `SpeechRecognition` / `webkitSpeechRecognition`; on result, transcript is shown and fed into `speak()`.

## Server vs client boundary

- **`getConvaiPublicConfig()`** runs on the server in `page.tsx`. It only exposes flags safe for HTML serialization.
- **`getConvaiBootstrap()`** runs only in the Route Handler; the API key never appears in the bootstrap response body in a raw form (only minted token or signed URL, or public agent id for public agents).

## Static home page caveat

If `/` is prerendered as static content, `getConvaiPublicConfig()` is evaluated at build time for that page. Changing environment variables without rebuilding can leave **ConvaiHint** out of date until the next deploy. The bootstrap route remains dynamic (`force-dynamic`) and always reads current env at request time.

## Related dependencies

- `package.json`: `next`, `react`, `@elevenlabs/client`.
