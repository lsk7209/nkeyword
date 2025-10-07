// 구글 트렌드 키워드 수집 서비스

import axios from 'axios';
import type {
  TrendingKeyword,
  SerpApiResponse,
  KeywordCategory,
} from '@/lib/types/trending';
import {
  getPreviousRankings,
  getRecentKeywordList,
} from '@/lib/db/queries';
import { logger } from '@/lib/utils/logger';

/**
 * 키워드 수집 서비스
 */
export class KeywordCollector {
  private apiKey: string;
  private baseUrl: string = 'https://serpapi.com/search.json';

  constructor() {
    this.apiKey = process.env.SERPAPI_KEY || '';
    
    if (!this.apiKey) {
      logger.warn('SERPAPI_KEY is not set. Keyword collection will fail.');
    }
  }

  /**
   * 구글 트렌드에서 급상승 검색어 수집
   */
  async collectTrendingKeywords(): Promise<TrendingKeyword[]> {
    logger.info('[KeywordCollector] Starting collection...');
    
    try {
      // 1. 외부 API 호출
      const response = await this.fetchFromSerpApi();
      
      // 2. 데이터 정제
      const keywords = this.parseResponse(response);
      logger.debug('[KeywordCollector] Parsed keywords', { count: keywords.length });
      
      // 3. 변동률 계산
      const keywordsWithChange = await this.calculateChangeRates(keywords);
      logger.debug('[KeywordCollector] Calculated change rates');
      
      // 4. 신규 키워드 감지
      const finalKeywords = await this.detectNewKeywords(keywordsWithChange);
      logger.debug('[KeywordCollector] Detected new keywords');
      
      logger.info('[KeywordCollector] Collection completed', {
        total: finalKeywords.length,
        new: finalKeywords.filter(k => k.isNew).length,
      });
      
      return finalKeywords;
    } catch (error) {
      logger.error('[KeywordCollector] Collection failed', error);
      throw error;
    }
  }

  /**
   * SerpApi 호출
   */
  private async fetchFromSerpApi(): Promise<SerpApiResponse> {
    if (!this.apiKey) {
      throw new Error('SERPAPI_KEY is required');
    }

    const params = {
      engine: 'google_trends_trending_now',
      frequency: 'realtime',
      geo: 'KR',
      hl: 'ko',
      api_key: this.apiKey,
    };

    try {
      logger.debug('[KeywordCollector] Calling SerpApi...', {
        geo: params.geo,
        frequency: params.frequency,
      });
      
      const response = await axios.get<SerpApiResponse>(this.baseUrl, {
        params,
        timeout: 30000, // 30초 타임아웃
      });

      if (response.status !== 200) {
        throw new Error(`SerpApi returned status ${response.status}`);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error('[KeywordCollector] SerpApi request failed', error, {
          status: error.response?.status,
          message: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * 응답 데이터 파싱
   */
  private parseResponse(data: SerpApiResponse): TrendingKeyword[] {
    const searches = data.realtime_searches || [];
    
    if (searches.length === 0) {
      logger.warn('[KeywordCollector] No trending searches found in response');
    }

    return searches.map((item, index) => {
      const keyword = item.queries?.[0] || item.title || 'Unknown';
      const traffic = item.traffic || 0;
      const category = this.detectCategory(item);

      return {
        keyword,
        rank: index + 1,
        searchVolume: traffic,
        category,
      };
    });
  }

  /**
   * 변동률 계산
   */
  private async calculateChangeRates(
    keywords: TrendingKeyword[]
  ): Promise<TrendingKeyword[]> {
    try {
      // 이전 시간(1시간 전) 데이터 조회
      const previousData = await getPreviousRankings(1);
      
      if (previousData.length === 0) {
        logger.debug('[KeywordCollector] No previous data for comparison');
        return keywords.map(kw => ({ ...kw, changeRate: 'NEW' }));
      }

      return keywords.map(keyword => {
        const previous = previousData.find(p => p.keyword === keyword.keyword);
        
        if (!previous) {
          return { ...keyword, changeRate: 'NEW' };
        }
        
        const rankChange = previous.rank - keyword.rank;
        
        // 순위 변화 없음
        if (rankChange === 0) {
          return { ...keyword, changeRate: '=' };
        }
        
        // 순위 상승 (긍정적)
        if (rankChange > 0) {
          return { ...keyword, changeRate: `▲${rankChange}` };
        }
        
        // 순위 하락 (부정적)
        return { ...keyword, changeRate: `▼${Math.abs(rankChange)}` };
      });
    } catch (error) {
      logger.error('[KeywordCollector] Failed to calculate change rates', error);
      // 에러 발생 시 변동률 없이 반환
      return keywords;
    }
  }

  /**
   * 신규 키워드 감지
   */
  private async detectNewKeywords(
    keywords: TrendingKeyword[]
  ): Promise<TrendingKeyword[]> {
    try {
      // 최근 24시간 내 키워드 목록 조회
      const recentKeywords = await getRecentKeywordList(24);
      const recentKeywordSet = new Set(recentKeywords);

      return keywords.map(keyword => ({
        ...keyword,
        isNew: !recentKeywordSet.has(keyword.keyword),
      }));
    } catch (error) {
      logger.error('[KeywordCollector] Failed to detect new keywords', error);
      // 에러 발생 시 모두 신규가 아닌 것으로 처리
      return keywords.map(kw => ({ ...kw, isNew: false }));
    }
  }

  /**
   * 카테고리 감지
   * 간단한 키워드 매칭 기반 (실제로는 ML 모델 사용 권장)
   */
  private detectCategory(item: any): KeywordCategory {
    const title = (item.title || '').toLowerCase();
    const queries = (item.queries || []).join(' ').toLowerCase();
    const text = `${title} ${queries}`;

    // 엔터테인먼트
    if (
      /game|게임|영화|드라마|예능|아이돌|kpop|넷플릭스|netflix/i.test(text)
    ) {
      return 'entertainment';
    }

    // 스포츠
    if (
      /sports|스포츠|축구|야구|농구|골프|올림픽|월드컵/i.test(text)
    ) {
      return 'sports';
    }

    // IT/기술
    if (
      /tech|it|기술|소프트웨어|하드웨어|스마트폰|앱|ai|인공지능/i.test(text)
    ) {
      return 'it';
    }

    // 정치
    if (
      /politics|정치|국회|대통령|선거|의원|정부/i.test(text)
    ) {
      return 'politics';
    }

    // 경제
    if (
      /economy|경제|주식|부동산|금융|코스피|환율|비트코인/i.test(text)
    ) {
      return 'economy';
    }

    // 사회
    if (
      /society|사회|사건|사고|범죄|재난|날씨/i.test(text)
    ) {
      return 'society';
    }

    // 문화
    if (
      /culture|문화|전시|공연|축제|미술|음악/i.test(text)
    ) {
      return 'culture';
    }

    // 기타
    return 'all';
  }

  /**
   * API 키 유효성 확인
   */
  async testApiKey(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      await this.fetchFromSerpApi();
      return true;
    } catch (error) {
      return false;
    }
  }
}

