"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import {
    Activity,
    DollarSign,
    Package,
    BarChart3,
    TrendingUp,
    Search,
    Filter,
} from "lucide-react"
import { useEffect, useState } from "react"

interface BrandSalesReportProps {
  brandId: string
}

export function BrandSalesReport({ brandId }: BrandSalesReportProps) {
  const [loading, setLoading] = useState(true)
  const [productSales, setProductSales] = useState<any[]>([])
  const [totalGross, setTotalGross] = useState(0)
  const [totalQuantity, setTotalQuantity] = useState(0)

  useEffect(() => {
    fetchSalesReport()
  }, [brandId])

  const fetchSalesReport = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .rpc("get_product_performance_secure", { p_brand_id: brandId })

      if (error) {
         console.warn("RPC get_product_performance_secure failed:", error)
         const { data: products } = await supabase.from("brand_products").select("*").eq("brand_id", brandId)
         setProductSales(products?.map(p => ({ ...p, sold: 0, revenue: 0 })) || [])
         return
      }

      if (data) {
        setProductSales(data)
        setTotalGross(data.reduce((sum: number, p: any) => sum + (p.revenue || 0), 0))
        setTotalQuantity(data.reduce((sum: number, p: any) => sum + (p.sold || 0), 0))
      }
    } catch (err) {
      console.error("Sales report error:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
        <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1,2,3].map(i => <Card key={i} className="animate-pulse h-32 rounded-2xl bg-white border-none shadow-sm"></Card>)}
            </div>
            <Card className="animate-pulse h-[600px] rounded-[3rem] bg-white border-none shadow-sm"></Card>
        </div>
    )
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div>
            <h2 className="text-4xl font-black tracking-tighter lowercase italic text-[#010307]">sales report</h2>
            <p className="text-[#010307]/40 font-medium italic lowercase">comprehensive product performance analytics</p>
         </div>
         <Badge className="bg-[#FE7F2D]/10 text-[#FE7F2D] border-none px-4 py-2 rounded-xl font-bold lowercase italic text-xs">
            last sync: {new Date().toLocaleTimeString()}
         </Badge>
      </div>

      {/* High Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-2xl bg-white p-8 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#FE7F2D]/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10 space-y-4">
               <div className="w-12 h-12 bg-[#FE7F2D] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                  <DollarSign className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-[10px] font-bold lowercase text-[#010307]/30 tracking-widest italic mb-1">accumulated revenue</p>
                  <h3 className="text-3xl font-black tracking-tighter italic text-[#010307]">npr {totalGross.toLocaleString()}</h3>
               </div>
            </div>
         </Card>

         <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-2xl bg-white p-8 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#FE7F2D]/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10 space-y-4">
               <div className="w-12 h-12 bg-[#FE7F2D]/10 rounded-2xl flex items-center justify-center text-[#FE7F2D]">
                  <TrendingUp className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-[10px] font-bold lowercase text-[#010307]/30 tracking-widest italic mb-1">units distributed</p>
                  <h3 className="text-3xl font-black tracking-tighter italic text-[#010307]">{totalQuantity.toLocaleString()} items</h3>
               </div>
            </div>
         </Card>

         <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-2xl bg-white p-8 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#FE7F2D]/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
            <div className="relative z-10 space-y-4">
               <div className="w-12 h-12 bg-[#FE7F2D]/10 rounded-2xl flex items-center justify-center text-[#FE7F2D]">
                  <Package className="w-6 h-6" />
               </div>
               <div>
                  <p className="text-[10px] font-bold lowercase text-[#010307]/30 tracking-widest italic mb-1">active catalog</p>
                  <h3 className="text-3xl font-black tracking-tighter italic text-[#010307]">{productSales.length} products</h3>
               </div>
            </div>
         </Card>
      </div>

      {/* Detailed Product Sales Table */}
      <Card className="border border-black/5 shadow-sm rounded-[2.5rem] bg-white overflow-hidden p-0">
         <CardHeader className="p-10 pb-6 border-b border-[#010307]/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
               <CardTitle className="text-2xl font-black tracking-tighter lowercase italic flex items-center gap-3 text-[#010307]">
                  <Activity className="w-6 h-6 text-[#FE7F2D]" />
                  sales by product
               </CardTitle>
               <p className="text-xs font-bold lowercase text-[#010307]/30 tracking-widest italic">granular performance ledger</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#010307]/20" />
                  <input 
                    type="text" 
                    placeholder="search products..." 
                    className="pl-11 pr-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold placeholder:text-[#010307]/20 focus:outline-none focus:ring-2 focus:ring-[#FE7F2D]/20 transition-all w-64"
                  />
               </div>
               <button className="p-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-[#010307] hover:text-white transition-all">
                  <Filter className="w-4 h-4" />
               </button>
            </div>
         </CardHeader>
         <CardContent className="p-0">
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-[#010307]/30">item identity</th>
                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-[#010307]/30 text-center">volume</th>
                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-[#010307]/30 text-center">price point</th>
                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-[#010307]/30 text-right">total revenue</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {productSales.length > 0 ? (
                        productSales.map((p) => (
                           <tr key={p.id} className="group hover:bg-orange-50/10 transition-colors">
                              <td className="px-10 py-8">
                                 <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 overflow-hidden group-hover:border-[#FE7F2D]/20 transition-colors">
                                       {p.image_url ? (
                                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                       ) : (
                                          <Package className="w-6 h-6 text-gray-200" />
                                       )}
                                    </div>
                                    <div className="space-y-1">
                                       <p className="font-black text-lg text-[#010307] tracking-tighter lowercase italic">{p.name}</p>
                                       <div className="flex items-center gap-3">
                                          <span className="text-[9px] font-bold text-[#FE7F2D] uppercase tracking-widest bg-[#FE7F2D]/5 px-2 py-0.5 rounded-md">{p.category || 'generic'}</span>
                                          <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">SKU: {p.sku || 'N/A'}</span>
                                       </div>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-10 py-8">
                                 <div className="flex flex-col items-center">
                                    <p className="font-black text-2xl text-[#010307] italic">{p.sold}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">units</p>
                                 </div>
                              </td>
                              <td className="px-10 py-8 text-center text-[#010307]/40 font-bold italic lowercase text-sm">
                                 npr {p.price?.toLocaleString()}
                              </td>
                              <td className="px-10 py-8">
                                 <div className="flex flex-col items-end">
                                    <p className="font-black text-2xl text-[#FE7F2D] italic tabular-nums">npr {p.revenue?.toLocaleString()}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-[#FE7F2D] transition-colors italic">revenue stream</p>
                                 </div>
                              </td>
                           </tr>
                        ))
                     ) : (
                        <tr>
                           <td colSpan={4} className="py-32 text-center space-y-4">
                              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto">
                                 <BarChart3 className="w-8 h-8" />
                              </div>
                              <p className="text-gray-400 font-bold lowercase italic text-sm tracking-wide">no product movement detected in current registry.</p>
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </CardContent>
      </Card>

      {/* Footnote */}
      <div className="flex items-center justify-center gap-4 bg-white p-8 rounded-[2rem] border border-[#010307]/5 text-center">
         <div className="relative">
            <div className="absolute inset-0 bg-green-400/20 rounded-full animate-ping"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full relative z-10 border-2 border-white"></div>
         </div>
         <p className="text-[11px] font-bold lowercase tracking-[0.15em] text-[#010307]/30 italic">
            data synchronized with outlet 01 ledger • secure telemetry active • nepalese rupees (NPR)
         </p>
      </div>
    </div>
  )
}
