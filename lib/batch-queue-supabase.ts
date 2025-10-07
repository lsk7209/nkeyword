/**
 * Supabase 기반 배치 작업 큐 관리 (임시 비활성화)
 * - 서버 재시작에도 안전
 * - 여러 서버 인스턴스 간 작업 공유 가능
 */

// import { supabase, supabaseAdmin } from '@/lib/supabase/client';
import type { BatchJob, DocumentCounts, KeywordResult } from './batch-queue';

/**
 * 새 배치 작업 생성 (더미 함수)
 */
export async function createBatchJob(keywords: string[]): Promise<BatchJob> {
  const id = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('[Supabase 배치] 작업 생성 (더미):', id);
  
  return {
    id,
    keywords,
    status: 'pending',
    progress: { current: 0, total: keywords.length },
    results: [],
  };
}

/**
 * 작업 상태 조회 (더미 함수)
 */
export async function getBatchJob(id: string): Promise<BatchJob | null> {
  console.log('[Supabase 배치] 작업 조회 (더미):', id);
  return null;
}

/**
 * 작업 상태 업데이트 (더미 함수)
 */
export async function updateBatchJob(id: string, updates: Partial<BatchJob>): Promise<void> {
  console.log('[Supabase 배치] 작업 업데이트 (더미):', id, updates);
}

/**
 * 모든 활성 작업 조회 (더미 함수)
 */
export async function getAllActiveJobs(): Promise<BatchJob[]> {
  console.log('[Supabase 배치] 활성 작업 조회 (더미)');
  return [];
}

/**
 * 모든 작업 조회 (더미 함수)
 */
export async function getAllJobs(): Promise<BatchJob[]> {
  console.log('[Supabase 배치] 모든 작업 조회 (더미)');
  return [];
}

/**
 * 오래된 작업 정리 (더미 함수)
 */
export async function cleanupOldJobs(): Promise<void> {
  console.log('[Supabase 배치] 오래된 작업 정리 (더미)');
}

/**
 * 작업 상태 업데이트 (더미 함수)
 */
export async function updateJobStatus(id: string, updates: Partial<BatchJob>): Promise<BatchJob | null> {
  console.log('[Supabase 배치] 작업 상태 업데이트 (더미):', id, updates);
  return null;
}

/**
 * 작업 진행률 업데이트 (더미 함수)
 */
export async function updateJobProgress(id: string, current: number): Promise<BatchJob | null> {
  console.log('[Supabase 배치] 작업 진행률 업데이트 (더미):', id, current);
  return null;
}

/**
 * 작업 결과 추가 (더미 함수)
 */
export async function addJobResult(id: string, keyword: string, counts: DocumentCounts): Promise<BatchJob | null> {
  console.log('[Supabase 배치] 작업 결과 추가 (더미):', id, keyword, counts);
  return null;
}

/**
 * 활성 작업 확인 (더미 함수)
 */
export async function hasActiveJob(): Promise<boolean> {
  return false;
}

/**
 * 현재 작업 ID 조회 (더미 함수)
 */
export async function getCurrentJobId(): Promise<string | null> {
  return null;
}

/**
 * 작업 삭제 (더미 함수)
 */
export async function deleteJob(id: string): Promise<boolean> {
  console.log('[Supabase 배치] 작업 삭제 (더미):', id);
  return true;
}

/**
 * Supabase 배치 큐 클래스 (더미)
 */
export class SupabaseBatchQueue {
  async createJob(keywords: string[]): Promise<BatchJob> {
    return createBatchJob(keywords);
  }

  async getJob(id: string): Promise<BatchJob | null> {
    return getBatchJob(id);
  }

  async updateJob(id: string, updates: Partial<BatchJob>): Promise<void> {
    return updateBatchJob(id, updates);
  }

  async getAllJobs(): Promise<BatchJob[]> {
    return getAllActiveJobs();
  }

  async hasActiveJob(): Promise<boolean> {
    return false;
  }

  async cleanup(): Promise<void> {
    return cleanupOldJobs();
  }
}