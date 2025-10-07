// 애플리케이션 전역 상수 정의

/**
 * 타이밍 관련 상수 (밀리초)
 */
export const TIMING = {
  // API 호출 간격
  API_CALL_INTERVAL: 200,           // 네이버 API 호출 간격 (차단 방지)
  API_RETRY_DELAY: 1000,            // API 재시도 대기 시간
  
  // 폴링 간격
  POLLING_INTERVAL: 5000,           // 배치 작업 상태 폴링 간격
  WORKER_POLLING_INTERVAL: 10000,  // Worker 폴링 간격
  
  // 작업 타임아웃
  MAX_JOB_TIME: 30 * 60 * 1000,    // 배치 작업 최대 시간 (30분)
  API_TIMEOUT: 10000,               // API 호출 타임아웃 (10초)
  
  // 자동 수집
  AUTO_COLLECT_DEFAULT_INTERVAL: 10 * 60 * 1000,  // 기본 자동 수집 간격 (10분)
  
  // UI 디바운스
  FILTER_DEBOUNCE: 300,             // 필터 입력 디바운스 (300ms)
  SEARCH_DEBOUNCE: 500,             // 검색 입력 디바운스 (500ms)
} as const;

/**
 * 제한값 상수
 */
export const LIMITS = {
  // 키워드 관련
  MAX_KEYWORD_LENGTH: 50,           // 키워드 최대 길이
  MIN_KEYWORD_LENGTH: 1,            // 키워드 최소 길이
  
  // 배치 처리
  BATCH_SIZE: 5,                    // 자동 수집 배치 크기
  MAX_BATCH_SIZE: 20,               // 최대 배치 크기
  
  // 자동 수집
  MAX_DEPTH: 5,                     // 최대 시드 깊이
  DEFAULT_DEPTH: 3,                 // 기본 시드 깊이
  
  // 페이지네이션
  ITEMS_PER_PAGE: 1000,             // 페이지당 항목 수
  VISIBLE_ITEMS: 50,                // 가상화 시 보이는 항목 수
  
  // API 재시도
  MAX_RETRIES: 2,                   // 최대 재시도 횟수
  
  // 캐시
  CACHE_TTL: 24 * 60 * 60 * 1000,  // 캐시 유효 시간 (24시간)
} as const;

/**
 * 로컬 스토리지 키
 */
export const STORAGE_KEYS = {
  DATASET: 'nkeyword:dataset:v1',
  AUTO_COLLECT_CONFIG: 'nkeyword:autoCollect:v1',
  CURRENT_JOB_ID: 'nkeyword:currentJobId',
  JOB_START_TIME: 'nkeyword:jobStartTime',
} as const;

/**
 * API 엔드포인트
 */
export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  KEYWORDS_RELATED: '/api/keywords/related',
  KEYWORDS_AUTO_COLLECT: '/api/keywords/auto-collect',
  KEYWORDS_AUTO_COLLECT_START: '/api/keywords/auto-collect/start',
  SEARCH_NAVER: '/api/search/naver',
  DOCUMENTS_BATCH: '/api/documents/batch',
  DOCUMENTS_STATUS: '/api/documents/status',
  TRENDING_KEYWORDS: '/api/trending/keywords',
  TRENDING_HISTORY: '/api/trending/history',
  TRENDING_STATS: '/api/trending/stats',
  TRENDING_COLLECT: '/api/trending/collect',
} as const;

/**
 * UI 관련 상수
 */
export const UI = {
  // 테이블
  VIRTUAL_ITEM_HEIGHT: 60,          // 가상화 행 높이 (px)
  TABLE_HEIGHT: 600,                // 테이블 높이 (px)
  
  // 차트
  CHART_TOP_ITEMS: 10,              // 차트에 표시할 상위 항목 수
  
  // 색상
  COLORS: {
    BLOG: 'text-blue-600',
    CAFE: 'text-green-600',
    NEWS: 'text-red-600',
    WEBKR: 'text-purple-600',
  },
} as const;

/**
 * 경쟁도 옵션
 */
export const COMPETITION_OPTIONS = ['높음', '중간', '낮음'] as const;

/**
 * 정렬 필드
 */
export const SORT_FIELDS = [
  'keyword',
  'totalSearch',
  'monthlyPcSearch',
  'monthlyMobileSearch',
  'competition',
  'blogTotalCount',
  'cafeTotalCount',
  'newsTotalCount',
  'webkrTotalCount',
] as const;

/**
 * 에러 메시지
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '네트워크 오류가 발생했습니다',
  API_ERROR: 'API 호출 중 오류가 발생했습니다',
  INVALID_KEYWORD: '유효하지 않은 키워드입니다',
  KEYWORD_TOO_LONG: `키워드는 ${LIMITS.MAX_KEYWORD_LENGTH}자 이하여야 합니다`,
  KEYWORD_TOO_SHORT: `키워드는 ${LIMITS.MIN_KEYWORD_LENGTH}자 이상이어야 합니다`,
  NO_RESULTS: '검색 결과가 없습니다',
  BATCH_JOB_FAILED: '배치 작업이 실패했습니다',
  ALREADY_PROCESSING: '이미 처리 중인 작업이 있습니다',
} as const;

/**
 * 성공 메시지
 */
export const SUCCESS_MESSAGES = {
  SEARCH_COMPLETE: '검색이 완료되었습니다',
  BATCH_STARTED: '백그라운드 문서수 수집이 시작되었습니다',
  BATCH_COMPLETE: '문서수 수집이 완료되었습니다',
  DATA_SAVED: '데이터가 저장되었습니다',
  DATA_DELETED: '데이터가 삭제되었습니다',
  AUTO_COLLECT_ENABLED: '자동 수집이 활성화되었습니다',
  AUTO_COLLECT_DISABLED: '자동 수집이 비활성화되었습니다',
} as const;

/**
 * 유틸리티 타입
 */
export type TimingKey = keyof typeof TIMING;
export type LimitKey = keyof typeof LIMITS;
export type StorageKey = keyof typeof STORAGE_KEYS;
export type ApiEndpoint = keyof typeof API_ENDPOINTS;
export type CompetitionOption = typeof COMPETITION_OPTIONS[number];
export type SortField = typeof SORT_FIELDS[number];
