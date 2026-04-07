"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { adminAuth } from "@/lib/auth"
import { supabase, type BrandChangeRequest, type StockUpdateRequest } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { AlertCircle, AlertTriangle, ArrowUpRight, Building2, Check, X as CloseX, DollarSign, Layers, LayoutGrid, MessageSquare, Package, Plus, Shield, Target, TrendingUp, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface DashboardStats {
  brandsCount: number
  pendingBrands: number
  enquiriesCount: number
  newEnquiries: number
  totalSales: number
  totalFees: number
  bookingRequestsCount: number
  pendingBookings: number
  availableSlots: number
  occupiedSlots: number
  pendingStockRequests: number
  pendingChangeRequests: number
  liveSettlementsCount: number
  totalInventoryValue: number
  slotsByLevel: {
    bottom: { available: number; total: number }
    eye_level: { available: number; total: number }
    top_level: { available: number; total: number }
  }
  pricingTiers: any[]
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
    totalSales: 0,
    totalFees: 0,
    bookingRequestsCount: 0,
    pendingBookings: 0,
    availableSlots: 0,
    occupiedSlots: 0,
    pendingStockRequests: 0,
    pendingChangeRequests: 0,
    liveSettlementsCount: 0,
    totalInventoryValue: 0,
    slotsByLevel: {
      bottom: { available: 0, total: 0 },
      eye_level: { available: 0, total: 0 },
      top_level: { available: 0, total: 0 }
    },
    pricingTiers: []
  })
  const [projectionPlan, setProjectionPlan] = useState<"quarterly" | "half_yearly" | "yearly">("yearly")
  const [projectionLevel, setProjectionLevel] = useState<"all" | "bottom" | "eye_level" | "top_level">("all")

  const [pendingStock, setPendingStock] = useState<StockUpdateRequest[]>([])
  const [pendingChanges, setPendingChanges] = useState<BrandChangeRequest[]>([])
  const [criticalStock, setCriticalStock] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isSidebarHidden, setIsSidebarHidden] = useState(false)
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
      const [brandsRes, enquiriesRes, bookingsRes, slotsRes, stockRes, changesRes, financeRes, brandSalesRes, payoutsRes, pricingRes, brandProductsRes] = await Promise.all([
        supabase.from("brands").select("onboarding_status"),
        supabase.from("enquiries").select("status"),
        supabase.from("shelf_bookings").select("status"),
        supabase.from("shelf_slots").select("status, shelf_type"),
        supabase.from("stock_update_requests").select("status").eq("status", "pending"),
        supabase.from("brand_change_requests").select("status").eq("status", "pending"),
        supabase.from("invoices").select("total_amount, ppf_amount").eq("status", "paid"),
        supabase.from("brand_sales").select("brand_id, month, year"),
        supabase.from("payouts").select("brand_id, month, year"),
        supabase.from("shelf_pricing_tiers").select("*"),
        supabase.from("brand_products").select("price, stock_quantity")
      ])

      const brandsData = brandsRes.data || []
      const enquiriesData = enquiriesRes.data || []
      const bookingsData = bookingsRes.data || []
      const slotsData = slotsRes.data || []
      const stockData = stockRes.data || []
      const changesData = changesRes.data || []
      const financeData = financeRes.data || []
      const salesData = brandSalesRes.data || []
      const payoutsData = payoutsRes.data || []

      const finalizedKeys = new Set(payoutsData.map(p => `${p.brand_id}-${p.month}-${p.year}`))
      const pendingSettlements = salesData.filter(s => !finalizedKeys.has(`${s.brand_id}-${s.month}-${s.year}`))

      const totalSales = financeData.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0)
      const totalFees = financeData.reduce((sum, inv) => sum + Number(inv.ppf_amount || 0), 0)

      setStats({
        brandsCount: brandsData.length,
        pendingBrands: brandsData.filter((b) => b.onboarding_status === "pending").length,
        enquiriesCount: enquiriesData.length,
        newEnquiries: enquiriesData.filter((e) => e.status === "new").length,
        totalSales,
        totalFees,
        bookingRequestsCount: bookingsData.length,
        pendingBookings: bookingsData.filter((b) => b.status === "pending").length,
        availableSlots: slotsData.filter((s) => s.status === "available").length,
        occupiedSlots: slotsData.filter((s) => s.status === "occupied").length,
        pendingStockRequests: stockData.length,
        pendingChangeRequests: changesData.length,
        liveSettlementsCount: pendingSettlements.length,
        totalInventoryValue: (brandProductsRes.data || []).reduce((acc: number, p: any) => acc + ((p.price * p.stock_quantity) || 0), 0),
        slotsByLevel: {
          bottom: {
            available: slotsData.filter(s => s.status === 'available' && s.shelf_type === 'bottom').length,
            total: slotsData.filter(s => s.shelf_type === 'bottom').length
          },
          eye_level: {
            available: slotsData.filter(s => s.status === 'available' && s.shelf_type === 'eye_level').length,
            total: slotsData.filter(s => s.shelf_type === 'eye_level').length
          },
          top_level: {
            available: slotsData.filter(s => s.status === 'available' && (s.shelf_type === 'top_level' || s.shelf_type === 'mixed')).length,
            total: slotsData.filter(s => s.shelf_type === 'top_level' || s.shelf_type === 'mixed').length
          }
        },
        pricingTiers: pricingRes.data || []
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

        const { error: logError } = await supabase
          .from("product_stock_logs")
          .insert({
            product_id: request.product_id,
            brand_id: request.brand_id,
            previous_stock: request.current_stock,
            new_stock: request.requested_stock,
            change_amount: request.requested_stock - request.current_stock,
            change_type: "admin_approval",
            reference_id: request.id,
          })
        if (logError) throw logError
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
          const { data: insertedProduct, error } = await supabase.from('brand_products').insert({
            brand_id: request.brand_id,
            ...data
          }).select().single()
          if (error) throw error
          
          if (data.stock_quantity) {
            await supabase.from('product_stock_logs').insert({
              product_id: insertedProduct.id,
              brand_id: request.brand_id,
              previous_stock: 0,
              new_stock: data.stock_quantity,
              change_amount: data.stock_quantity,
              change_type: "brand_update",
              reference_id: request.id,
              notes: "Initial stock added"
            })
          }
        } else if (request.request_type === 'product_update' && request.target_id) {
          const { data: prevProd } = await supabase.from("brand_products").select("stock_quantity").eq("id", request.target_id).single()
          const { error } = await supabase.from('brand_products').update(data).eq('id', request.target_id)
          if (error) throw error
          
          if (data.stock_quantity !== undefined && prevProd && data.stock_quantity !== prevProd.stock_quantity) {
            await supabase.from('product_stock_logs').insert({
              product_id: request.target_id,
              brand_id: request.brand_id,
              previous_stock: prevProd.stock_quantity,
              new_stock: data.stock_quantity,
              change_amount: data.stock_quantity - prevProd.stock_quantity,
              change_type: "admin_approval",
              reference_id: request.id,
              notes: "Brand requested update"
            })
          }
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

  const calculateProjectedRevenue = () => {
    const pricing = stats.pricingTiers.find(t => t.duration === projectionPlan && t.section_tier === 'regular')
    if (!pricing) return 0

    const levels = {
      bottom: pricing.bottom_price,
      eye_level: pricing.eye_level_price,
      top_level: pricing.top_level_price
    }

    if (projectionLevel === 'all') {
      return (
        (stats.slotsByLevel.bottom.total - stats.slotsByLevel.bottom.available) * levels.bottom +
        (stats.slotsByLevel.eye_level.total - stats.slotsByLevel.eye_level.available) * levels.eye_level +
        (stats.slotsByLevel.top_level.total - stats.slotsByLevel.top_level.available) * levels.top_level
      )
    }

    const currentLevel = stats.slotsByLevel[projectionLevel as keyof typeof stats.slotsByLevel]
    const price = levels[projectionLevel as keyof typeof levels]
    return (currentLevel.total - currentLevel.available) * price
  }

  const statCards = [
    {
      title: "Active Sales (Total)",
      value: `NPR ${stats.totalSales.toLocaleString()}`,
      pending: stats.liveSettlementsCount,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Payment Processing Fee Earned",
      value: `NPR ${stats.totalFees.toLocaleString()}`,
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
      title: "Platform Shelf Value",
      value: `NPR ${stats.totalInventoryValue.toLocaleString()}`,
      pending: 0,
      icon: Package,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
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
      <div className="bg-white text-black rounded-2xl p-6 sm:p-10 border border-black/5 relative overflow-hidden shadow-sm group">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase italic px-1">Control Center</h1>
            <p className="text-gray-400 font-medium text-sm">Welcome back, {currentUser?.name?.split(' ')[0] || "Admin"}. System synchronized.</p>
          </div>
          <div className="flex gap-2 sm:gap-4">
            <Button
              onClick={() => onTabChange("invoices")}
              className="bg-black hover:bg-black/90 text-white font-black uppercase text-[10px] tracking-widest px-4 sm:px-8 h-10 sm:h-12 rounded-xl shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 mr-2" />
              New Invoice
            </Button>
            <Button
              variant="outline"
              className={`border-black/5 text-black hover:bg-gray-50 font-black uppercase text-[10px] tracking-widest px-4 sm:px-8 h-10 sm:h-12 rounded-xl transition-all shadow-sm flex items-center gap-2 ${isSidebarHidden ? 'bg-black text-white hover:bg-black/90' : 'bg-white'}`}
              onClick={() => setIsSidebarHidden(!isSidebarHidden)}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {isSidebarHidden ? "Show Insights" : "Hide Insights"}
            </Button>
            <Button
              variant="outline"
              className="bg-white border-black/5 text-black hover:bg-gray-50 font-black uppercase text-[10px] tracking-widest px-4 sm:px-8 h-10 sm:h-12 rounded-xl transition-all shadow-sm hidden sm:flex"
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
          const isFinancial = stat.title.includes("Sales") || stat.title.includes("Fee")
          return (
            <Card
              key={stat.title}
              className={`group border-black/5 shadow-sm hover:shadow-md transition-all rounded-2xl bg-white overflow-hidden cursor-pointer active:scale-95`}
              onClick={() => onTabChange(isFinancial ? "accounts" : (stat.title.includes("Brands") ? "brands" : "inbox"))}
            >
              <CardContent className="p-5 sm:p-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{stat.title}</p>
                    <p className="text-2xl sm:text-3xl font-black text-black tracking-tighter">{stat.value}</p>
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

      {/* REVENUE INSIGHTS & FORECASTER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-black/5 shadow-sm rounded-2xl bg-white overflow-hidden">
          <div className="px-8 py-6 border-b border-black/5 flex justify-between items-center bg-gray-50/30">
            <div className="space-y-1">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <Target className="w-4 h-4 text-[#FE7F2D]" /> Shelf Rental Insights
              </CardTitle>
              <p className="text-[10px] text-gray-400 font-bold lowercase">Occupied Revenue Projection based on chosen plan.</p>
            </div>
            <div className="flex bg-white border border-black/5 p-1 rounded-xl shadow-sm">
              {['quarterly', 'half_yearly', 'yearly'].map(plan => (
                <button
                  key={plan}
                  onClick={() => setProjectionPlan(plan as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    projectionPlan === plan ? "bg-black text-white" : "text-gray-400 hover:text-black"
                  )}
                >
                  {plan.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <CardContent className="p-8">
            <div className="grid sm:grid-cols-2 gap-12">
              <div className="space-y-8">
                {/* Level Toggles */}
                <div className="space-y-3">
                  <Label className="uppercase text-[9px] font-black text-gray-300 tracking-widest">Select view level</Label>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'bottom', 'eye_level', 'top_level'].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setProjectionLevel(lvl as any)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-bold lowercase border transition-all",
                          projectionLevel === lvl ? "bg-[#FE7F2D]/10 border-[#FE7F2D] text-[#FE7F2D]" : "bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100"
                        )}
                      >
                        {lvl.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 pt-4">
                  {(['bottom', 'eye_level', 'top_level'] as const).map(lvl => {
                    const data = stats.slotsByLevel[lvl]
                    const isSelected = projectionLevel === 'all' || projectionLevel === lvl
                    return (
                      <div key={lvl} className={cn("space-y-2 transition-opacity", !isSelected && "opacity-20 grayscale")}>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                          <span className="text-gray-400">{lvl.replace('_', ' ')}</span>
                          <span className="text-black">{data.total - data.available} / {data.total} <span className="text-gray-300 lowercase italic font-bold">slots taken</span></span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-1000",
                              lvl === 'eye_level' ? "bg-[#FE7F2D]" : lvl === 'bottom' ? "bg-blue-400" : "bg-purple-400"
                            )}
                            style={{ width: `${((data.total - data.available) / data.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-gray-50/50 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center space-y-4 border border-black/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 p-4 opacity-5"><TrendingUp className="w-24 h-24" /></div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Monthly Forecast</p>
                  <p className="text-5xl font-black tracking-tighter text-[#FE7F2D]">NPR {calculateProjectedRevenue().toLocaleString()}</p>
                </div>
                <div className="pt-4 space-y-2">
                  <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400">
                    <Layers className="w-3 h-3" />
                    <span>Filter: <strong className="text-black">{projectionPlan}</strong> / <strong className="text-black">{projectionLevel}</strong></span>
                  </div>
                  <p className="text-[9px] text-gray-300 italic max-w-[200px] mx-auto">Projected revenue if all current occupied slots were on this plan.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-black/5 shadow-sm rounded-2xl bg-black text-white p-6 relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-[#FE7F2D]"><Building2 className="w-5 h-5" /></div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-[#FE7F2D] uppercase tracking-widest">Total Inventory</p>
                <p className="text-3xl font-black tracking-tighter">{stats.occupiedSlots + stats.availableSlots} Units</p>
              </div>
              <p className="text-[10px] text-white/40 italic lowercase leading-relaxed">System tracking {stats.slotsByLevel.bottom.total + stats.slotsByLevel.eye_level.total + stats.slotsByLevel.top_level.total} slots across 3 physical showroom zones.</p>
            </div>
          </Card>

          <Card
            className="border-black/5 shadow-sm rounded-2xl bg-white p-6 hover:border-[#FE7F2D]/30 transition-all cursor-pointer group"
            onClick={() => onTabChange("slots")}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Occupancy</p>
                <p className="text-2xl font-black text-black tracking-tighter">{((stats.occupiedSlots / (stats.occupiedSlots + stats.availableSlots)) * 100).toFixed(1)}%</p>
              </div>
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-[#FE7F2D] group-hover:text-white transition-all"><ArrowUpRight className="w-5 h-5" /></div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Action Queue */}
        <Card className={`${isSidebarHidden ? 'lg:col-span-3' : 'lg:col-span-2'} border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white transition-all duration-500`}>
          <div className="px-8 bg-gray-50/50 border-b border-black/5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
              <Shield className="w-4 h-4 text-black" />
              Administrative Verification Queue
            </CardTitle>
            <Badge className="bg-black text-white font-black text-[9px] rounded-full px-4">{pendingStock.length + pendingChanges.length} Pending</Badge>
          </div>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              {(pendingStock.length > 0 || pendingChanges.length > 0) ? (
                <div className="divide-y divide-gray-50">
                  {/* Stock Requests */}
                  {pendingStock.map((request) => (
                    <div key={request.id} className="p-4 sm:p-5 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
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
                    <div key={request.id} className="p-4 sm:p-5 hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
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
                          <p className="text-[10px] text-gray-400 font-mono bg-gray-50 p-1 px-2 rounded mt-2 truncate max-w-[160px] sm:max-w-[200px]">
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

        {/* Quick Insights / Action Cards - Sticky Sidebar */}
        {!isSidebarHidden && (
          <div className="space-y-6 lg:sticky lg:top-4 h-fit animate-in fade-in slide-in-from-right-4 duration-500">
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
        )}
      </div>
    </div>
  )
}
