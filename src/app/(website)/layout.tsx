import "~/styles/globals.css";

import { Inter as FontSans } from "next/font/google";
import WebsiteFooter from "./_components/footer";
import WebsiteHeader from "./_components/header";
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
          <WebsiteHeader />
          {children}
          <WebsiteFooter />
        </div>
      </body>
    </html>
  );
}
