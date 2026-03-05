import { createDb } from '../../../../apps/api/src/db/client.js';
import { RecallClient } from '../../../../apps/api/src/integrations/recall/client.js';
import { MeetingSyncService } from '../../../../apps/api/src/services/meeting-sync.service.js';
import { WebhookIngestService } from '../../../../apps/api/src/services/webhook-ingest.service.js';

type SqsRecord = {
  messageId?: string;
  body?: string;
};

type SqsEvent = {
  Records?: SqsRecord[];
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function parseEventId(messageBody: string | undefined): string {
  if (!messageBody) {
    throw new Error('SQS message body is empty');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(messageBody);
  } catch {
    throw new Error('SQS message body is not valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('SQS message body must be an object');
  }

  const eventId = (parsed as { eventId?: unknown }).eventId;
  if (typeof eventId !== 'string' || eventId.length === 0) {
    throw new Error('SQS message body missing eventId');
  }

  return eventId;
}

export async function handler(event: SqsEvent): Promise<{ ok: true; processed: number }> {
  const logger = {
    info: (...args: unknown[]) => console.log(...args),
    warn: (...args: unknown[]) => console.warn(...args),
    error: (...args: unknown[]) => console.error(...args),
    debug: (...args: unknown[]) => console.debug(...args),
    trace: (...args: unknown[]) => console.debug(...args),
    fatal: (...args: unknown[]) => console.error(...args),
    child: () => logger,
  } as {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
    trace: (...args: unknown[]) => void;
    fatal: (...args: unknown[]) => void;
    child: () => unknown;
  };
  const databaseUrl = getRequiredEnv('DATABASE_URL');
  const recallApiKey = getRequiredEnv('RECALL_API_KEY');
  const recallRegion = getRequiredEnv('RECALL_REGION');

  if (recallRegion !== 'us-east-1' && recallRegion !== 'eu-central-1') {
    throw new Error('RECALL_REGION must be us-east-1 or eu-central-1');
  }

  const db = createDb(databaseUrl);
  const recall = new RecallClient({
    apiKey: recallApiKey,
    region: recallRegion,
    logger: logger as unknown as never,
  });

  const meetingSyncService = new MeetingSyncService({
    db,
    recall,
    logger: logger as never,
  });

  const webhookIngestService = new WebhookIngestService({
    db,
    recall,
    logger: logger as never,
    meetingSyncService,
  });

  const records = event.Records ?? [];

  for (const record of records) {
    const eventId = parseEventId(record.body);

    logger.info(
      {
        messageId: record.messageId,
        eventId,
      },
      'Processing webhook event from SQS',
    );

    await webhookIngestService.processWebhookEvent(eventId);
  }

  return {
    ok: true,
    processed: records.length,
  };
}
