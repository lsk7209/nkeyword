export interface KeywordData {
  keyword: string;
  monthlyPcSearch: number;
  monthlyMobileSearch: number;
  totalSearch: number;
  competition: string;
  monthlyPcClicks?: number;
  monthlyMobileClicks?: number;
  monthlyPcClickRate?: number;
  monthlyMobileClickRate?: number;
  monthlyAdCount?: number;
  // 문서수
  blogTotalCount?: number;
  cafeTotalCount?: number;
  newsTotalCount?: number;
  webkrTotalCount?: number;
}

// 정렬 관련 타입
export type SortField = keyof KeywordData;
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export type MultiSortConfig = SortConfig[];

export interface ApiResponse {
  success: boolean;
  keyword?: string;
  total?: number;
  keywords?: KeywordData[];
  error?: string;
  details?: string;
}

// export type SortField = 'keyword' | 'totalSearch' | 'competition';
// export type SortOrder = 'asc' | 'desc';

export interface SearchFilters {
  minSearch?: number;
  maxSearch?: number;
  competition?: string[];
}

export interface Filters {
  keyword: string;
  minSearch: string;
  maxSearch: string;
  competition: string[];
  hasDocCounts: boolean;
  minBlogCount: string;
  maxBlogCount: string;
  minCafeCount: string;
  maxCafeCount: string;
  minNewsCount: string;
  maxNewsCount: string;
  minWebkrCount: string;
  maxWebkrCount: string;
}

// Naver Search API types
export interface NaverSearchItem {
  title: string;
  link: string;
  description: string;
  bloggername?: string;
  bloggerlink?: string;
  postdate?: string;
  thumbnail?: string;
  price?: string;
  category?: string;
}

export interface NaverSearchResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverSearchItem[];
}

export interface NaverSearchApiResponse {
  success: boolean;
  query: string;
  results: {
    blog?: NaverSearchItem[];
    news?: NaverSearchItem[];
    book?: NaverSearchItem[];
    kin?: NaverSearchItem[];
    shop?: NaverSearchItem[];
    webkr?: NaverSearchItem[];
    cafe?: NaverSearchItem[];
    local?: NaverSearchItem[];
    image?: NaverSearchItem[];
  };
  totals?: {
    blog?: number;
    news?: number;
    book?: number;
    kin?: number;
    shop?: number;
    webkr?: number;
    cafe?: number;
    local?: number;
    image?: number;
  };
  error?: string;
}


