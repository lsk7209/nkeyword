/**
 * 키워드 수집 추적기
 * - 순환 참조 방지
 * - 중복 수집 방지
 * - 수집 이력 관리
 */

interface CollectionHistory {
  keyword: string;
  collectedAt: string;
  depth: number;
  parentKeyword: string | null;
  childKeywords: string[];
}

const COLLECTION_HISTORY_KEY = 'nkeyword:collectionHistory:v1';
const MAX_HISTORY_SIZE = 10000; // 최대 이력 크기

/**
 * 수집 이력 로드
 */
export function getCollectionHistory(): Map<string, CollectionHistory> {
  if (typeof window === 'undefined') return new Map();
  
  try {
    const json = localStorage.getItem(COLLECTION_HISTORY_KEY);
    if (!json) return new Map();
    
    const array: [string, CollectionHistory][] = JSON.parse(json);
    return new Map(array);
  } catch (error) {
    console.error('[수집 추적] 이력 로드 실패:', error);
    return new Map();
  }
}

/**
 * 수집 이력 저장
 */
export function saveCollectionHistory(history: Map<string, CollectionHistory>) {
  if (typeof window === 'undefined') return;
  
  try {
    // 크기 제한 (오래된 항목부터 삭제)
    if (history.size > MAX_HISTORY_SIZE) {
      const entries = Array.from(history.entries());
      entries.sort((a, b) => 
        new Date(a[1].collectedAt).getTime() - new Date(b[1].collectedAt).getTime()
      );
      
      const toDelete = entries.slice(0, history.size - MAX_HISTORY_SIZE);
      toDelete.forEach(([key]) => history.delete(key));
      
      console.log(`[수집 추적] ${toDelete.length}개 오래된 이력 삭제`);
    }
    
    const array = Array.from(history.entries());
    localStorage.setItem(COLLECTION_HISTORY_KEY, JSON.stringify(array));
  } catch (error) {
    console.error('[수집 추적] 이력 저장 실패:', error);
  }
}

/**
 * 키워드가 이미 수집되었는지 확인
 */
export function isKeywordCollected(keyword: string): boolean {
  const history = getCollectionHistory();
  return history.has(keyword);
}

/**
 * 순환 참조 감지
 * - 키워드 A → B → C → A 같은 순환을 감지
 */
export function hasCircularReference(
  keyword: string,
  parentKeyword: string | null,
  maxDepth: number = 5
): boolean {
  if (!parentKeyword) return false;
  
  const history = getCollectionHistory();
  const visited = new Set<string>();
  
  let current: string | null = parentKeyword;
  let depth = 0;
  
  while (current && depth < maxDepth) {
    // 순환 감지
    if (visited.has(current)) {
      console.warn(`[수집 추적] ⚠️ 순환 참조 감지: ${keyword} ← ... ← ${current}`);
      return true;
    }
    
    // 자기 자신으로 돌아오는 경우
    if (current === keyword) {
      console.warn(`[수집 추적] ⚠️ 순환 참조 감지: ${keyword} ← ${parentKeyword}`);
      return true;
    }
    
    visited.add(current);
    
    // 부모의 부모 찾기
    const entry = history.get(current);
    current = entry?.parentKeyword || null;
    depth++;
  }
  
  if (depth >= maxDepth) {
    console.warn(`[수집 추적] ⚠️ 최대 깊이 초과: ${keyword} (깊이: ${depth})`);
    return true;
  }
  
  return false;
}

/**
 * 키워드 수집 기록
 */
export function recordCollection(
  keyword: string,
  parentKeyword: string | null,
  depth: number,
  childKeywords: string[]
) {
  const history = getCollectionHistory();
  
  const entry: CollectionHistory = {
    keyword,
    collectedAt: new Date().toISOString(),
    depth,
    parentKeyword,
    childKeywords,
  };
  
  history.set(keyword, entry);
  saveCollectionHistory(history);
  
  console.log(`[수집 추적] ✅ ${keyword} 기록됨 (깊이: ${depth}, 자식: ${childKeywords.length}개)`);
}

/**
 * 수집 가능 여부 확인 (종합)
 */
export function canCollectKeyword(
  keyword: string,
  parentKeyword: string | null,
  currentDepth: number,
  maxDepth: number
): { canCollect: boolean; reason?: string } {
  // 1. 최대 깊이 체크
  if (currentDepth >= maxDepth) {
    return {
      canCollect: false,
      reason: `최대 깊이 도달 (${currentDepth}/${maxDepth})`,
    };
  }
  
  // 2. 이미 수집되었는지 확인
  if (isKeywordCollected(keyword)) {
    return {
      canCollect: false,
      reason: '이미 수집됨',
    };
  }
  
  // 3. 순환 참조 확인
  if (hasCircularReference(keyword, parentKeyword, maxDepth)) {
    return {
      canCollect: false,
      reason: '순환 참조 감지',
    };
  }
  
  return { canCollect: true };
}

/**
 * 수집 통계 조회
 */
export function getCollectionStats() {
  const history = getCollectionHistory();
  
  const stats = {
    totalCollected: history.size,
    byDepth: new Map<number, number>(),
    recentCollections: [] as CollectionHistory[],
  };
  
  // 깊이별 통계
  for (const entry of history.values()) {
    const count = stats.byDepth.get(entry.depth) || 0;
    stats.byDepth.set(entry.depth, count + 1);
  }
  
  // 최근 10개
  const sorted = Array.from(history.values())
    .sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime())
    .slice(0, 10);
  stats.recentCollections = sorted;
  
  return stats;
}

/**
 * 이력 초기화
 */
export function clearCollectionHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(COLLECTION_HISTORY_KEY);
  console.log('[수집 추적] 이력 초기화 완료');
}

