import "~/styles/globals.css";

import type { Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { redirect } from "next/navigation";
import { getSession } from "~/lib/session";
import { AnalyticsProvider } from "~/providers/AnalyticsProvider";
import { ThemeProvider } from "~/providers/ThemeProvider";

export const metadata: Metadata = {
  title: "Dashboard | Rekurve",
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

export default async function ApplicationLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/login");

  // TODO: Wrap with TRPCReactProvider when tRPC is set up

  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AnalyticsProvider>
            <div className="flex min-h-screen">
              {/* TODO: App sidebar/nav */}
              <main className="flex-1">{children}</main>
            </div>
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
