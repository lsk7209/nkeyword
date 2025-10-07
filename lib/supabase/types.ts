/**
 * Supabase 타입 정의 (임시 비활성화)
 * Vercel 빌드 오류 해결을 위해 더미 타입으로 대체
 */

export interface Database {
  public: {
    Tables: {
      keywords: {
        Row: {
          id: number;
          keyword: string;
          root_keyword: string;
          monthly_pc_search: number;
          monthly_mobile_search: number;
          competition: string;
          monthly_pc_clicks?: number;
          monthly_mobile_clicks?: number;
          monthly_pc_click_rate?: number;
          monthly_mobile_click_rate?: number;
          monthly_ad_count?: number;
          blog_total_count?: number;
          cafe_total_count?: number;
          news_total_count?: number;
          webkr_total_count?: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          keyword: string;
          root_keyword: string;
          monthly_pc_search: number;
          monthly_mobile_search: number;
          competition: string;
          monthly_pc_clicks?: number;
          monthly_mobile_clicks?: number;
          monthly_pc_click_rate?: number;
          monthly_mobile_click_rate?: number;
          monthly_ad_count?: number;
          blog_total_count?: number;
          cafe_total_count?: number;
          news_total_count?: number;
          webkr_total_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          keyword?: string;
          root_keyword?: string;
          monthly_pc_search?: number;
          monthly_mobile_search?: number;
          competition?: string;
          monthly_pc_clicks?: number;
          monthly_mobile_clicks?: number;
          monthly_pc_click_rate?: number;
          monthly_mobile_click_rate?: number;
          monthly_ad_count?: number;
          blog_total_count?: number;
          cafe_total_count?: number;
          news_total_count?: number;
          webkr_total_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      batch_jobs: {
        Row: {
          id: string;
          keywords: string[];
          status: string;
          progress_current: number;
          progress_total: number;
          results: any[];
          created_at: string;
          started_at?: string;
          completed_at?: string;
          error?: string;
        };
        Insert: {
          id: string;
          keywords: string[];
          status: string;
          progress_current: number;
          progress_total: number;
          results: any[];
          created_at?: string;
          started_at?: string;
          completed_at?: string;
          error?: string;
        };
        Update: {
          id?: string;
          keywords?: string[];
          status?: string;
          progress_current?: number;
          progress_total?: number;
          results?: any[];
          created_at?: string;
          started_at?: string;
          completed_at?: string;
          error?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
