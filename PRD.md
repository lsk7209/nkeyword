# PRD (Product Requirements Document)

## 프로젝트 개요

### 프로젝트명
**네이버 연관검색어 분석 도구 (Naver Keyword Analysis Tool)**

### 목적
네이버 검색광고 API를 활용하여 특정 키워드의 연관 검색어와 검색량, 경쟁도 등의 메트릭을 분석하고 시각화하여 마케터와 콘텐츠 제작자가 효과적인 키워드 전략을 수립할 수 있도록 지원합니다.

### 대상 사용자
- 디지털 마케터
- SEO/SEM 전문가
- 블로그/유튜브 콘텐츠 제작자
- 온라인 쇼핑몰 운영자
- 키워드 광고 담당자

---

## 기술 스택

### 프론트엔드
- **프레임워크**: Next.js 14 (App Router)
- **UI 라이브러리**: React 18
- **언어**: TypeScript 5
- **스타일링**: Tailwind CSS 3
- **차트**: Recharts 2.12

### 백엔드
- **API**: Next.js API Routes (서버리스)
- **외부 API**:
  - 네이버 검색광고 API (키워드 도구)
  - 네이버 검색 API (블로그, 뉴스, 쇼핑 등)

### 데이터 저장
- **로컬 스토리지**: 브라우저 localStorage (클라이언트 사이드)

---

## 주요 기능

### 1. 키워드 검색 및 분석

#### 1.1 연관검색어 조회
- 사용자가 입력한 키워드에 대한 연관 검색어 목록 제공
- 네이버 검색광고 API `/keywordstool` 엔드포인트 활용
- 최대 50자까지 입력 가능
- **수동 수집**: 사용자가 직접 검색창에 키워드 입력
- **자동 수집**: (향후 개발 예정) 배치 작업으로 여러 키워드 자동 수집

#### 1.2 검색 메트릭 표시
각 연관검색어에 대해 다음 정보를 제공:
- **키워드명**: 연관 검색어
- **PC 검색량**: 월간 PC 검색 횟수
- **모바일 검색량**: 월간 모바일 검색 횟수
- **총 검색량**: PC + 모바일 합계
- **경쟁도**: 키워드 경쟁 지수
- **PC 클릭수**: 월간 평균 PC 클릭 수
- **모바일 클릭수**: 월간 평균 모바일 클릭 수
- **PC 클릭율**: PC 클릭률 (%)
- **모바일 클릭율**: 모바일 클릭률 (%)
- **노출광고수**: 평균 광고 노출 깊이

#### 1.3 문서수 조회 (자동 백그라운드)
- **블로그 문서수**: 네이버 블로그 전체 문서 수
- **카페 문서수**: 네이버 카페 전체 문서 수
- **뉴스 문서수**: 네이버 뉴스 전체 문서 수
- **웹문서 문서수**: 네이버 웹문서 전체 문서 수
- **조회 방식**: 키워드 검색 후 자동으로 백그라운드에서 시작
- **레이트 리밋**: API 호출 간격 300ms (네이버 API 제한 고려)
- **사용자 경험**: 프론트엔드 사용자에게 지연 없이 즉시 응답

### 2. 네이버 통합 검색 결과

#### 2.1 다중 채널 검색 결과
키워드 검색 시 네이버의 다양한 카테고리에서 실제 검색 결과를 병렬로 조회:
- 블로그
- 뉴스
- 책
- 지식iN
- 쇼핑
- 웹문서
- 카페
- 지역
- 이미지

#### 2.2 검색 결과 표시
- 각 카테고리별 상위 5개 결과 표시
- 제목, 설명, 링크, 작성자, 날짜 등 메타데이터 포함
- 새 탭에서 원본 링크 열기 지원

### 3. 데이터 시각화

#### 3.1 차트
- 상위 10개 키워드의 PC vs 모바일 검색량 비교 바 차트
- Recharts 라이브러리를 사용한 인터랙티브 차트
- 반응형 디자인 지원

