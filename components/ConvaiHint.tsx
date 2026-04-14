import type { ConvaiPublicConfig } from "@/lib/convai-public-config";

export function ConvaiHint({ convai }: { convai: ConvaiPublicConfig }) {
  if (!convai.agentIdConfigured) {
    return (
      <p className="blob-hint blob-hint-warn">
        Set <code>ELEVENLABS_AGENT_ID</code> in the environment (e.g.{" "}
        <code>.env.local</code>). Optional: <code>ELEVENLABS_API_KEY</code>.{" "}
        <code>{convai.bootstrapPath}</code>
      </p>
    );
  }

  return null;
}
