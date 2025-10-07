#!/usr/bin/env node

/**
 * 수동 키워드 수집 스크립트
 * 
 * 사용법:
 *   node scripts/manual-collect.js
 * 
 * 환경변수:
 *   SERPAPI_KEY - SerpApi 키 (필수)
 *   DATABASE_URL - PostgreSQL 연결 문자열 (필수)
 */

require('dotenv').config({ path: '.env.local' });

async function collectKeywords() {
  console.log('🔥 트렌드 키워드 수동 수집 시작\n');
  
  // 환경변수 확인
  if (!process.env.SERPAPI_KEY) {
    console.error('❌ SERPAPI_KEY 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }
  
  try {
    // 데이터베이스 연결 확인
    console.log('📡 데이터베이스 연결 확인 중...');
    const { checkDatabaseConnection } = require('../lib/db/client');
    const dbConnected = await checkDatabaseConnection();
    
    if (!dbConnected) {
      throw new Error('데이터베이스 연결 실패');
    }
    
    console.log('✅ 데이터베이스 연결 성공\n');
    
    // 키워드 수집 작업 실행
    console.log('🔍 키워드 수집 중...');
    const { collectTrendingKeywordsJob } = require('../lib/scheduler/jobs');
    const result = await collectTrendingKeywordsJob();
    
    console.log('\n✅ 수집 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 수집된 키워드: ${result.count}개`);
    console.log(`🆕 신규 키워드: ${result.newKeywords}개`);
    console.log(`⏱️  소요 시간: ${result.duration}ms`);
    console.log(`🕐 수집 시간: ${result.timestamp}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('\n❌ 수집 실패:', error.message);
    if (error.stack) {
      console.error('\n스택 트레이스:', error.stack);
    }
    process.exit(1);
  }
}

// 실행
collectKeywords();

