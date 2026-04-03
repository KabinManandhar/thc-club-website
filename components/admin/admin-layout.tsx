"use client";

import type React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { adminAuth, type AdminUser } from "@/lib/auth";
import {
  BadgeDollarSign,
  BarChart3,
  BookOpen,
  DollarSign,
  FileText,
  Landmark,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  TrendingUp,
  Users,
  Zap,
  X
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export function AdminLayout({
  children,
  activeTab,
  onTabChange,
  onLogout,
}: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const user = await adminAuth.getCurrentUser();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    await adminAuth.logout();
    onLogout();
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "inbox", label: "Inbox & Requests", icon: MessageSquare },
    { id: "brands", label: "Brand Management", icon: Users },
    { id: "bookings", label: "Shelf Bookings", icon: BookOpen },
    { id: "invoices", label: "Create Invoice", icon: Receipt },
    { id: "invoice-list", label: "Sales History", icon: FileText },
    { id: "accounts", label: "Accounts", icon: Landmark },
    { id: "payouts", label: "Payouts Tracker", icon: DollarSign },
    { id: "pricing-offers", label: "Pricing & Economics", icon: BadgeDollarSign },
    { id: "shelf-revenue", label: "Shelf Revenue", icon: TrendingUp },
    { id: "slots", label: "Shelf Slot Management", icon: Package },
    { id: "bundles", label: "Bundles & Packages", icon: Zap },
    { id: "settings", label: "Content Settings", icon: Settings },
    { id: "profile", label: "Admin Profile", icon: Users },
  ];

  const handleNavClick = (id: string) => {
    onTabChange(id);
  };

  return (
    <div className="min-h-screen bg-[#FFFCEB] font-space-grotesk text-[#010307] flex">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`
          shrink-0 overflow-y-auto scrollbar-hide
          bg-[#FFFCEB] border-r border-[#010307]/5
          transition-all duration-300 ease-in-out
          ${isMobile
            ? `fixed inset-y-0 left-0 z-50 w-64 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`
            : `relative z-10 ${sidebarOpen ? "w-64" : "w-0 border-r-0 overflow-hidden"}`
          }
        `}
      >
        <div className="flex flex-col min-h-screen w-64 bg-[#FFFCEB] shadow-sm relative">
          {/* Header */}
          <div className="p-8 border-b border-[#010307]/5">
            {/* Close button inside sidebar */}
            <Button
               variant="ghost"
               size="icon"
               onClick={() => setSidebarOpen(false)}
               className="absolute right-3 top-5 text-[#010307]/25 hover:text-black hover:bg-black/5 z-10 w-8 h-8 rounded-full"
               title="Collapse sidebar"
            >
               <X className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="THC Club" width={100} height={50} className="h-8 w-auto" />
              <Badge className="bg-[#FE7F2D] text-white text-[8px] font-black uppercase tracking-widest px-2 py-0 border-none">admin</Badge>
            </div>

            {currentUser && (
               <div className="mt-6 flex items-start justify-between">
                 <div className="space-y-1 min-w-0 pr-2">
                    <p className="text-[11px] font-bold lowercase tracking-wide text-black flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                       {currentUser.name.toLowerCase()}
                    </p>
                    <p className="text-[10px] font-medium text-[#010307]/40 lowercase tracking-tighter ml-3.5 italic">
                       {currentUser.role.replace("_", " ").toLowerCase()}
                    </p>
                 </div>
                 <Button
                   variant="ghost"
                   size="icon"
                   onClick={handleLogout}
                   className="hover:bg-red-400/5 text-[#010307]/20 hover:text-red-400 transition-all rounded-xl shrink-0 w-8 h-8"
                   title="Secure Exit"
                 >
                   <LogOut className="w-4 h-4" />
                 </Button>
               </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start text-left rounded-xl transition-all h-11 px-4 group ${
                        activeTab === item.id
                          ? "bg-[#FE7F2D] text-white shadow-lg shadow-orange-500/20"
                          : "text-[#010307]/50 hover:text-[#FE7F2D] hover:bg-[#FE7F2D]/5"
                      }`}
                      onClick={() => handleNavClick(item.id)}
                    >
                      <Icon className={`w-4 h-4 mr-3 transition-colors ${activeTab === item.id ? "text-white" : "text-[#010307]/30 group-hover:text-[#FE7F2D]"}`} />
                      <span className="font-bold text-[12px] lowercase tracking-wide whitespace-nowrap">{item.label.toLowerCase()}</span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
        />
      )}

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Top bar with toggle */}
        <div className="h-14 shrink-0 bg-[#FFFCEB]/90 backdrop-blur-md border-b border-[#010307]/5 px-4 sm:px-6 lg:px-8 flex items-center gap-4 z-30">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-[#010307]/40 hover:text-black hover:bg-black/5 rounded-xl w-9 h-9 shrink-0"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <span className="font-bold text-[11px] lowercase tracking-widest text-[#010307]/30">
            {menuItems.find(m => m.id === activeTab)?.label.toLowerCase() ?? "admin"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth">{children}</div>
      </main>
    </div>
  );
}
