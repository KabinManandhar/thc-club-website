"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  ArrowDownLeft, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  FileText,
  ShieldCheck,
  TrendingDown,
} from "lucide-react"
import { toast } from "sonner"

interface BrandPayoutsProps {
  brandId: string
}

export function BrandPayouts({ brandId }: BrandPayoutsProps) {
  const [payouts, setPayouts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalPayout: 0, pendingPayout: 0, lastAmount: 0 })

  useEffect(() => {
    fetchPayouts()
  }, [brandId])

  const fetchPayouts = async () => {
    setLoading(true)
    const { data: payoutsData } = await supabase
      .from("invoices")
      .select("*")
      .eq("brand_id", brandId)
    
    const total = payoutsData?.reduce((sum, p) => sum + (p.net_amount || 0), 0) || 0
    const last = payoutsData?.[0]?.net_amount || 0
    
    setStats({ totalPayout: total, pendingPayout: total * 0.1, lastAmount: last })
    setPayouts(payoutsData || [])
    setLoading(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-50 text-green-700 border-none font-bold lowercase text-[10px] px-3 py-1 tracking-wide rounded-full">settled</Badge>
      case "pending":
        return <Badge className="bg-[#FE7F2D]/10 text-[#FE7F2D] border-none font-bold lowercase text-[10px] px-3 py-1 tracking-wide rounded-full">processing</Badge>
      default:
        return <Badge className="bg-[#010307]/5 text-[#010307]/40 border-none font-bold lowercase text-[10px] px-3 py-1 tracking-wide rounded-full">{status}</Badge>
    }
  }

  return (
    <div className="space-y-12 pb-24 text-[#010307]">
      <div className="grid md:grid-cols-3 gap-8">
         <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-2xl bg-white p-8 group transition-all">
            <div className="flex justify-between items-start mb-6">
               <div className="w-12 h-12 bg-[#FE7F2D] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                  <DollarSign className="w-5 h-5" />
               </div>
               <Badge className="bg-[#FE7F2D]/5 text-[#FE7F2D] border-none font-bold lowercase text-[10px] px-3 tracking-wide">net revenue</Badge>
            </div>
            <p className="text-[11px] font-bold lowercase text-[#010307]/30 tracking-widest mb-2 italic">lifetime settlements</p>
            <h3 className="text-3xl font-black text-[#010307] tracking-tighter italic">npr {stats.totalPayout.toLocaleString()}</h3>
         </Card>

         <Card className="border border-black/5 shadow-sm rounded-2xl bg-white p-8 group transition-all">
            <div className="flex justify-between items-start mb-6">
               <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-black">
                  <Clock className="w-5 h-5" />
               </div>
               <Badge className="bg-gray-50 text-black/50 border-none font-black uppercase text-[8px] px-3 tracking-widest">Pending</Badge>
            </div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 font-mono">Accroing Revenue</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tighter italic">NPR {stats.pendingPayout.toLocaleString()}</h3>
         </Card>

         <Card className="border border-black/5 shadow-sm rounded-2xl bg-white p-8 group transition-all">
            <div className="flex justify-between items-start mb-6">
               <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-black">
                  <ArrowDownLeft className="w-5 h-5" />
               </div>
               <Badge className="bg-gray-50 text-black/50 border-none font-black uppercase text-[8px] px-3 tracking-widest">Latest Cycle</Badge>
            </div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 font-mono">Recent Settlement</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tighter italic">NPR {stats.lastAmount.toLocaleString()}</h3>
         </Card>
      </div>

      <div className="space-y-6">
         <div className="flex items-center justify-between px-2">
          <h3 className="text-2xl font-black tracking-tighter flex items-center gap-4 italic lowercase">
            settlement log
          </h3>
          <Button 
            variant="ghost" 
            className="rounded-xl h-10 px-4 font-bold lowercase text-[11px] tracking-wide text-[#010307]/40 hover:text-[#FE7F2D] hover:bg-[#FE7F2D]/5 transition-all flex items-center gap-2"
            onClick={() => toast.info("statement generation request sent.")}
          >
             <FileText className="w-3 h-3" /> download statement
          </Button>
        </div>

        <Card className="border border-black/5 shadow-sm rounded-2xl bg-white overflow-hidden">
           <div className="p-0">
              <table className="w-full text-left">
                 <thead className="bg-gray-50/50">
                    <tr className="border-none">
                       <th className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Transaction ID</th>
                       <th className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Cycle Date</th>
                       <th className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Total Revenue</th>
                       <th className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Club Fee (10%)</th>
                       <th className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Net Payout</th>
                       <th className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-gray-400 text-right">Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {loading ? (
                       <tr><td colSpan={6} className="text-center py-20 animate-pulse text-gray-300 font-black uppercase tracking-widest text-[10px]">Syncing Accounts...</td></tr>
                    ) : payouts.length === 0 ? (
                       <tr><td colSpan={6} className="text-center py-24 text-gray-300 italic font-medium">No financial transactions recorded for this cycle yet.</td></tr>
                    ) : (
                       payouts.map((p, i) => (
                           <tr key={i} className="hover:bg-[#010307]/5 transition-colors">
                             <td className="px-10 py-8">
                                <span className="font-mono text-xs font-bold text-[#010307]/20 lowercase tracking-tighter">#{p.id.slice(0, 8)}</span>
                             </td>
                             <td className="py-8 font-bold text-sm text-[#010307]/60">
                                {new Date(p.created_at).toLocaleDateString()}
                             </td>
                             <td className="py-8 font-black text-sm text-[#010307]">npr {p.total_amount?.toLocaleString() || "0"}</td>
                             <td className="py-8 font-bold text-sm text-red-400 flex items-center gap-1.5 opacity-60">
                                <TrendingDown className="w-3.5 h-3.5 text-red-300" /> npr {(p.total_amount * 0.1)?.toLocaleString() || "0"}
                             </td>
                             <td className="py-8 font-black text-[#010307] text-lg italic">
                                npr {p.net_amount?.toLocaleString() || "0"}
                             </td>
                             <td className="px-10 py-8 text-right">
                                {getStatusBadge(p.status || "settled")}
                             </td>
                          </tr>
                       ))
                    )}
                 </tbody>
              </table>
           </div>
        </Card>
      </div>

      <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-2xl bg-white p-10 flex flex-col md:flex-row items-center gap-8">
         <div className="w-14 h-14 bg-[#FE7F2D] text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
            <ShieldCheck className="w-7 h-7" />
         </div>
         <div className="space-y-1 flex-1 text-center md:text-left">
            <h4 className="text-xl font-black tracking-tighter lowercase italic">secure settlements</h4>
            <p className="text-[#010307]/40 font-medium text-sm italic leading-relaxed lowercase">all payouts are processed every saturday via digital transfer or cash settlement at the club gate.</p>
         </div>
         <Button 
            variant="outline" 
            className="rounded-2xl border-[#010307]/5 hover:border-[#FE7F2D]/20 h-12 px-8 font-bold lowercase text-[11px] tracking-widest whitespace-nowrap text-[#010307]/60 transition-all"
            onClick={() => toast.info("verification required.")}
          >
            configure accounts
          </Button>
      </Card>
    </div>
  )
}
