"use client";

import type { KeywordData } from '@/lib/types';

export default function ExportButton({ data, keyword }: { data: KeywordData[]; keyword: string }) {
  const handleExport = () => {
    if (!data.length) return;

    const csvContent = [
      ['연관키워드', 'PC검색량', '모바일검색량', '총검색량', '경쟁도', '블로그문서수', '카페문서수', '뉴스문서수', '웹문서문서수', 'PC클릭수', '모바일클릭수', 'PC클릭율', '모바일클릭율', '노출광고수'],
      ...data.map((d) => [
        d.keyword,
        d.monthlyPcSearch,
        d.monthlyMobileSearch,
        d.totalSearch,
        d.competition,
        d.blogTotalCount || '',
        d.cafeTotalCount || '',
        d.newsTotalCount || '',
        d.webkrTotalCount || '',
        d.monthlyPcClicks || '',
        d.monthlyMobileClicks || '',
        d.monthlyPcClickRate || '',
        d.monthlyMobileClickRate || '',
        d.monthlyAdCount || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${keyword}_연관검색어_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <button onClick={handleExport} className="rounded-md border bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50">
      CSV 내보내기
    </button>
  );
}


