'use client';

import { useEffect, useState } from 'react';
import type { TrendingKeyword, TimeRange } from '@/lib/types/trending';

export default function TrendingPage() {
  const [keywords, setKeywords] = useState<TrendingKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('realtime');
  const [category, setCategory] = useState('all');
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    fetchKeywords();
  }, [timeRange, category]);

  const fetchKeywords = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        limit: '20',
        timeRange,
        category,
      });

      const response = await fetch(`/api/trending/keywords?${params}`);
      const data = await response.json();

      if (data.status === 'success') {
        setKeywords(data.data.keywords || []);
        setLastUpdated(data.data.lastUpdated || '');
      } else {
        setError(data.message || '데이터를 불러올 수 없습니다');
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다');
      console.error('Trending fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryName = (cat: string) => {
    const names: Record<string, string> = {
      all: '전체',
      entertainment: '엔터테인먼트',
      sports: '스포츠',
      it: 'IT/기술',
      politics: '정치',
      economy: '경제',
      society: '사회',
      culture: '문화',
    };
    return names[cat] || cat;
  };

  const getChangeRateColor = (changeRate?: string) => {
    if (!changeRate) return 'text-gray-500';
    if (changeRate === 'NEW') return 'text-green-600 font-semibold';
    if (changeRate.startsWith('▲')) return 'text-red-500';
    if (changeRate.startsWith('▼')) return 'text-blue-500';
    return 'text-gray-500';
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🔥 실시간 트렌드 키워드</h1>
        <p className="text-gray-600">구글 트렌드 기반 한국 급상승 검색어</p>
      </div>

      {/* 필터 */}
      <div className="mb-6 flex flex-wrap gap-4">
        {/* 시간 범위 */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">시간 범위:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="realtime">실시간</option>
            <option value="24h">최근 24시간</option>
            <option value="7d">최근 7일</option>
            <option value="30d">최근 30일</option>
          </select>
        </div>

        {/* 카테고리 */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">카테고리:</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">전체</option>
            <option value="entertainment">엔터테인먼트</option>
            <option value="sports">스포츠</option>
            <option value="it">IT/기술</option>
            <option value="politics">정치</option>
            <option value="economy">경제</option>
            <option value="society">사회</option>
            <option value="culture">문화</option>
          </select>
        </div>

        {/* 새로고침 */}
        <button
          onClick={fetchKeywords}
          disabled={loading}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:bg-gray-400"
        >
          {loading ? '로딩 중...' : '새로고침'}
        </button>
      </div>

      {/* 마지막 업데이트 시간 */}
      {lastUpdated && (
        <div className="mb-4 text-sm text-gray-500">
          마지막 업데이트: {formatDate(lastUpdated)}
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && keywords.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">데이터를 불러오는 중...</div>
        </div>
      )}

      {/* 키워드 목록 */}
      {!loading && keywords.length === 0 && !error && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">트렌드 키워드가 없습니다.</p>
          <p className="mt-2 text-sm text-gray-400">
            데이터 수집을 위해 관리자에게 문의하세요.
          </p>
        </div>
      )}

      {keywords.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    순위
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    키워드
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    변동
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    검색량
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    카테고리
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    신규
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {keywords.map((keyword, index) => (
                  <tr
                    key={keyword.id || index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {keyword.rank}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {keyword.keyword}
                        </span>
                        {keyword.isNew && (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                            NEW
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${getChangeRateColor(keyword.changeRate)}`}>
                        {keyword.changeRate || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {keyword.searchVolume
                        ? keyword.searchVolume.toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {getCategoryName(keyword.category || 'all')}
                    </td>
                    <td className="px-4 py-3">
                      {keyword.isNew ? (
                        <span className="inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 안내 메시지 */}
      {keywords.length > 0 && (
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-blue-600">ℹ️</span>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">트렌드 키워드 안내</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>매시간 자동으로 구글 트렌드에서 데이터를 수집합니다</li>
                <li>▲는 순위 상승, ▼는 순위 하락을 의미합니다</li>
                <li>NEW는 최근 24시간 내 처음 등장한 키워드입니다</li>
                <li>검색량은 상대적 수치이며 실제 검색 횟수가 아닙니다</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
