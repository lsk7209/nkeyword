# API 키 관리 가이드

## 개요

이 프로젝트는 다수의 네이버 API 키를 로테이션하면서 사용하여 API 호출 한도를 효율적으로 관리합니다.

## API 키 종류

### 1. 검색광고 API 키
- **용도**: 연관검색어 조회 (`/api/keywords/related`)
- **필요 정보**:
  - `customer_id`: 고객 ID
  - `api_key`: API 키
  - `secret_key`: 시크릿 키
- **현재 등록 수**: 5개

### 2. 오픈 API 키
- **용도**: 
  - 문서수 조회 (`/api/documents/count`)
  - 통합 검색 결과 (`/api/search/naver`)
- **필요 정보**:
  - `client_id`: 클라이언트 ID
  - `client_secret`: 클라이언트 시크릿
- **현재 등록 수**: 9개

## 설정 방법

### 초기 설정

1. `lib/api-keys.example.ts` 파일을 참고하여 `lib/api-keys.ts` 생성
2. 실제 API 키 정보를 입력
3. 파일은 자동으로 `.gitignore`에 포함되어 Git에 커밋되지 않음

### API 키 추가

`lib/api-keys.ts` 파일에서 배열에 새로운 키 객체를 추가:

```typescript
// 검색광고 API 키 추가
export const SEARCH_AD_KEYS: SearchAdKey[] = [
  // 기존 키들...
  {
    name: "검색광고API키6",
    customer_id: "새로운_고객_ID",
    api_key: "새로운_API_키",
    secret_key: "새로운_시크릿_키"
  }
];

// 오픈 API 키 추가
export const OPEN_API_KEYS: OpenApiKey[] = [
  // 기존 키들...
  {
    name: "OpenAPI키10",
    client_id: "새로운_클라이언트_ID",
    client_secret: "새로운_클라이언트_시크릿"
  }
];
```

## 로테이션 방식

### 라운드 로빈 (Round Robin)
- **기본 동작**: 키를 순차적으로 사용
- **사용 함수**: `getNextSearchAdKey()`, `getNextOpenApiKey()`
- **특징**: 모든 키를 균등하게 사용하여 부하 분산

```typescript
// 예시: API 호출마다 다음 키 사용
const apiKey = getNextSearchAdKey();
// 1번 → 2번 → 3번 → 4번 → 5번 → 1번 → ...
```

### 랜덤 선택
- **사용 함수**: `getRandomSearchAdKey()`, `getRandomOpenApiKey()`
- **특징**: 무작위로 키 선택

## 에러 처리 및 재시도

### 검색광고 API (`/api/keywords/related`)
```typescript
// 모든 키를 순회하면서 시도
for (let i = 0; i < SEARCH_AD_KEYS.length; i++) {
  try {
    const apiKey = getNextSearchAdKey();
    const response = await fetch(...);
    // 성공 시 즉시 반환
    return response;
  } catch (error) {
    // 실패 시 다음 키로 재시도
    continue;
  }
}
// 모든 키 실패 시 에러 반환
```

### 문서수 조회 API (`/api/documents/count`)
- 로테이션으로 선택된 키 1개만 사용
- 실패 시 에러 반환 (재시도 없음)

## 로그 확인

서버 콘솔에서 API 키 사용 현황을 확인할 수 있습니다:

```bash
[검색광고 API] 시도 1/5 - 검색광고API키1
[검색광고 API] 성공 - 검색광고API키1, 키워드 50개
[문서수 API] 성공 - OpenAPI키3, 키워드: 맥북
[검색 API] 사용 - OpenAPI키4, 검색어: 아이폰
```

## 보안 주의사항

### ⚠️ 중요
- `lib/api-keys.ts` 파일은 **절대로** Git에 커밋하지 마세요
- `.gitignore`에 자동으로 포함되어 있음
- 프론트엔드에서는 접근 불가 (서버 사이드 전용)

### 파일 구조
```
lib/
├── api-keys.ts           # 실제 키 (Git에 커밋 X)
├── api-keys.example.ts   # 템플릿 (Git에 커밋 O)
└── naver-api.ts          # API 헬퍼 함수
```

## API 호출 한도

### 네이버 검색광고 API
- **일일 한도**: 계정별 상이
- **권장 전략**: 5개 키로 부하 분산

### 네이버 오픈 API (검색 API)
- **일일 한도**: 25,000회 (전체 검색 API 합산)
- **권장 전략**: 9개 키로 부하 분산 (키당 약 2,777회)

## 키 추가 가이드

### 검색광고 API 키 발급
1. [네이버 검색광고](https://searchad.naver.com/) 접속
2. 도구 > API 설정
3. 새 API 키 생성
4. Customer ID, API Key, Secret Key 복사

### 오픈 API 키 발급
1. [네이버 개발자 센터](https://developers.naver.com/) 접속
2. Application 등록
3. 검색 API 사용 설정
4. Client ID, Client Secret 복사

## 모니터링

### API 키 개수 확인
```typescript
import { getKeyCount } from '@/lib/api-keys';

const count = getKeyCount();
console.log(`검색광고 키: ${count.searchAdKeys}개`);
console.log(`오픈API 키: ${count.openApiKeys}개`);
```

### 사용 현황 로그
- 서버 콘솔에서 실시간 확인
- 각 API 호출 시 사용된 키와 결과 기록

## 문제 해결

### Q: API 키가 작동하지 않아요
**A**: 
1. 키 정보가 정확한지 확인
2. API 사용 설정이 되어 있는지 확인
3. 일일 한도를 초과하지 않았는지 확인
4. 서버 콘솔 로그 확인

### Q: 모든 키가 실패해요
**A**:
1. 네이버 API 서버 상태 확인
2. 네트워크 연결 확인
3. 키워드 유효성 확인 (50자 이하)
4. 특수문자 인코딩 확인

### Q: 키를 더 추가하고 싶어요
**A**: 
위의 "API 키 추가" 섹션 참조하여 배열에 객체만 추가하면 됩니다.

## 향후 개선 사항

- [ ] Redis를 활용한 분산 환경 키 로테이션
- [ ] API 키별 사용량 추적 및 통계
- [ ] 자동 키 헬스체크 시스템
- [ ] 키별 우선순위 설정
- [ ] 동적 키 추가/제거 API

---

**최종 업데이트**: 2025-10-04

