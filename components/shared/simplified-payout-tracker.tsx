"use client"

import { useState, useEffect } from "react"
import { supabase, type Invoice, type BrandSettlement } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, CheckCircle2, CircleDollarSign, Clock, FileText, LayoutGrid, Package, ArrowRight, AlertCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface Props {
  brandId: string
  isAdmin?: boolean
}

export function SimplifiedPayoutTracker({ brandId, isAdmin = false }: Props) {
  const [activeTab, setActiveTab] = useState("current")
  const [currentInvoices, setCurrentInvoices] = useState<Invoice[]>([])
  const [settlements, setSettlements] = useState<BrandSettlement[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const currentDate = new Date()
  const currentMonth = currentDate.getMonth() + 1
  const currentYear = currentDate.getFullYear()

  useEffect(() => {
    if (brandId) fetchPayoutData()
  }, [brandId])

  const fetchPayoutData = async () => {
    setLoading(true)
    
    // 1. Fetch current month's paid invoices to show live un-settled estimate
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString()
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString()

    const { data: invData } = await supabase
      .from("invoices")
      .select("*")
      .eq("brand_id", brandId)
      .eq("status", "paid")
      .gte("created_at", startOfMonth)
      .lte("created_at", endOfMonth)

    setCurrentInvoices(invData || [])

    // 2. Fetch past formal settlements
    const { data: setRes } = await supabase
      .from("brand_settlements")
      .select("*")
      .eq("brand_id", brandId)
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false })

    setSettlements(setRes || [])
    setLoading(false)
  }

  // Admin Actions
  const handleSyncCurrentMonth = async () => {
     setProcessingId("sync")
     try {
        const { error } = await supabase.rpc("generate_monthly_settlement", { 
           p_brand_id: brandId, 
           p_year: currentYear, 
           p_month: currentMonth 
        })
        if (error) throw error
        toast.success(`Synced settlements for ${currentMonth}/${currentYear}`)
        await fetchPayoutData()
     } catch (err: any) {
        toast.error(err.message || "Failed to sync settlement.")
     } finally {
        setProcessingId(null)
     }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
     setProcessingId(id)
     try {
       const updateData: any = { status: newStatus }
       if (newStatus === "paid") updateData.paid_at = new Date().toISOString()
       
       const { error } = await supabase.from("brand_settlements").update(updateData).eq("id", id)
       if (error) throw error
       
       toast.success(`Settlement marked as ${newStatus}`)
       
       // update local cache immediately
       setSettlements(prev => prev.map(s => s.id === id ? { ...s, ...updateData } : s))
     } catch(err: any){
       toast.error(err.message || "Failed to update status")
     } finally {
       setProcessingId(null)
     }
  }

  // Calculations for current month view
  let currentMonthGross = 0;
  let currentMonthPPF = 0;
  currentInvoices.forEach(i => {
     currentMonthGross += (i.total_amount || 0)
     currentMonthPPF += (i.ppf_amount || 0)
  })
  const currentNetOwed = currentMonthGross - currentMonthPPF

  if (loading) return <div className="animate-pulse h-40 bg-gray-50 rounded-2xl w-full"></div>

  return (
    <div className="space-y-6">
      {/* Tracker Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 p-6 rounded-3xl border border-gray-100">
        <div>
          <h3 className="text-xl font-black lowercase italic tracking-tight text-gray-900 flex items-center gap-2">
             <CircleDollarSign className="w-5 h-5 text-green-600" />
             payout tracker
          </h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
            End of Month Auto-Settlements
          </p>
        </div>
        
        {isAdmin && (
           <Button 
              onClick={handleSyncCurrentMonth} 
              disabled={processingId === "sync"}
              className="bg-black text-white hover:bg-gray-800 font-black uppercase text-[9px] tracking-widest h-10 px-6 rounded-xl"
           >
              {processingId === "sync" ? "Syncing..." : <><RefreshCw className="w-3 h-3 mr-2" /> Wrap/Sync Month</>}
           </Button>
        )}
      </div>

      <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 flex items-start gap-4">
         <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
         <p className="text-[11px] font-bold text-blue-800 uppercase tracking-widest leading-relaxed italic">
            <strong>Payout Protocol:</strong> Platform payouts are initiated on the last week of every month. Cleared funds will hit your registered bank account within 3–5 business days. 
         </p>
      </div>

      <Tabs defaultValue="current" value={activeTab} onValueChange={setActiveTab} className="w-full">
         <TabsList className="bg-transparent border-b border-gray-100 rounded-none w-full justify-start h-auto p-0 mb-6 gap-8">
            <TabsTrigger value="current" className="data-[state=active]:border-black data-[state=active]:border-b-2 bg-transparent border-transparent rounded-none px-0 pb-3 font-black uppercase tracking-[0.2em] text-[10px]">
               Current Cycle ({new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'short' })})
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:border-black data-[state=active]:border-b-2 bg-transparent border-transparent rounded-none px-0 pb-3 font-black uppercase tracking-[0.2em] text-[10px]">
               Previous Settlements
            </TabsTrigger>
         </TabsList>

         <TabsContent value="current" className="space-y-6 mt-0 outline-none">
            <div className="grid lg:grid-cols-3 gap-6">
               <Card className="col-span-1 lg:col-span-2 p-8 rounded-[2.5rem] border border-gray-100 shadow-sm bg-black text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>
                  
                  <div className="relative z-10 flex flex-col h-full justify-between">
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">Live Month Estimates</p>
                        <h4 className="font-black text-4xl italic lowercase tracking-tighter">NPR {currentNetOwed.toLocaleString()}</h4>   
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4 mt-12">
                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                           <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1">Gross Sales</p>
                           <p className="font-black">NPR {currentMonthGross.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                           <p className="text-[9px] font-bold uppercase tracking-widest text-[#FE7F2D] mb-1">PPF Deducted</p>
                           <p className="font-black text-[#FE7F2D]">- NPR {currentMonthPPF.toLocaleString()}</p>
                        </div>
                     </div>
                  </div>
               </Card>

               <div className="bg-gray-50 rounded-[2.5rem] border border-gray-100 p-8 flex flex-col">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6">Recent Item Sales</p>
                  
                  {currentInvoices.length === 0 ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                        <Package className="w-8 h-8 mb-2" />
                        <p className="text-[9px] font-black uppercase tracking-[0.2em]">No invoices yet</p>
                     </div>
                  ) : (
                     <div className="space-y-4 overflow-y-auto max-h-[200px] pr-2">
                        {currentInvoices.slice(0, 10).map(inv => (
                           <div key={inv.id} className="flex items-center justify-between pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                              <div>
                                 <p className="font-bold text-gray-900 leading-none">#{inv.invoice_number}</p>
                                 <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">{new Date(inv.created_at).toLocaleDateString()}</p>
                              </div>
                              <p className="font-black text-gray-900 italic">+ NPR {inv.total_amount?.toLocaleString()}</p>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>
         </TabsContent>

         <TabsContent value="history" className="mt-0 outline-none space-y-4">
            {settlements.filter(s => s.period_month !== currentMonth || s.period_year !== currentYear || s.status !== 'pending').length === 0 ? (
               <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/50">
                 <FileText className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                 <p className="text-sm font-black uppercase tracking-widest text-gray-300">No Past Settlements</p>
               </div>
            ) : (
               <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {settlements.filter(s => s.period_month !== currentMonth || s.period_year !== currentYear || s.status !== 'pending').map(settle => {
                     
                     const monthName = new Date(settle.period_year, settle.period_month - 1).toLocaleString('default', { month: 'long' })
                     
                     return (
                     <Card key={settle.id} className="border-gray-100 rounded-3xl p-6 shadow-sm hover:border-black/10 transition-colors">
                        <div className="flex justify-between items-start mb-6">
                           <div>
                              <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">{settle.period_year}</p>
                              <h4 className="font-black text-2xl italic lowercase tracking-tight">{monthName}</h4>
                           </div>
                           <Badge className={`font-black uppercase text-[9px] tracking-widest rounded-full px-3 py-1 border ${
                              settle.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                              settle.status === 'processing' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                              'bg-gray-100 text-gray-600 border-gray-200'
                           }`}>
                              {settle.status}
                           </Badge>
                        </div>

                        <div className="space-y-3 mb-6">
                           <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                              <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Gross Sales</span>
                              <span className="font-bold">NPR {settle.total_sales.toLocaleString()}</span>
                           </div>
                           <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                              <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">PPF Deduct</span>
                              <span className="font-black text-[#FE7F2D]">- NPR {settle.ppf_deduction.toLocaleString()}</span>
                           </div>
                           <div className="flex justify-between items-center pt-2">
                              <span className="text-xs uppercase font-black tracking-widest text-gray-900">Net Final</span>
                              <span className="font-black text-xl italic text-gray-900">NPR {settle.net_payout.toLocaleString()}</span>
                           </div>
                        </div>

                        {isAdmin && settle.status !== 'paid' && (
                           <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100">
                              {settle.status === 'pending' && (
                                 <Button 
                                    onClick={() => handleUpdateStatus(settle.id, "processing")}
                                    disabled={processingId === settle.id}
                                    variant="outline"
                                    className="w-full h-10 rounded-xl font-black uppercase tracking-widest text-[9px] border-orange-200 text-orange-600 hover:bg-orange-50"
                                 >
                                    Mark as Processing
                                 </Button>
                              )}
                              {settle.status === 'processing' && (
                                 <Button 
                                    onClick={() => handleUpdateStatus(settle.id, "paid")}
                                    disabled={processingId === settle.id}
                                    className="w-full h-10 rounded-xl font-black uppercase tracking-widest text-[9px] bg-green-600 hover:bg-green-700 text-white"
                                 >
                                    Confirm Paid
                                 </Button>
                              )}
                           </div>
                        )}

                        {settle.status === 'paid' && settle.paid_at && (
                           <p className="text-[9px] font-bold uppercase tracking-widest text-green-600/60 mt-4 text-center">
                              Cleared • {new Date(settle.paid_at).toLocaleDateString()}
                           </p>
                        )}
                     </Card>
                     )
                  })}
               </div>
            )}
         </TabsContent>
      </Tabs>
    </div>
  )
}
