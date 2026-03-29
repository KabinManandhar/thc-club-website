import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "club portal • thc club",
  description: "Identity and sales management for hidden collective club members.",
}

export default function ClubLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
