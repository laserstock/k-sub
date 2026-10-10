import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seoul Subway Exit Guide",
  description:
    "Find the right subway exit in Seoul — station, exit number, and Google Maps for foreign visitors.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
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
