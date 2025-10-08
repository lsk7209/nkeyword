/**
 * 🆕 문서수 자동 수집 API
 * - 크론 작업에서 호출
 * - LocalStorage 키워드들의 문서수 자동 수집
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

// 크론 비밀키 검증
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'development';
  
  if (!authHeader) {
    return false;
  }
  
  const token = authHeader.replace('Bearer ', '');
  return token === cronSecret;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 🔐 인증 확인
    if (!verifyCronSecret(request)) {
      logger.warn('[AUTO-COLLECT] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    logger.info('[AUTO-COLLECT] Starting auto document count collection...');
    
    // ⚠️ 중요: 서버 사이드에서는 localStorage 접근 불가
    // 따라서 이 API는 실제로는 클라이언트에서 호출되거나,
    // Supabase/DB를 사용할 때만 작동합니다.
    
    // 🔄 두 가지 시나리오:
    
    // 1. localStorage 모드 (현재 기본값)
    // - 클라이언트에서 백그라운드 자동수집 기능 사용
    // - 크론 작업은 Vercel Serverless Function에서 실행 불가
    // - 대안: GitHub Actions, 외부 크론 서비스 사용
    
    // 2. Supabase 모드 (대용량 데이터용)
    const storageMode = process.env.NEXT_PUBLIC_STORAGE_MODE || 'localStorage';
    
    if (storageMode === 'localStorage') {
      // localStorage 모드에서는 서버 사이드 크론 불가능
      logger.warn('[AUTO-COLLECT] LocalStorage mode detected - server-side collection not supported');
      logger.info('[AUTO-COLLECT] Use client-side background auto-collection instead');
      
      return NextResponse.json({
        status: 'skipped',
        message: 'LocalStorage mode - use client-side background collection',
        data: {
          collected: 0,
          failed: 0,
          duration: Date.now() - startTime,
          mode: 'localStorage',
          recommendation: 'Enable "백그라운드 수집 ON" in the data page',
        },
      });
    }
    
    // Supabase 모드인 경우
    logger.info('[AUTO-COLLECT] Supabase mode detected - starting collection...');
    
    const { supabase } = await import('@/lib/supabase/client');
    
    if (!supabase) {
      logger.error('[AUTO-COLLECT] Supabase 클라이언트가 null입니다.');
      return NextResponse.json({ 
        success: false, 
        error: 'Supabase 클라이언트가 설정되지 않았습니다.' 
      }, { status: 500 });
    }
    
    // 1. 문서수가 없는 키워드 조회
    const { data: keywords, error: fetchError } = await supabase
      .from('keywords')
      .select('keyword')
      .is('cafe_total_count', null)
      .limit(100); // 한 번에 최대 100개
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!keywords || keywords.length === 0) {
      logger.info('[AUTO-COLLECT] No keywords to collect');
      return NextResponse.json({
        status: 'success',
        message: 'No keywords need document count collection',
        data: {
          collected: 0,
          failed: 0,
          duration: Date.now() - startTime,
        },
      });
    }
    
    logger.info(`[AUTO-COLLECT] Found ${keywords.length} keywords without document counts`);
    
    // 2. 배치 작업 생성
    const batchJobId = `auto-${Date.now()}`;
    const keywordList = keywords.map((k: any) => k.keyword);
    
    // 3. 배치 API 호출
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const batchResponse = await fetch(`${baseUrl}/api/documents/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords: keywordList,
        jobId: batchJobId,
      }),
    });
    
    if (!batchResponse.ok) {
      throw new Error(`Batch API failed: ${batchResponse.status}`);
    }
    
    const batchResult = await batchResponse.json();
    
    const duration = Date.now() - startTime;
    
    logger.info('[AUTO-COLLECT] Collection completed', {
      jobId: batchJobId,
      keywords: keywordList.length,
      duration,
    });
    
    return NextResponse.json({
      status: 'success',
      message: 'Document count collection started',
      data: {
        jobId: batchJobId,
        collected: keywordList.length,
        failed: 0,
        duration,
        mode: 'supabase',
      },
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[AUTO-COLLECT] Collection failed', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: {
          collected: 0,
          failed: 1,
          duration,
        },
      },
      { status: 500 }
    );
  }
}

// GET 요청: 자동 수집 상태 확인
export async function GET(request: NextRequest) {
  try {
    // 🔐 인증 확인
    if (!verifyCronSecret(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const storageMode = process.env.NEXT_PUBLIC_STORAGE_MODE || 'localStorage';
    
    if (storageMode === 'localStorage') {
      return NextResponse.json({
        status: 'info',
        mode: 'localStorage',
        message: 'Server-side auto-collection not supported in LocalStorage mode',
        recommendation: 'Use client-side "백그라운드 수집 ON" feature',
      });
    }
    
    // Supabase 모드인 경우 통계 조회
    const { supabase } = await import('@/lib/supabase/client');
    
    if (!supabase) {
      logger.error('[AUTO-COLLECT] Supabase 클라이언트가 null입니다.');
      return NextResponse.json({ 
        success: false, 
        error: 'Supabase 클라이언트가 설정되지 않았습니다.' 
      }, { status: 500 });
    }
    
    const { count: totalKeywords } = await supabase
      .from('keywords')
      .select('*', { count: 'exact', head: true });
    
    const { count: withoutDocs } = await supabase
      .from('keywords')
      .select('*', { count: 'exact', head: true })
      .is('cafe_total_count', null);
    
    return NextResponse.json({
      status: 'success',
      mode: 'supabase',
      data: {
        totalKeywords: totalKeywords || 0,
        withoutDocCounts: withoutDocs || 0,
        collectionProgress: totalKeywords ? ((totalKeywords - (withoutDocs || 0)) / totalKeywords * 100).toFixed(1) + '%' : '0%',
      },
    });
    
  } catch (error) {
    logger.error('[AUTO-COLLECT] Status check failed', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

