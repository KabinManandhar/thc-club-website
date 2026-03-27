"use client"

import { useState, useEffect, useRef } from "react"
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
  ArrowUpRight,
  Building2,
  Hash,
  Save,
  Printer,
  X,
  Receipt,
  Smartphone,
  Wallet,
  Banknote,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Payout {
  id: string
  brand_id: string
  month: number
  year: number
  gross_sales: number
  ppf_amount: number
  net_payout: number
  status: "pending" | "paid"
  paid_at?: string
  admin_notes?: string
}

interface BrandPayoutsProps {
  brandId: string
}

type PaymentMethodType = "bank" | "wallet" | "cash"

interface SettlementDetails {
  type: PaymentMethodType
  accountName: string
  accountNumber: string
  bankName: string
  branchName: string
  swiftCode: string
  walletProvider: string
  walletNumber: string
}

export function BrandPayouts({ brandId }: BrandPayoutsProps) {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [stats, setStats] = useState({ totalPayout: 0, pendingPayout: 0, lastAmount: 0 })
  const [settlementDetails, setSettlementDetails] = useState<SettlementDetails>({
    type: "bank",
    accountName: "",
    accountNumber: "",
    bankName: "",
    branchName: "",
    swiftCode: "",
    walletProvider: "",
    walletNumber: "",
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewPayout, setViewPayout] = useState<Payout | null>(null)
  
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchPayouts()
    fetchSettlementDetails()
  }, [brandId])

  const fetchPayouts = async () => {
    setLoading(true)
    try {
      const { data: payoutsData } = await supabase
        .from("payouts")
        .select("*")
        .eq("brand_id", brandId)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
      
      const { data: salesData } = await supabase
        .from("brand_sales")
        .select("*")
        .eq("brand_id", brandId)

      const typedPayouts = (payoutsData || []) as Payout[]
      const totalPaid = typedPayouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.net_payout || 0), 0) || 0
      
      // Identify sales that are NOT yet in payouts
      const finalizedKeys = new Set(typedPayouts.map(p => `${p.month}-${p.year}`))
      const pendingSales = (salesData || []).filter(s => !finalizedKeys.has(`${s.month}-${s.year}`))
      const pendingAccrual = pendingSales.reduce((sum, s) => sum + (s.gross_sales - (s.ppf_amount || 0)), 0)
      
      const last = typedPayouts.filter(p => p.status === 'paid')?.[0]?.net_payout || 0
      
      setStats({ totalPayout: totalPaid, pendingPayout: pendingAccrual, lastAmount: last })
      setPayouts(typedPayouts)
    } catch (err) {
      console.error("Payout fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSettlementDetails = async () => {
    const { data } = await supabase
      .from("brands")
      .select("bank_account_details")
      .eq("id", brandId)
      .single()
    
    if (data?.bank_account_details) {
      const details = data.bank_account_details as SettlementDetails
      setSettlementDetails({
        ...details,
        type: details.type || "bank"
      })
    }
  }

  const handleUpdateSettlementDetails = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("brands")
        .update({ bank_account_details: settlementDetails })
        .eq("id", brandId)
      
      if (error) throw error
      toast.success("Settlement account configured successfully.")
      setIsDialogOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Configuration transmission failed.")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const w = window.open("", "_blank")
    if (!w) return
    w.document.write(`<html><head><title>Payout Statement</title><style>
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#010307;padding:40px;line-height:1.6}
      .logo{font-size:28px;font-weight:900;font-style:italic;letter-spacing:-2px}
      .label{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#a1a1aa;margin-bottom:3px}
      .value{font-size:15px;font-weight:700}
      table{width:100%;border-collapse:collapse;margin:30px 0}
      th{text-align:left;padding:10px 12px;border-bottom:1px solid #e4e4e7;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#a1a1aa}
      td{padding:16px 12px;border-bottom:1 solid #f4f4f5;font-size:13px;font-weight:700}
      .total td{border-top:2px solid #010307;border-bottom:none;font-size:22px;font-weight:900;font-style:italic}
      .footer{margin-top:50px;font-size:9px;text-transform:lowercase;color:#d4d4d8;text-align:center}
      @media print{.no-print{display:none}}
    </style></head><body>${content.innerHTML}<script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`)
    w.document.close()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-50 text-green-700 border-none font-bold lowercase text-[10px] px-3 py-1 tracking-wide rounded-full">settled</Badge>
      case "pending":
        return <Badge className="bg-[#FE7F2D]/10 text-[#FE7F2D] border-none font-bold lowercase text-[10px] px-3 py-1 tracking-wide rounded-full">accruing</Badge>
      default:
        return <Badge className="bg-[#010307]/5 text-[#010307]/40 border-none font-bold lowercase text-[10px] px-3 py-1 tracking-wide rounded-full">{status}</Badge>
    }
  }

  // ─── Statement Panel ────────────────────────────────────────────────────────

  const StatementContent = ({ payout }: { payout: Payout }) => (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b-2 border-[#010307] pb-6">
        <div>
          <div className="text-3xl font-black italic tracking-tighter">THC Club</div>
          <p className="text-[8px] font-black uppercase tracking-widest text-[#010307]/30">official payout record</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-black uppercase tracking-widest text-[#FE7F2D]">Statement</div>
          <p className="text-[10px] font-bold tabular-nums">Ref: #{payout.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-[10px] font-bold text-[#010307]/30 uppercase tracking-widest">
            {new Date(payout.paid_at || Date.now()).toLocaleDateString("en-NP")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10">
        <div className="space-y-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Cycle Period</div>
            <div className="text-base font-bold tabular-nums">{payout.month}/{payout.year}</div>
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Settlement Status</div>
            <div className="text-sm font-black text-green-600 italic">
              Settled on {new Date(payout.paid_at || Date.now()).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="space-y-4 text-right md:text-left">
           <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Settlement Method</div>
            <div className="text-sm font-medium italic text-gray-600 uppercase tracking-tight">
               {settlementDetails.type === 'cash' ? (
                 "Physical Cash"
               ) : settlementDetails.type === 'wallet' ? (
                 `${settlementDetails.walletProvider} • ${settlementDetails.walletNumber}`
               ) : settlementDetails.bankName ? (
                 `${settlementDetails.bankName} • ${settlementDetails.accountNumber}`
               ) : (
                 "Verified Disbursement"
               )}
            </div>
          </div>
        </div>
      </div>

      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left py-3 px-3 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b">Description</th>
            <th className="text-right py-3 px-3 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b">Amount (NPR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-4 px-3 font-bold text-sm border-b border-gray-50">Gross Revenue Accrued</td>
            <td className="py-4 px-3 font-bold text-sm text-right border-b border-gray-50">{payout.gross_sales.toLocaleString()}</td>
          </tr>
          <tr>
            <td className="py-4 px-3 font-bold text-sm border-b border-gray-50">platform fees (PPF)</td>
            <td className="py-4 px-3 font-bold text-sm text-right border-b border-gray-50 text-red-400">−{(payout.ppf_amount || 0).toLocaleString()}</td>
          </tr>
          {payout.admin_notes && (
            <tr>
              <td className="py-4 px-3 text-xs italic text-gray-400 border-b border-gray-50" colSpan={2}>
                Treasury Notes: {payout.admin_notes}
              </td>
            </tr>
          )}
          <tr className="border-t-2 border-[#010307]">
            <td className="py-5 px-3 font-black text-xl italic">Net Disbursement</td>
            <td className="py-5 px-3 font-black text-xl italic text-right text-[#FE7F2D]">NPR {payout.net_payout.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div className="text-center text-[9px] font-bold lowercase text-gray-300 pt-6 border-t border-gray-100">
        this is an automated ledger entry from the hidden collective club treasury.
      </div>
    </div>
  )

  return (
    <div className="space-y-12 pb-24 text-[#010307] animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-2xl bg-white p-8 group transition-all">
            <div className="flex justify-between items-start mb-6">
               <div className="w-12 h-12 bg-[#FE7F2D] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                  <CheckCircle2 className="w-5 h-5" />
               </div>
               <Badge className="bg-[#FE7F2D]/5 text-[#FE7F2D] border-none font-bold lowercase text-[10px] px-3 tracking-wide">lifetime settled</Badge>
            </div>
            <p className="text-[11px] font-bold lowercase text-[#010307]/30 tracking-widest mb-2 italic">verified payouts</p>
            <h3 className="text-3xl font-black text-[#010307] tracking-tighter italic">npr {stats.totalPayout.toLocaleString()}</h3>
         </Card>

          <Card className="border border-black/5 shadow-sm rounded-2xl bg-white p-8 group transition-all">
            <div className="flex justify-between items-start mb-6">
               <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-[#FE7F2D]">
                  <TrendingUp className="w-5 h-5" />
               </div>
               <Badge className="bg-gray-50 text-black/50 border-none font-black uppercase text-[8px] px-3 tracking-widest italic">Live Status</Badge>
            </div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 font-mono">Pending Balance (Total)</p>
            <h3 className="text-3xl font-black text-[#010307] tracking-tighter italic">npr {stats.pendingPayout.toLocaleString()}</h3>
          </Card>

         <Card className="border border-black/5 shadow-sm rounded-2xl bg-[#010307] p-8 group transition-all">
            <div className="flex justify-between items-start mb-6">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                  <ArrowDownLeft className="w-5 h-5" />
               </div>
               <Badge className="bg-white/10 text-white/50 border-none font-black uppercase text-[8px] px-3 tracking-widest">latest tx</Badge>
            </div>
            <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-2 font-mono">Last Settlement</p>
            <h3 className="text-3xl font-black text-white tracking-tighter italic">npr {stats.lastAmount.toLocaleString()}</h3>
         </Card>
      </div>

      <div className="space-y-6">
         <div className="flex items-center justify-between px-2">
          <h3 className="text-2xl font-black tracking-tighter flex items-center gap-4 italic lowercase">
            settlement terminal
          </h3>
          <Button 
            variant="ghost" 
            className="rounded-xl h-10 px-4 font-bold lowercase text-[11px] tracking-wide text-[#010307]/40 hover:text-[#FE7F2D] hover:bg-[#FE7F2D]/5 transition-all flex items-center gap-2"
          >
             <FileText className="w-3 h-3" /> treasury link active
          </Button>
        </div>

        <Card className="border border-[#010307]/5 shadow-2xl rounded-[3rem] bg-white overflow-hidden transition-all duration-500 hover:shadow-orange-500/5">
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50/50">
                    <tr className="border-none">
                       <th className="px-10 py-8 font-black text-[10px] uppercase tracking-[0.2em] text-[#010307]/30">Ledger Index</th>
                       <th className="py-8 font-black text-[10px] uppercase tracking-[0.2em] text-[#010307]/30">Cycle</th>
                       <th className="py-8 font-black text-[10px] uppercase tracking-[0.2em] text-[#010307]/30">Gross Aggregation</th>
                       <th className="py-8 font-black text-[10px] uppercase tracking-[0.2em] text-[#010307]/30">Service Fees (PPF)</th>
                       <th className="py-8 font-black text-[10px] uppercase tracking-[0.2em] text-[#010307]/30">Net Disbursement</th>
                       <th className="px-10 py-8 font-black text-[10px] uppercase tracking-[0.2em] text-[#010307]/30 text-right">Verification</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {loading ? (
                       <tr><td colSpan={6} className="text-center py-24 animate-pulse">
                          <div className="flex flex-col items-center gap-4">
                             <div className="w-10 h-10 border-4 border-[#FE7F2D]/20 border-t-[#FE7F2D] rounded-full animate-spin"></div>
                             <p className="text-[#010307]/20 font-black uppercase tracking-widest text-[10px]">Syncing Financial Logs...</p>
                          </div>
                       </td></tr>
                    ) : payouts.length === 0 ? (
                       <tr><td colSpan={6} className="text-center py-32 text-[#010307]/20 italic font-black uppercase text-xs tracking-widest">No finalized ledger entries detected.</td></tr>
                    ) : (
                       payouts.map((p) => (
                           <tr key={p.id} className="group hover:bg-[#FE7F2D]/[0.02] transition-colors">
                              <td className="px-10 py-10">
                                 <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-[#FE7F2D]/20 transition-all group-hover:bg-[#FE7F2D] group-hover:shadow-[0_0_8px_rgba(254,127,45,0.4)]"></div>
                                    <span className="font-mono text-xs font-bold text-[#010307]/30 lowercase tracking-tighter">log_{p.id.slice(0, 8)}</span>
                                 </div>
                              </td>
                              <td className="py-10">
                                 <div className="flex flex-col">
                                    <span className="font-black text-sm text-[#010307] italic">{p.month}/{p.year}</span>
                                    <span className="text-[8px] font-bold text-[#010307]/20 uppercase tracking-widest">monthly cycle</span>
                                 </div>
                              </td>
                              <td className="py-10">
                                 <div className="flex flex-col">
                                    <span className="font-black text-sm text-[#010307] tabular-nums">npr {p.gross_sales?.toLocaleString() || "0"}</span>
                                    <span className="text-[8px] font-bold text-green-500/40 uppercase tracking-widest">total revenue</span>
                                 </div>
                              </td>
                              <td className="py-10 font-bold text-sm">
                                 <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5 text-red-500/60 font-black tabular-nums">
                                       <TrendingDown className="w-3.5 h-3.5 opacity-50" /> npr {p.ppf_amount?.toLocaleString() || "0"}
                                    </div>
                                    <span className="text-[8px] font-bold text-red-500/20 uppercase tracking-widest font-mono">fee protocol</span>
                                 </div>
                              </td>
                              <td className="py-10">
                                 <div className="flex flex-col">
                                    <span className="font-black text-[#FE7F2D] text-xl italic tracking-tighter tabular-nums drop-shadow-sm group-hover:scale-105 transition-transform origin-left">
                                       npr {p.net_payout?.toLocaleString() || "0"}
                                    </span>
                                    <span className="text-[8px] font-bold text-[#FE7F2D]/30 uppercase tracking-widest italic">settlement value</span>
                                 </div>
                              </td>
                              <td className="px-10 py-10 text-right">
                                 <div className="flex items-center justify-end gap-6">
                                    {getStatusBadge(p.status)}
                                    {p.status === 'paid' && (
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => setViewPayout(p)}
                                        className="h-10 px-4 rounded-xl border-[#010307]/5 font-black text-[9px] uppercase tracking-widest hover:bg-[#010307] hover:text-white transition-all flex items-center gap-2 group/btn"
                                      >
                                         <Receipt className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" /> statement
                                      </Button>
                                    )}
                                 </div>
                              </td>
                           </tr>
                       ))
                    )}
                 </tbody>
              </table>
           </div>
        </Card>
      </div>

      <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-[2rem] bg-white p-10 flex flex-col md:flex-row items-center gap-8">
         <div className="w-16 h-16 bg-[#FE7F2D] text-white rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
            <ShieldCheck className="w-8 h-8" />
         </div>
         <div className="space-y-1 flex-1 text-center md:text-left">
            <h4 className="text-xl font-black tracking-tighter lowercase italic flex items-center gap-2 justify-center md:justify-start">
              active disbursement profile
              <Badge className="bg-green-500/10 text-green-600 border-none font-black text-[8px] uppercase tracking-widest px-2 py-0.5">verified</Badge>
            </h4>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3">
               {settlementDetails.type === 'cash' ? (
                 <div className="flex items-center gap-4 bg-orange-50/50 px-5 py-3 rounded-2xl border border-orange-100/50">
                    <Banknote className="w-5 h-5 text-[#FE7F2D]" /> 
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40 mb-0.5">Physical Settlement</span>
                      <span className="text-xs font-bold text-[#FE7F2D] italic">Cash at Club Treasury Desk</span>
                    </div>
                 </div>
               ) : settlementDetails.type === 'wallet' && settlementDetails.walletNumber ? (
                 <div className="flex items-center gap-4 bg-blue-50/30 px-5 py-3 rounded-2xl border border-blue-100/50">
                    <Smartphone className="w-5 h-5 text-blue-500" /> 
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40 mb-0.5">{settlementDetails.walletProvider || 'Digital Wallet'}</span>
                      <span className="text-xs font-bold text-[#010307] italic underline underline-offset-4 decoration-blue-500/30">{settlementDetails.walletNumber}</span>
                      <span className="text-[9px] text-[#010307]/30 italic mt-0.5">verified holder: {settlementDetails.accountName}</span>
                    </div>
                 </div>
               ) : settlementDetails.type === 'bank' && settlementDetails.accountNumber ? (
                 <div className="flex items-center gap-4 bg-emerald-50/30 px-5 py-3 rounded-2xl border border-emerald-100/50">
                    <Building2 className="w-5 h-5 text-emerald-600" /> 
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40 mb-0.5">{settlementDetails.bankName || 'Bank'}</span>
                      <span className="text-xs font-bold text-[#010307] italic underline underline-offset-4 decoration-emerald-500/30">Ending in ...{settlementDetails.accountNumber.slice(-4)}</span>
                      <span className="text-[9px] text-[#010307]/30 italic mt-0.5">{settlementDetails.accountName}</span>
                    </div>
                 </div>
               ) : (
                 <div className="flex items-center gap-2 bg-gray-50 px-5 py-3 rounded-2xl border border-gray-100 text-[#010307]/20 font-bold text-[10px] uppercase tracking-widest italic">
                    <AlertCircle className="w-4 h-4" /> configuration missing
                 </div>
               )}
            </div>
         </div>
         
         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
               <Button 
                  variant="outline" 
                  className="rounded-2xl border-[#010307]/5 hover:border-[#FE7F2D]/20 h-14 px-10 font-black lowercase text-[10px] tracking-widest whitespace-nowrap text-[#010307]/60 transition-all flex items-center gap-3 active:scale-95"
               >
                  <CreditCard className="w-4 h-4" /> configure accounts
               </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden focus:outline-none">
                <div className="bg-[#010307] text-white p-10 space-y-3 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-[#FE7F2D]/10 blur-3xl -mr-16 -mt-16"></div>
                   <div className="flex items-center gap-4 relative z-10">
                      <div className="w-12 h-12 bg-[#FE7F2D] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
                         <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                         <DialogTitle className="text-3xl font-black italic lowercase tracking-tighter">Treasury Terminal</DialogTitle>
                         <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest italic">Official Disbursement Configuration</DialogDescription>
                      </div>
                   </div>
                </div>
                <div className="p-10 space-y-10">
                   <Tabs value={settlementDetails.type} onValueChange={(v) => setSettlementDetails({...settlementDetails, type: v as PaymentMethodType})} className="w-full">
                     <TabsList className="grid grid-cols-3 w-full h-16 bg-gray-50 rounded-[1.5rem] p-1.5 border border-[#010307]/5">
                       <TabsTrigger value="bank" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-[#010307] data-[state=active]:text-white data-[state=active]:shadow-xl flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5" /> Bank
                       </TabsTrigger>
                       <TabsTrigger value="wallet" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-[#010307] data-[state=active]:text-white data-[state=active]:shadow-xl flex items-center gap-2">
                          <Smartphone className="w-3.5 h-3.5" /> Wallet
                       </TabsTrigger>
                       <TabsTrigger value="cash" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-[#010307] data-[state=active]:text-white data-[state=active]:shadow-xl flex items-center gap-2">
                          <Banknote className="w-3.5 h-3.5" /> Cash
                       </TabsTrigger>
                     </TabsList>
                     
                     <div className="mt-10">
                       <TabsContent value="bank" className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                         <div className="flex items-center gap-3 mb-2 px-1">
                            <div className="w-8 h-8 rounded-lg bg-[#FE7F2D]/10 flex items-center justify-center text-[#FE7F2D]">
                               <Building2 className="w-4 h-4" />
                            </div>
                            <h4 className="font-black text-sm italic lowercase tracking-tight">Bank Settlement Details</h4>
                         </div>
                         <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-2 col-span-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40 flex justify-between">
                                 Account Holder Name
                                 <span className="text-[8px] italic opacity-50">Legal Name Required</span>
                              </Label>
                              <Input 
                                 value={settlementDetails.accountName}
                                 onChange={(e) => setSettlementDetails({...settlementDetails, accountName: e.target.value})}
                                 className="h-14 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#FE7F2D]/30 transition-all font-bold lowercase italic text-base placeholder:opacity-20 translate-y-0"
                                 placeholder="e.g. creative ventures pvt ltd"
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40">Bank Name</Label>
                              <Input 
                                 value={settlementDetails.bankName}
                                 onChange={(e) => setSettlementDetails({...settlementDetails, bankName: e.target.value})}
                                 className="h-14 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#FE7F2D]/30 transition-all font-bold lowercase italic"
                                 placeholder="e.g. NIC Asia Bank"
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40">Account Number</Label>
                              <Input 
                                 value={settlementDetails.accountNumber}
                                 onChange={(e) => setSettlementDetails({...settlementDetails, accountNumber: e.target.value})}
                                 className="h-14 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#FE7F2D]/30 transition-all font-black text-base tabular-nums"
                                 placeholder="0000 0000 0000"
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40">Branch Name</Label>
                              <Input 
                                 value={settlementDetails.branchName}
                                 onChange={(e) => setSettlementDetails({...settlementDetails, branchName: e.target.value})}
                                 className="h-14 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#FE7F2D]/30 transition-all font-bold lowercase italic"
                                 placeholder="e.g. Thamel"
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40">Swift Code <span className="text-[8px] opacity-30 font-bold">(Optional)</span></Label>
                              <Input 
                                 value={settlementDetails.swiftCode}
                                 onChange={(e) => setSettlementDetails({...settlementDetails, swiftCode: e.target.value})}
                                 className="h-14 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#FE7F2D]/30 transition-all font-bold uppercase tracking-widest text-sm"
                                 placeholder="NICANP..."
                              />
                           </div>
                         </div>
                       </TabsContent>
 
                       <TabsContent value="wallet" className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                          <div className="flex items-center gap-3 mb-2 px-1">
                             <div className="w-8 h-8 rounded-lg bg-[#FE7F2D]/10 flex items-center justify-center text-[#FE7F2D]">
                                <Smartphone className="w-4 h-4" />
                             </div>
                             <h4 className="font-black text-sm italic lowercase tracking-tight">Digital Wallet Links</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <Label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40">Provider</Label>
                               <Input 
                                  value={settlementDetails.walletProvider}
                                  onChange={(e) => setSettlementDetails({...settlementDetails, walletProvider: e.target.value})}
                                  className="h-14 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#FE7F2D]/30 transition-all font-bold lowercase italic text-base"
                                  placeholder="e.g. eSewa / Khalti"
                               />
                            </div>
                            <div className="space-y-2">
                               <Label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40">Linked Phone Number</Label>
                               <Input 
                                  value={settlementDetails.walletNumber}
                                  onChange={(e) => setSettlementDetails({...settlementDetails, walletNumber: e.target.value})}
                                  className="h-14 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#FE7F2D]/30 transition-all font-black text-base tabular-nums"
                                  placeholder="98..."
                               />
                            </div>
                            <div className="space-y-2 col-span-2">
                               <Label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40">Full Name on Wallet</Label>
                               <Input 
                                  value={settlementDetails.accountName}
                                  onChange={(e) => setSettlementDetails({...settlementDetails, accountName: e.target.value})}
                                  className="h-14 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#FE7F2D]/30 transition-all font-bold lowercase italic text-base"
                                  placeholder="as seen in wallet app"
                               />
                            </div>
                         </div>
                       </TabsContent>
 
                       <TabsContent value="cash" className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                         <div className="p-10 bg-orange-50/50 rounded-[2.5rem] border border-[#FE7F2D]/10 flex flex-col items-center text-center gap-6 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-[#FE7F2D]/20"></div>
                            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-[#FE7F2D] shadow-xl shadow-orange-500/10 group-hover:scale-110 transition-transform">
                               <Banknote className="w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                               <p className="text-[10px] font-black text-[#FE7F2D] uppercase tracking-widest">Physical Settlement Signal</p>
                               <p className="text-sm font-bold text-[#010307]/60 lowercase leading-relaxed max-w-xs mx-auto">
                                  Cash settlements are aggregated and disbursed directly at the <span className="text-[#010307] font-black italic">Club Treasury Desk</span> in Kathmandu.
                               </p>
                            </div>
                            <Badge className="bg-[#FE7F2D]/10 text-[#FE7F2D] border-none font-bold italic lowercase text-[10px] px-6 py-2 rounded-full">Manual Voucher Signing Required</Badge>
                         </div>
                       </TabsContent>
                     </div>
                   </Tabs>
 
                   <div className="p-6 bg-gray-50 rounded-2xl flex items-start gap-4 border border-gray-100 italic">
                      <ShieldCheck className="w-5 h-5 text-green-600 mt-1 shrink-0" />
                      <p className="text-[10px] font-medium text-gray-500 leading-relaxed uppercase">
                         Your financial telemetry is shared ONLY with authorized treasury administrators. All changes are logged for security verification.
                      </p>
                   </div>

                  <div className="flex gap-4 pt-4">
                     <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-black lowercase italic tracking-widest text-[#010307]/40">cancel</Button>
                     <Button 
                        onClick={handleUpdateSettlementDetails} 
                        disabled={isSaving}
                        className="flex-1 h-14 bg-[#FE7F2D] text-white hover:bg-black rounded-2xl font-black lowercase italic tracking-widest shadow-xl shadow-orange-500/20 transition-all flex items-center gap-3"
                     >
                        <Save className="w-4 h-4" /> {isSaving ? "syncing..." : "save ledger details"}
                     </Button>
                  </div>
               </div>
            </DialogContent>
         </Dialog>
      </Card>

      <Dialog open={!!viewPayout} onOpenChange={(open) => !open && setViewPayout(null)}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-white focus:outline-none">
          <div className="bg-[#010307] px-10 py-8 flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-white">Statement View</DialogTitle>
              <DialogDescription className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">
                verified disbursement • {viewPayout?.month}/{viewPayout?.year}
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setViewPayout(null)} className="rounded-full text-white/40 hover:bg-white/10">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="p-10">
            <div ref={printRef}>
              {viewPayout && <StatementContent payout={viewPayout} />}
            </div>
            <div className="flex gap-4 pt-8 border-t border-gray-100 mt-8">
              <Button onClick={handlePrint}
                className="flex-1 h-14 bg-[#FE7F2D] text-white hover:bg-black rounded-2xl font-black lowercase italic tracking-widest shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2 transition-all">
                <Printer className="w-5 h-5" /> print copy
              </Button>
              <Button variant="ghost" onClick={() => setViewPayout(null)}
                className="flex-1 h-14 rounded-2xl font-black lowercase italic tracking-widest text-[#010307]/40">
                close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border border-[#010307]/5 text-[11px] font-bold lowercase tracking-widest text-[#010307]/20 italic">
         <ArrowUpRight className="w-4 h-4 text-[#FE7F2D]" /> treasury link active • secure 256-bit encryption verified.
      </div>
    </div>
  )
}
