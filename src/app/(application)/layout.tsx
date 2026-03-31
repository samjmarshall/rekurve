import "~/styles/globals.css";

import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { redirect } from "next/navigation";
import { getSession } from "~/lib/session";
import { AnalyticsProvider } from "~/providers/AnalyticsProvider";
import { ThemeProvider } from "~/providers/ThemeProvider";
import { TRPCReactProvider } from "~/trpc/react";
import { AppSidebar } from "./_components/app-sidebar";
import { BottomNav } from "./_components/bottom-nav";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

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
            <TRPCReactProvider>
              <div className="flex min-h-screen">
                <AppSidebar
                  user={{
                    name: session.user.name ?? "",
                    email: session.user.email,
                  }}
                />
                <main className="flex-1 pb-16 md:pb-0">{children}</main>
                <BottomNav />
              </div>
            </TRPCReactProvider>
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
