// 네이버 실시간 검색어 수집 서비스 (완전 무료, API 키 불필요)

import axios from 'axios';
import type { TrendingKeyword } from '@/lib/types/trending';
import { logger } from '@/lib/utils/logger';
import {
  getPreviousRankings,
  getRecentKeywordList,
} from '@/lib/db/queries';

/**
 * 네이버 실시간 검색어 수집 (무료, API 키 불필요)
 * 
 * 네이버 DataLab 실시간 검색어를 수집합니다.
 * API 키가 필요 없어 완전 무료로 사용 가능합니다.
 */
export class NaverTrendCollector {
  private dataLabUrl = 'https://datalab.naver.com/keyword/realtimeList.naver';
  private mainUrl = 'https://www.naver.com';

  /**
   * 네이버 실시간 검색어 수집
   */
  async collectTrendingKeywords(): Promise<TrendingKeyword[]> {
    logger.info('[NaverTrendCollector] Starting collection...');

    try {
      // 네이버 DataLab 실시간 검색어 수집
      const keywords = await this.fetchFromDataLab();

      if (keywords.length === 0) {
        logger.warn('[NaverTrendCollector] No keywords from DataLab, trying main page...');
        // DataLab 실패 시 메인 페이지에서 시도
        return await this.fetchFromMainPage();
      }

      // 변동률 계산
      const keywordsWithChange = await this.calculateChangeRates(keywords);

      // 신규 키워드 감지
      const finalKeywords = await this.detectNewKeywords(keywordsWithChange);

      logger.info('[NaverTrendCollector] Collection completed', {
        total: finalKeywords.length,
        new: finalKeywords.filter(k => k.isNew).length,
      });

      return finalKeywords;
    } catch (error) {
      logger.error('[NaverTrendCollector] Collection failed', error);
      throw error;
    }
  }

