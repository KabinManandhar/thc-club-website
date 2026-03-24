"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlayCircle, CheckCircle, Clock, RefreshCcw, DollarSign, Wallet, ArrowUpRight, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function PayoutsTracker() {
  const [payouts, setPayouts] = useState<any[]>([])
  const [liveSales, setLiveSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedPayout, setSelectedPayout] = useState<any>(null)
  const [adjustmentAmount, setAdjustmentAmount] = useState("")
  const [adjustmentReason, setAdjustmentReason] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setIsSyncing(true)
    try {
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()

      // 1. Fetch historical payouts
      const { data: payoutData } = await supabase
        .from("payouts")
        .select("*, brands(business_name, bank_account_details)")
        .order("year", { ascending: false })
        .order("month", { ascending: false })
      
      // 2. Fetch current month live aggregates from brand_sales
      const { data: salesData } = await supabase
        .from("brand_sales")
        .select("*, brands(business_name)")
        .eq("month", currentMonth)
        .eq("year", currentYear)

      setPayouts(payoutData || [])
      setLiveSales(salesData || [])
    } catch (err) {
      console.error("Fetch failed", err)
      toast.error("Failed to sync latest financial data.")
    } finally {
      setLoading(false)
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleGeneratePayouts = async () => {
    setIsGenerating(true)
    try {
      const now = new Date()
      const month = now.getMonth() === 0 ? 12 : now.getMonth();
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

      const { error } = await supabase.rpc('generate_monthly_payouts', {
        p_month: month,
        p_year: year
      })

      if (error) throw error
      toast.success(`Payout ledger for ${month}/${year} synchronized.`)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to generate payouts")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleManualSettlement = async () => {
    if (!selectedPayout) return
    try {
      const finalAmount = adjustmentAmount ? parseFloat(adjustmentAmount) : selectedPayout.net_payout
      
      const { error } = await supabase
        .from("payouts")
        .update({ 
          status: 'paid', 
          paid_at: new Date().toISOString(),
          net_payout: finalAmount,
          admin_notes: adjustmentReason || null
        })
        .eq("id", selectedPayout.id)
      
      if (error) throw error
      toast.success(`Settlement confirmed for ${selectedPayout.brands?.business_name}`)
      setSelectedPayout(null)
      setAdjustmentAmount("")
      setAdjustmentReason("")
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Settlement transmission failed")
    }
  }

  const totalLiveGross = liveSales.reduce((sum, s) => sum + (s.gross_sales || 0), 0)
  const totalLiveDue = liveSales.reduce((sum, s) => sum + (s.gross_sales - (s.commission_amount || 0)), 0)

  if (loading && !isSyncing) {
    return <div className="p-20 text-center animate-pulse"><RefreshCcw className="w-12 h-12 mx-auto text-gray-200 animate-spin" /><p className="mt-4 text-gray-400 font-black uppercase tracking-widest text-xs">Syncing Ledger...</p></div>
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
           <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
             <Wallet className="w-8 h-8 text-[#FE7F2D]" />
             Payouts Terminal
           </h1>
           <p className="text-gray-500 font-medium text-sm">Real-time settlement aggregator and financial reconciliation.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={fetchData} disabled={isSyncing} className="rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest border-gray-200 hover:bg-gray-50 transition-all flex items-center gap-2">
            <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> 
            Sync Live
          </Button>
          <Button onClick={handleGeneratePayouts} disabled={isGenerating} className="bg-black text-white hover:bg-black/90 rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 flex-1 md:flex-none">
             <PlayCircle className="w-4 h-4" />
             {isGenerating ? "Finalizing..." : "Finalize Last Month"}
          </Button>
        </div>
      </div>

      {/* Real-time Current Month Stats */}
      <div className="grid md:grid-cols-3 gap-8">
         <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-8 border border-gray-100 group hover:scale-[1.02] transition-transform">
            <div className="flex justify-between items-start mb-6">
               <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-[#FE7F2D]" />
               </div>
               <Badge className="bg-orange-100 text-orange-700 border-none font-black uppercase text-[8px] px-3 tracking-widest">Live Flow</Badge>
            </div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 font-mono">Current Month Gross</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tighter italic">NPR {totalLiveGross.toLocaleString()}</h3>
         </Card>

         <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-8 border border-gray-100 group hover:scale-[1.02] transition-transform">
            <div className="flex justify-between items-start mb-6">
               <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
               </div>
               <Badge className="bg-green-100 text-green-700 border-none font-black uppercase text-[8px] px-3 tracking-widest">Estimated Payout</Badge>
            </div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 font-mono">Net Brand Revenue Due</p>
            <h3 className="text-3xl font-black text-gray-900 tracking-tighter italic">NPR {totalLiveDue.toLocaleString()}</h3>
         </Card>

         <Card className="border-none shadow-xl rounded-[2.5rem] bg-black text-white p-8 group hover:scale-[1.02] transition-transform">
            <div className="flex justify-between items-start mb-6">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                  <ArrowUpRight className="w-6 h-6 text-[#FE7F2D]" />
               </div>
               <Badge className="bg-[#FE7F2D] text-white border-none font-black uppercase text-[8px] px-3 tracking-widest">Club Profit</Badge>
            </div>
            <p className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-1 font-mono">Commission Stream</p>
            <h3 className="text-3xl font-black text-white tracking-tighter italic">NPR {(totalLiveGross - totalLiveDue).toLocaleString()}</h3>
         </Card>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-black tracking-tighter uppercase italic px-2 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-gray-400" />
          Pending Settlements (Live)
        </h3>
        <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-gray-50">
          <Table>
            <TableHeader className="bg-gray-50/50">
               <TableRow className="border-none">
                 <TableHead className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Brand Partner</TableHead>
                 <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Sales Tier</TableHead>
                 <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Live Gross</TableHead>
                 <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Commission</TableHead>
                 <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Net Due (Live)</TableHead>
                 <TableHead className="px-10 py-6 text-right"></TableHead>
               </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {liveSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-24 text-gray-300 italic font-medium">No sales recorded for the current cycle.</TableCell>
                </TableRow>
              ) : liveSales.map(sale => (
                <TableRow key={sale.id} className="group hover:bg-gray-50/30 transition-colors">
                  <TableCell className="px-10 py-8 font-black text-gray-900 italic uppercase">{sale.brands?.business_name}</TableCell>
                  <TableCell className="py-8 font-bold text-sm text-gray-600">Tier {sale.commission_rate}%</TableCell>
                  <TableCell className="py-8 font-bold text-sm">NPR {sale.gross_sales.toLocaleString()}</TableCell>
                  <TableCell className="py-8 font-black text-xs text-red-400 opacity-60">NPR {sale.commission_amount.toLocaleString()}</TableCell>
                  <TableCell className="py-8 font-black text-[#FE7F2D] text-lg italic">NPR {(sale.gross_sales - sale.commission_amount).toLocaleString()}</TableCell>
                  <TableCell className="px-10 py-8 text-right">
                    <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[8px] tracking-widest uppercase px-3 italic">Live Stream</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-black tracking-tighter uppercase italic px-2 flex items-center gap-3">
           <CheckCircle2 className="w-5 h-5 text-gray-400" />
           Payout Ledger (Settled/Final)
        </h3>
        <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-gray-50">
          <Table>
            <TableHeader className="bg-gray-50/50">
               <TableRow className="border-none">
                 <TableHead className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Partner</TableHead>
                 <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Period</TableHead>
                 <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400 text-center">Final Payout</TableHead>
                 <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400 text-center">Status</TableHead>
                 <TableHead className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-gray-400 text-right">Terminal Action</TableHead>
               </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-24 text-gray-300 italic font-medium">No finalized payout ledgers exist yet.</TableCell>
                </TableRow>
              ) : payouts.map(po => (
                <TableRow key={po.id} className="group hover:bg-gray-50/30 transition-colors">
                  <TableCell className="px-10 py-8 font-black text-gray-900 italic uppercase">{po.brands?.business_name}</TableCell>
                  <TableCell className="py-8 font-bold text-xs text-gray-500 tabular-nums">{po.month}/{po.year}</TableCell>
                  <TableCell className="py-8 font-black text-green-700 text-lg italic text-center">NPR {po.net_payout.toLocaleString()}</TableCell>
                  <TableCell className="py-8 text-center">
                    {po.status === 'paid' ? (
                       <Badge className="bg-green-50 text-green-600 border-none font-black text-[8px] tracking-widest uppercase px-3"><CheckCircle className="w-3 h-3 mr-1" /> Settled</Badge>
                    ) : (
                       <Badge className="bg-orange-50 text-orange-600 border-none font-black text-[8px] tracking-widest uppercase px-3"><Clock className="w-3 h-3 mr-1" /> Accruing</Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-10 py-8 text-right">
                    {po.status === 'pending' ? (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest text-[#FE7F2D] border-orange-100 hover:bg-orange-50 transition-all" 
                        onClick={() => {
                          setSelectedPayout(po)
                          setAdjustmentAmount(po.net_payout.toString())
                        }}
                      >
                        Settle Manually
                      </Button>
                    ) : (
                      <span className="text-[8px] font-black uppercase tracking-widest text-gray-300">Closed on {new Date(po.paid_at).toLocaleDateString()}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Manual Settlement Dialog */}
      <Dialog open={!!selectedPayout} onOpenChange={(open) => !open && setSelectedPayout(null)}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-black text-white p-8 space-y-2">
             <DialogTitle className="text-2xl font-black italic uppercase italic tracking-tight">Manual Settlement</DialogTitle>
             <DialogDescription className="text-white/50 text-[10px] font-black uppercase tracking-widest">Partner: {selectedPayout?.brands?.business_name}</DialogDescription>
          </div>
          <div className="p-8 space-y-6">
             <div className="space-y-4">
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Final Payout Amount (NPR)</Label>
                 <Input 
                   type="number" 
                   value={adjustmentAmount} 
                   onChange={(e) => setAdjustmentAmount(e.target.value)} 
                   className="h-14 rounded-2xl border-gray-100 font-bold text-lg"
                 />
                 <p className="text-[9px] text-gray-400 font-medium italic">* Default aggregate calculated based on ledger records.</p>
               </div>
               <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Manual Note / Reference</Label>
                 <Input 
                   placeholder="e.g. Bank transfer ID, Cash pickup ref..."
                   value={adjustmentReason}
                   onChange={(e) => setAdjustmentReason(e.target.value)}
                   className="h-14 rounded-2xl border-gray-100 italic"
                 />
               </div>
             </div>

             <div className="flex gap-3">
               <Button variant="outline" onClick={() => setSelectedPayout(null)} className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancel</Button>
               <Button onClick={handleManualSettlement} className="flex-1 h-14 bg-[#FE7F2D] text-white hover:bg-[#FE7F2D]/90 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-orange-500/20">Finalize Payment</Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
