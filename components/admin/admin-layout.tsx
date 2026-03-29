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
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  TrendingUp,
  Users,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
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
    { id: "payouts", label: "Payouts Tracker", icon: DollarSign },
    { id: "pricing-offers", label: "Pricing & Economics", icon: BadgeDollarSign },
    { id: "shelf-revenue", label: "Shelf Revenue", icon: TrendingUp },
    { id: "slots", label: "Shelf Slot Management", icon: Package },
    { id: "settings", label: "Content Settings", icon: Settings },
    { id: "profile", label: "Admin Profile", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#FFFCEB] font-space-grotesk text-[#010307]">
      {/* Sidebar Toggle Button (visible when closed) */}
      {!sidebarOpen && (
        <div className="fixed top-6 left-6 z-50 animate-in fade-in duration-300">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="bg-white rounded-xl shadow-xl border-[#010307]/5 hover:scale-105 active:scale-95 transition-all text-[#010307]"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#FFFCEB] border-r border-[#010307]/5 transform transition-transform duration-300 ease-in-out scrollbar-hide overflow-y-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col min-h-screen bg-[#FFFCEB] shadow-sm relative">
          {/* Header */}
          <div className="p-8 border-b border-[#010307]/5">
            <Button
               variant="ghost"
               size="icon"
               onClick={() => setSidebarOpen(false)}
               className="absolute right-4 top-6 text-[#010307]/30 hover:text-black hover:bg-black/5 z-10 w-8 h-8 rounded-full"
            >
               <X className="w-4 h-4" />
            </Button>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="THC Club" width={100} height={50} className="h-8 w-auto" />
                <Badge className="bg-[#FE7F2D] text-white text-[8px] font-black uppercase tracking-widest px-2 py-0 border-none">admin</Badge>
              </div>
            </div>
            {currentUser && (
               <div className="mt-6 flex items-start justify-between">
                 <div className="space-y-1 min-w-0 pr-2">
                    <p className="text-[11px] font-bold lowercase tracking-wide text-black flex items-center gap-2 truncate">
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
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start text-left rounded-xl transition-all h-12 px-4 group ${
                        activeTab === item.id
                          ? "bg-[#FE7F2D] text-white shadow-lg shadow-orange-500/20"
                          : "text-[#010307]/50 hover:text-[#FE7F2D] hover:bg-[#FE7F2D]/5"
                      }`}
                      onClick={() => {
                        onTabChange(item.id);
                        setSidebarOpen(false);
                      }}
                    >
                      <Icon className={`w-4 h-4 mr-3 transition-colors ${activeTab === item.id ? "text-white" : "text-[#010307]/30 group-hover:text-[#FE7F2D]"}`} />
                      <span className="font-bold text-[12px] lowercase tracking-wide">{item.label.toLowerCase()}</span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer removed per UX update */}
        </div>
      </div>

      {/* Main content */}
      <div className={`min-w-0 transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:ml-64" : ""}`}>
        <div className="p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">{children}</div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
