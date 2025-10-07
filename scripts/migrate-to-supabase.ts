/**
 * LocalStorage 데이터를 Supabase로 마이그레이션하는 스크립트
 * 
 * 사용법:
 * 1. 브라우저 콘솔에서 실행하여 데이터 내보내기
 * 2. 이 스크립트로 Supabase에 가져오기
 */

import { batchInsertKeywords } from '../lib/supabase/keywords';
import * as fs from 'fs';

// Step 1: 브라우저 콘솔에서 실행 (데이터 내보내기)
export function exportLocalStorageData() {
  const data = localStorage.getItem('nkeyword:dataset:v1');
  if (!data) {
    console.error('LocalStorage에 데이터가 없습니다');
    return;
  }

  const keywords = JSON.parse(data);
  console.log(`총 ${keywords.length}개 키워드 발견`);

  // JSON 파일로 다운로드
  const blob = new Blob([JSON.stringify(keywords, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `keywords-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  
  console.log('✅ 데이터 내보내기 완료!');
}

// Step 2: Node.js에서 실행 (Supabase로 가져오기)
export async function importToSupabase(filePath: string) {
  console.log('📦 데이터 가져오기 시작...');
  
  // JSON 파일 읽기
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const keywords = JSON.parse(fileContent);
  
  console.log(`총 ${keywords.length}개 키워드 발견`);
  
  // 데이터 변환 (LocalStorage 형식 → Supabase 형식)
  const transformedKeywords = keywords.map((kw: any) => ({
    keyword: kw.keyword,
    root_keyword: kw.rootKeyword,
    monthly_pc_search: kw.monthlyPcSearch || 0,
    monthly_mobile_search: kw.monthlyMobileSearch || 0,
    competition: kw.competition,
    blog_total_count: kw.blogTotalCount,
    cafe_total_count: kw.cafeTotalCount,
    news_total_count: kw.newsTotalCount,
    webkr_total_count: kw.webkrTotalCount,
    monthly_pc_clicks: kw.monthlyPcClicks,
    monthly_mobile_clicks: kw.monthlyMobileClicks,
    monthly_pc_click_rate: kw.monthlyPcClickRate,
    monthly_mobile_click_rate: kw.monthlyMobileClickRate,
    monthly_ad_count: kw.monthlyAdCount,
    used_as_seed: kw.usedAsSeed || false,
    seed_depth: kw.seedDepth || 0,
    queried_at: kw.queriedAt || new Date().toISOString(),
  }));
  
  // 배치 삽입
  console.log('🚀 Supabase로 업로드 시작...');
  await batchInsertKeywords(transformedKeywords);
  
  console.log('✅ 마이그레이션 완료!');
}

// 실행 예시
if (require.main === module) {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('사용법: ts-node scripts/migrate-to-supabase.ts <파일경로>');
    console.error('예시: ts-node scripts/migrate-to-supabase.ts keywords-backup-2024-01-01.json');
    process.exit(1);
  }
  
  importToSupabase(filePath)
    .then(() => {
      console.log('✅ 완료!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 오류:', error);
      process.exit(1);
    });
}
