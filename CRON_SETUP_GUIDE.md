# 🕐 크론 작업 설정 가이드

## 📌 개요

사용자 접속 없이도 **자동으로 문서수를 수집**하는 크론 작업 설정 가이드입니다.

---

## 🎯 크론 작업 종류

### 1. **문서수 자동 수집** (신규!)
- **시간**: 매일 새벽 1시
- **작업**: 문서수 없는 키워드 자동 수집
- **대상**: 최대 100개 키워드
- **API**: `/api/documents/auto-collect`

### 2. **트렌드 키워드 수집**
- **시간**: 매시간 정각
- **작업**: 네이버 트렌드 키워드 수집
- **API**: `/api/trending/collect`

### 3. **데이터 정리**
- **시간**: 매일 새벽 2시
- **작업**: 30일 이상 된 데이터 삭제

### 4. **통계 업데이트**
- **시간**: 매일 새벽 3시
- **작업**: 일별 통계 계산

---

## 🚀 설정 방법

### **Option 1: Vercel Cron Jobs** (권장)

Vercel Pro 플랜 이상에서 사용 가능합니다.

#### **1단계: vercel.json 확인**

이미 설정되어 있습니다:

```json
{
  "crons": [
    {
      "path": "/api/documents/auto-collect",
      "schedule": "0 1 * * *"
    }
  ]
}
```

#### **2단계: 환경 변수 설정**

Vercel 대시보드 → Settings → Environment Variables:

```env
# 크론 인증용 시크릿 키
CRON_SECRET=your-random-secret-here

# 베이스 URL (자동 설정되지만 명시 권장)
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app

# 저장소 모드 (supabase 모드에서만 크론 작동)
NEXT_PUBLIC_STORAGE_MODE=supabase
```

#### **3단계: 배포**

```bash
vercel deploy
```

#### **4단계: 확인**

Vercel 대시보드 → Cron Jobs 탭에서 실행 내역 확인

---

### **Option 2: GitHub Actions** (무료)

LocalStorage 모드에서도 사용 가능한 방법입니다.

#### **1단계: GitHub Actions 워크플로우 생성**

`.github/workflows/auto-collect.yml`:

```yaml
name: Auto Collect Document Counts

on:
  schedule:
    # 매일 UTC 16:00 (한국 시간 새벽 1시)
    - cron: '0 16 * * *'
  workflow_dispatch: # 수동 실행 가능

jobs:
  auto-collect:
    runs-on: ubuntu-latest
    
    steps:
      - name: Trigger Auto Collection
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/documents/auto-collect" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

#### **2단계: GitHub Secrets 설정**

Repository → Settings → Secrets and variables → Actions:

```
APP_URL=https://your-app.vercel.app
CRON_SECRET=your-random-secret-here
```

#### **3단계: 활성화**

파일을 커밋하면 자동으로 활성화됩니다.

---

### **Option 3: 외부 크론 서비스** (무료)

#### **추천 서비스**:

1. **cron-job.org** (무료)
   - 5분 간격까지 지원
   - 이메일 알림
   - https://cron-job.org

2. **EasyCron** (무료 플랜)
   - 매일 1회 무료
   - 간단한 UI
   - https://www.easycron.com

3. **Uptime Robot** (무료)
   - 5분 간격 모니터링
   - HTTP 요청 가능
   - https://uptimerobot.com

#### **설정 예시 (cron-job.org)**:

1. 계정 생성
2. "Create Cronjob" 클릭
3. 설정:
   ```
   Title: Auto Collect Document Counts
   URL: https://your-app.vercel.app/api/documents/auto-collect
   Schedule: Daily at 1:00 AM (KST)
   HTTP Method: POST
   Headers:
     Authorization: Bearer your-cron-secret
     Content-Type: application/json
   ```

---

## ⚙️ LocalStorage vs Supabase

### **LocalStorage 모드** (기본값)

❌ **서버 사이드 크론 작업 불가**
- LocalStorage는 브라우저에만 존재
- 서버에서 데이터 접근 불가능

✅ **대안: 클라이언트 자동수집 사용**
- 데이터 페이지에서 **🔵 백그라운드 수집 ON**
- 사용자가 페이지 접속 시 자동 수집

### **Supabase 모드** (대용량용)

✅ **서버 사이드 크론 작업 가능**
- 데이터베이스에서 키워드 조회
- 서버에서 자동으로 수집
- 사용자 접속 불필요

---

## 📊 크론 작업 스케줄

```
00:00 ─────────────────────────────────
01:00 ── 🔵 문서수 자동 수집 (100개)
02:00 ── 🗑️ 오래된 데이터 정리
03:00 ── 📊 통계 업데이트
04:00 ─────────────────────────────────
...
매시간 ─ 🔥 트렌드 키워드 수집
```

---

## 🔍 테스트 방법

### **수동 실행 (개발 환경)**

```bash
# 1. 환경 변수 설정
export CRON_SECRET="your-secret"
export NEXT_PUBLIC_BASE_URL="http://localhost:3000"
export NEXT_PUBLIC_STORAGE_MODE="supabase"

