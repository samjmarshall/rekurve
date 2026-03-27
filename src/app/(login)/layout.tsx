import "~/styles/globals.css";

import { type Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { AnalyticsProvider } from "~/providers/AnalyticsProvider";
import { ThemeProvider } from "~/providers/ThemeProvider";

export const metadata: Metadata = {
  title: "Login | Rekurve",
  robots: {
    index: false,
    follow: false,
  },
};

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AnalyticsProvider>
            {children}
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
