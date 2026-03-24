"use client"

import type React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { userAuth, type ApprovedUser } from "@/lib/user-auth"
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  CreditCard,
  Shield,
  User,
  LogOut,
  Menu,
  X,
  PlusCircle,
  HelpCircle,
  TrendingUp,
} from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"

interface BrandLayoutProps {
  children: React.ReactNode
  activeTab: string
  onTabChange: (tab: string) => void
  onLogout: () => void
}

export function BrandLayout({
  children,
  activeTab,
  onTabChange,
  onLogout,
}: BrandLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<ApprovedUser | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const user = await userAuth.getCurrentUser()
      setCurrentUser(user)
    }
    loadUser()
  }, [])

  const handleLogout = async () => {
    await userAuth.logout()
    onLogout()
  }

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "inbox", label: "Inbox & Enquiries", icon: MessageSquare },
    { id: "inventory", label: "Product Catalog", icon: Package },
    { id: "shelf", label: "Shelf Space", icon: HelpCircle },
    { id: "payouts", label: "Payouts Tracker", icon: CreditCard },
    { id: "legal", label: "Legal & Contracts", icon: Shield },
    { id: "profile", label: "Brand Profile", icon: User },
  ]

  return (
    <div className="min-h-screen bg-[#FFFCEB] font-space-grotesk overflow-hidden flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#010307] text-white transform transition-transform duration-500 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-10">
            <div className="w-12 h-12 bg-[#FE7F2D]/10 rounded-2xl flex items-center justify-center">
               <TrendingUp className="text-[#FE7F2D] w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter">THC Club</h1>
              <Badge className="bg-[#FE7F2D]/10 text-[#FE7F2D] border-none px-2 py-0 text-[10px] lowercase font-bold tracking-widest">
                brand dashboard
              </Badge>
            </div>
          </div>

          {/* User Info */}
          {currentUser && (
            <div className="mb-10 p-4 bg-white/5 rounded-3xl border border-white/5">
               <p className="text-[10px] font-bold lowercase text-white/30 tracking-widest mb-1">authenticated as</p>
               <p className="font-bold tracking-tight text-sm truncate">{currentUser.business_name.toLowerCase()}</p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id)
                      setSidebarOpen(false)
                    }}
                    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all duration-300 group ${
                      isActive
                        ? "bg-[#FE7F2D] text-white shadow-lg shadow-orange-500/20 translate-x-1"
                        : "text-white/40 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                    <span className="tracking-tight lowercase">{item.label}</span>
                  </button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="mt-auto pt-8 border-t border-white/5">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold text-white/50 hover:text-red-400 hover:bg-red-400/5 transition-all duration-300"
            >
              <LogOut className="w-5 h-5" />
              <span className="tracking-tight lowercase text-[11px] tracking-widest">secure logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto relative bg-[#FFFCEB]">
        {/* Mobile Header */}
        <header className="lg:hidden p-4 flex items-center justify-between sticky top-0 bg-[#FFFCEB]/80 backdrop-blur-md z-30 border-b border-orange-500/5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="text-black"
          >
            <Menu className="w-6 h-6" />
          </Button>
          <Image src="/logo.png" alt="THC Club" width={60} height={30} className="h-4 w-auto" />
          <div className="w-10"></div>
        </header>

        <div className="p-6 lg:p-12 max-w-7xl mx-auto">
          {children}
        </div>

        {/* Floating Action Button for Support */}
        <button 
          onClick={() => onTabChange("inbox")}
          className="fixed bottom-8 right-8 w-14 h-14 bg-[#FE7F2D] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 group shadow-orange-500/20"
        >
           <MessageSquare className="w-6 h-6" />
           <span className="absolute right-full mr-4 bg-black text-white px-4 py-2 rounded-xl text-[10px] font-bold lowercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              quick support
           </span>
        </button>
      </main>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
