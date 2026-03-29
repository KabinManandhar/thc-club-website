"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase, type BrandSettlement, type Invoice } from "@/lib/supabase"
import { AlertCircle, CircleDollarSign, FileText, Printer, RefreshCw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

interface Props {
   brandId: string
   isAdmin?: boolean
}

export function SimplifiedPayoutTracker({ brandId, isAdmin = false }: Props) {
   const [activeTab, setActiveTab] = useState("current")
   const [currentInvoices, setCurrentInvoices] = useState<Invoice[]>([])
   const [settlements, setSettlements] = useState<BrandSettlement[]>([])
   const [brand, setBrand] = useState<any>(null)
   const [loading, setLoading] = useState(true)
   const [processingId, setProcessingId] = useState<string | null>(null)
   const [selectedSettlement, setSelectedSettlement] = useState<BrandSettlement | null>(null)
   const [settlementInvoices, setSettlementInvoices] = useState<any[]>([])
   const [isFetchingInvoices, setIsFetchingInvoices] = useState(false)

   const printRef = useRef<HTMLDivElement>(null)

   const currentDate = new Date()
   const currentMonth = currentDate.getMonth() + 1
   const currentYear = currentDate.getFullYear()

   useEffect(() => {
      if (brandId) {
         fetchPayoutData()
         fetchBrandDetails()
      }
   }, [brandId])

   const fetchBrandDetails = async () => {
      const { data } = await supabase.from("brands").select("*").eq("id", brandId).single()
      setBrand(data)
   }

   const fetchPayoutData = async () => {
      setLoading(true)

      // 1. Fetch current month's paid invoices to show live un-settled estimate
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString()
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString()

      const { data: invData } = await supabase
         .from("invoices")
         .select("*, invoice_line_items(*)")
         .eq("brand_id", brandId)
         .eq("status", "paid")
         .gte("created_at", startOfMonth)
         .lte("created_at", endOfMonth)
         .order("created_at", { ascending: false })

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
         const { error } = await supabase.rpc("generate_monthly_payouts", {
            p_month: currentMonth,
            p_year: currentYear
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
      } catch (err: any) {
         toast.error(err.message || "Failed to update status")
      } finally {
         setProcessingId(null)
      }
   }

   const fetchSettlementInvoices = async (settle: BrandSettlement) => {
      setSelectedSettlement(settle)
      setIsFetchingInvoices(true)
      try {
         const start = new Date(settle.period_year, settle.period_month - 1, 1).toISOString()
         const end = new Date(settle.period_year, settle.period_month, 0, 23, 59, 59).toISOString()

         const { data, error } = await supabase
            .from("invoices")
            .select("*, invoice_line_items(*)")
            .eq("brand_id", brandId)
            .eq("status", "paid")
            .gte("created_at", start)
            .lte("created_at", end)
            .order("created_at", { ascending: true })

         if (error) throw error
         setSettlementInvoices(data || [])
      } catch (err: any) {
         toast.error("Failed to load invoice details")
         console.error(err)
      } finally {
         setIsFetchingInvoices(false)
      }
   }

   const handlePrint = () => {
      const content = printRef.current;
      if (!content) return;

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      printWindow.document.write(`
         <html>
            <head>
               <title>Payout Statement - ${brand?.business_name}</title>
               <script src="https://cdn.tailwindcss.com"></script>
               <style>
                  @media print {
                     .no-print { display: none; }
                  }
                  body { font-family: Inter, sans-serif; }
               </style>
            </head>
            <body class="p-8">
               ${content.innerHTML}
               <script>
                  window.onload = () => {
                     window.print();
                     window.close();
                  };
               </script>
            </body>
         </html>
      `);
      printWindow.document.close();
   }

   // Calculations for current month view
   let currentMonthGross = 0;
   let currentMonthPPF = 0;
   currentInvoices.forEach(i => {
      currentMonthGross += (i.total_amount || 0)
      currentMonthPPF += (i.ppf_amount || 0)
   })
   const currentNetOwed = currentMonthGross - currentMonthPPF
   const totalPaidToDate = settlements
      .filter(s => s.status === 'paid')
      .reduce((sum, s) => sum + Number(s.net_payout || 0), 0)

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
               <TabsTrigger value="payouts" className="data-[state=active]:border-black data-[state=active]:border-b-2 bg-transparent border-transparent rounded-none px-0 pb-3 font-black uppercase tracking-[0.2em] text-[10px]">
                  Payouts Made
               </TabsTrigger>
               <TabsTrigger value="history" className="data-[state=active]:border-black data-[state=active]:border-b-2 bg-transparent border-transparent rounded-none px-0 pb-3 font-black uppercase tracking-[0.2em] text-[10px]">
                  Settlement History
               </TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-6 mt-0 outline-none">
               <div className="grid lg:grid-cols-1 gap-6">
                  <Card className="p-8 rounded-[2.5rem] border border-gray-100 shadow-sm bg-black text-white relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>

                     <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">Live Month Estimates</p>
                           <h4 className="font-black text-4xl italic lowercase tracking-tighter">NPR {currentNetOwed.toLocaleString()}</h4>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
                           <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-1">Gross Sales</p>
                              <p className="font-black">NPR {currentMonthGross.toLocaleString()}</p>
                           </div>
                           <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-[#FE7F2D] mb-1">PPF Deducted</p>
                              <p className="font-black text-[#FE7F2D]">- NPR {currentMonthPPF.toLocaleString()}</p>
                           </div>
                           <div className="bg-white/5 border border-white/5 p-4 rounded-2xl lg:col-span-1 col-span-2">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-green-400 mb-1">Payouts Made</p>
                              <p className="font-black text-green-400">NPR {totalPaidToDate.toLocaleString()}</p>
                           </div>
                        </div>
                     </div>
                  </Card>
               </div>
            </TabsContent>

            <TabsContent value="payouts" className="mt-0 outline-none space-y-4">
               {settlements.filter(s => s.status === 'paid').length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/50">
                     <CircleDollarSign className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                     <p className="text-sm font-black uppercase tracking-widest text-gray-300">No Payouts Made Yet</p>
                  </div>
               ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                     {settlements.filter(s => s.status === 'paid').map(settle => {
                        const monthName = new Date(settle.period_year, settle.period_month - 1).toLocaleString('default', { month: 'long' })
                        return (
                           <Card key={settle.id} className="border-gray-100 rounded-3xl p-6 shadow-sm hover:border-black/10 transition-colors">
                              <div className="flex justify-between items-start mb-6">
                                 <div>
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">{settle.period_year}</p>
                                    <h4 className="font-black text-2xl italic lowercase tracking-tight">{monthName}</h4>
                                 </div>
                                 <Badge className="bg-green-50 text-green-700 border-green-200 font-black uppercase text-[9px] tracking-widest rounded-full px-3 py-1 border">
                                    PAID
                                 </Badge>
                              </div>

                              <div className="space-y-3">
                                 <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">Amount</span>
                                    <span className="font-black text-lg italic text-gray-900">NPR {settle.net_payout.toLocaleString()}</span>
                                 </div>
                                 {settle.paid_at && (
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mt-4 leading-relaxed">
                                       <span className="block text-gray-300">Received Date</span>
                                       {new Date(settle.paid_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                 )}
                                 <Button
                                    onClick={() => fetchSettlementInvoices(settle)}
                                    variant="outline"
                                    className="w-full mt-4 h-9 rounded-xl font-black uppercase tracking-widest text-[9px] border-gray-100 hover:bg-gray-50 flex items-center justify-center gap-2"
                                 >
                                    <Printer className="w-3.5 h-3.5" />
                                    Payout Statement
                                 </Button>
                              </div>
                           </Card>
                        )
                     })}
                  </div>
               )}
            </TabsContent>

            <TabsContent value="history" className="mt-0 outline-none space-y-4">
               {settlements.filter(s => s.period_month !== currentMonth || s.period_year !== currentYear || s.status !== 'pending').length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/50">
                     <FileText className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                     <p className="text-sm font-black uppercase tracking-widest text-gray-300">No Settlement Records</p>
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
                                 <Badge className={`font-black uppercase text-[9px] tracking-widest rounded-full px-3 py-1 border ${settle.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
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

                              <Button
                                 onClick={() => fetchSettlementInvoices(settle)}
                                 variant="ghost"
                                 className="w-full mt-4 h-9 rounded-xl font-black uppercase tracking-widest text-[9px] text-gray-400 hover:text-gray-900 flex items-center justify-center gap-2"
                              >
                                 <Printer className="w-3.5 h-3.5" />
                                 View Statement
                              </Button>

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

         <Dialog open={!!selectedSettlement} onOpenChange={(open) => !open && setSelectedSettlement(null)}>
            <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl rounded-3xl">
               <DialogHeader className="sr-only">
                  <DialogTitle>Payout Statement - {selectedSettlement && new Date(selectedSettlement.period_year, selectedSettlement.period_month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</DialogTitle>
                  <DialogDescription>Formal financial breakdown for this period</DialogDescription>
               </DialogHeader>

               <ScrollArea className="flex-1">
                  <div ref={printRef} className="p-12 space-y-10">
                     {/* Statement Header */}
                     <div className="flex justify-between items-end border-b-2 border-gray-900 pb-8">
                        <div>
                           <div className="text-4xl font-black italic tracking-tighter text-gray-900">THC Club</div>
                           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mt-1">Internal thc club Control</p>
                        </div>
                        <div className="text-right">
                           <div className="text-sm font-black uppercase tracking-[0.2em] text-[#FE7F2D] mb-1">Payout Statement</div>
                           <p className="text-xs font-bold tabular-nums text-gray-900">Ref: #{selectedSettlement?.id.slice(0, 8).toUpperCase()}</p>
                           <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
                              {selectedSettlement?.paid_at ? new Date(selectedSettlement.paid_at).toLocaleDateString('en-NP', { day: '2-digit', month: 'short', year: 'numeric' }) : 'PENDING SETTLEMENT'}
                           </p>
                        </div>
                     </div>

                     {/* Entity Info */}
                     <div className="grid grid-cols-2 gap-16">
                        <div className="space-y-6">
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Beneficiary Brand</p>
                              <p className="text-xl font-black italic text-gray-900 lowercase">{brand?.business_name}</p>
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Cycle Period</p>
                              <p className="text-lg font-bold text-gray-900 tabular-nums">
                                 {selectedSettlement && new Date(selectedSettlement.period_year, selectedSettlement.period_month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                              </p>
                           </div>
                        </div>
                        <div className="space-y-6 text-right sm:text-left">
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Disbursement Profile</p>
                              <div className="text-sm font-bold text-gray-600 italic">
                                 {brand?.bank_account_details?.type === 'cash' ? (
                                    "Physical Cash Settlement"
                                 ) : brand?.bank_account_details?.type === 'wallet' ? (
                                    `${brand.bank_account_details.walletProvider} • ${brand.bank_account_details.walletNumber}`
                                 ) : brand?.bank_account_details?.bankName ? (
                                    `${brand.bank_account_details.bankName} • ${brand.bank_account_details.accountNumber}`
                                 ) : (
                                    "manual settlement (verify records)"
                                 )}
                              </div>
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Settlement Status</p>
                              <p className={`text-sm font-black italic uppercase tracking-widest ${selectedSettlement?.status === 'paid' ? 'text-green-600' : 'text-orange-500'}`}>
                                 {selectedSettlement?.status === 'paid' ? `Settled on ${new Date(selectedSettlement.paid_at!).toLocaleDateString()}` : 'Processing Payout'}
                              </p>
                           </div>
                        </div>
                     </div>

                     {/* Transaction Table */}
                     <div className="space-y-4">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 pb-3">Detailed Transaction Breakdown</h4>
                        <div className="overflow-hidden border border-gray-100 rounded-2xl">
                           <table className="w-full text-left border-collapse">
                              <thead className="bg-gray-50/50">
                                 <tr>
                                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Date / Ref</th>
                                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Items Detail</th>
                                    <th className="py-4 px-6 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Gross (NPR)</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                 {isFetchingInvoices ? (
                                    <tr>
                                       <td colSpan={3} className="py-20 text-center">
                                          <RefreshCw className="w-6 h-6 mx-auto text-gray-200 animate-spin" />
                                       </td>
                                    </tr>
                                 ) : settlementInvoices.length === 0 ? (
                                    <tr>
                                       <td colSpan={3} className="py-12 text-center text-xs italic text-gray-400">No records found</td>
                                    </tr>
                                 ) : (
                                    settlementInvoices.map((inv) => (
                                       <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                          <td className="py-4 px-6 align-top">
                                             <p className="font-bold text-gray-900 text-xs tabular-nums">#{inv.invoice_number}</p>
                                             <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">{new Date(inv.created_at).toLocaleDateString()}</p>
                                          </td>
                                          <td className="py-4 px-6 align-top">
                                             <div className="space-y-1">
                                                {inv.invoice_line_items?.map((item: any, idx: number) => (
                                                   <p key={idx} className="text-[10px] text-gray-600 flex gap-2">
                                                      <span className="font-black text-gray-400">{item.quantity}x</span>
                                                      <span className="truncate max-w-[240px]">{item.product_name}</span>
                                                   </p>
                                                ))}
                                             </div>
                                          </td>
                                          <td className="py-4 px-6 align-top text-right font-bold tabular-nums text-xs text-gray-900">
                                             {inv.total_amount?.toLocaleString()}
                                          </td>
                                       </tr>
                                    ))
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </div>

                     {/* Final Calculation Table */}
                     <div className="pt-8 border-t-2 border-gray-100">
                        <div className="space-y-4 max-w-md ml-auto">
                           <div className="flex justify-between items-center text-sm">
                              <span className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">Total Aggregated Sales</span>
                              <span className="font-bold tabular-nums text-gray-900">NPR {selectedSettlement?.total_sales.toLocaleString()}</span>
                           </div>
                           <div className="flex justify-between items-center text-sm">
                              <span className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">Platform processing fee (ppf)</span>
                              <span className="font-bold tabular-nums text-red-500">−NPR {selectedSettlement?.ppf_deduction.toLocaleString()}</span>
                           </div>

                           {selectedSettlement?.admin_notes && (
                              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50 mb-4">
                                 <p className="text-[10px] font-bold text-amber-700/60 uppercase tracking-widest mb-1">thc club Note</p>
                                 <p className="text-xs italic text-amber-800">{selectedSettlement.admin_notes}</p>
                              </div>
                           )}

                           <div className="mt-6 pt-6 border-t-2 border-gray-900 flex justify-between items-center">
                              <span className="text-xl font-black italic lowercase tracking-tight">Net Payout Amount</span>
                              <span className="text-2xl font-black italic text-[#FE7F2D] tabular-nums">NPR {selectedSettlement?.net_payout.toLocaleString()}</span>
                           </div>
                        </div>
                     </div>

                     <div className="text-center pt-16">
                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-200">
                           this is a computer generated electronic ledger record. no signature required.
                        </p>
                     </div>
                  </div>
               </ScrollArea>

               <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-4 no-print">
                  <Button
                     onClick={handlePrint}
                     variant="outline"
                     className="h-12 border-gray-200 rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 hover:bg-white flex items-center gap-2"
                  >
                     <Printer className="w-4 h-4" />
                     Download PDF
                  </Button>
                  <Button
                     onClick={() => setSelectedSettlement(null)}
                     className="bg-black text-white hover:bg-gray-800 font-black uppercase text-[10px] tracking-widest px-8 h-12 rounded-2xl shadow-lg"
                  >
                     Close Ledger
                  </Button>
               </div>
            </DialogContent>
         </Dialog>
      </div>
   )
}
