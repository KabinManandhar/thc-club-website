"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, MessageSquare, Calendar, Package, TrendingUp, AlertCircle, Shield, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { adminAuth } from "@/lib/auth"

interface DashboardStats {
  waitlistCount: number
  pendingWaitlist: number
  enquiriesCount: number
  newEnquiries: number
  visitRequestsCount: number
  pendingVisits: number
  bookingRequestsCount: number
  pendingBookings: number
  availableSlots: number
  occupiedSlots: number
  applicationsCount: number
  pendingApplications: number
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats>({
    waitlistCount: 0,
    pendingWaitlist: 0,
    enquiriesCount: 0,
    newEnquiries: 0,
    visitRequestsCount: 0,
    pendingVisits: 0,
    bookingRequestsCount: 0,
    pendingBookings: 0,
    availableSlots: 0,
    occupiedSlots: 0,
    applicationsCount: 0,
    pendingApplications: 0,
  })
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    fetchStats()
    loadCurrentUser()
  }, [])

  const loadCurrentUser = async () => {
    const user = await adminAuth.getCurrentUser()
    setCurrentUser(user)
  }

  const fetchStats = async () => {
    try {
      // Fetch waitlist stats
      const { data: waitlistData } = await supabase.from("waitlist").select("status")

      // Fetch enquiries stats
      const { data: enquiriesData } = await supabase.from("enquiries").select("status")

      // Fetch visit requests stats
      const { data: visitsData } = await supabase.from("visit_requests").select("status")

      // Fetch booking requests stats
      const { data: bookingsData } = await supabase.from("booking_requests").select("status")

      // Fetch shelf slots stats
      const { data: slotsData } = await supabase.from("shelf_slots").select("status")

      // Fetch applications stats
      const { data: applicationsData } = await supabase.from("applications").select("status")

      setStats({
        waitlistCount: waitlistData?.length || 0,
        pendingWaitlist: waitlistData?.filter((w) => w.status === "pending").length || 0,
        enquiriesCount: enquiriesData?.length || 0,
        newEnquiries: enquiriesData?.filter((e) => e.status === "new").length || 0,
        visitRequestsCount: visitsData?.length || 0,
        pendingVisits: visitsData?.filter((v) => v.status === "pending").length || 0,
        bookingRequestsCount: bookingsData?.length || 0,
        pendingBookings: bookingsData?.filter((b) => b.status === "pending").length || 0,
        availableSlots: slotsData?.filter((s) => s.status === "available").length || 0,
        occupiedSlots: slotsData?.filter((s) => s.status === "occupied").length || 0,
        applicationsCount: applicationsData?.length || 0,
        pendingApplications: applicationsData?.filter((a) => a.status === "pending").length || 0,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: "Waitlist",
      value: stats.waitlistCount,
      pending: stats.pendingWaitlist,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Enquiries",
      value: stats.enquiriesCount,
      pending: stats.newEnquiries,
      icon: MessageSquare,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Visit Requests",
      value: stats.visitRequestsCount,
      pending: stats.pendingVisits,
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Booking Requests",
      value: stats.bookingRequestsCount,
      pending: stats.pendingBookings,
      icon: Package,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Applications",
      value: stats.applicationsCount,
      pending: stats.pendingApplications,
      icon: FileText,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg p-6 border border-[#FE7F2D]/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#010307]">Welcome back!</h1>
            <p className="text-gray-600 mt-1">
              {currentUser ? `Logged in as ${currentUser.name}` : "THC Club Admin Dashboard"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#FE7F2D]" />
            <Badge className="bg-[#FE7F2D] text-white">{currentUser?.role?.replace("_", " ") || "admin"}</Badge>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    {stat.pending > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600">{stat.pending} pending</span>
                      </div>
                    )}
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Shelf Slots Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Shelf Slots Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Available Slots</span>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {stats.availableSlots}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Occupied Slots</span>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  {stats.occupiedSlots}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Slots</span>
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                  108
                </Badge>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#FE7F2D] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(stats.occupiedSlots / 108) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">{((stats.occupiedSlots / 108) * 100).toFixed(1)}% occupancy rate</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">New waitlist application received</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Visit request confirmed</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-gray-600">Booking request approved</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-gray-600">New enquiry submitted</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
