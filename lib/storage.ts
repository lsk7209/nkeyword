import type { KeywordData } from '@/lib/types';
import LZString from 'lz-string';

const DATASET_KEY = 'nkeyword:dataset:v2'; // 압축 버전
const OLD_DATASET_KEY = 'nkeyword:dataset:v1'; // 구버전 호환

export interface StoredRow extends KeywordData {
  queriedAt: string;
  rootKeyword: string;
  usedAsSeed?: boolean; // 시드키워드로 사용되었는지 여부
  seedDepth?: number; // 시드 깊이 (0: 원본, 1: 1차 연관, 2: 2차 연관, ...)
}

export type Dataset = StoredRow[];

function safeParse(json: string | null): Dataset {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? (arr as Dataset) : [];
  } catch {
    return [];
  }
}

// Worker를 사용한 비동기 데이터 로딩 (최적화된 버전)
export async function loadDatasetAsync(): Promise<Dataset> {
  if (typeof window === 'undefined') return [];
  
  return new Promise((resolve) => {
    try {
      console.log('[Storage] 비동기 데이터 로드 시작...');
      
      // 1. 압축 버전 확인
      const compressed = localStorage.getItem(DATASET_KEY);
      
      if (compressed && typeof Worker !== 'undefined') {
        try {
          const worker = new Worker('/data-loader-worker.js');
          let resolved = false;
          
          // 타임아웃 설정 (3초)
          const timeout = setTimeout(() => {
            if (!resolved) {
              console.warn('[Storage] Worker 타임아웃 - 동기 방식 사용');
              worker.terminate();
              resolved = true;
              resolve(loadDataset());
            }
          }, 3000);
          
          worker.onmessage = (e) => {
            if (resolved) return;
            
            const { type, data, stats, error } = e.data;
            
            if (type === 'DATA_LOADED') {
              console.log(`[Storage] ✅ Worker 로드 성공: ${data.length}개 키워드`);
              console.log(`[Storage] 성능:`, stats);
              clearTimeout(timeout);
              worker.terminate();
              resolved = true;
              resolve(data);
            } else if (type === 'ERROR') {
              console.error('[Storage] Worker 오류:', error);
              clearTimeout(timeout);
              worker.terminate();
              resolved = true;
              resolve(loadDataset());
            }
          };
          
          worker.onerror = (error) => {
            if (resolved) return;
            console.error('[Storage] Worker 실행 오류:', error);
            clearTimeout(timeout);
            worker.terminate();
            resolved = true;
            resolve(loadDataset());
          };
          
          // Worker에 데이터 전송
          worker.postMessage({
            type: 'DECOMPRESS_AND_PARSE',
            compressedData: compressed,
          });
          
          return; // Promise pending
        } catch (workerError) {
          console.error('[Storage] Worker 생성 실패:', workerError);
          // 폴백
        }
      }
      
      // Worker 미지원 또는 데이터 없음 - 동기 방식 사용
      console.log('[Storage] 동기 방식 사용');
      resolve(loadDataset());
    } catch (error) {
      console.error('[Storage] 비동기 로드 오류:', error);
      resolve(loadDataset());
    }
  });
}

// 압축된 데이터 로드 (동기 버전 - 후방 호환성 유지)
export function loadDataset(): Dataset {
  if (typeof window === 'undefined') return [];
  
  try {
    // 🚀 성능 최적화: 로그 최소화
    const startTime = performance.now();
    
    // 1. 새 압축 버전 시도
    const compressed = localStorage.getItem(DATASET_KEY);
    
    if (compressed) {
      try {
        const decompressed = LZString.decompress(compressed);
        if (decompressed) {
          const data = safeParse(decompressed);
          const loadTime = performance.now() - startTime;
          if (loadTime > 100) {
            console.log(`[Storage] ✅ 데이터 로드: ${data.length}개 키워드, ${loadTime.toFixed(0)}ms`);
          }
          return data;
        }
      } catch (decompressError) {
        console.error('[Storage] ❌ 압축 해제 중 오류:', decompressError);
        // 압축 버전이 손상된 경우 구버전으로 폴백
      }
    }
    
    // 2. 구버전 데이터 마이그레이션 (안전하게)
    const oldData = localStorage.getItem(OLD_DATASET_KEY);
    
    if (oldData) {
      const data = safeParse(oldData);
      
      if (data.length > 0) {
        try {
          // ⚠️ 중요: 먼저 구버전 삭제하여 공간 확보
          localStorage.removeItem(OLD_DATASET_KEY);
          
          // 그 다음 압축 버전으로 저장
          const json = JSON.stringify(data);
          const compressed = LZString.compress(json);
          
          localStorage.setItem(DATASET_KEY, compressed);
          console.log(`[Storage] ✅ 마이그레이션 완료: ${data.length}개 키워드`);
        } catch (error: any) {
          console.error('[Storage] ❌ 마이그레이션 실패:', error);
          // 마이그레이션 실패 시 원본 데이터는 이미 삭제됨
          alert('⚠️ 데이터 마이그레이션 실패\n\n저장 공간이 부족합니다. 브라우저의 localStorage를 수동으로 정리해주세요.\n\n개발자 도구 > Application > Local Storage에서 nkeyword 관련 항목을 삭제하세요.');
          return [];
        }
      }
      return data;
    }
    
    return [];
  } catch (error) {
    console.error('[Storage] ❌ 데이터 로드 오류:', error);
    return [];
  }
}

