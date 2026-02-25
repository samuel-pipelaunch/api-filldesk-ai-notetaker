# Webhooks

## Overview

Recall.ai sends webhooks for:

- Bot status changes (joining, recording, done, error)
- Calendar V2 events (`calendar.update`, `calendar.sync_events`)
- Recording status changes
- Real-time events (transcription, audio, video)

## Setup

- Configure webhook endpoints in Recall dashboard → Webhooks tab
- Click "Add Endpoint" → Enter your webhook URL → Create
- Recall sends POST requests to your configured URL
- For testing: Use "Svix Play" button in dashboard for a testing endpoint

Source: https://docs.recall.ai/docs/status-change-webhooks-setup-verification

## Calendar V2 Webhook Events

Source: https://docs.recall.ai/docs/calendar-v2-webhooks

### `calendar.update`

Sent when calendar data changes (e.g., status becomes disconnected).

```json
{
  "event": "calendar.update",
  "data": {
    "calendar_id": "string"
  }
}
```

Action: Re-fetch calendar via Retrieve Calendar API to get latest state.

Disconnection causes:

- You called Delete Calendar endpoint
- User's refresh token revoked (removed app or token invalidated)
- Google OAuth client in "testing" mode: tokens expire after 7 days

### `calendar.sync_events`

Sent when calendar events are created, updated, or deleted.

```json
{
  "event": "calendar.sync_events",
  "data": {
    "calendar_id": "string",
    "last_updated_ts": "string"
  }
}
```

Action: Re-fetch calendar events with `updated_at__gte` = `last_updated_ts`. Use `is_deleted` field to check for removed events.

## Webhook Verification

Source: https://docs.recall.ai/docs/authenticating-requests-from-recallai

Sample app: https://github.com/recallai/sample-apps/tree/main/verify_requests_from_recall

### Setup

1. Create workspace verification secret from dashboard: Developers → API Keys & Secrets → Create Workspace Secret
2. All requests will include headers: `webhook-id`, `webhook-timestamp`, `webhook-signature`

### Verification Function (TypeScript)

```typescript
import crypto from "crypto";
import { Buffer } from "buffer";

export const verifyRequestFromRecall = (args: {
  secret: string;
  headers: Record<string, string>;
  payload: string | null;
}) => {
  const { secret, headers, payload } = args;
  const msgId = headers["webhook-id"] ?? headers["svix-id"];
  const msgTimestamp = headers["webhook-timestamp"] ?? headers["svix-timestamp"];
  const msgSignature = headers["webhook-signature"] ?? headers["svix-signature"];

  if (!secret || !secret.startsWith("whsec_")) {
    throw new Error(`Verification secret is missing or invalid`);
  }
  if (!msgId || !msgTimestamp || !msgSignature) {
    throw new Error("Missing webhook verification headers");
  }

  const prefix = "whsec_";
  const base64Part = secret.startsWith(prefix) ? secret.slice(prefix.length) : secret;
  const key = Buffer.from(base64Part, "base64");

  let payloadStr = "";
  if (payload) {
    payloadStr = Buffer.isBuffer(payload) ? payload.toString("utf8") : payload;
  }

  const toSign = `${msgId}.${msgTimestamp}.${payloadStr}`;
  const expectedSig = crypto
    .createHmac("sha256", key)
    .update(toSign)
    .digest("base64");

  const passedSigs = msgSignature.split(" ");
  for (const versionedSig of passedSigs) {
    const [version, signature] = versionedSig.split(",");
    if (version !== "v1") continue;
    const sigBytes = Buffer.from(signature, "base64");
    const expectedSigBytes = Buffer.from(expectedSig, "base64");
    if (
      expectedSigBytes.length === sigBytes.length &&
      crypto.timingSafeEqual(new Uint8Array(expectedSigBytes), new Uint8Array(sigBytes))
    ) {
      return; // Verified
    }
  }
  throw new Error("No matching signature found");
};
```

### Secret Rotation

- Create new secret → old secret stays active for 24 hours
- During rotation, events contain signatures for all active secrets
- Max 9 active secrets

## Local Webhook Development

- Source: https://docs.recall.ai/docs/local-webhook-development
- Use tools like ngrok to expose local server
