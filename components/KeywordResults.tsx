"use client";

import type { KeywordData, SortField, SortOrder } from '@/lib/types';

interface Props {
  data: KeywordData[];
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}

export default function KeywordResults({ data, sortField, sortOrder, onSort }: Props) {
  const headerClass = (field: SortField) =>
    `cursor-pointer select-none ${
      sortField === field ? 'text-indigo-600' : ''
    }`;

  const caret = (field: SortField) =>
    sortField === field ? (sortOrder === 'asc' ? '▲' : '▼') : '';

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full table-auto text-left text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3">
              <button className={headerClass('keyword')} onClick={() => onSort('keyword')}>
                연관 키워드 {caret('keyword')}
              </button>
            </th>
            <th className="px-4 py-3 text-right">
              <button className={headerClass('totalSearch')} onClick={() => onSort('totalSearch')}>
                총 검색량 {caret('totalSearch')}
              </button>
            </th>
            <th className="px-4 py-3 text-right">PC 검색량</th>
            <th className="px-4 py-3 text-right">모바일 검색량</th>
            <th className="px-4 py-3">
              <button className={headerClass('competition')} onClick={() => onSort('competition')}>
                경쟁도 {caret('competition')}
              </button>
            </th>
            <th className="px-4 py-3 text-right">PC 클릭수</th>
            <th className="px-4 py-3 text-right">모바일 클릭수</th>
            <th className="px-4 py-3 text-right">PC 클릭율</th>
            <th className="px-4 py-3 text-right">모바일 클릭율</th>
            <th className="px-4 py-3 text-right">노출광고수</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.keyword} className="border-t">
              <td className="px-4 py-3 font-medium">{row.keyword}</td>
              <td className="px-4 py-3 text-right font-semibold">{row.totalSearch.toLocaleString()}</td>
              <td className="px-4 py-3 text-right">{row.monthlyPcSearch.toLocaleString()}</td>
              <td className="px-4 py-3 text-right">{row.monthlyMobileSearch.toLocaleString()}</td>
              <td className="px-4 py-3">{row.competition}</td>
              <td className="px-4 py-3 text-right">{row.monthlyPcClicks?.toLocaleString() || '-'}</td>
              <td className="px-4 py-3 text-right">{row.monthlyMobileClicks?.toLocaleString() || '-'}</td>
              <td className="px-4 py-3 text-right">{row.monthlyPcClickRate ? `${row.monthlyPcClickRate.toFixed(2)}%` : '-'}</td>
              <td className="px-4 py-3 text-right">{row.monthlyMobileClickRate ? `${row.monthlyMobileClickRate.toFixed(2)}%` : '-'}</td>
              <td className="px-4 py-3 text-right">{row.monthlyAdCount?.toLocaleString() || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


