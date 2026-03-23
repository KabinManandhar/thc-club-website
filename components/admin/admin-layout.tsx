"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, MessageSquare, Calendar, Package, BarChart3, Settings, LogOut, Menu, X, User, Receipt, BookOpen } from "lucide-react"
import Image from "next/image"
import { adminAuth, type AdminUser } from "@/lib/auth"

interface AdminLayoutProps {
  children: React.ReactNode
  activeTab: string
  onTabChange: (tab: string) => void
  onLogout: () => void
}

export function AdminLayout({ children, activeTab, onTabChange, onLogout }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const user = await adminAuth.getCurrentUser()
      setCurrentUser(user)
    }
    loadUser()
  }, [])

  const handleLogout = async () => {
    await adminAuth.logout()
    onLogout()
  }

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "waitlist", label: "Waitlist", icon: Users },
    { id: "enquiries", label: "Enquiries", icon: MessageSquare },
    { id: "visits", label: "Visit Requests", icon: Calendar },
    { id: "brands", label: "Brand Management", icon: Users },
    { id: "bookings", label: "Shelf Bookings", icon: BookOpen },
    { id: "invoices", label: "Invoice Generator", icon: Receipt },
    { id: "sales", label: "Sales Input", icon: BarChart3 },
    { id: "slots", label: "Visual Shelf Grid", icon: Package },
    { id: "settings", label: "Settings", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-[#FFFCEB] font-space-grotesk">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="bg-white">
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#010307] text-white transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-[#FE7F2D]/20">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="THC Club" width={80} height={40} className="h-6 w-auto" />
              <Badge className="bg-[#FE7F2D] text-white text-xs">admin</Badge>
            </div>
            {currentUser && (
              <div className="mt-3 text-xs text-white/70">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3" />
                  <span>{currentUser.name}</span>
                </div>
                <div className="text-white/50">{currentUser.role.replace("_", " ")}</div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.id}>
                    <Button
                      variant={activeTab === item.id ? "secondary" : "ghost"}
                      className={`w-full justify-start text-left ${
                        activeTab === item.id
                          ? "bg-[#FE7F2D] text-white hover:bg-[#FE7F2D]/90"
                          : "text-white/80 hover:text-white hover:bg-white/10"
                      }`}
                      onClick={() => {
                        onTabChange(item.id)
                        setSidebarOpen(false)
                      }}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </Button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-[#FE7F2D]/20">
            <Button
              variant="ghost"
              className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        <div className="p-6 lg:p-8">{children}</div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
