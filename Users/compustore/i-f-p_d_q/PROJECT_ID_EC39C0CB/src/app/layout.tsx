
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import BackButtonHandler from '@/components/back-button-handler';
import { Playfair_Display, Poppins, PT_Sans } from 'next/font/google';
import { cn } from '@/lib/utils';
import { CallManager } from '@/components/call-manager';
import { AuthProvider } from '@/context/AuthContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import CapacitorSetup from '@/components/capacitor-setup';
import AuthHandler from '@/components/auth-handler';
import OnboardingOverlay from '@/components/OnboardingOverlay';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins'
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-playfair'
})

const ptsans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-ptsans'
})

export const metadata: Metadata = {
  title: 'WanderLink',
  description: 'Connect. Explore. Discover.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  initialScale: 1,
  width: 'device-width',
  userScalable: false,
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={cn("font-sans antialiased", poppins.variable, playfair.variable, ptsans.variable)}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__ALGOLIA_APP_ID__ = "H8QSO88UZ6";
              window.__ALGOLIA_SEARCH_KEY__ = "8f4fafe81767d23252f012b6210fc101";
            `,
          }}
        />
        <AuthProvider>
          <OnboardingProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <CapacitorSetup />
              <AuthHandler />
              <BackButtonHandler />
              <CallManager />
              <OnboardingOverlay />
              <main>{children}</main>
              <Toaster />
            </ThemeProvider>
          </OnboardingProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
