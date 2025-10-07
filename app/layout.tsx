import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '네이버 연관검색어 분석',
  description: '네이버 검색광고 API 기반 연관검색어 분석 도구',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="border-b bg-white">
          <div className="container mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <a href="/" className="text-lg font-semibold">네이버 연관검색어 분석</a>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/data" className="hover:text-indigo-600">데이터</a>
              <a href="/insights" className="hover:text-indigo-600">💡 인사이트</a>
              <a href="/trend" className="hover:text-indigo-600">트렌드</a>
            </nav>
          </div>
        </header>
        <div>{children}</div>
      </body>
    </html>
  );
}