### 4. 데이터 관리

#### 4.1 정렬 기능
다음 필드를 기준으로 오름차순/내림차순 정렬:
- 키워드명 (알파벳/가나다순)
- 총 검색량
- 경쟁도

#### 4.2 CSV 내보내기
- 현재 검색 결과를 CSV 파일로 다운로드
- UTF-8 BOM 포함으로 한글 호환성 보장
- 파일명: `{키워드}_연관검색어_{날짜}.csv`

#### 4.3 데이터셋 저장 및 관리
- **자동 저장**: 모든 검색 결과를 로컬 스토리지에 자동 저장
- **중복 제거**: 동일한 키워드는 최초 검색 결과만 유지
- **메타데이터**: 원본 키워드(rootKeyword)와 조회 시각(queriedAt) 저장
- **분리된 수집 방식**: 키워드 메트릭과 문서수를 별도로 수집

#### 4.4 데이터 페이지 (`/data`)
- 저장된 전체 데이터셋 테이블 형태로 조회
- 페이지네이션 (1,000개 단위)
- **정렬 기능** (v2.1):
  - 키워드, 총 검색량, PC/모바일 검색량, 경쟁도, 문서수 등 정렬 가능
  - 오름차순/내림차순 토글
  - 정렬 상태 시각적 표시 (▲▼ 아이콘)
- **필터 기능** (v2.1):
  - 키워드 텍스트 검색
  - 검색량 범위 필터 (최소/최대)
  - 경쟁도 다중 선택 필터
  - 문서수 보유 여부 필터
  - 활성 필터 태그 표시
  - URL에 필터 상태 저장 (새로고침 시 유지)
- 개별 키워드 삭제 기능
- 선택한 키워드 일괄 삭제 기능
- 전체 데이터 삭제 기능
- 데이터셋 CSV 내보내기 기능 (필터링된 데이터 포함)
- **백엔드 배치 문서수 조회** (v2.0):
  - 페이지 로드 1초 후 자동 시작
  - 문서수가 없는 키워드들을 자동으로 탐지
  - **백엔드에서 비동기로 처리** (프론트엔드 즉시 응답)
  - 프론트엔드는 2초마다 진행 상황 폴링
  - 진행률 표시 (스피너 + 프로그레스 바)
  - 실시간 결과 업데이트
  - 수동 조회 버튼 제공
  - **사용자는 자유롭게 페이지 이동 가능**

### 5. UI/UX

#### 5.1 레이아웃
- **헤더**: 로고, 네비게이션(홈, 데이터)
- **반응형 디자인**: 모바일, 태블릿, 데스크톱 대응
- **최대 너비**: 7xl 컨테이너 (1280px)

#### 5.2 디자인 시스템
- **컬러 팔레트**:
  - Primary: Indigo (버튼, 링크)
  - Success: Green (모바일 차트 바)
  - Danger: Red (에러, 삭제 버튼)
  - Neutral: Gray (배경, 보더)
- **타이포그래피**: 시스템 폰트 (antialiased)
- **스페이싱**: Tailwind CSS 기본 스케일

#### 5.3 사용자 피드백
- 로딩 상태 표시 ("검색 중…")
- 에러 메시지 (빨간색 박스)
- 버튼 비활성화 처리 (로딩 중)

---

## API 명세

### 1. 연관검색어 조회 API

**엔드포인트**: `GET /api/keywords/related`

**쿼리 파라미터**:
- `keyword` (required): 검색할 키워드
- `showDetail` (optional): 상세 정보 표시 여부 (기본값: `1`)

**응답 예시**:
```json
{
  "success": true,
  "keyword": "맥북",
  "total": 50,
  "keywords": [
    {
      "keyword": "맥북 프로",
      "monthlyPcSearch": 45000,
      "monthlyMobileSearch": 85000,
      "totalSearch": 130000,
      "competition": "높음",
      "monthlyPcClicks": 5000,
      "monthlyMobileClicks": 9000,
      "monthlyPcClickRate": 11.11,
      "monthlyMobileClickRate": 10.59,
      "monthlyAdCount": 8
    }
  ]
}
```

