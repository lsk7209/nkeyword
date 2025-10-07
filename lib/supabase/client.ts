/**
 * Supabase 클라이언트 (임시 비활성화)
 * Vercel 빌드 오류 해결을 위해 더미 클라이언트로 대체
 */

// Supabase 설정 여부 확인
export const isSupabaseConfigured = false;

// 브라우저용 클라이언트 (더미)
export const supabase: any = {
  from: () => ({
    select: () => ({
      limit: () => ({
        data: [],
        error: null
      })
    }),
    insert: () => ({
      select: () => ({
        single: () => ({
          data: null,
          error: null
        })
      })
    }),
    update: () => ({
      eq: () => ({
        select: () => ({
          single: () => ({
            data: null,
            error: null
          })
        })
      })
    }),
    delete: () => ({
      eq: () => ({
        data: null,
        error: null
      })
    })
  })
};

// 서버 사이드용 클라이언트 (더미)
export const supabaseAdmin: any = {
  from: () => ({
    select: () => ({
      limit: () => ({
        data: [],
        error: null
      })
    }),
    insert: () => ({
      select: () => ({
        single: () => ({
          data: null,
          error: null
        })
      })
    }),
    update: () => ({
      eq: () => ({
        select: () => ({
          single: () => ({
            data: null,
            error: null
          })
        })
      })
    }),
    delete: () => ({
      eq: () => ({
        data: null,
        error: null
      })
    })
  })
};

// 연결 테스트 (더미)
export async function testConnection() {
  console.log('[Supabase] 연결 테스트 (더미)');
  return false;
}