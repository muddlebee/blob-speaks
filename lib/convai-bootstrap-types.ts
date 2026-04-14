/** JSON from GET /api/convai/bootstrap */
export type ConvaiBootstrapOk =
  | {
      mode: "public";
      agentId: string;
      connectionType?: string;
      environment?: string;
    }
  | {
      mode: "token";
      token: string;
      connectionType?: string;
      environment?: string;
    }
  | {
      mode: "signedUrl";
      signedUrl: string;
      connectionType?: string;
      environment?: string;
    };

export type ConvaiBootstrapResponse = ConvaiBootstrapOk | { error: string };

export function isBootstrapError(
  x: ConvaiBootstrapResponse
): x is { error: string } {
  return typeof (x as { error?: string }).error === "string";
}
