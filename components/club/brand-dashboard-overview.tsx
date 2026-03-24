"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  DollarSign, 
  ChevronRight, 
  ArrowUpRight, 
  Zap,
  Activity,
  History,
} from "lucide-react"

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
  const [topProducts, setTopProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [brandId])

  const fetchDashboardData = async () => {
    try {
      const [productsRes, salesRes] = await Promise.all([
        supabase.from("brand_products").select("*").eq("brand_id", brandId),
        supabase.from("brand_sales").select("*").eq("brand_id", brandId)
      ])

      const products = productsRes.data || []
      const sales = salesRes.data || []

      const lowStock = products.filter(p => p.stock_quantity <= (p.low_stock_threshold || 5))
      setLowStockProducts(lowStock)

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
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-2xl bg-white p-8 group transition-all">
          <div className="flex justify-between items-start mb-6">
             <div className="w-12 h-12 bg-[#FE7F2D] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                <DollarSign className="w-5 h-5" />
             </div>
             <Badge className="bg-[#FE7F2D]/5 text-[#FE7F2D] border-none px-3 font-bold lowercase text-[10px] tracking-wide">gross yield</Badge>
          </div>
          <p className="text-[11px] font-bold lowercase text-[#010307]/30 tracking-widest mb-1 italic">total sales</p>
          <h3 className="text-3xl font-black tracking-tighter italic text-[#010307]">npr {stats.totalSales.toLocaleString()}</h3>
        </Card>
 
        <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-2xl bg-white p-8 group transition-all">
          <div className="flex justify-between items-start mb-6">
             <div className="w-12 h-12 bg-[#FE7F2D]/10 rounded-2xl flex items-center justify-center text-[#FE7F2D]">
                <Activity className="w-5 h-5" />
             </div>
             <Badge className="bg-[#010307]/5 text-[#010307]/40 border-none px-3 font-bold lowercase text-[10px] tracking-wide">transactions</Badge>
          </div>
          <p className="text-[11px] font-bold lowercase text-[#010307]/30 tracking-widest mb-1 italic">sales count</p>
          <h3 className="text-3xl font-black text-[#010307] tracking-tighter italic">{stats.totalOrders}</h3>
        </Card>
 
        <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-2xl bg-white p-8 group transition-all">
          <div className="flex justify-between items-start mb-6">
             <div className="w-12 h-12 bg-[#FE7F2D]/10 rounded-2xl flex items-center justify-center text-[#FE7F2D]">
                <Package className="w-5 h-5" />
             </div>
             <Badge className="bg-[#010307]/5 text-[#010307]/40 border-none px-3 font-bold lowercase text-[10px] tracking-wide">inventory</Badge>
          </div>
          <p className="text-[11px] font-bold lowercase text-[#010307]/30 tracking-widest mb-1 italic">active products</p>
          <h3 className="text-3xl font-black text-[#010307] tracking-tighter italic">{stats.activeProducts}</h3>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Low Stock Watchlist */}
        <Card className="border border-black/5 shadow-sm rounded-[2rem] bg-white overflow-hidden p-0">
           <CardHeader className="p-8 pb-4 border-b border-[#010307]/5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black tracking-tighter lowercase italic flex items-center gap-3">
                  watchlist
                </CardTitle>
                <p className="text-[10px] font-bold lowercase text-[#010307]/30 tracking-widest mt-1">actions required</p>
              </div>
              <Badge variant="outline" className="rounded-full border-[#010307]/5 text-[#010307]/30 font-bold px-4">{lowStockProducts.length}</Badge>
           </CardHeader>
           <CardContent className="p-0">
             {lowStockProducts.length > 0 ? (
               <div className="divide-y divide-gray-50">
                 {lowStockProducts.map(p => (
                   <div key={p.id} className="p-8 flex items-center justify-between hover:bg-red-50/20 transition-all group">
                     <div className="flex items-center gap-5">
                       <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center border-2 border-dashed border-gray-100 group-hover:border-red-200 transition-colors">
                          {p.image_url ? (
                             <img src={p.image_url} alt={p.name} className="w-full h-full rounded-2xl object-cover" />
                          ) : (
                             <Package className="w-6 h-6 text-gray-300" />
                          )}
                       </div>
                       <div>
                         <p className="font-black text-lg text-gray-900 tracking-tight">{p.name}</p>
                         <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">{p.sku || "UNASSIGNED"}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="font-black text-red-600 text-2xl leading-none italic">{p.stock_quantity}</p>
                       <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Remaining</p>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto">
                     <Package className="w-8 h-8" />
                  </div>
                  <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Inventory is synchronized and sufficient.</p>
               </div>
             )}
           </CardContent>
        </Card>

        {/* High Velocity Products */}
        <Card className="border border-black/5 shadow-sm rounded-[2rem] bg-white overflow-hidden p-0">
           <CardHeader className="p-8 pb-4 border-b border-black/5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black tracking-tighter uppercase italic flex items-center gap-3">
                  Velocity
                </CardTitle>
                <p className="text-[10px] font-black uppercase text-black/30 tracking-widest mt-1">Performance Metrics</p>
              </div>
           </CardHeader>
           <CardContent className="p-0">
             {topProducts.length > 0 ? (
               <div className="divide-y divide-gray-50">
                 {topProducts.map(p => (
                   <div key={p.id} className="p-8 flex items-center justify-between hover:bg-[#FE7F2D]/5 transition-all group">
                     <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center border-2 border-gray-50 group-hover:border-orange-100 transition-colors">
                           {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full rounded-2xl object-cover" />
                           ) : (
                              <Package className="w-6 h-6 text-gray-300" />
                           )}
                        </div>
                       <div>
                         <p className="font-black text-lg text-gray-900 tracking-tight">{p.name}</p>
                         <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">Rank #{topProducts.indexOf(p) + 1}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="font-black text-[#FE7F2D] text-2xl leading-none italic">{p.sold}</p>
                       <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Units Moved</p>
                     </div>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="p-20 text-center space-y-4">
                  <History className="w-12 h-12 text-gray-100 mx-auto" />
                  <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Accumulating velocity data...</p>
               </div>
             )}
           </CardContent>
        </Card>
      </div>

      {/* Club Footer Message */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border border-[#010307]/5 text-[11px] font-bold lowercase tracking-widest text-[#010307]/20 italic">
         <ArrowUpRight className="w-4 h-4 text-[#FE7F2D]" /> real-time data from kathmandu gate 01 active.
      </div>
    </div>
  )
}