**참고**: 문서수는 이 API에서 제공하지 않음 (별도 API 사용)

**에러 응답**:
```json
{
  "success": false,
  "error": "키워드를 입력해주세요",
  "details": "..."
}
```

### 4. 문서수 조회 API (단건)

**엔드포인트**: `GET /api/documents/count`

**쿼리 파라미터**:
- `keyword` (required): 문서수를 조회할 키워드

**응답 예시**:
```json
{
  "success": true,
  "keyword": "맥북 프로",
  "counts": {
    "blog": 125430,
    "cafe": 45231,
    "news": 8234,
    "webkr": 234567
  }
}
```

**특징**:
- 네이버 검색 API 4개 카테고리 병렬 조회
- 최소한의 데이터(`display=1`)만 요청하여 효율성 확보

**에러 응답**:
```json
{
  "success": false,
  "error": "키워드를 입력해주세요"
}
```

### 5. 문서수 배치 조회 API (v2.0 - NEW)

**엔드포인트**: `POST /api/documents/batch`

**요청 바디**:
```json
{
  "keywords": ["맥북", "아이폰", "갤럭시", ...]
}
```

**응답** (즉시 반환):
```json
{
  "success": true,
  "jobId": "batch_1696387200000_abc123",
  "message": "배치 작업이 시작되었습니다"
}
```

**특징**:
- 백엔드에서 비동기로 처리
- 프론트엔드는 즉시 응답받고 자유롭게 사용 가능
- 서버 메모리에 작업 큐 저장
- 동시에 하나의 작업만 처리

**에러 응답**:
```json
{
  "success": false,
  "error": "이미 처리 중인 작업이 있습니다"
}
```

### 6. 배치 작업 상태 조회 API (v2.0 - NEW)

**엔드포인트**: `GET /api/documents/status`

**쿼리 파라미터**:
- `jobId` (optional): 작업 ID (생략 시 전체 작업 목록)

**응답 예시**:
```json
{
  "success": true,
  "job": {
    "id": "batch_1696387200000_abc123",
    "status": "processing",
    "progress": {
      "current": 15,
      "total": 100
    },
    "results": [
      {
        "keyword": "맥북",
        "counts": { "blog": 12543, "cafe": 4521, "news": 823, "webkr": 23456 }
      }
      // ... 15개 결과
    ],
    "startedAt": 1696387200000
  }
}
```

**작업 상태**:
- `pending`: 대기 중
- `processing`: 처리 중
- `completed`: 완료
- `failed`: 실패

### 2. 네이버 검색 API

**엔드포인트**: `GET /api/search/naver`

**쿼리 파라미터**:
- `query` (required): 검색어

**응답 예시**:
```json
{
  "success": true,
  "query": "맥북",
  "results": {
    "blog": [
      {
        "title": "맥북 프로 리뷰",
        "link": "https://...",
        "description": "...",
        "bloggername": "테크블로거",
        "bloggerlink": "https://...",
        "postdate": "20251003"
      }
    ],
    "news": [...],
    "shop": [...]
  }
}
```

### 3. 환경 변수 확인 API

**엔드포인트**: `GET /api/health/env`

프로젝트에 존재하는 헬스체크 API로, 환경 변수 설정 상태를 확인할 수 있습니다.

---

## 환경 설정

### 필수 환경 변수

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 값을 설정해야 합니다:

```bash
# 네이버 검색광고 API (키워드 도구)
NAVER_API_KEY=your_api_key
NAVER_CUSTOMER_ID=your_customer_id
NAVER_SECRET_KEY=your_secret_key

# 네이버 검색 API (블로그, 뉴스 등)
NAVER_CLIENT_ID=your_client_id
NAVER_CLIENT_SECRET=your_client_secret
```

### API 인증 방식

