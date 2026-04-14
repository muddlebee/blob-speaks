/**
 * Safe to pass to the client: booleans and paths only (no API keys or agent ids).
 */
export type ConvaiPublicConfig = {
  bootstrapPath: string;
  agentIdConfigured: boolean;
  apiKeyConfigured: boolean;
  nodeEnv: "development" | "production" | "test";
};

export function getConvaiPublicConfig(): ConvaiPublicConfig {
  return {
    bootstrapPath: "/api/convai/bootstrap",
    agentIdConfigured: Boolean(
      process.env.ELEVENLABS_AGENT_ID?.trim()
    ),
    apiKeyConfigured: Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
    nodeEnv:
      process.env.NODE_ENV === "production"
        ? "production"
        : process.env.NODE_ENV === "test"
          ? "test"
          : "development",
  };
}
