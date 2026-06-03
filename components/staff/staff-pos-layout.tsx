"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { staffAuth, type StaffUser } from "@/lib/staff-auth"
import { LogOut, ShoppingCart } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"

interface StaffPosLayoutProps {
  children: React.ReactNode
  onLogout: () => void
}

export function StaffPosLayout({ children, onLogout }: StaffPosLayoutProps) {
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null)

  useEffect(() => {
    staffAuth.getCurrentUser().then(setCurrentUser)
  }, [])

  const handleLogout = async () => {
    await staffAuth.logout()
    onLogout()
  }

  return (
    <div className="min-h-screen bg-[#FFFCEB]">
      <header className="sticky top-0 z-40 bg-white border-b border-black/5 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Image src="/logo.png" alt="THC Club" width={80} height={32} className="h-8 w-auto shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-black tracking-tight flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#FE7F2D] shrink-0" />
                Staff POS
              </p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">
                {currentUser?.name || "Terminal"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10 shrink-0"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  )
}
