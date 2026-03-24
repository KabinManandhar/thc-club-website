"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, MessageSquare, Calendar, Package, TrendingUp, AlertCircle, Shield, Plus, FileText, ArrowUpRight, Check, X as CloseX, LayoutGrid, Zap, AlertTriangle, DollarSign, Receipt } from "lucide-react"
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
  const [criticalStock, setCriticalStock] = useState<any[]>([])
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
      const [brandsRes, enquiriesRes, bookingsRes, slotsRes, stockRes, changesRes, financeRes] = await Promise.all([
        supabase.from("brands").select("onboarding_status"),
        supabase.from("enquiries").select("status"),
        supabase.from("shelf_bookings").select("status"),
        supabase.from("shelf_slots").select("status"),
        supabase.from("stock_update_requests").select("status").eq("status", "pending"),
        supabase.from("brand_change_requests").select("status").eq("status", "pending"),
        supabase.from("invoices").select("total_amount, commission_amount").eq("status", "paid")
      ])

      const brandsData = brandsRes.data || []
      const enquiriesData = enquiriesRes.data || []
      const bookingsData = bookingsRes.data || []
      const slotsData = slotsRes.data || []
      const stockData = stockRes.data || []
      const changesData = changesRes.data || []
      const financeData = financeRes.data || []

      const totalSales = financeData.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0)
      const totalFees = financeData.reduce((sum, inv) => sum + Number(inv.commission_amount || 0), 0)

      setStats({
        brandsCount: brandsData.length,
        pendingBrands: brandsData.filter((b) => b.onboarding_status === "pending").length,
        enquiriesCount: enquiriesData.length,
        newEnquiries: enquiriesData.filter((e) => e.status === "new").length,
        visitRequestsCount: totalSales, // Hijacking this for total sales display in local state
        pendingVisits: totalFees, // Hijacking this for total fees display in local state
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
      const [stockRes, changesRes, lowStockRes] = await Promise.all([
        supabase
          .from("stock_update_requests")
          .select("*, brands(business_name), brand_products(name, sku)")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("brand_change_requests")
          .select("*, brands(business_name)")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("brand_products")
          .select("id, name, stock_quantity, brands(business_name)")
          .lte("stock_quantity", 5)
          .order("stock_quantity", { ascending: true })
          .limit(5)
      ])

      setPendingStock(stockRes.data || [])
      setPendingChanges(changesRes.data || [])
      setCriticalStock(lowStockRes.data || [])
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
      title: "Active Sales (Total)",
      value: `NPR ${stats.visitRequestsCount.toLocaleString()}`,
      pending: 0,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Commission Earned",
      value: `NPR ${stats.pendingVisits.toLocaleString()}`,
      pending: 0,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Managed Brands",
      value: stats.brandsCount,
      pending: stats.pendingBrands,
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "System Inbox",
      value: stats.enquiriesCount,
      pending: stats.newEnquiries,
      icon: MessageSquare,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ]

  const quickActions = [
    { title: "Generate Bill", icon: Receipt, action: () => onTabChange("invoices"), color: "bg-[#010307]" },
    { title: "Manage Shelf", icon: LayoutGrid, action: () => onTabChange("slots"), color: "bg-[#FE7F2D]" },
    { title: "Review Inbox", icon: MessageSquare, action: () => onTabChange("inbox"), color: "bg-blue-600" },
    { title: "Manage Brands", icon: Users, action: () => onTabChange("brands"), color: "bg-purple-600" },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center p-32">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome Header */}
      {/* Welcome Header */}
      <div className="bg-white text-black rounded-2xl p-10 border border-black/5 relative overflow-hidden shadow-sm group">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tighter uppercase italic px-1">Control Center</h1>
            <p className="text-gray-400 font-medium text-sm">Welcome back, {currentUser?.name?.split(' ')[0] || "Admin"}. System synchronized.</p>
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => onTabChange("invoices")}
              className="bg-black hover:bg-black/90 text-white font-black uppercase text-[10px] tracking-widest px-8 h-12 rounded-xl shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 mr-2" />
              New Invoice
            </Button>
            <Button
              variant="outline"
              className="bg-white border-black/5 text-black hover:bg-gray-50 font-black uppercase text-[10px] tracking-widest px-8 h-12 rounded-xl transition-all shadow-sm"
              onClick={() => onTabChange("slots")}
            >
              <LayoutGrid className="w-3.5 h-3.5 mr-2" />
              Shelf Inventory
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="group border-black/5 shadow-sm hover:shadow-md transition-all rounded-2xl bg-white overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{stat.title}</p>
                    <p className="text-3xl font-black text-black tracking-tighter">{stat.value}</p>
                    {stat.pending > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 text-black rounded-full w-fit border border-black/5">
                        <AlertCircle className="w-3 h-3 text-red-500" />
                        <span className="text-[9px] font-black uppercase tracking-tighter">{stat.pending} pending</span>
                      </div>
                    )}
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-black group-hover:text-white text-gray-400`}>
                    <Icon className={`w-6 h-6 transition-colors`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Action Queue */}
        <Card className="lg:col-span-2 border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-gray-50/50 border-b border-black/5 py-4 px-8 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
              <Shield className="w-4 h-4 text-black" />
              Administrative Verification Queue
            </CardTitle>
            <Badge className="bg-black text-white font-black text-[9px] rounded-full px-4">{pendingStock.length + pendingChanges.length} Pending</Badge>
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

          <Card className="border-red-100 shadow-sm bg-white rounded-2xl overflow-hidden">
             <CardHeader className="py-4 bg-red-50/50 border-b border-red-50">
               <CardTitle className="text-sm font-black text-red-800 uppercase tracking-widest flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4" /> Global Critical Stock
               </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
               {criticalStock.length > 0 ? (
                 <div className="divide-y divide-gray-50">
                   {criticalStock.map((p: any) => (
                     <div key={p.id} className="p-4 flex items-center justify-between hover:bg-red-50/20 transition-colors">
                       <div>
                         <p className="font-bold text-sm text-gray-900">{p.name}</p>
                         <p className="text-[10px] text-gray-500 font-bold uppercase">{p.brands?.business_name || "Unknown"}</p>
                       </div>
                       <div className="text-right">
                         <p className="font-black text-red-600 text-lg leading-none">{p.stock_quantity}</p>
                         <p className="text-[10px] text-gray-400 font-bold uppercase">remaining</p>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="p-6 text-center text-gray-500 font-medium text-xs">No critical stock warnings.</div>
               )}
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


