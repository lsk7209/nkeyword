"use client";

import type { NaverSearchApiResponse } from '@/lib/types';

interface Props {
  data: NaverSearchApiResponse;
}

export default function NaverSearchResults({ data }: Props) {
  if (!data.success || !data.results) {
    return null;
  }

  const { results } = data;
  const categories = Object.entries(results).filter(([_, items]) => items && items.length > 0);

  if (categories.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-gray-500">검색 결과가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">네이버 검색 결과: "{data.query}"</h3>
      
      {categories.map(([category, items]) => (
        <div key={category} className="rounded-lg border border-gray-200 bg-white p-4">
          <h4 className="mb-3 text-lg font-medium capitalize">{category} ({items.length}개)</h4>
          <div className="space-y-3">
            {items.slice(0, 5).map((item, index) => (
              <div key={index} className="border-l-4 border-indigo-200 pl-3">
                <h5 className="font-medium text-indigo-600">
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {item.title?.replace(/<[^>]*>/g, '') || '제목 없음'}
                  </a>
                </h5>
                <p className="mt-1 text-sm text-gray-600">
                  {item.description?.replace(/<[^>]*>/g, '') || '설명 없음'}
                </p>
                {item.bloggername && (
                  <p className="mt-1 text-xs text-gray-500">
                    작성자: {item.bloggername}
                  </p>
                )}
                {item.postdate && (
                  <p className="text-xs text-gray-500">
                    작성일: {item.postdate}
                  </p>
                )}
                {item.price && (
                  <p className="text-sm font-medium text-green-600">
                    가격: {item.price}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
