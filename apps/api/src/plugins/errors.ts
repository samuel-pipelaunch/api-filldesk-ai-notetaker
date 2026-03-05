import type { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';

import { HttpError } from '../lib/http-error.js';

interface ErrorDetail {
  field: string;
  message: string;
}

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: ErrorDetail[];
  };
}

function formatZodDetails(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'request',
    message: issue.message,
  }));
}

function sendError(
  statusCode: number,
  code: string,
  message: string,
  details?: ErrorDetail[],
): ErrorResponseBody {
  return {
    error: {
      code,
      message,
      statusCode,
      ...(details && details.length > 0 ? { details } : {}),
    },
  };
}

export const errorsPlugin: FastifyPluginAsync = async (app): Promise<void> => {
  app.setErrorHandler((error, request, reply): void => {
    if (error instanceof ZodError) {
      reply
        .status(400)
        .send(sendError(400, 'VALIDATION_ERROR', 'Request validation failed', formatZodDetails(error)));
      return;
    }

    if (error instanceof HttpError) {
      reply.status(error.statusCode).send(sendError(error.statusCode, error.code, error.message));
      return;
    }

    app.log.error(
      {
        err: error,
        method: request.method,
        path: request.url,
      },
      'Unhandled API error',
    );

    reply
      .status(500)
      .send(sendError(500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred'));
  });
};
