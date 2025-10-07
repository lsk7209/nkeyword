import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// 🚀 환경변수가 없을 때 더미 클라이언트 생성 (에러 방지)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

// Supabase 설정 여부 확인
export const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 브라우저용 클라이언트 (Anon Key)
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// 서버 사이드용 클라이언트 (Service Role Key)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// 연결 테스트
export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('keywords')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    console.log('[Supabase] 연결 성공');
    return true;
  } catch (error) {
    console.error('[Supabase] 연결 실패:', error);
    return false;
  }
}
