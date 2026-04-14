import type { ConvaiPublicConfig } from "@/lib/convai-public-config";

export function ConvaiHint({ convai }: { convai: ConvaiPublicConfig }) {
  if (!convai.agentIdConfigured) {
    return (
      <p className="blob-hint blob-hint-warn">
        Voice agent is not configured on the server. Add{" "}
        <code>ELEVENLABS_AGENT_ID</code> to this app&apos;s environment (e.g.{" "}
        <code>.env.local</code> locally, Vercel project env in production).
        Optional: <code>ELEVENLABS_API_KEY</code> for private WebRTC / signed
        WebSocket. Bootstrap route: <code>{convai.bootstrapPath}</code>.
      </p>
    );
  }

  return (
    <p className="blob-hint">
      Bootstrap: <code>{convai.bootstrapPath}</code>
      {convai.apiKeyConfigured
        ? " · Server mints session credentials (API key present)."
        : " · Public agent mode (no server API key)."}
      {convai.nodeEnv === "development" ? " · Running in development." : null}
    </p>
  );
}
