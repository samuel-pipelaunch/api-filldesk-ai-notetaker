import { createRequire } from 'node:module';

import pino, { type LoggerOptions } from 'pino';

type Stage = 'dev' | 'staging' | 'prod';
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SERVICE_NAME = 'filldesk-api';

function isStage(value: string | undefined): value is Stage {
  return value === 'dev' || value === 'staging' || value === 'prod';
}

function isLogLevel(value: string | undefined): value is LogLevel {
  return value === 'debug' || value === 'info' || value === 'warn' || value === 'error';
}

function canUsePrettyTransport(): boolean {
  const require = createRequire(import.meta.url);

  try {
    require.resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
}

export function resolveStageFromEnv(env: NodeJS.ProcessEnv): Stage {
  return isStage(env.STAGE) ? env.STAGE : 'dev';
}

export function resolveLogLevelFromEnv(env: NodeJS.ProcessEnv): LogLevel {
  return isLogLevel(env.LOG_LEVEL) ? env.LOG_LEVEL : 'info';
}

export function createLogger(stage: Stage, level: LogLevel): LoggerOptions {
  const options: LoggerOptions = {
    level,
    base: {
      service: SERVICE_NAME,
      stage,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (stage === 'dev' && canUsePrettyTransport()) {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };
  }

  return options;
}
