// 문서수 수집 백그라운드 워커
// 프론트엔드에 영향을 주지 않고 백그라운드에서 작업 상태 모니터링

let currentJobId = null;
let pollInterval = null;
let startTime = null;
let pollCount = 0;

// 🆕 최대 폴링 시간: 5분 (300초) - 10분 → 5분으로 단축
const MAX_POLLING_TIME = 5 * 60 * 1000; // 5분
const MAX_POLL_COUNT = 10; // 최대 10번 (30초 * 10 = 5분)

// 메인 스레드로부터 메시지 수신
self.addEventListener('message', async (e) => {
  const { type, jobId } = e.data;

  if (type === 'START_MONITORING') {
    startMonitoring(jobId);
  } else if (type === 'STOP_MONITORING') {
    stopMonitoring();
  }
});

// 작업 모니터링 시작
function startMonitoring(jobId) {
  console.log('[Worker] 모니터링 시작:', jobId);
  currentJobId = jobId;
  startTime = Date.now();
  pollCount = 0;

  // 즉시 한 번 확인
  checkJobStatus();

  // 🔥 30초마다 상태 확인 (15초 → 30초로 변경하여 부하 감소)
  pollInterval = setInterval(() => {
    // 🆕 타임아웃 체크
    const elapsed = Date.now() - startTime;
    pollCount++;
    
    if (elapsed > MAX_POLLING_TIME || pollCount > MAX_POLL_COUNT) {
      console.warn(`[Worker] 타임아웃: ${Math.round(elapsed / 1000)}초 경과, ${pollCount}번 폴링`);
      
      // 타임아웃 메시지 전송
      self.postMessage({
        type: 'ERROR',
        error: '작업이 너무 오래 걸립니다. 페이지를 새로고침해주세요.',
        timeout: true,
      });
      
      stopMonitoring();
      return;
    }
    
    checkJobStatus();
  }, 30000); // 🔥 15초 → 30초로 변경
}

// 작업 모니터링 중지
function stopMonitoring() {
  console.log('[Worker] 모니터링 중지');
  
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  
  currentJobId = null;
}

// 작업 상태 확인
async function checkJobStatus() {
  if (!currentJobId) return;

  try {
    console.log(`[Worker] 상태 확인 ${pollCount}번째: ${currentJobId}`);
    
    // 🆕 타임아웃 추가 (5초)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`/api/documents/status?jobId=${currentJobId}`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // 🆕 404 에러는 작업이 완료되어 삭제된 것으로 간주
    if (response.status === 404) {
      console.log('[Worker] 작업 완료 (404 - 이미 삭제됨)');
      
      // 완료 메시지 전송 (결과 없음)
      self.postMessage({
        type: 'JOB_COMPLETED',
        status: 'completed',
        results: [],
      });
      
      // 모니터링 중지
      stopMonitoring();
      return;
    }
    
    const data = await response.json();

    if (data.success && data.job) {
      const job = data.job;

      // 진행 상태를 메인 스레드로 전송
      self.postMessage({
        type: 'PROGRESS_UPDATE',
        progress: {
          current: job.progress.current,
          total: job.progress.total,
        },
      });

      // 작업 완료 확인
      if (job.status === 'completed' || job.status === 'failed') {
        console.log('[Worker] 작업 완료:', job.status);
        console.log('[Worker] 결과 개수:', job.results?.length || 0);
        
        if (job.results && job.results.length > 0) {
          console.log('[Worker] 첫 번째 결과 샘플:', job.results[0]);
        }

        // 완료 메시지 전송
        self.postMessage({
          type: 'JOB_COMPLETED',
          status: job.status,
          results: job.results || [],
        });

        // 모니터링 중지
        stopMonitoring();
      }
    }
  } catch (error) {
    console.error('[Worker] 상태 확인 오류:', error);
    
    // 🆕 Abort 에러는 무시 (타임아웃)
    if (error.name === 'AbortError') {
      console.warn('[Worker] API 타임아웃 - 다음 폴링에서 재시도');
      return;
    }
    
    // 🆕 연속 에러 카운트
    pollCount += 5; // 에러 발생 시 카운트 증가
    
    // 에러 메시지 전송
    self.postMessage({
      type: 'ERROR',
      error: error.message,
    });
  }
}
