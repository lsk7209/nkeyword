# 🚀 성능 최적화 가이드

## 📊 성능 문제 진단

### 현재 문제

1. **LocalStorage 한계**
   - 용량 제한: 5-10MB (약 5,000개 키워드)
   - 느려지는 현상: 데이터 증가 시 JSON 파싱 부하
   - 메모리 누수: Worker 무한 폴링

2. **프론트엔드 과부하**
   - 클라이언트 사이드 필터링/정렬
   - 대량 데이터 렌더링
   - 불필요한 리렌더링

---

## ✅ 해결 방법

### 1. **하이브리드 저장소 시스템** (권장)

#### **LocalStorage 모드** (기본값)
- ✅ **빠른 속도**: 네트워크 불필요
- ✅ **오프라인 작동**: 인터넷 없어도 사용
- ❌ **용량 제한**: 5-10MB (5,000개)
- ❌ **동기화 불가**: 디바이스 간 공유 불가

**사용 시기**: 
- 개인 사용
- 5,000개 이하 데이터
- 빠른 속도 필요

#### **Supabase 모드** (대용량용)
- ✅ **무제한 용량**: 100만개+ 저장
- ✅ **서버 사이드 필터링**: 빠른 쿼리
- ✅ **실시간 동기화**: 여러 디바이스에서 접근
- ❌ **네트워크 필요**: 인터넷 필수
- ❌ **약간 느림**: API 호출 시간

**사용 시기**:
- 팀 사용
- 10,000개 이상 데이터
- 디바이스 간 동기화 필요

---

### 2. **저장소 모드 전환**

#### **환경 변수 설정**

`.env.local` 파일에 추가:

```env
# LocalStorage 모드 (기본값, 권장)
NEXT_PUBLIC_STORAGE_MODE=localStorage

# 또는 Supabase 모드 (대용량용)
NEXT_PUBLIC_STORAGE_MODE=supabase

# Supabase 설정 (supabase 모드 사용 시)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### **설정 방법**

**옵션 1: UI에서 전환** (추천)

데이터 페이지 상단에서:
1. "저장소 설정" 버튼 클릭
2. "LocalStorage" 또는 "Supabase" 선택
3. 자동 마이그레이션 시작

**옵션 2: 환경 변수 수정**

```bash
# .env.local 파일 편집
NEXT_PUBLIC_STORAGE_MODE=supabase

# 서버 재시작
npm run dev
```

---

### 3. **성능 최적화 설정**

#### **페이지당 항목 수 조정**

```env
# 기본값: 50개 (권장)
NEXT_PUBLIC_DEFAULT_PAGE_SIZE=50

# 빠른 렌더링: 30개
NEXT_PUBLIC_DEFAULT_PAGE_SIZE=30

# 많이 보기: 100개 (느릴 수 있음)
NEXT_PUBLIC_DEFAULT_PAGE_SIZE=100
```

#### **Worker 폴링 간격**

```env
# 기본값: 30초 (권장)
NEXT_PUBLIC_WORKER_POLL_INTERVAL=30

# 더 빠른 업데이트: 15초 (CPU 부하 증가)
NEXT_PUBLIC_WORKER_POLL_INTERVAL=15

# 더 느린 업데이트: 60초 (CPU 부하 감소)
NEXT_PUBLIC_WORKER_POLL_INTERVAL=60
```

---

## 📈 성능 비교

| 항목 | LocalStorage | Supabase |
|------|--------------|----------|
| **속도** | ⚡ 매우 빠름 | 🐢 보통 |
| **용량** | 5-10MB | 무제한 |
| **필터링** | 클라이언트 (느림) | 서버 (빠름) |
| **정렬** | 클라이언트 (느림) | 서버 (빠름) |
| **동기화** | ❌ 불가능 | ✅ 가능 |
| **오프라인** | ✅ 가능 | ❌ 불가능 |

---

## 🎯 권장 구성

### **개인 사용자** (5,000개 이하)

```env
NEXT_PUBLIC_STORAGE_MODE=localStorage
NEXT_PUBLIC_DEFAULT_PAGE_SIZE=50
NEXT_PUBLIC_WORKER_POLL_INTERVAL=30
```

### **중급 사용자** (5,000-50,000개)

```env
NEXT_PUBLIC_STORAGE_MODE=supabase
NEXT_PUBLIC_DEFAULT_PAGE_SIZE=50
NEXT_PUBLIC_WORKER_POLL_INTERVAL=30
```

### **대용량 사용자** (50,000개 이상)

```env
NEXT_PUBLIC_STORAGE_MODE=supabase
NEXT_PUBLIC_DEFAULT_PAGE_SIZE=30
NEXT_PUBLIC_WORKER_POLL_INTERVAL=60
```

---

## 🔧 마이그레이션 가이드

### **LocalStorage → Supabase**

#### **1단계: Supabase 설정**

`SUPABASE_SETUP_GUIDE.md` 참고하여:
1. Supabase 프로젝트 생성
2. 데이터베이스 마이그레이션 실행
3. API 키 복사

#### **2단계: 환경 변수 설정**

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

#### **3단계: 데이터 마이그레이션**

**옵션 A: UI에서 자동 마이그레이션** (권장)

1. 데이터 페이지 → 저장소 설정
2. "Supabase로 전환" 버튼 클릭
3. 자동 마이그레이션 시작 (100개씩 배치 업로드)
4. 완료 후 페이지 새로고침

**옵션 B: 수동 마이그레이션**

```javascript
// 브라우저 콘솔에서 실행

