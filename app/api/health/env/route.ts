import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const customer = !!process.env.NAVER_CUSTOMER_ID;
  const apiKey = !!process.env.NAVER_API_KEY;
  const secret = !!process.env.NAVER_SECRET_KEY;

  const missing: string[] = [];
  if (!customer) missing.push('NAVER_CUSTOMER_ID');
  if (!apiKey) missing.push('NAVER_API_KEY');
  if (!secret) missing.push('NAVER_SECRET_KEY');

  return NextResponse.json({
    success: missing.length === 0,
    detected: {
      NAVER_CUSTOMER_ID: customer,
      NAVER_API_KEY: apiKey,
      NAVER_SECRET_KEY: secret,
    },
    missing,
    diagnostics: {
      cwd: process.cwd(),
      envFiles: {
        dotEnv: fs.existsSync(path.join(process.cwd(), '.env')),
        dotEnvLocal: fs.existsSync(path.join(process.cwd(), '.env.local')),
      },
    },
  });
}


