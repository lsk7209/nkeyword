import { NextRequest, NextResponse } from 'next/server';

/**
 * 자동 수집 시작 API
 * 백그라운드에서 자동 수집 프로세스를 시작합니다
 */

// 자동 수집 상태 관리
let autoCollectInterval: NodeJS.Timeout | null = null;
let isAutoCollecting = false;

export async function POST(request: NextRequest) {
  try {
    if (isAutoCollecting) {
      return NextResponse.json({
        success: true,
        message: '이미 자동 수집이 실행 중입니다.',
        isRunning: true,
      });
    }

    // 자동 수집 시작
    isAutoCollecting = true;
    
    // 즉시 한 번 실행
    await runAutoCollect();

    return NextResponse.json({
      success: true,
      message: '자동 수집이 시작되었습니다.',
      isRunning: true,
    });
  } catch (error: any) {
    console.error('[자동 수집 시작] 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (autoCollectInterval) {
      clearInterval(autoCollectInterval);
      autoCollectInterval = null;
    }
    isAutoCollecting = false;

    return NextResponse.json({
      success: true,
      message: '자동 수집이 중지되었습니다.',
      isRunning: false,
    });
  } catch (error: any) {
    console.error('[자동 수집 중지] 오류:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    isRunning: isAutoCollecting,
  });
}

async function runAutoCollect() {
  console.log('[자동 수집] 실행 시작');
  
  try {
    // 클라이언트에게 수집 시작 알림
    // 실제 수집은 클라이언트 측에서 처리
    // 여기서는 상태만 관리
  } catch (error) {
    console.error('[자동 수집] 실행 오류:', error);
  }
}
