import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "admin portal • thc club",
  description: "Administrative command center for the hidden collective club.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
