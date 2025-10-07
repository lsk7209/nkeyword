# 백엔드 배치 시스템 가이드

## 개요

문서수 조회를 백엔드에서 비동기로 처리하여 프론트엔드 사용자 경험을 개선한 시스템입니다.

## 문제점 (이전 방식)

### 프론트엔드 순차 처리
```typescript
// ❌ 프론트엔드가 막힘
for (let i = 0; i < 100; i++) {
  await fetch('/api/documents/count?keyword=...');
  await sleep(300ms);
}
// 총 소요 시간: 100 * 300ms = 30초
// 사용자는 30초 동안 대기 필요
```

### 문제점
- ✗ 프론트엔드가 API 호출로 블로킹됨
- ✗ 사용자가 다른 작업을 할 수 없음
- ✗ 페이지를 벗어나면 작업 중단
- ✗ 네트워크 지연 시 UI 응답 느림

## 해결책 (배치 시스템)

### 백엔드 비동기 처리
```typescript
// ✅ 프론트엔드 즉시 응답
POST /api/documents/batch
  → jobId 반환 (즉시)

// ✅ 백엔드에서 비동기 처리
백엔드 워커가 순차 처리 (사용자와 무관)

// ✅ 프론트엔드 폴링 (2초 간격)
GET /api/documents/status?jobId=xxx
  → 진행률 + 결과 반환
```

### 장점
- ✓ **프론트엔드 즉시 응답** - 사용자 경험 향상
- ✓ **백엔드에서 안정적 처리** - 네트워크 지연 영향 없음
- ✓ **자유로운 페이지 이동** - 작업은 백엔드에서 계속
- ✓ **실시간 진행률 확인** - 2초마다 업데이트

## 아키텍처

### 1. 배치 작업 큐 (`lib/batch-queue.ts`)

서버 메모리 기반 작업 큐:

```typescript
interface BatchJob {
  id: string;                    // 작업 ID
  keywords: string[];            // 처리할 키워드 목록
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: { current: number; total: number; };
  results: KeywordResult[];      // 조회 결과
  startedAt?: number;
  completedAt?: number;
}
```

### 2. 배치 API 엔드포인트

#### `/api/documents/batch` (POST)
배치 작업 시작:

**요청**:
```json
{
  "keywords": ["맥북", "아이폰", "갤럭시", ...]
}
```

**응답** (즉시):
```json
{
  "success": true,
  "jobId": "batch_1696387200000_abc123",
  "message": "배치 작업이 시작되었습니다"
}
```

백엔드에서 비동기로 처리 시작.

#### `/api/documents/status` (GET)
작업 상태 조회:

**요청**:
```
GET /api/documents/status?jobId=batch_1696387200000_abc123
```

**응답**:
```json
{
  "success": true,
  "job": {
    "id": "batch_1696387200000_abc123",
    "status": "processing",
    "progress": { "current": 15, "total": 100 },
    "results": [
      {
        "keyword": "맥북",
        "counts": { "blog": 12543, "cafe": 4521, ... }
      }
      // ... 15개 결과
    ]
  }
}
```

### 3. 프론트엔드 폴링

```typescript
// 배치 작업 시작
const response = await fetch('/api/documents/batch', {
  method: 'POST',
  body: JSON.stringify({ keywords: [...] })
});

const { jobId } = await response.json();

// 2초마다 상태 확인
const interval = setInterval(async () => {
  const status = await fetch(`/api/documents/status?jobId=${jobId}`);
  const { job } = await status.json();
  
  // 진행률 업데이트
  updateProgress(job.progress);
  
  // 결과를 로컬 스토리지에 저장
  job.results.forEach(result => {
    saveToLocalStorage(result);
  });
  
  // 완료 시 폴링 중지
  if (job.status === 'completed') {
    clearInterval(interval);
  }
}, 2000);
```

## 작업 흐름

### 시퀀스 다이어그램

```
프론트엔드          백엔드          작업 큐         네이버 API
    |                 |               |               |
    |--- POST /batch --->             |               |
    |                 |-- create --->|               |
    |                 |               |               |
    |<-- jobId -------|               |               |
    |                 |               |               |
    | (자유롭게 사용)   |--- async ---->|               |
    |                 |               |-- 키워드1 ----->|
    |                 |               |<-- 문서수 -----|
    |                 |               |               |
    |-- GET /status -->|               |               |
    |<-- progress ----|<-- 조회 ------|               |
    |                 |               |               |
    |                 |               |-- 키워드2 ----->|
    |                 |               |<-- 문서수 -----|
    |                 |               |               |
    |-- GET /status -->|               |               |
    |<-- progress ----|<-- 조회 ------|               |
    |                 |               |               |
    |                 |               | ... 반복 ...  |
    |                 |               |               |
    |-- GET /status -->|               |               |
    |<-- completed ---|<-- 완료 ------|               |
```

## 주요 함수

### 배치 큐 관리

