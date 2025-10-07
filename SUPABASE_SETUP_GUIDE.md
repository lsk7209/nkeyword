# 🚀 Supabase 설정 가이드

## 1️⃣ Supabase 프로젝트 생성

### 1. Supabase 계정 생성
1. https://supabase.com 접속
2. "Start your project" 클릭
3. GitHub 계정으로 로그인

### 2. 새 프로젝트 생성
1. "New Project" 클릭
2. 프로젝트 정보 입력:
   - **Name**: `naver-keyword-tool`
   - **Database Password**: 강력한 비밀번호 생성 (저장 필수!)
   - **Region**: `Northeast Asia (Seoul)` 선택
   - **Pricing Plan**: Free (시작용) 또는 Pro ($25/월, 1000만 개 대응)
3. "Create new project" 클릭

### 3. API 키 확인
1. 프로젝트 대시보드 → Settings → API
2. 다음 정보 복사:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: `eyJxxx...`
   - **service_role key**: `eyJxxx...` (⚠️ 비밀 유지!)

---

## 2️⃣ 환경 변수 설정

### `.env.local` 파일 생성

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 기존 네이버 API 키들 (유지)
NAVER_API_KEY_1=your_key_1
# ... 나머지 키들
```

---

## 3️⃣ 데이터베이스 마이그레이션 실행

### 방법 1: Supabase 대시보드 (추천)

1. Supabase 대시보드 → SQL Editor
2. "New Query" 클릭
3. `supabase/migrations/001_create_keywords_table.sql` 파일 내용 복사
4. 붙여넣기 후 "Run" 클릭
5. ✅ "Success" 메시지 확인

### 방법 2: Supabase CLI

```bash
# Supabase CLI 설치
npm install -g supabase

# 프로젝트 초기화
supabase init

# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref your-project-ref

# 마이그레이션 실행
supabase db push
```

---

## 4️⃣ 패키지 설치

```bash
# Supabase 클라이언트 설치
npm install @supabase/supabase-js

# React Query (선택사항, 캐싱용)
npm install @tanstack/react-query

# TypeScript 타입 생성 (선택사항)
npx supabase gen types typescript --project-id your-project-ref > lib/supabase/types.ts
```

---

## 5️⃣ 데이터 마이그레이션

### Step 1: LocalStorage 데이터 내보내기

브라우저 콘솔에서 실행:

```javascript
// 데이터 내보내기
const data = localStorage.getItem('nkeyword:dataset:v1');
const keywords = JSON.parse(data);

// JSON 파일로 다운로드
const blob = new Blob([JSON.stringify(keywords, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'keywords-backup.json';
a.click();

console.log(`✅ ${keywords.length}개 키워드 내보내기 완료!`);
```

### Step 2: Supabase로 가져오기

```bash
# 마이그레이션 스크립트 실행
npm run migrate:import keywords-backup.json
```

또는 수동으로:

```typescript
// scripts/import.ts
import { batchInsertKeywords } from './lib/supabase/keywords';
import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('keywords-backup.json', 'utf-8'));
await batchInsertKeywords(data);
```

---

## 6️⃣ 연결 테스트

```bash
# 개발 서버 시작
npm run dev

# 브라우저 콘솔에서 확인
# Network 탭에서 Supabase API 호출 확인
```

---

## 7️⃣ 성능 최적화 설정

### 1. Connection Pooling 설정

Supabase 대시보드 → Settings → Database:
- **Connection Pooling**: Enabled
- **Pool Mode**: Transaction
- **Pool Size**: 15

### 2. 인덱스 확인

SQL Editor에서 실행:

```sql
-- 인덱스 목록 확인
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'keywords';
```

### 3. 통계 업데이트

```sql
-- 통계 업데이트 (쿼리 최적화)
ANALYZE keywords;

-- Materialized View 갱신
REFRESH MATERIALIZED VIEW CONCURRENTLY top_keywords;
```

---

## 8️⃣ 모니터링 설정

### 1. 쿼리 성능 모니터링

Supabase 대시보드 → Reports:
- API Requests
- Database Size
- Query Performance

### 2. 느린 쿼리 찾기

```sql
-- 느린 쿼리 확인
SELECT
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
WHERE query LIKE '%keywords%'
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 9️⃣ 백업 설정

### 자동 백업 (Pro 플랜)

Supabase 대시보드 → Settings → Backups:
- **Daily Backups**: Enabled
- **Retention**: 7 days

### 수동 백업

```bash
# CSV 내보내기
supabase db dump --data-only > backup.sql

# 또는 Supabase 대시보드에서 CSV Export
```

---

## 🔟 Vercel 배포 설정

### 1. 환경 변수 추가

Vercel 대시보드 → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

### 2. 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

---

## ✅ 체크리스트

### 설정 완료 확인
- [ ] Supabase 프로젝트 생성
- [ ] 환경 변수 설정 (.env.local)
- [ ] 데이터베이스 마이그레이션 실행
- [ ] 패키지 설치 (@supabase/supabase-js)
- [ ] LocalStorage 데이터 내보내기
- [ ] Supabase로 데이터 가져오기
- [ ] 연결 테스트 (브라우저 콘솔)
- [ ] 인덱스 확인
- [ ] 성능 테스트
- [ ] Vercel 환경 변수 설정
- [ ] 프로덕션 배포

### 성능 최적화 확인
- [ ] Connection Pooling 활성화
- [ ] 인덱스 생성 확인
- [ ] Materialized View 생성
- [ ] 쿼리 성능 모니터링
- [ ] 백업 설정

---

## 🆘 문제 해결

### 1. 연결 오류

```
Error: Invalid API key
```

**해결**: 환경 변수 확인, `.env.local` 파일 재시작

### 2. RLS 정책 오류

```
Error: Row level security policy violation
```

**해결**: SQL Editor에서 RLS 정책 확인 및 수정

### 3. 느린 쿼리

```
Query takes > 1 second
```

**해결**: 
- 인덱스 추가
- EXPLAIN ANALYZE로 쿼리 분석
- Materialized View 활용

---

## 📚 추가 리소스

- [Supabase 공식 문서](https://supabase.com/docs)
- [PostgreSQL 성능 최적화](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Next.js + Supabase 가이드](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

---

**설정 완료 후 100만~1000만 개의 키워드를 빠르게 처리할 수 있습니다!** 🎉
