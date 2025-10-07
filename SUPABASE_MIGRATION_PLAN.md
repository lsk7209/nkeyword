# 🚀 Supabase 마이그레이션 및 대용량 최적화 계획

## 📊 현재 상황 분석

### 현재 아키텍처 (LocalStorage)
- ❌ **용량 제한**: 5-10MB (약 1,000~5,000개 키워드)
- ❌ **성능 저하**: 데이터 증가 시 로딩/저장 느려짐
- ❌ **데이터 손실**: 브라우저 캐시 삭제 시 모두 삭제
- ❌ **공유 불가**: 디바이스 간 동기화 불가

### 목표 아키텍처 (Supabase)
- ✅ **무제한 용량**: 100만~1000만 개 키워드 저장
- ✅ **빠른 성능**: 인덱싱 및 쿼리 최적화
- ✅ **데이터 안전**: 클라우드 백업
- ✅ **실시간 동기화**: 여러 디바이스에서 접근

---

## 🗄️ 데이터베이스 스키마 설계

### 1. 키워드 테이블 (keywords)

```sql
CREATE TABLE keywords (
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
CREATE INDEX idx_keywords_used_as_seed ON keywords(used_as_seed) WHERE used_as_seed = FALSE;
CREATE INDEX idx_keywords_queried_at ON keywords(queried_at DESC);
CREATE INDEX idx_keywords_root_keyword ON keywords(root_keyword);

-- 복합 인덱스 (자주 사용하는 필터 조합)
CREATE INDEX idx_keywords_search_competition ON keywords(total_search DESC, competition);
CREATE INDEX idx_keywords_cafe_count ON keywords(cafe_total_count) WHERE cafe_total_count IS NOT NULL;

-- 파티셔닝 (1000만 개 이상 대비)
-- 월별 파티셔닝으로 쿼리 성능 향상
CREATE TABLE keywords_partitioned (
  LIKE keywords INCLUDING ALL
) PARTITION BY RANGE (queried_at);

-- 월별 파티션 생성 (예시)
CREATE TABLE keywords_2024_01 PARTITION OF keywords_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- 자동 파티션 생성 함수
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
  partition_date DATE := DATE_TRUNC('month', CURRENT_DATE);
  partition_name TEXT := 'keywords_' || TO_CHAR(partition_date, 'YYYY_MM');
  start_date DATE := partition_date;
  end_date DATE := partition_date + INTERVAL '1 month';
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF keywords_partitioned FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;
```

### 2. 사용자 테이블 (users) - 선택사항

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- 키워드에 user_id 추가
ALTER TABLE keywords ADD COLUMN user_id UUID REFERENCES users(id);
CREATE INDEX idx_keywords_user_id ON keywords(user_id);
```

### 3. 배치 작업 테이블 (batch_jobs)

```sql
CREATE TABLE batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  total_keywords INTEGER,
  processed_keywords INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE INDEX idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX idx_batch_jobs_user_id ON batch_jobs(user_id);
```

---

## 🚀 성능 최적화 전략

### 1. 인덱싱 전략

#### A. B-Tree 인덱스 (기본)
```sql
-- 자주 검색되는 컬럼
CREATE INDEX idx_keywords_keyword ON keywords(keyword);
CREATE INDEX idx_keywords_total_search ON keywords(total_search DESC);
```

#### B. 부분 인덱스 (Partial Index)
```sql
-- 조건부 인덱스로 크기 감소
CREATE INDEX idx_unused_seeds ON keywords(keyword) 
  WHERE used_as_seed = FALSE;

CREATE INDEX idx_with_doc_counts ON keywords(keyword)
  WHERE cafe_total_count IS NOT NULL;
```

#### C. 복합 인덱스
```sql
-- 자주 함께 사용되는 필터
CREATE INDEX idx_search_competition ON keywords(total_search DESC, competition);
```

### 2. 쿼리 최적화

#### A. 페이지네이션 (Cursor-based)
```sql
-- ❌ OFFSET 방식 (느림)
SELECT * FROM keywords 
ORDER BY id 
LIMIT 1000 OFFSET 100000;  -- 100,000개 스캔 필요

-- ✅ Cursor 방식 (빠름)
SELECT * FROM keywords 
WHERE id > 100000 
ORDER BY id 
LIMIT 1000;  -- 필요한 만큼만 스캔
```

#### B. 집계 쿼리 최적화
```sql
-- ❌ 느린 방식
SELECT COUNT(*) FROM keywords;  -- 전체 스캔

