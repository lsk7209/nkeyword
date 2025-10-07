# 🚀 Supabase 설정 가이드

Vercel에서 영구 데이터 저장을 위한 Supabase 설정 방법입니다.

## 📋 **1단계: Supabase 프로젝트 생성**

### **1.1 Supabase 계정 생성**
1. [https://supabase.com](https://supabase.com) 접속
2. **"Start your project"** 클릭
3. GitHub 계정으로 로그인 (권장)

### **1.2 새 프로젝트 생성**
1. **"New Project"** 클릭
2. **Organization**: 개인 계정 선택
3. **Project Name**: `nkeyword-db` (또는 원하는 이름)
4. **Database Password**: 강력한 비밀번호 설정 (기록해두세요!)
5. **Region**: `Northeast Asia (Seoul)` 선택 (한국 사용자)
6. **"Create new project"** 클릭

## 📋 **2단계: 데이터베이스 테이블 생성**

### **2.1 SQL Editor에서 테이블 생성**
1. Supabase 대시보드에서 **"SQL Editor"** 클릭
2. **"New query"** 클릭
3. 다음 SQL 코드를 복사하여 실행:

```sql
-- 키워드 테이블 생성
CREATE TABLE keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT UNIQUE NOT NULL,
  monthly_pc_search INTEGER NOT NULL DEFAULT 0,
  monthly_mobile_search INTEGER NOT NULL DEFAULT 0,
  total_search INTEGER NOT NULL DEFAULT 0,
  competition TEXT NOT NULL DEFAULT '중',
  monthly_pc_clicks INTEGER,
  monthly_mobile_clicks INTEGER,
  monthly_pc_click_rate DECIMAL(5,2),
  monthly_mobile_click_rate DECIMAL(5,2),
  monthly_ad_count INTEGER,
  blog_total_count INTEGER,
  cafe_total_count INTEGER,
  news_total_count INTEGER,
  webkr_total_count INTEGER,
  root_keyword TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX idx_keywords_keyword ON keywords(keyword);
CREATE INDEX idx_keywords_total_search ON keywords(total_search DESC);
CREATE INDEX idx_keywords_created_at ON keywords(created_at DESC);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "키워드 읽기 허용" ON keywords
  FOR SELECT USING (true);

-- 인증된 사용자만 쓰기 가능
CREATE POLICY "키워드 쓰기 허용" ON keywords
  FOR ALL USING (auth.role() = 'authenticated');
```

### **2.2 테이블 생성 확인**
1. **"Table Editor"** 클릭
2. `keywords` 테이블이 생성되었는지 확인

## 📋 **3단계: API 키 복사**

### **3.1 프로젝트 설정에서 API 키 확인**
1. Supabase 대시보드에서 **"Settings"** → **"API"** 클릭
2. 다음 정보를 복사:

```
Project URL: https://your-project-id.supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📋 **4단계: Vercel 환경 변수 설정**

### **4.1 Vercel 대시보드에서 환경 변수 추가**
1. [https://vercel.com](https://vercel.com) 접속
2. 프로젝트 선택
3. **"Settings"** → **"Environment Variables"** 클릭
4. 다음 환경 변수들을 추가:

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project-id.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview, Development |
| `NEXT_PUBLIC_STORAGE_MODE` | `supabase` | Production, Preview, Development |

### **4.2 환경 변수 저장 후 재배포**
1. **"Save"** 클릭
2. **"Deployments"** → **"Redeploy"** 클릭

## 📋 **5단계: 연결 테스트**

### **5.1 Vercel 사이트에서 테스트**
1. 배포 완료 후 Vercel 사이트 접속
2. **데이터 메뉴** 클릭
3. **"🧪 테스트 데이터 생성"** 버튼 클릭
4. **"🔄 데이터 새로고침"** 버튼 클릭
5. 데이터가 표시되는지 확인

### **5.2 Supabase에서 데이터 확인**
1. Supabase 대시보드 → **"Table Editor"**
2. `keywords` 테이블에서 데이터 확인

## 🔧 **문제 해결**

### **연결 실패 시**
1. **환경 변수 확인**: Vercel에서 모든 환경 변수가 올바르게 설정되었는지 확인
2. **API 키 확인**: Supabase에서 API 키가 올바른지 확인
3. **RLS 정책 확인**: 테이블의 RLS 정책이 올바르게 설정되었는지 확인

### **데이터가 안 보일 때**
1. **브라우저 콘솔 확인**: F12 → Console 탭에서 오류 메시지 확인
2. **Vercel 함수 로그 확인**: Vercel 대시보드 → Functions 탭에서 로그 확인
3. **Supabase 로그 확인**: Supabase 대시보드 → Logs 탭에서 API 호출 확인

## 🎯 **완료!**

이제 Vercel에서 **영구 데이터 저장**이 가능합니다!

- ✅ **데이터 지속성**: 서버 재시작해도 데이터 유지
- ✅ **확장성**: 대용량 데이터 처리 가능
- ✅ **보안**: RLS 정책으로 안전한 데이터 접근
- ✅ **성능**: 인덱스로 빠른 검색