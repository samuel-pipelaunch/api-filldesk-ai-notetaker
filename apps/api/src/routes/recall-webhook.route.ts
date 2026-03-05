import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { verifyRecallWebhookSignature } from '../integrations/recall/signature.js';
import type { WebhookPayload } from '../integrations/recall/types.js';
import { badRequest } from '../lib/http-error.js';
import { validateBody } from '../lib/validation.js';
import { webhookEvents } from '../db/schema/webhook-events.js';

const webhookHeadersSchema = z.object({
  'webhook-id': z.string().min(1).optional(),
  'webhook-timestamp': z.string().min(1).optional(),
  'webhook-signature': z.string().min(1).optional(),
  'svix-id': z.string().min(1).optional(),
  'svix-timestamp': z.string().min(1).optional(),
  'svix-signature': z.string().min(1).optional(),
});

const webhookPayloadSchema = z.object({
  event: z.string().min(1),
  data: z.record(z.unknown()),
});

function normalizeHeaders(headers: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      normalized[key.toLowerCase()] = value;
      continue;
    }

    if (Array.isArray(value)) {
      normalized[key.toLowerCase()] = value.join(',');
    }
  }

  return normalized;
}

function parseWebhookPayload(rawBody: string): WebhookPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw badRequest('Invalid JSON payload');
  }

  return validateBody(webhookPayloadSchema, parsed);
}

export const recallWebhookRoute: FastifyPluginAsync = async (app): Promise<void> => {
  const sqsClient = new SQSClient({});

  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) => {
    done(null, body);
  });

  app.post('/webhooks/recall', async (request, reply) => {
    const rawBody = typeof request.body === 'string' ? request.body : '';
    const normalizedHeaders = normalizeHeaders(request.headers as Record<string, unknown>);
    const validatedHeaders = webhookHeadersSchema.parse(normalizedHeaders);

    const webhookId = validatedHeaders['webhook-id'] ?? validatedHeaders['svix-id'];
    if (!webhookId) {
      throw badRequest('Missing webhook ID header');
    }

    const signatureValid = verifyRecallWebhookSignature({
      secret: app.config.RECALL_WEBHOOK_SECRET,
      headers: normalizedHeaders,
      payload: rawBody,
    });

    const existingEvent = await app.db.query.webhookEvents.findFirst({
      where: (table, operators) => operators.eq(table.webhookId, webhookId),
    });

    if (existingEvent) {
      return reply.status(200).send({ ok: true, idempotent: true });
    }

    let payloadToStore: Record<string, unknown>;
    let eventType = 'unknown';

    try {
      const parsedPayload = parseWebhookPayload(rawBody);
      payloadToStore = parsedPayload as unknown as Record<string, unknown>;
      eventType = parsedPayload.event;
    } catch (error) {
      payloadToStore = {
        raw_body: rawBody,
        parse_error: error instanceof Error ? error.message : 'Invalid payload',
      };
    }

    const [createdEvent] = await app.db
      .insert(webhookEvents)
      .values({
      webhookId,
      eventType,
      payload: payloadToStore,
      signatureValid,
      processingStatus: signatureValid ? 'pending' : 'failed',
      attempts: 0,
      receivedAt: new Date(),
      })
      .returning({ id: webhookEvents.id });

    app.log.info(
      {
        webhookId,
        eventType,
        signatureValid,
      },
      'Recall webhook received',
    );

    if (!signatureValid) {
      reply.status(400).send({
        error: {
          code: 'INVALID_WEBHOOK_SIGNATURE',
          message: 'Webhook signature verification failed',
          statusCode: 400,
        },
      });
      return;
    }

    if (!createdEvent) {
      throw badRequest('Failed to persist webhook event');
    }

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: app.config.WEBHOOK_QUEUE_URL,
        MessageBody: JSON.stringify({
          eventId: createdEvent.id,
        }),
      }),
    );

    reply.status(200).send({ ok: true });
  });
};
