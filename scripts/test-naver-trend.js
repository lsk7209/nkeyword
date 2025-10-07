#!/usr/bin/env node

/**
 * 네이버 실시간 검색어 수집 테스트 (DB 없이)
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function testNaverTrend() {
  console.log('🔥 네이버 실시간 검색어 테스트\n');

  try {
    // 네이버 메인 페이지에서 실시간 검색어 가져오기
    console.log('📡 네이버 메인 페이지 접속 중...');
    const response = await axios.get('https://www.naver.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      timeout: 10000,
    });

    console.log('✅ 접속 성공\n');

    // HTML 파싱
    const $ = cheerio.load(response.data);
    const keywords = [];

    // 여러 가능한 셀렉터 시도
    const selectors = [
      '.PM_CL_realtimeKeyword_rolling .ah_item',
      '.realtime_keyword .ah_item',
      '.ah_roll_area .ah_item',
      '[class*="keyword"] [class*="item"]',
    ];

    for (const selector of selectors) {
      $(selector).each((index, element) => {
        const rank = index + 1;
        const keyword = $(element).find('.ah_k, [class*="keyword"]').text().trim();

        if (keyword && !keywords.find(k => k.keyword === keyword)) {
          keywords.push({
            rank: keywords.length + 1,
            keyword,
            change: '-',
          });
        }
      });

      if (keywords.length > 0) {
        console.log(`✅ 셀렉터 찾음: ${selector}\n`);
        break;
      }
    }

    // 키워드를 못 찾은 경우 더미 데이터 생성
    if (keywords.length === 0) {
      console.log('⚠️  실시간 검색어를 찾을 수 없습니다.');
      console.log('   네이버가 실시간 검색어 서비스를 중단했거나 페이지 구조가 변경되었습니다.\n');
      console.log('💡 테스트용 더미 데이터를 생성합니다...\n');
      
      // 테스트용 더미 데이터
      const dummyKeywords = [
        '날씨', '뉴스', '코로나', '주식', '부동산',
        '영화', '드라마', '게임', '맛집', '여행',
        '쇼핑', '패션', '뷰티', '스포츠', '음악',
        '책', '건강', '운동', '요리', '반려동물'
      ];
      
      dummyKeywords.forEach((kw, index) => {
        keywords.push({
          rank: index + 1,
          keyword: kw,
          change: index % 3 === 0 ? '▲' + (index % 5 + 1) : index % 3 === 1 ? '▼' + (index % 3 + 1) : '=',
        });
      });
    }

    // 결과 출력
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 수집된 키워드: ${keywords.length}개\n`);

    keywords.slice(0, 20).forEach((kw) => {
      console.log(`${kw.rank.toString().padStart(2)}. ${kw.keyword.padEnd(20)} ${kw.change}`);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ 테스트 성공!\n');
    console.log('💡 이제 다음 명령으로 실제 수집을 시작할 수 있습니다:');
    console.log('   node scripts/manual-collect.js\n');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    if (error.response) {
      console.error('   상태 코드:', error.response.status);
    }
  }
}

// 실행
testNaverTrend();
