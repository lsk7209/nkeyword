// 트렌드 키워드 관련 TypeScript 타입 정의

/**
 * 트렌드 키워드 기본 인터페이스
 */
export interface TrendingKeyword {
  id?: number;
  keyword: string;
  rank: number;
  searchVolume?: number;
  changeRate?: string;
  isNew?: boolean;
  category?: string;
  collectedAt?: string;
  createdAt?: string;
}

/**
 * 키워드 이력 인터페이스
 */
export interface KeywordHistory {
  id?: number;
  keyword: string;
  rank?: number;
  searchVolume?: number;
  recordedAt: string;
  createdAt?: string;
}

/**
 * 키워드 통계 인터페이스
 */
export interface KeywordStats {
  highestRank: number;
  lowestRank: number;
  avgSearchVolume: number;
  totalAppearances: number;
}

/**
 * 일별 통계 인터페이스
 */
export interface DailyStats {
  id?: number;
  statsDate: string;
  totalKeywords: number;
  newKeywords: number;
  avgSearchVolume: number;
  topKeyword?: string;
  categoryDistribution?: Record<string, number>;
  createdAt?: string;
}

/**
 * 수집 로그 인터페이스
 */
export interface CollectionLog {
  id?: number;
  status: 'success' | 'failed';
  keywordsCount?: number;
  errorMessage?: string;
  durationMs?: number;
  collectedAt: string;
}

/**
 * API 응답 기본 구조
 */
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  meta?: {
    limit?: number;
    offset?: number;
    total?: number;
    lastUpdated?: string;
  };
}

/**
 * 키워드 목록 조회 파라미터
 */
export interface GetKeywordsParams {
  limit?: number;
  offset?: number;
  timeRange?: 'realtime' | '24h' | '7d' | '30d';
  category?: string;
  sortBy?: 'rank' | 'searchVolume';
}

/**
 * 키워드 이력 조회 파라미터
 */
export interface GetHistoryParams {
  startDate?: string;
  endDate?: string;
  interval?: 'hourly' | 'daily';
}

/**
 * SerpApi 응답 타입
 */
export interface SerpApiResponse {
  search_metadata?: {
    status?: string;
    created_at?: string;
  };
  realtime_searches?: Array<{
    title?: string;
    queries?: string[];
    traffic?: number;
    related_topics?: Array<{
      topic_title?: string;
    }>;
  }>;
}

/**
 * 수집 작업 결과
 */
export interface CollectionResult {
  success: boolean;
  count: number;
  duration: number;
  newKeywords?: number;
  timestamp: string;
}

/**
 * 카테고리 타입
 */
export type KeywordCategory = 
  | 'all'
  | 'entertainment'
  | 'sports'
  | 'politics'
  | 'it'
  | 'economy'
  | 'society'
  | 'culture'
  | 'other';

/**
 * 시간 범위 타입
 */
export type TimeRange = 'realtime' | '24h' | '7d' | '30d';

/**
 * 정렬 기준 타입
 */
export type SortBy = 'rank' | 'searchVolume';

/**
 * 데이터베이스 연결 설정
 */
export interface DatabaseConfig {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * 캐시 항목
 */
export interface CacheItem<T = any> {
  data: T;
  expires: number;
}

/**
 * 로거 레벨
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 로그 메시지
 */
export interface LogMessage {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

