
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: "DevTools Platform - Essential Developer Tools",
  description: "Complete platform with 8 essential developer tools: JSON formatter, API tester, regex tester, JWT decoder, Base64 encoder, hash generator, diff checker, and color picker.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "DevTools Platform - Essential Developer Tools",
    description: "Complete platform with 8 essential developer tools for developers",
    url: "/",
    siteName: "DevTools Platform",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DevTools Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DevTools Platform - Essential Developer Tools",
    description: "Complete platform with 8 essential developer tools for developers",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
