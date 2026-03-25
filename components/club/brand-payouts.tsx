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
  Banknote
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
      
      const now = new Date()
      const { data: liveSales } = await supabase
        .from("brand_sales")
        .select("gross_sales, ppf_amount")
        .eq("brand_id", brandId)
        .eq("month", now.getMonth() + 1)
        .eq("year", now.getFullYear())
        .maybeSingle()

      const typedPayouts = (payoutsData || []) as Payout[]
      const totalPaid = typedPayouts.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.net_payout || 0), 0) || 0
      const pendingAccrual = liveSales ? (liveSales.gross_sales - (liveSales.ppf_amount || 0)) : 0
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
               <Badge className="bg-gray-50 text-black/50 border-none font-black uppercase text-[8px] px-3 tracking-widest italic">Live Flow</Badge>
            </div>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 font-mono">Current Month Accrual</p>
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

        <Card className="border border-black/5 shadow-sm rounded-[2rem] bg-white overflow-hidden">
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-gray-50/50">
                    <tr className="border-none">
                       <th className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Ledger ID</th>
                       <th className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Period</th>
                       <th className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Gross Vol</th>
                       <th className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Fees</th>
                       <th className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Settlement</th>
                       <th className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-gray-400 text-right">Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {loading ? (
                       <tr><td colSpan={6} className="text-center py-20 animate-pulse text-gray-300 font-black uppercase tracking-widest text-[10px]">Syncing accounts...</td></tr>
                    ) : payouts.length === 0 ? (
                       <tr><td colSpan={6} className="text-center py-24 text-gray-300 italic font-medium">No finalized settlements recorded in the ledger yet.</td></tr>
                    ) : (
                       payouts.map((p) => (
                           <tr key={p.id} className="group hover:bg-[#010307]/5 transition-colors">
                              <td className="px-10 py-8">
                                 <span className="font-mono text-xs font-bold text-[#010307]/20 lowercase tracking-tighter">#{p.id.slice(0, 8)}</span>
                              </td>
                              <td className="py-8 font-black text-xs text-[#010307]/60 tabular-nums">
                                 {p.month}/{p.year}
                              </td>
                              <td className="py-8 font-black text-sm text-[#010307]">npr {p.gross_sales?.toLocaleString() || "0"}</td>
                              <td className="py-8 font-bold text-sm text-red-500 flex items-center gap-1.5 opacity-60">
                                 <TrendingDown className="w-3.5 h-3.5 text-red-300" /> npr {p.ppf_amount?.toLocaleString() || "0"}
                              </td>
                              <td className="py-8 font-black text-[#FE7F2D] text-lg italic">
                                 npr {p.net_payout?.toLocaleString() || "0"}
                              </td>
                              <td className="px-10 py-8 text-right flex items-center justify-end gap-3">
                                 {getStatusBadge(p.status)}
                                 {p.status === 'paid' && (
                                   <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     onClick={() => setViewPayout(p)}
                                     className="w-8 h-8 rounded-full opacity-40 group-hover:opacity-100 transition-opacity hover:text-[#FE7F2D]"
                                   >
                                      <Receipt className="w-4 h-4" />
                                   </Button>
                                 )}
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
            <h4 className="text-xl font-black tracking-tighter lowercase italic">automated settlements</h4>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2">
               {settlementDetails.type === 'cash' ? (
                 <div className="flex items-center gap-2 text-[#FE7F2D] font-black text-xs italic underline underline-offset-4 decoration-2">
                    <Banknote className="w-4 h-4" /> physical cash
                 </div>
               ) : settlementDetails.type === 'wallet' && settlementDetails.walletNumber ? (
                 <div className="flex items-center gap-2 text-[#FE7F2D] font-black text-xs italic underline underline-offset-4 decoration-2">
                    <Smartphone className="w-4 h-4" /> {settlementDetails.walletProvider} ({settlementDetails.walletNumber})
                 </div>
               ) : settlementDetails.type === 'bank' && settlementDetails.accountNumber ? (
                 <div className="flex items-center gap-2 text-[#FE7F2D] font-black text-xs italic underline underline-offset-4 decoration-2">
                    <Building2 className="w-4 h-4" /> {settlementDetails.bankName} (...{settlementDetails.accountNumber.slice(-4)})
                 </div>
               ) : (
                 <p className="text-[#010307]/40 font-medium text-sm italic leading-relaxed lowercase">Configure your preferred settlement method. Admins will process payouts based on these details.</p>
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
               <div className="bg-[#010307] text-white p-10 space-y-2">
                  <DialogTitle className="text-3xl font-black italic lowercase tracking-tighter">Settlement Account</DialogTitle>
                  <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest italic">official disbursement information</DialogDescription>
               </div>
               <div className="p-10 space-y-8">
                  <Tabs value={settlementDetails.type} onValueChange={(v) => setSettlementDetails({...settlementDetails, type: v as PaymentMethodType})} className="w-full">
                    <TabsList className="grid grid-cols-3 w-full h-14 bg-gray-50 rounded-2xl p-1">
                      <TabsTrigger value="bank" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Bank</TabsTrigger>
                      <TabsTrigger value="wallet" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Wallet</TabsTrigger>
                      <TabsTrigger value="cash" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Cash</TabsTrigger>
                    </TabsList>
                    
                    <div className="mt-8">
                      <TabsContent value="bank" className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2 col-span-2">
                             <Label className="text-[9px] font-black uppercase tracking-widest text-[#010307]/30">Account Holder Name</Label>
                             <Input 
                                value={settlementDetails.accountName}
                                onChange={(e) => setSettlementDetails({...settlementDetails, accountName: e.target.value})}
                                className="h-12 rounded-xl border-none bg-gray-50 font-bold lowercase italic"
                                placeholder="..."
                             />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[9px] font-black uppercase tracking-widest text-[#010307]/30">Bank Name</Label>
                             <Input 
                                value={settlementDetails.bankName}
                                onChange={(e) => setSettlementDetails({...settlementDetails, bankName: e.target.value})}
                                className="h-12 rounded-xl border-none bg-gray-50 font-bold lowercase italic"
                                placeholder="NIC Asia, NABIL, etc."
                             />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[9px] font-black uppercase tracking-widest text-[#010307]/30">Account Number</Label>
                             <Input 
                                value={settlementDetails.accountNumber}
                                onChange={(e) => setSettlementDetails({...settlementDetails, accountNumber: e.target.value})}
                                className="h-12 rounded-xl border-none bg-gray-50 font-bold italic"
                                placeholder="..."
                             />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[9px] font-black uppercase tracking-widest text-[#010307]/30">Branch</Label>
                             <Input 
                                value={settlementDetails.branchName}
                                onChange={(e) => setSettlementDetails({...settlementDetails, branchName: e.target.value})}
                                className="h-12 rounded-xl border-none bg-gray-50 font-bold lowercase italic"
                             />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[9px] font-black uppercase tracking-widest text-[#010307]/30">SWIFT (Optional)</Label>
                             <Input 
                                value={settlementDetails.swiftCode}
                                onChange={(e) => setSettlementDetails({...settlementDetails, swiftCode: e.target.value})}
                                className="h-12 rounded-xl border-none bg-gray-50 font-bold uppercase"
                             />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="wallet" className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase tracking-widest text-[#010307]/30">Wallet Provider</Label>
                              <Input 
                                 value={settlementDetails.walletProvider}
                                 onChange={(e) => setSettlementDetails({...settlementDetails, walletProvider: e.target.value})}
                                 className="h-12 rounded-xl border-none bg-gray-50 font-bold lowercase italic"
                                 placeholder="eSewa, Khalti, etc."
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[9px] font-black uppercase tracking-widest text-[#010307]/30">Registered Number</Label>
                              <Input 
                                 value={settlementDetails.walletNumber}
                                 onChange={(e) => setSettlementDetails({...settlementDetails, walletNumber: e.target.value})}
                                 className="h-12 rounded-xl border-none bg-gray-50 font-bold italic"
                                 placeholder="98..."
                              />
                           </div>
                           <div className="space-y-2 col-span-2">
                              <Label className="text-[9px] font-black uppercase tracking-widest text-[#010307]/30">Account Name</Label>
                              <Input 
                                 value={settlementDetails.accountName}
                                 onChange={(e) => setSettlementDetails({...settlementDetails, accountName: e.target.value})}
                                 className="h-12 rounded-xl border-none bg-gray-50 font-bold lowercase italic"
                                 placeholder="..."
                              />
                           </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="cash" className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="p-8 bg-orange-50 rounded-2xl border border-orange-100/50 flex flex-col items-center text-center gap-4">
                           <Banknote className="w-10 h-10 text-[#FE7F2D]" />
                           <p className="text-xs font-bold text-[#FE7F2D] lowercase leading-relaxed">
                              Cash settlements will be handled physically at the club treasury. Please ensure you sign the payment voucher upon receipt.
                           </p>
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>

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
