"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle, Clock, RefreshCcw, DollarSign, Wallet, ArrowUpRight,
  CheckCircle2, AlertCircle, FileText, Printer, X, ChevronRight,
  Receipt, ShieldCheck, Banknote, TrendingUp, Landmark, Smartphone
} from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ─── Types ───────────────────────────────────────────────────────────────────

interface LiveSale {
  id: string
  brand_id: string
  month: number
  year: number
  gross_sales: number
  ppf_amount: number
  ppf_rate: number
  brands?: { business_name: string; bank_account_details?: any }
  
}

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
  brands?: { business_name: string; bank_account_details?: any }
}

interface RecentInvoice {
  id: string
  invoice_number: string
  created_at: string
  total_amount: number
  customer_name?: string
  brands?: { business_name: string }
}

// ─── Step types for the Complete Payout flow ─────────────────────────────────
type PayoutFlowStep = "report" | "confirm" | "statement"

export function PayoutsTracker() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [liveSales, setLiveSales] = useState<LiveSale[]>([])
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Payout flow state
  const [flowSale, setFlowSale] = useState<LiveSale | null>(null)   // for live sales
  const [flowPayout, setFlowPayout] = useState<Payout | null>(null) // for pending payouts
  const [flowStep, setFlowStep] = useState<PayoutFlowStep>("report")
  const [finalAmount, setFinalAmount] = useState("")
  const [paymentRef, setPaymentRef] = useState("")
  const [adminNotes, setAdminNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [completedPayout, setCompletedPayout] = useState<Payout | null>(null)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  // Derived Stats
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  // Only count current month for the "Live Flow" ticker, but use all for the total due
  const currentMonthSales = liveSales.filter(s => s.month === currentMonth && s.year === currentYear)
  const totalMonthGross = currentMonthSales.reduce((s, x) => s + (x.gross_sales || 0), 0)
  
  const totalLiveGross = liveSales.reduce((s, x) => s + (x.gross_sales || 0), 0)
  const totalLiveDue = liveSales.reduce((sum, s) => sum + (s.gross_sales - (s.ppf_amount || 0)), 0)

  const [viewPayout, setViewPayout] = useState<Payout | null>(null)

  const printRef = useRef<HTMLDivElement | null>(null)

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    setIsSyncing(true)
    try {
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear()

      const { data: payoutData } = await supabase
        .from("payouts")
        .select("*, brands(business_name, bank_account_details)")
        .order("year", { ascending: false })
        .order("month", { ascending: false })

      const { data: salesData } = await supabase
        .from("brand_sales")
        .select("*, brands(business_name, bank_account_details)")

      const { data: latestInvoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, created_at, total_amount, customer_name, brands(business_name)")
        .order("created_at", { ascending: false })
        .limit(10)

      const payoutsResult = (payoutData || []) as Payout[]
      
      // Filter out live sales that already have an associated payout record
      const finalizedIds = new Set(payoutsResult.map(p => `${p.brand_id}-${p.month}-${p.year}`))
      const filteredLiveSales = (salesData || []).filter(s => !finalizedIds.has(`${s.brand_id}-${s.month}-${s.year}`))

      // Final sort: latest year, latest month
      const sortedLiveSales = (filteredLiveSales as LiveSale[]).sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year
        return b.month - a.month
      })

      setPayouts(payoutsResult)
      setLiveSales(sortedLiveSales)
      setRecentInvoices((latestInvoices || []) as unknown as RecentInvoice[])
      setLastSynced(now)
    } catch (err) {
      console.error("Fetch failed", err)
      toast.error("Failed to sync latest financial data.")
    } finally {
      setLoading(false)
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleGeneratePayouts = async () => {
    setIsGenerating(true)
    try {
      const now = new Date()
      const month = now.getMonth() === 0 ? 12 : now.getMonth()
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
      const { error } = await supabase.rpc("generate_monthly_payouts", { p_month: month, p_year: year })
      if (error) throw error
      toast.success(`Payout ledger for ${month}/${year} synchronized.`)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to generate payouts")
    } finally {
      setIsGenerating(false)
    }
  }

  // Open the payout flow for a live sale
  const openFlowForSale = (sale: LiveSale) => {
    setFlowSale(sale)
    setFlowPayout(null)
    setFinalAmount((sale.gross_sales - sale.ppf_amount).toString())
    setPaymentRef("")
    setAdminNotes("")
    setFlowStep("report")
  }

  // Open the payout flow for a pending payout record
  const openFlowForPayout = (payout: Payout) => {
    setFlowPayout(payout)
    setFlowSale(null)
    setFinalAmount(payout.net_payout.toString())
    setPaymentRef("")
    setAdminNotes(payout.admin_notes || "")
    setFlowStep("report")
  }

  const closeFlow = () => {
    setFlowSale(null)
    setFlowPayout(null)
    setCompletedPayout(null)
    setFlowStep("report")
  }

  // The active record for the flow (either sale or payout)
  const activeFlowData = flowSale || flowPayout
  const activeGross = flowSale?.gross_sales ?? flowPayout?.gross_sales ?? 0
  const activePPF = flowSale?.ppf_amount ?? flowPayout?.ppf_amount ?? 0
  const activeNet = parseFloat(finalAmount) || (activeGross - activePPF)
  const activeBrandName = flowSale?.brands?.business_name ?? flowPayout?.brands?.business_name ?? ""
  const activePeriod = flowSale
    ? `${flowSale.month}/${flowSale.year}`
    : flowPayout ? `${flowPayout.month}/${flowPayout.year}` : ""

  const handleCompletePayment = async () => {
    if (!activeFlowData) return
    setIsSubmitting(true)
    try {
      const now = new Date()
      let finalRecord: Payout | null = null

      if (flowPayout) {
        // Update existing payout record
        const { data, error } = await supabase
          .from("payouts")
          .update({
            status: "paid",
            paid_at: now.toISOString(),
            net_payout: parseFloat(finalAmount),
            admin_notes: [adminNotes, paymentRef ? `Ref: ${paymentRef}` : ""].filter(Boolean).join(" | ") || null,
          })
          .eq("id", flowPayout.id)
          .select("*, brands(business_name, bank_account_details)")
          .single()

        if (error) throw error
        finalRecord = data as Payout
      } else if (flowSale) {
        // Generate payout from live sale, then mark paid
        const month = flowSale.month
        const year = flowSale.year
        await supabase.rpc("generate_monthly_payouts", { p_month: month, p_year: year })

        const { data: newPayout, error: fetchErr } = await supabase
          .from("payouts")
          .select("*, brands(business_name, bank_account_details)")
          .eq("brand_id", flowSale.brand_id)
          .eq("month", month)
          .eq("year", year)
          .single()

        if (fetchErr || !newPayout) throw new Error("Could not locate generated payout record.")

        const { data, error } = await supabase
          .from("payouts")
          .update({
            status: "paid",
            paid_at: now.toISOString(),
            net_payout: parseFloat(finalAmount),
            admin_notes: [adminNotes, paymentRef ? `Ref: ${paymentRef}` : ""].filter(Boolean).join(" | ") || null,
          })
          .eq("id", (newPayout as Payout).id)
          .select("*, brands(business_name, bank_account_details)")
          .single()

        if (error) throw error
        finalRecord = data as Payout
      }

      if (finalRecord) {
        setCompletedPayout(finalRecord)
        setFlowStep("statement")
        toast.success(`Payout completed for ${activeBrandName}`)
        fetchData()
      }
    } catch (err: any) {
      toast.error(err.message || "Payment finalization failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUndoSettlement = async (payoutId: string) => {
    if (!confirm("Reverse this settlement? The status will revert to pending.")) return
    try {
      const { error } = await supabase
        .from("payouts")
        .update({ status: "pending", paid_at: null })
        .eq("id", payoutId)
      if (error) throw error
      toast.success("Settlement reversed.")
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Reversal failed")
    }
  }

  const handleRedoPayout = async (month: number, year: number) => {
    setIsGenerating(true)
    try {
      const { error } = await supabase.rpc("generate_monthly_payouts", { p_month: month, p_year: year })
      if (error) throw error
      toast.success(`Ledger for ${month}/${year} recalculated.`)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Recalculation failed")
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrint = (ref: React.RefObject<HTMLDivElement | null>) => {
    const content = ref.current
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
      td{padding:16px 12px;border-bottom:1px solid #f4f4f5;font-size:13px;font-weight:700}
      .total td{border-top:2px solid #010307;border-bottom:none;font-size:22px;font-weight:900;font-style:italic}
      .footer{margin-top:50px;font-size:9px;text-transform:lowercase;color:#d4d4d8;text-align:center}
      @media print{.no-print{display:none}}
    </style></head><body>${content.innerHTML}<script>window.onload=()=>{window.print();window.close()}<\/script></body></html>`)
    w.document.close()
  }

  // ─── Render Helpers ─────────────────────────────────────────────────────────

  const renderSettlementDetails = (details: any) => {
    if (!details) return (
      <div className="flex items-center gap-3 text-amber-500/50 italic bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
        <AlertCircle className="w-5 h-5" />
        <span className="text-xs font-bold uppercase tracking-tight">No disbursement profile configured by brand</span>
      </div>
    )
    
    const type = details.type || "bank"
    
    if (type === "bank") {
      return (
        <div className="flex items-center gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50">
          <Landmark className="w-6 h-6 text-emerald-600" />
          <div className="flex flex-col">
            <div className="text-sm font-black italic text-gray-900">{details.bankName || 'Standard Bank Transfer'}</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {details.accountNumber} • {details.accountName}
            </div>
            {details.branchName && <div className="text-[9px] text-gray-400 italic mt-0.5">Branch: {details.branchName}</div>}
          </div>
        </div>
      )
    }
    
    if (type === "wallet") {
      return (
        <div className="flex items-center gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
          <Smartphone className="w-6 h-6 text-blue-500" />
          <div className="flex flex-col">
            <div className="text-sm font-black italic text-gray-900 uppercase tracking-tight">{details.walletProvider || 'Digital Wallet'}</div>
            <div className="text-[10px] font-bold text-gray-500 tabular-nums">
              {details.walletNumber} • {details.accountName}
            </div>
          </div>
        </div>
      )
    }

    if (type === "cash") {
      return (
        <div className="flex items-center gap-4 bg-orange-50/50 p-4 rounded-xl border border-orange-100/50">
          <Banknote className="w-6 h-6 text-orange-500" />
          <div className="flex flex-col">
            <div className="text-sm font-black italic text-gray-900 uppercase tracking-tight">Physical Cash Disbursement</div>
            <div className="text-[10px] font-bold text-orange-600/60 uppercase tracking-widest">To be settled at Club Treasury</div>
          </div>
        </div>
      )
    }

    return null
  }

  // ─── Derived totals ─────────────────────────────────────────────────────────

  const printRef2 = useRef<HTMLDivElement | null>(null)

  // ─── Flow open state ────────────────────────────────────────────────────────
  const isFlowOpen = !!(flowSale || flowPayout)

  if (loading && !isSyncing) {
    return (
      <div className="p-20 text-center animate-pulse">
        <RefreshCcw className="w-12 h-12 mx-auto text-gray-200 animate-spin" />
        <p className="mt-4 text-gray-400 font-black uppercase tracking-widest text-xs">Syncing Ledger...</p>
      </div>
    )
  }

  // ─── Statement panel (for viewing existing settled payouts) ─────────────────
  const StatementView = ({ payout, printRef }: { payout: Payout; printRef: React.RefObject<HTMLDivElement | null> }) => (
    <div ref={printRef} className="space-y-8">
      <div className="flex justify-between items-end border-b-2 border-[#010307] pb-6">
        <div>
          <div className="text-3xl font-black italic tracking-tighter">THC Club</div>
          <p className="text-[8px] font-black uppercase tracking-widest text-[#010307]/30">Internal Treasury Control</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-black uppercase tracking-widest text-[#FE7F2D]">Payout Statement</div>
          <p className="text-[10px] font-bold tabular-nums">Ref: #{payout.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-[10px] font-bold text-[#010307]/30 uppercase tracking-widest">
            {new Date(payout.paid_at || Date.now()).toLocaleDateString("en-NP")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10">
        <div className="space-y-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Beneficiary Brand</div>
            <div className="text-base font-black italic">{payout.brands?.business_name}</div>
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Cycle Period</div>
            <div className="text-base font-bold tabular-nums">{payout.month}/{payout.year}</div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Disbursement Profile</div>
            <div className="text-sm font-medium italic text-gray-600">
               {payout.brands?.bank_account_details?.type === 'cash' ? (
                 "Cash Settlement"
               ) : payout.brands?.bank_account_details?.type === 'wallet' ? (
                 `${payout.brands.bank_account_details.walletProvider} • ${payout.brands.bank_account_details.walletNumber}`
               ) : payout.brands?.bank_account_details?.bankName ? (
                 `${payout.brands.bank_account_details.bankName} • ${payout.brands.bank_account_details.accountNumber}`
               ) : (
                 "manual settlement (verify records)"
               )}
            </div>
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Settlement Status</div>
            <div className="text-sm font-black text-green-600 italic">
              Settled on {new Date(payout.paid_at || Date.now()).toLocaleDateString()}
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
            <td className="py-4 px-3 font-bold text-sm border-b border-gray-50">Aggregated Gross Sales</td>
            <td className="py-4 px-3 font-bold text-sm text-right border-b border-gray-50">{payout.gross_sales.toLocaleString()}</td>
          </tr>
          <tr>
            <td className="py-4 px-3 font-bold text-sm border-b border-gray-50">Payment Processing Fee (PPF)</td>
            <td className="py-4 px-3 font-bold text-sm text-right border-b border-gray-50 text-red-400">−{(payout.ppf_amount || 0).toLocaleString()}</td>
          </tr>
          {payout.admin_notes && (
            <tr>
              <td className="py-4 px-3 text-xs italic text-gray-400 border-b border-gray-50" colSpan={2}>
                Note: {payout.admin_notes}
              </td>
            </tr>
          )}
          <tr className="border-t-2 border-[#010307]">
            <td className="py-5 px-3 font-black text-xl italic">Net Disbursement Amount</td>
            <td className="py-5 px-3 font-black text-xl italic text-right text-[#FE7F2D]">NPR {payout.net_payout.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div className="text-center text-[9px] font-bold lowercase text-gray-300 pt-6 border-t border-gray-100">
        this is a computer generated electronic ledger record. no signature required.
      </div>
    </div>
  )

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
            <Wallet className="w-8 h-8 text-[#FE7F2D]" /> Payouts Terminal
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500 font-medium text-sm">Real-time settlement aggregator and financial reconciliation.</p>
            {lastSynced && (
               <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-50 rounded-full border border-black/5">
                  <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-[8px] font-bold text-gray-400 uppercase">Synced {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
               </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={fetchData} disabled={isSyncing}
            className="rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest border-gray-200 hover:bg-gray-50 flex items-center gap-2">
            <RefreshCcw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} /> Sync Live
          </Button>
          <Button onClick={handleGeneratePayouts} disabled={isGenerating}
            className="bg-black text-white hover:bg-black/90 rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 flex-1 md:flex-none">
            <TrendingUp className="w-4 h-4" />
            {isGenerating ? "Finalizing..." : "Finalize Last Month"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <Card className="border-none shadow-xl rounded-[2rem] sm:rounded-[2.5rem] bg-white p-6 sm:p-8 border border-gray-100 group hover:scale-[1.02] transition-transform">
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-xl sm:rounded-2xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-[#FE7F2D]" />
            </div>
            <Badge className="bg-orange-100 text-orange-700 border-none font-black uppercase text-[8px] px-2 sm:px-3 tracking-widest leading-relaxed">Live Flow</Badge>
          </div>
          <p className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 font-mono">Current Month Flux</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tighter italic">NPR {totalMonthGross.toLocaleString()}</h3>
        </Card>

        <Card className="border-none shadow-xl rounded-[2rem] sm:rounded-[2.5rem] bg-white p-6 sm:p-8 border border-gray-100 group hover:scale-[1.02] transition-transform">
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-xl sm:rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <Badge className="bg-green-100 text-green-700 border-none font-black uppercase text-[8px] px-2 sm:px-3 tracking-widest leading-relaxed">Est. Payout</Badge>
          </div>
          <p className="text-[9px] sm:text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1 font-mono">Net Brand Revenue</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tighter italic">NPR {totalLiveDue.toLocaleString()}</h3>
        </Card>

        <Card className="border-none shadow-xl rounded-[2rem] sm:rounded-[2.5rem] bg-black text-white p-6 sm:p-8 group hover:scale-[1.02] transition-transform">
          <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-xl sm:rounded-2xl flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6 text-[#FE7F2D]" />
            </div>
            <Badge className="bg-[#FE7F2D] text-white border-none font-black uppercase text-[8px] px-2 sm:px-3 tracking-widest leading-relaxed">Club Profit</Badge>
          </div>
          <p className="text-[9px] sm:text-[10px] font-black uppercase text-white/40 tracking-widest mb-1 font-mono">PPF Stream</p>
          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tighter italic">NPR {(totalLiveGross - totalLiveDue).toLocaleString()}</h3>
        </Card>
      </div>

      {/* ── Tabs Navigation ── */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-white/50 backdrop-blur-md p-1 rounded-2xl h-auto flex flex-col sm:flex-row w-full md:w-fit border border-black/5 shadow-sm mb-8 gap-2">
          <TabsTrigger value="pending" className="rounded-xl font-black uppercase text-[10px] tracking-widest px-4 sm:px-8 py-3 w-full sm:w-auto data-[state=active]:bg-black data-[state=active]:text-white transition-all">
            <Clock className="w-4 h-4 mr-2" /> Pending Settlements
          </TabsTrigger>
          <TabsTrigger value="ledger" className="rounded-xl font-black uppercase text-[10px] tracking-widest px-4 sm:px-8 py-3 w-full sm:w-auto data-[state=active]:bg-[#FE7F2D] data-[state=active]:text-white transition-all">
            <ShieldCheck className="w-4 h-4 mr-2" /> Finalized Ledger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-12 animate-in fade-in slide-in-from-left-4 duration-500">
           {/* ── Pending Settlements (Live) ── */}
           <div className="space-y-6">
            <h3 className="text-xl font-black tracking-tighter uppercase italic px-2 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-gray-400" /> Pending Settlements (Live)
            </h3>
            <Card className="border-none shadow-2xl rounded-[2rem] sm:rounded-[3rem] bg-white overflow-hidden border border-gray-50">
              <div className="table-responsive">
                <Table>
                  <TableHeader className="bg-gray-50/50">
                  <TableRow className="border-none whitespace-nowrap">
                    <TableHead className="px-6 sm:px-10 py-4 sm:py-6 font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-gray-400">Brand Partner</TableHead>
                    <TableHead className="py-4 sm:py-6 font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-gray-400">Period</TableHead>
                    <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Gross Sales</TableHead>
                    <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">PPF (Fee)</TableHead>
                    <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Net Due</TableHead>
                    <TableHead className="px-10 py-6 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-50">
                  {liveSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-24 text-gray-300 italic font-medium">
                        No sales recorded for the current cycle.
                      </TableCell>
                    </TableRow>
                  ) : liveSales.map(sale => (
                    <TableRow key={sale.id} className="group hover:bg-gray-50/30 transition-colors">
                      <TableCell className="px-6 sm:px-10 py-4 sm:py-6">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-[10px] sm:rounded-xl flex items-center justify-center font-black text-gray-400 font-mono tracking-tighter">
                              {sale.brands?.business_name?.substring(0, 2).toUpperCase() || "XX"}
                            </div>
                            <div>
                              <div className="font-black text-gray-900 text-xs sm:text-sm">{sale.brands?.business_name}</div>
                              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Id: {sale.brand_id.substring(0, 8)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 sm:py-6">
                          <Badge className="bg-black text-white font-black uppercase text-[8px] sm:text-[9px] rounded-lg tracking-widest border-none px-2 sm:px-3">
                            {sale.month}/{sale.year}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 sm:py-6 text-gray-900 font-bold whitespace-nowrap text-xs sm:text-sm">NPR {(sale.gross_sales || 0).toLocaleString()}</TableCell>
                        <TableCell className="py-4 sm:py-6">
                           <div className="flex items-center gap-1.5 sm:gap-2">
                             <div className="px-1.5 sm:px-2 py-0.5 bg-red-50 text-red-600 rounded text-[9px] sm:text-[10px] font-black italic border border-red-100/50">
                                {sale.ppf_rate}% PPF
                             </div>
                             <span className="text-red-500 font-bold whitespace-nowrap text-xs sm:text-sm">-NPR {Math.round(sale.ppf_amount || 0).toLocaleString()}</span>
                           </div>
                        </TableCell>
                        <TableCell className="text-right px-6 sm:px-10 py-4 sm:py-6">
                                <div className="flex items-center justify-end">
                                  <Button 
                                    className="bg-black text-white hover:bg-black/90 font-black uppercase text-[9px] sm:text-[10px] tracking-widest px-4 sm:px-6 h-10 w-full rounded-xl transition-all active:scale-95 group/btn overflow-visible"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFlowSale(sale);
                                      setFlowStep("report");
                                    }}
                                  >
                                    <span className="text-base sm:text-lg italic tracking-tighter shrink-0">Settle</span>
                                    <div className="flex flex-col items-end leading-none ml-2">
                                       <span className="text-[8px] text-white/50 w-full text-right truncate">NPR {Math.round((sale.gross_sales || 0) - (sale.ppf_amount || 0)).toLocaleString()}</span>
                                    </div>
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </div>
            </TabsContent>
  
            <TabsContent value="ledger" className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* ── Finalized Payouts ── */}
              <div className="space-y-6">
                 <div className="flex justify-between items-center">
                   <h3 className="text-xl font-black tracking-tighter uppercase italic px-2 flex items-center gap-3">
                     <ShieldCheck className="w-5 h-5 text-green-500" /> Settled Treasury Ledger
                   </h3>
                   <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                     Historical Records
                   </div>
                 </div>
                 <Card className="border-none shadow-xl rounded-[2rem] sm:rounded-[3rem] bg-white overflow-hidden border border-gray-100">
                    <div className="table-responsive">
                      <Table>
                      <TableHeader className="bg-gray-50/50">
                        <TableRow className="border-none whitespace-nowrap">
                          <TableHead className="px-6 sm:px-10 py-4 sm:py-6 font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-gray-400">Brand Partner</TableHead>
                          <TableHead className="py-4 sm:py-6 font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-gray-400">Record Info</TableHead>
                          <TableHead className="text-right px-6 sm:px-10 py-4 sm:py-6 font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-gray-400">Ledger Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payouts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-16 sm:py-24">
                              <span className="text-gray-300 italic font-medium">Treasury archive is currently empty.</span>
                            </TableCell>
                          </TableRow>
                        ) : payouts.filter(p => p.status === 'paid').map(po => (
                          <TableRow key={po.id} className="group hover:bg-gray-50/30 transition-colors">
                            <TableCell className="px-6 sm:px-10 py-4 sm:py-6">
                              <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-[10px] sm:rounded-xl flex items-center justify-center font-black text-gray-400 font-mono tracking-tighter">
                                  {po.brands?.business_name?.substring(0, 2).toUpperCase() || "XX"}
                                </div>
                                <div>
                                  <div className="font-black text-gray-900 text-xs sm:text-sm">{po.brands?.business_name}</div>
                                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Id: {po.brand_id.substring(0, 8)}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-4 sm:py-6">
                              <div className="flex flex-col">
                                <Badge className="bg-green-500 text-white font-black uppercase text-[8px] sm:text-[9px] rounded-lg tracking-widest border-none px-2 sm:px-3 w-fit">
                                  {po.month}/{po.year}
                                </Badge>
                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                                  Settled: {new Date(po.paid_at!).toLocaleDateString()}
                                </div>
                                <div className="text-sm font-black text-green-700 italic mt-1">
                                  NPR {po.net_payout.toLocaleString()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right px-6 sm:px-10 py-4 sm:py-6">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100"
                                  onClick={() => setViewPayout(po)} title="View Statement">
                                  <Receipt className="w-4 h-4 text-[#010307]/40 hover:text-[#010307]" />
                                </Button>
                                <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full hover:text-red-500"
                                  onClick={() => handleUndoSettlement(po.id)} title="Undo Settlement">
                                  <RefreshCcw className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
                </div>
              </TabsContent>
        <TabsContent value="pending" className="space-y-12 animate-in fade-in slide-in-from-left-4 duration-500">
           {/* ── Pending Settlements (Live) ── */}
           <div className="space-y-6">
            <h3 className="text-xl font-black tracking-tighter uppercase italic px-2 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-gray-400" /> Pending Settlements (Live)
            </h3>
            <Card className="border-none shadow-2xl rounded-[2rem] sm:rounded-[3rem] bg-white overflow-hidden border border-gray-50 table-responsive">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="border-none whitespace-nowrap">
                    <TableHead className="px-6 sm:px-10 py-4 sm:py-6 font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-gray-400">Brand Partner</TableHead>
                    <TableHead className="py-4 sm:py-6 font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-gray-400">Period</TableHead>
                    <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Gross Sales</TableHead>
                    <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">PPF (Fee)</TableHead>
                    <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Net Due</TableHead>
                    <TableHead className="px-10 py-6 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-50">
                  {liveSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-24 text-gray-300 italic font-medium">
                        No sales recorded for the current cycle.
                      </TableCell>
                    </TableRow>
                  ) : liveSales.map(sale => (
                    <TableRow key={sale.id} className="group hover:bg-gray-50/30 transition-colors">
                      <TableCell className="px-10 py-8">
                        <div className="flex flex-col">
                          <span className="font-black text-gray-900 italic uppercase">{sale.brands?.business_name}</span>
                          <div className="mt-1">
                            {sale.brands?.bank_account_details ? (
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#FE7F2D] uppercase tracking-tighter">
                                {sale.brands.bank_account_details.type === 'bank' && <Landmark className="w-3 h-3" />}
                                {sale.brands.bank_account_details.type === 'wallet' && <Smartphone className="w-3 h-3" />}
                                {sale.brands.bank_account_details.type === 'cash' && <Banknote className="w-3 h-3" />}
                                {sale.brands.bank_account_details.type === 'cash' 
                                  ? "Cash" 
                                  : sale.brands.bank_account_details.type === 'wallet'
                                    ? `${sale.brands.bank_account_details.walletProvider || 'Wallet'} (${sale.brands.bank_account_details.walletNumber || '?'})`
                                    : `${sale.brands.bank_account_details.bankName || 'Bank'} (...${(sale.brands.bank_account_details.accountNumber || '').slice(-4)})`
                                }
                              </div>
                            ) : (
                              <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter italic">No account configured</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-8 font-bold text-xs text-gray-500 tabular-nums">{sale.month}/{sale.year}</TableCell>
                      <TableCell className="py-8 font-bold text-sm">NPR {sale.gross_sales.toLocaleString()}</TableCell>
                      <TableCell className="py-8 font-black text-xs text-red-400">NPR {(sale.ppf_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="py-8 font-black text-[#FE7F2D] text-lg italic">
                        NPR {(sale.gross_sales - (sale.ppf_amount || 0)).toLocaleString()}
                      </TableCell>
                      <TableCell className="px-10 py-8 text-right">
                        <Button
                          size="sm"
                          onClick={() => openFlowForSale(sale)}
                          className="bg-[#010307] text-white hover:bg-[#FE7F2D] rounded-xl h-10 px-5 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                          <Banknote className="w-3.5 h-3.5" /> Complete Payout
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* ── Pending (Finalized but not paid) ── */}
          <div className="space-y-6">
            <h3 className="text-xl font-black tracking-tighter uppercase italic px-2 flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" /> Finalized Accruals (Pending Payment)
            </h3>
            <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-gray-50">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="border-none">
                    <TableHead className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Partner</TableHead>
                    <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Period</TableHead>
                    <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400 text-center">Amount Due</TableHead>
                    <TableHead className="px-10 py-6 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-50">
                  {payouts.filter(p => p.status === 'pending').length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-24 text-gray-300 italic font-medium">
                        No localized pending payouts found.
                      </TableCell>
                    </TableRow>
                  ) : payouts.filter(p => p.status === 'pending').map(po => (
                    <TableRow key={po.id} className="group hover:bg-gray-50/30 transition-colors">
                      <TableCell className="px-10 py-8 font-black text-gray-900 italic uppercase">
                        {po.brands?.business_name}
                      </TableCell>
                      <TableCell className="py-8 font-bold text-xs text-gray-500 tabular-nums">{po.month}/{po.year}</TableCell>
                      <TableCell className="py-8 font-black text-orange-600 text-lg italic text-center">NPR {po.net_payout.toLocaleString()}</TableCell>
                      <TableCell className="px-10 py-8 text-right">
                        <Button size="sm" variant="outline"
                          className="rounded-xl h-10 px-5 font-black text-[10px] uppercase tracking-widest text-[#FE7F2D] border-orange-100 hover:bg-orange-50 flex items-center gap-1"
                          onClick={() => openFlowForPayout(po)}>
                          <Banknote className="w-3.5 h-3.5" /> Release Payment
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          {/* ── Recent POS Activity ── */}
          <div className="space-y-6 pt-10 border-t border-gray-100">
            <h3 className="text-xl font-black tracking-tighter uppercase italic px-2 flex items-center gap-3">
              <Receipt className="w-5 h-5 text-gray-400" /> Recent Store Activity
            </h3>
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white/40 overflow-hidden border border-white/60">
              <div className="table-responsive">
                <Table>
                <TableHeader>
                  <TableRow className="border-none whitespace-nowrap">
                    <TableHead className="px-10 py-5 font-black text-[9px] uppercase tracking-widest text-gray-400">Timestamp</TableHead>
                    <TableHead className="py-5 font-black text-[9px] uppercase tracking-widest text-gray-400">Partner</TableHead>
                    <TableHead className="py-5 font-black text-[9px] uppercase tracking-widest text-gray-400">Invoice</TableHead>
                    <TableHead className="text-right px-6 sm:px-10 py-4 sm:py-6 font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-gray-400">Net Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16 sm:py-24">
                        <span className="text-gray-300 italic text-xs">No recent transactions synced.</span>
                      </TableCell>
                    </TableRow>
                  ) : recentInvoices.map(inv => (
                    <TableRow key={inv.id} className="border-0">
                      <TableCell className="px-10 py-4 font-mono text-[10px] text-gray-400">
                        {new Date(inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </TableCell>
                      <TableCell className="py-4 text-[10px] font-black uppercase italic text-gray-900">{inv.brands?.business_name}</TableCell>
                      <TableCell className="py-4 text-[10px] font-bold text-gray-400">{inv.invoice_number}</TableCell>
                      <TableCell className="py-4 text-right pr-10 font-bold text-xs">NPR {inv.total_amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
            <p className="text-[10px] text-gray-400 font-medium italic text-center">showing last 10 live invoices across all brand partners.</p>
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <h3 className="text-xl font-black tracking-tighter uppercase italic px-2 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-gray-400" /> Finalized Settlement Ledger
          </h3>
          <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-gray-50">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="border-none">
                  <TableHead className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Partner</TableHead>
                  <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Period</TableHead>
                  <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400 text-center">Settled Amount</TableHead>
                  <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400 text-center">Date</TableHead>
                  <TableHead className="px-10 py-6 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-50">
                {payouts.filter(p => p.status === 'paid').length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-32 text-gray-300 italic font-medium">
                      Treasury archive is currently empty.
                    </TableCell>
                  </TableRow>
                ) : payouts.filter(p => p.status === 'paid').map(po => (
                  <TableRow key={po.id} className="group hover:bg-gray-50/30 transition-colors">
                    <TableCell className="px-10 py-8 font-black text-gray-900 italic uppercase">{po.brands?.business_name}</TableCell>
                    <TableCell className="py-8 font-bold text-xs text-gray-500 tabular-nums">{po.month}/{po.year}</TableCell>
                    <TableCell className="py-8 font-black text-green-700 text-lg italic text-center">NPR {po.net_payout.toLocaleString()}</TableCell>
                    <TableCell className="py-8 text-center text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">
                      {new Date(po.paid_at!).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-10 py-8 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100"
                          onClick={() => setViewPayout(po)} title="View Statement">
                          <Receipt className="w-4 h-4 text-[#010307]/40 hover:text-[#010307]" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full hover:text-red-500"
                          onClick={() => handleUndoSettlement(po.id)} title="Undo Settlement">
                          <RefreshCcw className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════════════════
          COMPLETE PAYOUT FLOW DIALOG (3 steps)
          ════════════════════════════════════════════════════════ */}
      <Dialog open={isFlowOpen} onOpenChange={(open) => !open && closeFlow()}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 focus:outline-none">
          {/* Step indicator */}
          <div className="bg-[#010307] px-10 py-8">
            <div className="flex items-center gap-3 mb-4">
              {(["report", "confirm", "statement"] as PayoutFlowStep[]).map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    flowStep === step
                      ? "bg-[#FE7F2D] text-white"
                      : ["statement"].includes(flowStep) && step === "report"
                        ? "bg-white/20 text-white/60"
                        : flowStep === "statement" && step === "confirm"
                          ? "bg-white/20 text-white/60"
                          : flowStep === "confirm" && step === "report"
                            ? "bg-white/20 text-white/60"
                            : "bg-white/10 text-white/30"
                  }`}>
                    {flowStep === "statement" || (flowStep === "confirm" && step === "report") ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (i + 1)}
                  </div>
                  {i < 2 && <ChevronRight className="w-4 h-4 text-white/20" />}
                </div>
              ))}
            </div>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-white">
              {flowStep === "report" && "Payout Report"}
              {flowStep === "confirm" && "Confirm & Release"}
              {flowStep === "statement" && "Payment Complete"}
            </DialogTitle>
            <DialogDescription className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">
              {activeBrandName} · {activePeriod}
            </DialogDescription>
          </div>

          {/* ── Step 1: Detailed Report ── */}
          {flowStep === "report" && (
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Gross Sales", value: `NPR ${activeGross.toLocaleString()}`, color: "text-gray-900" },
                  { label: "PPF Deducted", value: `– NPR ${activePPF.toLocaleString()}`, color: "text-red-400" },
                  { label: "Net Due", value: `NPR ${(activeGross - activePPF).toLocaleString()}`, color: "text-[#FE7F2D]" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-2xl p-5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">{label}</p>
                    <p className={`text-xl font-black italic ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Disbursement Profile</p>
                {renderSettlementDetails((flowSale?.brands || flowPayout?.brands)?.bank_account_details)}
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs font-bold text-amber-700">
                  This will finalize and record the payout. Once confirmed, a statement will be generated and visible to the brand in their dashboard.
                </p>
              </div>

              <div className="flex gap-4">
                <Button variant="ghost" onClick={closeFlow}
                  className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400">
                  Cancel
                </Button>
                <Button onClick={() => setFlowStep("confirm")}
                  className="flex-1 h-14 bg-[#010307] text-white hover:bg-[#FE7F2D] rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                  Proceed to Confirm <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 2: Confirm & Release ── */}
          {flowStep === "confirm" && (
            <div className="p-10 space-y-8">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Final Payout Amount (NPR)</Label>
                  <Input
                    type="number"
                    value={finalAmount}
                    onChange={(e) => setFinalAmount(e.target.value)}
                    className="h-14 rounded-2xl border-gray-100 font-bold text-lg bg-gray-50 focus:bg-white transition-all"
                  />
                  <p className="text-[9px] text-gray-400 font-medium italic">
                    Pre-filled from ledger. Adjust only if agreed otherwise with the brand.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment Reference / Tx ID</Label>
                  <Input
                    placeholder="e.g. eSewa Tx #8291, Bank Ref, etc."
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="h-14 rounded-2xl border-gray-100 font-bold bg-gray-50 focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Admin Notes (optional)</Label>
                  <Input
                    placeholder="Internal notes for this settlement"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="h-14 rounded-2xl border-gray-100 font-bold bg-gray-50 focus:bg-white transition-all italic"
                  />
                </div>
              </div>

              <div className="bg-[#010307] rounded-2xl p-6 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/40">You are about to release</p>
                  <p className="text-3xl font-black italic text-[#FE7F2D] tracking-tighter">NPR {parseFloat(finalAmount || "0").toLocaleString()}</p>
                </div>
                <ShieldCheck className="w-10 h-10 text-white/10" />
              </div>

              <div className="flex gap-4">
                <Button variant="ghost" onClick={() => setFlowStep("report")}
                  className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400">
                  Back
                </Button>
                <Button
                  onClick={handleCompletePayment}
                  disabled={isSubmitting || !finalAmount}
                  className="flex-1 h-14 bg-[#FE7F2D] text-white hover:bg-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {isSubmitting ? (
                    <RefreshCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Release Payment</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 3: Statement ── */}
          {flowStep === "statement" && completedPayout && (
            <div className="p-10">
              <div className="flex items-center gap-4 mb-8 bg-green-50 rounded-2xl p-5">
                <div className="w-12 h-12 bg-green-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20 shrink-0">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-black italic lowercase">Payment Released Successfully</h3>
                  <p className="text-green-700/60 text-[10px] font-black uppercase tracking-widest">
                    Statement archived. Brand can view this in their dashboard.
                  </p>
                </div>
              </div>

              {completedPayout && <StatementView payout={completedPayout!} printRef={printRef} />}

              <div className="flex gap-4 pt-8 border-t border-gray-100">
                <Button onClick={() => handlePrint(printRef)}
                  className="flex-1 h-14 bg-[#FE7F2D] text-white hover:bg-black rounded-2xl font-black lowercase italic tracking-widest shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2 transition-all">
                  <Printer className="w-5 h-5" /> print statement
                </Button>
                <Button variant="ghost" onClick={closeFlow}
                  className="flex-1 h-14 rounded-2xl font-black lowercase italic tracking-widest text-[#010307]/40">
                  close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── View existing statement dialog ── */}
      <Dialog open={!!viewPayout} onOpenChange={(open) => !open && setViewPayout(null)}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 focus:outline-none">
          <div className="bg-[#010307] px-10 py-8 flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-white">Payout Statement</DialogTitle>
              <DialogDescription className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">
                {viewPayout?.brands?.business_name} · {viewPayout?.month}/{viewPayout?.year}
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setViewPayout(null)} className="rounded-full text-white/40 hover:bg-white/10">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="p-10">
            {viewPayout && <StatementView payout={viewPayout!} printRef={printRef2} />}
            <div className="flex gap-4 pt-8 border-t border-gray-100">
              <Button onClick={() => handlePrint(printRef2)}
                className="flex-1 h-14 bg-[#FE7F2D] text-white hover:bg-black rounded-2xl font-black lowercase italic tracking-widest shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2 transition-all">
                <Printer className="w-5 h-5" /> print statement
              </Button>
              <Button variant="ghost" onClick={() => setViewPayout(null)}
                className="flex-1 h-14 rounded-2xl font-black lowercase italic tracking-widest text-[#010307]/40">
                close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
