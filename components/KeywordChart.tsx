"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { KeywordData } from '@/lib/types';

export default function KeywordChart({ data }: { data: KeywordData[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-2 text-sm text-gray-600">상위 10개 키워드 검색량 (PC vs 모바일)</div>
      <div style={{ width: '100%', height: 360 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="keyword" tick={{ fontSize: 12 }} interval={0} height={60} angle={-15} textAnchor="end" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="monthlyPcSearch" name="PC 검색" fill="#6366F1" />
            <Bar dataKey="monthlyMobileSearch" name="모바일 검색" fill="#22C55E" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


