import type { Metadata, Viewport } from "next";
import { GOOGLE_SERVICE_FONTS_STYLESHEET_URL } from "@/config/google-fonts";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

/** Required for correct layout on phones; without it many mobile browsers act like a zoomed-out desktop. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export const metadata: Metadata = {
  title: "Video Composer — Multi-brand Before/After",
  description:
    "Automated Before & After marketing video dashboard for multiple brands.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png", type: "image/png" }],
  },
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
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
