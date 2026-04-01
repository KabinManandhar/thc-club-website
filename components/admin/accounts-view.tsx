"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase, type Brand, type Expense } from "@/lib/supabase"
import {
  ArrowUpCircle,
  Landmark,
  Layers,
  Package,
  PiggyBank,
  Plus,
  Receipt,
  Search,
  TrendingDown,
  Wallet
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface FinancialEntry {
  id: string
  date: string
  type: "product_sale" | "payout" | "shelf_rent" | "expense"
  entity_name: string
  gross_amount: number
  net_impact: number // Positive for income to THC, negative for outflow
  description: string
  status: string
  reference?: string
  original_data?: any // We will store full object here for the receipt view
}

export function AccountsManagement() {
  const [brands, setBrands] = useState<Pick<Brand, "id" | "business_name">[]>([])
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBrand, setSelectedBrand] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("overview")

  // Dialog for Receipts
  const [selectedEntry, setSelectedEntry] = useState<FinancialEntry | null>(null)

  // Expense Form
  const [isExpenseOpen, setIsExpenseOpen] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ amount: "", category: "salary", description: "", date: new Date().toISOString().split("T")[0] })
  const [isSavingExpense, setIsSavingExpense] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [brandsRes, invoicesRes, payoutsRes, bookingsRes, expensesRes] = await Promise.all([
        supabase.from("brands").select("id, business_name"),
        supabase.from("invoices").select("id, created_at, total_amount, ppf_amount, brand_id, brands(business_name), invoice_number").order("created_at", { ascending: false }),
        supabase.from("brand_settlements").select("id, paid_at, net_payout, total_sales, ppf_deduction, brand_id, brands(business_name), period_month, period_year, status").order("paid_at", { ascending: false }),
        supabase.from("shelf_bookings").select("id, created_at, total_amount, brand_id, brands(business_name), section, duration, status").order("created_at", { ascending: false }),
        supabase.from("expenses").select("*").order("date", { ascending: false })
      ])

      setBrands(brandsRes.data || [])
      setExpenses(expensesRes.data || [])

      const allEntries: FinancialEntry[] = []

      // Invoices (Sales)
      invoicesRes.data?.forEach(inv => {
        const brandsNode = inv.brands as any
        const brandName = Array.isArray(brandsNode) ? brandsNode[0]?.business_name : brandsNode?.business_name
        allEntries.push({
          id: inv.id,
          date: inv.created_at,
          type: "product_sale",
          entity_name: brandName || "Unknown Brand",
          gross_amount: inv.total_amount,
          net_impact: inv.ppf_amount || 0,
          description: `Sale #${inv.invoice_number}`,
          status: "paid",
          reference: inv.invoice_number,
          original_data: inv
        })
      })

      // Payouts
      payoutsRes.data?.forEach(p => {
        if (p.status === "paid" && p.paid_at) {
          const brandsNode = p.brands as any
          const brandName = Array.isArray(brandsNode) ? brandsNode[0]?.business_name : brandsNode?.business_name
          allEntries.push({
            id: p.id,
            date: p.paid_at,
            type: "payout",
            entity_name: brandName || "Unknown Brand",
            gross_amount: p.net_payout,
            net_impact: -p.net_payout,
            description: `Monthly Settlement · ${p.period_month}/${p.period_year}`,
            status: "completed",
            reference: `PO-${p.id.slice(0, 8)}`,
            original_data: p
          })
        }
      })

      // Shelf Rentals
      bookingsRes.data?.forEach(b => {
        if (b.status === "active" || b.status === "completed") {
          const brandsNode = b.brands as any
          const brandName = Array.isArray(brandsNode) ? brandsNode[0]?.business_name : brandsNode?.business_name
          allEntries.push({
            id: b.id,
            date: b.created_at,
            type: "shelf_rent",
            entity_name: brandName || "Unknown Brand",
            gross_amount: b.total_amount,
            net_impact: b.total_amount,
            description: `Shelf Booking · ${b.section} (${b.duration})`,
            status: b.status,
            reference: `BK-${b.id.slice(0, 8)}`,
            original_data: b
          })
        }
      })

      // Internal Expenses
      expensesRes.data?.forEach(e => {
        allEntries.push({
          id: e.id,
          date: e.date,
          type: "expense",
          entity_name: "Internal Operations",
          gross_amount: e.amount,
          net_impact: -e.amount,
          description: e.description,
          status: "completed",
          reference: e.category
        })
      })

      setEntries(allEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
    } catch (err) {
      console.error("Failed to fetch account data", err)
      toast.error("Error loading financial data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSaveExpense = async () => {
    if (!expenseForm.amount || !expenseForm.description) return toast.error("Please fill in all required fields.")
    setIsSavingExpense(true)
    try {
      const { error } = await supabase.from("expenses").insert({
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        description: expenseForm.description,
        date: expenseForm.date
      })
      if (error) {
        // Wait, if table missing, notify user:
        if (error.code === '42P01') {
          toast.error("Expenses table missing in database. Please run migrations.")
          return
        }
        throw error
      }
      toast.success("Expense recorded successfully.")
      setIsExpenseOpen(false)
      setExpenseForm({ amount: "", category: "salary", description: "", date: new Date().toISOString().split("T")[0] })
      fetchData()
    } catch (err: any) {
      toast.error("Failed to save expense.")
    } finally {
      setIsSavingExpense(false)
    }
  }

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reference?.toLowerCase().includes(searchTerm.toLowerCase())

    // Brand filter only applies to non-internal transactions
    let matchesBrand = selectedBrand === "all"
    if (selectedBrand !== "all") {
      if (entry.type === "expense") matchesBrand = false
      else matchesBrand = true // Since actual brand ID mapping is needed, we will do string matching for now (simplified) or verify via API. Here we just match the name.
      // Quick workaround for name matching:
      const bName = brands.find(b => b.id === selectedBrand)?.business_name
      if (bName && entry.entity_name !== bName && entry.entity_name !== "Internal Operations") matchesBrand = false
    }

    // Tab Type Filter
    const matchesTab =
      activeTab === "overview" ||
      (activeTab === "income" && entry.net_impact >= 0) ||
      (activeTab === "expenses" && entry.type === "expense") ||
      (activeTab === "payouts" && entry.type === "payout")

    return matchesSearch && matchesBrand && matchesTab
  })

  // Calculations
  const totalInflowProduct = entries.filter(e => e.type === "product_sale").reduce((sum, e) => sum + e.gross_amount, 0)
  const totalPPFRetained = entries.filter(e => e.type === "product_sale").reduce((sum, e) => sum + e.net_impact, 0)
  const totalShelfIncome = entries.filter(e => e.type === "shelf_rent").reduce((sum, e) => sum + e.gross_amount, 0)
  const totalPayoutsDisbursed = entries.filter(e => e.type === "payout").reduce((sum, e) => sum + Math.abs(e.net_impact), 0)
  const totalOperationalExpenses = entries.filter(e => e.type === "expense").reduce((sum, e) => sum + Math.abs(e.net_impact), 0)

  const totalRetainedRevenue = totalPPFRetained + totalShelfIncome
  const netProfit = totalRetainedRevenue - totalOperationalExpenses

  const typeStyles: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    product_sale: { label: "Sale", icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
    payout: { label: "Payout", icon: ArrowUpCircle, color: "text-amber-600", bg: "bg-amber-50" },
    shelf_rent: { label: "Shelf Rent", icon: Landmark, color: "text-green-600", bg: "bg-green-50" },
    expense: { label: "Expense", icon: TrendingDown, color: "text-red-500", bg: "bg-red-50" }
  }

  const fmt = (num: number) => `NPR ${num.toLocaleString()}`

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto">

      {/* Header Profile */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-8 rounded-[2rem] border border-black/5 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-[#010307] rounded-[1.5rem] flex items-center justify-center shadow-xl">
            <Wallet className="w-8 h-8 text-[#FE7F2D]" />
          </div>
          <div>
            <h1 className="text-3xl font-black lowercase italic tracking-tight text-[#010307]">accounts center</h1>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#010307]/40 mt-1">Cashflows, Operational Expenses & Margins</p>
          </div>
        </div>

        <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 bg-[#FE7F2D] hover:bg-black text-white font-black uppercase tracking-widest text-[10px] px-8 rounded-2xl flex items-center gap-2 shadow-xl shadow-orange-500/20 transition-all">
              <Plus className="w-4 h-4" /> Record Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-[2rem] p-8 border-none shadow-2xl bg-white">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black lowercase italic">record an expense</DialogTitle>
              <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-gray-400">deducted from operating net margins.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Expense Category</Label>
                <select
                  value={expenseForm.category}
                  onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full h-14 bg-gray-50 border-none rounded-2xl px-5 text-sm font-black italic lowercase focus:ring-1 focus:ring-black/5"
                >
                  <option value="salary">Salary & Payroll</option>
                  <option value="rent">Retail Facility Rent</option>
                  <option value="utilities">Utilities & Internet</option>
                  <option value="marketing">Marketing & Social Media</option>
                  <option value="packaging">Packaging & Supplies</option>
                  <option value="miscellaneous">Miscellaneous</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Amount (NPR)</Label>
                  <Input
                    type="number"
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="h-14 bg-gray-50 border-none rounded-2xl font-black text-lg focus:ring-1 focus:ring-black/5"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Date</Label>
                  <Input
                    type="date"
                    value={expenseForm.date}
                    onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="h-14 bg-gray-50 border-none rounded-2xl font-black text-sm uppercase focus:ring-1 focus:ring-black/5"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-gray-500">Description</Label>
                <Input
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="h-14 bg-gray-50 border-none rounded-2xl font-bold italic lowercase text-sm focus:ring-1 focus:ring-black/5"
                  placeholder="e.g. march electricity bill"
                />
              </div>
              <Button
                onClick={handleSaveExpense}
                disabled={isSavingExpense}
                className="w-full h-14 mt-4 bg-black text-white hover:bg-[#FE7F2D] rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
              >
                {isSavingExpense ? <div className="flex gap-1 items-center px-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80 animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80 animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80 animate-bounce"></div>
                </div> : 'Deduct from Ledger'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Global Receipt Dialog */}
        <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
          <DialogContent className="max-w-md bg-white border-0 shadow-2xl rounded-[2rem] p-0 overflow-hidden">
            <div className="bg-[#010307] p-8 pb-12 flex flex-col items-center justify-center relative">
              <Receipt className="w-10 h-10 text-[#FE7F2D] mb-4" />
              <DialogTitle className="text-2xl font-black italic lowercase text-white tracking-tighter">
                {selectedEntry?.type === 'product_sale' ? 'Sale Invoice' : selectedEntry?.type === 'payout' ? 'Settlement Folio' : 'Transaction Record'}
              </DialogTitle>
              <p className="text-[10px] text-white/50 uppercase tracking-[0.2em] mt-1 font-black">
                {new Date(selectedEntry?.date || new Date()).toLocaleString("en-NP", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>

              {/* Jagged Bottom Edge */}
              <div className="absolute -bottom-[2px] left-0 w-full h-4 bg-repeat-x flex opacity-100" style={{ backgroundImage: "radial-gradient(circle at 10px 0, transparent 10px, white 11px)", backgroundSize: "20px 20px" }}></div>
            </div>

            <div className="p-8 pt-6 space-y-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Entity</span>
                <span className="font-black text-gray-900 italic">{selectedEntry?.entity_name}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reference ID</span>
                <span className="font-bold text-gray-500 uppercase font-mono text-xs">{selectedEntry?.reference || 'N/A'}</span>
              </div>

              <div className="w-full border-t border-dashed border-gray-200 my-4" />

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-gray-500 uppercase text-[9px] tracking-widest">Gross Calculation</span>
                  <span className="font-black text-gray-900">{fmt(selectedEntry?.gross_amount || 0)}</span>
                </div>
                {selectedEntry?.type === 'product_sale' && (
                  <div className="flex justify-between items-center text-sm text-[#FE7F2D]">
                    <span className="font-bold uppercase text-[9px] tracking-widest">THB Retained Margin (PPF)</span>
                    <span className="font-black">{fmt(selectedEntry?.net_impact || 0)}</span>
                  </div>
                )}
                {selectedEntry?.type === 'payout' && (
                  <div className="flex justify-between items-center text-sm text-green-600">
                    <span className="font-bold uppercase text-[9px] tracking-widest">Brand Payout (Net)</span>
                    <span className="font-black">{fmt(Math.abs(selectedEntry?.net_impact || 0))}</span>
                  </div>
                )}
                {selectedEntry?.type === 'expense' && (
                  <div className="flex justify-between items-center text-sm text-red-500">
                    <span className="font-bold uppercase text-[9px] tracking-widest">Deduction (Outflow)</span>
                    <span className="font-black">-{fmt(Math.abs(selectedEntry?.net_impact || 0))}</span>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Primary KPI Dashboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Retained PPF Revenue */}
        <Card className="border border-green-500/10 rounded-[2rem] bg-green-50 p-6 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 blur-2xl -mr-12 -mt-12 group-hover:bg-green-500/20 transition-all"></div>
          <p className="text-[10px] font-black text-green-700/50 uppercase tracking-widest relative z-10">Retained Margin (PPF)</p>
          <p className="text-3xl font-black italic text-green-600 tracking-tighter relative z-10">{fmt(totalPPFRetained)}</p>
          <p className="text-xs font-bold text-green-700/40 italic relative z-10">Generated from {fmt(totalInflowProduct)} GMV</p>
        </Card>

        {/* Shelf Income */}
        <Card className="border border-[#FE7F2D]/10 rounded-[2rem] bg-orange-50 p-6 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#FE7F2D]/10 blur-2xl -mr-12 -mt-12 group-hover:bg-[#FE7F2D]/20 transition-all"></div>
          <p className="text-[10px] font-black text-[#FE7F2D]/50 uppercase tracking-widest relative z-10">Total Rental Income</p>
          <p className="text-3xl font-black italic text-[#FE7F2D] tracking-tighter relative z-10">{fmt(totalShelfIncome)}</p>
          <p className="text-xs font-bold text-[#FE7F2D]/40 italic relative z-10">Brand subscriptions</p>
        </Card>

        {/* Operating Expenses */}
        <Card className="border border-red-500/10 rounded-[2rem] bg-red-50 p-6 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 blur-2xl -mr-12 -mt-12 group-hover:bg-red-500/20 transition-all"></div>
          <p className="text-[10px] font-black text-red-700/50 uppercase tracking-widest relative z-10">Operating Expenses</p>
          <p className="text-3xl font-black italic text-red-500 tracking-tighter relative z-10">- {fmt(totalOperationalExpenses)}</p>
          <p className="text-xs font-bold text-red-700/40 italic relative z-10">Manual deductions</p>
        </Card>

        {/* Net Free Cash Flow */}
        <Card className="border border-black/5 rounded-[2rem] bg-[#010307] p-6 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#FE7F2D]/10 blur-2xl -mr-12 -mt-12 group-hover:bg-[#FE7F2D]/20 transition-all"></div>
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest relative z-10">Net Operating Profit</p>
          <p className="text-3xl font-black italic text-white tracking-tighter relative z-10">{fmt(netProfit)}</p>
          <p className="text-xs font-bold text-white/40 italic relative z-10">After all expenses & payouts</p>
        </Card>
      </div>

      {/* Controls & Data Section */}
      <div className="space-y-6">

        {/* Navigation & Filters */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-[1.5rem] border border-black/5 shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
            <TabsList className="bg-gray-50 h-12 p-1.5 rounded-2xl gap-2 overflow-x-auto justify-start border-none">
              <TabsTrigger value="overview" className="rounded-xl px-5 h-full font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-black data-[state=active]:text-white">All Flow</TabsTrigger>
              <TabsTrigger value="income" className="rounded-xl px-5 h-full font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-green-600 data-[state=active]:text-white">Income</TabsTrigger>
              <TabsTrigger value="expenses" className="rounded-xl px-5 h-full font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-red-500 data-[state=active]:text-white">Expenses</TabsTrigger>
              <TabsTrigger value="payouts" className="rounded-xl px-5 h-full font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-amber-500 data-[state=active]:text-white">Transfers out</TabsTrigger>
              <div className="w-[1px] h-6 bg-black/10 mx-2 self-center hidden lg:block" />
              <TabsTrigger value="shelf_analytics" className="rounded-xl px-5 h-full font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-[#FE7F2D] data-[state=active]:text-white flex items-center gap-2 transition-all group">
                {/* <Layers className="w-4 h-4 group-data-[state=active]:animate-pulse" />
                Shelf Engine Analytics */}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-56">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="search items/brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 pl-11 rounded-2xl bg-gray-50 border-none font-bold italic lowercase text-xs focus:ring-1 focus:ring-black/5"
              />
            </div>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="h-12 bg-gray-50 border-none rounded-2xl px-5 font-black text-[10px] uppercase tracking-widest outline-none focus:ring-1 focus:ring-black/5 appearance-none min-w-[140px]"
            >
              <option value="all" className="font-sans">ALL ENTITIES</option>
              {brands.map(b => (
                <option key={b.id} value={b.id} className="font-sans font-bold">{b.business_name.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Master Ledger List */}
        <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden border border-black/5">
          <div className="overflow-x-auto min-w-[800px]">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="px-8 py-5 h-auto font-black text-[9px] uppercase tracking-widest text-[#010307]/40 w-[180px]">Chronology</TableHead>
                  <TableHead className="py-5 h-auto font-black text-[9px] uppercase tracking-widest text-[#010307]/40 w-[120px]">Type</TableHead>
                  <TableHead className="py-5 h-auto font-black text-[9px] uppercase tracking-widest text-[#010307]/40 w-[200px]">Entity</TableHead>
                  <TableHead className="py-5 h-auto font-black text-[9px] uppercase tracking-widest text-[#010307]/40 text-left">Description / Note</TableHead>
                  <TableHead className="py-5 h-auto font-black text-[9px] uppercase tracking-widest text-[#010307]/40 text-right">Volume</TableHead>
                  <TableHead className="px-8 py-5 h-auto font-black text-[9px] uppercase tracking-widest text-[#010307]/40 text-right">Net Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-50/50">
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-[400px]">
                      <div className="flex flex-col items-center justify-center gap-4 text-gray-300">
                        <div className="w-8 h-8 border-4 border-gray-100 border-t-[#FE7F2D] rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest">syncing bank nodes...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-[400px]">
                      <div className="flex flex-col items-center justify-center gap-2 text-gray-300 text-center">
                        <PiggyBank className="w-10 h-10 mb-2 opacity-50" />
                        <p className="text-sm font-black italic lowercase">no records established.</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Try adjusting your filters or date selectors.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => {
                    const style = typeStyles[entry.type]
                    const TypeIcon = style.icon
                    const isInflow = entry.net_impact >= 0
                    return (
                      <TableRow key={`${entry.type}-${entry.id}`} className="hover:bg-[#FE7F2D]/[0.02] transition-colors border-none group">
                        <td className="px-8 py-5 align-top">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-black text-gray-900 uppercase">
                              {new Date(entry.date).toLocaleDateString("en-NP", { month: 'short', day: '2-digit', year: 'numeric' })}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                              {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="py-5 align-top">
                          <Badge className={`rounded-xl h-7 px-3 border-none flex items-center justify-center gap-1.5 font-black uppercase text-[8px] tracking-widest ${style.bg} ${style.color}`}>
                            <TypeIcon className="w-3 h-3" /> {style.label}
                          </Badge>
                        </td>
                        <td className="py-5 align-top">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase ${entry.type === 'expense' ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-400'}`}>
                              {entry.entity_name.charAt(0)}
                            </div>
                            <span className="font-black italic text-sm">{entry.entity_name.toLowerCase()}</span>
                          </div>
                        </td>
                        <td className="py-5 align-top">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-gray-600 lowercase italic">{entry.description}</span>
                            {entry.reference && (
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{entry.reference}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-5 align-top text-right">
                          <span className="text-sm font-bold text-gray-400 tabular-nums">{fmt(entry.gross_amount)}</span>
                        </td>
                        <td className="px-8 py-5 align-top text-right">
                          <div className={`flex flex-col items-end gap-1 ${isInflow ? 'text-green-600' : 'text-red-500'} group-hover:hidden`}>
                            <div className="flex items-center gap-1.5 text-base font-black italic tabular-nums justify-end">
                              {isInflow ? '+' : '-'} {fmt(Math.abs(entry.net_impact))}
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-60 bg-current/10 px-2 py-0.5 rounded-sm">
                              {entry.type === 'product_sale' ? 'Margin In' : entry.type === 'shelf_rent' ? 'Income' : entry.type === 'expense' ? 'Spend' : 'Disbursement'}
                            </span>
                          </div>
                          <div className="hidden group-hover:flex justify-end gap-2 isolate mt-1">
                            <Button size="icon" variant="outline" className="h-9 w-9 rounded-full bg-white hover:bg-black hover:text-white border-black/5 shadow-sm" onClick={() => setSelectedEntry(entry)}>
                              <Receipt className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Render Shelf Analytics Below If Selected
        {activeTab === "shelf_analytics" && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
                <ShelfRentalRevenueMetrics />
            </div>
        )} */}
      </div>
    </div>
  )
}

