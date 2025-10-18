import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { AuthProvider } from "@/lib/contexts/auth-context";
import { AuthModalProvider } from "@/lib/contexts/auth-modal-context";
import { SidebarProvider } from "@/lib/contexts/sidebar-context";
import { AppProvider } from "@/lib/contexts/app-context";
import { PlayerProvider } from "@/lib/contexts/player-context";
import { JackpotAnimationProvider } from "@/lib/contexts/jackpot-animation-context";
import { ClientLayoutWrapper } from "@/components/client-layout-wrapper";
import { ServiceWorkerProvider } from "@/components/service-worker-provider";
import { InitialLoaderWrapper } from "@/components/initial-loader-wrapper";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "MyPokies - Australia's Premier Online Casino",
    template: "%s | MyPokies Casino",
  },
  description: "Play thousands of casino games, win real money with our progressive jackpot, and enjoy exclusive VIP rewards at MyPokies Casino.",
  keywords: [
    'online casino',
    'pokies',
    'slots',
    'casino games',
    'jackpot',
    'VIP rewards',
    'Australian casino',
    'live dealer',
    'table games',
    'real money casino',
  ],
  authors: [{ name: 'MyPokies' }],
  creator: 'MyPokies',
  publisher: 'MyPokies',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_AU',
    url: defaultUrl,
    title: "MyPokies - Australia's Premier Online Casino",
    description: "Play thousands of casino games, win real money with our progressive jackpot, and enjoy exclusive VIP rewards at MyPokies Casino.",
    siteName: 'MyPokies',
    images: [
      {
        url: `${defaultUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'MyPokies Casino',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "MyPokies - Australia's Premier Online Casino",
    description: "Play thousands of casino games, win real money with our progressive jackpot, and enjoy exclusive VIP rewards at MyPokies Casino.",
    images: [`${defaultUrl}/og-image.png`],
    creator: '@mypokies',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

const openRunde = localFont({
  src: [
    {
      path: "../public/fonts/OpenRunde-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/OpenRunde-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/OpenRunde-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/OpenRunde-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-open-runde",
  display: "swap",
});

const luckiestGuy = localFont({
  src: "../public/fonts/LuckiestGuy.ttf",
  variable: "--font-luckiest-guy",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // PERFORMANCE FIX: Removed blocking server-side auth call
  // Auth is now handled client-side in AuthProvider for non-blocking initial render

  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'OnlineBusiness',
              name: 'MyPokies Casino',
              description: 'Play thousands of casino games, win real money with progressive jackpots, and enjoy exclusive VIP rewards at MyPokies Casino.',
              url: defaultUrl,
              logo: `${defaultUrl}/favicon.png`,
              offers: {
                '@type': 'Offer',
                description: 'Welcome Bonus - 100% Match up to $500',
                itemOffered: {
                  '@type': 'Service',
                  name: 'Online Casino Gaming',
                },
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '2500',
              },
            }),
          }}
        />
      </head>
      <body className={`${openRunde.className} ${luckiestGuy.variable} antialiased dark`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ServiceWorkerProvider />
          <NuqsAdapter>
            <AuthProvider>
              <AuthModalProvider>
                <SidebarProvider>
                  <AppProvider>
                    <PlayerProvider>
                      <JackpotAnimationProvider>
                        <InitialLoaderWrapper>
                          <ClientLayoutWrapper>
                            {children}
                          </ClientLayoutWrapper>
                        </InitialLoaderWrapper>
                      </JackpotAnimationProvider>
                    </PlayerProvider>
                  </AppProvider>
                </SidebarProvider>
              </AuthModalProvider>
            </AuthProvider>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
