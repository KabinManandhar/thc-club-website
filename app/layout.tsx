import { EnvBanner } from "@/components/env-banner"
import type { Metadata } from "next"
import { Space_Grotesk } from "next/font/google"
import type React from "react"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
})

export const metadata: Metadata = {
  title: "thc club - the hidden collective club",
  description: "curated shelf space for nepal's indie brands",
  generator: 'v0.dev'
}

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
      </body>
    </html>
  )
}