export function clearDataset() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DATASET_KEY);
  localStorage.removeItem(OLD_DATASET_KEY); // 구버전도 삭제
}

// 압축하여 저장
export function saveDataset(rows: Dataset) {
  if (typeof window === 'undefined') return;
  
  try {
    const json = JSON.stringify(rows);
    const compressed = LZString.compress(json);
    
    // 압축률 로그
    const originalSize = new Blob([json]).size;
    const compressedSize = new Blob([compressed]).size;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    console.log(`[Storage] 압축 저장: ${rows.length}개 키워드, ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${ratio}% 절약)`);
    
    localStorage.setItem(DATASET_KEY, compressed);
  } catch (error: any) {
    console.error('[Storage] 저장 오류:', error);
    
    // 용량 초과 오류 시 안내
    if (error?.name === 'QuotaExceededError') {
      alert('⚠️ 저장 공간이 부족합니다.\n\n오래된 데이터를 삭제하거나, 일부 키워드를 내보내기(Export)한 후 삭제해주세요.');
      throw new Error('localStorage 용량 초과');
    }
    throw error;
  }
}

export function addResults(rootKeyword: string, results: KeywordData[]) {
  if (typeof window === 'undefined') return;
  const now = new Date().toISOString();
  const existing = loadDataset();

  // De-duplicate by keyword (case-sensitive). Keep first occurrence.
  const map = new Map<string, StoredRow>();
  for (const row of existing) {
    map.set(row.keyword, row);
  }
  for (const r of results) {
    if (!map.has(r.keyword)) {
      map.set(r.keyword, { ...r, rootKeyword, queriedAt: now });
    }
  }
  saveDataset(Array.from(map.values()));
}

export function deleteKeywords(keywords: string[]) {
  if (typeof window === 'undefined') return;
  const existing = loadDataset();
  const filtered = existing.filter(row => !keywords.includes(row.keyword));
  saveDataset(filtered);
}

export function deleteKeyword(keyword: string) {
  if (typeof window === 'undefined') return;
  const existing = loadDataset();
  const filtered = existing.filter(row => row.keyword !== keyword);
  saveDataset(filtered);
}

export function updateDocumentCounts(keyword: string, counts: {
  blog?: number;
  cafe?: number;
  news?: number;
  webkr?: number;
}) {
  if (typeof window === 'undefined') return;
  const existing = loadDataset();
  const updated = existing.map(row => {
    if (row.keyword === keyword) {
      return {
        ...row,
        blogTotalCount: counts.blog ?? row.blogTotalCount,
        cafeTotalCount: counts.cafe ?? row.cafeTotalCount,
        newsTotalCount: counts.news ?? row.newsTotalCount,
        webkrTotalCount: counts.webkr ?? row.webkrTotalCount,
      };
    }
    return row;
  });
  saveDataset(updated);
}

export function getKeywordsWithoutDocCounts(): string[] {
  if (typeof window === 'undefined') return [];
  const dataset = loadDataset();
  return dataset
    .filter(row => 
      row.blogTotalCount === undefined || 
      row.cafeTotalCount === undefined || 
      row.newsTotalCount === undefined || 
      row.webkrTotalCount === undefined
    )
    .map(row => row.keyword);
}

// 시드키워드로 사용되지 않은 키워드 가져오기
export function getUnusedSeedKeywords(limit: number = 10): StoredRow[] {
  if (typeof window === 'undefined') return [];
  const dataset = loadDataset();
  
  // 검색량이 높은 순으로 정렬하여 미사용 시드 선택
  const unusedSeeds = dataset
    .filter(row => !row.usedAsSeed)
    .sort((a, b) => b.totalSearch - a.totalSearch)
    .slice(0, limit);
  
  console.log(`[Storage] 미사용 시드 ${unusedSeeds.length}개 발견 (전체: ${dataset.length}개)`);
  console.log(`[Storage] 선택된 시드:`, unusedSeeds.map(s => s.keyword).join(', '));
  
  return unusedSeeds;
}

// 키워드를 시드로 표시
export function markAsUsedSeed(keyword: string) {
  if (typeof window === 'undefined') return;
  const existing = loadDataset();
  
  const keywordExists = existing.some(row => row.keyword === keyword);
  if (!keywordExists) {
    console.warn(`[Storage] 시드로 표시 실패: "${keyword}" 키워드를 찾을 수 없음`);
    return;
  }
  
  const updated = existing.map(row => {
    if (row.keyword === keyword) {
      console.log(`[Storage] "${keyword}" 시드로 표시 (이전: ${row.usedAsSeed}, 이후: true)`);
      return { ...row, usedAsSeed: true };
    }
    return row;
  });
  
  saveDataset(updated);
  
  // 저장 확인
  const verification = loadDataset();
  const marked = verification.find(row => row.keyword === keyword);
  if (marked?.usedAsSeed) {
    console.log(`[Storage] ✅ "${keyword}" 시드 표시 저장 완료`);
  } else {
    console.error(`[Storage] ❌ "${keyword}" 시드 표시 저장 실패`);
  }
}

