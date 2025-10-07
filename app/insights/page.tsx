'use client';

import { useEffect, useState, useMemo } from 'react';
import { loadDataset, type StoredRow } from '@/lib/storage';
import Link from 'next/link';

type InsightTab = 'golden' | 'highSearch' | 'lowCompetition' | 'lowAd' | 'balanced' | 'trending';
type DocumentType = 'cafe' | 'blog' | 'news' | 'webkr';

interface ScoreResult {
  keyword: StoredRow;
  score: number;
  reason: string;
}

export default function InsightsPage() {
  const [dataset, setDataset] = useState<StoredRow[]>([]);
  const [activeTab, setActiveTab] = useState<InsightTab>('golden');
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState<DocumentType>('cafe'); // 🆕 문서수 타입 필터 (기본: 카페)

  useEffect(() => {
    setLoading(true);
    const data = loadDataset();
    setDataset(data);
    setLoading(false);
  }, []);

  // 🆕 문서수 가져오기 헬퍼 함수
  const getDocCount = (row: StoredRow, type: DocumentType): number | undefined => {
    switch (type) {
      case 'cafe': return row.cafeTotalCount;
      case 'blog': return row.blogTotalCount;
      case 'news': return row.newsTotalCount;
      case 'webkr': return row.webkrTotalCount;
    }
  };

  // 🆕 문서수 타입 이름
  const getDocTypeName = (type: DocumentType): string => {
    switch (type) {
      case 'cafe': return '카페';
      case 'blog': return '블로그';
      case 'news': return '뉴스';
      case 'webkr': return '웹문서';
    }
  };

  // 황금 키워드: 높은 검색량 + 낮은 문서수 + 낮은 광고수
  const goldenKeywords = useMemo(() => {
    const withDocs = dataset.filter(row => 
      getDocCount(row, docType) !== undefined && 
      row.totalSearch > 0
    );

    return withDocs
      .map(row => {
        const docCount = getDocCount(row, docType) || 0;
        const searchScore = row.totalSearch / 10000; // 검색량 점수 (10,000 = 1점)
        const docScore = Math.max(0, 10 - (docCount / 1000)); // 문서수 낮을수록 높은 점수
        const adScore = row.monthlyAdCount ? Math.max(0, 10 - (row.monthlyAdCount / 10)) : 10; // 광고수 낮을수록 높은 점수
        
        const totalScore = searchScore * 0.4 + docScore * 0.4 + adScore * 0.2;
        
        return {
          keyword: row,
          score: totalScore,
          reason: `검색량: ${row.totalSearch.toLocaleString()}, ${getDocTypeName(docType)}문서: ${docCount.toLocaleString()}, 광고: ${row.monthlyAdCount || 0}`
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);
  }, [dataset, docType]);

  // 고검색량 키워드: 검색량만 높은 것
  const highSearchKeywords = useMemo(() => {
    return dataset
      .filter(row => row.totalSearch > 1000)
      .map(row => ({
        keyword: row,
        score: row.totalSearch,
        reason: `월 검색량: ${row.totalSearch.toLocaleString()}회`
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);
  }, [dataset]);

  // 저경쟁 키워드: 문서수가 낮은 것
  const lowCompetitionKeywords = useMemo(() => {
    const withDocs = dataset.filter(row => 
      getDocCount(row, docType) !== undefined && 
      row.totalSearch > 500
    );

    return withDocs
      .map(row => {
        const docCount = getDocCount(row, docType) || 0;
        return {
          keyword: row,
          score: docCount,
          reason: `${getDocTypeName(docType)}문서: ${docCount.toLocaleString()}개, 검색량: ${row.totalSearch.toLocaleString()}`
        };
      })
      .sort((a, b) => a.score - b.score) // 낮은 순
      .slice(0, 100);
  }, [dataset, docType]);

  // 저광고 키워드: 검색량 많은데 광고 적은 것
  const lowAdKeywords = useMemo(() => {
    const withAds = dataset.filter(row => 
      row.monthlyAdCount !== undefined && 
      row.totalSearch > 1000
    );

    return withAds
      .map(row => {
        const ratio = row.totalSearch / (row.monthlyAdCount || 1);
        return {
          keyword: row,
          score: ratio,
          reason: `검색량: ${row.totalSearch.toLocaleString()}, 광고: ${row.monthlyAdCount || 0}개 (비율: ${ratio.toFixed(0)})`
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);
  }, [dataset]);

  // 균형 키워드: 모든 지표가 적당히 좋은 것
  const balancedKeywords = useMemo(() => {
    const withDocs = dataset.filter(row => 
      getDocCount(row, docType) !== undefined && 
      row.totalSearch > 1000 &&
      row.monthlyAdCount !== undefined
    );

    return withDocs
      .map(row => {
        const docCount = getDocCount(row, docType) || 0;
        const searchNorm = Math.min(row.totalSearch / 50000, 1); // 0-1 정규화
        const docNorm = Math.min((100000 - docCount) / 100000, 1);
        const adNorm = Math.min((100 - (row.monthlyAdCount || 0)) / 100, 1);
        
        const balance = Math.min(searchNorm, docNorm, adNorm); // 가장 낮은 값 (균형)
        const total = (searchNorm + docNorm + adNorm) / 3;
        
        return {
          keyword: row,
          score: balance * total,
          reason: `검색: ${row.totalSearch.toLocaleString()}, ${getDocTypeName(docType)}문서: ${docCount.toLocaleString()}, 광고: ${row.monthlyAdCount}`
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);
  }, [dataset, docType]);

  // 트렌딩 키워드: 최근 수집된 것 중 좋은 것
  const trendingKeywords = useMemo(() => {
    const recent = dataset
      .filter(row => {
        const daysSince = (Date.now() - new Date(row.queriedAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 7 && row.totalSearch > 500;
      })
      .map(row => ({
        keyword: row,
        score: row.totalSearch,
        reason: `${new Date(row.queriedAt).toLocaleDateString()} 수집, 검색량: ${row.totalSearch.toLocaleString()}`
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);

    return recent;
  }, [dataset]);

  const tabs = [
    { id: 'golden' as InsightTab, name: '🏆 황금 키워드', desc: '높은 검색량 + 낮은 문서수 + 낮은 광고' },
    { id: 'highSearch' as InsightTab, name: '🔥 고검색량', desc: '검색량이 높은 키워드' },
    { id: 'lowCompetition' as InsightTab, name: '🎯 저경쟁', desc: '문서수가 적은 키워드' },
    { id: 'lowAd' as InsightTab, name: '💎 저광고', desc: '검색량 대비 광고가 적은 키워드' },
    { id: 'balanced' as InsightTab, name: '⚖️ 균형', desc: '모든 지표가 골고루 좋은 키워드' },
    { id: 'trending' as InsightTab, name: '📈 최근 트렌드', desc: '최근 7일 내 수집된 키워드' },
  ];

  const getCurrentKeywords = () => {
    switch (activeTab) {
      case 'golden': return goldenKeywords;
      case 'highSearch': return highSearchKeywords;
      case 'lowCompetition': return lowCompetitionKeywords;
      case 'lowAd': return lowAdKeywords;
      case 'balanced': return balancedKeywords;
      case 'trending': return trendingKeywords;
      default: return [];
    }
  };

  const currentKeywords = getCurrentKeywords();

  if (loading) {
    return (
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">데이터 로딩 중...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">💡 키워드 인사이트</h1>
        <p className="mt-2 text-gray-600">
          다양한 관점에서 발굴한 황금 키워드 Top 100
        </p>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg bg-blue-50 p-3">
            <div className="font-semibold text-blue-900">전체 키워드</div>
            <div className="text-2xl font-bold text-blue-600">{dataset.length.toLocaleString()}개</div>
          </div>
          <div className="rounded-lg bg-green-50 p-3">
            <div className="font-semibold text-green-900">문서수 보유</div>
            <div className="text-2xl font-bold text-green-600">
              {dataset.filter(r => r.cafeTotalCount !== undefined).length.toLocaleString()}개
            </div>
          </div>
          <div className="rounded-lg bg-purple-50 p-3">
            <div className="font-semibold text-purple-900">평균 검색량</div>
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(dataset.reduce((sum, r) => sum + r.totalSearch, 0) / dataset.length).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">문서수 기준 선택</h3>
            <p className="text-xs text-gray-500 mt-1">
              검색량은 항상 높은 것을 우선하며, 선택한 문서수가 낮은 키워드를 찾습니다
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDocType('cafe')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                docType === 'cafe'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🏠 카페
            </button>
            <button
              onClick={() => setDocType('blog')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                docType === 'blog'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📝 블로그
            </button>
            <button
              onClick={() => setDocType('news')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                docType === 'news'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📰 뉴스
            </button>
            <button
              onClick={() => setDocType('webkr')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                docType === 'webkr'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🌐 웹문서
            </button>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div>{tab.name}</div>
              <div className="text-xs text-gray-500">{tab.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 키워드 리스트 */}
      {currentKeywords.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <div className="text-gray-500">
            {activeTab === 'lowCompetition' || activeTab === 'golden' || activeTab === 'balanced'
              ? '문서수 데이터가 있는 키워드가 없습니다. 데이터 메뉴에서 문서수 조회를 실행하세요.'
              : '조건에 맞는 키워드가 없습니다.'}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3 min-w-[200px]">키워드</th>
                  <th className="px-4 py-3 text-right w-24 font-bold text-blue-600">검색량 ⬆</th>
                  <th className="px-4 py-3 text-center w-16">경쟁도</th>
                  <th className={`px-4 py-3 text-right w-20 ${docType === 'cafe' ? 'font-bold text-green-600' : ''}`}>
                    카페문서 {docType === 'cafe' && '⬇'}
                  </th>
                  <th className={`px-4 py-3 text-right w-20 ${docType === 'blog' ? 'font-bold text-blue-600' : ''}`}>
                    블로그문서 {docType === 'blog' && '⬇'}
                  </th>
                  <th className={`px-4 py-3 text-right w-20 ${docType === 'news' ? 'font-bold text-red-600' : ''}`}>
                    뉴스문서 {docType === 'news' && '⬇'}
                  </th>
                  <th className={`px-4 py-3 text-right w-20 ${docType === 'webkr' ? 'font-bold text-purple-600' : ''}`}>
                    웹문서 {docType === 'webkr' && '⬇'}
                  </th>
                  <th className="px-4 py-3 text-right w-16">광고수</th>
                  <th className="px-4 py-3 min-w-[250px]">분석</th>
                </tr>
              </thead>
              <tbody>
                {currentKeywords.map((item, index) => (
                  <tr key={item.keyword.keyword} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-center text-gray-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-blue-600">
                      {item.keyword.keyword}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {item.keyword.totalSearch.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                        item.keyword.competition === '높음' ? 'bg-red-100 text-red-700' :
                        item.keyword.competition === '중간' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {item.keyword.competition || '-'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right ${docType === 'cafe' ? 'font-bold text-green-600' : 'text-green-600'}`}>
                      {item.keyword.cafeTotalCount?.toLocaleString() || '-'}
                    </td>
                    <td className={`px-4 py-3 text-right ${docType === 'blog' ? 'font-bold text-blue-600' : 'text-blue-600'}`}>
                      {item.keyword.blogTotalCount?.toLocaleString() || '-'}
                    </td>
                    <td className={`px-4 py-3 text-right ${docType === 'news' ? 'font-bold text-red-600' : 'text-red-600'}`}>
                      {item.keyword.newsTotalCount?.toLocaleString() || '-'}
                    </td>
                    <td className={`px-4 py-3 text-right ${docType === 'webkr' ? 'font-bold text-purple-600' : 'text-purple-600'}`}>
                      {item.keyword.webkrTotalCount?.toLocaleString() || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {item.keyword.monthlyAdCount || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {item.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 하단 안내 */}
      <div className="mt-6 rounded-lg bg-blue-50 p-4">
        <h3 className="font-semibold text-blue-900">💡 인사이트 활용 팁</h3>
        <ul className="mt-2 space-y-1 text-sm text-blue-800">
          <li>• <strong>황금 키워드</strong>: SEO/블로그 작성에 최적 (높은 검색량 + 낮은 경쟁)</li>
          <li>• <strong>고검색량</strong>: 트래픽 확보가 목표일 때</li>
          <li>• <strong>저경쟁</strong>: 빠르게 상위 노출을 원할 때</li>
          <li>• <strong>저광고</strong>: 광고 경쟁이 적어 CPC가 낮을 가능성</li>
          <li>• <strong>균형</strong>: 안정적인 콘텐츠 전략</li>
          <li>• <strong>최근 트렌드</strong>: 떠오르는 키워드 선점</li>
        </ul>
      </div>
    </main>
  );
}
