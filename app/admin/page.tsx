"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { BookingsManagement } from "@/components/admin/bookings-management";
import { BrandManagement } from "@/components/admin/brand-management";
import { DashboardOverview } from "@/components/admin/dashboard-overview";
import { InvoiceGenerator } from "@/components/admin/invoice-generator";
import { Leaderboards } from "@/components/admin/leaderboards";
import { LoginForm } from "@/components/admin/login-form";
import { ShelfSlotsManagement } from "@/components/admin/shelf-slots-management";
import { adminAuth } from "@/lib/auth";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function AdminDashboardContent() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("test_mode") === "true") {
      localStorage.setItem("thc_test_mode", "true");
    }
    checkAuth();
  }, [searchParams]);

  const checkAuth = async () => {
    try {
      const isValid = await adminAuth.verifySession();
      setIsAuthenticated(isValid);
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveTab("dashboard");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardOverview onTabChange={setActiveTab} />;

      case "brands":
        return <BrandManagement />;
      case "bookings":
        return <BookingsManagement />;
      case "invoices":
        return <InvoiceGenerator />;
      case "leaderboards":
        return <Leaderboards />;
      case "slots":
        return <ShelfSlotsManagement />;
      case "settings":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Settings</h2>
            <p className="text-gray-600">
              Coming Soon - System configuration and preferences
            </p>
          </div>
        );
      default:
        return <DashboardOverview onTabChange={setActiveTab} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFCEB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <AdminLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={handleLogout}
    >
      {renderContent()}
    </AdminLayout>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFFCEB] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D]"></div>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
