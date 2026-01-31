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
        <div className="app-shell">
          {/* Google Ads Conversion Tracking with Enhanced Conversions */}
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=AW-17896188158"
            strategy="afterInteractive"
          />
          <Script id="google-ads-config" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-17896188158', {
                'allow_enhanced_conversions': true
              });
            `}
          </Script>

          <ThemeProvider>
            <main className="content-shell">{children}</main>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