-- ✅ 빠른 방식 (통계 테이블 활용)
SELECT reltuples::bigint AS estimate 
FROM pg_class 
WHERE relname = 'keywords';
```

#### C. 필터링 최적화
```sql
-- 인덱스 활용
SELECT * FROM keywords 
WHERE total_search >= 1000 
  AND competition = '낮음'
  AND cafe_total_count < 10000
ORDER BY total_search DESC
LIMIT 1000;
```

### 3. 캐싱 전략

#### A. Supabase Edge Functions + Redis
```typescript
// Redis 캐싱 (선택사항)
const cacheKey = `keywords:filter:${filterHash}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await supabase.from('keywords').select('*');
await redis.setex(cacheKey, 300, JSON.stringify(data));  // 5분 캐시
```

#### B. 클라이언트 캐싱
```typescript
// React Query로 클라이언트 캐싱
const { data } = useQuery({
  queryKey: ['keywords', filters],
  queryFn: () => fetchKeywords(filters),
  staleTime: 5 * 60 * 1000,  // 5분
  cacheTime: 30 * 60 * 1000,  // 30분
});
```

### 4. 배치 처리 최적화

#### A. 대량 삽입 (Bulk Insert)
```typescript
// ❌ 개별 삽입 (느림)
for (const keyword of keywords) {
  await supabase.from('keywords').insert(keyword);
}

// ✅ 배치 삽입 (빠름)
await supabase.from('keywords').insert(keywords);  // 한 번에 1000개
```

#### B. UPSERT 활용
```typescript
// 중복 처리 + 업데이트
await supabase
  .from('keywords')
  .upsert(keywords, { 
    onConflict: 'keyword',
    ignoreDuplicates: false  // 업데이트
  });
```

---

## 📦 마이그레이션 단계

### Phase 1: Supabase 설정 (1일)

1. **Supabase 프로젝트 생성**
   ```bash
   # Supabase CLI 설치
   npm install -g supabase
   
   # 프로젝트 초기화
   supabase init
   
   # 로컬 개발 환경 시작
   supabase start
   ```

2. **환경 변수 설정**
   ```env
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
   SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
   ```

3. **데이터베이스 마이그레이션 실행**
   ```bash
   supabase migration new create_keywords_table
   # SQL 파일 편집
   supabase db push
   ```

### Phase 2: 데이터 레이어 구현 (2일)

1. **Supabase 클라이언트 설정**
   ```typescript
   // lib/supabase/client.ts
   import { createClient } from '@supabase/supabase-js';
   
   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   );
   
   // 서버 사이드용
   export const supabaseAdmin = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!
   );
   ```

2. **데이터 액세스 레이어**
   ```typescript
   // lib/supabase/keywords.ts
   export async function getKeywords(filters: FilterOptions) {
     let query = supabase
       .from('keywords')
       .select('*', { count: 'exact' });
     
     // 필터 적용
     if (filters.minSearch) {
       query = query.gte('total_search', filters.minSearch);
     }
     
     // 정렬
     query = query.order('total_search', { ascending: false });
     
     // 페이지네이션 (Cursor)
     if (filters.cursor) {
       query = query.gt('id', filters.cursor);
     }
     
     query = query.limit(1000);
     
     return query;
   }
   ```

### Phase 3: LocalStorage 마이그레이션 (1일)

1. **기존 데이터 내보내기**
   ```typescript
   // scripts/export-localstorage.ts
   const data = localStorage.getItem('nkeyword:dataset:v1');
   const keywords = JSON.parse(data);
   
   // JSON 파일로 저장
   fs.writeFileSync('keywords-backup.json', JSON.stringify(keywords));
   ```

2. **Supabase로 가져오기**
   ```typescript
   // scripts/import-to-supabase.ts
   const keywords = JSON.parse(fs.readFileSync('keywords-backup.json'));
   
   // 1000개씩 배치 삽입
   for (let i = 0; i < keywords.length; i += 1000) {
     const batch = keywords.slice(i, i + 1000);
     await supabase.from('keywords').upsert(batch);
   }
   ```

### Phase 4: API 라우트 수정 (2일)

