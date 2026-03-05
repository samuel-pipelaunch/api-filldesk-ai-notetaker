import type { ZodSchema } from 'zod';

import { badRequest } from './http-error.js';

function formatValidationMessage(target: string, issues: string[]): string {
  if (issues.length === 0) {
    return `Invalid request ${target}`;
  }

  return `Invalid request ${target}: ${issues.join('; ')}`;
}

function parseWithSchema<T>(schema: ZodSchema<T>, input: unknown, target: string): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const issueMessages = parsed.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : target;
      return `${path} ${issue.message}`;
    });
    throw badRequest(formatValidationMessage(target, issueMessages));
  }

  return parsed.data;
}

export function validateBody<T>(schema: ZodSchema<T>, body: unknown): T {
  return parseWithSchema(schema, body, 'body');
}

export function validateQuery<T>(schema: ZodSchema<T>, query: unknown): T {
  return parseWithSchema(schema, query, 'query');
}

export function validateParams<T>(schema: ZodSchema<T>, params: unknown): T {
  return parseWithSchema(schema, params, 'params');
}
