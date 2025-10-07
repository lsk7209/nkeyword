// API 키 설정
// 주의: 이 파일은 .gitignore에 포함되어 있어 git에 커밋되지 않습니다.

export interface SearchAdKey {
  name: string;
  customer_id: string;
  api_key: string;
  secret_key: string;
}

export interface OpenApiKey {
  name: string;
  client_id: string;
  client_secret: string;
}

// 검색광고 API 키 목록 (Vercel 환경 변수에서 로드)
export const SEARCH_AD_KEYS: SearchAdKey[] = [
  {
    name: "검색광고API키1",
    customer_id: process.env.NAVER_CUSTOMER_ID_1 || "YOUR_CUSTOMER_ID",
    api_key: process.env.NAVER_API_KEY_1 || "YOUR_API_KEY",
    secret_key: process.env.NAVER_SECRET_KEY_1 || "YOUR_SECRET_KEY"
  },
  {
    name: "검색광고API키2",
    customer_id: process.env.NAVER_CUSTOMER_ID_2 || "YOUR_CUSTOMER_ID",
    api_key: process.env.NAVER_API_KEY_2 || "YOUR_API_KEY",
    secret_key: process.env.NAVER_SECRET_KEY_2 || "YOUR_SECRET_KEY"
  },
  {
    name: "검색광고API키3",
    customer_id: process.env.NAVER_CUSTOMER_ID_3 || "YOUR_CUSTOMER_ID",
    api_key: process.env.NAVER_API_KEY_3 || "YOUR_API_KEY",
    secret_key: process.env.NAVER_SECRET_KEY_3 || "YOUR_SECRET_KEY"
  }
].filter(key => key.customer_id !== "YOUR_CUSTOMER_ID"); // 실제 키가 있는 것만 필터링

// 오픈 API 키 목록 (검색 API용)
export const OPEN_API_KEYS: OpenApiKey[] = [
  {
    name: "OpenAPI키1",
    client_id: process.env.NAVER_SEARCH_CLIENT_ID_1 || "YOUR_CLIENT_ID",
    client_secret: process.env.NAVER_SEARCH_CLIENT_SECRET_1 || "YOUR_CLIENT_SECRET"
  },
  {
    name: "OpenAPI키2",
    client_id: process.env.NAVER_SEARCH_CLIENT_ID_2 || "YOUR_CLIENT_ID",
    client_secret: process.env.NAVER_SEARCH_CLIENT_SECRET_2 || "YOUR_CLIENT_SECRET"
  },
  {
    name: "OpenAPI키3",
    client_id: process.env.NAVER_SEARCH_CLIENT_ID_3 || "YOUR_CLIENT_ID",
    client_secret: process.env.NAVER_SEARCH_CLIENT_SECRET_3 || "YOUR_CLIENT_SECRET"
  }
].filter(key => key.client_id !== "YOUR_CLIENT_ID"); // 실제 키가 있는 것만 필터링

// 키 로테이션 인덱스 (서버 메모리에 저장)
let searchAdKeyIndex = 0;
let openApiKeyIndex = 0;

/**
 * 다음 검색광고 API 키를 가져옵니다 (라운드 로빈)
 */
export function getNextSearchAdKey(): SearchAdKey {
  const key = SEARCH_AD_KEYS[searchAdKeyIndex];
  searchAdKeyIndex = (searchAdKeyIndex + 1) % SEARCH_AD_KEYS.length;
  return key;
}

/**
 * 다음 오픈 API 키를 가져옵니다 (라운드 로빈)
 */
export function getNextOpenApiKey(): OpenApiKey {
  const key = OPEN_API_KEYS[openApiKeyIndex];
  openApiKeyIndex = (openApiKeyIndex + 1) % OPEN_API_KEYS.length;
  return key;
}

/**
 * 랜덤 검색광고 API 키를 가져옵니다
 */
export function getRandomSearchAdKey(): SearchAdKey {
  const randomIndex = Math.floor(Math.random() * SEARCH_AD_KEYS.length);
  return SEARCH_AD_KEYS[randomIndex];
}

/**
 * 랜덤 오픈 API 키를 가져옵니다
 */
export function getRandomOpenApiKey(): OpenApiKey {
  const randomIndex = Math.floor(Math.random() * OPEN_API_KEYS.length);
  return OPEN_API_KEYS[randomIndex];
}

/**
 * 특정 인덱스의 검색광고 API 키를 가져옵니다
 */
export function getSearchAdKeyByIndex(index: number): SearchAdKey | null {
  if (index >= 0 && index < SEARCH_AD_KEYS.length) {
    return SEARCH_AD_KEYS[index];
  }
  return null;
}

/**
 * 특정 인덱스의 오픈 API 키를 가져옵니다
 */
export function getOpenApiKeyByIndex(index: number): OpenApiKey | null {
  if (index >= 0 && index < OPEN_API_KEYS.length) {
    return OPEN_API_KEYS[index];
  }
  return null;
}

/**
 * API 키 개수 반환
 */
export function getKeyCount() {
  return {
    searchAdKeys: SEARCH_AD_KEYS.length,
    openApiKeys: OPEN_API_KEYS.length
  };
}