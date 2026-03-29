"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import {
  AlertCircle,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Clock,
  Landmark,
  Printer,
  Receipt,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Wallet,
  X
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

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
  const [payoutInvoices, setPayoutInvoices] = useState<any[]>([])

  // ─── Search & Selection ───────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("")
  const [activeView, setActiveView] = useState<"pending" | "ledger">("pending")

  // Derived Stats
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  // 1. Live Sales (Unprocessed Accruals)
  const totalLiveGross = liveSales.reduce((s, x) => s + (x.gross_sales || 0), 0)
  const totalLiveDue = liveSales.reduce((sum, s) => sum + (s.gross_sales - (s.ppf_amount || 0)), 0)
  const totalLivePPF = totalLiveGross - totalLiveDue

  // 2. Finalized Pending (Waiting for Disbursement)
  const pendingPayouts = payouts.filter(p => p.status === 'pending')
  const totalFinalizedPendingGross = pendingPayouts.reduce((sum, p) => sum + p.gross_sales, 0)
  const totalFinalizedPendingNet = pendingPayouts.reduce((sum, p) => sum + p.net_payout, 0)
  const totalFinalizedPendingPPF = totalFinalizedPendingGross - totalFinalizedPendingNet

  // 3. Totals
  const grandTotalGross = totalLiveGross + totalFinalizedPendingGross
  const grandTotalNetDue = totalLiveDue + totalFinalizedPendingNet
  const grandTotalPPFAccrued = totalLivePPF + totalFinalizedPendingPPF

  const [viewPayout, setViewPayout] = useState<Payout | null>(null)
  const printRef = useRef<HTMLDivElement | null>(null)

  // Filtering
  const filteredLiveSales = liveSales.filter(s =>
    s.brands?.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const filteredPendingPayouts = pendingPayouts.filter(p =>
    p.brands?.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const filteredLedger = payouts.filter(p =>
    p.status === 'paid' && p.brands?.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  const syncToSettlements = async (month: number, year: number) => {
    try {
      const { data: pData } = await supabase.from("payouts").select("*").eq("month", month).eq("year", year)
      if (pData && pData.length > 0) {
        const syncData = pData.map(p => ({
          brand_id: p.brand_id,
          period_year: p.year,
          period_month: p.month,
          total_sales: p.gross_sales,
          ppf_deduction: p.ppf_amount || 0,
          net_payout: p.net_payout,
          status: p.status,
          paid_at: p.paid_at,
          bank_reference: p.admin_notes || "",
          admin_notes: p.admin_notes || ""
        }))
        await supabase.from("brand_settlements").upsert(syncData, { onConflict: 'brand_id, period_year, period_month' })
      }
    } catch (e) {
      console.error("Sync to settlements failed", e)
    }
  }

  useEffect(() => { fetchData() }, [fetchData])

  const fetchPayoutInvoices = async (brandId: string, month: number, year: number) => {
    const start = new Date(year, month - 1, 1).toISOString()
    const end = new Date(year, month, 0, 23, 59, 59).toISOString()
    const { data } = await supabase
      .from("invoices")
      .select("*, invoice_line_items(*)")
      .eq("brand_id", brandId)
      .eq("status", "paid")
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: true })
    setPayoutInvoices(data || [])
  }

  useEffect(() => {
    if (viewPayout) {
      fetchPayoutInvoices(viewPayout.brand_id, viewPayout.month, viewPayout.year)
    } else if (completedPayout && flowStep === "statement") {
      fetchPayoutInvoices(completedPayout.brand_id, completedPayout.month, completedPayout.year)
    } else {
      setPayoutInvoices([])
    }
  }, [viewPayout, completedPayout, flowStep])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleGeneratePayouts = async () => {
    setIsGenerating(true)
    try {
      const now = new Date()
      const month = now.getMonth() === 0 ? 12 : now.getMonth()
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
      const { error } = await supabase.rpc("generate_monthly_payouts", { p_month: month, p_year: year })
      if (error) throw error

      // Mirror to brand_settlements for dashboard visibility
      await syncToSettlements(month, year)

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

        // Unify the records into brand_settlements for dashboard consistency
        await syncToSettlements(finalRecord.month, finalRecord.year)

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
      // 1. Revert in payouts table
      const { data: revertedRecord, error } = await supabase
        .from("payouts")
        .update({ status: "pending", paid_at: null })
        .eq("id", payoutId)
        .select("*")
        .single()

      if (error) throw error

      // 2. Sync reversion to brand_settlements
      if (revertedRecord) {
        await supabase.from("brand_settlements").update({
          status: "pending",
          paid_at: null
        })
          .eq("brand_id", (revertedRecord as Payout).brand_id)
          .eq("period_year", (revertedRecord as Payout).year)
          .eq("period_month", (revertedRecord as Payout).month)
      }

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

      // Ensure brand dashboards are in sync with redo
      await syncToSettlements(month, year)

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
            <div className="text-[10px] font-bold text-orange-600/60 uppercase tracking-widest">To be settled at thc club</div>
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
  const StatementView = ({ payout, invoices, printRef }: { payout: Payout; invoices: any[]; printRef: React.RefObject<HTMLDivElement | null> }) => (
    <div ref={printRef} className="space-y-8 print:p-8">
      <div className="flex justify-between items-end border-b-[3px] border-[#010307] pb-8">
        <div>
          <div className="text-4xl font-black italic tracking-tighter uppercase">thc club</div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#010307]/40 mt-1">Internal Control · Treasury Division</p>
        </div>
        <div className="text-right">
          <Badge className="bg-[#FE7F2D] text-white border-none font-black uppercase text-[9px] px-4 py-1 tracking-widest mb-3">Settlement Statement</Badge>
          <p className="text-[11px] font-bold tabular-nums text-gray-400">ID: {payout.id.slice(0, 12).toUpperCase()}</p>
          <p className="text-[11px] font-black text-[#010307] uppercase tracking-widest">
            {new Date(payout.paid_at || Date.now()).toLocaleDateString("en-NP", { day: '2-digit', month: 'short', year: 'numeric' })}
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

      <div className="space-y-4 pt-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FE7F2D]" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Verified POS Transactions</h4>
        </div>
        <div className="rounded-[2rem] border border-gray-100 overflow-hidden bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">Timestamp / Invoice</th>
                <th className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">Inventory Distribution</th>
                <th className="text-right py-4 px-6 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">Gross Vol. (NPR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-16 text-center text-xs italic text-gray-300 font-medium tracking-tight">Accessing POS archives...</td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="py-5 px-6 align-top">
                      <div className="text-[11px] font-black text-gray-900 mb-0.5">#{inv.invoice_number}</div>
                      <div className="text-[9px] font-bold text-gray-400 tabular-nums uppercase">{new Date(inv.created_at).toLocaleDateString()} · {new Date(inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="py-5 px-6 align-top">
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {inv.invoice_line_items?.map((item: any, idx: number) => (
                          <div key={idx} className="text-[10px] font-medium text-gray-500 whitespace-nowrap">
                            <span className="font-black text-gray-300 mr-1">{item.quantity}×</span> {item.product_name?.toLowerCase()}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-5 px-6 align-top text-right text-xs font-black italic tabular-nums text-gray-900 border-l border-gray-50/50">
                      {inv.total_amount?.toLocaleString() || '0'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <table className="w-full mt-8">
        <thead>
          <tr>
            <th className="text-left py-3 px-3 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b">Summary Description</th>
            <th className="text-right py-3 px-3 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b">Amount (NPR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-4 px-3 font-bold text-sm border-b border-gray-50">Total Aggregated Gross Sales</td>
            <td className="py-4 px-3 font-bold text-sm text-right border-b border-gray-50">{payout.gross_sales.toLocaleString()}</td>
          </tr>
          <tr>
            <td className="py-4 px-3 font-bold text-sm border-b border-gray-50">Platform Processing Fee (PPF Deduction)</td>
            <td className="py-4 px-3 font-bold text-sm text-right border-b border-gray-50 text-red-500">−{(payout.ppf_amount || 0).toLocaleString()}</td>
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
      <div className="flex flex-col md:flex-row items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-2xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-[#FE7F2D]" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">
              payouts tracker
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-gray-400 font-medium text-sm">Real-time settlement aggregator and financial reconciliation.</p>
            {lastSynced && (
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-white rounded-full border border-black/5 shadow-sm">
                <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Synced {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Input
              placeholder="search brand partner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 rounded-2xl bg-white border-black/5 pl-10 font-bold lowercase italic text-sm text-[#010307] focus:border-[#FE7F2D]/20 transition-all shadow-sm"
            />
            <X
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 ${searchTerm ? 'hidden' : 'block'}`}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-black" />
              </button>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={fetchData} disabled={isSyncing}
              className="rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest border-black/5 bg-white hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all flex-1 sm:flex-none">
              <RefreshCcw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} /> sync
            </Button>
            <Button onClick={handleGeneratePayouts} disabled={isGenerating}
              className="bg-[#FE7F2D] text-white hover:bg-black rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-xl shadow-orange-500/20 transition-all flex-[2] sm:flex-none">
              <TrendingUp className="w-3.5 h-3.5" />
              {isGenerating ? "processing..." : "finalize period"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-8 border border-white group hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FE7F2D]/5 blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <div className="w-12 h-12 bg-[#FE7F2D]/10 rounded-2xl flex items-center justify-center text-[#FE7F2D]">
                <TrendingUp className="w-6 h-6" />
              </div>
              <Badge className="bg-gray-50 text-gray-400 border-none font-black uppercase text-[8px] px-3 py-1 tracking-widest">accrued sales</Badge>
            </div>
            <p className="text-[10px] font-black uppercase text-[#010307]/30 tracking-widest mb-1 italic">Gross Market Volume</p>
            <h3 className="text-3xl font-black text-[#010307] tracking-tighter italic tabular-nums">NPR {grandTotalGross.toLocaleString()}</h3>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-400 italic">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              includes live + finalized pending
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-8 border border-white group hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <Badge className="bg-green-500 text-white border-none font-black uppercase text-[8px] px-3 py-1 tracking-widest animate-pulse">outstanding debt</Badge>
            </div>
            <p className="text-[10px] font-black uppercase text-[#010307]/30 tracking-widest mb-1 italic">Net Brand Revenue</p>
            <h3 className="text-3xl font-black text-[#010307] tracking-tighter italic tabular-nums">NPR {grandTotalNetDue.toLocaleString()}</h3>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-gray-400 italic">
              <Landmark className="w-3 h-3" />
              total liabilities for disbursement
            </div>
          </div>
        </Card>

        <Card className="border-none shadow-xl rounded-[2.5rem] bg-[#010307] p-8 group hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FE7F2D]/20 blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <div className="w-12 h-12 bg-[#FE7F2D] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-500/30">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <Badge className="bg-[#FE7F2D]/10 text-[#FE7F2D] border-none font-black uppercase text-[8px] px-3 py-1 tracking-widest">accrued profit</Badge>
            </div>
            <p className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-1 italic">Total PPF Commission</p>
            <h3 className="text-3xl font-black text-white tracking-tighter italic tabular-nums">NPR {grandTotalPPFAccrued.toLocaleString()}</h3>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-white/20 italic">
              <ShieldCheck className="w-3 h-3 text-[#FE7F2D]" />
              thc club revenue (processing fees)
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <TabsList className="bg-white/50 backdrop-blur-md p-1.5 rounded-2xl h-auto border border-black/5 shadow-sm gap-1 w-full sm:w-auto">
            <TabsTrigger value="pending" className="rounded-xl font-black uppercase text-[10px] tracking-widest px-8 py-3.5 data-[state=active]:bg-[#010307] data-[state=active]:text-white transition-all w-full sm:w-auto">
              <Clock className="w-4 h-4 mr-2" /> pending settlements
            </TabsTrigger>
            <TabsTrigger value="ledger" className="rounded-xl font-black uppercase text-[10px] tracking-widest px-8 py-3.5 data-[state=active]:bg-[#FE7F2D] data-[state=active]:text-white transition-all w-full sm:w-auto">
              <ShieldCheck className="w-4 h-4 mr-2" /> finalized archive
            </TabsTrigger>
          </TabsList>

          {activeView === "pending" && (
            <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-2xl border border-black/5 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40">
                {filteredLiveSales.length + filteredPendingPayouts.length} actionable items found
              </span>
            </div>
          )}
        </div>


        <TabsContent value="pending" className="space-y-12 animate-in fade-in slide-in-from-left-4 duration-700">
          {/* ── Live Sales (Unprocessed) ── */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-black tracking-tighter uppercase italic flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-[#FE7F2D]" /> Accruing Live Sales
              </h3>
              {searchTerm && <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-black/5 font-bold italic">filtered by: {searchTerm}</Badge>}
            </div>
            <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-white/50">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="border-none">
                    <TableHead className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Brand Partner</TableHead>
                    <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Cycle</TableHead>
                    <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Gross Vol.</TableHead>
                    <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Processing</TableHead>
                    <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Estimated Net</TableHead>
                    <TableHead className="px-10 py-6 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-50">
                  {filteredLiveSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-24 text-gray-300 italic font-medium">
                        {searchTerm ? `No brands matching "${searchTerm}" in live flow.` : "No sales recorded for the current cycle."}
                      </TableCell>
                    </TableRow>
                  ) : filteredLiveSales.map(sale => (
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
              <Clock className="w-5 h-5 text-gray-400" /> Finalized Pending Disbursement
            </h3>
            <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-white/50">
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
                  {filteredPendingPayouts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-24 text-gray-300 italic font-medium">
                        {searchTerm ? `No brands matching "${searchTerm}" in finalized accruals.` : "No localized pending payouts found."}
                      </TableCell>
                    </TableRow>
                  ) : filteredPendingPayouts.map(po => (
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

        <TabsContent value="ledger" className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black tracking-tighter uppercase italic flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Finalized Settlement Ledger
            </h3>
            {searchTerm && <Badge variant="outline" className="text-[9px] uppercase tracking-widest border-black/5 font-bold italic">filtered: {searchTerm}</Badge>}
          </div>
          <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-white/50">
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
                {filteredLedger.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-32 text-gray-300 italic font-medium">
                      {searchTerm ? `No brands matching "${searchTerm}" in ledger archive.` : "thc club archive is currently empty."}
                    </TableCell>
                  </TableRow>
                ) : filteredLedger.map(po => (
                  <TableRow key={po.id} className="group hover:bg-gray-50/30 transition-colors">
                    <TableCell className="px-10 py-8 font-black text-[#010307] italic uppercase">{po.brands?.business_name}</TableCell>
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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${flowStep === step
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
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Administrative Note (optional)</Label>
                  <Input
                    placeholder="Internal notes for this settlement"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="h-14 rounded-2xl border-gray-100 font-bold bg-gray-50 focus:bg-white transition-all italic"
                  />
                </div>
              </div>

              <div className="bg-[#FE7F2D]/5 rounded-3xl p-6 border border-[#FE7F2D]/10 space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#FE7F2D]">
                  <span>Routing Verification</span>
                  <ShieldCheck className="w-3 h-3" />
                </div>
                {renderSettlementDetails((flowSale?.brands || flowPayout?.brands)?.bank_account_details)}
              </div>

              <div className="bg-[#010307] rounded-3xl p-8 flex items-center justify-between shadow-2xl">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Total Release Intent</p>
                  <p className="text-4xl font-black italic text-[#FE7F2D] tracking-tighter">NPR {parseFloat(finalAmount || "0").toLocaleString()}</p>
                </div>
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center">
                  <Banknote className="w-7 h-7 text-white/20" />
                </div>
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

              {completedPayout && <StatementView payout={completedPayout!} invoices={payoutInvoices} printRef={printRef} />}

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
            {viewPayout && <StatementView payout={viewPayout!} invoices={payoutInvoices} printRef={printRef2} />}
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