1. **기존 storage.ts 대체**
   ```typescript
   // Before: lib/storage.ts (LocalStorage)
   export function loadDataset(): Dataset {
     return JSON.parse(localStorage.getItem('nkeyword:dataset:v1'));
   }
   
   // After: lib/supabase/keywords.ts (Supabase)
   export async function loadDataset(filters?: FilterOptions) {
     const { data } = await supabase
       .from('keywords')
       .select('*')
       .limit(1000);
     return data;
   }
   ```

2. **API 라우트 업데이트**
   ```typescript
   // app/api/keywords/list/route.ts
   export async function GET(request: NextRequest) {
     const { searchParams } = request.nextUrl;
     const cursor = searchParams.get('cursor');
     const limit = parseInt(searchParams.get('limit') || '1000');
     
     const { data, error } = await supabase
       .from('keywords')
       .select('*')
       .gt('id', cursor || 0)
       .order('id')
       .limit(limit);
     
     return NextResponse.json({ data, nextCursor: data[data.length - 1]?.id });
   }
   ```

### Phase 5: 프론트엔드 수정 (2일)

1. **React Query 도입**
   ```typescript
   // app/data/page.tsx
   const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
     queryKey: ['keywords', filters],
     queryFn: ({ pageParam = 0 }) => fetchKeywords({ cursor: pageParam, ...filters }),
     getNextPageParam: (lastPage) => lastPage.nextCursor,
   });
   ```

2. **무한 스크롤**
   ```typescript
   const { ref, inView } = useInView();
   
   useEffect(() => {
     if (inView && hasNextPage) {
       fetchNextPage();
     }
   }, [inView, hasNextPage]);
   ```

---

## 🎯 성능 벤치마크

### 예상 성능 (1000만 개 기준)

| 작업 | LocalStorage | Supabase (최적화) | 개선율 |
|------|--------------|-------------------|--------|
| **전체 로드** | 불가능 | 50ms | ∞ |
| **필터링** | 불가능 | 100ms | ∞ |
| **정렬** | 불가능 | 80ms | ∞ |
| **검색** | 불가능 | 30ms | ∞ |
| **삽입 (1000개)** | 5초 | 200ms | 25배 |
| **페이지 로딩** | 불가능 | 100ms | ∞ |

---

## 💰 비용 예측

### Supabase 무료 티어
- ✅ 500MB 데이터베이스
- ✅ 50,000 월간 활성 사용자
- ✅ 2GB 대역폭
- ✅ 500MB 파일 저장소

### 예상 데이터 크기
- 1개 키워드: ~500 bytes
- 100만 개: ~500MB ✅ (무료 티어 가능)
- 1000만 개: ~5GB ❌ (Pro 티어 필요: $25/월)

### Pro 티어 ($25/월)
- ✅ 8GB 데이터베이스
- ✅ 100,000 월간 활성 사용자
- ✅ 50GB 대역폭
- ✅ 100GB 파일 저장소

---

## 🔒 보안 고려사항

### Row Level Security (RLS)

```sql
-- 사용자별 데이터 격리
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;

-- 자신의 데이터만 조회
CREATE POLICY "Users can view own keywords"
  ON keywords FOR SELECT
  USING (auth.uid() = user_id);

-- 자신의 데이터만 삽입
CREATE POLICY "Users can insert own keywords"
  ON keywords FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

---

## 📋 체크리스트

### 마이그레이션 전
- [ ] Supabase 프로젝트 생성
- [ ] 데이터베이스 스키마 설계
- [ ] 인덱스 전략 수립
- [ ] 기존 데이터 백업

### 마이그레이션 중
- [ ] 데이터 마이그레이션 스크립트 작성
- [ ] API 라우트 수정
- [ ] 프론트엔드 수정
- [ ] 테스트 (성능, 기능)

### 마이그레이션 후
- [ ] 성능 모니터링
- [ ] 쿼리 최적화
- [ ] 백업 자동화
- [ ] 문서화

---

## 🚀 다음 단계

1. **즉시 시작 가능**
   - Supabase 프로젝트 생성
   - 데이터베이스 스키마 적용
   - 환경 변수 설정

2. **단계별 마이그레이션**
   - Phase 1-2: 백엔드 구축 (3일)
   - Phase 3-4: 데이터 마이그레이션 (3일)
   - Phase 5: 프론트엔드 수정 (2일)

3. **총 소요 시간**: 약 1-2주

---

**이 계획대로 진행하면 100만~1000만 개의 키워드도 빠르게 처리할 수 있습니다!** 🎉
