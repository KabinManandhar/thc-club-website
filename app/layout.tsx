import { EnvBanner } from "@/components/env-banner"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Space_Grotesk } from "next/font/google"
import type React from "react"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
})

export const metadata = {
  title: "thc club - the hidden collective club — curated shelf rental space in kathmandu",
  description:
    "nepal's first curated shelf-rental retail space.no gatekeeping. just a shelf, a spotlight, and 100% of what you earn.",

  keywords: [
    /* Brand-Specific & Core */
    "the hidden collective club nepal",
    "thc club kathmandu",
    "thc club nepal",

    /* Vendor & Business Growth (B2B) */
    "shelf rental kathmandu",
    "retail space for small brands nepal",
    "rent a shelf shop kathmandu",
    "offline marketplace for instagram brands nepal",
    "small business incubator nepal",
    "pop up shop space kathmandu",
    "sell products in kathmandu stores",

    /* Shopper & Gift Intent (B2C) */
    "curated gift store kathmandu",
    "handcrafted nepalese gifts",
    "aesthetic lifestyle shop kathmandu",
    "unique souvenirs nepal",
    "concept store kathmandu",
    "indie brand collective nepal",
    "made in nepal gift shop",

    /* Trend & Niche Focused */
    "creator marketplace nepal",
    "artisan collective kathmandu",
    "sustainable nepalese brands",
    "thamel alternative shopping",
    "local startup products nepal"
  ],

  metadataBase: new URL("https://www.thehiddencollectiveclub.com"),

  openGraph: {
    title: "thc club — a shelf for brands done with the system",
    description:
      "no 20–35% cuts. no monthly panic. just your product, visible, in the real world.",
    url: "https://www.thehiddencollectiveclub.com",
    siteName: "thc club",
    images: [
      {
        url: "/broski.png",
        width: 1200,
        height: 630,
        alt: "thc club retail space",
      },
    ],
    locale: "en_US",
    type: "website",
  },



  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },

  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body className="font-space-grotesk">
        <EnvBanner />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
