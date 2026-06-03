import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "staff pos • thc club",
  description: "In-store point of sale for THC Club staff.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function StaffPosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
