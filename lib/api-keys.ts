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

// 검색광고 API 키 목록 (Vercel 환경 변수에서 로드) - 최대 20개 지원
export const SEARCH_AD_KEYS: SearchAdKey[] = Array.from({ length: 20 }, (_, i) => {
  const index = i + 1;
  const customerId = process.env[`NAVER_CUSTOMER_ID_${index}`];
  const apiKey = process.env[`NAVER_API_KEY_${index}`];
  const secretKey = process.env[`NAVER_SECRET_KEY_${index}`];
  
  // 디버깅: 환경 변수 로딩 상태 확인
  if (customerId && customerId !== "YOUR_CUSTOMER_ID") {
    console.log(`[API Keys] 검색광고 API 키 ${index} 로드됨: ${customerId.substring(0, 8)}...`);
  }
  
  return {
    name: `검색광고API키${index}`,
    customer_id: customerId || "YOUR_CUSTOMER_ID",
    api_key: apiKey || "YOUR_API_KEY",
    secret_key: secretKey || "YOUR_SECRET_KEY"
  };
}).filter(key => key.customer_id !== "YOUR_CUSTOMER_ID"); // 실제 키가 있는 것만 필터링

// 오픈 API 키 목록 (검색 API용) - 최대 20개 지원
export const OPEN_API_KEYS: OpenApiKey[] = Array.from({ length: 20 }, (_, i) => {
  const index = i + 1;
  return {
    name: `OpenAPI키${index}`,
    client_id: process.env[`NAVER_SEARCH_CLIENT_ID_${index}`] || "YOUR_CLIENT_ID",
    client_secret: process.env[`NAVER_SEARCH_CLIENT_SECRET_${index}`] || "YOUR_CLIENT_SECRET"
  };
}).filter(key => key.client_id !== "YOUR_CLIENT_ID"); // 실제 키가 있는 것만 필터링

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
  const counts = {
    searchAdKeys: SEARCH_AD_KEYS.length,
    openApiKeys: OPEN_API_KEYS.length
  };
  
  console.log('[API Keys] 키 개수:', counts);
  console.log('[API Keys] 검색광고 키들:', SEARCH_AD_KEYS.map(k => k.name));
  console.log('[API Keys] 오픈 API 키들:', OPEN_API_KEYS.map(k => k.name));
  
  return counts;
}