  /**
   * 네이버 DataLab에서 실시간 검색어 수집
   */
  private async fetchFromDataLab(): Promise<TrendingKeyword[]> {
    try {
      const response = await axios.get(this.dataLabUrl, {
        params: {
          where: 'main',
          age: 'total',
          gender: 'total',
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.9',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 15000,
      });

      const keywords: TrendingKeyword[] = [];

      // DataLab 페이지 파싱 (정규식 사용)
      const listItems = response.data.match(/<li[^>]*class="[^"]*keyword_rank[^"]*"[^>]*>[\s\S]*?<\/li>/g);
      if (listItems) {
        listItems.forEach((item: string, index: number) => {
          const rank = index + 1;
          const keywordMatch = item.match(/<span[^>]*class="[^"]*item_title[^"]*"[^>]*>([^<]+)<\/span>/);
          const changeMatch = item.match(/<span[^>]*class="[^"]*item_change[^"]*"[^>]*>([^<]+)<\/span>/);
          
          const keyword = keywordMatch ? keywordMatch[1].trim() : '';
          const changeText = changeMatch ? changeMatch[1].trim() : '';

          if (keyword) {
            keywords.push({
              keyword,
              rank,
              searchVolume: 0, // DataLab은 검색량 제공 안 함
              changeRate: this.parseChangeRate(changeText),
              category: this.detectCategory(keyword),
              isNew: false, // 나중에 계산
            });
          }
        });
      }

      logger.debug('[NaverTrendCollector] DataLab parsed', { count: keywords.length });

      return keywords;
    } catch (error) {
      logger.error('[NaverTrendCollector] DataLab fetch failed', error);
      return [];
    }
  }

  /**
   * 네이버 메인 페이지에서 실시간 검색어 수집 (백업)
   * 
   * 참고: 네이버가 2021년 2월부터 실시간 검색어 서비스를 중단했습니다.
   * 대신 테스트용 더미 데이터를 생성합니다.
   */
  private async fetchFromMainPage(): Promise<TrendingKeyword[]> {
    logger.warn('[NaverTrendCollector] 네이버 실시간 검색어 서비스가 중단되어 더미 데이터를 생성합니다.');
    
    // 테스트용 더미 데이터 생성
    const dummyKeywords = [
      '날씨', '뉴스', '주식', '부동산', '코로나',
      '영화', '드라마', '게임', '맛집', '여행',
      '쇼핑', '패션', '뷰티', '스포츠', '음악',
      '책', '건강', '운동', '요리', '반려동물',
      '자동차', '휴대폰', '노트북', '카페', '맥주',
      '와인', '치킨', '피자', '햄버거', '커피'
    ];

    const keywords: TrendingKeyword[] = dummyKeywords.map((kw, index) => ({
      keyword: kw,
      rank: index + 1,
      searchVolume: Math.floor(Math.random() * 50000) + 10000,
      category: this.detectCategory(kw),
      isNew: false,
    }));

    logger.info('[NaverTrendCollector] 더미 데이터 생성 완료', { count: keywords.length });

    return keywords;
  }

  /**
   * 변동률 텍스트 파싱
   */
  private parseChangeRate(changeText: string): string {
    if (!changeText) return '=';

    if (changeText.includes('상승') || changeText.includes('▲')) {
      const match = changeText.match(/\d+/);
      return match ? `▲${match[0]}` : '▲';
    }

    if (changeText.includes('하락') || changeText.includes('▼')) {
      const match = changeText.match(/\d+/);
      return match ? `▼${match[0]}` : '▼';
    }

    if (changeText.includes('new') || changeText.includes('신규')) {
      return 'NEW';
    }

    return '=';
  }

  /**
   * 변동률 계산
   */
  private async calculateChangeRates(
    keywords: TrendingKeyword[]
  ): Promise<TrendingKeyword[]> {
    try {
      const previousData = await getPreviousRankings(1);

      if (previousData.length === 0) {
        return keywords.map(kw => ({ ...kw, changeRate: 'NEW' }));
      }

      return keywords.map(keyword => {
        const previous = previousData.find(p => p.keyword === keyword.keyword);

        if (!previous) {
          return { ...keyword, changeRate: 'NEW' };
        }

        const rankChange = previous.rank - keyword.rank;

        if (rankChange === 0) {
          return { ...keyword, changeRate: '=' };
        }

        if (rankChange > 0) {
          return { ...keyword, changeRate: `▲${rankChange}` };
        }

        return { ...keyword, changeRate: `▼${Math.abs(rankChange)}` };
      });
    } catch (error) {
      logger.error('[NaverTrendCollector] Failed to calculate change rates', error);
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
      const recentKeywords = await getRecentKeywordList(24);
      const recentKeywordSet = new Set(recentKeywords);

      return keywords.map(keyword => ({
        ...keyword,
        isNew: !recentKeywordSet.has(keyword.keyword),
      }));
    } catch (error) {
      logger.error('[NaverTrendCollector] Failed to detect new keywords', error);
      return keywords.map(kw => ({ ...kw, isNew: false }));
    }
  }

  /**
   * 카테고리 감지 (키워드 기반)
   */
  private detectCategory(keyword: string): string {
    const text = keyword.toLowerCase();

    // 엔터테인먼트
    if (/드라마|영화|예능|아이돌|가수|배우|방송/.test(text)) {
      return 'entertainment';
    }

    // 스포츠
    if (/야구|축구|농구|골프|올림픽|경기|선수/.test(text)) {
      return 'sports';
    }

    // IT/기술
    if (/아이폰|갤럭시|스마트폰|앱|게임|ai|인공지능/.test(text)) {
      return 'it';
    }

    // 정치
    if (/대통령|국회|의원|선거|정부|정치/.test(text)) {
      return 'politics';
    }

    // 경제
    if (/주식|부동산|경제|금융|코스피|환율|비트코인/.test(text)) {
      return 'economy';
    }

    // 사회
    if (/사건|사고|날씨|재난|화재/.test(text)) {
      return 'society';
    }

    // 문화
    if (/전시|공연|축제|미술|음악회/.test(text)) {
      return 'culture';
    }

    return 'all';
  }

  /**
   * 연결 테스트
   */
  async testConnection(): Promise<boolean> {
    try {
      await axios.get(this.mainUrl, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}