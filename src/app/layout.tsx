import "~/styles/globals.css";

import { type Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "~/components/Analytics";
import { ThemeProvider } from "~/context/providers";
import { Navbar } from "~/components/navbar";
// import { Footer } from "~/components/sections/Footer";

export const metadata: Metadata = {
  title: "AI Quote Automation for Service Businesses | Rekurve",
  description:
    "Recover 20+ hours weekly or add $100K to your pipeline in 90 days with AI service quote automation.",
  keywords: [
    "AI sales agents",
    "Brisbane",
    "Melbourne",
    "sales automation",
    "service businesses",
    "autonomous AI",
    "sales AI",
    "virtual SDR",
    "lead generation automation",
    "B2B sales automation",
    "service quote automation",
  ],
  authors: [{ name: "Rekurve AI" }],
  creator: "Rekurve AI",
  publisher: "Rekurve AI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: "https://rekurve.ai",
    title: "AI Quote Automation for Service Businesses | Rekurve",
    description:
      "Recover 20+ hours weekly or add $100K to your pipeline in 90 days with AI service quote automation.",
    siteName: "Rekurve AI",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Rekurve AI Sales Agents - Autonomous AI for Service Businesses",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Quote Automation for Service Businesses | Rekurve",
    description:
      "Recover 20+ hours weekly or add $100K to your pipeline in 90 days with AI service quote automation.",
    images: ["/og-image.png"],
    creator: "@rekurve_ai",
  },
  metadataBase: new URL("https://rekurve.ai"),
  alternates: {
    canonical: "https://rekurve.ai",
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Rekurve AI",
    description:
      "AI quote automation for for Service Businesses in Brisbane and Melbourne",
    url: "https://rekurve.ai",
    logo: "https://rekurve.ai/logo.png",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Brisbane",
      addressRegion: "QLD",
      addressCountry: "AU",
    },
    areaServed: ["Brisbane", "Melbourne"],
    serviceType: "AI Quote Automation",
    priceRange: "$$$",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "12",
    },
  };

  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="font-sans antialiased bg-background">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
          <Navbar />
          <Analytics />
          {children}
          {/* <Footer /> */}
        </ThemeProvider>
      </body>
    </html>
  );
}