```typescript
// 작업 생성
createBatchJob(keywords: string[]): BatchJob

// 작업 상태 조회
getBatchJob(id: string): BatchJob | null

// 진행률 업데이트
updateJobProgress(id: string, current: number): BatchJob | null

// 결과 추가
addJobResult(id: string, keyword: string, counts: DocumentCounts): BatchJob | null

// 작업 상태 업데이트
updateJobStatus(id: string, updates: Partial<BatchJob>): BatchJob | null

// 오래된 작업 정리 (30분 이상)
cleanupOldJobs(): void
```

## 동시성 제어

### 동시 작업 제한

```typescript
// 한 번에 하나의 작업만 처리
if (hasActiveJob()) {
  return { error: '이미 처리 중인 작업이 있습니다' };
}

setCurrentJob(jobId);
// 작업 처리...
setCurrentJob(null);
```

### 이유
- 네이버 API 레이트 리밋 준수
- 서버 리소스 관리
- 안정적인 처리

## 에러 처리

### 백엔드
```typescript
try {
  await processBatchJob(jobId, keywords);
} catch (error) {
  updateJobStatus(jobId, {
    status: 'failed',
    error: error.message,
  });
  setCurrentJob(null);
}
```

### 프론트엔드
```typescript
if (job.status === 'failed') {
  console.error('배치 작업 실패:', job.error);
  showErrorMessage(job.error);
}
```

## 서버리스 환경 고려사항

### Next.js API Routes 제약
- **타임아웃**: Vercel 무료 10초, Pro 60초
- **해결책**: 작업을 비동기로 시작하고 즉시 응답 반환

### 서버 메모리 제약
- **제약**: 서버 재시작 시 작업 큐 초기화
- **영향**: 진행 중인 작업 손실 가능
- **완화**: 
  - 작업 상태를 DB에 저장 (향후 개선)
  - 클라이언트가 폴링으로 실시간 저장

### 확장성
- **현재**: 단일 서버 인스턴스
- **향후**: Redis 기반 분산 큐 시스템

## 성능 최적화

### API 호출 간격
```typescript
// 네이버 API 레이트 리밋 준수
await sleep(300ms);
```

### 폴링 간격
```typescript
// 2초마다 상태 확인
setInterval(pollStatus, 2000);
```

**이유**:
- 너무 짧으면: 서버 부하 증가
- 너무 길면: UI 업데이트 지연

### 결과 캐싱
- 조회된 문서수는 로컬 스토리지에 영구 저장
- 중복 조회 방지

## 모니터링

### 로그 예시

```bash
[배치] 작업 생성: batch_1696387200000_abc123, 키워드 100개
[배치] 작업 시작: batch_1696387200000_abc123
[배치] 1/100 완료: 맥북 { blog: 12543, cafe: 4521, ... }
[배치] 2/100 완료: 아이폰 { blog: 23456, cafe: 8765, ... }
...
[배치] 100/100 완료: 키워드100
[배치] 작업 완료: batch_1696387200000_abc123
```

### 대시보드 (향후)
- 실시간 작업 현황
- 성공/실패 통계
- 평균 처리 시간
- API 사용량

## 향후 개선 사항

### 1. 데이터베이스 통합
```typescript
// PostgreSQL, MongoDB 등
await db.jobs.insert(job);
```

**장점**:
- 서버 재시작 시에도 작업 유지
- 작업 이력 조회
- 통계 분석

### 2. 메시지 큐 (Redis, RabbitMQ)
```typescript
// 분산 환경 지원
await queue.add('document-count', { keywords });
```

**장점**:
- 여러 워커에서 병렬 처리
- 안정적인 작업 큐
- 재시도 메커니즘

### 3. WebSocket / Server-Sent Events
```typescript
// 실시간 푸시
socket.on('progress', (data) => {
  updateUI(data);
});
```

**장점**:
- 폴링 불필요
- 즉시 업데이트
- 네트워크 트래픽 감소

### 4. 우선순위 큐
```typescript
// 중요한 작업 우선 처리
createBatchJob(keywords, { priority: 'high' });
```

### 5. 재시도 메커니즘
```typescript
// 실패 시 자동 재시도
if (failed) {
  retryAfter(60000); // 1분 후
}
```

## 사용자 가이드

### 배치 작업 확인
1. 데이터 페이지 접속
2. 화면 상단에서 진행률 확인
3. 페이지를 자유롭게 이동 가능
4. 작업은 백엔드에서 계속 진행

### 문제 해결

**Q: 작업이 진행되지 않아요**
A: 
- 서버 콘솔 로그 확인
- 이미 처리 중인 작업이 있는지 확인
- 네이버 API 키 상태 확인

**Q: 페이지를 닫으면 작업이 중단되나요?**
A: 
- 아니요! 백엔드에서 계속 처리됩니다
- 다시 페이지를 열면 진행 상황을 확인할 수 있습니다

**Q: 여러 작업을 동시에 시작할 수 있나요?**
A:
- 현재는 한 번에 하나의 작업만 가능합니다
- 이전 작업 완료 후 새 작업 시작 가능

---

**최종 업데이트**: 2025-10-04
**버전**: 2.0.0 - 백엔드 배치 시스템

