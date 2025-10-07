// 트렌드 수집 방법 선택 팩토리

import { KeywordCollector } from './keywordCollector';
import { GoogleTrendCollector } from './googleTrendCollector';
import { NaverTrendCollector } from './naverTrendCollector';
import { logger } from '@/lib/utils/logger';

export type CollectorType = 'serpapi' | 'google' | 'naver';

/**
 * 트렌드 수집기 팩토리
 * 
 * 환경변수 TREND_COLLECTOR로 선택:
 * - 'serpapi': SerpApi 사용 (유료, 안정적) - SERPAPI_KEY 필요
 * - 'google': Google Trends 직접 (무료, 비공식) - API 키 불필요
 * - 'naver': 네이버 실시간 검색어 (무료) - API 키 불필요
 */
export class TrendCollectorFactory {
  /**
   * 수집기 생성
   */
  static create(): any {
    const collectorType = (process.env.TREND_COLLECTOR || 'google') as CollectorType;

    logger.info('[TrendCollectorFactory] Creating collector', { type: collectorType });

    switch (collectorType) {
      case 'serpapi':
        if (!process.env.SERPAPI_KEY) {
          logger.warn('[TrendCollectorFactory] SERPAPI_KEY not set, falling back to Google');
          return new GoogleTrendCollector();
        }
        return new KeywordCollector();

      case 'naver':
        return new NaverTrendCollector();

      case 'google':
      default:
        return new GoogleTrendCollector();
    }
  }

  /**
   * 사용 가능한 수집기 확인
   */
  static async getAvailableCollectors(): Promise<{
    serpapi: boolean;
    google: boolean;
    naver: boolean;
  }> {
    return {
      serpapi: !!process.env.SERPAPI_KEY,
      google: true, // 항상 사용 가능
      naver: true,  // 항상 사용 가능
    };
  }
}