# 2. 서버 시작
npm run dev

# 3. API 호출 (새 터미널)
curl -X POST "http://localhost:3000/api/documents/auto-collect" \
  -H "Authorization: Bearer your-secret" \
  -H "Content-Type: application/json"
```

### **상태 확인**

```bash
# GET 요청으로 상태 확인
curl "http://localhost:3000/api/documents/auto-collect" \
  -H "Authorization: Bearer your-secret"
```

**응답 예시 (LocalStorage 모드)**:
```json
{
  "status": "info",
  "mode": "localStorage",
  "message": "Server-side auto-collection not supported in LocalStorage mode",
  "recommendation": "Use client-side 백그라운드 수집 ON feature"
}
```

**응답 예시 (Supabase 모드)**:
```json
{
  "status": "success",
  "mode": "supabase",
  "data": {
    "totalKeywords": 5234,
    "withoutDocCounts": 142,
    "collectionProgress": "97.3%"
  }
}
```

---

## 📈 모니터링

### **Vercel 대시보드**

1. Vercel 프로젝트 → Deployments
2. Functions 탭 → Cron Jobs
3. 실행 내역 및 로그 확인

### **로그 확인**

Vercel Functions 로그:
```
[SCHEDULER] Triggering auto document count collection (daily)...
[SCHEDULER] Starting auto document count collection job...
[SCHEDULER] Triggering document count collection via API...
[AUTO-COLLECT] Starting auto document count collection...
[AUTO-COLLECT] Supabase mode detected - starting collection...
[AUTO-COLLECT] Found 142 keywords without document counts
[AUTO-COLLECT] Collection completed
```

### **이메일 알림 설정**

외부 크론 서비스 (cron-job.org 등)에서:
- 실패 시 이메일 알림
- 성공/실패 통계
- 실행 이력

---

## 🚨 문제 해결

### **1. "Unauthorized" 오류**

**원인**: CRON_SECRET 불일치

**해결**:
```bash
# .env.local 확인
cat .env.local | grep CRON_SECRET

# Vercel 환경 변수 확인
vercel env ls
```

### **2. "LocalStorage mode" 메시지**

**원인**: LocalStorage 모드에서 크론 실행

**해결**:
- **Option A**: Supabase로 전환
  ```env
  NEXT_PUBLIC_STORAGE_MODE=supabase
  ```
- **Option B**: 클라이언트 자동수집 사용
  ```
  데이터 페이지 → 🔵 백그라운드 수집 ON
  ```

### **3. 크론 작업이 실행되지 않음**

**확인 사항**:
1. Vercel Pro 플랜 이상인지 확인
2. `vercel.json`에 crons 설정 있는지 확인
3. 환경 변수 `CRON_SECRET` 설정되었는지 확인
4. 최근 배포가 성공했는지 확인

---

## 💡 권장 설정

### **소규모 (5,000개 이하)**

```
저장소: LocalStorage
자동수집: 클라이언트 백그라운드 수집
크론: 불필요
```

### **중규모 (5,000-50,000개)**

```
저장소: Supabase
자동수집: Vercel Cron (매일 1회)
크론: vercel.json 설정
```

### **대규모 (50,000개 이상)**

```
저장소: Supabase
자동수집: Vercel Cron (하루 2회)
크론: 새벽 1시, 오후 1시
추가: 배치 크기 증가 (100 → 500)
```

---

## 📚 참고 문서

- [Vercel Cron Jobs 문서](https://vercel.com/docs/cron-jobs)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md) - 성능 최적화
- [SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md) - Supabase 설정

---

## 🎉 요약

### **LocalStorage 사용자**

✅ **클라이언트 자동수집 사용**
```
데이터 페이지 → 🔵 백그라운드 수집 ON
```

### **Supabase 사용자**

✅ **서버 크론 작업 사용**
```
1. vercel.json 설정 확인
2. CRON_SECRET 환경 변수 설정
3. Vercel 배포
4. 매일 새벽 1시 자동 실행!
```

---

**버전**: 2.5.0  
**최종 업데이트**: 2025-10-07

