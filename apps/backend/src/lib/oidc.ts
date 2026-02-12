import * as jose from "jose";

const GOOGLE_JWKS = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISS = "https://accounts.google.com";
const APPLE_JWKS = "https://appleid.apple.com/auth/keys";
const APPLE_ISS = "https://appleid.apple.com";

export interface OidcClaims {
  sub: string;
  email?: string;
  name?: string;
}

function getGoogleClientIds(): string[] {
  const raw = process.env.GOOGLE_CLIENT_IDS ?? "";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function getAppleClientId(): string | undefined {
  return process.env.APPLE_CLIENT_ID;
}

export async function verifyGoogleIdToken(idToken: string): Promise<OidcClaims> {
  const clientIds = getGoogleClientIds();
  if (clientIds.length === 0) {
    throw new Error("GOOGLE_CLIENT_IDS not configured");
  }

  const JWKS = jose.createRemoteJWKSet(new URL(GOOGLE_JWKS));
  const { payload } = await jose.jwtVerify(idToken, JWKS, {
    issuer: GOOGLE_ISS,
    audience: clientIds,
    maxTokenAge: "1h",
  });

  const sub = payload.sub as string;
  if (!sub) throw new Error("Missing sub in token");

  return {
    sub,
    email: (payload.email as string) ?? undefined,
    name: (payload.name as string) ?? undefined,
  };
}

export async function verifyAppleIdToken(idToken: string): Promise<OidcClaims> {
  const clientId = getAppleClientId();
  if (!clientId) {
    throw new Error("APPLE_CLIENT_ID not configured");
  }

  const JWKS = jose.createRemoteJWKSet(new URL(APPLE_JWKS));
  const { payload } = await jose.jwtVerify(idToken, JWKS, {
    issuer: APPLE_ISS,
    audience: clientId,
    maxTokenAge: "1h",
  });

  const sub = payload.sub as string;
  if (!sub) throw new Error("Missing sub in token");

  return {
    sub,
    email: (payload.email as string) ?? undefined,
    name: (payload.name as string) ?? undefined,
  };
}
