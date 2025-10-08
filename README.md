# 네이버 연관검색어 분석 도구

<!-- Vercel 배포 트리거: 2025-01-08 21:40 -->

Next.js 기반의 네이버 검색광고 API와 네이버 검색 API를 활용한 키워드 분석 도구입니다.

## ✨ 주요 기능

- 🔍 **연관검색어 조회**: 네이버 검색광고 API로 검색량, 경쟁도, 클릭수 등 분석
- 📊 **문서수 조회**: 블로그, 카페, 뉴스, 웹문서의 전체 문서 수 파악
- 📈 **데이터 시각화**: Recharts를 활용한 PC/모바일 검색량 비교 차트
- 💾 **하이브리드 저장소**: LocalStorage (빠름) + Supabase (대용량) 지원
- 🚀 **성능 최적화**: 서버 사이드 필터링, 페이지네이션, 메모이제이션
- 🔄 **API 키 로테이션**: 다수의 API 키를 자동으로 순환하여 호출 한도 관리
- 🔒 **자동 재시도**: API 오류 발생 시 다른 키로 자동 재시도
- 📤 **CSV 내보내기**: 필터링된 데이터를 CSV 파일로 내보내기

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. API 키 설정

API 키 파일을 생성하세요:

```bash
cp lib/api-keys.example.ts lib/api-keys.ts
```

`lib/api-keys.ts` 파일을 열어 실제 API 키를 입력합니다:

```typescript
export const SEARCH_AD_KEYS: SearchAdKey[] = [
  {
    name: "검색광고API키1",
    customer_id: "YOUR_CUSTOMER_ID",
    api_key: "YOUR_API_KEY",
    secret_key: "YOUR_SECRET_KEY"
  }
  // 추가 키 입력...
];

export const OPEN_API_KEYS: OpenApiKey[] = [
  {
    name: "OpenAPI키1",
    client_id: "YOUR_CLIENT_ID",
    client_secret: "YOUR_CLIENT_SECRET"
  }
  // 추가 키 입력...
];
```

> 📌 **중요**: `lib/api-keys.ts` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다.

자세한 내용은 [API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md)를 참고하세요.

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## 📖 사용 방법

### 키워드 검색
1. 홈 페이지에서 검색창에 키워드 입력
2. 연관검색어와 검색량 데이터 즉시 확인
3. 데이터는 자동으로 저장됨

### 문서수 조회 (백엔드 배치)
1. 상단 "데이터" 메뉴 클릭
2. 페이지 로드 1초 후 백엔드에서 배치 작업 자동 시작
3. **프론트엔드는 즉시 응답받고 자유롭게 사용 가능**
4. 2초마다 진행률 확인 및 화면 업데이트
5. 수동 조회 버튼으로 언제든 재조회 가능

### 데이터 관리
- **정렬 기능**: 키워드, 검색량, 경쟁도, 문서수 등 다양한 기준으로 정렬
- **필터 기능**: 키워드 검색, 검색량 범위, 경쟁도, 문서수 보유 여부로 필터링
- 체크박스로 키워드 선택 후 일괄 삭제
- 개별 키워드 삭제
- CSV 파일로 내보내기 (필터링된 데이터 포함)
- 페이지네이션으로 대용량 데이터 탐색

## 🏗️ 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript 5
- **스타일링**: Tailwind CSS 3
- **차트**: Recharts 2.12
- **API**: 
  - 네이버 검색광고 API (연관검색어)
  - 네이버 검색 API (문서수, 통합 검색)

## 📁 프로젝트 구조

