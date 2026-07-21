import pino from 'pino';
import config from './config.js';

// ============================================================================
// Pino Logger
// ============================================================================

const isDev = config.server.nodeEnv === 'development';

const logger = pino({
  level: isDev ? 'debug' : 'info',
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        // 生产环境: JSON 格式
        formatters: {
          level(label) {
            return { level: label };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
});

// ============================================================================
// Child Logger（带请求上下文）
// ============================================================================

export interface LoggerContext {
  requestId?: string;
  userId?: string;
  projectId?: string;
}

export function childLogger(ctx: LoggerContext): pino.Logger {
  const bindings: Record<string, string> = {};
  if (ctx.requestId) bindings.requestId = ctx.requestId;
  if (ctx.userId) bindings.userId = ctx.userId;
  if (ctx.projectId) bindings.projectId = ctx.projectId;
  return logger.child(bindings);
}

export { logger };
export default logger;