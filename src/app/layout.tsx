import "~/styles/globals.css";

import { type Metadata } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "~/components/Analytics";
import { AnalyticsProvider } from "~/components/providers/AnalyticsProvider";
import { ThemeProvider } from "~/context/providers";
import { Navbar } from "~/components/navbar";
import { canonicalUrl } from "~/lib/canonical-url";
import { Footer } from "~/components/footer";
import openGraph from "~/lib/open-graph";

const canonical = canonicalUrl("/")

export const metadata: Metadata = {
  title: "AI Quote Generation & Speed to Lead for Service Businesses | Rekurve",
  description:
    "Customer Enquiry → Quote Generated → Job Booked. AI agents for service businesses spending 20+ hours weekly quoting or missing leads due to slow response times.",
  keywords: [
    "AI quote generation",
    "speed to lead",
    "service quote automation",
    "Brisbane",
    "Sydney",
    "Melbourne",
    "Perth",
    "Australia",
    "service businesses",
    "AI sales agents",
    "lead response automation",
    "quote automation",
    "B2B sales automation",
    "autonomous AI",
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
    ...openGraph,
    url: canonical,
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Quote Generation & Speed to Lead | Rekurve",
    description:
      "Customer Enquiry → Quote Generated → Job Booked. AI agents for service businesses spending 20+ hours weekly quoting or missing leads.",
    images: ["/og-image.png"],
    creator: "@rekurve_ai",
  },
  metadataBase: new URL(canonical),
  alternates: {
    canonical,
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
      "AI quote generation and speed to lead automation for service businesses in Australia.",
    url: "https://rekurve.ai",
    logo: "https://rekurve.ai/logo.png",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Brisbane",
      addressRegion: "QLD",
      addressCountry: "AU",
    },
    areaServed: ["Brisbane", "Sydney", "Melbourne", "Perth", "Australia"],
    serviceType: "AI Quote Generation & Speed to Lead",
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
          <AnalyticsProvider>
            <Navbar />
            <Analytics />
            {children}
            <Footer />
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
