import { NextRequest, NextResponse } from 'next/server';
import { getBatchQueue, type DocumentCounts } from '@/lib/batch-queue-adapter';
import { getNextOpenApiKey } from '@/lib/api-keys';

// 배치 큐 인스턴스 가져오기 (환경변수로 모드 결정)
const batchQueue = getBatchQueue();

// 간단한 메모리 캐시 (서버 재시작 시 초기화됨)
const documentCountCache = new Map<string, DocumentCounts>();
const CACHE_EXPIRY = 60 * 60 * 1000; // 🚀 30분 → 60분으로 변경 (캐시 히트율 향상)

// 캐시 초기화 함수 (export하여 다른 곳에서도 사용 가능)
export function clearDocumentCountCache() {
  const size = documentCountCache.size;
  documentCountCache.clear();
  console.log(`[캐시] 전체 캐시 초기화: ${size}개 항목 삭제`);
  return size;
}

// 캐시에서 문서수 조회
function getCachedDocumentCount(keyword: string): DocumentCounts | null {
  const cached = documentCountCache.get(keyword);
  if (cached) {
    console.log(`[캐시] 히트: ${keyword}`);
    return cached;
  }
  return null;
}

// 캐시에 문서수 저장
function setCachedDocumentCount(keyword: string, counts: DocumentCounts) {
  documentCountCache.set(keyword, counts);
  console.log(`[캐시] 저장: ${keyword}`, counts);
  
  // 캐시 크기 제한 (최대 2000개) - 🚀 1000개 → 2000개로 변경
  if (documentCountCache.size > 2000) {
    const firstKey = documentCountCache.keys().next().value;
    documentCountCache.delete(firstKey);
  }
}

const NAVER_SEARCH_BASE = 'https://openapi.naver.com/v1/search';

async function getDocumentCount(
  endpoint: string,
  query: string,
  clientId: string,
  clientSecret: string
): Promise<number | null> {
  try {
    const searchParams = new URLSearchParams({
      query,
      display: '1',
    });

    const url = `${NAVER_SEARCH_BASE}${endpoint}?${searchParams}`;
    console.log(`[API] 요청 URL: ${url}`);
    console.log(`[API] 클라이언트 ID: ${clientId}`);

    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    console.log(`[API] 응답 상태: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] 오류 응답: ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[API] 응답 데이터:`, data);
    return data.total || 0;
  } catch (error) {
    console.error(`[API] 예외 발생:`, error);
    return null;
  }
}

async function fetchDocumentCountsForKeyword(keyword: string, retryCount = 0): Promise<DocumentCounts> {
  // 캐시 확인 (재시도가 아닌 경우에만)
  if (retryCount === 0) {
    const cached = getCachedDocumentCount(keyword);
    if (cached) {
      return cached;
    }
  }
  
  // 재시도 시 다른 API 키 사용
  const apiKey = getNextOpenApiKey();
  console.log(`[배치] 키워드 처리 시작: ${keyword}, API 키: ${apiKey.name}, 재시도: ${retryCount}`);
  
  try {
    // 병렬로 4개 API 호출 (이미 최적화됨)
    const [blogCount, cafeCount, newsCount, webkrCount] = await Promise.all([
      getDocumentCountWithRetry('/blog.json', keyword, apiKey.client_id, apiKey.client_secret),
      getDocumentCountWithRetry('/cafearticle.json', keyword, apiKey.client_id, apiKey.client_secret),
      getDocumentCountWithRetry('/news.json', keyword, apiKey.client_id, apiKey.client_secret),
      getDocumentCountWithRetry('/webkr.json', keyword, apiKey.client_id, apiKey.client_secret),
    ]);

    const result = {
      blog: blogCount ?? undefined,
      cafe: cafeCount ?? undefined,
      news: newsCount ?? undefined,
      webkr: webkrCount ?? undefined,
    };

    // 캐시에 저장 (성공한 경우에만)
    if (retryCount === 0) {
      setCachedDocumentCount(keyword, result);
    }

    console.log(`[배치] 키워드 처리 완료: ${keyword}`, result);
    return result;
  } catch (error) {
    console.error(`[배치] 문서수 조회 실패: ${keyword}`, error);
    
    // 재시도 로직 (최대 2번, 다른 API 키 사용)
    if (retryCount < 2) {
      console.log(`[배치] 재시도: ${keyword} (${retryCount + 1}/2) - 다른 API 키 사용`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // 지수 백오프
      return fetchDocumentCountsForKeyword(keyword, retryCount + 1);
    }
    
    return {};
  }
}

// 재시도 로직이 포함된 문서수 조회 함수 (🚀 최적화: 더 적극적인 재시도)
async function getDocumentCountWithRetry(
  endpoint: string,
  query: string,
  clientId: string,
  clientSecret: string,
  maxRetries = 3 // 🚀 2 → 3으로 변경 (재시도 횟수 증가)
): Promise<number | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await getDocumentCount(endpoint, query, clientId, clientSecret);
      if (result !== null) {
        return result;
      }
    } catch (error) {
      console.warn(`[API] ${endpoint} 조회 실패 (시도 ${attempt + 1}/${maxRetries + 1}):`, error);
      
      if (attempt < maxRetries) {
        // 🚀 지수 백오프 개선: 300ms, 600ms, 1.2s, 2.4s (더 빠른 시작, 점진적 증가)
        await new Promise(resolve => setTimeout(resolve, 300 * Math.pow(2, attempt)));
      }
    }
  }
  
  console.error(`[API] ${endpoint} 최종 실패: ${query}`);
  return null;
}

