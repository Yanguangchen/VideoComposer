import type { Metadata } from "next";
import { GOOGLE_SERVICE_FONTS_STYLESHEET_URL } from "@/config/google-fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Video Composer — Multi-brand Before/After",
  description:
    "Automated Before & After marketing video dashboard for multiple brands.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href={GOOGLE_SERVICE_FONTS_STYLESHEET_URL} />
      </head>
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
