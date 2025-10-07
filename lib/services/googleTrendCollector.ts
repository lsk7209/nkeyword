// Google Trends 무료 수집 서비스 (google-trends-api 사용)

import axios from 'axios';
import type { TrendingKeyword } from '@/lib/types/trending';
import { logger } from '@/lib/utils/logger';

/**
 * Google Trends 무료 수집 (API 키 불필요)
 * 
 * 참고: 이 방법은 비공식이며 언제든 막힐 수 있습니다.
 * 프로덕션에서는 SerpApi 사용을 권장합니다.
 */
export class GoogleTrendCollector {
  private baseUrl = 'https://trends.google.com/trends/api/dailytrends';

  /**
   * Google Trends 실시간 트렌드 수집
   */
  async collectTrendingKeywords(): Promise<TrendingKeyword[]> {
    logger.info('[GoogleTrendCollector] Starting collection...');

    try {
      // Google Trends Daily Trends API (비공식)
      const response = await axios.get(this.baseUrl, {
        params: {
          hl: 'ko',
          tz: -540, // 한국 시간대 (UTC+9)
          geo: 'KR',
          ns: 15,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 15000,
      });

      // 응답 파싱 (Google은 ")]}'" 접두사를 붙임)
      const jsonString = response.data.replace(")]}'\n", '');
      const data = JSON.parse(jsonString);

      // 키워드 추출
      const keywords = this.parseGoogleTrends(data);

      logger.info('[GoogleTrendCollector] Collection completed', {
        count: keywords.length,
      });

      return keywords;
    } catch (error) {
      logger.error('[GoogleTrendCollector] Collection failed', error);
      throw error;
    }
  }

  /**
   * Google Trends 데이터 파싱
   */
  private parseGoogleTrends(data: any): TrendingKeyword[] {
    const keywords: TrendingKeyword[] = [];

    try {
      const trendingSearches = data.default?.trendingSearchesDays?.[0]?.trendingSearches || [];

      trendingSearches.forEach((item: any, index: number) => {
        const title = item.title?.query || '';
        const traffic = item.formattedTraffic || '';
        
        // 트래픽 문자열에서 숫자 추출 (예: "50K+" -> 50000)
        const searchVolume = this.parseTraffic(traffic);

        keywords.push({
          keyword: title,
          rank: index + 1,
          searchVolume,
          category: this.detectCategory(item),
          isNew: false, // Google Trends는 신규 여부 제공 안 함
        });
      });
    } catch (error) {
      logger.error('[GoogleTrendCollector] Parsing failed', error);
    }

    return keywords;
  }

  /**
   * 트래픽 문자열을 숫자로 변환
   */
  private parseTraffic(traffic: string): number {
    if (!traffic) return 0;

    const match = traffic.match(/(\d+)([KM])?/);
    if (!match) return 0;

    const num = parseInt(match[1]);
    const unit = match[2];

    if (unit === 'K') return num * 1000;
    if (unit === 'M') return num * 1000000;
    return num;
  }

  /**
   * 카테고리 감지
   */
  private detectCategory(item: any): string {
    // Google Trends는 카테고리 정보가 제한적
    // 관련 뉴스나 이미지로 추측
    const articles = item.articles || [];
    
    if (articles.length > 0) {
      const source = articles[0].source || '';
      
      if (/스포츠|sport/i.test(source)) return 'sports';
      if (/연예|entertainment/i.test(source)) return 'entertainment';
      if (/경제|economy/i.test(source)) return 'economy';
      if (/정치|politics/i.test(source)) return 'politics';
    }

    return 'all';
  }

  /**
   * 연결 테스트 (API 키 불필요)
   */
  async testConnection(): Promise<boolean> {
    try {
      await axios.get('https://trends.google.com', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
