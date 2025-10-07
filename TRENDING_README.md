# 🔥 트렌드 키워드 API

> 구글 트렌드를 활용한 한국 실시간 급상승 검색어 API

## ✨ 특징

- ✅ **자동 수집**: 매시간 자동으로 구글 트렌드에서 키워드 수집
- ✅ **순위 추적**: 키워드 순위 변동 실시간 모니터링
- ✅ **이력 관리**: 키워드별 과거 데이터 저장 및 조회
- ✅ **통계 제공**: 일별/주별 통계 데이터 자동 계산
- ✅ **카테고리 분류**: AI 기반 키워드 카테고리 자동 분류
- ✅ **고성능**: 인메모리 캐싱으로 빠른 응답 속도
- ✅ **확장 가능**: PostgreSQL 기반으로 대용량 데이터 처리

## 🚀 빠른 시작

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경변수 설정

`ENV_TEMPLATE.txt`를 참고하여 `.env.local` 파일 생성:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/trending_db"
SERPAPI_KEY="your_serpapi_key"
CRON_SECRET="your_secret"
LOG_LEVEL="info"
```

### 3. 데이터베이스 초기화

```bash
# PostgreSQL 데이터베이스 생성
createdb trending_db

# 스키마 초기화
psql -d trending_db -f config/database.sql
```

### 4. 서버 시작

```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm run build
npm start
```

## 📡 API 엔드포인트

### 1. 키워드 목록 조회

```bash
GET /api/trending/keywords

# 예시
curl "http://localhost:3000/api/trending/keywords?limit=10&timeRange=realtime"
```

**Query Parameters:**
- `limit`: 결과 개수 (기본: 20, 최대: 100)
- `offset`: 오프셋 (기본: 0)
- `timeRange`: 시간 범위 (realtime | 24h | 7d | 30d)
- `category`: 카테고리 필터
- `sortBy`: 정렬 (rank | searchVolume)

### 2. 키워드 이력 조회

```bash
GET /api/trending/history/:keyword

# 예시
curl "http://localhost:3000/api/trending/history/게임"
```

### 3. 통계 조회

```bash
GET /api/trending/stats

# 예시
curl "http://localhost:3000/api/trending/stats?date=2025-10-04"
```

### 4. 키워드 검색

```bash
GET /api/trending/search

# 예시
curl "http://localhost:3000/api/trending/search?q=게임&limit=20"
```

### 5. 수집 트리거 (내부 API)

```bash
POST /api/trending/collect
Authorization: Bearer {CRON_SECRET}

# 예시
curl -X POST "http://localhost:3000/api/trending/collect" \
  -H "Authorization: Bearer your_secret"
```

## 🕐 스케줄러

자동으로 다음 작업이 실행됩니다:

- **매시간 정각**: 키워드 수집
- **매일 새벽 2시**: 오래된 데이터 정리
- **매일 새벽 3시**: 일별 통계 업데이트

## 📊 데이터베이스 스키마

### 주요 테이블

1. **trending_keywords**: 트렌드 키워드 메인 데이터
2. **keyword_history**: 키워드 이력
3. **daily_stats**: 일별 통계
4. **collection_logs**: 수집 로그

## 🏗️ 프로젝트 구조

```
app/
├── api/
│   └── trending/
│       ├── keywords/route.ts         # 키워드 목록 API
│       ├── history/[keyword]/route.ts # 키워드 이력 API
│       ├── stats/route.ts            # 통계 API
│       ├── search/route.ts           # 검색 API
│       └── collect/route.ts          # 수집 트리거 API

config/
└── database.sql                      # DB 스키마

lib/
├── db/
│   ├── client.ts                     # DB 클라이언트
│   └── queries.ts                    # 쿼리 함수
├── services/
│   ├── keywordCollector.ts           # 키워드 수집 서비스
│   ├── trendingService.ts            # 비즈니스 로직
│   └── cacheService.ts               # 캐싱 서비스
├── scheduler/
│   ├── index.ts                      # 스케줄러 메인
│   └── jobs.ts                       # 배치 작업
├── utils/
│   └── logger.ts                     # 로깅 유틸리티
└── types/
    └── trending.ts                   # TypeScript 타입
```

## 🔧 설정

### 캐싱

기본적으로 인메모리 캐싱을 사용합니다. Redis로 변경하려면:

```typescript
// lib/services/cacheService.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
```

### 로깅

로그 레벨 설정:

```env
LOG_LEVEL="debug"  # debug, info, warn, error
```

## 📈 성능 최적화

1. **캐싱**: 5분 ~ 1시간 TTL
2. **인덱싱**: DB 쿼리 최적화
3. **배치 처리**: 대량 데이터 삽입 최적화
4. **연결 풀**: PostgreSQL 연결 풀 관리

## 🔍 모니터링

### 수집 상태 확인

```bash
# 최근 수집 로그 조회
psql -d trending_db -c "SELECT * FROM collection_logs ORDER BY collected_at DESC LIMIT 10;"
```

### 캐시 통계

```bash
curl "http://localhost:3000/api/health"
```

## 🐛 문제 해결

### 데이터베이스 연결 오류

```bash
# PostgreSQL 상태 확인
sudo service postgresql status

# 재시작
sudo service postgresql restart
```

### SerpApi 오류

- API 키 확인
- 월간 할당량 확인 (무료: 100회)
- 로그 확인: `LOG_LEVEL=debug`

### 캐시 초기화

```bash
# 서버 재시작으로 메모리 캐시 초기화
npm run dev
```

## 📚 문서

자세한 사용 방법은 [TRENDING_API_GUIDE.md](./TRENDING_API_GUIDE.md)를 참조하세요.

## 🔐 보안

- CRON_SECRET으로 수집 API 보호
- DATABASE_URL 환경변수로 관리
- API 키는 절대 커밋하지 마세요

## 🎯 로드맵

- [ ] Redis 캐싱 지원
- [ ] GraphQL API 추가
- [ ] WebSocket 실시간 업데이트
- [ ] 머신러닝 카테고리 분류 개선
- [ ] 다국어 지원 (일본, 미국 등)

## 📄 라이센스

이 프로젝트는 기존 nkeyword 프로젝트에 추가된 기능입니다.

## 🙋‍♂️ 지원

문의사항이나 버그 리포트는 이슈로 등록해주세요.

---

Made with ❤️ by nkeyword team

