// 배치 작업 큐 관리 (서버 메모리 기반)

export interface DocumentCounts {
  blog?: number;
  cafe?: number;
  news?: number;
  webkr?: number;
}

export interface KeywordResult {
  keyword: string;
  counts: DocumentCounts;
  // 🆕 프론트엔드 호환 형식 추가
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
  results: KeywordResult[]; // 조회 결과 저장
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

// 작업 큐 (서버 메모리에 저장)
const jobs = new Map<string, BatchJob>();

// 현재 처리 중인 작업 ID
let currentJobId: string | null = null;

/**
 * 새 배치 작업 생성
 */
export function createBatchJob(keywords: string[]): BatchJob {
  const id = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const job: BatchJob = {
    id,
    keywords,
    status: 'pending',
    progress: {
      current: 0,
      total: keywords.length,
    },
    results: [],
  };
  
  jobs.set(id, job);
  console.log(`[배치] 작업 생성: ${id}, 키워드 ${keywords.length}개`);
  
  return job;
}

/**
 * 작업 상태 조회
 */
export function getBatchJob(id: string): BatchJob | null {
  return jobs.get(id) || null;
}

/**
 * 모든 작업 목록 조회
 */
export function getAllJobs(): BatchJob[] {
  return Array.from(jobs.values());
}

/**
 * 작업 상태 업데이트
 */
export function updateJobStatus(
  id: string,
  updates: Partial<BatchJob>
): BatchJob | null {
  const job = jobs.get(id);
  if (!job) return null;

  Object.assign(job, updates);
  jobs.set(id, job);
  return job;
}

/**
 * 작업 진행률 업데이트
 */
export function updateJobProgress(id: string, current: number): BatchJob | null {
  const job = jobs.get(id);
  if (!job) return null;

  job.progress.current = current;
  jobs.set(id, job);
  return job;
}

/**
 * 완료된 작업 정리 (10분 이상 지난 작업)
 */
export function cleanupOldJobs() {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000; // 🚀 5분 → 10분으로 변경 (작업 결과 보관 시간 증가)

  for (const [id, job] of jobs.entries()) {
    if (
      (job.status === 'completed' || job.status === 'failed') &&
      job.completedAt &&
      now - job.completedAt > tenMinutes
    ) {
      jobs.delete(id);
      console.log(`[배치] 작업 삭제: ${id} (완료 후 ${Math.round((now - job.completedAt) / 1000)}초 경과)`);
    }
  }
}

/**
 * 현재 처리 중인 작업 확인
 */
export function hasActiveJob(): boolean {
  return currentJobId !== null;
}

/**
 * 현재 작업 ID 설정
 */
export function setCurrentJob(id: string | null) {
  currentJobId = id;
}

/**
 * 현재 작업 ID 조회
 */
export function getCurrentJobId(): string | null {
  return currentJobId;
}

/**
 * 작업 삭제
 */
export function deleteJob(id: string): boolean {
  return jobs.delete(id);
}

/**
 * 작업 결과 추가
 */
export function addJobResult(
  id: string,
  keyword: string,
  counts: DocumentCounts
): BatchJob | null {
  const job = jobs.get(id);
  if (!job) return null;

  // 🆕 프론트엔드 호환 형식으로 저장
  job.results.push({
    keyword,
    counts,
    blogTotalCount: counts.blog,
    cafeTotalCount: counts.cafe,
    newsTotalCount: counts.news,
    webkrTotalCount: counts.webkr,
  });
  jobs.set(id, job);
  return job;
}

