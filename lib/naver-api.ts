import crypto from 'crypto';
import type { SearchAdKey } from './api-keys';

export function generateSignature(
  timestamp: number,
  method: string,
  uri: string,
  secretKey: string
): string {
  const message = `${timestamp}.${method}.${uri}`;
  const hmac = crypto.createHmac('sha256', secretKey);
  return hmac.update(message).digest('base64');
}

/**
 * 검색광고 API 헤더 생성 (API 키 객체 사용)
 */
export function createHeaders(method: string, uri: string, apiKey: SearchAdKey) {
  const timestamp = Date.now();
  const signature = generateSignature(timestamp, method, uri, apiKey.secret_key);

  return {
    'X-Timestamp': timestamp.toString(),
    'X-API-KEY': apiKey.api_key,
    'X-Customer': apiKey.customer_id,
    'X-Signature': signature,
  } as Record<string, string>;
}

/**
 * 환경 변수에서 읽어온 키로 헤더 생성 (하위 호환성)
 */
export function createHeadersFromEnv(method: string, uri: string) {
  const apiKey = process.env.NAVER_API_KEY;
  const customerId = process.env.NAVER_CUSTOMER_ID;
  const secretKey = process.env.NAVER_SECRET_KEY;

  if (!apiKey || !customerId || !secretKey) {
    const missing: string[] = [];
    if (!customerId) missing.push('NAVER_CUSTOMER_ID');
    if (!apiKey) missing.push('NAVER_API_KEY');
    if (!secretKey) missing.push('NAVER_SECRET_KEY');
    throw new Error(`환경 변수 미설정: ${missing.join(', ')}`);
  }

  const timestamp = Date.now();
  const signature = generateSignature(timestamp, method, uri, secretKey);

  return {
    'X-Timestamp': timestamp.toString(),
    'X-API-KEY': apiKey,
    'X-Customer': customerId,
    'X-Signature': signature,
  } as Record<string, string>;
}


