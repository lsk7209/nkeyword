-- 트렌드 키워드 데이터베이스 스키마
-- PostgreSQL 기준

-- 1. 트렌드 키워드 메인 테이블
CREATE TABLE IF NOT EXISTS trending_keywords (
    id BIGSERIAL PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL,
    rank INTEGER NOT NULL,
    search_volume BIGINT DEFAULT 0,
    change_rate VARCHAR(20),
    is_new BOOLEAN DEFAULT FALSE,
    category VARCHAR(50) DEFAULT 'all',
    collected_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_keyword ON trending_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_collected_at ON trending_keywords(collected_at);
CREATE INDEX IF NOT EXISTS idx_rank_collected ON trending_keywords(rank, collected_at);
CREATE INDEX IF NOT EXISTS idx_category ON trending_keywords(category);

-- 2. 키워드 이력 테이블
CREATE TABLE IF NOT EXISTS keyword_history (
    id BIGSERIAL PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL,
    rank INTEGER,
    search_volume BIGINT,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_keyword_recorded ON keyword_history(keyword, recorded_at);

-- 3. 일별 통계 테이블
CREATE TABLE IF NOT EXISTS daily_stats (
    id SERIAL PRIMARY KEY,
    stats_date DATE NOT NULL UNIQUE,
    total_keywords INTEGER DEFAULT 0,
    new_keywords INTEGER DEFAULT 0,
    avg_search_volume BIGINT DEFAULT 0,
    top_keyword VARCHAR(255),
    category_distribution JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_stats_date ON daily_stats(stats_date);

-- 4. 수집 로그 테이블
CREATE TABLE IF NOT EXISTS collection_logs (
    id SERIAL PRIMARY KEY,
    status VARCHAR(20) NOT NULL,  -- success, failed
    keywords_count INTEGER,
    error_message TEXT,
    duration_ms INTEGER,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_log_collected_at ON collection_logs(collected_at);
CREATE INDEX IF NOT EXISTS idx_log_status ON collection_logs(status);

-- 5. API 요청 로그 테이블 (선택사항, 모니터링용)
CREATE TABLE IF NOT EXISTS api_request_logs (
    id BIGSERIAL PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    duration_ms INTEGER,
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_api_endpoint ON api_request_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_created_at ON api_request_logs(created_at);

-- 데이터 정리용 함수 (30일 이상 된 이력 데이터 삭제)
CREATE OR REPLACE FUNCTION cleanup_old_history()
RETURNS void AS $$
BEGIN
    DELETE FROM keyword_history
    WHERE recorded_at < NOW() - INTERVAL '30 days';
    
    DELETE FROM api_request_logs
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- 통계 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_daily_stats(target_date DATE)
RETURNS void AS $$
BEGIN
    INSERT INTO daily_stats (
        stats_date,
        total_keywords,
        new_keywords,
        avg_search_volume,
        top_keyword,
        category_distribution
    )
    SELECT
        target_date,
        COUNT(DISTINCT keyword),
        COUNT(DISTINCT CASE WHEN is_new = true THEN keyword END),
        COALESCE(AVG(search_volume), 0)::BIGINT,
        (
            SELECT keyword
            FROM trending_keywords
            WHERE DATE(collected_at) = target_date
            GROUP BY keyword
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ),
        (
            SELECT jsonb_object_agg(category, cnt)
            FROM (
                SELECT category, COUNT(*) as cnt
                FROM trending_keywords
                WHERE DATE(collected_at) = target_date
                GROUP BY category
            ) cat_counts
        )
    FROM trending_keywords
    WHERE DATE(collected_at) = target_date
    ON CONFLICT (stats_date) 
    DO UPDATE SET
        total_keywords = EXCLUDED.total_keywords,
        new_keywords = EXCLUDED.new_keywords,
        avg_search_volume = EXCLUDED.avg_search_volume,
        top_keyword = EXCLUDED.top_keyword,
        category_distribution = EXCLUDED.category_distribution;
END;
$$ LANGUAGE plpgsql;

