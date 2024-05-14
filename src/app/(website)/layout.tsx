import "~/styles/globals.css";

import { Inter as FontSans } from "next/font/google";
import Link from "next/link";
import openGraph from "~/lib/open-graph";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: {
    default: "rekurve",
    template: "%s | rekurve",
  },
  description:
    "Construction management software to stay organized, track progress, costs and payments, and collaborate with your customers.",
  publisher: "rekurve",
  openGraph,
  viewport: "width=device-width, initial-scale=1, minimum-scale=1",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${fontSans.variable}`}>
        <div className="flex min-h-[100dvh] flex-col">
          <header className="flex h-14 items-center px-4 lg:px-6">
            <Link className="flex items-center justify-center" href="/">
              <span className="text-4xl font-extrabold tracking-tight">
                rekurve
              </span>
            </Link>
            <nav className="ml-auto flex gap-4 sm:gap-6">
              <Link
                className="text-sm font-medium underline-offset-4 hover:underline"
                href="/#features"
              >
                Features
              </Link>
              {/* <Link
            className="text-sm font-medium underline-offset-4 hover:underline"
            href="/#pricing"
          >
            Pricing
          </Link> */}
              {/* <Link
            className="text-sm font-medium underline-offset-4 hover:underline"
            href="/#about"
          >
            About
          </Link> */}
              <Link
                className="text-sm font-medium underline-offset-4 hover:underline"
                href="/#testimonials"
              >
                Testimonials
              </Link>
              <Link
                className="text-sm font-medium underline-offset-4 hover:underline"
                href="/#contact"
              >
                Contact
              </Link>
              <Link
                className="text-sm font-medium text-gray-500 underline-offset-4 hover:underline"
                href="/api/auth/signin?callbackUrl=/dashboard"
              >
                Login
              </Link>
            </nav>
          </header>
          {children}
          <footer className="flex w-full shrink-0 flex-col items-center gap-2 px-4 py-6 sm:flex-row md:px-6">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © 2024 rekurve. All rights reserved.
            </p>
            <nav className="flex gap-4 sm:ml-auto sm:gap-6">
              {/* <Link className="text-xs underline-offset-4 hover:underline" href="#">
      Terms of Service
    </Link> */}
              <Link
                className="text-xs underline-offset-4 hover:underline"
                href="/privacy"
              >
                Privacy Policy
              </Link>
            </nav>
          </footer>
        </div>
      </body>
    </html>
  );
}
