type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  userId?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(entry: LogEntry): string {
    const { timestamp, level, message, context, userId } = entry;
    const prefix = context ? `[${context}]` : '';
    const userPrefix = userId ? `[User: ${userId}]` : '';
    return `${timestamp} ${level.toUpperCase()} ${prefix}${userPrefix} ${message}`;
  }

  private log(level: LogLevel, message: string, context?: string, data?: any, userId?: string): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      userId
    };

    const formattedMessage = this.formatMessage(entry);

    // In development, use console with colors
    if (this.isDevelopment) {
      const colors = {
        debug: '\x1b[36m', // cyan
        info: '\x1b[32m',  // green
        warn: '\x1b[33m',  // yellow
        error: '\x1b[31m'  // red
      };
      const reset = '\x1b[0m';
      console.log(`${colors[level]}${formattedMessage}${reset}`);
      
      if (data && typeof data === 'object') {
        console.log(`${colors[level]}Data:${reset}`, data);
      }
    } else {
      // In production, use structured logging (JSON format for log aggregation)
      const logData = {
        ...entry,
        environment: process.env.NODE_ENV,
        service: 'jumpapp'
      };
      
      // Remove sensitive data in production
      if (logData.data && typeof logData.data === 'object') {
        logData.data = this.sanitizeData(logData.data);
      }

      console.log(JSON.stringify(logData));
    }
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'auth', 'credential',
      'access_token', 'refresh_token', 'id_token', 'session_state',
      'client_secret', 'api_key'
    ];

    const sanitized = { ...data };
    
    for (const key in sanitized) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  debug(message: string, context?: string, data?: any, userId?: string): void {
    this.log('debug', message, context, data, userId);
  }

  info(message: string, context?: string, data?: any, userId?: string): void {
    this.log('info', message, context, data, userId);
  }

  warn(message: string, context?: string, data?: any, userId?: string): void {
    this.log('warn', message, context, data, userId);
  }

  error(message: string, context?: string, error?: Error | any, userId?: string): void {
    let errorData = error;
    
    if (error instanceof Error) {
      errorData = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
        cause: error.cause
      };
    }

    this.log('error', message, context, errorData, userId);
  }

  // Convenience methods for common contexts
  api = {
    request: (method: string, path: string, userId?: string, data?: any) => {
      this.info(`${method} ${path}`, 'API', data, userId);
    },
    response: (method: string, path: string, status: number, duration?: number, userId?: string) => {
      const message = `${method} ${path} ${status}${duration ? ` in ${duration}ms` : ''}`;
      this.info(message, 'API', undefined, userId);
    },
    error: (method: string, path: string, error: Error | any, userId?: string) => {
      this.error(`${method} ${path} failed`, 'API', error, userId);
    }
  };

  auth = {
    login: (userId: string, provider?: string) => {
      this.info(`User logged in${provider ? ` via ${provider}` : ''}`, 'AUTH', undefined, userId);
    },
    logout: (userId: string) => {
      this.info('User logged out', 'AUTH', undefined, userId);
    },
    error: (message: string, error?: Error | any, userId?: string) => {
      this.error(message, 'AUTH', error, userId);
    }
  };

  bot = {
    created: (botId: string, meetingUrl: string, userId: string) => {
      this.info(`Bot created: ${botId}`, 'BOT', { meetingUrl }, userId);
    },
    statusChange: (botId: string, status: string, userId?: string) => {
      this.info(`Bot status changed: ${botId} -> ${status}`, 'BOT', undefined, userId);
    },
    transcriptReady: (botId: string, meetingId: string, userId?: string) => {
      this.info(`Transcript ready for bot: ${botId}`, 'BOT', { meetingId }, userId);
    },
    error: (message: string, botId?: string, error?: Error | any, userId?: string) => {
      this.error(message, 'BOT', { botId, error }, userId);
    }
  };

  ai = {
    generated: (type: string, meetingId: string, userId: string, duration?: number) => {
      const message = `AI ${type} generated${duration ? ` in ${duration}ms` : ''}`;
      this.info(message, 'AI', { meetingId }, userId);
    },
    error: (type: string, meetingId: string, error: Error | any, userId?: string) => {
      this.error(`AI ${type} generation failed`, 'AI', { meetingId, error }, userId);
    }
  };
}

export const logger = new Logger();
export default logger;
