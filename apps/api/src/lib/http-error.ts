export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  public constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function notFound(message = 'Resource not found'): HttpError {
  return new HttpError(404, 'NOT_FOUND', message);
}

export function badRequest(message = 'Bad request'): HttpError {
  return new HttpError(400, 'BAD_REQUEST', message);
}

export function unauthorized(message = 'Unauthorized'): HttpError {
  return new HttpError(401, 'UNAUTHORIZED', message);
}

export function forbidden(message = 'Forbidden'): HttpError {
  return new HttpError(403, 'FORBIDDEN', message);
}

export function conflict(message = 'Conflict'): HttpError {
  return new HttpError(409, 'CONFLICT', message);
}

export function internalError(message = 'Internal server error'): HttpError {
  return new HttpError(500, 'INTERNAL_ERROR', message);
}
