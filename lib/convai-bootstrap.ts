/**
 * Bootstrap JSON for GET /api/convai/bootstrap (used by public/blob_face_pink.html).
 */
export type BootstrapResult =
  | { status: 200; body: Record<string, unknown> }
  | { status: number; body: { error: string } };

export function getConvaiBootstrap(
  env: Record<string, string | undefined>
): Promise<BootstrapResult> {
  return Promise.resolve().then(() => {
    const API_KEY = env.ELEVENLABS_API_KEY || "";
    const AGENT_ID = env.ELEVENLABS_AGENT_ID || "";

    if (!AGENT_ID) {
      return {
        status: 500,
        body: { error: "Set ELEVENLABS_AGENT_ID in environment (e.g. Vercel project env)" },
      };
    }

    const rawConn = (env.ELEVENLABS_CONNECTION || "webrtc").toLowerCase();
    const connectionType = rawConn === "websocket" ? "websocket" : "webrtc";
    const envRaw = (env.ELEVENLABS_ENVIRONMENT || "").trim();
    const envPayload: Record<string, string> = {};
    if (envRaw && envRaw !== "production") {
      envPayload.environment = envRaw;
    }

    if (!API_KEY) {
      return {
        status: 200,
        body: {
          mode: "public",
          agentId: AGENT_ID,
          connectionType,
          ...envPayload,
        },
      };
    }

    return mintWithApiKey(API_KEY, AGENT_ID, connectionType, envPayload);
  });
}

async function mintWithApiKey(
  apiKey: string,
  agentId: string,
  connectionType: "webrtc" | "websocket",
  envPayload: Record<string, string>
): Promise<BootstrapResult> {
  try {
    if (connectionType === "websocket") {
      const url = `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`;
      const r = await fetch(url, { headers: { "xi-api-key": apiKey } });
      const data = (await r.json()) as Record<string, unknown>;
      if (!r.ok) {
        return {
          status: r.status,
          body: {
            error: String(
              data.detail || data.message || JSON.stringify(data)
            ),
          },
        };
      }
      const signedUrl = (data.signed_url || data.signedUrl) as string | undefined;
      if (!signedUrl) {
        return { status: 502, body: { error: "No signed_url in ElevenLabs response" } };
      }
      return {
        status: 200,
        body: {
          mode: "signedUrl",
          signedUrl,
          connectionType: "websocket",
          ...envPayload,
        },
      };
    }

    const url = `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`;
    const r = await fetch(url, { headers: { "xi-api-key": apiKey } });
    const data = (await r.json()) as Record<string, unknown>;
    if (!r.ok) {
      return {
        status: r.status,
        body: {
          error: String(data.detail || data.message || JSON.stringify(data)),
        },
      };
    }
    const token = data.token as string | undefined;
    if (!token) {
      return { status: 502, body: { error: "No token in ElevenLabs response" } };
    }
    return {
      status: 200,
      body: {
        mode: "token",
        token,
        connectionType: "webrtc",
        ...envPayload,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { status: 502, body: { error: msg } };
  }
}
