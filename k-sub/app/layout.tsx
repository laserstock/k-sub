import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Seoul Subway Exit Guide",
    template: "%s | Seoul Subway Exit Guide",
  },
  description:
    "Find the right Seoul subway station and exit — for foreign visitors. Search From/To, open Google Maps, copy Korean names.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Seoul Subway Exit Guide",
    title: "Seoul Subway Exit Guide",
    description:
      "Know which station and exit to use before you surface into the wrong street.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="atmosphere flex min-h-full flex-col text-ink">
        {children}
      </body>
    </html>
  );
}
