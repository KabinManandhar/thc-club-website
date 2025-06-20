"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { LoginForm } from "@/components/admin/login-form"
import { DashboardOverview } from "@/components/admin/dashboard-overview"
import { WaitlistManagement } from "@/components/admin/waitlist-management"
import { adminAuth } from "@/lib/auth"
import { EnquiriesManagement } from "@/components/admin/enquiries-management"
import { VisitRequestsManagement } from "@/components/admin/visit-requests-management"
import { ShelfSlotsManagement } from "@/components/admin/shelf-slots-management"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const isValid = await adminAuth.verifySession()
      setIsAuthenticated(isValid)
    } catch (error) {
      console.error("Auth check error:", error)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setActiveTab("dashboard")
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardOverview />
      case "waitlist":
        return <WaitlistManagement />
      case "enquiries":
        return <EnquiriesManagement />
      case "visits":
        return <VisitRequestsManagement />
      case "bookings":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Booking Requests Management</h2>
            <p className="text-gray-600">Coming Soon - Handle shelf slot booking applications</p>
          </div>
        )
      case "slots":
        return <ShelfSlotsManagement />
      case "settings":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Settings</h2>
            <p className="text-gray-600">Coming Soon - System configuration and preferences</p>
          </div>
        )
      default:
        return <DashboardOverview />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFCEB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout}>
      {renderContent()}
    </AdminLayout>
  )
}
