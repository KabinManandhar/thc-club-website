"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import {
    Activity,
    ArrowUpRight,
    DollarSign,
    History,
    Package,
    LayoutGrid,
    Calendar,
    Zap,
    Plus,
    UserCircle,
    MessageSquare,
    Clock,
} from "lucide-react"
import { useEffect, useState } from "react"

interface BrandDashboardOverviewProps {
  brandId: string
}

export function BrandDashboardOverview({ brandId }: BrandDashboardOverviewProps) {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    activeProducts: 0,
  })
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
  const [activeBooking, setActiveBooking] = useState<any>(null)
  const [allottedSlots, setAllottedSlots] = useState<any[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [brandId])

  const fetchDashboardData = async () => {
    try {
      const [productsRes, salesRes, bookingRes, slotsRes] = await Promise.all([
        supabase.from("brand_products").select("*").eq("brand_id", brandId),
        supabase.from("brand_sales").select("*").eq("brand_id", brandId).order("year", { ascending: false }).order("month", { ascending: false }),
        supabase.from("shelf_bookings").select("*").eq("brand_id", brandId).eq("status", "active").maybeSingle(),
        supabase.from("shelf_slots").select("*, shelves(*)").eq("brand_id", brandId)
      ])

      const products = productsRes.data || []
      const sales = salesRes.data || []

      const lowStock = products.filter(p => p.stock_quantity <= (p.low_stock_threshold || 5))
      setLowStockProducts(lowStock)
      setActiveBooking(bookingRes.data)
      setAllottedSlots(slotsRes.data || [])

      const totalSales = sales.reduce((sum, s) => sum + (s.gross_sales || 0), 0)
      const totalOrders = sales.length

      setStats({
        totalSales,
        totalOrders,
        activeProducts: products.length
      })

      const { data: invoiceItems } = await supabase
        .from("invoice_items")
        .select("product_id, quantity")
        .in("product_id", products.map(p => p.id))
      
      if (invoiceItems && invoiceItems.length > 0) {
        const productSales: Record<string, number> = {}
        invoiceItems.forEach(item => {
          if (!productSales[item.product_id]) productSales[item.product_id] = 0
          productSales[item.product_id] += item.quantity
        })
        
        const top = products
          .filter(p => productSales[p.id])
          .map(p => ({
            ...p,
            sold: productSales[p.id]
          }))
          .sort((a, b) => b.sold - a.sold)
          .slice(0, 5)
        
        setTopProducts(top)
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1,2,3].map(i => <Card key={i} className="animate-pulse h-48 rounded-[2.5rem] bg-white/50 border-none shadow-xl"></Card>)}
        </div>
        <div className="grid lg:grid-cols-2 gap-8">
           <Card className="animate-pulse h-96 rounded-[3rem] bg-white/50 border-none shadow-xl"></Card>
           <Card className="animate-pulse h-96 rounded-[3rem] bg-white/50 border-none shadow-xl"></Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div>
            <h2 className="text-4xl font-black tracking-tighter lowercase italic">performance dashboard</h2>
            <p className="text-[#010307]/40 font-medium italic lowercase">synchronized with outlet 01 • kathmandu</p>
         </div>
         <div className="flex gap-3">
            <Badge className="bg-[#FE7F2D]/10 text-[#FE7F2D] border-none px-4 py-2 rounded-xl font-bold lowercase italic text-xs">
               partner id: {brandId.slice(0, 8)}
            </Badge>
         </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-2xl bg-white p-6 group transition-all">
          <div className="flex justify-between items-start mb-4">
             <div className="w-10 h-10 bg-[#FE7F2D] rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <DollarSign className="w-5 h-5" />
             </div>
          </div>
          <p className="text-[10px] font-bold lowercase text-[#010307]/30 tracking-widest mb-1 italic">total yield</p>
          <h3 className="text-2xl font-black tracking-tighter italic text-[#010307]">npr {stats.totalSales.toLocaleString()}</h3>
        </Card>
 
        <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-2xl bg-white p-6 group transition-all">
          <div className="flex justify-between items-start mb-4">
             <div className="w-10 h-10 bg-[#FE7F2D]/10 rounded-xl flex items-center justify-center text-[#FE7F2D]">
                <Activity className="w-5 h-5" />
             </div>
          </div>
          <p className="text-[10px] font-bold lowercase text-[#010307]/30 tracking-widest mb-1 italic">transactions</p>
          <h3 className="text-2xl font-black text-[#010307] tracking-tighter italic">{stats.totalOrders}</h3>
        </Card>
 
        <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-2xl bg-white p-6 group transition-all">
          <div className="flex justify-between items-start mb-4">
             <div className="w-10 h-10 bg-[#FE7F2D]/10 rounded-xl flex items-center justify-center text-[#FE7F2D]">
                <Package className="w-5 h-5" />
             </div>
          </div>
          <p className="text-[10px] font-bold lowercase text-[#010307]/30 tracking-widest mb-1 italic">active catalog</p>
          <h3 className="text-2xl font-black text-[#010307] tracking-tighter italic">{stats.activeProducts} items</h3>
        </Card>

        <Card className="border-none shadow-xl rounded-2xl bg-[#010307] p-6 group transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#FE7F2D]/10 rounded-full -mr-12 -mt-12"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
             <div className="w-10 h-10 bg-[#FE7F2D] rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <LayoutGrid className="w-5 h-5" />
             </div>
          </div>
          <p className="text-[10px] font-bold lowercase text-white/30 tracking-widest mb-1 italic">allotted slots</p>
          <h3 className="text-2xl font-black text-white tracking-tighter italic">
            {allottedSlots.length > 0 
               ? `${allottedSlots.length} slot${allottedSlots.length > 1 ? 's' : ''}` 
               : (activeBooking ? `Slot ${activeBooking.slot_number}` : "unassigned")}
          </h3>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Shelf Territory */}
        <Card className="border border-black/5 shadow-sm rounded-[2rem] bg-white overflow-hidden p-0">
           <CardHeader className="p-8 pb-4 border-b border-[#010307]/5">
              <CardTitle className="text-xl font-black tracking-tighter lowercase italic flex items-center gap-3">
                <LayoutGrid className="w-5 h-5 text-[#FE7F2D]" />
                my territory
              </CardTitle>
              <p className="text-[10px] font-bold lowercase text-[#010307]/30 tracking-widest mt-1 italic">physical footprint details</p>
           </CardHeader>
           <CardContent className="p-8 space-y-6">
              {allottedSlots.length > 0 ? (
                <div className="space-y-6">
                   <div className="flex flex-col gap-4">
                      {allottedSlots.map(slot => (
                        <div key={slot.id} className="p-6 bg-[#010307] rounded-3xl border border-[#010307] flex flex-col gap-6 group hover:border-[#FE7F2D]/50 transition-all relative overflow-hidden">
                           {/* Background Glow */}
                           <div className="absolute top-0 right-0 w-32 h-32 bg-[#FE7F2D]/10 blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-[#FE7F2D]/20 transition-all"></div>
                           
                           <div className="flex justify-between items-start relative z-10">
                              <div className="space-y-1">
                                 <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                                    <p className="text-[8px] font-black text-[#FE7F2D] uppercase tracking-[0.3em]">certified slot</p>
                                 </div>
                                 <h4 className="font-black text-2xl text-white lowercase italic leading-none truncate max-w-[200px]">{slot.shelf_name || (slot.shelves?.name) || 'Collective'}</h4>
                                 <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{slot.section || (slot.shelves?.section) || 'Premium Hallway'}</p>
                              </div>
                              <div className="flex flex-col items-center">
                                 <div className="h-16 w-16 bg-[#FE7F2D] rounded-2xl flex flex-col items-center justify-center text-[#010307] shadow-2xl shadow-[#FE7F2D]/40 border-2 border-white/10 group-hover:scale-105 transition-transform">
                                    <p className="text-[10px] font-black opacity-60 uppercase leading-none mb-0.5">slot</p>
                                    <p className="font-black text-3xl leading-none italic">#{slot.slot_number}</p>
                                 </div>
                              </div>
                           </div>

                           <div className="grid grid-cols-3 gap-3 relative z-10">
                              <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                                 <Package className="w-3.5 h-3.5 text-white/20 mb-2" />
                                 <p className="text-[7px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">physical level</p>
                                 <p className="text-[10px] font-black text-white lowercase italic">{(slot.shelf_type || slot.shelves?.shelf_type || 'standard').replace('_', ' ')}</p>
                              </div>
                              <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                                 <LayoutGrid className="w-3.5 h-3.5 text-white/20 mb-2" />
                                 <p className="text-[7px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">unit footprint</p>
                                 <p className="text-[10px] font-black text-white lowercase italic">{slot.shelves?.size || 'standard'}</p>
                              </div>
                              <div className="bg-white/5 backdrop-blur-sm p-3 rounded-2xl border border-white/5 flex flex-col items-center text-center">
                                 <Zap className="w-3.5 h-3.5 text-white/20 mb-2" />
                                 <p className="text-[7px] font-bold text-white/30 uppercase tracking-[0.2em] mb-1">unit mobility</p>
                                 <p className="text-[10px] font-black text-white lowercase italic">{slot.shelves?.is_movable ? 'movable' : 'fixed'}</p>
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                   
                   {activeBooking && (
                      <div className="space-y-4 pt-4 border-t border-gray-50 px-2">
                        <div className="flex justify-between items-center group">
                           <div className="flex items-center gap-2 text-gray-400 group-hover:text-gray-600 transition-colors">
                              <Calendar className="w-3 h-3" />
                              <span className="text-[10px] font-bold uppercase tracking-wide">subscription start</span>
                           </div>
                           <span className="text-xs font-black text-[#010307] italic">{new Date(activeBooking.start_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center group">
                           <div className="flex items-center gap-2 text-red-400 group-hover:text-red-500 transition-colors">
                              <Clock className="w-3 h-3" />
                              <span className="text-[10px] font-bold uppercase tracking-wide">auto-renewal date</span>
                           </div>
                           <span className="text-xs font-black text-red-600 italic">{new Date(activeBooking.end_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                   )}
                   
                   <div className="bg-[#FE7F2D]/5 p-4 rounded-2xl border border-[#FE7F2D]/10">
                      <p className="text-[10px] font-bold text-[#FE7F2D] lowercase tracking-tight italic">
                         territorial assignment is live. use the products tab to stock your allotted units.
                      </p>
                   </div>
                </div>
              ) : activeBooking ? (
                <div className="space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">shelf level</p>
                         <p className="font-black text-[#010307] lowercase italic">{activeBooking.shelf_type.replace('_', ' ')}</p>
                      </div>
                      <div className="p-4 bg-[#FE7F2D]/5 rounded-2xl border border-[#FE7F2D]/10">
                         <p className="text-[9px] font-bold text-[#FE7F2D]/60 uppercase tracking-widest mb-1">slot</p>
                         <p className="font-black text-[#FE7F2D] text-xl leading-none italic">#{activeBooking.slot_number}</p>
                      </div>
                   </div>
                   <div className="space-y-4 pt-4 border-t border-gray-50">
                      <div className="flex justify-between items-center">
                         <div className="flex items-center gap-2 text-gray-400">
                            <Calendar className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-wide">start date</span>
                         </div>
                         <span className="text-xs font-black text-[#010307] italic">{new Date(activeBooking.start_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                         <div className="flex items-center gap-2 text-red-400">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-bold uppercase tracking-wide">expires at</span>
                         </div>
                         <span className="text-xs font-black text-red-600 italic">{new Date(activeBooking.end_date).toLocaleDateString()}</span>
                      </div>
                   </div>
                   <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                      <p className="text-[10px] font-bold text-blue-600 lowercase tracking-tight italic">
                         Your territorial rights are active. Contact support 14 days before expiration for renewal options.
                      </p>
                   </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-4">
                   <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto">
                      <LayoutGrid className="w-6 h-6" />
                   </div>
                   <p className="text-gray-400 font-bold lowercase italic text-xs max-w-[200px] mx-auto leading-relaxed">territory not yet synchronized. finalize onboarding to claim your slot.</p>
                </div>
              )}
           </CardContent>
        </Card>

        {/* Low Stock Watchlist */}
        <Card className="border border-black/5 shadow-sm rounded-[2rem] bg-white overflow-hidden p-0">
           <CardHeader className="p-8 pb-4 border-b border-[#010307]/5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black tracking-tighter lowercase italic flex items-center gap-3">
                  watchlist
                </CardTitle>
                <p className="text-[10px] font-bold lowercase text-[#010307]/30 tracking-widest mt-1">inventory alerts</p>
              </div>
              <Badge variant="outline" className="rounded-full border-[#010307]/5 text-[#010307]/30 font-bold px-4">{lowStockProducts.length}</Badge>
           </CardHeader>
           <CardContent className="p-0">
              {lowStockProducts.length > 0 ? (
                <div className="divide-y divide-gray-50 max-h-[350px] overflow-y-auto">
                  {lowStockProducts.map(p => (
                    <div key={p.id} className="p-6 flex items-center justify-between hover:bg-red-50/20 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border-2 border-dashed border-gray-100 group-hover:border-red-100 transition-colors">
                           {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full rounded-xl object-cover" />
                           ) : (
                              <Package className="w-5 h-5 text-gray-300" />
                           )}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-900 tracking-tight lowercase">{p.name}</p>
                          <p className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">Stock Alert</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-red-600 text-xl leading-none italic">{p.stock_quantity}</p>
                        <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Left</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-24 text-center space-y-4">
                   <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto">
                      <Package className="w-7 h-7" />
                   </div>
                   <p className="text-gray-400 font-bold lowercase italic text-xs tracking-wide">catalog is synchronized.</p>
                </div>
              )}
           </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border border-black/5 shadow-sm rounded-[2rem] bg-white overflow-hidden p-0">
           <CardHeader className="p-8 pb-4 border-b border-[#010307]/5">
              <CardTitle className="text-xl font-black tracking-tighter lowercase italic flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-500" />
                quick actions
              </CardTitle>
              <p className="text-[10px] font-bold lowercase text-[#010307]/30 tracking-widest mt-1">direct system signals</p>
           </CardHeader>
           <CardContent className="p-8 space-y-4">
              <div className="grid grid-cols-1 gap-3">
                 <button className="flex items-center justify-between p-4 bg-gray-50 hover:bg-black hover:text-white rounded-2xl border border-gray-100 transition-all group active:scale-95 text-left">
                    <div className="flex items-center gap-4">
                       <Plus className="w-4 h-4 text-[#FE7F2D]" />
                       <span className="text-xs font-black lowercase italic tracking-tight">launch new item</span>
                    </div>
                    <ArrowUpRight className="w-3 h-3 text-gray-300 group-hover:text-white" />
                 </button>
                 <button className="flex items-center justify-between p-4 bg-gray-50 hover:bg-black hover:text-white rounded-2xl border border-gray-100 transition-all group active:scale-95 text-left">
                    <div className="flex items-center gap-4">
                       <UserCircle className="w-4 h-4 text-[#FE7F2D]" />
                       <span className="text-xs font-black lowercase italic tracking-tight">update profiles</span>
                    </div>
                    <ArrowUpRight className="w-3 h-3 text-gray-300 group-hover:text-white" />
                 </button>
                 <button className="flex items-center justify-between p-4 bg-gray-50 hover:bg-black hover:text-white rounded-2xl border border-gray-100 transition-all group active:scale-95 text-left">
                    <div className="flex items-center gap-4">
                       <MessageSquare className="w-4 h-4 text-[#FE7F2D]" />
                       <span className="text-xs font-black lowercase italic tracking-tight">signal inbox</span>
                    </div>
                    <ArrowUpRight className="w-3 h-3 text-gray-300 group-hover:text-white" />
                 </button>
                 <button className="flex items-center justify-between p-4 bg-orange-50 hover:bg-[#FE7F2D] hover:text-white rounded-2xl border border-[#FE7F2D]/10 transition-all group active:scale-95 text-left">
                    <div className="flex items-center gap-4">
                       <DollarSign className="w-4 h-4 text-[#FE7F2D] group-hover:text-white" />
                       <span className="text-xs font-black lowercase italic tracking-tight">payout request</span>
                    </div>
                    <ArrowUpRight className="w-3 h-3 text-[#FE7F2D]/40 group-hover:text-white" />
                 </button>
              </div>
           </CardContent>
        </Card>
      </div>

      {/* Connection Indicator */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border border-[#010307]/5 text-[11px] font-bold lowercase tracking-widest text-[#010307]/20 italic">
         <ArrowUpRight className="w-4 h-4 text-[#FE7F2D]" /> telemetry link active • kathmandu outlet 01.
      </div>
    </div>
  )
}
