# SkyWay token Worker

This Worker is separate from the `suspect-space` static game Worker. It keeps the SkyWay secret on Cloudflare and issues a room-scoped, three-day SkyWay Auth Token v3 after verifying the caller's Firebase ID token.

## Configure and deploy

From this directory, add the two values as Cloudflare secrets and deploy:

```sh
npx wrangler secret put SKYWAY_APP_ID
npx wrangler secret put SKYWAY_SECRET_KEY
npx wrangler deploy
```

Do not put either secret in this repository or the game HTML. `FIREBASE_PROJECT_ID` is a public identifier in `wrangler.jsonc`.

The endpoint is `https://skyway-toooken.jitianzheping19.workers.dev/api/token`.

## Request

The game should request one token when it connects its voice session to a room, keep the token in memory for that same room and Firebase UID, and reuse it across matches while the same room remains active. Request a new token when entering another room or when the current token expires. Its maximum lifetime is three days.

```http
POST /api/token
Authorization: Bearer <Firebase ID token>
Content-Type: application/json
Origin: https://jitianzheping19-del.github.io

{"roomId":"1234","memberName":"Player"}
```

The Worker derives `memberId` from the verified Firebase token rather than trusting a client-supplied UID. Successful responses contain `{ "token": "...", "expiresAt": 0 }` and are marked `Cache-Control: no-store`.

## Current limitation

This only prepares the token endpoint source. It does not migrate the game's existing Firebase-signaled WebRTC voice transport to SkyWay. The Worker must be deployed in Cloudflare, and the game client must be integrated with the returned endpoint before it is used.