// 1. LocalStorage 데이터 내보내기
const data = localStorage.getItem('nkeyword:dataset:v2');
const keywords = JSON.parse(LZString.decompress(data));
console.log('키워드 개수:', keywords.length);

// 2. JSON 파일로 다운로드
const blob = new Blob([JSON.stringify(keywords, null, 2)], { 
  type: 'application/json' 
});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'keywords-backup.json';
a.click();

// 3. 파일을 scripts/import-to-supabase.ts로 가져오기
```

#### **4단계: 저장소 모드 전환**

```env
NEXT_PUBLIC_STORAGE_MODE=supabase
```

서버 재시작:
```bash
npm run dev
```

---

## 🚨 문제 해결

### **1. 페이지가 여전히 느림**

**원인**: 데이터가 너무 많음

**해결**:
1. 페이지당 항목 수 줄이기: `NEXT_PUBLIC_DEFAULT_PAGE_SIZE=30`
2. 불필요한 키워드 삭제
3. Supabase로 전환

### **2. Supabase 연결 오류**

**원인**: 환경 변수 미설정

**해결**:
```bash
# .env.local 파일 확인
cat .env.local

# Supabase 연결 테스트
npm run test:supabase
```

### **3. 마이그레이션 실패**

**원인**: 용량 부족 또는 네트워크 오류

**해결**:
1. LocalStorage 데이터 백업 (CSV 내보내기)
2. 브라우저 캐시 정리
3. 100개씩 수동 업로드

---

## 📊 성능 모니터링

### **브라우저 콘솔에서 확인**

```javascript
// LocalStorage 사용량
debugStorageStatus()

// 데이터 개수
const dataset = loadDataset()
console.log('키워드 개수:', dataset.length)

// 필터링된 데이터
const filtered = dataset.filter(item => item.totalSearch > 1000)
console.log('1000 이상:', filtered.length)
```

### **Supabase 대시보드**

1. Supabase 대시보드 → Database
2. Table: `keywords`
3. 통계 확인:
   - 총 행 수
   - 저장 공간
   - 쿼리 성능

---

## 🎯 Vercel 배포 최적화

### **환경 변수 설정**

Vercel 대시보드:
1. Settings → Environment Variables
2. 추가:
   ```
   NEXT_PUBLIC_STORAGE_MODE=supabase
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
   SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
   ```

### **빌드 최적화**

`next.config.ts`:
```typescript
export default {
  // 정적 페이지 생성
  output: 'standalone',
  
  // 이미지 최적화
  images: {
    domains: ['supabase.co'],
  },
  
  // 번들 크기 감소
  swcMinify: true,
  
  // Edge Functions 활성화
  experimental: {
    serverActions: true,
  },
};
```

### **ISR (Incremental Static Regeneration)**

API 라우트에 캐싱 추가:
```typescript
export const revalidate = 60; // 60초마다 재생성
```

---

## 📚 참고 문서

- [SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md) - Supabase 설정
- [SUPABASE_MIGRATION_PLAN.md](./SUPABASE_MIGRATION_PLAN.md) - 마이그레이션 계획
- [API_KEYS_GUIDE.md](./API_KEYS_GUIDE.md) - API 키 관리
- [README.md](./README.md) - 전체 가이드

---

## 💡 추가 팁

### **1. 정기적인 데이터 정리**

- 주 1회: 불필요한 키워드 삭제
- 월 1회: CSV 백업
- 분기 1회: 전체 최적화

### **2. 필터 사용 최소화**

- 필터가 많을수록 느려짐
- 자주 사용하는 필터만 사용
- 정렬은 1-2개만 적용

### **3. 페이지네이션 활용**

- 한 번에 50개씩만 보기
- 필요할 때만 다음 페이지
- 무한 스크롤 비활성화 (기본값)

### **4. 브라우저 캐시 정리**

- Chrome: `Ctrl + Shift + Delete`
- 쿠키 및 캐시 삭제
- 월 1회 권장

---

**버전**: 2.3.0  
**최종 업데이트**: 2025-10-06

