-- 배치 작업 테이블 (영구 큐)
CREATE TABLE IF NOT EXISTS batch_jobs (
  id TEXT PRIMARY KEY,
  keywords TEXT[] NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress_current INTEGER DEFAULT 0,
  progress_total INTEGER NOT NULL,
  results JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_created_at ON batch_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_updated_at ON batch_jobs(updated_at DESC);

-- 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_batch_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER batch_jobs_updated_at
BEFORE UPDATE ON batch_jobs
FOR EACH ROW
EXECUTE FUNCTION update_batch_jobs_updated_at();

-- 오래된 완료/실패 작업 자동 삭제 (24시간 후)
CREATE OR REPLACE FUNCTION cleanup_old_batch_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM batch_jobs
  WHERE status IN ('completed', 'failed')
    AND completed_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- 주석 추가
COMMENT ON TABLE batch_jobs IS '문서수 수집 배치 작업 큐';
COMMENT ON COLUMN batch_jobs.id IS '작업 고유 ID (batch_TIMESTAMP_RANDOM)';
COMMENT ON COLUMN batch_jobs.keywords IS '처리할 키워드 목록';
COMMENT ON COLUMN batch_jobs.status IS '작업 상태: pending, processing, completed, failed';
COMMENT ON COLUMN batch_jobs.progress_current IS '현재 처리된 키워드 수';
COMMENT ON COLUMN batch_jobs.progress_total IS '전체 키워드 수';
COMMENT ON COLUMN batch_jobs.results IS '수집된 문서수 결과 (JSONB 배열)';

