'use client';

import { useEffect, useMemo, useState, useCallback, useRef, memo } from 'react';
import dynamic from 'next/dynamic';
import { 
  clearDataset, loadDataset, loadDatasetAsync, deleteKeywords, deleteKeyword, updateDocumentCounts, 
  getKeywordsWithoutDocCounts, getUnusedSeedKeywords, markAsUsedSeed, addResults,
  getAutoCollectConfig, saveAutoCollectConfig, emergencyClearOldData,
  type Dataset, type AutoCollectConfig, type StoredRow 
} from '@/lib/storage';
import type { SortField, SortOrder, SortConfig, MultiSortConfig } from '@/lib/types';
import ExportButton from '@/components/ExportButton';
import AutoCollectSettings from '@/components/AutoCollectSettings';

// 코드 스플리팅: FilterPanel을 동적 import (초기 번들 크기 감소)
const FilterPanel = dynamic(() => import('@/components/FilterPanel'), {
  loading: () => <div className="bg-white border rounded-lg p-6 shadow-sm animate-pulse">로딩 중...</div>,
  ssr: false, // 클라이언트에서만 로드
});

// 테이블 행 컴포넌트 (메모이제이션으로 성능 최적화)
const TableRow = memo(({ 
  row, 
  isSelected, 
  onSelect, 
  onDelete 
}: { 
  row: StoredRow; 
  isSelected: boolean; 
  onSelect: () => void; 
  onDelete: () => void;
}) => {
  return (
    <tr className="border-t hover:bg-gray-50">
      <td className="px-2 py-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="rounded border-gray-300"
        />
      </td>
      <td className="px-2 py-2 font-medium truncate max-w-[200px]" title={row.keyword}>{row.keyword}</td>
      <td className="px-2 py-2 text-right font-semibold">{(row.totalSearch / 1000).toFixed(1)}k</td>
      <td className="px-2 py-2 text-right text-gray-600">{(row.monthlyPcSearch / 1000).toFixed(1)}k</td>
      <td className="px-2 py-2 text-right text-gray-600">{(row.monthlyMobileSearch / 1000).toFixed(1)}k</td>
      <td className="px-2 py-2 text-center text-xs">{row.competition}</td>
      <td className="px-2 py-2 text-right text-blue-600">{row.blogTotalCount ? (row.blogTotalCount / 1000).toFixed(1) + 'k' : '0'}</td>
      <td className="px-2 py-2 text-right text-green-600">{row.cafeTotalCount ? (row.cafeTotalCount / 1000).toFixed(1) + 'k' : '0'}</td>
      <td className="px-2 py-2 text-right text-red-600">{row.newsTotalCount ? (row.newsTotalCount / 1000).toFixed(1) + 'k' : '0'}</td>
      <td className="px-2 py-2 text-right text-purple-600">{row.webkrTotalCount ? (row.webkrTotalCount / 1000).toFixed(1) + 'k' : '0'}</td>
      <td className="px-2 py-2 text-right text-gray-500 text-xs">{row.monthlyPcClicks || '-'}</td>
      <td className="px-2 py-2 text-right text-gray-500 text-xs">{row.monthlyMobileClicks || '-'}</td>
      <td className="px-2 py-2 text-right text-gray-500 text-xs">{row.monthlyPcClickRate ? row.monthlyPcClickRate.toFixed(1) + '%' : '-'}</td>
      <td className="px-2 py-2 text-right text-gray-500 text-xs">{row.monthlyMobileClickRate ? row.monthlyMobileClickRate.toFixed(1) + '%' : '-'}</td>
      <td className="px-2 py-2 text-right text-gray-500 text-xs">{row.monthlyAdCount || '-'}</td>
      <td className="px-2 py-2 text-xs text-gray-500">{new Date(row.queriedAt).toLocaleDateString()}</td>
      <td className="px-2 py-2">
        <button
          onClick={onDelete}
          className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-200"
        >
          삭제
        </button>
      </td>
    </tr>
  );
});

TableRow.displayName = 'TableRow';

