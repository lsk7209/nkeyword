// 데이터 로딩 전용 Web Worker
// 압축 해제와 JSON 파싱을 백그라운드에서 처리하여 메인 스레드 블로킹 방지

// lz-string 라이브러리 로드 (CDN)
importScripts('https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js');

const DATASET_KEY = 'nkeyword:dataset:v2';
const OLD_DATASET_KEY = 'nkeyword:dataset:v1';

// 메인 스레드로부터 메시지 수신
self.addEventListener('message', async (e) => {
  const { type, compressedData, key } = e.data;

  if (type === 'LOAD_FROM_STORAGE') {
    loadFromStorage();
  } else if (type === 'DECOMPRESS_AND_PARSE') {
    decompressAndParse(compressedData);
  } else if (type === 'PARSE_JSON') {
    parseJSON(compressedData);
  }
});

// localStorage에서 직접 로드 (Worker에서는 localStorage 접근 불가)
// 따라서 메인 스레드에서 데이터를 받아서 처리
function decompressAndParse(compressedData) {
  const startTime = performance.now();
  
  try {
    console.log('[Data Worker] 압축 해제 시작...');
    
    // 압축 해제
    const decompressed = LZString.decompress(compressedData);
    const decompressTime = performance.now() - startTime;
    console.log(`[Data Worker] 압축 해제 완료: ${decompressTime.toFixed(0)}ms`);
    
    if (!decompressed) {
      self.postMessage({
        type: 'ERROR',
        error: '압축 해제 실패',
      });
      return;
    }
    
    // JSON 파싱
    const parseStartTime = performance.now();
    const data = JSON.parse(decompressed);
    const parseTime = performance.now() - parseStartTime;
    console.log(`[Data Worker] JSON 파싱 완료: ${parseTime.toFixed(0)}ms`);
    
    const totalTime = performance.now() - startTime;
    
    self.postMessage({
      type: 'DATA_LOADED',
      data: data,
      stats: {
        decompressTime: Math.round(decompressTime),
        parseTime: Math.round(parseTime),
        totalTime: Math.round(totalTime),
        itemCount: data.length,
      },
    });
  } catch (error) {
    console.error('[Data Worker] 오류:', error);
    self.postMessage({
      type: 'ERROR',
      error: error.message,
    });
  }
}

// JSON 파싱만 수행 (구버전 데이터용)
function parseJSON(jsonString) {
  const startTime = performance.now();
  
  try {
    console.log('[Data Worker] JSON 파싱 시작...');
    const data = JSON.parse(jsonString);
    const totalTime = performance.now() - startTime;
    
    console.log(`[Data Worker] JSON 파싱 완료: ${totalTime.toFixed(0)}ms`);
    
    self.postMessage({
      type: 'DATA_LOADED',
      data: data,
      stats: {
        parseTime: Math.round(totalTime),
        totalTime: Math.round(totalTime),
        itemCount: data.length,
      },
    });
  } catch (error) {
    console.error('[Data Worker] JSON 파싱 오류:', error);
    self.postMessage({
      type: 'ERROR',
      error: error.message,
    });
  }
}

console.log('[Data Worker] 초기화 완료');

