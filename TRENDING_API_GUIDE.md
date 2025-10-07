# 🎯 트렌드 키워드 API 가이드

## 📋 목차

1. [개요](#개요)
2. [설치 및 설정](#설치-및-설정)
3. [데이터베이스 설정](#데이터베이스-설정)
4. [API 엔드포인트](#api-엔드포인트)
5. [스케줄러 설정](#스케줄러-설정)
6. [사용 예시](#사용-예시)
7. [문제 해결](#문제-해결)

---

## 개요

트렌드 키워드 API는 구글 트렌드를 활용하여 한국의 실시간 급상승 검색어를 자동으로 수집하고 RESTful API로 제공하는 시스템입니다.

### 주요 기능

- ✅ 매시간 자동 키워드 수집
- ✅ 순위 변동 추적
- ✅ 키워드 이력 저장
- ✅ 통계 데이터 제공
- ✅ 카테고리별 분류
- ✅ 캐싱으로 성능 최적화

### 기술 스택

- **Backend**: Next.js 14 (App Router)
- **Database**: PostgreSQL
- **Scheduler**: node-cron
- **External API**: SerpApi (Google Trends)
- **Cache**: In-Memory (Redis 대안)

---

## 설치 및 설정

### 1. 필수 패키지 설치

이미 설치되어 있습니다:

```bash
npm install pg node-cron axios
npm install --save-dev @types/pg @types/node-cron
```

### 2. 환경변수 설정

`.env.example` 파일을 `.env.local`로 복사하고 값을 설정하세요:

```bash
cp .env.example .env.local
```

필수 환경변수:

```env
# 데이터베이스
DATABASE_URL="postgresql://user:password@localhost:5432/trending_db"

# SerpApi 키 (https://serpapi.com/ 에서 발급)
SERPAPI_KEY="your_serpapi_key_here"

# CRON 인증 시크릿
CRON_SECRET="your_random_secret_here"

# 로그 레벨
LOG_LEVEL="info"
```

### 3. SerpApi 키 발급

1. https://serpapi.com/ 방문
2. 회원가입 (무료 플랜: 월 100 검색)
3. API Key 복사
4. `.env.local`에 추가

---

## 데이터베이스 설정

### 1. PostgreSQL 설치

**Windows:**
```bash
# Chocolatey 사용
choco install postgresql

# 또는 공식 사이트에서 다운로드
# https://www.postgresql.org/download/windows/
```

**macOS:**
```bash
brew install postgresql
```

**Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
```

### 2. 데이터베이스 생성

```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE trending_db;

# 사용자 생성 (선택사항)
CREATE USER trending_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE trending_db TO trending_user;

# 접속 종료
\q
```

### 3. 스키마 초기화

```bash
# SQL 파일 실행
psql -U postgres -d trending_db -f config/database.sql

# 또는 Node.js에서 자동 초기화
node -e "require('./lib/db/client').initializeDatabase()"
```

### 4. 연결 확인

```bash
# 헬스체크
curl http://localhost:3000/api/health

# 또는 Node.js에서
node -e "require('./lib/db/client').checkDatabaseConnection()"
```

---

## API 엔드포인트

### 1. 키워드 목록 조회

**Endpoint:** `GET /api/trending/keywords`

**Query Parameters:**
- `limit`: 결과 개수 (기본값: 20, 최대: 100)
- `offset`: 오프셋 (기본값: 0)
- `timeRange`: 시간 범위 (realtime | 24h | 7d | 30d)
- `category`: 카테고리 (all | entertainment | sports | it | politics | economy | society | culture)
- `sortBy`: 정렬 기준 (rank | searchVolume)

**Example:**
```bash
# 실시간 상위 20개
curl "http://localhost:3000/api/trending/keywords?timeRange=realtime&limit=20"

# 엔터테인먼트 카테고리 최근 24시간
curl "http://localhost:3000/api/trending/keywords?timeRange=24h&category=entertainment"

# 검색량 많은 순으로 정렬
curl "http://localhost:3000/api/trending/keywords?sortBy=searchVolume"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "lastUpdated": "2025-10-04T15:30:00Z",
    "keywords": [
      {
        "id": 1,
        "keyword": "검색어1",
        "rank": 1,
        "searchVolume": 150000,
        "changeRate": "▲5",
        "isNew": false,
        "category": "entertainment",
        "collectedAt": "2025-10-04T15:00:00Z"
      }
    ]
  },
  "meta": {
    "limit": 20,
    "offset": 0,
    "total": 20
  }
}
```

### 2. 키워드 이력 조회

**Endpoint:** `GET /api/trending/history/:keyword`

**Query Parameters:**
- `startDate`: 시작 날짜 (YYYY-MM-DD)
- `endDate`: 종료 날짜 (YYYY-MM-DD)
- `interval`: 간격 (hourly | daily)

**Example:**
```bash
# 특정 키워드의 최근 7일 이력
curl "http://localhost:3000/api/trending/history/%EA%B2%80%EC%83%89%EC%96%B41"

# 특정 기간 이력
curl "http://localhost:3000/api/trending/history/%EA%B2%80%EC%83%89%EC%96%B41?startDate=2025-10-01&endDate=2025-10-04"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "keyword": "검색어1",
    "history": [
      {
        "rank": 1,
        "searchVolume": 150000,
        "recordedAt": "2025-10-04T15:00:00Z"
      }
    ],
    "stats": {
      "highestRank": 1,
      "lowestRank": 15,
      "avgSearchVolume": 135000,
      "totalAppearances": 24
    }
  }
}
```

### 3. 통계 조회

**Endpoint:** `GET /api/trending/stats`

**Query Parameters:**
- `date`: 날짜 (YYYY-MM-DD, 기본값: 오늘)

**Example:**
```bash
# 오늘 통계
curl "http://localhost:3000/api/trending/stats"

# 특정 날짜 통계
curl "http://localhost:3000/api/trending/stats?date=2025-10-04"
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "statsDate": "2025-10-04",
    "totalKeywords": 500,
    "newKeywords": 45,
    "avgSearchVolume": 85000,
    "topKeyword": "검색어1",
    "categoryDistribution": {
      "entertainment": 35,
      "sports": 25,
      "politics": 20,
      "it": 15,
      "other": 5
    }
  }
}
```

### 4. 키워드 검색

**Endpoint:** `GET /api/trending/search`

**Query Parameters:**
- `q` 또는 `query`: 검색어
- `limit`: 결과 개수 (기본값: 20, 최대: 100)

**Example:**
```bash
# 키워드 검색
curl "http://localhost:3000/api/trending/search?q=게임"
```

### 5. 수집 트리거 (내부 API)

**Endpoint:** `POST /api/trending/collect`

**Headers:**
- `Authorization: Bearer {CRON_SECRET}`

**Example:**
```bash
# 수동 수집 트리거
curl -X POST "http://localhost:3000/api/trending/collect" \
  -H "Authorization: Bearer your_cron_secret"
```

---

## 스케줄러 설정

### 자동 스케줄 작업

스케줄러는 다음 작업을 자동으로 실행합니다:

1. **매시간 정각** - 키워드 수집
2. **매일 새벽 2시** - 오래된 데이터 정리 (30일 이상)
3. **매일 새벽 3시** - 일별 통계 업데이트

### 스케줄러 시작 방법

#### Option 1: 서버 시작 시 자동 실행

`app/layout.tsx` 또는 `app/api/route.ts`에 추가:

```typescript
import { startScheduler } from '@/lib/scheduler';

// 프로덕션 환경에서만 실행
if (process.env.NODE_ENV === 'production') {
  startScheduler();
}
```

#### Option 2: 별도 스크립트로 실행

`package.json`에 스크립트 추가:

```json
{
  "scripts": {
    "scheduler": "node -e \"require('./lib/scheduler').startScheduler()\""
  }
}
```

실행:
```bash
npm run scheduler
```

#### Option 3: PM2로 관리 (프로덕션 권장)

```bash
# PM2 설치
npm install -g pm2

# Next.js 서버 시작
pm2 start npm --name "nkeyword" -- start

# 로그 확인
pm2 logs nkeyword
```

### 수동 수집 트리거

CRON 작업 대신 수동으로 실행:

```bash
curl -X POST "http://localhost:3000/api/trending/collect" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

---

## 사용 예시

### JavaScript/TypeScript 클라이언트

```typescript
// API 클라이언트 예시
class TrendingApiClient {
  private baseUrl: string = 'http://localhost:3000';

  async getKeywords(params?: {
    limit?: number;
    timeRange?: string;
    category?: string;
  }) {
    const queryString = new URLSearchParams(params as any).toString();
    const response = await fetch(`${this.baseUrl}/api/trending/keywords?${queryString}`);
    return await response.json();
  }

  async getHistory(keyword: string) {
    const encoded = encodeURIComponent(keyword);
    const response = await fetch(`${this.baseUrl}/api/trending/history/${encoded}`);
    return await response.json();
  }

  async getStats(date?: string) {
    const url = date
      ? `${this.baseUrl}/api/trending/stats?date=${date}`
      : `${this.baseUrl}/api/trending/stats`;
    const response = await fetch(url);
    return await response.json();
  }
}

// 사용 예시
const client = new TrendingApiClient();

// 실시간 트렌드 조회
const trending = await client.getKeywords({ timeRange: 'realtime', limit: 10 });
console.log(trending.data.keywords);

// 키워드 이력 조회
const history = await client.getHistory('검색어1');
console.log(history.data.stats);

// 통계 조회
const stats = await client.getStats();
console.log(stats.data);
```

### React 컴포넌트 예시

```tsx
'use client';

import { useEffect, useState } from 'react';

export default function TrendingKeywords() {
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/trending/keywords?limit=10')
      .then(res => res.json())
      .then(data => {
        setKeywords(data.data.keywords);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>실시간 트렌드 키워드</h1>
      <ul>
        {keywords.map((kw: any) => (
          <li key={kw.id}>
            {kw.rank}. {kw.keyword} {kw.changeRate}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 문제 해결

### 1. 데이터베이스 연결 실패

**문제:** `Error: connect ECONNREFUSED`

**해결:**
```bash
# PostgreSQL 상태 확인
sudo service postgresql status

# 시작
sudo service postgresql start

# DATABASE_URL 확인
echo $DATABASE_URL
```

### 2. SerpApi 키 오류

**문제:** `SERPAPI_KEY is required`

**해결:**
```bash
# .env.local에 키 추가
SERPAPI_KEY="your_key_here"

# 서버 재시작
npm run dev
```

### 3. 스케줄러 작동 안 함

**문제:** 키워드가 자동으로 수집되지 않음

**해결:**
```bash
# 수동 수집 테스트
curl -X POST "http://localhost:3000/api/trending/collect" \
  -H "Authorization: Bearer your_cron_secret"

# 로그 확인
tail -f .next/server.log
```

### 4. 캐시 문제

**문제:** 오래된 데이터가 표시됨

**해결:**
```bash
# 서버 재시작 (메모리 캐시 초기화)
npm run dev

# 또는 Redis 사용 시
redis-cli FLUSHALL
```

### 5. 성능 문제

**문제:** API 응답이 느림

**해결:**
- 데이터베이스 인덱스 확인
- 캐시 TTL 조정
- PostgreSQL 쿼리 최적화
- Redis 도입 고려

---

## 추가 정보

### 프로젝트 구조

```
app/
├── api/
│   └── trending/
│       ├── keywords/route.ts
│       ├── history/[keyword]/route.ts
│       ├── stats/route.ts
│       ├── search/route.ts
│       └── collect/route.ts
lib/
├── db/
│   ├── client.ts
│   └── queries.ts
├── services/
│   ├── keywordCollector.ts
│   ├── trendingService.ts
│   └── cacheService.ts
├── scheduler/
│   ├── index.ts
│   └── jobs.ts
└── types/
    └── trending.ts
```

### 라이센스

이 프로젝트는 기존 nkeyword 프로젝트에 추가된 기능입니다.

### 지원

문의사항이 있으면 이슈를 등록해주세요.

