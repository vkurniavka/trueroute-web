import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://trueroute.app";

export const metadata: Metadata = {
  title: "TrueRoute — GPS Spoofing Protection for Ukrainian Drivers",
  description:
    "Navigate safely when GPS is disrupted. TrueRoute detects GPS spoofing and switches to dead reckoning using your OBD2 adapter and phone sensors.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "TrueRoute — GPS Spoofing Protection for Ukrainian Drivers",
    description:
      "Navigate safely when GPS is disrupted. TrueRoute detects GPS spoofing and switches to dead reckoning using your OBD2 adapter and phone sensors.",
    url: siteUrl,
    siteName: "TrueRoute",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TrueRoute — GPS Spoofing Protection",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrueRoute — GPS Spoofing Protection for Ukrainian Drivers",
    description:
      "Navigate safely when GPS is disrupted. TrueRoute detects GPS spoofing and switches to dead reckoning using your OBD2 adapter and phone sensors.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
