"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  CreditCard,
  DollarSign,
  Download,
  Filter,
  Landmark,
  Package,
  PiggyBank,
  Receipt,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface Brand {
  id: string
  business_name: string
}

interface FinancialEntry {
  id: string
  date: string
  type: "product_sale" | "payout" | "shelf_rent"
  brand_id: string
  brand_name: string
  gross_amount: number
  net_impact: number // Positive for income to THC, negative for outflow
  description: string
  status: string
  reference?: string
}

export function AccountsManagement() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBrand, setSelectedBrand] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [dateRange, setDateRange] = useState({ from: "", to: "" })
  const [activeTab, setActiveTab ] = useState("all")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch Brands
      const { data: brandsData } = await supabase.from("brands").select("id, business_name")
      setBrands(brandsData || [])

      // 2. Fetch Invoices (Product Sales)
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, created_at, total_amount, ppf_amount, brand_id, brands(business_name), invoice_number")
        .order("created_at", { ascending: false })

      // 3. Fetch Payouts
      const { data: payouts } = await supabase
        .from("payouts")
        .select("id, paid_at, net_payout, gross_sales, ppf_amount, brand_id, brands(business_name), month, year, status")
        .order("paid_at", { ascending: false })

      // 4. Fetch Shelf Bookings
      const { data: bookings } = await supabase
        .from("shelf_bookings")
        .select("id, created_at, total_amount, brand_id, brands(business_name), section, duration, status")
        .order("created_at", { ascending: false })

      const allEntries: FinancialEntry[] = []

      // Map Invoices to Entries
      invoices?.forEach(inv => {
        const brands = inv.brands as any
        const brandName = Array.isArray(brands) ? brands[0]?.business_name : brands?.business_name
        allEntries.push({
          id: inv.id,
          date: inv.created_at,
          type: "product_sale",
          brand_id: inv.brand_id,
          brand_name: brandName || "Unknown Brand",
          gross_amount: inv.total_amount,
          net_impact: inv.ppf_amount || 0, // THC's direct income from sale is PPF
          description: `Sale #${inv.invoice_number}`,
          status: "paid",
          reference: inv.invoice_number
        })
      })

      // Map Payouts to Entries
      payouts?.forEach(p => {
        if (p.status === "paid" && p.paid_at) {
          const brands = p.brands as any
          const brandName = Array.isArray(brands) ? brands[0]?.business_name : brands?.business_name
          allEntries.push({
            id: p.id,
            date: p.paid_at,
            type: "payout",
            brand_id: p.brand_id,
            brand_name: brandName || "Unknown Brand",
            gross_amount: p.net_payout,
            net_impact: -p.net_payout, // Outflow for THC
            description: `Payout for ${p.month}/${p.year}`,
            status: "completed",
            reference: `PO-${p.id.slice(0,8)}`
          })
        }
      })

      // Map Shelf Bookings to Entries
      bookings?.forEach(b => {
        if (b.status === "active" || b.status === "completed") {
          const brands = b.brands as any
          const brandName = Array.isArray(brands) ? brands[0]?.business_name : brands?.business_name
          allEntries.push({
            id: b.id,
            date: b.created_at,
            type: "shelf_rent",
            brand_id: b.brand_id,
            brand_name: brandName || "Unknown Brand",
            gross_amount: b.total_amount,
            net_impact: b.total_amount, // 100% income for THC
            description: `Shelf Booking (${b.section}) - ${b.duration}`,
            status: b.status,
            reference: `BK-${b.id.slice(0,8)}`
          })
        }
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

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.reference?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesBrand = selectedBrand === "all" || entry.brand_id === selectedBrand
    const matchesType = activeTab === "all" || entry.type === activeTab
    
    let matchesDate = true
    if (dateRange.from) {
      matchesDate = matchesDate && new Date(entry.date) >= new Date(dateRange.from)
    }
    if (dateRange.to) {
      const toDate = new Date(dateRange.to)
      toDate.setHours(23, 59, 59, 999)
      matchesDate = matchesDate && new Date(entry.date) <= toDate
    }

    return matchesSearch && matchesBrand && matchesType && matchesDate
  })

  // Calculations
  const totalInflowProduct = entries.filter(e => e.type === "product_sale").reduce((sum, e) => sum + e.gross_amount, 0)
  const totalPPFRetained = entries.filter(e => e.type === "product_sale").reduce((sum, e) => sum + e.net_impact, 0)
  const totalShelfIncome = entries.filter(e => e.type === "shelf_rent").reduce((sum, e) => sum + e.gross_amount, 0)
  const totalPayoutsDisbursed = entries.filter(e => e.type === "payout").reduce((sum, e) => sum + Math.abs(e.net_impact), 0)
  
  const netProfit = totalPPFRetained + totalShelfIncome

  const kpis = [
    {
      label: "Total Gross GMV",
      value: `NPR ${totalInflowProduct.toLocaleString()}`,
      sub: "Aggregated Product Sales",
      icon: TrendingUp,
      color: "text-blue-500",
      bg: "bg-blue-50"
    },
    {
      label: "Retained Shelf Revenue",
      value: `NPR ${totalShelfIncome.toLocaleString()}`,
      sub: "Leasing Income",
      icon: Landmark,
      color: "text-[#FE7F2D]",
      bg: "bg-orange-50"
    },
    {
      label: "PPF Commissions",
      value: `NPR ${totalPPFRetained.toLocaleString()}`,
      sub: "Platform Processing Fees",
      icon: Receipt,
      color: "text-purple-500",
      bg: "bg-purple-50"
    },
    {
      label: "Net Operating Revenue",
      value: `NPR ${netProfit.toLocaleString()}`,
      sub: "Shelf + commissions",
      icon: PiggyBank,
      color: "text-green-600",
      bg: "bg-green-50"
    }
  ]

  const typeStyles: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    product_sale: {
      label: "Product Sale",
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    payout: {
      label: "Brand Payout",
      icon: ArrowUpCircle,
      color: "text-red-600",
      bg: "bg-red-50"
    },
    shelf_rent: {
      label: "Shelf Rent",
      icon: Landmark,
      color: "text-green-600",
      bg: "bg-green-50"
    }
  }

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
              <Landmark className="w-6 h-6 text-[#FE7F2D]" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic">Financials & Accounts</h1>
              <p className="text-gray-400 font-medium text-sm lowercase italic">consolidated treasury ledger for all revenue streams.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
           {/* Date Filters */}
           <div className="flex items-center gap-2 bg-white rounded-2xl border border-black/5 p-1.5 shadow-sm overflow-hidden flex-1 sm:flex-none">
              <div className="flex items-center gap-2 px-3 py-1">
                 <Calendar className="w-3.5 h-3.5 text-gray-400" />
                 <input 
                    type="date" 
                    value={dateRange.from}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="bg-transparent text-[11px] font-bold border-none focus:ring-0 w-28 uppercase"
                 />
                 <span className="text-[10px] font-black text-gray-300">to</span>
                 <input 
                    type="date" 
                    value={dateRange.to}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="bg-transparent text-[11px] font-bold border-none focus:ring-0 w-28 uppercase"
                 />
                 {(dateRange.from || dateRange.to) && (
                   <button onClick={() => setDateRange({ from: "", to: "" })} className="text-gray-400 hover:text-black">
                     <Badge variant="outline" className="p-0.5"><ArrowDownCircle className="w-3 h-3 rotate-45" /></Badge>
                   </button>
                 )}
              </div>
           </div>

           <div className="relative flex-1 sm:w-64 sm:flex-none">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <Input 
                placeholder="search ledger..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 rounded-2xl h-12 border-black/5 font-bold italic lowercase text-sm"
             />
           </div>

           <Button variant="outline" className="rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest border-black/5 gap-2 shadow-sm">
             <Download className="w-3.5 h-3.5" /> Export Data
           </Button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <Card key={idx} className="border-none shadow-xl rounded-[2.5rem] bg-white p-8 border border-white group hover:shadow-2xl transition-all duration-500 overflow-hidden relative">
               <div className={`absolute top-0 right-0 w-24 h-24 ${kpi.bg} blur-3xl -mr-12 -mt-12 opacity-50`}></div>
               <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className={`w-12 h-12 ${kpi.bg} rounded-2xl flex items-center justify-center ${kpi.color}`}>
                       <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{kpi.label}</p>
                    <h3 className="text-2xl font-black text-[#010307] tracking-tighter mt-1">{kpi.value}</h3>
                    <p className="text-[10px] font-bold text-gray-300 mt-1 italic lowercase">{kpi.sub}</p>
                  </div>
               </div>
            </Card>
          )
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-black/5 shadow-sm inline-flex gap-1">
          <TabsList className="bg-transparent border-none h-auto p-0 gap-1 flex">
            <TabsTrigger value="all" className="rounded-xl font-black uppercase text-[10px] tracking-widest px-6 py-3 data-[state=active]:bg-black data-[state=active]:text-white transition-all">All History</TabsTrigger>
            <TabsTrigger value="shelf_rent" className="rounded-xl font-black uppercase text-[10px] tracking-widest px-6 py-3 data-[state=active]:bg-[#FE7F2D] data-[state=active]:text-white transition-all">Shelf Rev</TabsTrigger>
            <TabsTrigger value="product_sale" className="rounded-xl font-black uppercase text-[10px] tracking-widest px-6 py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">Product Sales</TabsTrigger>
            <TabsTrigger value="payout" className="rounded-xl font-black uppercase text-[10px] tracking-widest px-6 py-3 data-[state=active]:bg-red-600 data-[state=active]:text-white transition-all">Payouts</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <select 
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="h-12 bg-white border border-black/5 rounded-2xl px-6 font-bold text-[11px] uppercase tracking-widest shadow-sm outline-none focus:border-[#FE7F2D]/20 appearance-none min-w-[200px]"
          >
            <option value="all">filter by brand: all</option>
            {brands.map(b => (
              <option key={b.id} value={b.id}>{b.business_name.toLowerCase()}</option>
            ))}
          </select>
          
          <div className="hidden lg:flex items-center gap-3 px-6 py-3 bg-white rounded-2xl border border-black/5 shadow-sm">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40">
               {filteredEntries.length} entries matching
             </span>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-white/50 relative">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="border-none">
                <TableHead className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Date / Cycle</TableHead>
                <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Classification</TableHead>
                <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Brand Partner</TableHead>
                <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400">Description / Ref</TableHead>
                <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-gray-400 text-right">Gross Amount</TableHead>
                <TableHead className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-gray-400 text-right">Net Impact (Treasury)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-50">
              {loading ? (
                <TableRow>
                   <TableCell colSpan={6} className="py-24 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE7F2D] mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">Synchronizing Archives...</p>
                   </TableCell>
                </TableRow>
              ) : filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-24 text-center text-gray-300 italic font-medium">
                    No financial records found for the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => {
                  const style = typeStyles[entry.type]
                  const TypeIcon = style.icon
                  return (
                    <TableRow key={entry.id} className="hover:bg-gray-50/50 transition-all group">
                      <td className="px-10 py-6">
                        <div className="text-[12px] font-black text-gray-900 italic uppercase">
                          {new Date(entry.date).toLocaleDateString("en-NP", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-[10px] font-bold text-gray-300 tabular-nums uppercase">
                          {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-6">
                        <Badge className={`rounded-xl font-black uppercase text-[8px] tracking-widest px-3 py-1.5 border-none shadow-sm ${style.bg} ${style.color} flex items-center gap-1.5 w-fit`}>
                           <TypeIcon className="w-3 h-3" />
                           {style.label}
                        </Badge>
                      </td>
                      <td className="py-6">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black uppercase text-gray-400">
                              {entry.brand_name.charAt(0)}
                           </div>
                           <span className="font-black italic text-sm">{entry.brand_name.toLowerCase()}</span>
                        </div>
                      </td>
                      <td className="py-6">
                         <div className="text-[11px] font-bold text-gray-700 lowercase italic">{entry.description}</div>
                         <div className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-0.5">{entry.reference}</div>
                      </td>
                      <td className="py-6 text-right font-bold text-[13px] tabular-nums text-gray-500">
                        NPR {entry.gross_amount.toLocaleString()}
                      </td>
                      <td className="px-10 py-6 text-right">
                         <div className={`text-base font-black italic tabular-nums flex items-center justify-end gap-2 ${entry.net_impact >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {entry.net_impact >= 0 ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            NPR {Math.abs(entry.net_impact).toLocaleString()}
                         </div>
                         <div className="text-[9px] font-black uppercase tracking-widest text-gray-300 mt-0.5">
                            {entry.net_impact >= 0 ? 'net margin inflow' : ' treasury disbursement'}
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
      
      {/* Footer Summary */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-10 bg-black rounded-[3rem] text-white overflow-hidden relative shadow-2xl">
         <div className="absolute top-0 right-0 w-64 h-64 bg-[#FE7F2D]/20 blur-3xl -mr-32 -mt-32"></div>
         <div className="space-y-1 relative z-10 w-full md:w-auto">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 italic">Treasury Position</h4>
            <div className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-4">
               thc club consolidated
               <Badge className="bg-[#FE7F2D] text-white border-none font-black text-[10px] px-3">Live</Badge>
            </div>
         </div>
         
         <div className="flex gap-12 relative z-10 w-full md:w-auto overflow-x-auto pb-4 md:pb-0 underline-offset-8">
            <div className="text-right whitespace-nowrap">
               <p className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-1">Total Disbursements</p>
               <p className="text-2xl font-black italic tabular-nums text-red-400">NPR {totalPayoutsDisbursed.toLocaleString()}</p>
            </div>
            <div className="text-right whitespace-nowrap">
               <p className="text-[9px] font-black uppercase text-white/40 tracking-widest mb-1">Retained Earnings (All time)</p>
               <p className="text-2xl font-black italic tabular-nums text-[#FE7F2D]">NPR {netProfit.toLocaleString()}</p>
            </div>
         </div>
      </div>
    </div>
  )
}
