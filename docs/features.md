# Features: Blob and ElevenLabs voice agent

This document explains what the app does from a product perspective: the blob character, local speech, and the ElevenLabs conversational agent.

## The blob

The main screen is a **pink, rounded character** built with inline SVG: gradient body, eyes, and a mouth that switches between a **smile** (idle) and an **animated “talking” mouth** when audio is playing.

The mouth reacts to:

- **Speak** — browser text-to-speech reading your textarea.
- **ElevenLabs voice chat** — when the agent is speaking, the same mouth animation runs.

A short **status line** under the blob (`ready`, `speaking...`, `live · speak freely`, errors, etc.) tells you what the app is doing.

## Local speech (browser only)

These features work **without** ElevenLabs:

- **Text box** — type what the blob should say.
- **Speak** — uses the device’s built-in voices (**Voice** dropdown, **Speed** slider).
- **Stop** — cancels speech and returns the mouth to idle.
- **Repeat after me** — optional mode: turn on, use **Listen** (where supported) to capture speech, then the blob repeats it with local TTS. Microphone and speech recognition depend on the browser and permissions.

This path is ideal for quick demos when you only care about animation and TTS, not a cloud agent.

## ElevenLabs voice agent

**Start voice chat** connects the browser to your **ElevenLabs Conversational AI** agent:

1. The app asks the **server** for a small JSON “bootstrap” (`/api/convai/bootstrap`).
2. The server either returns a **public** agent configuration or **mints** a short-lived **token** or **signed URL** (when you’ve configured an API key).
3. The **ElevenLabs client** opens a real-time session (WebRTC or WebSocket, depending on configuration). You need **microphone** permission.

While connected:

- The blob’s mouth follows the agent’s speaking state.
- A **transcript** area shows user and agent messages as they arrive.
- **End chat** closes the session cleanly.

If something is misconfigured (missing agent id, network, mic denied), status text and the transcript area describe the failure in plain language.

## Configuration hints in the UI

At the bottom of the controls, a **hint** explains how ConvAI is set up **on this deployment**:

- If **`ELEVENLABS_AGENT_ID`** is missing on the server, you see a **warning** with where to set it (e.g. `.env.local` or Vercel).
- If the agent id is present, you see a short note: bootstrap path, whether the server is in **public** mode or **minting credentials** (API key present), and that you’re in development when applicable.

No API keys or secret tokens are shown there—only safe, high-level information.

## What you need to run voice chat

1. Create or pick an **ElevenLabs ConvAI agent** and copy its **agent id**.
2. Set **`ELEVENLABS_AGENT_ID`** in your environment (local file or hosting dashboard).
3. Optional: set **`ELEVENLABS_API_KEY`** if your agent requires **private** sessions (server-minted token or signed WebSocket URL).
4. Open the app over **HTTPS** in production (browser rules for mic and real-time media); local dev on `http://127.0.0.1` is typical.

## Legacy URL

Requests to **`/blob_face_pink.html`** redirect to **`/`** so old links still land on the blob experience.
