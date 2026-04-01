"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase, type Brand, type BrandSales, type BrandSettlement, type PPFTier } from "@/lib/supabase"
import {
    AlertCircle,
    Calendar,
    ChevronDown,
    CircleDollarSign,
    Download,
    History,
    LayoutDashboard,
    Loader2,
    Printer,
    Receipt,
    RefreshCcw,
    RotateCcw,
    ShieldCheck,
    TrendingUp,
    Wallet,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { format } from "date-fns"

export function PayoutsTracker() {
    const [brands, setBrands] = useState<Brand[]>([])
    const [settlements, setSettlements] = useState<(BrandSettlement & { brands?: Brand })[]>([])
    const [brandSales, setBrandSales] = useState<BrandSales[]>([])
    const [ppfTiers, setPpfTiers] = useState<PPFTier[]>([])
    const [loading, setLoading] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)
    const [selectedBrandId, setSelectedBrandId] = useState<string>("")
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
    const [selectedTierId, setSelectedTierId] = useState<string>("auto")

    // Payout form
    const [payoutNotes, setPayoutNotes] = useState("")
    const [isExecutingPayout, setIsExecutingPayout] = useState(false)
    const [processingId, setProcessingId] = useState<string | null>(null)

    // Receipt dialog
    const [receiptSettlement, setReceiptSettlement] = useState<(BrandSettlement & { brands?: Brand }) | null>(null)
    const [receiptInvoices, setReceiptInvoices] = useState<any[]>([])
    const [isFetchingReceipt, setIsFetchingReceipt] = useState(false)

    const printRef = useRef<HTMLDivElement>(null)

    // ─── Data Fetching ──────────────────────────────────────────────────────────

    const fetchData = useCallback(async () => {
        setIsSyncing(true)
        try {
            const [{ data: bData }, { data: sData }, { data: saData }, { data: ppfData }] = await Promise.all([
                supabase.from("brands").select("*").order("business_name"),
                supabase.from("brand_settlements").select("*, brands(*)").order("period_year", { ascending: false }).order("period_month", { ascending: false }),
                supabase.from("brand_sales").select("*").order("year", { ascending: false }).order("month", { ascending: false }),
                supabase.from("ppf_tiers").select("*").order("min_sales_amount", { ascending: false }),
            ])
            setBrands(bData || [])
            setSettlements((sData || []) as any)
            setBrandSales(saData || [])
            setPpfTiers(ppfData || [])
        } catch (err) {
            console.error("Fetch failed", err)
            toast.error("Failed to sync financial data.")
        } finally {
            setLoading(false)
            setIsSyncing(false)
        }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    // ─── Computations for selected brand + cycle ────────────────────────────────

    const selectedBrand = brands.find(b => b.id === selectedBrandId)

    // Brand sales rows for selected brand in selected month/year
    const currentSales = brandSales.filter(
        s => s.brand_id === selectedBrandId && s.month === selectedMonth && s.year === selectedYear
    )
    // sum them (usually 1 row but could be multiple)
    const currentGross = currentSales.reduce((sum, s) => sum + (s.gross_sales || 0), 0)
    const currentPPF = currentSales.reduce((sum, s) => sum + (s.ppf_amount || 0), 0)
    const currentNet = currentGross - currentPPF

    // Settlements for this brand in this month/year
    const currentSettlements = settlements.filter(
        s => s.brand_id === selectedBrandId && s.period_month === selectedMonth && s.period_year === selectedYear
    )
    const alreadyPaid = currentSettlements.filter(s => s.status === "paid").reduce((sum, s) => sum + (s.net_payout || 0), 0)
    const remainingOwed = Math.max(0, currentNet - alreadyPaid)

    // Lifetime stats
    const lifetimePaid = settlements
        .filter(s => s.brand_id === selectedBrandId && s.status === "paid")
        .reduce((sum, s) => sum + (s.net_payout || 0), 0)

    // All historical months with sales or settlements for this brand
    const allMonthKeys = [
        ...brandSales.filter(s => s.brand_id === selectedBrandId).map(s => `${s.year}-${s.month}`),
        ...settlements.filter(s => s.brand_id === selectedBrandId).map(s => `${s.period_year}-${s.period_month}`),
    ]
    const uniqueMonthKeys = [...new Set(allMonthKeys)].sort((a, b) => b.localeCompare(a)).slice(0, 12)

    // Brand-level summary for the dropdown labels
    const brandSummary = brands.map(b => {
        const salesRows = brandSales.filter(r => r.brand_id === b.id && r.month === selectedMonth && r.year === selectedYear)
        const gross = salesRows.reduce((sum, r) => sum + (r.gross_sales || 0), 0)
        const ppf = salesRows.reduce((sum, r) => sum + (r.ppf_amount || 0), 0)
        const net = gross - ppf
        const paid = settlements
            .filter(st => st.brand_id === b.id && st.period_month === selectedMonth && st.period_year === selectedYear && st.status === "paid")
            .reduce((sum, st) => sum + (st.net_payout || 0), 0)
        const remaining = Math.max(0, net - paid)
        return { id: b.id, name: b.business_name, remaining, net, gross }
    })

    // ─── Handlers ──────────────────────────────────────────────────────────────

    const handleSyncMonth = async (brandIdOverride?: string) => {
        setIsExecutingPayout(true)
        try {
            const targetBrandIds = brandIdOverride
                ? [brandIdOverride]
                : brands.map(b => b.id)

            // Resolve the PPF rate to use
            // "auto" = use the rate already stored per invoice in brand_sales
            // tierId = use the selected tier's flat rate
            const selectedTier = selectedTierId !== "auto"
                ? ppfTiers.find(t => t.id === selectedTierId)
                : null

            let successCount = 0
            for (const bid of targetBrandIds) {
                const salesRows = brandSales.filter(
                    s => s.brand_id === bid && s.month === selectedMonth && s.year === selectedYear
                )
                if (salesRows.length === 0) continue

                const totalSales = salesRows.reduce((sum, s) => sum + (s.gross_sales || 0), 0)

                // Calculate PPF: use selected tier rate if overriding, else use stored ppf_amount
                const ppfDeduction = selectedTier
                    ? Math.round(totalSales * (selectedTier.ppf_rate / 100))
                    : salesRows.reduce((sum, s) => sum + (s.ppf_amount || 0), 0)

                const netPayout = totalSales - ppfDeduction
                const appliedRate = selectedTier?.ppf_rate ?? null
                const appliedTierName = selectedTier?.tier_name ?? null

                const existing = settlements.find(
                    s => s.brand_id === bid && s.period_month === selectedMonth && s.period_year === selectedYear
                )

                const settlementData: any = {
                    total_sales: totalSales,
                    ppf_deduction: ppfDeduction,
                    net_payout: netPayout,
                    ...(appliedRate !== null ? { admin_notes: `PPF Model: ${appliedTierName} (${appliedRate}%)${payoutNotes ? ` — ${payoutNotes}` : ''}` } : payoutNotes ? { admin_notes: payoutNotes } : {}),
                }

                if (existing) {
                    const { error } = await supabase
                        .from("brand_settlements")
                        .update(settlementData)
                        .eq("id", existing.id)
                    if (error) throw error
                } else {
                    const { error } = await supabase
                        .from("brand_settlements")
                        .insert({
                            brand_id: bid,
                            period_month: selectedMonth,
                            period_year: selectedYear,
                            status: "pending",
                            ...settlementData,
                        })
                    if (error) throw error
                }
                successCount++
            }

            if (successCount === 0) {
                toast.info("No sales data found for this period — nothing to settle.")
            } else {
                const tierLabel = selectedTier ? `using ${selectedTier.tier_name} (${selectedTier.ppf_rate}% PPF)` : "auto-calculated"
                toast.success(`Settlement generated for ${successCount} brand${successCount > 1 ? 's' : ''} · ${tierLabel}`)
            }
            await fetchData()
        } catch (err: any) {
            console.error("Settlement generation error:", err)
            toast.error(err.message || "Failed to generate settlement")
        } finally {
            setIsExecutingPayout(false)
        }
    }

    const handleUpdateStatus = async (id: string, newStatus: "processing" | "paid") => {
        setProcessingId(id)
        try {
            const updateData: any = { status: newStatus }
            if (newStatus === "paid") {
                updateData.paid_at = new Date().toISOString()
                if (payoutNotes) updateData.admin_notes = payoutNotes
            }
            const { error } = await supabase.from("brand_settlements").update(updateData).eq("id", id)
            if (error) throw error
            toast.success(`Settlement marked as ${newStatus}`)
            setPayoutNotes("")
            fetchData()
        } catch (err: any) {
            toast.error(err.message || "Failed to update settlement")
        } finally {
            setProcessingId(null)
        }
    }

    const handleRevertSettlement = async (id: string) => {
        setProcessingId(id)
        try {
            const { error } = await supabase
                .from("brand_settlements")
                .update({ status: "pending", paid_at: null })
                .eq("id", id)
            if (error) throw error
            toast.success("Settlement reverted to pending.")
            fetchData()
        } catch (err: any) {
            toast.error(err.message || "Failed to revert settlement")
        } finally {
            setProcessingId(null)
        }
    }

    const handleViewReceipt = async (settle: BrandSettlement & { brands?: Brand }) => {
        setReceiptSettlement(settle)
        setIsFetchingReceipt(true)
        try {
            const start = new Date(settle.period_year, settle.period_month - 1, 1).toISOString()
            const end = new Date(settle.period_year, settle.period_month, 0, 23, 59, 59).toISOString()
            const { data } = await supabase
                .from("invoices")
                .select("*, invoice_line_items(*)")
                .eq("brand_id", settle.brand_id)
                .eq("status", "paid")
                .gte("created_at", start)
                .lte("created_at", end)
                .order("created_at", { ascending: true })
            setReceiptInvoices(data || [])
        } finally {
            setIsFetchingReceipt(false)
        }
    }

    const handlePrint = () => {
        const content = printRef.current
        if (!content) return
        const w = window.open("", "_blank")
        if (!w) return
        w.document.write(`<html><head><title>Settlement Statement</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>body{font-family:Inter,sans-serif;padding:40px}@media print{.no-print{display:none}}</style>
        </head><body>${content.innerHTML}</body></html>`)
        w.document.close()
        setTimeout(() => { w.focus(); w.print(); w.close() }, 500)
    }

    const fmt = (n: number) => `NPR ${n.toLocaleString()}`

    if (loading) {
        return (
            <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-[#FE7F2D] animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-[#010307]/30">Synchronizing Ledger...</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-700">

            {/* ─── Top Controls ─────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
                        <div className="p-2.5 bg-black rounded-xl">
                            <Wallet className="w-6 h-6 text-[#FE7F2D]" />
                        </div>
                        Payout Tracker
                    </h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 ml-1">Brand settlement & disbursement control center.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Month + Year selectors */}
                    <div className="flex items-center gap-2 bg-white border border-black/5 shadow-sm rounded-2xl px-4 py-2.5">
                        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                        <select
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(Number(e.target.value))}
                            className="bg-transparent text-[11px] font-black lowercase italic focus:outline-none"
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{format(new Date(2024, i, 1), "MMMM")}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={e => setSelectedYear(Number(e.target.value))}
                            className="bg-transparent text-[11px] font-black lowercase italic focus:outline-none"
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <Button
                        variant="outline"
                        onClick={fetchData}
                        disabled={isSyncing}
                        className="rounded-2xl h-11 px-5 border-black/5 shadow-sm font-black uppercase text-[10px] tracking-widest"
                    >
                        <RefreshCcw className={`w-3.5 h-3.5 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => handleSyncMonth()}
                        disabled={isExecutingPayout}
                        className="rounded-2xl h-11 px-5 bg-black text-white hover:bg-[#FE7F2D] font-black uppercase text-[10px] tracking-widest shadow-xl transition-all"
                    >
                        {isExecutingPayout ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <CircleDollarSign className="w-3.5 h-3.5 mr-2" />}
                        Wrap Month
                    </Button>
                </div>
            </div>

            {/* ─── Brand Dropdown Selector ──────────────────────────────────────── */}
            <Card className="p-6 rounded-3xl border-black/5 shadow-sm bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#010307]/40">Select Brand Partner</Label>
                        <div className="relative">
                            <select
                                value={selectedBrandId}
                                onChange={e => setSelectedBrandId(e.target.value)}
                                className="w-full h-14 pl-5 pr-10 rounded-2xl bg-gray-50 border-none text-sm font-black lowercase italic focus:outline-none focus:ring-1 focus:ring-black/5 appearance-none"
                            >
                                <option value="">— choose a brand partner —</option>
                                {brands.map(b => {
                                    const summary = brandSummary.find(s => s.id === b.id)
                                    const remaining = summary?.remaining || 0
                                    const gross = summary?.gross || 0
                                    const label = remaining > 0
                                        ? ` · NPR ${remaining.toLocaleString()} owed`
                                        : gross > 0
                                            ? " · settled"
                                            : " · no sales"
                                    return (
                                        <option key={b.id} value={b.id}>
                                            {b.business_name}{label}
                                        </option>
                                    )
                                })}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {selectedBrand && (
                        <div className="flex items-center gap-3 sm:pt-6">
                            <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-white font-black text-lg italic ring-4 ring-black/5">
                                {selectedBrand.business_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <p className="font-black italic text-base lowercase tracking-tight">{selectedBrand.business_name}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedBrand.email}</p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* ─── No Brand Selected ───────────────────────────────────────────── */}
            {!selectedBrandId && (
                <Card className="rounded-[3rem] border-black/5 shadow-xl bg-white/50 backdrop-blur-sm p-24 flex flex-col items-center justify-center text-center space-y-5">
                    <div className="w-20 h-20 bg-gray-100 rounded-[2rem] flex items-center justify-center text-gray-300">
                        <LayoutDashboard className="w-10 h-10" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black tracking-tighter uppercase italic">Select a brand partner</h3>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-2">View financial breakdown and process disbursements.</p>
                    </div>
                </Card>
            )}

            {/* ─── Brand Detail View ────────────────────────────────────────────── */}
            {selectedBrandId && selectedBrand && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* Metric Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: "Gross Sales", val: fmt(currentGross), icon: TrendingUp, sub: `${currentSales.reduce((s, i) => s + (i.invoice_count || 0), 0)} invoices` },
                            { label: "Platform Fee (PPF)", val: fmt(currentPPF), icon: ShieldCheck, accent: "text-[#FE7F2D]" },
                            { label: "Net Payout Due", val: fmt(currentNet), icon: Receipt, accent: "text-green-600" },
                            { label: "Already Paid", val: fmt(alreadyPaid), icon: Wallet },
                        ].map((stat, i) => (
                            <Card key={i} className="p-6 rounded-3xl border-black/5 shadow-sm bg-white space-y-4">
                                <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                                    <stat.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{stat.label}</p>
                                    <p className={`text-xl font-black italic tracking-tight tabular-nums mt-1 ${stat.accent || "text-[#010307]"}`}>{stat.val}</p>
                                    {stat.sub && <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mt-1">{stat.sub}</p>}
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Remaining Payout Hero */}
                    <Card className="p-8 rounded-[3rem] border-2 border-green-500/20 bg-green-500/5 flex flex-col sm:flex-row justify-between items-center gap-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="w-16 h-16 bg-green-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-green-500/20">
                                <Wallet className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-green-700/60 mb-1">
                                    Remaining Payout — {format(new Date(selectedYear, selectedMonth - 1), "MMMM yyyy")}
                                </p>
                                <h3 className="text-4xl font-black italic tracking-tighter text-green-700">{fmt(remainingOwed)}</h3>
                            </div>
                        </div>
                        <div className="relative z-10 text-right">
                            <p className="text-[11px] font-black uppercase tracking-widest text-green-700/40 italic">
                                Lifetime Total Disbursed: <span className="text-green-700">{fmt(lifetimePaid)}</span>
                            </p>
                        </div>
                    </Card>

                    {/* Main Tabs + Payout Side Panel */}
                    <div className="grid xl:grid-cols-12 gap-8 items-start">

                        {/* Tabs */}
                        <div className="xl:col-span-8">
                            <Tabs defaultValue="breakdown">
                                <TabsList className="bg-transparent border-b border-black/5 h-auto p-0 rounded-none w-full justify-start gap-8 mb-8">
                                    {["Breakdown", "History"].map(tab => (
                                        <TabsTrigger
                                            key={tab}
                                            value={tab.toLowerCase()}
                                            className="bg-transparent border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 rounded-none px-0 pb-4 h-auto font-black uppercase text-[10px] tracking-widest"
                                        >
                                            {tab}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                {/* Breakdown — monthly table from brand_sales */}
                                <TabsContent value="breakdown" className="animate-in fade-in duration-500 outline-none">
                                    <Card className="rounded-[2.5rem] border-black/5 shadow-xl bg-white overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-gray-50/50">
                                                <TableRow className="border-none">
                                                    <TableHead className="px-8 py-4 font-black text-[9px] uppercase tracking-widest text-gray-400">Period</TableHead>
                                                    <TableHead className="py-4 font-black text-[9px] uppercase tracking-widest text-gray-400">Sales</TableHead>
                                                    <TableHead className="py-4 font-black text-[9px] uppercase tracking-widest text-gray-400">PPF</TableHead>
                                                    <TableHead className="py-4 font-black text-[9px] uppercase tracking-widest text-gray-400">Net</TableHead>
                                                    <TableHead className="px-8 py-4 text-right font-black text-[9px] uppercase tracking-widest text-gray-400">Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody className="divide-y divide-gray-50">
                                                {uniqueMonthKeys.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="px-8 py-12 text-center text-xs italic text-gray-300 font-bold">No sales recorded yet.</TableCell>
                                                    </TableRow>
                                                )}
                                                {uniqueMonthKeys.map(key => {
                                                    const [y, m] = key.split("-").map(Number)
                                                    const salesRows = brandSales.filter(s => s.brand_id === selectedBrandId && s.year === y && s.month === m)
                                                    const gross = salesRows.reduce((s, i) => s + (i.gross_sales || 0), 0)
                                                    const ppf = salesRows.reduce((s, i) => s + (i.ppf_amount || 0), 0)
                                                    const net = gross - ppf
                                                    const paid = settlements.filter(s => s.brand_id === selectedBrandId && s.period_year === y && s.period_month === m && s.status === "paid").reduce((s, p) => s + (p.net_payout || 0), 0)
                                                    const remain = Math.max(0, net - paid)
                                                    return (
                                                        <TableRow key={key} className="hover:bg-gray-50/50 transition-colors">
                                                            <TableCell className="px-8 py-5 font-black lowercase italic text-xs">{format(new Date(y, m - 1), "MMMM yyyy")}</TableCell>
                                                            <TableCell className="py-5 font-bold tabular-nums text-xs opacity-50">{gross.toLocaleString()}</TableCell>
                                                            <TableCell className="py-5 font-bold tabular-nums text-xs text-[#FE7F2D]">{ppf.toLocaleString()}</TableCell>
                                                            <TableCell className="py-5 font-bold tabular-nums text-xs">{net.toLocaleString()}</TableCell>
                                                            <TableCell className="px-8 py-5 text-right">
                                                                {remain > 0
                                                                    ? <Badge className="bg-amber-50 text-amber-600 border-none font-black italic px-3 py-1 text-[9px]">Due {remain.toLocaleString()}</Badge>
                                                                    : gross === 0
                                                                        ? <span className="text-[9px] italic font-bold text-gray-200">no sales</span>
                                                                        : <Badge className="bg-green-50 text-green-600 border-none font-black italic px-3 py-1 text-[9px]">Settled</Badge>}
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </Card>
                                </TabsContent>

                                {/* History — from brand_settlements */}
                                <TabsContent value="history" className="animate-in fade-in duration-500 outline-none">
                                    <div className="space-y-4">
                                        {settlements.filter(s => s.brand_id === selectedBrandId).length === 0 ? (
                                            <div className="p-20 text-center border-2 border-dashed border-gray-100 rounded-[3rem] bg-gray-50/50">
                                                <History className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                                                <p className="text-xs font-black uppercase tracking-widest text-[#010307]/20">No settlement history found.</p>
                                            </div>
                                        ) : settlements.filter(s => s.brand_id === selectedBrandId).map(settle => (
                                            <Card key={settle.id} className="p-6 rounded-3xl border-black/5 shadow-sm hover:shadow-md transition-all group">
                                                <div className="flex justify-between items-center mb-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#FE7F2D] group-hover:text-white transition-all">
                                                            <Receipt className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h5 className="font-black text-sm uppercase tracking-tight">{format(new Date(settle.period_year, settle.period_month - 1), "MMMM yyyy")}</h5>
                                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Ref #{settle.id.slice(0, 8).toUpperCase()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black italic text-base tabular-nums">{fmt(settle.net_payout)}</p>
                                                        <Badge className={`font-black uppercase text-[8px] tracking-widest px-3 py-1 rounded-lg border-none mt-1 ${settle.status === "paid" ? "bg-green-500 text-white" : settle.status === "processing" ? "bg-amber-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                                                            {settle.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="pt-4 border-t border-black/5 flex flex-wrap gap-3 items-center justify-between">
                                                    <button onClick={() => handleViewReceipt(settle)} className="text-[10px] font-black uppercase tracking-widest text-[#FE7F2D] hover:underline flex items-center gap-1">
                                                        <Printer className="w-3 h-3" /> View Statement
                                                    </button>
                                                    {settle.status === "pending" && (
                                                        <Button onClick={() => handleUpdateStatus(settle.id, "processing")} disabled={processingId === settle.id} variant="outline" className="h-9 rounded-xl font-black uppercase text-[9px] tracking-widest border-amber-200 text-amber-600 hover:bg-amber-50 px-4">
                                                            Mark Processing
                                                        </Button>
                                                    )}
                                                    {settle.status === "processing" && (
                                                        <Button onClick={() => handleViewReceipt(settle)} disabled={processingId === settle.id} className="h-9 rounded-xl font-black uppercase text-[9px] tracking-widest bg-green-600 hover:bg-green-700 text-white px-4">
                                                            Review Invoice
                                                        </Button>
                                                    )}
                                                    {settle.status === "paid" && settle.paid_at && (
                                                        <p className="text-[9px] font-bold text-green-600/60 uppercase tracking-widest">
                                                            Cleared · {format(new Date(settle.paid_at), "dd MMM yyyy")}
                                                        </p>
                                                    )}
                                                    {settle.status !== "pending" && (
                                                        <button
                                                            onClick={() => handleRevertSettlement(settle.id)}
                                                            disabled={processingId === settle.id}
                                                            className="text-[9px] font-black uppercase tracking-widest text-gray-300 hover:text-red-500 flex items-center gap-1 transition-colors disabled:opacity-30"
                                                        >
                                                            <RotateCcw className="w-2.5 h-2.5" /> Revert
                                                        </button>
                                                    )}
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Payout Action Panel */}
                        <Card className="xl:col-span-4 rounded-[3rem] border-black/5 shadow-2xl bg-white overflow-hidden p-8 space-y-8 sticky top-8">
                            <div>
                                <h4 className="text-xl font-black tracking-tighter uppercase italic">Quick Actions</h4>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage settlement flow for this brand.</p>
                            </div>

                            <div className="space-y-3">
                                <div className="p-5 rounded-2xl bg-green-50 space-y-1">
                                    <p className="text-[9px] font-bold text-green-700/60 uppercase tracking-widest">Available to Disburse</p>
                                    <p className="text-2xl font-black italic text-green-600 tabular-nums">{fmt(remainingOwed)}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 rounded-2xl bg-gray-50 space-y-1">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Period</p>
                                        <p className="text-xs font-black italic">{format(new Date(selectedYear, selectedMonth - 1), "MMM yyyy")}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-gray-50 space-y-1">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">PPF Deducted</p>
                                        <p className="text-xs font-black italic text-[#FE7F2D]">{fmt(currentPPF)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* PPF Payout Model Selector */}
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#010307]/40 px-1">Payout Model (PPF Rate)</Label>
                                <div className="relative">
                                    <select
                                        value={selectedTierId}
                                        onChange={e => setSelectedTierId(e.target.value)}
                                        className="w-full h-12 pl-4 pr-10 rounded-2xl bg-gray-50 border-none text-xs font-black lowercase italic focus:outline-none focus:ring-1 focus:ring-black/5 appearance-none"
                                    >
                                        <option value="auto">auto — use invoice PPF rates</option>
                                        {ppfTiers.map(tier => (
                                            <option key={tier.id} value={tier.id}>
                                                {tier.tier_name} — {tier.ppf_rate}% PPF · min NPR {tier.min_sales_amount.toLocaleString()}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                </div>
                                {selectedTierId !== "auto" && ppfTiers.find(t => t.id === selectedTierId) && (() => {
                                    const tier = ppfTiers.find(t => t.id === selectedTierId)!
                                    const overridePPF = Math.round(currentGross * (tier.ppf_rate / 100))
                                    const overrideNet = currentGross - overridePPF
                                    return (
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <div className="p-3 rounded-xl bg-[#FE7F2D]/5 border border-[#FE7F2D]/10">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[#FE7F2D]/60 mb-0.5">Override PPF</p>
                                                <p className="text-xs font-black italic text-[#FE7F2D]">NPR {overridePPF.toLocaleString()}</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-green-50/50 border border-green-100/50">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-green-700/60 mb-0.5">Override Net</p>
                                                <p className="text-xs font-black italic text-green-600">NPR {overrideNet.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>

                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#010307]/40 px-1">Admin Notes (Optional)</Label>
                                <textarea
                                    value={payoutNotes}
                                    onChange={e => setPayoutNotes(e.target.value)}
                                    className="w-full min-h-[80px] p-4 rounded-2xl bg-gray-50 border-none text-sm font-bold lowercase italic placeholder:text-gray-300 focus:ring-1 focus:ring-black/5 resize-none"
                                    placeholder="e.g. monthly settlement for april..."
                                />
                            </div>

                            <div className="space-y-3 pt-2">
                                {currentSettlements.filter(s => s.status === "pending").length > 0 && (
                                    <Button
                                        onClick={() => currentSettlements.filter(s => s.status === "pending").forEach(s => handleUpdateStatus(s.id, "processing"))}
                                        variant="outline"
                                        className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest border-amber-200 text-amber-600 hover:bg-amber-50"
                                    >
                                        Mark as Processing
                                    </Button>
                                )}
                                {currentSettlements.filter(s => s.status === "processing").length > 0 && (
                                    <Button
                                        onClick={() => handleViewReceipt(currentSettlements.find(s => s.status === "processing")!)}
                                        className="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-xl"
                                    >
                                        <Receipt className="w-4 h-4" /> Review Invoice
                                    </Button>
                                )}
                                {currentSettlements.length === 0 && (
                                    <Button
                                        onClick={() => handleSyncMonth(selectedBrandId)}
                                        disabled={isExecutingPayout}
                                        className="w-full h-14 rounded-2xl bg-black text-white hover:bg-[#FE7F2D] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-xl transition-all disabled:opacity-40"
                                    >
                                        {isExecutingPayout ? (
                                            <div className="flex gap-1 items-center px-4">
                                                <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80 animate-bounce [animation-delay:-0.3s]"></div>
                                                <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80 animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80 animate-bounce"></div>
                                            </div>
                                        ) : (
                                            <><CircleDollarSign className="w-4 h-4" /> Generate Settlement</>
                                        )}
                                    </Button>
                                )}
                                {currentSettlements.length > 0 && currentSettlements.some(s => s.status !== "paid") && (
                                    <Button
                                        onClick={() => handleSyncMonth(selectedBrandId)}
                                        disabled={isExecutingPayout}
                                        variant="outline"
                                        className="w-full h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest border-black/5 hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-40"
                                    >
                                        {isExecutingPayout ? (
                                            <div className="flex gap-1 items-center px-4">
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 opacity-80 animate-bounce [animation-delay:-0.3s]"></div>
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 opacity-80 animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 opacity-80 animate-bounce"></div>
                                            </div>
                                        ) : (
                                            <><RefreshCcw className="w-3.5 h-3.5" /> Recalculate with Model</>
                                        )}
                                    </Button>
                                )}
                                {currentSettlements.length === 0 && currentGross === 0 && (
                                    <p className="text-[9px] text-center italic font-bold text-gray-300">No sales recorded for this period.</p>
                                )}
                                <div className="flex items-center gap-2 justify-center">
                                    <AlertCircle className="w-3 h-3 text-gray-300" />
                                    <p className="text-[9px] text-gray-300 font-bold italic lowercase">"Wrap Month" generates settlements for all brands at once.</p>
                                </div>
                            </div>
                        </Card>

                    </div>
                </div>
            )}

            {/* ─── Receipt Dialog ─────────────────────────────────────────────── */}
            <Dialog open={!!receiptSettlement} onOpenChange={open => !open && setReceiptSettlement(null)}>
                <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[3rem]">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Settlement Statement</DialogTitle>
                        <DialogDescription>Formal financial payout record</DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="flex-1">
                        {isFetchingReceipt ? (
                            <div className="h-64 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-[#FE7F2D] animate-spin" />
                            </div>
                        ) : receiptSettlement && (
                            <div ref={printRef} className="p-16 space-y-12 bg-white">
                                {/* Header */}
                                <div className="flex justify-between items-start border-b-2 border-black pb-10">
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                                            <Receipt className="w-6 h-6 text-[#FE7F2D]" />
                                        </div>
                                        <div>
                                            <h4 className="text-3xl font-black italic tracking-tighter uppercase">Settlement Statement</h4>
                                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-black/30">THC Club.</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge className="bg-[#FE7F2D] text-white border-none font-black uppercase text-[9px] tracking-widest px-5 py-1.5 mb-4 rounded-lg">
                                            #{receiptSettlement.id.slice(0, 8).toUpperCase()}
                                        </Badge>
                                        <div>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Statement Date</p>
                                            <p className="text-sm font-black italic">{receiptSettlement.paid_at ? format(new Date(receiptSettlement.paid_at), "dd MMM yyyy") : "Pending"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Meta */}
                                <div className="grid grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-300 mb-1">Beneficiary Brand</p>
                                            <p className="text-xl font-black italic lowercase tracking-tight">{receiptSettlement.brands?.business_name || selectedBrand?.business_name}</p>
                                            <p className="text-xs font-medium text-gray-400 mt-1">{receiptSettlement.brands?.email || selectedBrand?.email}</p>
                                        </div>
                                        <div className="p-6 rounded-3xl bg-green-500/5 border border-green-500/10">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-green-700/60 mb-2">Net Disbursement</p>
                                            <p className="text-3xl font-black italic text-green-600 tracking-tighter">{fmt(receiptSettlement.net_payout)}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-300 mb-1">Disbursement Profile</p>
                                            {(() => {
                                                const account = receiptSettlement.brands?.bank_account_details || selectedBrand?.bank_account_details
                                                if (!account) return <p className="text-sm font-bold italic text-gray-400">Manual Disbursement</p>
                                                return (
                                                    <div className="space-y-0.5">
                                                        {account.type === "bank" && (
                                                            <>
                                                                <p className="text-sm font-black italic">{account.bankName} · {account.accountNumber}</p>
                                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{account.accountName}</p>
                                                            </>
                                                        )}
                                                        {account.type === "wallet" && (
                                                            <>
                                                                <p className="text-sm font-black italic">{account.walletProvider} · {account.walletNumber}</p>
                                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{account.accountName}</p>
                                                            </>
                                                        )}
                                                        {account.type === "cash" && (
                                                            <p className="text-sm font-black italic text-[#FE7F2D]">Physical Cash Pickup</p>
                                                        )}
                                                        {/* Fallback for older configurations that might not have a type */}
                                                        {!account.type && (
                                                            <p className="text-sm font-black italic">{account.bankName} · {account.accountNumber}</p>
                                                        )}
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-300 mb-1">Cycle Period</p>
                                            <p className="text-base font-black italic">{format(new Date(receiptSettlement.period_year, receiptSettlement.period_month - 1), "MMMM yyyy")}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-300 mb-1">Settlement Status</p>
                                            <p className={`text-sm font-black italic uppercase ${receiptSettlement.status === "paid" ? "text-green-600" : "text-amber-500"}`}>{receiptSettlement.status}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Transactions */}
                                <div className="space-y-4">
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 border-b border-gray-100 pb-3">POS Transaction Breakdown</h5>
                                    <div className="overflow-hidden border border-gray-100 rounded-[2rem]">
                                        <Table>
                                            <TableHeader className="bg-gray-50/50">
                                                <TableRow className="border-none">
                                                    <TableHead className="px-8 py-4 font-black text-[9px] uppercase tracking-widest text-gray-400">Invoice</TableHead>
                                                    <TableHead className="py-4 font-black text-[9px] uppercase tracking-widest text-gray-400">Items</TableHead>
                                                    <TableHead className="px-8 py-4 text-right font-black text-[9px] uppercase tracking-widest text-gray-400">Amount (NPR)</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody className="divide-y divide-gray-50">
                                                {receiptInvoices.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="py-10 text-center text-xs italic text-gray-300">No linked invoices found.</TableCell>
                                                    </TableRow>
                                                ) : receiptInvoices.map(inv => (
                                                    <TableRow key={inv.id}>
                                                        <TableCell className="px-8 py-4 font-bold tabular-nums text-xs align-top">#{inv.invoice_number}</TableCell>
                                                        <TableCell className="py-4 align-top">
                                                            <div className="space-y-1">
                                                                {inv.invoice_line_items?.map((item: any, idx: number) => (
                                                                    <p key={idx} className="text-[9px] text-gray-400 flex gap-1.5">
                                                                        <span className="font-black text-gray-200">{item.quantity}×</span>
                                                                        {item.product_name?.toLowerCase()}
                                                                    </p>
                                                                ))}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="px-8 py-4 text-right font-black italic tabular-nums text-xs align-top">{inv.total_amount?.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="pt-8 border-t-2 border-black/5 max-w-sm ml-auto space-y-3">
                                    <div className="flex justify-between text-xs">
                                        <span className="font-black uppercase tracking-widest text-[9px] text-gray-300">Total Sales</span>
                                        <span className="font-bold tabular-nums">{receiptSettlement.total_sales.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-[#FE7F2D]">
                                        <span className="font-black uppercase tracking-widest text-[9px]">PPF Deduction</span>
                                        <span className="font-bold tabular-nums">- {receiptSettlement.ppf_deduction.toLocaleString()}</span>
                                    </div>
                                    <div className="pt-4 border-t-2 border-black flex justify-between items-center">
                                        <span className="text-lg font-black italic lowercase tracking-tighter">Net Payout</span>
                                        <span className="text-xl font-black italic text-[#FE7F2D] tabular-nums">{fmt(receiptSettlement.net_payout)}</span>
                                    </div>
                                </div>

                                {receiptSettlement.admin_notes && (
                                    <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100/50">
                                        <p className="text-[9px] font-bold text-amber-700/60 uppercase tracking-widest mb-1">Admin Note</p>
                                        <p className="text-xs italic text-amber-800">{receiptSettlement.admin_notes}</p>
                                    </div>
                                )}

                                <div className="text-center pt-8 border-t border-gray-50">
                                    <p className="text-[8px] font-black uppercase tracking-[0.5em] text-gray-200">Computer generated ledger · No signature required.</p>
                                </div>
                            </div>
                        )}
                    </ScrollArea>

                    <div className="p-8 border-t border-black/5 bg-gray-50/50 flex justify-end gap-3 no-print">
                        {receiptSettlement?.status === "processing" && (
                            <Button 
                                onClick={async () => {
                                    if(receiptSettlement) await handleUpdateStatus(receiptSettlement.id, "paid")
                                    setReceiptSettlement(null)
                                }} 
                                disabled={processingId === receiptSettlement?.id} 
                                className="h-12 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[9px] tracking-widest px-8 rounded-2xl transition-all flex gap-2"
                            >
                                {processingId === receiptSettlement?.id ? (
                                    <div className="flex gap-1 items-center px-6">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80 animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80 animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80 animate-bounce"></div>
                                    </div>
                                ) : (
                                    <><ShieldCheck className="w-3.5 h-3.5" /> Confirm Disbursed</>
                                )}
                            </Button>
                        )}
                        <Button variant="outline" onClick={handlePrint} className="h-12 rounded-2xl font-black uppercase tracking-widest text-[9px] px-8 border-black/5 bg-white shadow-sm flex items-center gap-2">
                            <Download className="w-3.5 h-3.5" /> PDF
                        </Button>
                        <Button onClick={() => setReceiptSettlement(null)} className="bg-black text-white hover:bg-[#FE7F2D] font-black uppercase text-[9px] tracking-widest px-8 h-12 rounded-2xl transition-all">
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
