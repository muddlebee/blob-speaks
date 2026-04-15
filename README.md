# blob-speaks

A Next.js app with a **pink blob character** (SVG) whose mouth animates during speech. Use **browser text-to-speech** for quick local demos, or connect an **ElevenLabs Conversational AI** agent for real-time voice chat.

**Documentation**

- [Features (product overview)](docs/features.md) — blob UI, local TTS, ConvAI voice chat, configuration hints, requirements
- [Implementation (architecture)](docs/implementation.md) — stack, file map, env vars, bootstrap API, client session flow, animation notes

## Quick start

```bash
npm install
npm run dev
```

The dev server binds to `127.0.0.1` (see `package.json` scripts). Open the URL shown in the terminal.

## ElevenLabs voice chat

Voice chat needs an agent id and optional API key. Details and UI behavior are in [ElevenLabs voice agent](docs/features.md#elevenlabs-voice-agent) and [What you need to run voice chat](docs/features.md#what-you-need-to-run-voice-chat) in `docs/features.md`.

| Variable | Required | Purpose |
|----------|----------|---------|
| `ELEVENLABS_AGENT_ID` | Yes (for voice chat) | Your ConvAI agent id |
| `ELEVENLABS_API_KEY` | No | Private sessions: server mints token or signed URL |


## Stack

Next.js (App Router), React, `@elevenlabs/client`, Web Speech API for local TTS. See [Stack](docs/implementation.md#stack) in `docs/implementation.md`.

## Project layout

Key paths are summarized in [File map](docs/implementation.md#file-map). Notable entries:

- `app/page.tsx` — server page; passes public ConvAI hints into the blob
- `app/api/convai/bootstrap/route.ts` — dynamic bootstrap JSON for the client
- `lib/convai-bootstrap.ts` — bootstrap logic (public vs token vs signed URL)
- `components/BlobPink.tsx` — interactive blob, speech, and ConvAI session

## Legacy URL

`/blob_face_pink.html` redirects to `/`. See [Legacy URL](docs/features.md#legacy-url) in `docs/features.md`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (`127.0.0.1`) |
| `npm run build` | Production build |
| `npm run start` | Production server (`127.0.0.1`) |
