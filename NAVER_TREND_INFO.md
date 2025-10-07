# 네이버 실시간 검색어 서비스 중단 안내

## 📢 중요 공지

**네이버는 2021년 2월 25일부로 실시간 검색어 서비스를 중단했습니다.**

이는 법률 개정(정보통신망법 제44조의2)에 따른 조치로, 모든 포털 사이트가 실시간 검색어 서비스를 중단했습니다.

## 🔄 대안

현재 시스템은 다음 방법으로 트렌드 키워드를 수집할 수 있습니다:

### 1. **Google Trends (무료, 추천!)**

`.env.local` 파일에 다음 설정:
```env
TREND_COLLECTOR="google"
```

**장점:**
- ✅ 완전 무료
- ✅ API 키 불필요
- ✅ 전 세계 트렌드 데이터
- ✅ 한국 데이터 지원

**단점:**
- ❌ 비공식 API (언제든 막힐 수 있음)
- ❌ 실시간이 아닌 일일 트렌드

### 2. **SerpApi (유료, 가장 안정적)**

`.env.local` 파일에 다음 설정:
```env
TREND_COLLECTOR="serpapi"
SERPAPI_KEY="your_api_key"
```

**장점:**
- ✅ 매우 안정적
- ✅ 실시간 데이터
- ✅ 구조화된 데이터
- ✅ 무료 플랜 있음 (월 100회)

**단점:**
- ❌ API 키 필요
- ❌ 무료 플랜 제한적

### 3. **테스트용 더미 데이터 (현재 설정)**

`.env.local` 파일에 다음 설정:
```env
TREND_COLLECTOR="naver"
```

**용도:**
- 개발 및 테스트용
- 실제 데이터 없이 UI 테스트
- 데모 목적

## 💡 권장 설정

### 개발/테스트 환경
```env
# 더미 데이터 사용 (무료, 즉시 사용 가능)
TREND_COLLECTOR="naver"
```

### 프로덕션 환경 (무료)
```env
# Google Trends 사용 (무료, API 키 불필요)
TREND_COLLECTOR="google"
```

### 프로덕션 환경 (유료, 안정적)
```env
# SerpApi 사용 (유료, 가장 안정적)
TREND_COLLECTOR="serpapi"
SERPAPI_KEY="your_serpapi_key"
```

## 🚀 설정 방법

1. `.env.local` 파일 생성 또는 수정
2. `TREND_COLLECTOR` 값 설정
3. 서버 재시작: `npm run dev`
4. 트렌드 페이지 확인: http://localhost:3000/trending

## 📝 참고 자료

- [네이버 실시간 검색어 중단 기사](https://www.yna.co.kr/view/AKR20210224159800017)
- [정보통신망법 개정안](https://www.law.go.kr/)
- [Google Trends](https://trends.google.com/trends/)
- [SerpApi](https://serpapi.com/)

---

**현재 상태:** 테스트용 더미 데이터 사용 중

**권장 조치:** Google Trends로 변경 (`TREND_COLLECTOR="google"`)
