import { NextRequest, NextResponse } from 'next/server';
import { getBatchQueue } from '@/lib/batch-queue-adapter';

const batchQueue = getBatchQueue();

/**
 * GET: 배치 작업 상태 조회
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('jobId');

  try {
    // 특정 작업 조회
    if (jobId) {
      const job = await batchQueue.getBatchJob(jobId);
      
      if (!job) {
        return NextResponse.json(
          { success: false, error: '작업을 찾을 수 없습니다' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        job,
      });
    }

    // 모든 작업 목록 조회
    const jobs = await batchQueue.getAllJobs();
    
    return NextResponse.json({
      success: true,
      jobs,
      activeJobs: jobs.filter(j => j.status === 'processing').length,
    });
  } catch (error) {
    console.error('[배치 상태] API 에러:', error);
    return NextResponse.json(
      {
        success: false,
        error: '작업 상태 조회에 실패했습니다',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    );
  }
}

