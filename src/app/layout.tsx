import type { Metadata } from "next";
import { GOOGLE_SERVICE_FONTS_STYLESHEET_URL } from "@/config/google-fonts";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Video Composer — Multi-brand Before/After",
  description:
    "Automated Before & After marketing video dashboard for multiple brands.",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
  appleWebApp: {
    capable: true,
    title: "Video Composer",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href={GOOGLE_SERVICE_FONTS_STYLESHEET_URL} />
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