/**
 * 배치 작업 비동기 처리 함수 (최적화된 버전)
 */
async function processBatchJob(jobId: string, keywords: string[]) {
  console.log(`[배치] 작업 시작: ${jobId}, 키워드 ${keywords.length}개`);
  
  await batchQueue.updateJobStatus(jobId, {
    status: 'processing',
    startedAt: Date.now(),
  });

  // 배치 크기 설정 (동시 처리할 키워드 수)
  const BATCH_SIZE = 5; // 🚀 2개 → 5개로 변경 (처리 속도 2.5배 향상)
  const API_DELAY = 300; // 🚀 500ms → 300ms로 변경 (안정성 유지하면서 속도 개선)
  
  for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
    const batch = keywords.slice(i, i + BATCH_SIZE);
    console.log(`[배치] 배치 ${Math.floor(i / BATCH_SIZE) + 1} 처리: ${batch.join(', ')}`);
    
    // 배치 내에서 병렬 처리
    const batchPromises = batch.map(async (keyword, batchIndex) => {
      try {
        const counts = await fetchDocumentCountsForKeyword(keyword);
        
        // 🆕 프론트엔드 형식으로 변환하여 저장
        const formattedResult = {
          keyword,
          blogTotalCount: counts.blog,
          cafeTotalCount: counts.cafe,
          newsTotalCount: counts.news,
          webkrTotalCount: counts.webkr,
        };
        
        // 결과 저장 (원본 counts 형식)
        await batchQueue.addJobResult(jobId, keyword, counts);
        
        console.log(`[배치] ${i + batchIndex + 1}/${keywords.length} 완료: ${keyword}`, counts);
        return { keyword, success: true, counts, formattedResult };
      } catch (error) {
        console.error(`[배치] 키워드 처리 실패: ${keyword}`, error);
        return { keyword, success: false, error };
      }
    });
    
    // 배치 완료 대기
    const batchResults = await Promise.all(batchPromises);
    
    // 진행률 업데이트
    const completedCount = Math.min(i + BATCH_SIZE, keywords.length);
    await batchQueue.updateJobProgress(jobId, completedCount);
    
    // 성공/실패 통계
    const successCount = batchResults.filter(r => r.success).length;
    const failCount = batchResults.filter(r => !r.success).length;
    console.log(`[배치] 배치 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
    
    // 다음 배치 전 대기 (API 제한 고려)
    if (i + BATCH_SIZE < keywords.length) {
      await new Promise(resolve => setTimeout(resolve, API_DELAY));
    }
  }

  await batchQueue.updateJobStatus(jobId, {
    status: 'completed',
    completedAt: Date.now(),
  });
  
  console.log(`[배치] 작업 완료: ${jobId}`);
}

/**
 * POST: 배치 작업 시작
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywords } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { success: false, error: '키워드 목록이 필요합니다' },
        { status: 400 }
      );
    }

    // 중복 제거 및 캐시 확인
    const uniqueKeywords = [...new Set(keywords)];
    const cachedResults: Array<{ keyword: string; counts: DocumentCounts }> = [];
    const keywordsToProcess = uniqueKeywords.filter(keyword => {
      const cached = getCachedDocumentCount(keyword);
      if (cached) {
        cachedResults.push({ keyword, counts: cached });
        return false; // 캐시에 있으면 제외
      }
      return true; // 캐시에 없으면 처리 대상
    });

    console.log(`[배치] 문서수 수집 요청: ${keywords.length}개 키워드`);
    console.log(`[배치] 중복 제거 후: ${uniqueKeywords.length}개`);
    console.log(`[배치] 캐시 히트: ${cachedResults.length}개`);
    console.log(`[배치] 캐시 제외 후: ${keywordsToProcess.length}개 처리 대상`);

    // 처리할 키워드가 없으면 즉시 완료 (캐시된 결과 반환)
    if (keywordsToProcess.length === 0) {
      console.log('[배치] 모든 키워드가 캐시됨 - 즉시 반환');
      return NextResponse.json({
        success: true,
        jobId: 'cached_' + Date.now(),
        message: '모든 키워드가 캐시에 있어서 즉시 완료되었습니다.',
        cached: uniqueKeywords.length,
        processed: 0,
        results: cachedResults
      });
    }

    // 이미 처리 중인 작업이 있는지 확인
    if (await batchQueue.hasActiveJob()) {
      console.log('[배치] 이미 처리 중인 작업이 있어서 대기열에 추가');
      const currentJobId = await batchQueue.getCurrentJobId();
      return NextResponse.json({
        success: true,
        jobId: currentJobId,
        message: '이미 처리 중인 작업이 있습니다. 새 키워드는 다음에 처리됩니다.',
      });
    }

    // 새 배치 작업 생성
    const job = await batchQueue.createBatchJob(keywordsToProcess);

    // 비동기로 처리 시작 (응답 즉시 반환)
    processBatchJob(job.id, keywordsToProcess).catch(async (error) => {
      console.error('[배치] 작업 처리 중 에러:', error);
      await batchQueue.updateJobStatus(job.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : '알 수 없는 오류',
        completedAt: Date.now(),
      });
    });

    // 🆕 오래된 작업 정리
    await batchQueue.cleanupOldJobs();

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: '배치 작업이 시작되었습니다',
      total: keywords.length,
      unique: uniqueKeywords.length,
      cached: uniqueKeywords.length - keywordsToProcess.length,
      processing: keywordsToProcess.length
    });
  } catch (error) {
    console.error('[배치] API 에러:', error);
    return NextResponse.json(
      {
        success: false,
        error: '배치 작업 시작에 실패했습니다',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}

