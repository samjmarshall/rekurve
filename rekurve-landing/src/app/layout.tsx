import "~/styles/globals.css";

import { type Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";

export const metadata: Metadata = {
  title: "AI Sales Agents for Brisbane Professional Services | Rekurve",
  description:
    "Recover 20+ hours weekly and add $100K to your pipeline in 90 days with autonomous AI sales agents. Built by former AWS SRE for consulting, accounting, and marketing firms.",
  keywords: [
    "AI sales agents",
    "Brisbane",
    "sales automation",
    "professional services",
  ],
  icons: [{ rel: "icon", url: "/favicon.ico" }],
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
