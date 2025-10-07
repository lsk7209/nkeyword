'use client';

import { useState } from 'react';
import KeywordSearch from '@/components/KeywordSearch';
import KeywordResults from '@/components/KeywordResults';
import KeywordChart from '@/components/KeywordChart';
import ExportButton from '@/components/ExportButton';
import NaverSearchResults from '@/components/NaverSearchResults';
import type { KeywordData, SortField, SortOrder, NaverSearchApiResponse } from '@/lib/types';
import { addResults, updateDocumentCounts } from '@/lib/storage';

export default function Home() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<KeywordData[]>([]);
  const [naverResults, setNaverResults] = useState<NaverSearchApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState<SortField>('totalSearch');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSearch = async (searchKeyword: string) => {
    setIsLoading(true);
    setError('');
    setKeyword(searchKeyword);

    try {
      // 먼저 API 서버 상태 확인
      console.log('[프론트엔드] API 서버 상태 확인 중...');
      const healthResponse = await fetch('/api/health');
      if (!healthResponse.ok) {
        throw new Error('API 서버에 연결할 수 없습니다');
      }
      const healthData = await healthResponse.json();
      console.log('[프론트엔드] API 서버 상태:', healthData);

      // 병렬로 연관검색어와 네이버 검색 API 호출
      console.log('[프론트엔드] 연관검색어 API 호출 시작...');
      const [relatedResponse, naverResponse] = await Promise.all([
        fetch(`/api/keywords/related?keyword=${encodeURIComponent(searchKeyword)}`),
        fetch(`/api/search/naver?query=${encodeURIComponent(searchKeyword)}`)
      ]);

      console.log('[프론트엔드] API 응답 상태:', {
        related: relatedResponse.status,
        naver: naverResponse.status
      });

      const relatedData = await relatedResponse.json();
      const naverData = await naverResponse.json();

      console.log('[프론트엔드] API 응답 데이터:', {
        related: relatedData,
        naver: naverData
      });

      if (!relatedData.success) {
        throw new Error(relatedData.error || '연관검색어 조회 실패');
      }

      // 키워드 데이터 설정 (문서수는 나중에 백그라운드에서 조회)
      setResults(relatedData.keywords);
      setNaverResults(naverData.success ? naverData : null);
      
      // Persist to dataset with de-duplication (문서수 없이 저장)
      addResults(searchKeyword, relatedData.keywords as KeywordData[]);
      
      // 백그라운드에서 자동으로 문서수 수집 시작
      console.log('[프론트엔드] 백그라운드 문서수 수집 시작...');
      fetch('/api/documents/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keywords: relatedData.keywords.map((k: any) => k.keyword) }),
      }).then(response => response.json())
        .then(data => {
          if (data.success) {
            console.log(`[프론트엔드] 백그라운드 문서수 수집 응답:`, data);
            
            // jobId가 'cached_'로 시작하면 캐시된 결과 (폴링 불필요)
            if (data.jobId && data.jobId.startsWith('cached_')) {
              console.log('[프론트엔드] 모든 키워드가 캐시됨 - 즉시 로컬 스토리지 업데이트');
              
              // 캐시된 결과를 로컬 스토리지에 즉시 업데이트
              if (data.results && Array.isArray(data.results)) {
                data.results.forEach((result: any) => {
                  updateDocumentCounts(result.keyword, {
                    blog: result.counts.blog,
                    cafe: result.counts.cafe,
                    news: result.counts.news,
                    webkr: result.counts.webkr,
                  });
                });
                console.log(`[프론트엔드] 캐시된 문서수 ${data.results.length}개 업데이트 완료`);
              }
            } else if (data.jobId) {
              // 실제 배치 작업이 시작된 경우
              localStorage.setItem('nkeyword:currentJobId', data.jobId);
              localStorage.setItem('nkeyword:jobStartTime', Date.now().toString());
              console.log(`[프론트엔드] 배치 작업 시작됨: ${data.jobId}`);
            }
          } else {
            console.error('[프론트엔드] 백그라운드 문서수 수집 실패:', data.error);
          }
        })
        .catch(error => {
          console.error('[프론트엔드] 백그라운드 문서수 수집 오류:', error);
        });
    } catch (err) {
      console.error('[프론트엔드] 검색 오류:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setResults([]);
      setNaverResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * multiplier;
    }
    return String(aVal).localeCompare(String(bVal)) * multiplier;
  });

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="mb-8 text-center text-4xl font-bold">네이버 연관검색어 분석</h1>

      <KeywordSearch onSearch={handleSearch} isLoading={isLoading} />

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">"{keyword}" 연관검색어 {results.length}개</h2>
            <ExportButton data={sortedResults} keyword={keyword} />
          </div>

          <KeywordChart data={sortedResults.slice(0, 10)} />

          <KeywordResults
            data={sortedResults}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
          />

          {naverResults && <NaverSearchResults data={naverResults} />}
        </div>
      )}
    </main>
  );
}


