/** @type {import('next').NextConfig} */
const nextConfig = {
  // ========================================
  // 🚀 Vercel 배포 최적화
  // ========================================
  
  // 정적 페이지 생성 (빠른 로딩)
  output: 'standalone',
  
  // SWC 컴파일러 사용 (Babel보다 빠름)
  swcMinify: true,
  
  // 번들 크기 분석 (프로덕션 빌드 시)
  // ANALYZE=true npm run build
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      );
      return config;
    },
  }),
  
  // ========================================
  // 🔄 재검증 및 캐싱
  // ========================================
  
  // 실험적 기능
  experimental: {
    // 최적화된 패키지 임포트
    optimizePackageImports: [
      'recharts',
      '@supabase/supabase-js',
    ],
  },
  
  // ========================================
  // 📦 웹팩 최적화
  // ========================================
  
  webpack: (config, { isServer }) => {
    // 클라이언트 번들 최적화
    if (!isServer) {
      // 번들 크기 감소
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            
            // React/Next.js 코어
            framework: {
              name: 'framework',
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              priority: 40,
              enforce: true,
            },
            
            // Supabase
            supabase: {
              name: 'supabase',
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              priority: 30,
            },
            
            // 차트 라이브러리
            charts: {
              name: 'charts',
              test: /[\\/]node_modules[\\/](recharts|d3-.*)[\\/]/,
              priority: 20,
            },
            
            // 기타 node_modules
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )[1];
                return `npm.${packageName.replace('@', '')}`;
              },
              priority: 10,
              minChunks: 1,
              reuseExistingChunk: true,
            },
            
            // 공통 컴포넌트
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 5,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // ========================================
  // 🖼️ 이미지 최적화
  // ========================================
  
  images: {
    domains: [
      'supabase.co',
      // Supabase 프로젝트 URL 추가
    ],
    formats: ['image/avif', 'image/webp'],
  },
  
  // ========================================
  // 🔐 보안 헤더
  // ========================================
  
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        // API 라우트 캐싱
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=10, stale-while-revalidate=59',
          },
        ],
      },
    ];
  },
  
  // ========================================
  // 📝 환경 변수 (타입 체크)
  // ========================================
  
  env: {
    NEXT_PUBLIC_STORAGE_MODE: process.env.NEXT_PUBLIC_STORAGE_MODE || 'localStorage',
    NEXT_PUBLIC_DEFAULT_PAGE_SIZE: process.env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE || '50',
  },
};

module.exports = nextConfig;

