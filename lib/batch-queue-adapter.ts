/**
 * 배치 큐 어댑터
 * - 메모리 기반과 Supabase 기반을 환경변수로 전환
 */

import type { BatchJob, DocumentCounts, KeywordResult } from './batch-queue';

// 메모리 기반 큐 (기존 방식)
import * as MemoryQueue from './batch-queue';

// Supabase 기반 큐 (새 방식)
import * as SupabaseQueue from './batch-queue-supabase';

export type QueueMode = 'memory' | 'supabase';

/**
 * 현재 큐 모드 확인
 */
export function getQueueMode(): QueueMode {
  // Supabase 설정이 없으면 강제로 memory 모드 사용
  const { isSupabaseConfigured } = require('./supabase/client');
  
  if (!isSupabaseConfigured) {
    return 'memory';
  }
  
  const mode = process.env.NEXT_PUBLIC_QUEUE_MODE || 'memory';
  return mode as QueueMode;
}

/**
 * 배치 큐 인터페이스
 */
export interface BatchQueueAdapter {
  createBatchJob(keywords: string[]): Promise<BatchJob>;
  getBatchJob(id: string): Promise<BatchJob | null>;
  getAllJobs(): Promise<BatchJob[]>;
  updateJobStatus(id: string, updates: Partial<BatchJob>): Promise<BatchJob | null>;
  updateJobProgress(id: string, current: number): Promise<BatchJob | null>;
  addJobResult(id: string, keyword: string, counts: DocumentCounts): Promise<BatchJob | null>;
  hasActiveJob(): Promise<boolean>;
  getCurrentJobId(): Promise<string | null>;
  deleteJob(id: string): Promise<boolean>;
  cleanupOldJobs(): Promise<void>;
}

/**
 * 메모리 기반 어댑터
 */
class MemoryQueueAdapter implements BatchQueueAdapter {
  async createBatchJob(keywords: string[]): Promise<BatchJob> {
    return MemoryQueue.createBatchJob(keywords);
  }

  async getBatchJob(id: string): Promise<BatchJob | null> {
    return MemoryQueue.getBatchJob(id);
  }

  async getAllJobs(): Promise<BatchJob[]> {
    return MemoryQueue.getAllJobs();
  }

  async updateJobStatus(id: string, updates: Partial<BatchJob>): Promise<BatchJob | null> {
    return MemoryQueue.updateJobStatus(id, updates);
  }

  async updateJobProgress(id: string, current: number): Promise<BatchJob | null> {
    return MemoryQueue.updateJobProgress(id, current);
  }

  async addJobResult(id: string, keyword: string, counts: DocumentCounts): Promise<BatchJob | null> {
    return MemoryQueue.addJobResult(id, keyword, counts);
  }

  async hasActiveJob(): Promise<boolean> {
    return MemoryQueue.hasActiveJob();
  }

  async getCurrentJobId(): Promise<string | null> {
    return MemoryQueue.getCurrentJobId();
  }

  async deleteJob(id: string): Promise<boolean> {
    return MemoryQueue.deleteJob(id);
  }

  async cleanupOldJobs(): Promise<void> {
    MemoryQueue.cleanupOldJobs();
  }
}

/**
 * Supabase 기반 어댑터
 */
class SupabaseQueueAdapter implements BatchQueueAdapter {
  async createBatchJob(keywords: string[]): Promise<BatchJob> {
    return await SupabaseQueue.createBatchJob(keywords);
  }

  async getBatchJob(id: string): Promise<BatchJob | null> {
    return await SupabaseQueue.getBatchJob(id);
  }

  async getAllJobs(): Promise<BatchJob[]> {
    return await SupabaseQueue.getAllJobs();
  }

  async updateJobStatus(id: string, updates: Partial<BatchJob>): Promise<BatchJob | null> {
    return await SupabaseQueue.updateJobStatus(id, updates);
  }

  async updateJobProgress(id: string, current: number): Promise<BatchJob | null> {
    return await SupabaseQueue.updateJobProgress(id, current);
  }

  async addJobResult(id: string, keyword: string, counts: DocumentCounts): Promise<BatchJob | null> {
    return await SupabaseQueue.addJobResult(id, keyword, counts);
  }

  async hasActiveJob(): Promise<boolean> {
    return await SupabaseQueue.hasActiveJob();
  }

  async getCurrentJobId(): Promise<string | null> {
    return await SupabaseQueue.getCurrentJobId();
  }

  async deleteJob(id: string): Promise<boolean> {
    return await SupabaseQueue.deleteJob(id);
  }

  async cleanupOldJobs(): Promise<void> {
    await SupabaseQueue.cleanupOldJobs();
  }
}

/**
 * 큐 팩토리 (싱글톤 패턴)
 */
let queueInstance: BatchQueueAdapter | null = null;

export function getBatchQueue(): BatchQueueAdapter {
  if (queueInstance) return queueInstance;

  const mode = getQueueMode();

  if (mode === 'supabase') {
    try {
      const { isSupabaseConfigured } = require('./supabase/client');
      
      if (!isSupabaseConfigured) {
        console.warn('[배치 큐] ⚠️ Supabase 설정 없음 - 메모리 모드로 폴백');
        queueInstance = new MemoryQueueAdapter();
        console.log('[배치 큐] 메모리 모드 활성화 (폴백)');
      } else {
        queueInstance = new SupabaseQueueAdapter();
        console.log('[배치 큐] Supabase 모드 활성화');
      }
    } catch (error) {
      console.warn('[배치 큐] ⚠️ Supabase 초기화 실패 - 메모리 모드로 폴백', error);
      queueInstance = new MemoryQueueAdapter();
      console.log('[배치 큐] 메모리 모드 활성화 (폴백)');
    }
  } else {
    queueInstance = new MemoryQueueAdapter();
    console.log('[배치 큐] 메모리 모드 활성화');
  }

  return queueInstance;
}

// 큐 모드 전환
export function resetQueueInstance() {
  queueInstance = null;
}

// Export types
export type { BatchJob, DocumentCounts, KeywordResult };

