import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "reset security credentials • thc club",
  description: "Secure terminal for brand account recovery and security updates.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
