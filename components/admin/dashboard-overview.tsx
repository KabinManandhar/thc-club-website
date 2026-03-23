"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, MessageSquare, Calendar, Package, TrendingUp, AlertCircle, Shield, Plus, FileText, ArrowUpRight, Check, X as CloseX, LayoutGrid, Zap } from "lucide-react"
import { supabase, type StockUpdateRequest, type BrandChangeRequest } from "@/lib/supabase"
import { adminAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface DashboardStats {
  brandsCount: number
  pendingBrands: number
  enquiriesCount: number
  newEnquiries: number
  visitRequestsCount: number
  pendingVisits: number
  bookingRequestsCount: number
  pendingBookings: number
  availableSlots: number
  occupiedSlots: number
  pendingStockRequests: number
  pendingChangeRequests: number
}

interface DashboardOverviewProps {
  onTabChange: (tab: string) => void
}

export function DashboardOverview({ onTabChange }: DashboardOverviewProps) {
  const [stats, setStats] = useState<DashboardStats>({
    brandsCount: 0,
    pendingBrands: 0,
    enquiriesCount: 0,
    newEnquiries: 0,
    visitRequestsCount: 0,
    pendingVisits: 0,
    bookingRequestsCount: 0,
    pendingBookings: 0,
    availableSlots: 0,
    occupiedSlots: 0,
    pendingStockRequests: 0,
    pendingChangeRequests: 0,
  })
  const [pendingStock, setPendingStock] = useState<StockUpdateRequest[]>([])
  const [pendingChanges, setPendingChanges] = useState<BrandChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    fetchStats()
    fetchRequests()
    loadCurrentUser()
  }, [])

  const loadCurrentUser = async () => {
    const user = await adminAuth.getCurrentUser()
    setCurrentUser(user)
  }

  const fetchStats = async () => {
    try {
      const [brandsRes, enquiriesRes, visitsRes, bookingsRes, slotsRes, stockRes, changesRes] = await Promise.all([
        supabase.from("brands").select("onboarding_status"),
        supabase.from("enquiries").select("status"),
        supabase.from("visit_requests").select("status"),
        supabase.from("shelf_bookings").select("status"),
        supabase.from("shelf_slots").select("status"),
        supabase.from("stock_update_requests").select("status").eq("status", "pending"),
        supabase.from("brand_change_requests").select("status").eq("status", "pending")
      ])

      const brandsData = brandsRes.data || []
      const enquiriesData = enquiriesRes.data || []
      const visitsData = visitsRes.data || []
      const bookingsData = bookingsRes.data || []
      const slotsData = slotsRes.data || []
      const stockData = stockRes.data || []
      const changesData = changesRes.data || []

      setStats({
        brandsCount: brandsData.length,
        pendingBrands: brandsData.filter((b) => b.onboarding_status === "pending").length,
        enquiriesCount: enquiriesData.length,
        newEnquiries: enquiriesData.filter((e) => e.status === "new").length,
        visitRequestsCount: visitsData.length,
        pendingVisits: visitsData.filter((v) => v.status === "pending").length,
        bookingRequestsCount: bookingsData.length,
        pendingBookings: bookingsData.filter((b) => b.status === "pending").length,
        availableSlots: slotsData.filter((s) => s.status === "available").length,
        occupiedSlots: slotsData.filter((s) => s.status === "occupied").length,
        pendingStockRequests: stockData.length,
        pendingChangeRequests: changesData.length,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRequests = async () => {
    try {
      const [stockRes, changesRes] = await Promise.all([
        supabase
          .from("stock_update_requests")
          .select("*, brands(business_name), brand_products(name, sku)")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("brand_change_requests")
          .select("*, brands(business_name)")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
      ])

      setPendingStock(stockRes.data || [])
      setPendingChanges(changesRes.data || [])
    } catch (error) {
      console.error("Error fetching requests:", error)
    }
  }

  const handleStockAction = async (requestId: string, action: "approve" | "reject") => {
    setProcessingId(requestId)
    try {
      const request = pendingStock.find(r => r.id === requestId)
      if (!request) return

      if (action === "approve") {
        const { error: updateError } = await supabase
          .from("brand_products")
          .update({ stock_quantity: request.requested_stock })
          .eq("id", request.product_id)
        if (updateError) throw updateError
      }

      const { error: requestError } = await supabase
        .from("stock_update_requests")
        .update({
          status: action === "approve" ? "approved" : "rejected",
          admin_notes: action === "approve" ? "Physical stock verified and updated." : "Rejected by admin."
        })
        .eq("id", requestId)

      if (requestError) throw requestError

      toast.success(`Stock request ${action}d successfully`)
      fetchRequests()
      fetchStats()
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setProcessingId(null)
    }
  }

  const handleChangeAction = async (request: BrandChangeRequest, action: 'approve' | 'reject') => {
    setProcessingId(request.id)
    try {
      if (action === 'approve') {
        const data = request.new_data
        
        if (request.request_type === 'product_add') {
          const { error } = await supabase.from('brand_products').insert({
             brand_id: request.brand_id,
             ...data
          })
          if (error) throw error
        } else if (request.request_type === 'product_update' && request.target_id) {
          const { error } = await supabase.from('brand_products').update(data).eq('id', request.target_id)
          if (error) throw error
        } else if (request.request_type === 'brand_update') {
          const { error } = await supabase.from('brands').update(data).eq('id', request.brand_id)
          if (error) throw error
        }
      }

      const { error } = await supabase
        .from('brand_change_requests')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', request.id)
      
      if (error) throw error
      
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
      fetchRequests()
      fetchStats()
    } catch (err: any) {
      toast.error(err.message || 'Failed to process request')
    } finally {
      setProcessingId(null)
    }
  }

  const statCards = [
    {
      title: "Total Brands",
      value: stats.brandsCount,
      pending: stats.pendingBrands,
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
      title: "Stock Requests",
      value: pendingStock.length,
      pending: pendingStock.length,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Change Requests",
      value: pendingChanges.length,
      pending: pendingChanges.length,
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
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
    <div className="space-y-6 pb-20">
      {/* Welcome Header */}
      <div className="bg-[#010307] text-white rounded-2xl p-8 border border-[#FE7F2D]/30 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FE7F2D]/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter">Welcome back, {currentUser?.name?.split(' ')[0] || "Admin"}!</h1>
            <p className="text-gray-400 font-medium">Here's what's happening at the Hidden Collective Club today.</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => onTabChange("invoices")}
              className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-black uppercase text-xs tracking-widest px-6 h-12 rounded-xl shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
            <Button
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-black uppercase text-xs tracking-widest px-6 h-12 rounded-xl"
              onClick={() => onTabChange("slots")}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              View Slots
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="group border-gray-100 hover:border-[#FE7F2D]/30 shadow-sm hover:shadow-xl transition-all duration-500 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.title}</p>
                    <p className="text-4xl font-black text-gray-900 tracking-tighter">{stat.value}</p>
                    {stat.pending > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 text-red-600 rounded-full w-fit animate-pulse border border-red-100">
                        <AlertCircle className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">{stat.pending} pending</span>
                      </div>
                    )}
                  </div>
                  <div className={`w-14 h-14 rounded-2xl ${stat.bgColor} flex items-center justify-center transition-transform group-hover:scale-110 duration-500`}>
                    <Icon className={`w-7 h-7 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Action Queue */}
        <Card className="lg:col-span-2 border-gray-100 shadow-xl rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4 px-6 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#FE7F2D]" />
              Admin Approval Terminal
            </CardTitle>
            <Badge className="bg-[#FE7F2D] text-white font-black">{pendingStock.length + pendingChanges.length} Requests</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              {(pendingStock.length > 0 || pendingChanges.length > 0) ? (
                <div className="divide-y divide-gray-50">
                  {/* Stock Requests */}
                  {pendingStock.map((request) => (
                    <div key={request.id} className="p-5 hover:bg-gray-50/50 transition-colors flex items-center justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                          <Package className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 text-sm tracking-tight">{(request.brand_products as any)?.name}</span>
                            <Badge className="bg-purple-100 text-purple-800 text-[9px] uppercase font-bold py-0 border-none">STOCK UPDATE</Badge>
                          </div>
                          <p className="text-xs text-gray-500 font-bold">Brand: <span className="text-[#FE7F2D]">{(request.brands as any)?.business_name}</span></p>
                          <div className="flex items-center gap-3 mt-2">
                            <div className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600">
                               Was: <span className="text-gray-900 font-black">{request.current_stock}</span>
                            </div>
                            <ArrowUpRight className="w-3 h-3 text-gray-300" />
                            <div className="bg-green-50 px-2 py-0.5 rounded text-[10px] font-black text-green-700 border border-green-100">
                               Now: {request.requested_stock}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-10 h-10 rounded-xl border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700 p-0"
                          onClick={() => handleStockAction(request.id, "approve")}
                          disabled={!!processingId}
                        >
                          <Check className="w-5 h-5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-10 h-10 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 p-0"
                          onClick={() => handleStockAction(request.id, "reject")}
                          disabled={!!processingId}
                        >
                          <CloseX className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Generic Changes */}
                  {pendingChanges.map((request) => (
                    <div key={request.id} className="p-5 hover:bg-gray-50/50 transition-colors flex items-center justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
                          <AlertCircle className="w-6 h-6 text-[#FE7F2D]" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 text-sm tracking-tight">{request.request_type.replace('_', ' ').toUpperCase()}</span>
                            <Badge className="bg-orange-100 text-[#FE7F2D] text-[9px] uppercase font-bold py-0 border-none">META CHANGE</Badge>
                          </div>
                          <p className="text-xs text-gray-500 font-bold">Brand: <span className="text-[#FE7F2D]">{(request.brands as any)?.business_name}</span></p>
                          <p className="text-[10px] text-gray-400 font-mono bg-gray-50 p-1 px-2 rounded mt-2 truncate max-w-[200px]">
                             {JSON.stringify(request.new_data)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-10 h-10 rounded-xl border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700 p-0"
                          onClick={() => handleChangeAction(request, "approve")}
                          disabled={!!processingId}
                        >
                          <Check className="w-5 h-5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-10 h-10 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 p-0"
                          onClick={() => handleChangeAction(request, "reject")}
                          disabled={!!processingId}
                        >
                          <CloseX className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center space-y-3">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                    <Check className="w-8 h-8" />
                  </div>
                  <p className="text-gray-400 font-bold text-sm">All changes are currently synchronized.</p>
                </div>
              )}
            </div>
          </CardContent>
          {pendingStock.length > 0 && (
            <div className="p-4 bg-gray-50/50 border-t border-gray-100 text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic animate-pulse">
                Verify physical inventory before approving
              </p>
            </div>
          )}
        </Card>

        {/* Quick Insights / Action Cards */}
        <div className="space-y-6">
          <Card className="border-gray-100 shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#FE7F2D]" />
                Occupancy Pulse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                <span>Active Slots</span>
                <span className="text-gray-900 font-black">{stats.occupiedSlots} / 102</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 relative overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#FE7F2D] to-orange-400 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(254,127,45,0.4)]"
                  style={{ width: `${(stats.occupiedSlots / 102) * 100}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="bg-green-50/50 p-2 rounded-xl text-center border border-green-100/50">
                  <p className="text-[10px] uppercase font-black text-green-700 tracking-tighter">Available</p>
                  <p className="text-lg font-black text-green-800">{stats.availableSlots}</p>
                </div>
                <div className="bg-blue-50/50 p-2 rounded-xl text-center border border-blue-100/50">
                  <p className="text-[10px] uppercase font-black text-blue-700 tracking-tighter">Capacity</p>
                  <p className="text-lg font-black text-blue-800">{((stats.occupiedSlots / 102) * 100).toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-lg rounded-2xl overflow-hidden bg-[#FE7F2D] text-white">
            <CardContent className="p-6 space-y-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-lg leading-tight uppercase tracking-tighter">System Health</h3>
                <p className="text-white/70 text-xs font-medium leading-relaxed">Synchronized with Supabase Edge. All RLS policies active.</p>
              </div>
              <Button
                variant="outline"
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 font-black text-xs h-10 rounded-xl"
                onClick={() => window.location.reload()}
              >
                Refresh Cache
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}


