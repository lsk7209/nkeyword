// 메모리 기반 캐시 서비스

import type { CacheItem } from '@/lib/types/trending';

/**
 * 간단한 메모리 캐시 서비스
 * Redis 대안으로 사용 (개발/소규모 운영용)
 */
class CacheService {
  private cache: Map<string, CacheItem>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cache = new Map();
    this.startCleanup();
  }

  /**
   * 캐시 조회
   */
  async get<T = any>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // 만료 확인
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  /**
   * 캐시 저장
   * @param key 캐시 키
   * @param data 저장할 데이터
   * @param ttl TTL (초 단위, 기본값: 300초 = 5분)
   */
  async set<T = any>(key: string, data: T, ttl: number = 300): Promise<void> {
    this.cache.set(key, {
      data,
      expires: Date.now() + (ttl * 1000),
    });
  }

  /**
   * 캐시 삭제
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * 패턴 매칭으로 여러 캐시 삭제
   */
  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern);
    let deleted = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    
    return deleted;
  }

  /**
   * 캐시 존재 여부 확인
   */
  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * 모든 캐시 삭제
   */
  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * 캐시 크기 조회
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 캐시 키 목록 조회
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 만료된 캐시 자동 정리 시작
   */
  private startCleanup(): void {
    // 1분마다 만료된 캐시 정리
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * 만료된 캐시 정리
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[Cache] Cleaned up ${cleaned} expired items`);
    }
  }

  /**
   * 정리 작업 중지
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 캐시 통계 조회
   */
  getStats(): {
    size: number;
    keys: string[];
    oldestExpiry?: number;
    newestExpiry?: number;
  } {
    const expiries = Array.from(this.cache.values()).map(item => item.expires);
    
    return {
      size: this.cache.size,
      keys: this.keys(),
      oldestExpiry: expiries.length > 0 ? Math.min(...expiries) : undefined,
      newestExpiry: expiries.length > 0 ? Math.max(...expiries) : undefined,
    };
  }
}

// 싱글톤 인스턴스 생성
export const cache = new CacheService();

/**
 * 캐시 키 생성 헬퍼
 */
export function createCacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}

/**
 * TTL 상수 (초 단위)
 */
export const CacheTTL = {
  SHORT: 60,           // 1분
  MEDIUM: 300,         // 5분
  LONG: 900,           // 15분
  HOUR: 3600,          // 1시간
  DAY: 86400,          // 24시간
} as const;

