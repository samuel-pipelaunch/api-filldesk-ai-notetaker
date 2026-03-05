import awsLambdaFastify from '@fastify/aws-lambda';

import { buildApp } from './app.js';

const app = await buildApp();
const proxy = awsLambdaFastify(app);
await app.ready();

export async function handler(event: unknown, context: unknown): Promise<unknown> {
  return proxy(event as never, context as never);
}