import type { Metadata } from "next";
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
      <body className="min-h-screen bg-slate-50 antialiased">{children}</body>
    </html>
  );
}
