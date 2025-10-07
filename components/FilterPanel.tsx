'use client';

import { type Filters } from '@/lib/types';

interface FilterPanelProps {
  filters: Filters;
  onFilterChange: (key: string, value: any) => void;
  onResetFilters: () => void;
}

export default function FilterPanel({ filters, onFilterChange, onResetFilters }: FilterPanelProps) {
  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800">필터 설정</h3>
        <button
          onClick={onResetFilters}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
        >
          필터 초기화
        </button>
      </div>

      <div className="space-y-6">
        {/* 키워드 검색 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            키워드 검색
          </label>
          <input
            type="text"
            value={filters.keyword}
            onChange={(e) => onFilterChange('keyword', e.target.value)}
            placeholder="키워드 검색..."
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 검색량 범위 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            검색량 범위
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={filters.minSearch}
              onChange={(e) => onFilterChange('minSearch', e.target.value)}
              placeholder="최소"
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              value={filters.maxSearch}
              onChange={(e) => onFilterChange('maxSearch', e.target.value)}
              placeholder="최대"
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 경쟁 강도 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            경쟁 강도
          </label>
          <div className="flex gap-2 flex-wrap">
            {['낮음', '중간', '높음'].map((comp) => (
              <label key={comp} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={filters.competition.includes(comp)}
                  onChange={(e) => {
                    const newCompetition = e.target.checked
                      ? [...filters.competition, comp]
                      : filters.competition.filter((c) => c !== comp);
                    onFilterChange('competition', newCompetition);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{comp}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 문서수 옵션 */}
        <div>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={filters.hasDocCounts}
              onChange={(e) => onFilterChange('hasDocCounts', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">문서수 보유 키워드만</span>
          </label>
        </div>

        {/* 블로그 문서수 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            블로그 문서수
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={filters.minBlogCount}
              onChange={(e) => onFilterChange('minBlogCount', e.target.value)}
              placeholder="최소"
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              value={filters.maxBlogCount}
              onChange={(e) => onFilterChange('maxBlogCount', e.target.value)}
              placeholder="최대"
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 카페 문서수 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            카페 문서수
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={filters.minCafeCount}
              onChange={(e) => onFilterChange('minCafeCount', e.target.value)}
              placeholder="최소"
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              value={filters.maxCafeCount}
              onChange={(e) => onFilterChange('maxCafeCount', e.target.value)}
              placeholder="최대"
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 뉴스 문서수 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            뉴스 문서수
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={filters.minNewsCount}
              onChange={(e) => onFilterChange('minNewsCount', e.target.value)}
              placeholder="최소"
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              value={filters.maxNewsCount}
              onChange={(e) => onFilterChange('maxNewsCount', e.target.value)}
              placeholder="최대"
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 웹문서 문서수 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            웹문서 문서수
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={filters.minWebkrCount}
              onChange={(e) => onFilterChange('minWebkrCount', e.target.value)}
              placeholder="최소"
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              value={filters.maxWebkrCount}
              onChange={(e) => onFilterChange('maxWebkrCount', e.target.value)}
              placeholder="최대"
              className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

