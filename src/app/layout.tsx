import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TradieFlow",
  description: "Job management for Australian tradies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground antialiased overflow-x-hidden`}
      >
        {/* Google Ads Conversion Tracking - Global Site Tag */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17896188158"
          strategy="afterInteractive"
        />
        <Script id="google-ads-config" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-17896188158');
            
            // Test function for console
            window.testGoogleAdsConversion = function() {
              if (!window.gtag) {
                console.error('❌ Google Ads tag not loaded');
                return;
              }
              console.log('✅ Google Ads tag loaded');
              console.log('📊 Firing test conversion...');
              gtag('event', 'conversion', {
                'send_to': 'AW-17896188158/0fciCMj5wOobEP7RyNVC',
                'value': 1.0,
                'currency': 'AUD'
              });
              console.log('✅ Test conversion fired. Check Tag Assistant and Google Ads dashboard in 24-48 hours.');
            };
          `}
        </Script>

        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