#### 1. 네이버 검색광고 API
- HMAC SHA256 서명 방식
- 타임스탬프 기반 요청 서명
- 헤더: `X-Timestamp`, `X-API-KEY`, `X-Customer`, `X-Signature`

#### 2. 네이버 검색 API
- 클라이언트 ID/Secret 방식
- 헤더: `X-Naver-Client-Id`, `X-Naver-Client-Secret`

---

## 데이터 모델

### KeywordData
```typescript
interface KeywordData {
  keyword: string;
  monthlyPcSearch: number;
  monthlyMobileSearch: number;
  totalSearch: number;
  competition: string;
  monthlyPcClicks?: number;
  monthlyMobileClicks?: number;
  monthlyPcClickRate?: number;
  monthlyMobileClickRate?: number;
  monthlyAdCount?: number;
}
```

### StoredRow (로컬 스토리지)
```typescript
interface StoredRow extends KeywordData {
  queriedAt: string;    // ISO 8601 날짜
  rootKeyword: string;  // 원본 검색 키워드
}
```

### NaverSearchItem
```typescript
interface NaverSearchItem {
  title: string;
  link: string;
  description: string;
  bloggername?: string;
  bloggerlink?: string;
  postdate?: string;
  thumbnail?: string;
  price?: string;
  category?: string;
}
```

---

## 파일 구조

