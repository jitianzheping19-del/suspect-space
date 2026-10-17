const ALLOWED_ORIGIN = "https://jitianzheping19-del.github.io";
const FIREBASE_JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const TOKEN_TTL_SECONDS = 3 * 24 * 60 * 60;

let cachedFirebaseJwks = null;
let cachedFirebaseJwksUntil = 0;

function jsonResponse(status, body, origin = "") {
  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
  if (origin === ALLOWED_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function base64urlBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlText(text) {
  return base64urlBytes(new TextEncoder().encode(text));
}

function decodeBase64urlBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeBase64urlJson(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64urlBytes(value)));
}

function uuidV4() {
  return crypto.randomUUID();
}

async function signJwt(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const signingInput = `${base64urlText(JSON.stringify(header))}.${base64urlText(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64urlBytes(new Uint8Array(signature))}`;
}

async function getFirebaseJwks() {
  if (cachedFirebaseJwks && Date.now() < cachedFirebaseJwksUntil) return cachedFirebaseJwks;
  const response = await fetch(FIREBASE_JWKS_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("firebase-key-fetch-failed");
  const data = await response.json();
  if (!Array.isArray(data.keys)) throw new Error("firebase-key-format-invalid");
  const cacheControl = response.headers.get("Cache-Control") || "";
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/i)?.[1]) || 3600;
  cachedFirebaseJwks = data.keys;
  cachedFirebaseJwksUntil = Date.now() + Math.max(60, maxAge - 60) * 1000;
  return cachedFirebaseJwks;
}

async function verifyFirebaseIdToken(idToken, projectId) {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("firebase-token-invalid");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeBase64urlJson(encodedHeader);
  const claims = decodeBase64urlJson(encodedPayload);
  if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error("firebase-token-invalid");

  const jwks = await getFirebaseJwks();
  const jwk = jwks.find((candidate) => candidate.kid === header.kid && candidate.kty === "RSA");
  if (!jwk) {
    cachedFirebaseJwks = null;
    cachedFirebaseJwksUntil = 0;
    throw new Error("firebase-key-not-found");
  }

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const validSignature = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    decodeBase64urlBytes(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!validSignature) throw new Error("firebase-signature-invalid");

  const now = Math.floor(Date.now() / 1000);
  if (
    claims.aud !== projectId ||
    claims.iss !== `https://securetoken.google.com/${projectId}` ||
    typeof claims.sub !== "string" || claims.sub.length < 1 || claims.sub.length > 128 ||
    !Number.isFinite(claims.exp) || claims.exp <= now ||
    !Number.isFinite(claims.iat) || claims.iat > now + 120
  ) throw new Error("firebase-claims-invalid");

  return claims;
}

function validRoomName(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function validMemberName(value) {
  return typeof value === "string" && value.trim().length > 0 && [...value.trim()].length <= 24 && !/[\u0000-\u001f\u007f]/.test(value);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      if (origin !== ALLOWED_ORIGIN) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin",
        },
      });
    }

    if (url.pathname !== "/api/token") return new Response("Not Found", { status: 404 });
    if (request.method !== "POST") return jsonResponse(405, { error: "Method not allowed" }, origin);
    if (origin !== ALLOWED_ORIGIN) return jsonResponse(403, { error: "Origin not allowed" });
    if (!env.SKYWAY_APP_ID || !env.SKYWAY_SECRET_KEY || !env.FIREBASE_PROJECT_ID) {
      return jsonResponse(500, { error: "Worker configuration is incomplete" }, origin);
    }

    const authorization = request.headers.get("Authorization") || "";
    const idToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
    if (!idToken || idToken.length > 8192) return jsonResponse(401, { error: "Firebase sign-in required" }, origin);

    let body;
    try {
      const contentLength = Number(request.headers.get("Content-Length") || 0);
      if (contentLength > 4096) return jsonResponse(413, { error: "Request too large" }, origin);
      body = await request.json();
    } catch {
      return jsonResponse(400, { error: "Invalid JSON" }, origin);
    }

    const roomName = body?.roomId;
    const memberName = typeof body?.memberName === "string" ? body.memberName.trim() : "";
    if (!validRoomName(roomName) || !validMemberName(memberName)) {
      return jsonResponse(400, { error: "Invalid room or member name" }, origin);
    }

    let firebaseClaims;
    try {
      firebaseClaims = await verifyFirebaseIdToken(idToken, env.FIREBASE_PROJECT_ID);
    } catch {
      return jsonResponse(401, { error: "Firebase sign-in is invalid or expired" }, origin);
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      jti: uuidV4(),
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
      version: 3,
      scope: {
        appId: env.SKYWAY_APP_ID,
        turn: { enabled: true },
        analytics: { enabled: false },
        noiseCancelling: { enabled: true },
        rooms: [
          {
            id: "*",
            name: roomName,
            methods: ["create", "close", "updateMetadata"],
            member: {
              id: firebaseClaims.sub,
              name: memberName,
              methods: ["publish", "subscribe", "updateMetadata"],
            },
          },
        ],
      },
    };

    try {
      const token = await signJwt(payload, env.SKYWAY_SECRET_KEY);
      return jsonResponse(200, { token, expiresAt: payload.exp }, origin);
    } catch {
      return jsonResponse(500, { error: "Unable to issue SkyWay token" }, origin);
    }
  },
};
