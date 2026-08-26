export interface LogContext {
  correlationId?: string;
  userId?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface StructuredLogger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

