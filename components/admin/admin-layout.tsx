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

    { id: "slots", label: "Shelf Slot Management", icon: Package },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#FFFCEB] font-space-grotesk text-[#010307]">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white"
        >
          {sidebarOpen ? (
            <X className="w-4 h-4" />
          ) : (
            <Menu className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#FFFCEB] border-r border-[#FE7F2D]/10 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex flex-col h-full bg-[#FFFCEB] shadow-sm">
          {/* Header */}
          {/* Header */}
          <div className="p-8 border-b border-[#010307]/5">
            <div className="flex items-center gap-3">
              <Image src="/logo.png" alt="THC Club" width={100} height={50} className="h-8 w-auto" />
              <Badge className="bg-[#FE7F2D] text-white text-[8px] font-black uppercase tracking-widest px-2 py-0 border-none">admin</Badge>
            </div>
            {currentUser && (
               <div className="mt-6 space-y-1">
                  <p className="text-[11px] font-bold lowercase tracking-wide text-black flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                     {currentUser.name.toLowerCase()}
                  </p>
                  <p className="text-[10px] font-medium text-[#010307]/40 lowercase tracking-tighter ml-3.5 italic">
                     {currentUser.role.replace("_", " ").toLowerCase()}
                  </p>
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

          {/* Footer */}
          <div className="p-6 border-t border-[#010307]/5">
            <Button
              variant="ghost"
              className="w-full justify-start text-[#010307]/40 hover:text-[#FE7F2D] hover:bg-[#FE7F2D]/5 rounded-xl transition-all h-12 px-4 group"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-3 text-[#010307]/20 group-hover:text-[#FE7F2D]" />
              <span className="font-bold text-[12px] lowercase tracking-wide">logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64 min-w-0">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
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
