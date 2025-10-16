import { withSentryConfig } from '@sentry/nextjs'
import bundleAnalyzer from '@next/bundle-analyzer'

// TURBOPACK COMPATIBILITY: Detect if we're in development mode
// In dev mode, disable webpack-specific features for Turbopack compatibility
const isDev = process.env.NODE_ENV !== 'production'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    position: 'bottom-right',
  },

  // Webpack optimizations for bundle size (PRODUCTION ONLY)
  webpack: (config, { isServer, dev }) => {
    // Only apply code splitting in production builds
    // In dev mode, this slows down HMR significantly
    if (!isServer && !dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Split React and React-DOM into separate chunks
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react-vendor',
              priority: 40,
              reuseExistingChunk: true,
            },
            // Split Supabase into its own chunk
            supabase: {
              test: /[\\/]node_modules[\\/](@supabase)[\\/]/,
              name: 'supabase-vendor',
              priority: 35,
              reuseExistingChunk: true,
            },
            // Split Radix UI components into their own chunk
            radix: {
              test: /[\\/]node_modules[\\/](@radix-ui)[\\/]/,
              name: 'radix-vendor',
              priority: 30,
              reuseExistingChunk: true,
            },
            // Split Lucide icons into their own chunk
            lucide: {
              test: /[\\/]node_modules[\\/](lucide-react|@lucide)[\\/]/,
              name: 'lucide-vendor',
              priority: 30,
              reuseExistingChunk: true,
            },
            // Split Sentry into its own chunk
            sentry: {
              test: /[\\/]node_modules[\\/](@sentry)[\\/]/,
              name: 'sentry-vendor',
              priority: 25,
              reuseExistingChunk: true,
            },
            // Common vendor chunk for other dependencies
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Common code used across pages
            common: {
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
          maxInitialRequests: 25,
          minSize: 20000,
        },
      }
    }

    return config
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // Cache images for 1 year
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Experimental features for better performance
  experimental: {
    // TURBOPACK FIX: lucide-react and @lucide/lab optimizePackageImports causes module
    // resolution errors with createLucideIcon and other utilities in Turbopack.
    // Only enable lucide packages in production webpack builds.
    optimizePackageImports: isDev ? [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
    ] : [
      'lucide-react',
      '@lucide/lab',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
    ],
    // Improve tree-shaking
    // Note: optimizeCss requires 'critters' package and can cause issues in dev mode
    optimizeCss: !isDev,
  },

  // Modularize imports to reduce bundle size
  // IMPORTANT: modularizeImports is NOT supported in Turbopack, only in webpack production mode
  ...(!isDev ? {
    modularizeImports: {
      'lucide-react': {
        transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
        skipDefaultConversion: true,
      },
    },
  } : {}),

  // Production optimizations
  poweredByHeader: false,
  compress: true,

  // Configure headers for caching and security
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, must-revalidate',
          },
        ],
      },
    ];
  },

  // Configure rewrites for better routing
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },

  // Output standalone for smaller builds
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
};

// TURBOPACK COMPATIBILITY:
// Sentry's withSentryConfig and bundle analyzer use webpack-specific plugins
// that are incompatible with Turbopack. Only apply them in production builds.
let finalConfig = nextConfig

// Bundle analyzer is webpack-only, skip in dev mode
if (!isDev) {
  finalConfig = withBundleAnalyzer(finalConfig)
}

// Sentry webpack plugin is not compatible with Turbopack
// In dev mode, Sentry will still work via the sentry.*.config.ts files,
// but source maps won't be uploaded automatically
if (!isDev) {
  finalConfig = withSentryConfig(finalConfig, {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This prevents ad-blockers from blocking error reporting
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors (if using Vercel)
    automaticVercelMonitors: true,
  })
}

export default finalConfig