```
nkeyword/
├── app/
│   ├── api/
│   │   ├── keywords/related/      # 연관검색어 API
│   │   ├── documents/count/       # 문서수 조회 API
│   │   └── search/naver/          # 통합 검색 API
│   ├── data/                      # 데이터 관리 페이지
│   └── page.tsx                   # 홈 페이지
├── components/
│   ├── KeywordSearch.tsx          # 검색 입력
│   ├── KeywordResults.tsx         # 결과 테이블
│   ├── KeywordChart.tsx           # 차트
│   └── ExportButton.tsx           # CSV 내보내기
├── lib/
│   ├── api-keys.ts                # API 키 (Git 제외)
│   ├── api-keys.example.ts        # API 키 템플릿
│   ├── naver-api.ts               # API 헬퍼
│   ├── storage.ts                 # 로컬 스토리지
│   └── types.ts                   # TypeScript 타입
├── API_KEYS_GUIDE.md              # API 키 관리 가이드
├── PRD.md                         # 프로덕트 요구사항 문서
└── README.md
```

## 🔑 API 키 관리

### 로테이션 방식
- **라운드 로빈**: 키를 순차적으로 순환하며 사용
- **자동 재시도**: 검색광고 API는 실패 시 다음 키로 자동 재시도
- **부하 분산**: 다수의 키로 API 호출 한도를 효율적으로 관리

### 키 개수
- **검색광고 API 키**: 5개 (추가 가능)
- **오픈 API 키**: 9개 (추가 가능)

자세한 내용은 [API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md)를 참고하세요.

## 🔄 데이터 수집 플로우

### 키워드 수집 (홈 페이지)
```
검색 입력 → 네이버 검색광고 API → 검색량/클릭수 수집 → 저장
```

### 문서수 수집 (데이터 페이지 - 백엔드 배치)
```
페이지 로드 → 1초 대기 → 백엔드 배치 작업 시작 요청
    ↓
프론트엔드: 즉시 응답받고 자유롭게 사용 가능
    ↓
백엔드: 비동기로 문서수 조회 시작
    ├─ 문서수 없는 키워드 탐지
    ├─ 순차 조회 (300ms 간격)
    └─ 서버 메모리에 결과 저장
    ↓
프론트엔드: 2초마다 상태 폴링
    ├─ 진행률 업데이트
    ├─ 결과를 로컬 스토리지에 저장
    └─ 테이블 실시간 갱신
```

## 📊 데이터 모델

### KeywordData
```typescript
interface KeywordData {
  keyword: string;                  // 키워드명
  monthlyPcSearch: number;          // PC 검색량
  monthlyMobileSearch: number;      // 모바일 검색량
  totalSearch: number;              // 총 검색량
  competition: string;              // 경쟁도
  monthlyPcClicks?: number;         // PC 클릭수
  monthlyMobileClicks?: number;     // 모바일 클릭수
  monthlyPcClickRate?: number;      // PC 클릭율
  monthlyMobileClickRate?: number;  // 모바일 클릭율
  monthlyAdCount?: number;          // 노출광고수
  blogTotalCount?: number;          // 블로그 문서수
  cafeTotalCount?: number;          // 카페 문서수
  newsTotalCount?: number;          // 뉴스 문서수
  webkrTotalCount?: number;         // 웹문서 문서수
}
```

