/**
 * Centralized logging utility for production-safe logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  isDevelopment: boolean;
  enabledLevels: LogLevel[];
}

class Logger {
  private config: LoggerConfig;

  constructor() {
    this.config = {
      isDevelopment: process.env.NODE_ENV === 'development',
      enabledLevels: ['info', 'warn', 'error'],
    };

    // Enable debug logs in development
    if (this.config.isDevelopment) {
      this.config.enabledLevels.push('debug');
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.config.enabledLevels.includes(level);
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data !== undefined) {
      return `${prefix} ${message}`;
    }
    
    return `${prefix} ${message}`;
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog('debug')) {
      const formatted = this.formatMessage('debug', message, data);
      if (data !== undefined) {
        console.log(formatted, data);
      } else {
        console.log(formatted);
      }
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog('info')) {
      const formatted = this.formatMessage('info', message, data);
      if (data !== undefined) {
        console.info(formatted, data);
      } else {
        console.info(formatted);
      }
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog('warn')) {
      const formatted = this.formatMessage('warn', message, data);
      if (data !== undefined) {
        console.warn(formatted, data);
      } else {
        console.warn(formatted);
      }
    }
  }

  error(message: string, error?: unknown): void {
    if (this.shouldLog('error')) {
      const formatted = this.formatMessage('error', message, error);
      if (error !== undefined) {
        console.error(formatted, error);
      } else {
        console.error(formatted);
      }
    }
  }

  // Group related logs
  group(label: string): void {
    if (this.config.isDevelopment) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.config.isDevelopment) {
      console.groupEnd();
    }
  }

  // Performance timing
  time(label: string): void {
    if (this.config.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.config.isDevelopment) {
      console.timeEnd(label);
    }
  }
}

// Export singleton instance
export const logger = new Logger();