import type { Metadata, Viewport } from "next";
import { Agentation } from "agentation";
import "./globals.css";

const fontUrl =
  "https://fonts.googleapis.com/css2?family=Playwrite+NZ+Basic:wght@100..400&display=swap";

export const metadata: Metadata = {
  title: "Initiative Tracker",
  description: "Simple D&D initiative tracker",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href={fontUrl} />
      </head>
      <body className="min-h-screen bg-stone-50 font-sans text-zinc-900">
        {children}
        {process.env.NODE_ENV === "development" && <Agentation />}
      </body>
    </html>
  );
}