export default function DataPage() {
  const [dataset, setDataset] = useState<Dataset>([]);
  const [isLoading, setIsLoading] = useState(true); // 초기 로딩 상태
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [isFetchingDocs, setIsFetchingDocs] = useState(false);
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 });
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [storageInfo, setStorageInfo] = useState<{ used: number; total: number; percentage: number } | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  
  // 자동 수집 상태
  const [autoCollectConfig, setAutoCollectConfig] = useState<AutoCollectConfig>({
    enabled: false,
    maxDepth: 3,
    intervalMinutes: 10,
    batchSize: 5,
    targetCount: 0,
  });
  const [isAutoCollecting, setIsAutoCollecting] = useState(false);
  const autoCollectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 정렬 및 필터 상태 (기본값 설정)
  const [sortConfigs, setSortConfigs] = useState<MultiSortConfig>([
    { field: 'totalSearch', order: 'desc' },
    { field: 'cafeTotalCount', order: 'asc' }
  ]);
  const [filters, setFilters] = useState({
    keyword: '',
    minSearch: '1000',
    maxSearch: '',
    competition: [] as string[],
    hasDocCounts: true, // 🆕 문서수 있는 키워드만 보이기 (기본값: true)
    minBlogCount: '',
    maxBlogCount: '',
    minCafeCount: '',
    maxCafeCount: '',
    minNewsCount: '',
    maxNewsCount: '',
    minWebkrCount: '',
    maxWebkrCount: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // 디바운스된 필터 상태 (성능 최적화)
  const [debouncedFilters, setDebouncedFilters] = useState({
    keyword: '',
    minSearch: '1000',
    maxSearch: '',
    competition: [] as string[],
    hasDocCounts: true, // 🆕 문서수 있는 키워드만 보이기 (기본값: true)
    minBlogCount: '',
    maxBlogCount: '',
    minCafeCount: '',
    maxCafeCount: '',
    minNewsCount: '',
    maxNewsCount: '',
    minWebkrCount: '',
    maxWebkrCount: '',
  });
  
  // 페이지당 표시 개수 (기본값: 50개 - 100개 → 50개로 변경하여 렌더링 속도 향상)
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // 저장 공간 사용량 계산
  const calculateStorageUsage = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    try {
      let totalSize = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += key.length + value.length;
          }
        }
      }
      
      // localStorage는 보통 5-10MB 제한 (브라우저마다 다름)
      const estimatedLimit = 10 * 1024 * 1024; // 10MB 가정
      const usedMB = totalSize / (1024 * 1024);
      const totalMB = estimatedLimit / (1024 * 1024);
      const percentage = (totalSize / estimatedLimit) * 100;
      
      return {
        used: usedMB,
        total: totalMB,
        percentage: Math.min(percentage, 100)
      };
    } catch (error) {
      console.error('[저장공간 계산 오류]', error);
      return null;
    }
  }, []);

  // 🚀 무한 루프 방지: useRef로 한 번만 실행 보장
  const isDataLoaded = useRef(false);
  
  useEffect(() => {
    // 비동기 데이터 로딩 (UI 블로킹 방지 + Worker 사용)
    const loadData = async () => {
      if (isDataLoaded.current) return; // 이미 로드된 경우 중복 실행 방지
      isDataLoaded.current = true;
      
      const startTime = performance.now();
      
      try {
        // 설정은 먼저 로드 (빠름)
        setAutoCollectConfig(getAutoCollectConfig());
        
        console.log('[성능] 데이터 로딩 시작');
        
        // 🚀 서버 환경에서는 API로 데이터 로드
        let data: Dataset = [];
        
        if (typeof window === 'undefined') {
          // 서버 환경에서는 API 호출
          try {
            const response = await fetch('/api/data');
            const result = await response.json();
            if (result.success) {
              data = result.data;
            }
          } catch (error) {
            console.error('[서버 데이터 로드] 오류:', error);
          }
        } else {
          // 클라이언트 환경에서는 LocalStorage 사용
          data = loadDataset();
        }
        
        const loadTime = performance.now() - startTime;
        console.log(`[성능] ✅ 데이터 로딩 완료: ${data.length}개, ${loadTime.toFixed(0)}ms`);
        
        // 🔥 대용량 데이터 최적화: 점진적 렌더링
        if (data.length > 5000) {
          console.log('[성능] 대용량 데이터 감지 - 점진적 렌더링');
          
          // 1단계: 먼저 1000개만 표시 (즉시 로딩 완료)
          setDataset(data.slice(0, 1000));
          setIsLoading(false);
          
          // 2단계: 다음 프레임에 나머지 데이터 추가 (UI 블로킹 없이)
          requestAnimationFrame(() => {
            setTimeout(() => {
              console.log('[성능] 전체 데이터 로드 중...');
              setDataset(data);
              console.log('[성능] ✅ 전체 데이터 로드 완료');
            }, 100);
          });
        } else {
          // 소용량 데이터: 바로 표시
          setDataset(data);
          setIsLoading(false);
        }
        
        // 저장 공간 계산은 별도 프레임에서 (우선순위 낮음)
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          requestIdleCallback(() => {
            const storage = calculateStorageUsage();
            setStorageInfo(storage);
          });
        } else {
          setTimeout(() => {
            const storage = calculateStorageUsage();
            setStorageInfo(storage);
          }, 100);
        }
      } catch (error) {
        console.error('[데이터 로딩 오류]', error);
        setIsLoading(false);
      }
    };
    
    loadData();
    
    // Web Worker 초기화 (백그라운드 작업용)
    if (typeof Worker !== 'undefined') {
      const docWorker = new Worker('/doc-worker.js');
      
      // Progress 업데이트 throttle (UI 부담 최소화)
      let lastProgressUpdate = 0;
      const PROGRESS_THROTTLE = 10000; // 🔥 2초 → 10초로 변경 (리렌더링 최소화)
      
      docWorker.onmessage = (e) => {
        const { type, progress, status, results, error, timeout } = e.data;
        
        if (type === 'PROGRESS_UPDATE') {
          // Throttle: 10초마다만 progress 업데이트 (UI 부담 감소)
          const now = Date.now();
          if (now - lastProgressUpdate > PROGRESS_THROTTLE) {
            setFetchProgress(progress);
            lastProgressUpdate = now;
            console.log(`[진행률] ${progress.current}/${progress.total} (${Math.round(progress.current / progress.total * 100)}%)`);
          }
        } else if (type === 'JOB_COMPLETED') {
          console.log('[데이터 페이지] Worker로부터 완료 알림:', status);
          
          // 🆕 결과를 LocalStorage에 저장 (비동기 처리로 UI 블로킹 방지)
          if (results && Array.isArray(results) && results.length > 0) {
            console.log(`[데이터 페이지] ${results.length}개 문서수 결과 저장 시작...`);
            
            // requestIdleCallback으로 유휴 시간에 저장 (UI 우선)
            const saveResults = () => {
              let successCount = 0;
              results.forEach((result: any) => {
                try {
                  updateDocumentCounts(result.keyword, {
                    blog: result.blogTotalCount,
                    cafe: result.cafeTotalCount,
                    news: result.newsTotalCount,
                    webkr: result.webkrTotalCount,
                  });
                  successCount++;
                } catch (error) {
                  console.error(`[데이터 페이지] ${result.keyword} 저장 실패:`, error);
                }
              });
              console.log(`[데이터 페이지] 문서수 저장 완료: ${successCount}/${results.length}개`);
              
              // 저장 완료 후 데이터 리로드
              setDataset(loadDataset());
            };
            
            if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
              requestIdleCallback(saveResults);
            } else {
              setTimeout(saveResults, 100);
            }
          }
          
          setIsFetchingDocs(false);
          setCurrentJobId(null);
          
          // LocalStorage 정리
          localStorage.removeItem('nkeyword:currentJobId');
          localStorage.removeItem('nkeyword:jobStartTime');
        } else if (type === 'ERROR') {
          console.error('[데이터 페이지] Worker 오류:', error);
          
          // 🆕 타임아웃 에러 시 안내 표시
          if (timeout) {
            alert('⚠️ 작업이 너무 오래 걸려서 중단되었습니다.\n\n다음 조치를 취해주세요:\n1. 페이지를 새로고침\n2. localStorage 정리 (브라우저 콘솔에서 localStorage.clear() 실행)');
          }
          
          setIsFetchingDocs(false);
          setCurrentJobId(null);
          
          // LocalStorage 정리
          localStorage.removeItem('nkeyword:currentJobId');
          localStorage.removeItem('nkeyword:jobStartTime');
        }
      };
      
      setWorker(docWorker);
      
      return () => {
        docWorker.terminate();
      };
    }
    
    // URL에서 필터 상태 복원
    const urlParams = new URLSearchParams(window.location.search);
    const savedFilters = {
      keyword: urlParams.get('keyword') || '',
      minSearch: urlParams.get('minSearch') || '',
      maxSearch: urlParams.get('maxSearch') || '',
      competition: urlParams.get('competition')?.split(',').filter(Boolean) || [],
      hasDocCounts: urlParams.get('hasDocCounts') === 'true',
      minBlogCount: urlParams.get('minBlogCount') || '',
      maxBlogCount: urlParams.get('maxBlogCount') || '',
      minCafeCount: urlParams.get('minCafeCount') || '',
      maxCafeCount: urlParams.get('maxCafeCount') || '',
      minNewsCount: urlParams.get('minNewsCount') || '',
      maxNewsCount: urlParams.get('maxNewsCount') || '',
      minWebkrCount: urlParams.get('minWebkrCount') || '',
      maxWebkrCount: urlParams.get('maxWebkrCount') || '',
    };
    setFilters(savedFilters);
    
    // 저장된 배치 작업 ID가 있는지 확인하고 폴링 시작
    const savedJobId = localStorage.getItem('nkeyword:currentJobId');
    const jobStartTime = localStorage.getItem('nkeyword:jobStartTime');
    
    if (savedJobId && jobStartTime) {
      // 'cached_' jobId는 폴링하지 않음 (즉시 완료된 작업)
      if (savedJobId.startsWith('cached_')) {
        console.log(`[데이터 페이지] 캐시된 작업 ID 정리: ${savedJobId}`);
        localStorage.removeItem('nkeyword:currentJobId');
        localStorage.removeItem('nkeyword:jobStartTime');
      } else {
        const elapsedTime = Date.now() - parseInt(jobStartTime);
        const maxJobTime = 10 * 60 * 1000; // 🆕 30분 → 10분으로 변경
        
        // 작업이 10분 이내에 시작되었으면 폴링 시작
        if (elapsedTime < maxJobTime) {
          console.log(`[데이터 페이지] 진행 중인 배치 작업 발견: ${savedJobId} (${Math.round(elapsedTime / 1000)}초 경과)`);
          setCurrentJobId(savedJobId);
          setIsFetchingDocs(true);
        } else {
          // 오래된 작업 ID 정리
          console.warn(`[데이터 페이지] 오래된 작업 ID 정리: ${savedJobId} (${Math.round(elapsedTime / 1000)}초 경과)`);
          localStorage.removeItem('nkeyword:currentJobId');
          localStorage.removeItem('nkeyword:jobStartTime');
        }
      }
    }
  }, []);

  // 배치 작업 상태 확인 함수 제거 (Worker가 처리)
  // 백그라운드 문서수 조회 함수
  const startDocumentCountCollection = useCallback(async () => {
    if (isFetchingDocs) {
      console.log('[문서수 조회] 이미 실행 중');
      return;
    }

    const keywordsWithoutDocs = getKeywordsWithoutDocCounts();
    
    if (keywordsWithoutDocs.length === 0) {
      console.log('[문서수 조회] 조회할 키워드 없음');
      return;
    }

    // 최대 100개씩만 조회
    const limitedKeywords = keywordsWithoutDocs.slice(0, 100);
    
    console.log(`[문서수 조회] ${limitedKeywords.length}개 키워드 조회 시작`);
    setIsFetchingDocs(true);
    setFetchProgress({ current: 0, total: limitedKeywords.length });

    try {
      const response = await fetch('/api/documents/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: limitedKeywords }),
      });

      const data = await response.json();

      if (data.jobId) {
        if (data.jobId.startsWith('cached_')) {
          console.log('[문서수 조회] 캐시된 결과 사용');
          if (data.results) {
            data.results.forEach((result: any) => {
              updateDocumentCounts(result.keyword, {
                blog: result.blogTotalCount,
                cafe: result.cafeTotalCount,
                news: result.newsTotalCount,
                webkr: result.webkrTotalCount,
              });
            });
          }
          setDataset(loadDataset());
          setIsFetchingDocs(false);
        } else {
          console.log(`[문서수 조회] 배치 작업 시작: ${data.jobId}`);
          setCurrentJobId(data.jobId);
          localStorage.setItem('nkeyword:currentJobId', data.jobId);
          localStorage.setItem('nkeyword:jobStartTime', Date.now().toString());
        }
      }
    } catch (error) {
      console.error('[문서수 조회] 오류:', error);
      setIsFetchingDocs(false);
    }
  }, [isFetchingDocs]);

  // 🆕 자동 문서수 수집 설정 (localStorage)
  const [autoDocCollection, setAutoDocCollection] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('nkeyword:autoDocCollection');
    return saved === 'true'; // 기본값: false (비활성화)
  });

  // 🆕 백그라운드 자동수집 설정 (localStorage)
  const [backgroundAutoCollection, setBackgroundAutoCollection] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('nkeyword:backgroundAutoCollection');
    return saved === 'true'; // 기본값: false
  });

  // 자동 문서수 수집 설정 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nkeyword:autoDocCollection', autoDocCollection.toString());
    }
  }, [autoDocCollection]);

  // 백그라운드 자동수집 설정 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nkeyword:backgroundAutoCollection', backgroundAutoCollection.toString());
    }
  }, [backgroundAutoCollection]);

  // 🆕 백그라운드 자동수집 (페이지 로드 시 자동 실행)
  useEffect(() => {
    // 백그라운드 자동수집이 비활성화되어 있으면 실행하지 않음
    if (!backgroundAutoCollection) {
      return;
    }

    // 초기 로딩 중이거나 데이터가 없으면 실행하지 않음
    if (isLoading || dataset.length === 0) return;

    // 이미 문서수 조회 중이면 실행하지 않음
    if (isFetchingDocs) return;

    // 문서수 없는 키워드 확인
    const keywordsWithoutDocs = getKeywordsWithoutDocCounts();

    if (keywordsWithoutDocs.length > 0) {
      console.log(`[백그라운드 자동수집] ${keywordsWithoutDocs.length}개 키워드 발견 - 5초 후 자동 시작`);

      // 5초 후 자동 수집 시작 (사용자가 페이지를 확인할 시간 제공)
      const timer = setTimeout(() => {
        console.log('[백그라운드 자동수집] 시작!');
        startDocumentCountCollection();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      console.log('[백그라운드 자동수집] 수집할 키워드 없음');
    }
  }, [isLoading, isFetchingDocs, startDocumentCountCollection, backgroundAutoCollection]);

  // 🆕 데이터셋 변경 감지 - 자동 수집이 활성화되어 있을 때만 실행
  // 🚀 무한 루프 방지: 한 번만 실행되도록 플래그 사용
  const isAutoDocCollectionTriggered = useRef(false);
  
  useEffect(() => {
    // 🔥 자동 수집이 비활성화되어 있으면 실행하지 않음
    if (!autoDocCollection) {
      console.log('[자동 문서수 수집] 비활성화 상태 - 수집하지 않음');
      return;
    }

    // 이미 트리거되었으면 실행하지 않음
    if (isAutoDocCollectionTriggered.current) {
      return;
    }

    // 초기 로드 시에는 실행하지 않음
    if (dataset.length === 0) return;

    // 문서수 조회 중이면 실행하지 않음
    if (isFetchingDocs) return;

    // 문서수 없는 키워드 확인
    const keywordsWithoutDocs = getKeywordsWithoutDocCounts();

    if (keywordsWithoutDocs.length > 0) {
      console.log(`[자동 문서수 수집] ${keywordsWithoutDocs.length}개 키워드 발견 - 자동 수집 시작`);
      isAutoDocCollectionTriggered.current = true; // 플래그 설정

      // 1초 후 수집 시작 (debounce)
      const timer = setTimeout(() => {
        startDocumentCountCollection();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isFetchingDocs, startDocumentCountCollection, autoDocCollection]);

  // 자동 수집 실행 함수 (비동기 + UI 블로킹 방지)
  const runAutoCollect = useCallback(async () => {
    if (isAutoCollecting) {
      console.log('[자동 수집] 이미 실행 중');
      return;
    }

    // 자동 수집 활성화 상태 재확인
    const currentConfig = getAutoCollectConfig();
    if (!currentConfig.enabled) {
      console.log('[자동 수집] 비활성화 상태 - 중단');
      return;
    }

    setIsAutoCollecting(true);
    console.log('[자동 수집] 백그라운드에서 시작...');

    try {
      // 목표 개수 체크
      const currentDataset = loadDataset();
      const currentTotal = currentDataset.length;
      
      if (autoCollectConfig.targetCount && autoCollectConfig.targetCount > 0) {
        if (currentTotal >= autoCollectConfig.targetCount) {
          console.log(`[자동 수집] ✅ 목표 개수 달성 (${currentTotal.toLocaleString()}/${autoCollectConfig.targetCount.toLocaleString()}개) - 자동 종료`);
          
          // 자동 수집 비활성화
          const finalConfig = { ...autoCollectConfig, enabled: false };
          saveAutoCollectConfig(finalConfig);
          setAutoCollectConfig(finalConfig);
          
          setIsAutoCollecting(false);
          return;
        } else {
          console.log(`[자동 수집] 진행 중: ${currentTotal.toLocaleString()}/${autoCollectConfig.targetCount.toLocaleString()}개 (${Math.round(currentTotal / autoCollectConfig.targetCount * 100)}%)`);
        }
      }
      
      // 미사용 시드키워드 가져오기
      const unusedSeeds = getUnusedSeedKeywords(autoCollectConfig.batchSize);
      
      if (unusedSeeds.length === 0) {
        console.log('[자동 수집] ✅ 모든 키워드 수집 완료 - 자동 종료');
        
        // 자동 수집 비활성화
        const finalConfig = { ...autoCollectConfig, enabled: false };
        saveAutoCollectConfig(finalConfig);
        setAutoCollectConfig(finalConfig);
        
        setIsAutoCollecting(false);
        return;
      }

      console.log(`[자동 수집] ${unusedSeeds.length}개 시드키워드 처리`);

      // 각 시드의 깊이 확인
      let processedCount = 0;
      for (const seed of unusedSeeds) {
        // 매 반복마다 활성화 상태 확인
        const config = getAutoCollectConfig();
        if (!config.enabled) {
          console.log('[자동 수집] 사용자가 중단함');
          break;
        }

        const currentDepth = seed.seedDepth || 0;
        
        // 최대 깊이 체크
        if (currentDepth >= autoCollectConfig.maxDepth) {
          console.log(`[자동 수집] ${seed.keyword} - 최대 깊이 도달 (${currentDepth})`);
          markAsUsedSeed(seed.keyword);
          continue;
        }

        processedCount++;

        // 연관검색어 수집
        const response = await fetch('/api/keywords/auto-collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seedKeywords: [seed.keyword],
            depth: currentDepth,
          }),
        });

        const data = await response.json();

        if (data.success && data.results) {
          console.log(`[자동 수집] ${seed.keyword} - ${data.results.length}개 수집`);
          
          // 결과를 데이터셋에 추가
          addResults(seed.keyword, data.results);
          
          // 시드로 표시
          markAsUsedSeed(seed.keyword);
          
          console.log(`[자동 수집] ${seed.keyword} - 시드로 표시 완료`);
        } else {
          console.error(`[자동 수집] ${seed.keyword} - 수집 실패:`, data.error);
        }

        // API 호출 간격 (네이버 차단 방지)
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log(`[자동 수집] 완료 - ${processedCount}개 시드 처리됨`);
      
      // 🚀 무한 루프 방지: 데이터 리로드 대신 상태 업데이트만 수행
      // setDataset(loadDataset()) 호출을 제거하여 무한 루프 방지
      console.log('[자동 수집] 데이터 리로드 생략 - 무한 루프 방지');
      
      // ✅ 문서수 수집은 데이터셋 변경 감지 useEffect에서 자동으로 처리됨
    } catch (error) {
      console.error('[자동 수집] 오류:', error);
    } finally {
      setIsAutoCollecting(false);
    }
  }, [autoCollectConfig, isAutoCollecting]);

  // 자동 수집 활성화/비활성화 처리
  useEffect(() => {
    if (autoCollectConfig.enabled) {
      console.log(`[자동 수집] 활성화 - ${autoCollectConfig.intervalMinutes}분 간격`);
      console.log(`[자동 수집] 종료 조건: 미사용 시드키워드 없음`);
      console.log(`[자동 수집] 문서수 자동 조회: 활성화`);
      
      // 즉시 한 번 실행
      runAutoCollect();
      
      // 주기적 실행
      autoCollectIntervalRef.current = setInterval(() => {
        runAutoCollect();
      }, autoCollectConfig.intervalMinutes * 60 * 1000);
    } else {
      console.log('[자동 수집] 비활성화');
      
      if (autoCollectIntervalRef.current) {
        clearInterval(autoCollectIntervalRef.current);
        autoCollectIntervalRef.current = null;
      }
    }

    return () => {
      if (autoCollectIntervalRef.current) {
        clearInterval(autoCollectIntervalRef.current);
      }
    };
  }, [autoCollectConfig.enabled, autoCollectConfig.intervalMinutes, runAutoCollect]);

  // 페이지 로드 시 자동 문서수 조회는 제거 (키워드 검색 시 자동으로 시작됨)
  
  // currentJobId가 설정되면 Worker에게 모니터링 시작 요청
  useEffect(() => {
    if (!currentJobId || !worker) return;
    
    console.log(`[데이터 페이지] Worker에게 모니터링 요청: ${currentJobId}`);
    
    // Worker에게 모니터링 시작 요청
    worker.postMessage({
      type: 'START_MONITORING',
      jobId: currentJobId,
    });
    
    // cleanup
    return () => {
      if (worker) {
        worker.postMessage({ type: 'STOP_MONITORING' });
      }
    };
  }, [currentJobId, worker]);

  // 필터링된 데이터 (성능 최적화 - debouncedFilters 사용)
  const filteredData = useMemo(() => {
    const startTime = performance.now();
    
    // 필터가 없으면 원본 데이터 반환
    const hasFilters = debouncedFilters.keyword || debouncedFilters.minSearch || debouncedFilters.maxSearch || 
                      debouncedFilters.competition.length > 0 || debouncedFilters.hasDocCounts ||
                      debouncedFilters.minBlogCount || debouncedFilters.maxBlogCount || 
                      debouncedFilters.minCafeCount || debouncedFilters.maxCafeCount ||
                      debouncedFilters.minNewsCount || debouncedFilters.maxNewsCount ||
                      debouncedFilters.minWebkrCount || debouncedFilters.maxWebkrCount;
    
    if (!hasFilters) {
      console.log(`[성능] 필터 없음 - 원본 데이터 반환: ${dataset.length}개`);
      return dataset;
    }

    // 필터 조건들을 미리 파싱 (debouncedFilters 사용)
    const minSearch = debouncedFilters.minSearch ? parseInt(debouncedFilters.minSearch) : null;
    const maxSearch = debouncedFilters.maxSearch ? parseInt(debouncedFilters.maxSearch) : null;
    const minBlogCount = debouncedFilters.minBlogCount ? parseInt(debouncedFilters.minBlogCount) : null;
    const maxBlogCount = debouncedFilters.maxBlogCount ? parseInt(debouncedFilters.maxBlogCount) : null;
    const minCafeCount = debouncedFilters.minCafeCount ? parseInt(debouncedFilters.minCafeCount) : null;
    const maxCafeCount = debouncedFilters.maxCafeCount ? parseInt(debouncedFilters.maxCafeCount) : null;
    const minNewsCount = debouncedFilters.minNewsCount ? parseInt(debouncedFilters.minNewsCount) : null;
    const maxNewsCount = debouncedFilters.maxNewsCount ? parseInt(debouncedFilters.maxNewsCount) : null;
    const minWebkrCount = debouncedFilters.minWebkrCount ? parseInt(debouncedFilters.minWebkrCount) : null;
    const maxWebkrCount = debouncedFilters.maxWebkrCount ? parseInt(debouncedFilters.maxWebkrCount) : null;
    
    const keywordLower = debouncedFilters.keyword.toLowerCase();
    const competitionSet = new Set(debouncedFilters.competition);

    // 단일 루프로 모든 필터 적용 (성능 최적화)
    const result = dataset.filter(item => {
      // 키워드 검색 필터
      if (debouncedFilters.keyword && !item.keyword.toLowerCase().includes(keywordLower)) {
        return false;
      }

      // 검색량 필터
      if (minSearch !== null && item.totalSearch < minSearch) {
        return false;
      }
      if (maxSearch !== null && item.totalSearch > maxSearch) {
        return false;
      }

      // 경쟁도 필터
      if (debouncedFilters.competition.length > 0 && !competitionSet.has(item.competition)) {
        return false;
      }

      // 문서수 보유 여부 필터
      if (debouncedFilters.hasDocCounts) {
        const hasAnyDocCount = item.blogTotalCount !== undefined || 
                              item.cafeTotalCount !== undefined || 
                              item.newsTotalCount !== undefined || 
                              item.webkrTotalCount !== undefined;
        if (!hasAnyDocCount) {
          return false;
        }
      }

      // 블로그 문서수 필터
      if (minBlogCount !== null && (item.blogTotalCount === undefined || item.blogTotalCount < minBlogCount)) {
        return false;
      }
      if (maxBlogCount !== null && (item.blogTotalCount === undefined || item.blogTotalCount > maxBlogCount)) {
        return false;
      }

      // 카페 문서수 필터
      if (minCafeCount !== null && (item.cafeTotalCount === undefined || item.cafeTotalCount < minCafeCount)) {
        return false;
      }
      if (maxCafeCount !== null && (item.cafeTotalCount === undefined || item.cafeTotalCount > maxCafeCount)) {
        return false;
      }

      // 뉴스 문서수 필터
      if (minNewsCount !== null && (item.newsTotalCount === undefined || item.newsTotalCount < minNewsCount)) {
        return false;
      }
      if (maxNewsCount !== null && (item.newsTotalCount === undefined || item.newsTotalCount > maxNewsCount)) {
        return false;
      }

      // 웹문서 문서수 필터
      if (minWebkrCount !== null && (item.webkrTotalCount === undefined || item.webkrTotalCount < minWebkrCount)) {
        return false;
      }
      if (maxWebkrCount !== null && (item.webkrTotalCount === undefined || item.webkrTotalCount > maxWebkrCount)) {
        return false;
      }

      return true;
    });
    
    const filterTime = performance.now() - startTime;
    if (filterTime > 100) {
      console.log(`[성능] ⚠️ 필터링 시간: ${dataset.length}개 → ${result.length}개, ${filterTime.toFixed(0)}ms`);
    }
    return result;
  }, [debouncedFilters, isLoading]);

  // 정렬된 데이터 (성능 최적화: 정렬 결과 캐싱)
  const sortedData = useMemo(() => {
    const startTime = performance.now();
    
    if (filteredData.length === 0) return [];
    
    // 정렬이 없으면 필터링된 데이터 그대로 반환
    if (sortConfigs.length === 0) {
      console.log(`[성능] 정렬 없음 - 필터 데이터 반환: ${filteredData.length}개`);
      return filteredData;
    }
    
    console.log('[정렬] 정렬 시작:', sortConfigs);
    
    // 배열 복사 및 정렬
    const sorted = [...filteredData];
    
    // 각 정렬 기준을 순서대로 적용
    for (let i = 0; i < sortConfigs.length; i++) {
      const sortConfig = sortConfigs[i];
      console.log(`[정렬] ${i + 1}차 정렬 적용: ${sortConfig.field} ${sortConfig.order}`);
      
      sorted.sort((a, b) => {
        const aVal = a[sortConfig.field];
        const bVal = b[sortConfig.field];
        
        // undefined 값 처리 (undefined는 항상 뒤로)
        if (aVal === undefined && bVal === undefined) return 0;
        if (aVal === undefined) return 1;
        if (bVal === undefined) return -1;

        let comparison = 0;
        
        // 숫자 비교
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } 
        // 문자열 비교
        else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        // 정렬 순서에 따라 결과 반전
        return sortConfig.order === 'asc' ? comparison : -comparison;
      });
      
      // 각 정렬 후 결과 확인 (처음 5개만) - 개발 환경에서만
      if (process.env.NODE_ENV === 'development') {
        console.log(`[정렬] ${i + 1}차 정렬 후 상위 5개:`, sorted.slice(0, 5).map(item => ({
          keyword: item.keyword,
          [sortConfig.field]: item[sortConfig.field]
        })));
      }
    }
    
    const sortTime = performance.now() - startTime;
    console.log(`[성능] 정렬 완료: ${sorted.length}개, ${sortTime.toFixed(0)}ms`);
    return sorted;
  }, [filteredData, sortConfigs]);

  const total = sortedData.length;
  const totalPages = Math.ceil(total / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // 현재 페이지 데이터 (1000개)
  const currentPageData = sortedData.slice(startIndex, endIndex);

  const exportData = useMemo(() => {
    const result = [];
    for (const item of sortedData) {
      const { queriedAt, rootKeyword, ...rest } = item;
      result.push(rest);
    }
    return result;
  }, [sortedData]);

  // 🆕 가상화 제거 - 스크롤 핸들러 불필요

  const handleClear = useCallback(async () => {
    if (confirm('모든 데이터를 삭제하시겠습니까?')) {
      clearDataset();
      setDataset([]);
      setSelectedKeywords(new Set());
      
      // 저장 공간 업데이트
      const storage = calculateStorageUsage();
      setStorageInfo(storage);
      
      // 서버 캐시도 초기화
      try {
        const response = await fetch('/api/documents/clear-cache', {
          method: 'POST',
        });
        const data = await response.json();
        if (data.success) {
          console.log('[캐시 초기화] 성공:', data.message);
          alert('데이터 및 캐시가 모두 삭제되었습니다.');
        }
      } catch (error) {
        console.error('[캐시 초기화] 오류:', error);
      }
    }
  }, [calculateStorageUsage]);

  // 긴급 복구: 구버전 데이터 삭제
  const handleEmergencyClear = useCallback(() => {
    if (confirm('⚠️ 긴급 복구\n\n구버전 데이터를 삭제하여 저장 공간을 확보합니다.\n계속하시겠습니까?')) {
      const result = emergencyClearOldData();
      if (result?.success && result.freedSpace) {
        alert(`✅ 복구 성공!\n\n${result.freedSpace.toFixed(2)}MB의 공간을 확보했습니다.\n페이지를 새로고침합니다.`);
        window.location.reload();
      } else {
        alert('구버전 데이터가 없습니다.\n\n다른 방법으로 공간을 확보해주세요:\n1. 불필요한 키워드 삭제\n2. Export 후 전체 삭제');
      }
    }
  }, []);

  // 🆕 작업 강제 중지 및 초기화
  const handleForceStopJob = useCallback(() => {
    if (confirm('⚠️ 진행 중인 작업을 강제로 중지하시겠습니까?\n\n현재까지의 작업 내용은 저장되지 않습니다.')) {
      console.log('[강제 중지] 작업 중지 시작...');
      
      // Worker 중지
      if (worker) {
        worker.postMessage({ type: 'STOP_MONITORING' });
        console.log('[강제 중지] Worker 중지 요청 완료');
      }
      
      // 상태 초기화
      setIsFetchingDocs(false);
      setCurrentJobId(null);
      setFetchProgress({ current: 0, total: 0 });
      console.log('[강제 중지] 상태 초기화 완료');
      
      // LocalStorage 정리
      localStorage.removeItem('nkeyword:currentJobId');
      localStorage.removeItem('nkeyword:jobStartTime');
      console.log('[강제 중지] LocalStorage 정리 완료');
      
      alert('✅ 작업이 중지되었습니다.\n\n페이지를 새로고침하는 것을 권장합니다.');
    }
  }, [worker]);

  // 🆕 긴급 복구 버튼 (모든 작업 초기화)
  const handleEmergencyReset = useCallback(() => {
    if (confirm('🆘 긴급 복구\n\n모든 진행 중인 작업을 초기화하고 페이지를 새로고침합니다.\n\n계속하시겠습니까?')) {
      console.log('[긴급 복구] 시작...');
      
      // Worker 중지
      if (worker) {
        worker.postMessage({ type: 'STOP_MONITORING' });
        worker.terminate();
      }
      
      // 모든 작업 관련 데이터 삭제
      localStorage.removeItem('nkeyword:currentJobId');
      localStorage.removeItem('nkeyword:jobStartTime');
      
      console.log('[긴급 복구] 완료 - 페이지 새로고침');
      
      // 페이지 새로고침
      window.location.reload();
    }
  }, [worker]);

  // 🔄 데이터 마이그레이션 함수
  const handleDataMigration = useCallback(async () => {
    if (isMigrating) return;
    
    try {
      setIsMigrating(true);
      
      // 1. 현재 LocalStorage 데이터 내보내기
      const currentData = loadDataset();
      
      if (currentData.length === 0) {
        alert('마이그레이션할 데이터가 없습니다.');
        return;
      }
      
      // 2. 서버로 데이터 전송
      const response = await fetch('/api/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'import',
          data: currentData
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ 마이그레이션 완료!\n\n${result.imported}개 키워드가 성공적으로 가져와졌습니다.`);
        // 데이터 새로고침
        setDataset(loadDataset());
      } else {
        alert(`❌ 마이그레이션 실패: ${result.error}`);
      }
      
    } catch (error) {
      console.error('[마이그레이션] 오류:', error);
      alert('❌ 마이그레이션 중 오류가 발생했습니다.');
    } finally {
      setIsMigrating(false);
    }
  }, [isMigrating]);

  // 🧪 테스트 데이터 생성 함수
  const handleCreateTestData = useCallback(async () => {
    if (isMigrating) return;
    
    try {
      setIsMigrating(true);
      
      const response = await fetch('/api/test-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`✅ 테스트 데이터 생성 완료!\n\n${result.message}`);
        // 데이터 새로고침
        setDataset(loadDataset());
      } else {
        alert(`❌ 테스트 데이터 생성 실패: ${result.error}`);
      }
      
    } catch (error) {
      console.error('[테스트 데이터] 오류:', error);
      alert('❌ 테스트 데이터 생성 중 오류가 발생했습니다.');
    } finally {
      setIsMigrating(false);
    }
  }, [isMigrating]);

  const handleSelectAll = () => {
    if (selectedKeywords.size === currentPageData.length) {
      setSelectedKeywords(new Set());
    } else {
      setSelectedKeywords(new Set(currentPageData.map((item: StoredRow) => item.keyword)));
    }
  };

  const handleSelectKeyword = useCallback((keyword: string) => {
    setSelectedKeywords(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(keyword)) {
        newSelected.delete(keyword);
      } else {
        newSelected.add(keyword);
      }
      return newSelected;
    });
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedKeywords.size === 0) return;
    
    const keywordsToDelete = Array.from(selectedKeywords);
    deleteKeywords(keywordsToDelete);
    setDataset(loadDataset());
    setSelectedKeywords(new Set());
    
    // 저장 공간 업데이트
    const storage = calculateStorageUsage();
    setStorageInfo(storage);
  }, [selectedKeywords, calculateStorageUsage]);

  const handleDeleteKeyword = useCallback((keyword: string) => {
    deleteKeyword(keyword);
    setDataset(loadDataset());
    setSelectedKeywords(prev => {
      const newSet = new Set(prev);
      newSet.delete(keyword);
      return newSet;
    });
    
    // 저장 공간 업데이트
    const storage = calculateStorageUsage();
    setStorageInfo(storage);
  }, [calculateStorageUsage]);

  // 정렬 핸들러 (새로운 방식: 우선순위 기반)
  const handleSort = (field: SortField, order: SortOrder) => {
    setSortConfigs(prev => {
      const existingIndex = prev.findIndex(config => config.field === field);
      
      if (existingIndex >= 0) {
        // 이미 있는 경우: 순서 변경 또는 제거
        const existing = prev[existingIndex];
        if (existing.order === order) {
          // 같은 순서면 제거하고 우선순위 재정렬
          const newConfigs = prev.filter((_, index) => index !== existingIndex);
          console.log(`[정렬] ${field} ${order} 제거됨. 남은 정렬:`, newConfigs);
          return newConfigs;
        } else {
          // 다른 순서면 변경
          const newConfigs = prev.map((config, index) => 
            index === existingIndex ? { ...config, order } : config
          );
          console.log(`[정렬] ${field} ${order}로 변경됨. 전체 정렬:`, newConfigs);
          return newConfigs;
        }
      } else {
        // 새로운 정렬 추가 (최대 3개까지만 허용)
        if (prev.length >= 3) {
          // 3개가 이미 있으면 가장 오래된 것(첫 번째) 제거
          const newConfigs = [...prev.slice(1), { field, order }];
          console.log(`[정렬] ${field} ${order} 추가됨 (기존 첫 번째 제거). 전체 정렬:`, newConfigs);
          return newConfigs;
        } else {
          // 새로운 정렬 추가
          const newConfigs = [...prev, { field, order }];
          console.log(`[정렬] ${field} ${order} 추가됨. 전체 정렬:`, newConfigs);
          return newConfigs;
        }
      }
    });
    
    setCurrentPage(1); // 정렬 시 첫 페이지로
  };

  // 정렬 제거 핸들러
  const handleRemoveSort = (field: SortField) => {
    setSortConfigs(prev => {
      const newConfigs = prev.filter(config => config.field !== field);
      console.log(`[정렬] ${field} 제거됨. 남은 정렬:`, newConfigs);
      return newConfigs;
    });
    setCurrentPage(1);
  };

  // 모든 정렬 제거
  const handleClearAllSorts = () => {
    setSortConfigs([]);
    console.log('[정렬] 모든 정렬 제거됨');
    setCurrentPage(1);
  };

  // 디바운스된 필터 핸들러 (성능 최적화)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300); // 🔥 500ms → 300ms로 복원 (사용자 경험 개선)

    return () => clearTimeout(timer);
  }, [filters]);

  // URL 업데이트는 디바운스된 필터로
  useEffect(() => {
    const urlParams = new URLSearchParams();
    if (debouncedFilters.keyword) urlParams.set('keyword', debouncedFilters.keyword);
    if (debouncedFilters.minSearch) urlParams.set('minSearch', debouncedFilters.minSearch);
    if (debouncedFilters.maxSearch) urlParams.set('maxSearch', debouncedFilters.maxSearch);
    if (debouncedFilters.competition.length > 0) urlParams.set('competition', debouncedFilters.competition.join(','));
    if (debouncedFilters.hasDocCounts) urlParams.set('hasDocCounts', 'true');
    if (debouncedFilters.minBlogCount) urlParams.set('minBlogCount', debouncedFilters.minBlogCount);
    if (debouncedFilters.maxBlogCount) urlParams.set('maxBlogCount', debouncedFilters.maxBlogCount);
    if (debouncedFilters.minCafeCount) urlParams.set('minCafeCount', debouncedFilters.minCafeCount);
    if (debouncedFilters.maxCafeCount) urlParams.set('maxCafeCount', debouncedFilters.maxCafeCount);
    if (debouncedFilters.minNewsCount) urlParams.set('minNewsCount', debouncedFilters.minNewsCount);
    if (debouncedFilters.maxNewsCount) urlParams.set('maxNewsCount', debouncedFilters.maxNewsCount);
    if (debouncedFilters.minWebkrCount) urlParams.set('minWebkrCount', debouncedFilters.minWebkrCount);
    if (debouncedFilters.maxWebkrCount) urlParams.set('maxWebkrCount', debouncedFilters.maxWebkrCount);
    
    const newUrl = urlParams.toString() ? `?${urlParams.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [debouncedFilters]);

  // 필터 핸들러 (즉시 반응)
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // 필터 시 첫 페이지로
  };

  const handleClearFilters = () => {
    setFilters({
      keyword: '',
      minSearch: '',
      maxSearch: '',
      competition: [],
      hasDocCounts: false,
      minBlogCount: '',
      maxBlogCount: '',
      minCafeCount: '',
      maxCafeCount: '',
      minNewsCount: '',
      maxNewsCount: '',
      minWebkrCount: '',
      maxWebkrCount: '',
    });
    setCurrentPage(1);
    window.history.replaceState({}, '', window.location.pathname);
  };

  // 경쟁도 옵션 (데이터에서 추출) - 성능 최적화
  const competitionOptions = useMemo(() => {
    const competitions = new Set<string>();
    for (const item of dataset) {
      competitions.add(item.competition);
    }
    return Array.from(competitions).sort();
  }, []);

  // 정렬 버튼 컴포넌트 (간단한 화살표 버전)
  const SortButtons = ({ field }: { field: SortField }) => {
    const config = sortConfigs.find(config => config.field === field);
    const index = sortConfigs.findIndex(config => config.field === field);
    const isActive = config !== undefined;
    
    return (
      <div className="flex items-center gap-1 ml-1">
        <button
          onClick={() => handleSort(field, 'asc')}
          className={`text-sm transition-colors ${
            config?.order === 'asc' 
              ? 'text-green-600 font-bold' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
          title="오름차순 정렬"
        >
          ▲
        </button>
        <button
          onClick={() => handleSort(field, 'desc')}
          className={`text-sm transition-colors ${
            config?.order === 'desc' 
              ? 'text-red-600 font-bold' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
          title="내림차순 정렬"
        >
          ▼
        </button>
        {isActive && (
          <span className="text-xs text-indigo-600 font-bold bg-indigo-100 px-1 py-0.5 rounded ml-1">
            {index + 1}
          </span>
        )}
      </div>
    );
  };

  // 로딩 중일 때 표시
  if (isLoading) {
    return (
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600 font-medium">데이터를 불러오는 중...</p>
            <p className="mt-2 text-sm text-gray-500">대용량 데이터의 경우 최대 3초 소요될 수 있습니다</p>
            <p className="mt-4 text-xs text-gray-400">
              💡 F12 → Console 탭에서 로딩 진행 상황을 확인할 수 있습니다
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8">
      {/* 자동 수집 설정 */}
      <div className="mb-6">
        <AutoCollectSettings 
          onConfigChange={(newConfig) => {
            console.log('[데이터 페이지] 설정 변경:', newConfig);
            setAutoCollectConfig(newConfig);
          }}
        />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">
              데이터 ({total.toLocaleString()}개)
              {total !== dataset.length && (
                <span className="ml-2 text-sm text-gray-500">
                  (전체 {dataset.length.toLocaleString()}개 중)
                </span>
              )}
            </h1>
            
            {/* 저장 공간 인디케이터 */}
            {storageInfo && (
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">저장공간:</span>
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        storageInfo.percentage > 80 ? 'bg-red-500' :
                        storageInfo.percentage > 60 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${storageInfo.percentage}%` }}
                    />
                  </div>
                  <span className={`font-medium ${
                    storageInfo.percentage > 80 ? 'text-red-600' :
                    storageInfo.percentage > 60 ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {storageInfo.used.toFixed(1)}MB / {storageInfo.total.toFixed(0)}MB
                  </span>
                </div>
              </div>
            )}
          </div>
        {/* 활성 정렬 표시 (간단한 버전) */}
        {sortConfigs.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500 font-medium">정렬:</span>
            {sortConfigs.map((config, index) => (
              <div key={`${config.field}-${index}`} className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs">
                <span className="font-bold text-indigo-600">
                  {index + 1}
                </span>
                <span className="text-gray-700">
                  {config.field === 'totalSearch' && '총 검색량'}
                  {config.field === 'keyword' && '키워드'}
                  {config.field === 'monthlyPcSearch' && 'PC 검색'}
                  {config.field === 'monthlyMobileSearch' && '모바일 검색'}
                  {config.field === 'competition' && '경쟁도'}
                  {config.field === 'blogTotalCount' && '블로그 문서수'}
                  {config.field === 'cafeTotalCount' && '카페 문서수'}
                  {config.field === 'newsTotalCount' && '뉴스 문서수'}
                  {config.field === 'webkrTotalCount' && '웹문서 문서수'}
                </span>
                <span className={`font-bold ${
                  config.order === 'asc' 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {config.order === 'asc' ? '▲' : '▼'}
                </span>
              </div>
            ))}
            <button
              onClick={handleClearAllSorts}
              className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded border border-gray-300 hover:border-red-300 transition-colors"
              title="모든 정렬 제거"
            >
              모두 제거
            </button>
          </div>
        )}
          
          {/* 활성 필터 표시 */}
          {(filters.keyword || filters.minSearch || filters.maxSearch || filters.competition.length > 0 || filters.hasDocCounts ||
            filters.minBlogCount || filters.maxBlogCount || filters.minCafeCount || filters.maxCafeCount ||
            filters.minNewsCount || filters.maxNewsCount || filters.minWebkrCount || filters.maxWebkrCount) && (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">필터:</span>
              {filters.keyword && (
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-800">
                  키워드: {filters.keyword}
                </span>
              )}
              {filters.minSearch && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                  검색량 최소: {parseInt(filters.minSearch).toLocaleString()}
                </span>
              )}
              {filters.maxSearch && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                  검색량 최대: {parseInt(filters.maxSearch).toLocaleString()}
                </span>
              )}
              {filters.competition.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                  경쟁도: {filters.competition.join(', ')}
                </span>
              )}
              {filters.hasDocCounts && (
                <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-800">
                  문서수 보유
                </span>
              )}
              {filters.minBlogCount && (
                <span className="inline-flex items-center rounded-full bg-pink-100 px-2 py-1 text-xs text-pink-800">
                  블로그 최소: {parseInt(filters.minBlogCount).toLocaleString()}
                </span>
              )}
              {filters.maxBlogCount && (
                <span className="inline-flex items-center rounded-full bg-pink-100 px-2 py-1 text-xs text-pink-800">
                  블로그 최대: {parseInt(filters.maxBlogCount).toLocaleString()}
                </span>
              )}
              {filters.minCafeCount && (
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                  카페 최소: {parseInt(filters.minCafeCount).toLocaleString()}
                </span>
              )}
              {filters.maxCafeCount && (
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                  카페 최대: {parseInt(filters.maxCafeCount).toLocaleString()}
                </span>
              )}
              {filters.minNewsCount && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">
                  뉴스 최소: {parseInt(filters.minNewsCount).toLocaleString()}
                </span>
              )}
              {filters.maxNewsCount && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">
                  뉴스 최대: {parseInt(filters.maxNewsCount).toLocaleString()}
                </span>
              )}
              {filters.minWebkrCount && (
                <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-1 text-xs text-teal-800">
                  웹문서 최소: {parseInt(filters.minWebkrCount).toLocaleString()}
                </span>
              )}
              {filters.maxWebkrCount && (
                <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-1 text-xs text-teal-800">
                  웹문서 최대: {parseInt(filters.maxWebkrCount).toLocaleString()}
                </span>
              )}
            </div>
          )}
          {isFetchingDocs && (
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-md border border-blue-100">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-600 opacity-50 animate-pulse"></div>
                <span className="font-medium">🚀 백그라운드 수집 중</span>
                {fetchProgress.total > 0 && (
                  <span className="text-gray-400">
                    - {fetchProgress.current}/{fetchProgress.total}개 ({Math.round(fetchProgress.current / fetchProgress.total * 100)}%)
                  </span>
                )}
                {/* 🆕 작업 시간 표시 */}
                {(() => {
                  const startTime = localStorage.getItem('nkeyword:jobStartTime');
                  if (startTime) {
                    const elapsed = Math.floor((Date.now() - parseInt(startTime)) / 1000);
                    const minutes = Math.floor(elapsed / 60);
                    const seconds = elapsed % 60;
                    return (
                      <span className={`font-medium ${elapsed > 300 ? 'text-red-600' : 'text-gray-600'}`}>
                        ({minutes}분 {seconds}초 경과)
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEmergencyReset}
                  className="text-orange-600 hover:text-orange-800 font-medium px-2 py-1 rounded border border-orange-200 hover:bg-orange-50"
                  title="모든 작업 초기화 및 새로고침"
                >
                  🆘 긴급복구
                </button>
                <button
                  onClick={handleForceStopJob}
                  className="text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded border border-red-200 hover:bg-red-50"
                  title="작업 강제 중지"
                >
                  강제 중지
                </button>
                <button
                  onClick={() => {
                    setIsFetchingDocs(false);
                    setCurrentJobId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="알림 숨기기 (백그라운드 작업은 계속됩니다)"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 저장 공간 80% 이상일 때 긴급 복구 버튼 표시 */}
          {storageInfo && storageInfo.percentage > 80 && (
            <button 
              onClick={handleEmergencyClear}
              className="rounded-md bg-orange-600 px-3 py-2 text-sm text-white hover:bg-orange-700 font-medium"
              title="구버전 데이터를 삭제하여 공간 확보"
            >
              🆘 긴급 복구
            </button>
          )}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded-md border px-3 py-2 text-sm shadow-sm ${
              showFilters 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            필터 {showFilters ? '숨기기' : '보기'}
          </button>
          {/* 🆕 자동 문서수 수집 토글 */}
          <button
            onClick={() => setBackgroundAutoCollection(!backgroundAutoCollection)}
            className={`rounded-md border px-3 py-2 text-sm shadow-sm transition-colors ${
              backgroundAutoCollection
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-white hover:bg-gray-50 border-gray-300'
            }`}
            title={backgroundAutoCollection ? '백그라운드 자동수집 활성화 (페이지 로드 시 자동 시작)' : '백그라운드 자동수집 비활성화 (수동으로 시작)'}
          >
            {backgroundAutoCollection ? '🔵 백그라운드 수집 ON' : '⚪ 백그라운드 수집 OFF'}
          </button>
          <button
            onClick={() => setAutoDocCollection(!autoDocCollection)}
            className={`rounded-md border px-3 py-2 text-sm shadow-sm transition-colors ${
              autoDocCollection
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-white hover:bg-gray-50 border-gray-300'
            }`}
            title={autoDocCollection ? '데이터 추가 시 자동 수집 (클릭하여 비활성화)' : '데이터 추가 시 수동 수집 (클릭하여 활성화)'}
          >
            {autoDocCollection ? '🟢 추가시 자동수집' : '⚪ 추가시 수동수집'}
          </button>
          {/* 🆕 수동 문서수 조회 버튼 */}
          <button 
            onClick={() => {
              const keywordsWithoutDocs = getKeywordsWithoutDocCounts();
              if (keywordsWithoutDocs.length > 0) {
                startDocumentCountCollection();
              } else {
                alert('모든 키워드의 문서수가 이미 수집되었습니다.');
              }
            }}
            disabled={isFetchingDocs}
            className="rounded-md border bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="문서수 없는 키워드 수동 수집"
          >
            📊 문서수 조회
          </button>
          <ExportButton data={exportData} keyword={"dataset"} />
          {selectedKeywords.size > 0 && (
            <button 
              onClick={handleDeleteSelected}
              className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
            >
              선택 삭제 ({selectedKeywords.size}개)
            </button>
          )}
          <button 
            onClick={handleCreateTestData} 
            disabled={isMigrating}
            className="rounded-md border bg-green-500 text-white px-3 py-2 text-sm shadow-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMigrating ? '🔄 생성 중...' : '🧪 테스트 데이터 생성'}
          </button>
          <button 
            onClick={handleDataMigration} 
            disabled={isMigrating}
            className="rounded-md border bg-blue-500 text-white px-3 py-2 text-sm shadow-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMigrating ? '🔄 마이그레이션 중...' : '🔄 데이터 마이그레이션'}
          </button>
          <button onClick={handleClear} className="rounded-md border bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50">전체 삭제</button>
        </div>
      </div>

      {/* 필터 섹션 (코드 스플리팅 적용) */}
      {showFilters && (
        <div className="mb-6">
          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleClearFilters}
          />
        </div>
      )}

      {total > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              {startIndex + 1}-{Math.min(endIndex, total)} / {total.toLocaleString()}개
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">페이지당:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // 첫 페이지로 이동
                }}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={30}>30개</option>
                <option value={50}>50개</option>
                <option value={100}>100개</option>
                <option value={200}>200개</option>
                <option value={500}>500개</option>
              </select>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
            {/* 처음 버튼 */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="rounded px-3 py-1 text-sm font-medium disabled:opacity-30 hover:bg-gray-100 transition-colors"
              title="처음"
            >
              ≪
            </button>
            
            {/* 이전 10페이지 */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 10))}
              disabled={currentPage <= 10}
              className="rounded px-3 py-1 text-sm font-medium disabled:opacity-30 hover:bg-gray-100 transition-colors"
              title="이전 10페이지"
            >
              ‹
            </button>
            
            {/* 페이지 번호들 (10개씩) */}
            {(() => {
              const pageGroup = Math.floor((currentPage - 1) / 10);
              const startPage = pageGroup * 10 + 1;
              const endPage = Math.min(startPage + 9, totalPages);
              const pages = [];
              
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`min-w-[32px] rounded px-2 py-1 text-sm font-medium transition-colors ${
                      currentPage === i
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {i}
                  </button>
                );
              }
              
              return pages;
            })()}
            
            {/* 다음 10페이지 */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 10))}
              disabled={currentPage > totalPages - 10}
              className="rounded px-3 py-1 text-sm font-medium disabled:opacity-30 hover:bg-gray-100 transition-colors"
              title="다음 10페이지"
            >
              ›
            </button>
            
            {/* 마지막 버튼 */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="rounded px-3 py-1 text-sm font-medium disabled:opacity-30 hover:bg-gray-100 transition-colors"
              title="마지막"
            >
              ≫
            </button>
            
            {/* 페이지 정보 */}
            <span className="ml-2 text-sm text-gray-600">
              {currentPage} / {totalPages}
            </span>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="border-b">
              <th className="px-2 py-2 w-8">
                <input
                  type="checkbox"
                  checked={currentPageData.length > 0 && selectedKeywords.size === currentPageData.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
                <th className="px-2 py-2 min-w-[120px] max-w-[200px]">
                  <div className="flex items-center text-xs">
                    키워드
                    <SortButtons field="keyword" />
                  </div>
                </th>
                <th className="px-2 py-2 text-right w-20">
                  <div className="flex items-center justify-end text-xs">
                    총검색
                    <SortButtons field="totalSearch" />
                  </div>
                </th>
                <th className="px-2 py-2 text-right w-16">
                  <div className="flex items-center justify-end text-xs">
                    PC
                    <SortButtons field="monthlyPcSearch" />
                  </div>
                </th>
                <th className="px-2 py-2 text-right w-16">
                  <div className="flex items-center justify-end text-xs">
                    모바일
                    <SortButtons field="monthlyMobileSearch" />
                  </div>
                </th>
                <th className="px-2 py-2 w-12 text-center">
                  <div className="flex items-center justify-center text-xs">
                    경쟁
                    <SortButtons field="competition" />
                  </div>
                </th>
                <th className="px-2 py-2 text-right w-16">
                  <div className="flex items-center justify-end text-xs">
                    블로그
                    <SortButtons field="blogTotalCount" />
                  </div>
                </th>
                <th className="px-2 py-2 text-right w-16">
                  <div className="flex items-center justify-end text-xs">
                    카페
                    <SortButtons field="cafeTotalCount" />
                  </div>
                </th>
                <th className="px-2 py-2 text-right w-16">
                  <div className="flex items-center justify-end text-xs">
                    뉴스
                    <SortButtons field="newsTotalCount" />
                  </div>
                </th>
                <th className="px-2 py-2 text-right w-16">
                  <div className="flex items-center justify-end text-xs">
                    웹문서
                    <SortButtons field="webkrTotalCount" />
                  </div>
                </th>
              <th className="px-2 py-2 text-right w-14 text-xs">PC클릭</th>
              <th className="px-2 py-2 text-right w-14 text-xs">M클릭</th>
              <th className="px-2 py-2 text-right w-14 text-xs">PC율</th>
              <th className="px-2 py-2 text-right w-14 text-xs">M율</th>
              <th className="px-2 py-2 text-right w-12 text-xs">광고</th>
              <th className="px-2 py-2 w-24 text-xs">수집일</th>
              <th className="px-2 py-2 w-12 text-xs">작업</th>
            </tr>
          </thead>
            <tbody>
            {currentPageData.map((row) => (
              <TableRow
                key={row.keyword}
                row={row}
                isSelected={selectedKeywords.has(row.keyword)}
                onSelect={() => handleSelectKeyword(row.keyword)}
                onDelete={() => handleDeleteKeyword(row.keyword)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}


