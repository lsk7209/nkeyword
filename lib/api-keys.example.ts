// API 키 설정 템플릿
// 이 파일을 lib/api-keys.ts로 복사하여 실제 키를 입력하세요.
// 주의: lib/api-keys.ts는 .gitignore에 포함되어 있어 git에 커밋되지 않습니다.

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

// 검색광고 API 키 목록
export const SEARCH_AD_KEYS: SearchAdKey[] = [
  {
    name: "검색광고API키1",
    customer_id: "YOUR_CUSTOMER_ID",
    api_key: "YOUR_API_KEY",
    secret_key: "YOUR_SECRET_KEY"
  }
  // 추가 키를 여기에 입력하세요
];

// 오픈 API 키 목록 (검색 API용)
export const OPEN_API_KEYS: OpenApiKey[] = [
  {
    name: "OpenAPI키1",
    client_id: "YOUR_CLIENT_ID",
    client_secret: "YOUR_CLIENT_SECRET"
  }
  // 추가 키를 여기에 입력하세요
];

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