```
nkeyword/
├── app/
│   ├── api/
│   │   ├── health/env/route.ts         # 환경 변수 헬스체크
│   │   ├── keywords/related/route.ts   # 연관검색어 API
│   │   └── search/naver/route.ts       # 네이버 검색 API
│   ├── data/
│   │   └── page.tsx                    # 데이터 관리 페이지
│   ├── globals.css                     # 전역 스타일
│   ├── layout.tsx                      # 루트 레이아웃
│   └── page.tsx                        # 홈 페이지
├── components/
│   ├── ExportButton.tsx                # CSV 내보내기 버튼
│   ├── KeywordChart.tsx                # 키워드 차트
│   ├── KeywordResults.tsx              # 키워드 결과 테이블
│   ├── KeywordSearch.tsx               # 검색 입력 폼
│   └── NaverSearchResults.tsx          # 네이버 검색 결과
├── lib/
│   ├── naver-api.ts                    # 네이버 API 인증 헬퍼
│   ├── storage.ts                      # 로컬 스토리지 유틸리티
│   └── types.ts                        # TypeScript 타입 정의
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

---

## 사용자 플로우

### 메인 플로우: 키워드 분석

1. 사용자가 홈 페이지(`/`)에 접속
2. 검색창에 키워드 입력 (예: "맥북")
3. "검색" 버튼 클릭
4. 로딩 표시
5. 시스템이 병렬로 다음을 처리:
   - 네이버 검색광고 API 호출 (연관검색어)
   - 네이버 검색 API 호출 (통합 검색 결과)
6. 결과 표시:
   - 연관검색어 개수 표시
   - 상위 10개 키워드 차트
   - 전체 키워드 테이블 (정렬 가능, **문서수는 '-' 표시**)
   - 네이버 통합 검색 결과 (카테고리별)
7. 키워드 데이터가 로컬 스토리지에 자동 저장 (문서수 없이)
8. 사용자는 다음 작업 수행 가능:
   - 테이블 헤더 클릭하여 정렬
   - CSV 내보내기 버튼 클릭하여 다운로드
   - 다른 키워드 재검색

### 서브 플로우: 데이터 관리 및 백엔드 배치 문서수 조회 (v2.0)

1. 사용자가 헤더의 "데이터" 링크 클릭
2. `/data` 페이지로 이동
3. 저장된 전체 키워드 데이터 테이블 표시
4. **백엔드 배치 작업 자동 시작 (1초 후)**:
   - 문서수가 없는 키워드들을 자동 탐지
   - 백엔드에 배치 작업 요청 (즉시 응답)
   - **프론트엔드는 즉시 자유로워짐**
5. **백엔드에서 비동기 처리**:
   - 순차적으로 문서수 조회 (300ms 간격)
   - 서버 메모리에 결과 저장
   - 작업 진행률 업데이트
6. **프론트엔드 폴링 (2초 간격)**:
   - 배치 작업 상태 확인
   - 진행률 표시 (스피너 + 프로그레스 바 + 카운터)
   - 새로운 결과를 로컬 스토리지에 저장
   - 테이블 실시간 업데이트
7. 사용자는 **자유롭게** 다음 작업 수행 가능:
   - **페이지 이동 가능** (배치 작업은 백엔드에서 계속)
   - "문서수 조회" 버튼으로 수동 조회 시작
   - **정렬 기능**: 테이블 헤더 클릭으로 다양한 기준 정렬
   - **필터 기능**: 키워드 검색, 검색량 범위, 경쟁도 등으로 필터링
   - 체크박스로 키워드 선택
   - "선택 삭제" 버튼으로 일괄 삭제
   - 개별 키워드 "삭제" 버튼 클릭
   - "전체 삭제" 버튼으로 모든 데이터 삭제
   - "CSV 내보내기" 버튼으로 필터링된 데이터셋 다운로드
   - 페이지네이션으로 대용량 데이터 탐색

---

## 비기능 요구사항

### 성능
- API 호출은 병렬 처리 (`Promise.all`)
- 로컬 스토리지 중복 제거로 데이터 최적화
- 차트는 상위 10개만 렌더링
- 데이터 페이지는 페이지네이션으로 대용량 데이터 처리

### 보안
- API 키는 서버 사이드에서만 사용 (환경 변수)
- HMAC 서명으로 요청 무결성 보장
- 사용자 입력 길이 제한 (최대 50자)

### 접근성
- 시맨틱 HTML 사용
- 키보드 네비게이션 지원
- 호버 상태 명확히 표시

### 브라우저 호환성
- 모던 브라우저 (Chrome, Firefox, Safari, Edge)
- localStorage API 지원 필수

---

## 향후 개선 방향

### 단기 개선
1. **필터링 기능**: 검색량 범위, 경쟁도로 필터링
2. **즐겨찾기**: 특정 키워드를 즐겨찾기로 저장
3. **비교 기능**: 여러 키워드 동시 비교
4. **다크 모드**: 테마 전환 지원

### 중기 개선
1. **클라우드 저장**: Firebase/Supabase 연동
2. **사용자 인증**: 개인별 데이터 관리
3. **공유 기능**: 분석 결과 URL 공유
4. **더 많은 차트**: 파이 차트, 라인 차트 등

### 장기 개선
1. **AI 추천**: 키워드 전략 자동 추천
2. **경쟁사 분석**: 경쟁 키워드 분석
3. **트렌드 분석**: 시계열 데이터 추적
4. **모바일 앱**: React Native로 네이티브 앱 개발

---

## 라이선스 및 의존성

### 주요 의존성
- `next`: ^14.2.0
- `react`: ^18.3.1
- `recharts`: ^2.12.0
- `typescript`: ^5
- `tailwindcss`: ^3.4.0

### 개발 의존성
- ESLint
- PostCSS
- Autoprefixer

---

## 개발 및 배포

### 로컬 개발
```bash
npm install
npm run dev
# http://localhost:3000
```

### 프로덕션 빌드
```bash
npm run build
npm start
```

### 린트
```bash
npm run lint
```

### 배포 플랫폼
- Vercel (권장)
- Netlify
- AWS Amplify
- Cloudflare Pages

---

## 문서 히스토리

| 버전 | 날짜 | 작성자 | 변경 내역 |
|------|------|--------|-----------|
| 1.0  | 2025-10-04 | AI Assistant | 초기 PRD 작성 |

---

## 연락처 및 지원

프로젝트 관련 문의 또는 버그 리포트는 이슈 트래커를 통해 제출해주세요.

