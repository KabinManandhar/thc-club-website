"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase, type BrandSales, type BrandSettlement } from "@/lib/supabase"
import {
    AlertCircle,
    Calendar,
    Download,
    History,
    Loader2,
    Printer,
    Receipt,
    RefreshCcw,
    ShieldCheck,
    TrendingUp,
    Wallet,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { format } from "date-fns"

interface Props {
    brandId: string
    isAdmin?: boolean
}

export function SimplifiedPayoutTracker({ brandId, isAdmin = false }: Props) {
    const [brand, setBrand] = useState<any>(null)
    const [settlements, setSettlements] = useState<BrandSettlement[]>([])
    const [brandSales, setBrandSales] = useState<BrandSales[]>([])
    const [loading, setLoading] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

    // Receipt dialog
    const [receiptSettlement, setReceiptSettlement] = useState<BrandSettlement | null>(null)
    const [receiptInvoices, setReceiptInvoices] = useState<any[]>([])
    const [isFetchingReceipt, setIsFetchingReceipt] = useState(false)

    const printRef = useRef<HTMLDivElement>(null)

    const fetchData = useCallback(async () => {
        setIsSyncing(true)
        try {
            const [{ data: bData }, { data: sData }, { data: saData }] = await Promise.all([
                supabase.from("brands").select("*").eq("id", brandId).single(),
                supabase.from("brand_settlements").select("*").eq("brand_id", brandId).order("period_year", { ascending: false }).order("period_month", { ascending: false }),
                supabase.from("brand_sales").select("*").eq("brand_id", brandId).order("year", { ascending: false }).order("month", { ascending: false }),
            ])
            setBrand(bData)
            setSettlements(sData || [])
            setBrandSales(saData || [])
        } catch (err) {
            console.error("Fetch failed", err)
            toast.error("Failed to sync financial data.")
        } finally {
            setLoading(false)
            setIsSyncing(false)
        }
    }, [brandId])

    useEffect(() => { if (brandId) fetchData() }, [fetchData, brandId])

    // ─── Computations ─────────────────────────────────────────────────────────

    const currentSales = brandSales.filter(s => s.month === selectedMonth && s.year === selectedYear)
    const currentGross = currentSales.reduce((sum, s) => sum + (s.gross_sales || 0), 0)
    const currentPPF = currentSales.reduce((sum, s) => sum + (s.ppf_amount || 0), 0)
    const currentNet = currentGross - currentPPF

    const currentSettlements = settlements.filter(s => s.period_month === selectedMonth && s.period_year === selectedYear)
    const alreadyPaid = currentSettlements.filter(s => s.status === "paid").reduce((sum, s) => sum + (s.net_payout || 0), 0)
    const remainingOwed = Math.max(0, currentNet - alreadyPaid)

    const lifetimePaid = settlements.filter(s => s.status === "paid").reduce((sum, s) => sum + (s.net_payout || 0), 0)

    const allMonthKeys = [
        ...brandSales.map(s => `${s.year}-${s.month}`),
        ...settlements.map(s => `${s.period_year}-${s.period_month}`),
    ]
    const uniqueMonthKeys = [...new Set(allMonthKeys)].sort((a, b) => b.localeCompare(a)).slice(0, 12)

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleSyncMonth = async () => {
        if (!isAdmin) return
        setIsSyncing(true)
        try {
            const { error } = await supabase.rpc("generate_monthly_payouts", { p_month: selectedMonth, p_year: selectedYear })
            if (error) throw error
            toast.success("Settlements synced.")
            fetchData()
        } catch (err: any) {
            toast.error(err.message || "Failed to sync.")
        } finally {
            setIsSyncing(false)
        }
    }

    const handleUpdateStatus = async (id: string, newStatus: "processing" | "paid") => {
        if (!isAdmin) return
        setProcessingId(id)
        try {
            const updateData: any = { status: newStatus }
            if (newStatus === "paid") updateData.paid_at = new Date().toISOString()
            const { error } = await supabase.from("brand_settlements").update(updateData).eq("id", id)
            if (error) throw error
            toast.success(`Settlement marked as ${newStatus}`)
            fetchData()
        } catch (err: any) {
            toast.error(err.message || "Failed to update")
        } finally {
            setProcessingId(null)
        }
    }

    const handleViewReceipt = async (settle: BrandSettlement) => {
        setReceiptSettlement(settle)
        setIsFetchingReceipt(true)
        try {
            const start = new Date(settle.period_year, settle.period_month - 1, 1).toISOString()
            const end = new Date(settle.period_year, settle.period_month, 0, 23, 59, 59).toISOString()
            const { data } = await supabase
                .from("invoices")
                .select("*, invoice_line_items(*)")
                .eq("brand_id", brandId)
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
            <div className="h-40 flex items-center justify-center bg-gray-50 rounded-[2.5rem] border border-gray-100 animate-pulse">
                <Loader2 className="w-8 h-8 text-[#FE7F2D] animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black tracking-tighter uppercase italic flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-[#FE7F2D]" /> Payouts Ledger
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Real-time settlement & disbursement tracking.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white border border-black/5 shadow-sm rounded-2xl px-4 py-2">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="bg-transparent text-[10px] font-black uppercase tracking-widest focus:outline-none">
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{format(new Date(2024, i, 1), "MMMM")}</option>
                            ))}
                        </select>
                        <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-transparent text-[10px] font-black uppercase tracking-widest focus:outline-none">
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                    <Button variant="ghost" onClick={fetchData} disabled={isSyncing} className="rounded-2xl h-10 px-4 font-black uppercase text-[9px] tracking-widest hover:bg-gray-50">
                        <RefreshCcw className={`w-3 h-3 mr-2 ${isSyncing ? "animate-spin" : ""}`} /> Sync
                    </Button>
                    {isAdmin && (
                        <Button onClick={handleSyncMonth} disabled={isSyncing} className="rounded-2xl h-10 px-5 bg-black text-white hover:bg-[#FE7F2D] font-black uppercase text-[9px] tracking-widest">
                            Wrap Month
                        </Button>
                    )}
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Sales", val: fmt(currentGross), icon: TrendingUp, sub: `${currentSales.reduce((s, i) => s + (i.invoice_count || 0), 0)} invoices` },
                    { label: "Platform Fee", val: fmt(currentPPF), icon: ShieldCheck, accent: "text-[#FE7F2D]" },
                    { label: "Net Payout", val: fmt(currentNet), icon: Receipt, accent: "text-green-600" },
                    { label: "Paid This Month", val: fmt(alreadyPaid), icon: Wallet },
                ].map((stat, i) => (
                    <Card key={i} className="p-5 rounded-3xl border-black/5 shadow-sm bg-white space-y-3">
                        <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                            <stat.icon className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{stat.label}</p>
                            <p className={`text-lg font-black italic tracking-tight tabular-nums mt-0.5 ${stat.accent || "text-[#010307]"}`}>{stat.val}</p>
                            {stat.sub && <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mt-0.5">{stat.sub}</p>}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Remaining Hero */}
            <Card className="p-7 rounded-[2.5rem] border-2 border-green-500/10 bg-green-500/5 flex flex-col sm:flex-row justify-between items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/10 blur-[80px] -mr-24 -mt-24 pointer-events-none" />
                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                        <Wallet className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-700/60 mb-0.5">
                            Estimated Remaining — {format(new Date(selectedYear, selectedMonth - 1), "MMMM yyyy")}
                        </p>
                        <h3 className="text-3xl font-black italic tracking-tighter text-green-700">{fmt(remainingOwed)}</h3>
                    </div>
                </div>
                <div className="relative z-10 text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-green-700/40 italic">
                        Lifetime Paid: <span className="text-green-700">{fmt(lifetimePaid)}</span>
                    </p>
                </div>
            </Card>

            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest leading-relaxed italic">
                    Payout Protocol: Platform payouts are initiated on the last week of every month. Cleared funds reach your registered account within 3–5 business days.
                </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="breakdown">
                <TabsList className="bg-transparent border-b border-black/5 h-auto p-0 rounded-none w-full justify-start gap-8 mb-8">
                    {["Breakdown", "History"].map(tab => (
                        <TabsTrigger key={tab} value={tab.toLowerCase()} className="bg-transparent border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 rounded-none px-0 pb-3 h-auto font-black uppercase text-[10px] tracking-widest">
                            {tab}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* Breakdown */}
                <TabsContent value="breakdown" className="animate-in fade-in duration-500 outline-none">
                    <Card className="rounded-[2rem] border-black/5 shadow-xl bg-white overflow-hidden">
                        <Table>
                            <TableHeader className="bg-gray-50/50">
                                <TableRow className="border-none">
                                    <TableHead className="px-8 py-4 font-black text-[9px] uppercase tracking-widest text-gray-400">Period</TableHead>
                                    <TableHead className="py-4 font-black text-[9px] uppercase tracking-widest text-gray-400">Sales</TableHead>
                                    <TableHead className="py-4 font-black text-[9px] uppercase tracking-widest text-gray-400">Platform Fees</TableHead>
                                    <TableHead className="py-4 font-black text-[9px] uppercase tracking-widest text-gray-400">Net</TableHead>
                                    <TableHead className="px-8 py-4 text-right font-black text-[9px] uppercase tracking-widest text-gray-400">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-gray-50">
                                {uniqueMonthKeys.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="px-8 py-12 text-center text-xs italic text-gray-300 font-bold">No sales or settlements recorded yet.</TableCell>
                                    </TableRow>
                                )}
                                {uniqueMonthKeys.map(key => {
                                    const [y, m] = key.split("-").map(Number)
                                    const salesRows = brandSales.filter(s => s.year === y && s.month === m)
                                    const gross = salesRows.reduce((s, i) => s + (i.gross_sales || 0), 0)
                                    const ppf = salesRows.reduce((s, i) => s + (i.ppf_amount || 0), 0)
                                    const net = gross - ppf
                                    const paid = settlements.filter(s => s.period_year === y && s.period_month === m && s.status === "paid").reduce((s, p) => s + (p.net_payout || 0), 0)
                                    const remain = Math.max(0, net - paid)
                                    return (
                                        <TableRow key={key} className="hover:bg-gray-50/30 transition-colors">
                                            <TableCell className="px-8 py-5 font-black lowercase italic text-xs">{format(new Date(y, m - 1), "MMMM yyyy")}</TableCell>
                                            <TableCell className="py-5 font-bold tabular-nums text-xs opacity-50">{gross.toLocaleString()}</TableCell>
                                            <TableCell className="py-5 font-bold tabular-nums text-xs text-[#FE7F2D]">{ppf.toLocaleString()}</TableCell>
                                            <TableCell className="py-5 font-bold tabular-nums text-xs">{net.toLocaleString()}</TableCell>
                                            <TableCell className="px-8 py-5 text-right">
                                                {remain > 0
                                                    ? <Badge className="bg-amber-50 text-amber-600 border-none font-black italic px-3 py-1 text-[9px]">Pending</Badge>
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

                {/* History — paid settlements */}
                <TabsContent value="history" className="animate-in fade-in duration-500 outline-none">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {settlements.length === 0 ? (
                            <div className="col-span-full p-20 text-center border-2 border-dashed border-gray-100 rounded-[3rem] bg-gray-50/50">
                                <History className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#010307]/20">No settlement history yet.</p>
                            </div>
                        ) : settlements.map(settle => (
                            <Card key={settle.id} className="p-7 rounded-[2rem] border-black/5 shadow-sm hover:shadow-xl transition-all group">
                                <div className="flex justify-between items-start mb-5">
                                    <div>
                                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-[0.2em]">{settle.period_year}</p>
                                        <h4 className="font-black text-2xl italic lowercase tracking-tight">{format(new Date(settle.period_year, settle.period_month - 1), "MMMM")}</h4>
                                    </div>
                                    <Badge className={`font-black uppercase text-[8px] tracking-widest px-3 py-1 rounded-lg border-none ${settle.status === "paid" ? "bg-green-500 text-white" : settle.status === "processing" ? "bg-amber-400 text-white" : "bg-gray-100 text-gray-600"}`}>
                                        {settle.status}
                                    </Badge>
                                </div>
                                <div className="space-y-3 mb-5">
                                    <div className="flex justify-between text-xs border-b border-gray-50 pb-3">
                                        <span className="font-black uppercase tracking-widest text-[9px] text-gray-400">Gross Sales</span>
                                        <span className="font-bold tabular-nums opacity-50">{settle.total_sales.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs border-b border-gray-50 pb-3">
                                        <span className="font-black uppercase tracking-widest text-[9px] text-[#FE7F2D]">PPF Deducted</span>
                                        <span className="font-bold tabular-nums text-[#FE7F2D]">- {settle.ppf_deduction.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline pt-1">
                                        <span className="text-xs uppercase font-black tracking-widest">Net Amount</span>
                                        <span className="font-black text-xl italic">{fmt(settle.net_payout)}</span>
                                    </div>
                                </div>
                                <div className="space-y-2 pt-4 border-t border-black/5">
                                    <Button onClick={() => handleViewReceipt(settle)} variant="outline" className="w-full h-11 rounded-2xl border-black/5 shadow-sm font-black uppercase text-[9px] tracking-widest hover:bg-black hover:text-white transition-all flex items-center gap-2">
                                        <Printer className="w-3.5 h-3.5" /> Statement
                                    </Button>
                                    {isAdmin && settle.status === "pending" && (
                                        <Button onClick={() => handleUpdateStatus(settle.id, "processing")} disabled={processingId === settle.id} variant="outline" className="w-full h-10 rounded-2xl font-black uppercase text-[9px] border-amber-200 text-amber-600 hover:bg-amber-50">
                                            Mark Processing
                                        </Button>
                                    )}
                                    {isAdmin && settle.status === "processing" && (
                                        <Button onClick={() => handleUpdateStatus(settle.id, "paid")} disabled={processingId === settle.id} className="w-full h-10 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[9px]">
                                            {processingId === settle.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm Paid"}
                                        </Button>
                                    )}
                                    {settle.status === "paid" && settle.paid_at && (
                                        <p className="text-[9px] font-bold text-green-600/60 uppercase tracking-widest text-center">
                                            Cleared · {format(new Date(settle.paid_at), "dd MMM yyyy")}
                                        </p>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Receipt Dialog */}
            <Dialog open={!!receiptSettlement} onOpenChange={open => !open && setReceiptSettlement(null)}>
                <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[3rem]">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Settlement Statement Preview</DialogTitle>
                        <DialogDescription>Your formal financial breakdown for this period.</DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="flex-1">
                        {isFetchingReceipt ? (
                            <div className="h-64 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-[#FE7F2D] animate-spin" />
                            </div>
                        ) : receiptSettlement && (
                            <div ref={printRef} className="p-14 space-y-12 bg-white">
                                <div className="flex justify-between items-start border-b-2 border-black pb-10">
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                                            <Receipt className="w-6 h-6 text-[#FE7F2D]" />
                                        </div>
                                        <div>
                                            <h4 className="text-3xl font-black italic tracking-tighter uppercase">Payout Statement</h4>
                                            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-black/30">THC Club · Verified Platform Disbursement</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge className="bg-[#FE7F2D] text-white border-none font-black uppercase text-[9px] tracking-widest px-5 py-1.5 mb-4 rounded-lg">
                                            #{receiptSettlement.id.slice(0, 8).toUpperCase()}
                                        </Badge>
                                        <div>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Received Date</p>
                                            <p className="text-sm font-black italic">{receiptSettlement.paid_at ? format(new Date(receiptSettlement.paid_at), "dd MMM yyyy") : "Pending"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-300 mb-1">Registered Entity</p>
                                            <p className="text-xl font-black italic lowercase">{brand?.business_name}</p>
                                        </div>
                                        <div className="p-6 rounded-3xl bg-green-500/5 border border-green-500/10">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-green-700/60 mb-2">Final Disbursement</p>
                                            <p className="text-3xl font-black italic text-green-600 tracking-tighter">{fmt(receiptSettlement.net_payout)}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-300 mb-1">Account Credited</p>
                                            {brand?.bank_account_details ? (
                                                <div className="space-y-0.5">
                                                    {brand.bank_account_details.type === "bank" && (
                                                        <>
                                                            <p className="text-sm font-black italic">{brand.bank_account_details.bankName} · {brand.bank_account_details.accountNumber}</p>
                                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{brand.bank_account_details.accountName}</p>
                                                        </>
                                                    )}
                                                    {brand.bank_account_details.type === "wallet" && (
                                                        <>
                                                            <p className="text-sm font-black italic">{brand.bank_account_details.walletProvider} · {brand.bank_account_details.walletNumber}</p>
                                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{brand.bank_account_details.accountName}</p>
                                                        </>
                                                    )}
                                                    {brand.bank_account_details.type === "cash" && (
                                                        <p className="text-sm font-black italic text-[#FE7F2D]">Physical Cash Pickup</p>
                                                    )}
                                                    {/* Fallback for older configurations that might not have a type */}
                                                    {!brand.bank_account_details.type && (
                                                        <p className="text-sm font-black italic">{brand.bank_account_details.bankName} · {brand.bank_account_details.accountNumber}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm font-bold italic text-gray-400">Manual Disbursement</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-300 mb-1">Cycle Period</p>
                                            <p className="text-base font-black italic">{format(new Date(receiptSettlement.period_year, receiptSettlement.period_month - 1), "MMMM yyyy")}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 border-b border-gray-100 pb-3">POS Sales Itemization</h5>
                                    <div className="overflow-hidden border border-gray-100 rounded-[2rem]">
                                        <Table>
                                            <TableHeader className="bg-gray-50/50">
                                                <TableRow className="border-none">
                                                    <TableHead className="px-8 py-4 font-black text-[9px] uppercase tracking-widest text-gray-400">Invoice</TableHead>
                                                    <TableHead className="py-4 font-black text-[9px] uppercase tracking-widest text-gray-400">Items</TableHead>
                                                    <TableHead className="px-8 py-4 text-right font-black text-[9px] uppercase tracking-widest text-gray-400">Amount</TableHead>
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
                                                            {inv.invoice_line_items?.map((item: any, idx: number) => (
                                                                <p key={idx} className="text-[9px] text-gray-400 flex gap-1.5">
                                                                    <span className="font-black text-gray-200">{item.quantity}×</span>
                                                                    {item.product_name?.toLowerCase()}
                                                                </p>
                                                            ))}
                                                        </TableCell>
                                                        <TableCell className="px-8 py-4 text-right font-black italic tabular-nums text-xs align-top">{inv.total_amount?.toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                <div className="pt-8 border-t-2 border-black/5 max-w-sm ml-auto space-y-3">
                                    <div className="flex justify-between text-xs">
                                        <span className="font-black uppercase tracking-widest text-[9px] text-gray-300">Gross Sales</span>
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
                                        <p className="text-[9px] font-bold text-amber-700/60 uppercase tracking-widest mb-1">Platform Note</p>
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
