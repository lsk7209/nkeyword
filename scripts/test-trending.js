#!/usr/bin/env node

/**
 * 트렌드 API 테스트 스크립트
 * 
 * 사용법:
 *   node scripts/test-trending.js
 */

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function testEndpoint(name, url, options = {}) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ Success (${response.status})`);
      console.log(`   📊 Data:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
    } else {
      console.log(`   ❌ Failed (${response.status})`);
      console.log(`   📊 Error:`, data);
    }
    
    return { success: response.ok, data };
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 트렌드 API 테스트 시작\n');
  console.log('=' .repeat(50));
  
  // 1. 키워드 목록 조회
  await testEndpoint(
    '키워드 목록 (실시간)',
    `${baseUrl}/api/trending/keywords?limit=5&timeRange=realtime`
  );
  
  // 2. 키워드 목록 조회 (카테고리)
  await testEndpoint(
    '키워드 목록 (엔터테인먼트)',
    `${baseUrl}/api/trending/keywords?limit=5&category=entertainment`
  );
  
  // 3. 통계 조회
  await testEndpoint(
    '일별 통계',
    `${baseUrl}/api/trending/stats`
  );
  
  // 4. 키워드 검색
  await testEndpoint(
    '키워드 검색',
    `${baseUrl}/api/trending/search?q=게임&limit=5`
  );
  
  // 5. 키워드 이력 조회 (샘플)
  await testEndpoint(
    '키워드 이력',
    `${baseUrl}/api/trending/history/${encodeURIComponent('게임')}`
  );
  
  // 6. 수집 트리거 (인증 필요)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    await testEndpoint(
      '수집 트리거 (인증)',
      `${baseUrl}/api/trending/collect`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
        },
      }
    );
  } else {
    console.log('\n⚠️  CRON_SECRET이 설정되지 않아 수집 트리거 테스트를 건너뜁니다.');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ 테스트 완료\n');
}

// 테스트 실행
runTests().catch(error => {
  console.error('❌ 테스트 실패:', error);
  process.exit(1);
});

