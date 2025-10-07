// 로깅 유틸리티

import type { LogLevel, LogMessage } from '@/lib/types/trending';

/**
 * 로거 클래스
 */
class Logger {
  private level: LogLevel;

  constructor() {
    this.level = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  /**
   * 로그 레벨 우선순위
   */
  private getLevelPriority(level: LogLevel): number {
    const priorities: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return priorities[level];
  }

  /**
   * 로그 출력 여부 확인
   */
  private shouldLog(level: LogLevel): boolean {
    return this.getLevelPriority(level) >= this.getLevelPriority(this.level);
  }

  /**
   * 로그 포맷팅
   */
  private formatLog(level: LogLevel, message: string, context?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    
    return `[${timestamp}] [${levelStr}] ${message}${contextStr}`;
  }

  /**
   * Debug 로그
   */
  debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatLog('debug', message, context));
    }
  }

  /**
   * Info 로그
   */
  info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      console.log(this.formatLog('info', message, context));
    }
  }

  /**
   * Warning 로그
   */
  warn(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message, context));
    }
  }

  /**
   * Error 로그
   */
  error(message: string, error?: Error | any, context?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
        } : error,
      };
      console.error(this.formatLog('error', message, errorContext));
    }
  }

  /**
   * 로그 레벨 변경
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 현재 로그 레벨 조회
   */
  getLevel(): LogLevel {
    return this.level;
  }
}

// 싱글톤 인스턴스
export const logger = new Logger();

/**
 * 성능 측정 데코레이터
 */
export function logPerformance(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const start = Date.now();
    const className = target.constructor.name;
    const methodName = propertyKey;

    logger.debug(`[${className}.${methodName}] Started`);

    try {
      const result = await originalMethod.apply(this, args);
      const duration = Date.now() - start;
      
      logger.debug(`[${className}.${methodName}] Completed`, { duration: `${duration}ms` });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      logger.error(`[${className}.${methodName}] Failed`, error, { duration: `${duration}ms` });
      
      throw error;
    }
  };

  return descriptor;
}

/**
 * 에러 로깅 헬퍼
 */
export function logError(context: string, error: any, additionalInfo?: Record<string, any>): void {
  logger.error(context, error, additionalInfo);
}

/**
 * API 요청 로깅 헬퍼
 */
export function logApiRequest(
  method: string,
  endpoint: string,
  statusCode: number,
  duration: number
): void {
  logger.info('API Request', {
    method,
    endpoint,
    statusCode,
    duration: `${duration}ms`,
  });
}

