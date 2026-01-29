import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Initiative Tracker",
  description: "Simple D&D initiative tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
