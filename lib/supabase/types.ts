// Supabase 데이터베이스 타입 정의
export interface Database {
  public: {
    Tables: {
      keywords: {
        Row: {
          id: number;
          keyword: string;
          root_keyword: string | null;
          monthly_pc_search: number;
          monthly_mobile_search: number;
          total_search: number;
          competition: string | null;
          blog_total_count: number | null;
          cafe_total_count: number | null;
          news_total_count: number | null;
          webkr_total_count: number | null;
          monthly_pc_clicks: number | null;
          monthly_mobile_clicks: number | null;
          monthly_pc_click_rate: number | null;
          monthly_mobile_click_rate: number | null;
          monthly_ad_count: number | null;
          used_as_seed: boolean;
          seed_depth: number;
          user_id: string | null;
          queried_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          keyword: string;
          root_keyword?: string | null;
          monthly_pc_search?: number;
          monthly_mobile_search?: number;
          competition?: string | null;
          blog_total_count?: number | null;
          cafe_total_count?: number | null;
          news_total_count?: number | null;
          webkr_total_count?: number | null;
          monthly_pc_clicks?: number | null;
          monthly_mobile_clicks?: number | null;
          monthly_pc_click_rate?: number | null;
          monthly_mobile_click_rate?: number | null;
          monthly_ad_count?: number | null;
          used_as_seed?: boolean;
          seed_depth?: number;
          user_id?: string | null;
          queried_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          keyword?: string;
          root_keyword?: string | null;
          monthly_pc_search?: number;
          monthly_mobile_search?: number;
          competition?: string | null;
          blog_total_count?: number | null;
          cafe_total_count?: number | null;
          news_total_count?: number | null;
          webkr_total_count?: number | null;
          monthly_pc_clicks?: number | null;
          monthly_mobile_clicks?: number | null;
          monthly_pc_click_rate?: number | null;
          monthly_mobile_click_rate?: number | null;
          monthly_ad_count?: number | null;
          used_as_seed?: boolean;
          seed_depth?: number;
          user_id?: string | null;
          queried_at?: string;
          updated_at?: string;
        };
      };
      batch_jobs: {
        Row: {
          id: string;
          user_id: string | null;
          status: string;
          total_keywords: number | null;
          processed_keywords: number;
          started_at: string | null;
          completed_at: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          status?: string;
          total_keywords?: number | null;
          processed_keywords?: number;
          started_at?: string | null;
          completed_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          status?: string;
          total_keywords?: number | null;
          processed_keywords?: number;
          started_at?: string | null;
          completed_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
      };
      keyword_stats: {
        Row: {
          id: number;
          total_keywords: number | null;
          total_with_doc_counts: number | null;
          avg_total_search: number | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          total_keywords?: number | null;
          total_with_doc_counts?: number | null;
          avg_total_search?: number | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          total_keywords?: number | null;
          total_with_doc_counts?: number | null;
          avg_total_search?: number | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      keyword_performance_stats: {
        Row: {
          total_keywords: number | null;
          with_doc_counts: number | null;
          avg_search_volume: number | null;
          max_search_volume: number | null;
          min_search_volume: number | null;
          unique_root_keywords: number | null;
          used_as_seeds: number | null;
          auto_collected: number | null;
        };
      };
      top_keywords: {
        Row: {
          keyword: string;
          total_search: number;
          competition: string | null;
          cafe_total_count: number | null;
          queried_at: string;
        };
      };
    };
    Functions: {
      update_keyword_stats: {
        Args: Record<string, never>;
        Returns: void;
      };
      refresh_top_keywords: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
  };
}
