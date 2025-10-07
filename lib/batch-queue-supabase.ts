/**
 * Supabase 기반 배치 작업 큐 관리
 * - 서버 재시작에도 안전
 * - 여러 서버 인스턴스 간 작업 공유 가능
 */

import { supabase, supabaseAdmin } from '@/lib/supabase/client';

export interface DocumentCounts {
  blog?: number;
  cafe?: number;
  news?: number;
  webkr?: number;
}

export interface KeywordResult {
  keyword: string;
  counts: DocumentCounts;
  blogTotalCount?: number;
  cafeTotalCount?: number;
  newsTotalCount?: number;
  webkrTotalCount?: number;
}

export interface BatchJob {
  id: string;
  keywords: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    current: number;
    total: number;
  };
  results: KeywordResult[];
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

/**
 * 새 배치 작업 생성
 */
export async function createBatchJob(keywords: string[]): Promise<BatchJob> {
  const id = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const { data, error } = await supabaseAdmin
    .from('batch_jobs')
    .insert({
      id,
      keywords,
      status: 'pending',
      progress_current: 0,
      progress_total: keywords.length,
      results: [],
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase 배치] 작업 생성 실패:', error);
    throw error;
  }

  console.log(`[Supabase 배치] 작업 생성: ${id}, 키워드 ${keywords.length}개`);

  return mapDbJobToBatchJob(data);
}

/**
 * 작업 상태 조회
 */
export async function getBatchJob(id: string): Promise<BatchJob | null> {
  const { data, error } = await supabase
    .from('batch_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('[Supabase 배치] 작업 조회 실패:', error);
    throw error;
  }

  return data ? mapDbJobToBatchJob(data) : null;
}

/**
 * 모든 작업 목록 조회 (최근 순)
 */
export async function getAllJobs(limit = 50): Promise<BatchJob[]> {
  const { data, error } = await supabase
    .from('batch_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Supabase 배치] 작업 목록 조회 실패:', error);
    throw error;
  }

  return (data || []).map(mapDbJobToBatchJob);
}

/**
 * 작업 상태 업데이트
 */
export async function updateJobStatus(
  id: string,
  updates: Partial<BatchJob>
): Promise<BatchJob | null> {
  const dbUpdates: any = {};

  if (updates.status) dbUpdates.status = updates.status;
  if (updates.progress) {
    dbUpdates.progress_current = updates.progress.current;
    dbUpdates.progress_total = updates.progress.total;
  }
  if (updates.results) dbUpdates.results = updates.results;
  if (updates.startedAt) dbUpdates.started_at = new Date(updates.startedAt).toISOString();
  if (updates.completedAt) dbUpdates.completed_at = new Date(updates.completedAt).toISOString();
  if (updates.error) dbUpdates.error = updates.error;

  const { data, error } = await supabaseAdmin
    .from('batch_jobs')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Supabase 배치] 작업 업데이트 실패:', error);
    throw error;
  }

  return data ? mapDbJobToBatchJob(data) : null;
}

/**
 * 작업 진행률 업데이트
 */
export async function updateJobProgress(id: string, current: number): Promise<BatchJob | null> {
  const { data, error } = await supabaseAdmin
    .from('batch_jobs')
    .update({ progress_current: current })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Supabase 배치] 진행률 업데이트 실패:', error);
    throw error;
  }

  return data ? mapDbJobToBatchJob(data) : null;
}

/**
 * 작업 결과 추가
 */
export async function addJobResult(
  id: string,
  keyword: string,
  counts: DocumentCounts
): Promise<BatchJob | null> {
  // 먼저 현재 작업 조회
  const job = await getBatchJob(id);
  if (!job) return null;

  // 결과 추가
  const newResult: KeywordResult = {
    keyword,
    counts,
    blogTotalCount: counts.blog,
    cafeTotalCount: counts.cafe,
    newsTotalCount: counts.news,
    webkrTotalCount: counts.webkr,
  };

  const updatedResults = [...job.results, newResult];

  const { data, error } = await supabaseAdmin
    .from('batch_jobs')
    .update({ results: updatedResults })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[Supabase 배치] 결과 추가 실패:', error);
    throw error;
  }

  return data ? mapDbJobToBatchJob(data) : null;
}

/**
 * 현재 처리 중인 작업 확인
 */
export async function hasActiveJob(): Promise<boolean> {
  const { data, error } = await supabase
    .from('batch_jobs')
    .select('id')
    .eq('status', 'processing')
    .limit(1);

  if (error) {
    console.error('[Supabase 배치] 활성 작업 확인 실패:', error);
    return false;
  }

  return (data || []).length > 0;
}

/**
 * 현재 처리 중인 작업 ID 조회
 */
export async function getCurrentJobId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('batch_jobs')
    .select('id')
    .eq('status', 'processing')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[Supabase 배치] 현재 작업 ID 조회 실패:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * 작업 삭제
 */
export async function deleteJob(id: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('batch_jobs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase 배치] 작업 삭제 실패:', error);
    return false;
  }

  return true;
}

/**
 * 오래된 작업 정리 (24시간 이상 지난 완료/실패 작업)
 */
export async function cleanupOldJobs(): Promise<number> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('batch_jobs')
    .delete()
    .in('status', ['completed', 'failed'])
    .lt('completed_at', twentyFourHoursAgo)
    .select('id');

  if (error) {
    console.error('[Supabase 배치] 작업 정리 실패:', error);
    return 0;
  }

  const count = (data || []).length;
  if (count > 0) {
    console.log(`[Supabase 배치] ${count}개 오래된 작업 삭제됨`);
  }

  return count;
}

/**
 * DB 레코드를 BatchJob 객체로 변환
 */
function mapDbJobToBatchJob(dbJob: any): BatchJob {
  return {
    id: dbJob.id,
    keywords: dbJob.keywords || [],
    status: dbJob.status,
    progress: {
      current: dbJob.progress_current || 0,
      total: dbJob.progress_total || 0,
    },
    results: dbJob.results || [],
    startedAt: dbJob.started_at ? new Date(dbJob.started_at).getTime() : undefined,
    completedAt: dbJob.completed_at ? new Date(dbJob.completed_at).getTime() : undefined,
    error: dbJob.error || undefined,
  };
}

/**
 * 처리 중 작업이 멈춘 경우 복구 (10분 이상 업데이트 없는 processing 작업)
 */
export async function recoverStalledJobs(): Promise<number> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('batch_jobs')
    .update({ status: 'failed', error: 'Job stalled (timeout)' })
    .eq('status', 'processing')
    .lt('updated_at', tenMinutesAgo)
    .select('id');

  if (error) {
    console.error('[Supabase 배치] 멈춘 작업 복구 실패:', error);
    return 0;
  }

  const count = (data || []).length;
  if (count > 0) {
    console.log(`[Supabase 배치] ${count}개 멈춘 작업 복구됨`);
  }

  return count;
}

