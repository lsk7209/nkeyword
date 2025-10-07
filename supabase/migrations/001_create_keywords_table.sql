-- 키워드 테이블 생성
CREATE TABLE IF NOT EXISTS keywords (
  -- 기본 정보
  id BIGSERIAL PRIMARY KEY,
  keyword VARCHAR(100) NOT NULL,
  root_keyword VARCHAR(100),
  
  -- 검색량 데이터
  monthly_pc_search INTEGER DEFAULT 0,
  monthly_mobile_search INTEGER DEFAULT 0,
  total_search INTEGER GENERATED ALWAYS AS (monthly_pc_search + monthly_mobile_search) STORED,
  
  -- 경쟁도
  competition VARCHAR(20),
  
  -- 문서수
  blog_total_count INTEGER,
  cafe_total_count INTEGER,
  news_total_count INTEGER,
  webkr_total_count INTEGER,
  
  -- 클릭 데이터
  monthly_pc_clicks INTEGER,
  monthly_mobile_clicks INTEGER,
  monthly_pc_click_rate DECIMAL(5,2),
  monthly_mobile_click_rate DECIMAL(5,2),
  monthly_ad_count INTEGER,
  
  -- 자동 수집 관련
  used_as_seed BOOLEAN DEFAULT FALSE,
  seed_depth INTEGER DEFAULT 0,
  
  -- 사용자 (선택사항)
  user_id UUID,
  
  -- 메타데이터
  queried_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 유니크 제약 (중복 방지)
  CONSTRAINT unique_keyword UNIQUE(keyword)
);

-- 성능 최적화 인덱스
CREATE INDEX idx_keywords_keyword ON keywords(keyword);
CREATE INDEX idx_keywords_total_search ON keywords(total_search DESC);
CREATE INDEX idx_keywords_competition ON keywords(competition);
CREATE INDEX idx_keywords_queried_at ON keywords(queried_at DESC);
CREATE INDEX idx_keywords_root_keyword ON keywords(root_keyword);
CREATE INDEX idx_keywords_user_id ON keywords(user_id);

-- 부분 인덱스 (조건부 인덱스로 크기 감소)
CREATE INDEX idx_keywords_unused_seeds ON keywords(keyword) 
  WHERE used_as_seed = FALSE;

CREATE INDEX idx_keywords_with_cafe_count ON keywords(cafe_total_count) 
  WHERE cafe_total_count IS NOT NULL;

-- 복합 인덱스 (자주 사용하는 필터 조합)
CREATE INDEX idx_keywords_search_competition ON keywords(total_search DESC, competition);

-- 자동 updated_at 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_keywords_updated_at
  BEFORE UPDATE ON keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 통계 테이블 (빠른 집계 쿼리용)
CREATE TABLE IF NOT EXISTS keyword_stats (
  id SERIAL PRIMARY KEY,
  total_keywords BIGINT,
  total_with_doc_counts BIGINT,
  avg_total_search DECIMAL(10,2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 통계 업데이트 함수
CREATE OR REPLACE FUNCTION update_keyword_stats()
RETURNS void AS $$
BEGIN
  INSERT INTO keyword_stats (total_keywords, total_with_doc_counts, avg_total_search)
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE cafe_total_count IS NOT NULL),
    AVG(total_search)
  FROM keywords;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) 활성화
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자가 조회 가능 (인증 필요 시 수정)
CREATE POLICY "Anyone can view keywords"
  ON keywords FOR SELECT
  USING (true);

-- 정책: 인증된 사용자만 삽입 가능
CREATE POLICY "Authenticated users can insert keywords"
  ON keywords FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 정책: 자신의 키워드만 업데이트 가능 (user_id 사용 시)
CREATE POLICY "Users can update own keywords"
  ON keywords FOR UPDATE
  USING (user_id IS NULL OR user_id = auth.uid());

-- 정책: 자신의 키워드만 삭제 가능 (user_id 사용 시)
CREATE POLICY "Users can delete own keywords"
  ON keywords FOR DELETE
  USING (user_id IS NULL OR user_id = auth.uid());

-- 배치 작업 테이블
CREATE TABLE IF NOT EXISTS batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  status VARCHAR(20) DEFAULT 'pending',
  total_keywords INTEGER,
  processed_keywords INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX idx_batch_jobs_user_id ON batch_jobs(user_id);
CREATE INDEX idx_batch_jobs_created_at ON batch_jobs(created_at DESC);

-- 배치 작업 RLS
ALTER TABLE batch_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own batch jobs"
  ON batch_jobs FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Authenticated users can create batch jobs"
  ON batch_jobs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 성능 모니터링용 뷰
CREATE OR REPLACE VIEW keyword_performance_stats AS
SELECT 
  COUNT(*) as total_keywords,
  COUNT(*) FILTER (WHERE cafe_total_count IS NOT NULL) as with_doc_counts,
  AVG(total_search) as avg_search_volume,
  MAX(total_search) as max_search_volume,
  MIN(total_search) as min_search_volume,
  COUNT(DISTINCT root_keyword) as unique_root_keywords,
  COUNT(*) FILTER (WHERE used_as_seed = TRUE) as used_as_seeds,
  COUNT(*) FILTER (WHERE seed_depth > 0) as auto_collected
FROM keywords;

-- 인기 키워드 뷰 (캐싱용)
CREATE MATERIALIZED VIEW top_keywords AS
SELECT 
  keyword,
  total_search,
  competition,
  cafe_total_count,
  queried_at
FROM keywords
ORDER BY total_search DESC
LIMIT 1000;

CREATE INDEX idx_top_keywords_total_search ON top_keywords(total_search DESC);

-- Materialized View 자동 갱신 함수
CREATE OR REPLACE FUNCTION refresh_top_keywords()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY top_keywords;
END;
$$ LANGUAGE plpgsql;

-- 주석 추가
COMMENT ON TABLE keywords IS '네이버 연관검색어 데이터';
COMMENT ON COLUMN keywords.keyword IS '키워드 (유니크)';
COMMENT ON COLUMN keywords.total_search IS '총 검색량 (PC + 모바일, 자동 계산)';
COMMENT ON COLUMN keywords.used_as_seed IS '자동 수집 시드로 사용됨';
COMMENT ON COLUMN keywords.seed_depth IS '시드 깊이 (0: 원본, 1: 1차, 2: 2차...)';

COMMENT ON TABLE batch_jobs IS '배치 작업 추적';
COMMENT ON TABLE keyword_stats IS '키워드 통계 (빠른 집계용)';
COMMENT ON VIEW keyword_performance_stats IS '실시간 성능 통계';
COMMENT ON MATERIALIZED VIEW top_keywords IS '상위 1000개 인기 키워드 (캐시)';
