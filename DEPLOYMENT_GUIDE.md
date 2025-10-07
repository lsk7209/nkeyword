# 🚀 트렌드 키워드 API 배포 가이드

## 📋 배포 전 체크리스트

### 1. 환경 설정
- [ ] PostgreSQL 설치 및 실행
- [ ] 데이터베이스 생성 (`trending_db`)
- [ ] 환경변수 파일 설정 (`.env.local`)
- [ ] SerpApi 키 발급 및 설정
- [ ] CRON_SECRET 생성

### 2. 데이터베이스 초기화
```bash
# 데이터베이스 생성
createdb trending_db

# 스키마 초기화
psql -d trending_db -f config/database.sql

# 또는 npm 스크립트 사용
npm run db:init

# 연결 확인
npm run db:check
```

### 3. 환경변수 설정

`.env.local` 파일 생성:

```env
# 데이터베이스
DATABASE_URL="postgresql://user:password@localhost:5432/trending_db"

# API 키
SERPAPI_KEY="your_serpapi_key"
CRON_SECRET="your_random_secret"

# 로깅
LOG_LEVEL="info"
```

### 4. 의존성 설치 및 빌드

```bash
# 패키지 설치
npm install

# 빌드
npm run build

# 프로덕션 실행
npm start
```

## 🧪 테스트

### 수동 수집 테스트

```bash
# 환경변수 로드 후 수동 수집
node scripts/manual-collect.js
```

### API 엔드포인트 테스트

```bash
# 테스트 스크립트 실행
node scripts/test-trending.js
```

### 개별 엔드포인트 테스트

```bash
# 1. 키워드 목록
curl "http://localhost:3000/api/trending/keywords?limit=5"

# 2. 통계
curl "http://localhost:3000/api/trending/stats"

# 3. 검색
curl "http://localhost:3000/api/trending/search?q=게임"

# 4. 수집 트리거
curl -X POST "http://localhost:3000/api/trending/collect" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

## 🕐 스케줄러 설정

### Option 1: Next.js 서버에 통합

`app/layout.tsx`에 추가:

```typescript
import { startScheduler } from '@/lib/scheduler';

if (process.env.NODE_ENV === 'production') {
  startScheduler();
}
```

### Option 2: PM2 사용 (권장)

```bash
# PM2 설치
npm install -g pm2

# 애플리케이션 시작
pm2 start npm --name "nkeyword-api" -- start

# 로그 확인
pm2 logs nkeyword-api

# 자동 시작 설정
pm2 startup
pm2 save
```

### Option 3: 시스템 CRON 설정

```bash
# crontab 편집
crontab -e

# 매시간 정각에 수집
0 * * * * curl -X POST "http://localhost:3000/api/trending/collect" -H "Authorization: Bearer YOUR_SECRET"
```

## 🌐 프로덕션 배포

### Vercel 배포

1. Vercel에 PostgreSQL 추가:
   - Vercel Postgres 또는 외부 DB 사용

2. 환경변수 설정:
   ```
   DATABASE_URL=<your-postgres-url>
   SERPAPI_KEY=<your-key>
   CRON_SECRET=<your-secret>
   LOG_LEVEL=info
   ```

3. 배포:
   ```bash
   vercel --prod
   ```

4. CRON 설정 (Vercel Cron):
   
   `vercel.json` 생성:
   ```json
   {
     "crons": [
       {
         "path": "/api/trending/collect",
         "schedule": "0 * * * *"
       }
     ]
   }
   ```

### Docker 배포

`Dockerfile` 생성:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

`docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/trending_db
      - SERPAPI_KEY=${SERPAPI_KEY}
      - CRON_SECRET=${CRON_SECRET}
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=trending_db
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./config/database.sql:/docker-entrypoint-initdb.d/init.sql

volumes:
  postgres_data:
```

실행:
```bash
docker-compose up -d
```

## 📊 모니터링

### 로그 확인

```bash
# PM2 로그
pm2 logs nkeyword-api

# Docker 로그
docker-compose logs -f app

# 데이터베이스 로그
psql -d trending_db -c "SELECT * FROM collection_logs ORDER BY collected_at DESC LIMIT 10;"
```

### 헬스체크

```bash
# 애플리케이션 상태
curl http://localhost:3000/api/health

# 데이터베이스 연결
npm run db:check
```

### 성능 모니터링

```sql
-- 수집 성공률
SELECT 
  status,
  COUNT(*) as count,
  AVG(duration_ms) as avg_duration
FROM collection_logs
WHERE collected_at >= NOW() - INTERVAL '24 hours'
GROUP BY status;

-- 키워드 통계
SELECT 
  DATE(collected_at) as date,
  COUNT(DISTINCT keyword) as unique_keywords,
  AVG(search_volume) as avg_volume
FROM trending_keywords
GROUP BY DATE(collected_at)
ORDER BY date DESC
LIMIT 7;
```

## 🔒 보안 설정

### 1. 환경변수 보호

```bash
# .env.local 파일 권한 설정
chmod 600 .env.local

# Git에서 제외 (.gitignore에 추가)
echo ".env.local" >> .gitignore
```

### 2. 데이터베이스 보안

```sql
-- 읽기 전용 사용자 생성
CREATE USER readonly WITH PASSWORD 'password';
GRANT CONNECT ON DATABASE trending_db TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
```

### 3. API 인증

CRON_SECRET을 강력한 값으로 설정:

```bash
# 무작위 시크릿 생성
openssl rand -hex 32
```

## 🔄 업데이트 및 유지보수

### 코드 업데이트

```bash
# 코드 풀
git pull origin main

# 의존성 업데이트
npm install

# 빌드
npm run build

# PM2 재시작
pm2 restart nkeyword-api
```

### 데이터베이스 마이그레이션

```bash
# 백업
pg_dump trending_db > backup_$(date +%Y%m%d).sql

# 마이그레이션 실행
psql -d trending_db -f migrations/001_add_new_column.sql
```

### 데이터 정리

```bash
# 오래된 이력 삭제
npm run trending:cleanup

# 통계 재계산
npm run trending:stats
```

## 🆘 문제 해결

### 수집 실패

1. SerpApi 키 확인
2. API 할당량 확인
3. 로그 레벨을 debug로 변경
4. 수동 수집 테스트

### 데이터베이스 연결 실패

1. PostgreSQL 실행 확인
2. DATABASE_URL 확인
3. 방화벽 설정 확인
4. 연결 풀 설정 조정

### 성능 저하

1. 데이터베이스 인덱스 확인
2. 캐시 통계 확인
3. 쿼리 실행 계획 분석
4. Redis 도입 고려

## 📞 지원

문제가 지속되면 다음을 포함하여 이슈를 등록해주세요:

- 에러 메시지 및 스택 트레이스
- 환경 정보 (OS, Node.js 버전)
- 재현 단계
- 로그 파일

---

**배포 성공!** 🎉

이제 `http://localhost:3000/api/trending/keywords`에서 트렌드 키워드를 조회할 수 있습니다.