## 🛠️ 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# 린트 검사
npm run lint
```

## 📦 배포

### Vercel (권장)
```bash
vercel deploy
```

### 기타 플랫폼
- Netlify
- AWS Amplify
- Cloudflare Pages

> ⚠️ **주의**: `lib/api-keys.ts` 파일은 서버에 직접 업로드하거나 환경별로 관리하세요.

## 🔒 보안

- API 키는 서버 사이드에서만 사용
- `lib/api-keys.ts`는 `.gitignore`에 포함
- 프론트엔드에 API 키 노출 없음
- HTTPS 필수

## 📝 라이선스

MIT License

## 👥 기여

이슈와 풀 리퀘스트는 언제나 환영합니다!

## 📚 참고 문서

### 필수 가이드
- [PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md) - **⭐ 성능 최적화 가이드 (필독!)**
- [API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md) - API 키 관리 가이드
- [README.md](./README.md) - 전체 가이드 (현재 문서)

### 고급 기능
- [SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md) - Supabase 설정 (대용량 데이터용)
- [SUPABASE_MIGRATION_PLAN.md](./SUPABASE_MIGRATION_PLAN.md) - 마이그레이션 계획
- [BATCH_SYSTEM.md](./BATCH_SYSTEM.md) - 백엔드 배치 시스템 가이드

### 기타
- [PRD.md](./PRD.md) - 프로덕트 요구사항 문서
- [네이버 검색광고 API 문서](https://naver.github.io/searchad-apidoc/)
- [네이버 검색 API 문서](https://developers.naver.com/docs/serviceapi/search/)

## 🆘 문제 해결

### API 키 오류
```
환경 변수 미설정: NAVER_API_KEY
```
→ `lib/api-keys.ts` 파일이 제대로 설정되었는지 확인

### 모든 키 시도 실패
→ 네이버 API 서버 상태 확인 또는 키 유효성 확인

### 문서수가 조회되지 않음
→ 데이터 페이지에서 "문서수 조회" 버튼 클릭

### 🚨 페이지가 10시간 이상 로딩 중 (긴급)

**증상**: 데이터 페이지가 계속 로딩 중이고 응답하지 않음

**원인**: 
- Worker가 무한 폴링 중 (배치 작업이 완료되지 않음)
- localStorage 데이터가 손상됨
- 작업 ID가 오래되었음

**해결 방법**:

#### 1️⃣ 즉시 해결 (권장)
1. **작업 강제 중지**: 페이지 상단의 "백그라운드 작업" 알림에서 **"강제 중지"** 버튼 클릭
2. **페이지 새로고침**: `F5` 또는 `Ctrl+R` (Mac: `Cmd+R`)
3. 여전히 문제가 있다면 다음 단계 진행

#### 2️⃣ 브라우저 콘솔 사용
브라우저 개발자 도구를 열고 (F12) Console 탭에서 다음 명령어 실행:

```javascript
// 현재 작업 ID 확인
localStorage.getItem('nkeyword:currentJobId')

// 작업 ID 초기화
localStorage.removeItem('nkeyword:currentJobId')
localStorage.removeItem('nkeyword:jobStartTime')

// 페이지 새로고침
location.reload()
```

#### 3️⃣ localStorage 정리 (최후의 수단)
데이터를 잃고 싶지 않다면 **먼저 CSV로 내보내기** 후 진행:

```javascript
// localStorage 상태 확인
debugStorageStatus()

// 구버전 데이터만 삭제
emergencyClearOldData()

// 전체 삭제 (주의!)
localStorage.clear()
location.reload()
```

#### 4️⃣ 개선 사항 (v2.4.0 - 하이브리드 저장소)

**🚀 핵심 개선사항**
- ✅ **하이브리드 저장소**: LocalStorage + Supabase 지원
- ✅ **서버 사이드 필터링**: 대용량 데이터 빠른 처리
- ✅ **자동 마이그레이션**: LocalStorage → Supabase 원클릭
- ✅ **Vercel 최적화**: Edge Functions, 번들 최적화
- ✅ **메모리 관리**: 누수 방지, cleanup 강화

**🔧 성능 최적화**
- ✅ Worker 폴링: 15초 → 30초 (CPU -50%)
- ✅ 진행률 업데이트: 2초 → 10초 (리렌더링 -80%)
- ✅ 페이지당 항목: 100개 → 50개 (렌더링 +100%)
- ✅ 배치 크기: 3개 → 2개 (안정성 향상)
- ✅ 긴급복구 버튼 (즉시 초기화)

#### 5️⃣ 예방 방법
- 데이터가 5,000개 이상이면 주기적으로 CSV 내보내기
- 불필요한 키워드 삭제
- localStorage 사용량 80% 이상 시 "긴급 복구" 버튼 클릭

---

**제작**: 2025-10-04  
**버전**: 2.5.0 - 백그라운드 자동수집 + 점진적 렌더링

#   n k e y w o r d 
 
 