// 자동 수집 설정 저장/로드
const AUTO_COLLECT_KEY = 'nkeyword:autoCollect:v1';

export interface AutoCollectConfig {
  enabled: boolean;
  maxDepth: number; // 최대 깊이 (예: 3 = 시드 -> 1차 -> 2차 -> 3차)
  intervalMinutes: number; // 수집 간격 (분)
  batchSize: number; // 한 번에 수집할 시드 개수
  targetCount?: number; // 목표 수집 개수 (0 = 무제한)
}

export function getAutoCollectConfig(): AutoCollectConfig {
  if (typeof window === 'undefined') {
    return { enabled: false, maxDepth: 3, intervalMinutes: 10, batchSize: 5, targetCount: 0 };
  }
  const json = localStorage.getItem(AUTO_COLLECT_KEY);
  if (!json) {
    return { enabled: false, maxDepth: 3, intervalMinutes: 10, batchSize: 5, targetCount: 0 };
  }
  try {
    const config = JSON.parse(json);
    // 기존 설정에 targetCount 추가
    if (config.targetCount === undefined) {
      config.targetCount = 0;
    }
    return config;
  } catch {
    return { enabled: false, maxDepth: 3, intervalMinutes: 10, batchSize: 5, targetCount: 0 };
  }
}

export function saveAutoCollectConfig(config: AutoCollectConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTO_COLLECT_KEY, JSON.stringify(config));
}

// 긴급 복구: 구버전 데이터 수동 삭제 (브라우저 콘솔에서 사용)
export function emergencyClearOldData() {
  if (typeof window === 'undefined') {
    console.log('브라우저 환경에서만 실행 가능합니다.');
    return;
  }
  
  console.log('[긴급 복구] 구버전 데이터 삭제 시작...');
  
  const oldKey = 'nkeyword:dataset:v1';
  const oldData = localStorage.getItem(oldKey);
  
  if (oldData) {
    const size = new Blob([oldData]).size / (1024 * 1024);
    console.log(`[긴급 복구] 구버전 데이터 발견: ${size.toFixed(2)}MB`);
    
    localStorage.removeItem(oldKey);
    console.log('[긴급 복구] ✅ 구버전 데이터 삭제 완료!');
    console.log('[긴급 복구] 페이지를 새로고침하세요.');
    
    return { success: true, freedSpace: size };
  } else {
    console.log('[긴급 복구] 구버전 데이터가 없습니다.');
    return { success: false, message: '구버전 데이터 없음' };
  }
}

// localStorage 상태 확인 (디버깅용)
export function debugStorageStatus() {
  if (typeof window === 'undefined') {
    console.log('브라우저 환경에서만 실행 가능합니다.');
    return;
  }
  
  console.log('=== localStorage 상태 확인 ===');
  
  const v2 = localStorage.getItem(DATASET_KEY);
  const v1 = localStorage.getItem(OLD_DATASET_KEY);
  
  console.log('압축 버전 (v2):', v2 ? `존재 (${(new Blob([v2]).size / 1024).toFixed(1)}KB)` : '없음');
  console.log('구버전 (v1):', v1 ? `존재 (${(new Blob([v1]).size / 1024).toFixed(1)}KB)` : '없음');
  
  if (v2) {
    try {
      const decompressed = LZString.decompress(v2);
      if (decompressed) {
        const data = JSON.parse(decompressed);
        console.log('✅ 압축 버전 정상:', Array.isArray(data) ? `${data.length}개 키워드` : '배열 아님');
      } else {
        console.log('❌ 압축 해제 실패');
      }
    } catch (error) {
      console.log('❌ 압축 버전 손상:', error);
    }
  }
  
  if (v1) {
    try {
      const data = JSON.parse(v1);
      console.log('✅ 구버전 정상:', Array.isArray(data) ? `${data.length}개 키워드` : '배열 아님');
    } catch (error) {
      console.log('❌ 구버전 손상:', error);
    }
  }
  
  // 전체 localStorage 사용량
  let totalSize = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += key.length + value.length;
      }
    }
  }
  console.log('전체 사용량:', (totalSize / (1024 * 1024)).toFixed(2), 'MB');
  console.log('=================================');
}

// 전역에 노출 (브라우저 콘솔에서 사용)
if (typeof window !== 'undefined') {
  (window as any).emergencyClearOldData = emergencyClearOldData;
  (window as any).debugStorageStatus = debugStorageStatus;
  (window as any).loadDataset = loadDataset; // 디버깅용
}


