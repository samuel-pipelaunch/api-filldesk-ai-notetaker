import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';

function normalizeSecret(secret: string): Buffer | null {
  if (!secret) {
    return null;
  }

  const prefix = 'whsec_';
  const base64Part = secret.startsWith(prefix) ? secret.slice(prefix.length) : secret;

  try {
    return Buffer.from(base64Part, 'base64');
  } catch {
    return null;
  }
}

function getHeaderValue(headers: Record<string, string>, key: string): string | undefined {
  return headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()];
}

export function verifyRecallWebhookSignature(params: {
  secret: string;
  headers: Record<string, string>;
  payload: string;
}): boolean {
  const msgId = getHeaderValue(params.headers, 'webhook-id') ?? getHeaderValue(params.headers, 'svix-id');
  const msgTimestamp =
    getHeaderValue(params.headers, 'webhook-timestamp') ??
    getHeaderValue(params.headers, 'svix-timestamp');
  const msgSignature =
    getHeaderValue(params.headers, 'webhook-signature') ??
    getHeaderValue(params.headers, 'svix-signature');

  if (!msgId || !msgTimestamp || !msgSignature) {
    return false;
  }

  const key = normalizeSecret(params.secret);
  if (!key) {
    return false;
  }

  const toSign = `${msgId}.${msgTimestamp}.${params.payload}`;
  const expectedSig = crypto.createHmac('sha256', key).update(toSign).digest('base64');
  const expectedSigBytes = Buffer.from(expectedSig, 'base64');

  const passedSigs = msgSignature.split(' ');
  for (const versionedSig of passedSigs) {
    const [version, signature] = versionedSig.split(',');
    if (version !== 'v1' || !signature) {
      continue;
    }

    let sigBytes: Buffer;
    try {
      sigBytes = Buffer.from(signature, 'base64');
    } catch {
      continue;
    }

    if (expectedSigBytes.length !== sigBytes.length) {
      continue;
    }

    if (crypto.timingSafeEqual(new Uint8Array(expectedSigBytes), new Uint8Array(sigBytes))) {
      return true;
    }
  }

  return false;
}
