"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import {
  Building2,
  Clock,
  DollarSign,
  Layers,
  Target,
  Zap,
  Activity,
  Filter,
  Search,
  ArrowUpRight,
  ChartBar,
  PieChart
} from "lucide-react"
import { useEffect, useState } from "react"

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-600",
  pending: "bg-orange-500/10 text-orange-600",
  rejected: "bg-red-500/10 text-red-600",
  completed: "bg-gray-100 text-gray-500",
}

type ProjectionPlan = "monthly" | "quarterly" | "half_yearly" | "yearly"

export function ShelfRentalRevenueMetrics() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [projectionPlan, setProjectionPlan] = useState<ProjectionPlan>("monthly")
  const [projectionLevel, setProjectionLevel] = useState<"all" | "bottom" | "eye_level" | "top_level">("all")
  const [pricingTiers, setPricingTiers] = useState<any[]>([])

  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [filterTier, setFilterTier] = useState("all")
  const [filterDuration, setFilterDuration] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")

  const [slotStats, setSlotStats] = useState({
    regular: {
      bottom: { occupied: 0, total: 0 },
      eye_level: { occupied: 0, total: 0 },
      top_level: { occupied: 0, total: 0 }
    },
    premium: {
      bottom: { occupied: 0, total: 0 },
      eye_level: { occupied: 0, total: 0 },
      top_level: { occupied: 0, total: 0 }
    }
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [bookingsRes, slotsRes, pricingRes] = await Promise.all([
        supabase.from("shelf_bookings").select("*, brands(business_name)").order("created_at", { ascending: false }),
        supabase.from("shelf_slots").select("status, shelf_type, shelf_sections(section_tier)"),
        supabase.from("shelf_pricing_tiers").select("*")
      ])

      setBookings(bookingsRes.data || [])
      setPricingTiers(pricingRes.data || [])

      const slots = slotsRes.data || []

      const newStats = {
        regular: {
          bottom: { occupied: 0, total: 0 },
          eye_level: { occupied: 0, total: 0 },
          top_level: { occupied: 0, total: 0 }
        },
        premium: {
          bottom: { occupied: 0, total: 0 },
          eye_level: { occupied: 0, total: 0 },
          top_level: { occupied: 0, total: 0 }
        }
      }

      slots.forEach((s: any) => {
        const tier = s.shelf_sections?.section_tier === 'premium' ? 'premium' : 'regular'
        let type = s.shelf_type
        if (type === 'mixed') type = 'top_level' // fallback

        if (newStats[tier] && newStats[tier][type as keyof typeof newStats['regular']]) {
          newStats[tier][type as keyof typeof newStats['regular']].total++
          if (s.status === 'occupied') {
            newStats[tier][type as keyof typeof newStats['regular']].occupied++
          }
        }
      })

      setSlotStats(newStats)
    } catch (err) {
      console.error("Error fetching revenue data:", err)
    } finally {
      setLoading(false)
    }
  }

  const calculateProjectedRevenue = (plan: string) => {
    let total = 0

    // Regular Revenue
    const regPricing = pricingTiers.find(t => t.duration === plan && t.section_tier === 'regular')
    if (regPricing) {
      const levels = { bottom: regPricing.bottom_price, eye_level: regPricing.eye_level_price, top_level: regPricing.top_level_price }
      if (projectionLevel === 'all') {
        total += slotStats.regular.bottom.occupied * levels.bottom
        total += slotStats.regular.eye_level.occupied * levels.eye_level
        total += slotStats.regular.top_level.occupied * levels.top_level
      } else {
        total += slotStats.regular[projectionLevel as keyof typeof slotStats.regular].occupied * levels[projectionLevel as keyof typeof levels]
      }
    }

    // Premium Revenue
    const premPricing = pricingTiers.find(t => t.duration === plan && t.section_tier === 'premium')
    if (premPricing) {
      const levels = { bottom: premPricing.bottom_price, eye_level: premPricing.eye_level_price, top_level: premPricing.top_level_price }
      if (projectionLevel === 'all') {
        total += slotStats.premium.bottom.occupied * levels.bottom
        total += slotStats.premium.eye_level.occupied * levels.eye_level
        total += slotStats.premium.top_level.occupied * levels.top_level
      } else {
        total += slotStats.premium[projectionLevel as keyof typeof slotStats.premium].occupied * levels[projectionLevel as keyof typeof levels]
      }
    }

    return total
  }

  const getMaxMRR = () => {
     let total = 0
     const regPricing = pricingTiers.find(t => t.duration === 'monthly' && t.section_tier === 'regular')
     const premPricing = pricingTiers.find(t => t.duration === 'monthly' && t.section_tier === 'premium')

     if (regPricing) {
        total += slotStats.regular.bottom.total * regPricing.bottom_price
        total += slotStats.regular.eye_level.total * regPricing.eye_level_price
        total += slotStats.regular.top_level.total * regPricing.top_level_price
     }
     if (premPricing) {
        total += slotStats.premium.bottom.total * premPricing.bottom_price
        total += slotStats.premium.eye_level.total * premPricing.eye_level_price
        total += slotStats.premium.top_level.total * premPricing.top_level_price
     }
     return total
  }

  const fmt = (num: number) => `NPR ${num.toLocaleString()}`

  const activeBookings = bookings.filter(b => b.status === "active")
  const pendingBookings = bookings.filter(b => b.status === "pending")

  const activeMonthlyRevenue = activeBookings.reduce((s, b) => s + (b.monthly_rent || 0), 0)
  const pipelineValue = pendingBookings.reduce((s, b) => s + (b.total_amount || 0), 0)
  const totalMaxMRR = getMaxMRR()
  const currentOccupancyYieldPercent = totalMaxMRR > 0 ? (activeMonthlyRevenue / totalMaxMRR) * 100 : 0

  const premiumMetrics = {
    revenue: activeBookings.filter(b => b.section_tier === 'premium').reduce((s, b) => s + (b.monthly_rent || 0), 0),
    occupied: slotStats.premium.bottom.occupied + slotStats.premium.eye_level.occupied + slotStats.premium.top_level.occupied,
    total: slotStats.premium.bottom.total + slotStats.premium.eye_level.total + slotStats.premium.top_level.total
  }

  const regularMetrics = {
    revenue: activeBookings.filter(b => b.section_tier === 'regular' || !b.section_tier).reduce((s, b) => s + (b.monthly_rent || 0), 0),
    occupied: slotStats.regular.bottom.occupied + slotStats.regular.eye_level.occupied + slotStats.regular.top_level.occupied,
    total: slotStats.regular.bottom.total + slotStats.regular.eye_level.total + slotStats.regular.top_level.total
  }

  const filteredBookings = bookings.filter(b => {
      const matchSearch = b.brands?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) || b.id.includes(searchTerm)
      const matchTier = filterTier === 'all' || (b.section_tier || 'standard') === filterTier
      const matchDuration = filterDuration === 'all' || b.duration === filterDuration
      const matchStatus = filterStatus === 'all' || b.status === filterStatus
      return matchSearch && matchTier && matchDuration && matchStatus
  })

  const mainMetrics = [
    {
      label: "Current MRR (Live)",
      value: `NPR ${activeMonthlyRevenue.toLocaleString()}`,
      sub: `${activeBookings.length} Active Leases`,
      icon: DollarSign,
      color: "text-[#FE7F2D]",
      bg: "bg-[#FE7F2D]/10",
      badge: "LIVE PIPELINE"
    },
    {
      label: "Premium Sector MRR",
      value: `NPR ${premiumMetrics.revenue.toLocaleString()}`,
      sub: `${premiumMetrics.occupied}/${Math.max(premiumMetrics.total, 1)} Slots Occupied`,
      icon: Zap,
      color: "text-purple-500",
      bg: "bg-purple-50",
      badge: "HIGH YIELD"
    },
    {
      label: "Standard Sector MRR",
      value: `NPR ${regularMetrics.revenue.toLocaleString()}`,
      sub: `${regularMetrics.occupied}/${Math.max(regularMetrics.total, 1)} Slots Occupied`,
      icon: Building2,
      color: "text-blue-500",
      bg: "bg-blue-50",
      badge: "VOLUME CORE"
    },
    {
      label: "Pending Escrow / Backlog",
      value: `NPR ${pipelineValue.toLocaleString()}`,
      sub: `${pendingBookings.length} Awaiting Validation`,
      icon: Clock,
      color: "text-orange-500",
      bg: "bg-orange-50",
      badge: "INCOMING"
    }
  ]

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
      <div className="w-12 h-12 border-4 border-gray-100 border-t-[#FE7F2D] rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#010307]/40">Aggregating Global Shelf Analytics...</p>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Header Matrix */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-8 rounded-[2rem] border border-black/5 shadow-sm">
        <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-[#010307] rounded-[1.5rem] flex items-center justify-center shadow-xl">
               <Layers className="w-8 h-8 text-[#FE7F2D]" />
            </div>
            <div>
               <h1 className="text-3xl font-black lowercase italic tracking-tight text-[#010307]">shelf intelligence</h1>
               <p className="text-[11px] font-black uppercase tracking-widest text-[#010307]/40 mt-1">Spatial Inventory & Yield Projection Matrix</p>
            </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 px-5 py-3 bg-black rounded-[1rem] shadow-xl">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[9px] font-black uppercase tracking-widest text-white">
               {activeBookings.length} Active Spatial Nodes
             </span>
          </div>
          <div className="flex items-center gap-2 px-5 py-3 bg-[#FE7F2D]/10 rounded-[1rem]">
             <Activity className="w-4 h-4 text-[#FE7F2D]" />
             <span className="text-[9px] font-black uppercase tracking-widest text-[#FE7F2D]">
               {(currentOccupancyYieldPercent).toFixed(1)}% MRR Saturation
             </span>
          </div>
        </div>
      </div>

      {/* Primary MRR Dashboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainMetrics.map((m) => {
          const Icon = m.icon
          return (
            <Card key={m.label} className="border-none shadow-xl rounded-[2.5rem] bg-white p-6 md:p-8 flex flex-col gap-5 hover:-translate-y-1 transition-transform group overflow-hidden relative">
              <div className={`absolute top-0 right-0 w-24 h-24 ${m.bg} blur-2xl -mr-12 -mt-12 group-hover:scale-150 transition-all duration-700`}></div>
              <div className="flex items-center justify-between relative z-10">
                <div className={`w-12 h-12 ${m.bg} rounded-[1.2rem] flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <Badge className="bg-gray-50 text-gray-400 border-none font-black uppercase text-[8px] tracking-[0.2em] px-2.5 py-1 rounded-full shadow-sm">
                  {m.badge}
                </Badge>
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{m.label}</p>
                <p className="text-3xl font-black italic text-[#010307] tracking-tighter mt-1">{m.value}</p>
                <p className="text-[11px] font-bold text-gray-400 mt-2 lowercase italic border-t border-black/5 pt-2">{m.sub}</p>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Granular Model Projection Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Maximum Yield Engine */}
        <Card className="lg:col-span-8 border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden relative">
          <div className="p-8 border-b border-black/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[1.2rem] bg-black flex items-center justify-center">
                 <ChartBar className="w-6 h-6 text-[#FE7F2D]" />
              </div>
              <div>
                 <h2 className="text-xl font-black lowercase italic tracking-tight">predictive yield engine</h2>
                 <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-0.5">Forecast revenues based on contracted duration paths</p>
              </div>
            </div>
            <div className="flex bg-white border border-black/5 p-1.5 rounded-[1.2rem] shadow-sm overflow-x-auto w-full md:w-auto">
              {['monthly', 'quarterly', 'half_yearly', 'yearly'].map(plan => (
                <button
                  key={plan}
                  onClick={() => setProjectionPlan(plan as ProjectionPlan)}
                  className={cn(
                    "px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                    projectionPlan === plan ? "bg-black text-white shadow-md relative group" : "text-gray-400 hover:text-black"
                  )}
                >
                  {plan.replace('_', ' ')}
                  {projectionPlan === plan && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#FE7F2D] rounded-full animate-ping"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <CardContent className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-12 sm:gap-16 items-center">
              
              {/* Dynamic Progress Stack */}
              <div className="space-y-12">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="uppercase text-[9px] font-black text-gray-400 tracking-widest">Isolated Horizontal Scope Filter</Label>
                    <ArrowUpRight className="w-4 h-4 text-gray-300" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'bottom', 'eye_level', 'top_level'].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setProjectionLevel(lvl as any)}
                        className={cn(
                          "px-5 py-2.5 rounded-[1rem] text-[10px] font-bold lowercase italic transition-all border border-transparent",
                          projectionLevel === lvl ? "bg-[#FE7F2D] text-white shadow-lg shadow-orange-500/20" : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:border-gray-200"
                        )}
                      >
                        {lvl.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-8 pl-2 border-l-2 border-gray-100">
                  {(['top_level', 'eye_level', 'bottom'] as const).map(lvl => {
                    const reg = slotStats.regular[lvl]
                    const prem = slotStats.premium[lvl]
                    const total = reg.total + prem.total
                    const occupied = reg.occupied + prem.occupied

                    const isSelected = projectionLevel === 'all' || projectionLevel === lvl
                    return (
                      <div key={lvl} className={cn("space-y-3 transition-opacity", !isSelected && "opacity-30 grayscale")}>
                        <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest pl-2">
                          <span className="text-gray-400 flex items-center gap-2">
                             <div className={cn(
                               "w-1.5 h-1.5 rounded-full",
                               lvl === 'eye_level' ? "bg-[#FE7F2D]" : lvl === 'bottom' ? "bg-blue-500" : "bg-purple-500"
                             )} />
                             {lvl.replace('_', ' ')}
                          </span>
                          <span className="text-black text-lg italic">{occupied} <span className="text-gray-300 font-bold lowercase tracking-tight text-xs">/ {total} utilized</span></span>
                        </div>
                        <div className="h-4 bg-gray-50 rounded-full overflow-hidden flex shadow-inner">
                          <div
                            className={cn(
                              "h-full rounded-r-full transition-all duration-1000",
                              lvl === 'eye_level' ? "bg-[#FE7F2D]" : lvl === 'bottom' ? "bg-blue-500" : "bg-purple-500"
                            )}
                            style={{ width: `${(total > 0 ? occupied / total : 0) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Holographic Projection Card */}
              <div className="bg-[#010307] rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center space-y-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#FE7F2D]/10 blur-[100px] rounded-full pointer-events-none"></div>
                
                <div className="space-y-1 relative z-10 w-full">
                  <Badge className="bg-white/10 text-white font-black border-none text-[8px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-md mb-4 shadow-xl">
                      {projectionPlan.replace('_', ' ')} Forecast Model
                  </Badge>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest pl-2">Expected Gross Income</p>
                  <p className="text-4xl sm:text-6xl font-black tracking-tighter italic text-[#FE7F2D] w-full break-words py-2 drop-shadow-xl shadow-orange-500">
                    {fmt(calculateProjectedRevenue(projectionPlan))}
                  </p>
                </div>

                <div className="pt-6 border-t border-white/10 w-full relative z-10 grid grid-cols-2 gap-4">
                  <div className="text-left bg-white/5 p-4 rounded-2xl">
                     <p className="text-[9px] text-white/40 font-black uppercase tracking-widest mb-1">{projectionPlan.replace('_', ' ')} Scope</p>
                     <p className="text-white font-black text-sm">{projectionLevel.replace('_', ' ').toUpperCase()}</p>
                  </div>
                  <div className="text-left bg-white/5 p-4 rounded-2xl">
                     <p className="text-[9px] text-white/40 font-black uppercase tracking-widest mb-1">Max Potential MRR</p>
                     <p className="text-white font-black text-sm">{fmt(totalMaxMRR)}</p>
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Vertical Global Pulse Stats */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="flex-1 p-10 border-none shadow-xl rounded-[3rem] bg-[#FE7F2D] text-white space-y-8 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform duration-700 pointer-events-none"><PieChart className="w-48 h-48 text-white -mr-12 -mt-12" /></div>
            
             <div className="space-y-2 relative z-10 scale-100 group-hover:scale-105 transition-transform origin-left">
               <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] flex items-center gap-2">
                 <Target className="w-4 h-4" /> Global Fill Rate
               </p>
               <p className="text-7xl font-black tracking-tighter italic shadow-sm drop-shadow-md">
                {(() => {
                  const t = slotStats.regular.bottom.total + slotStats.regular.eye_level.total + slotStats.regular.top_level.total +
                    slotStats.premium.bottom.total + slotStats.premium.eye_level.total + slotStats.premium.top_level.total;
                  const o = slotStats.regular.bottom.occupied + slotStats.regular.eye_level.occupied + slotStats.regular.top_level.occupied +
                    slotStats.premium.bottom.occupied + slotStats.premium.eye_level.occupied + slotStats.premium.top_level.occupied;
                  return ((o / (t || 1)) * 100).toFixed(1);
                })()}%
               </p>
             </div>
            
             <div className="relative z-10 space-y-4">
               <div className="w-full bg-black/20 rounded-full h-3 p-0.5 overflow-hidden">
                 <div className="bg-white h-full rounded-full" style={{ width: `${(() => {
                  const t = slotStats.regular.bottom.total + slotStats.regular.eye_level.total + slotStats.regular.top_level.total +
                    slotStats.premium.bottom.total + slotStats.premium.eye_level.total + slotStats.premium.top_level.total;
                  const o = slotStats.regular.bottom.occupied + slotStats.regular.eye_level.occupied + slotStats.regular.top_level.occupied +
                    slotStats.premium.bottom.occupied + slotStats.premium.eye_level.occupied + slotStats.premium.top_level.occupied;
                  return ((o / (t || 1)) * 100);
                 })()}%`}} />
               </div>
               <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest font-mono">
                  {(() => {
                    const o = slotStats.regular.bottom.occupied + slotStats.regular.eye_level.occupied + slotStats.regular.top_level.occupied +
                      slotStats.premium.bottom.occupied + slotStats.premium.eye_level.occupied + slotStats.premium.top_level.occupied;
                    return o;
                  })()} OUT OF {(() => {
                    const t = slotStats.regular.bottom.total + slotStats.regular.eye_level.total + slotStats.regular.top_level.total +
                      slotStats.premium.bottom.total + slotStats.premium.eye_level.total + slotStats.premium.top_level.total;
                    return t;
                  })()} PHYSICAL NODES SLOTTED
               </p>
             </div>
          </Card>

          <Card className="p-8 border-none shadow-xl rounded-[3rem] bg-white space-y-6 group relative overflow-hidden">
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-1 relative z-10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                   <Target className="w-3 h-3 text-red-500" /> Untapped MRR Capacity
                </p>
                <div className="flex items-end gap-2 pt-2">
                    <p className="text-4xl font-black tracking-tighter italic text-black">
                       {fmt(totalMaxMRR - activeMonthlyRevenue)}
                    </p>
                </div>
              </div>
            </div>
            <div className="pt-5 border-t border-black/5 flex justify-between items-center relative z-10">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Growth Margin</span>
              <Badge className="bg-red-500/10 text-red-600 border-none shadow-none font-black text-[9px] uppercase tracking-[0.2em] rounded-lg">{(100 - currentOccupancyYieldPercent).toFixed(1)}% LEFT</Badge>
            </div>
          </Card>
        </div>

      </div>

      {/* Advanced Ledger Search & Filtering */}
      <Card className="border-none shadow-2xl rounded-[3rem] bg-white overflow-hidden relative border border-black/5">
        <div className="p-8 md:p-12 border-b border-black/5 flex flex-col items-start gap-8 bg-gray-50/20">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-6">
              <div className="space-y-2">
                 <h3 className="font-black text-3xl lowercase italic tracking-tight text-[#010307]">active network leases</h3>
                 <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Comprehensive Master Table for Shelf Contracts</p>
              </div>
              <Badge className="bg-[#010307] border-none text-white font-black uppercase text-[10px] tracking-[0.2em] px-6 py-3 rounded-[1rem] shadow-xl">
                 {filteredBookings.length} Result Items
              </Badge>
          </div>

          <div className="w-full flex flex-col md:flex-row items-center gap-4 bg-white p-2 rounded-[1.5rem] shadow-sm border border-black/5">
             <div className="flex-1 w-full relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                 <Input 
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   placeholder="Search brand identities, id..." 
                   className="pl-12 h-14 bg-transparent border-none rounded-[1.5rem] font-bold text-sm italic focus:ring-0 shadow-none" 
                 />
             </div>
             <div className="h-8 w-[1px] bg-gray-100 hidden md:block"></div>
             
             <div className="w-full md:w-auto flex items-center gap-2 overflow-x-auto pr-2">
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1.5 shrink-0">
                    <Filter className="w-3 h-3 text-gray-400 ml-2" />
                    <select value={filterTier} onChange={e => setFilterTier(e.target.value)} className="bg-transparent border-none font-black text-[9px] uppercase tracking-widest text-[#010307] focus:ring-0 py-2 pr-6 appearance-none outline-none">
                        <option value="all">Any Sector</option>
                        <option value="premium">Premium</option>
                        <option value="regular">Standard / Regular</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1.5 shrink-0">
                    <select value={filterDuration} onChange={e => setFilterDuration(e.target.value)} className="bg-transparent border-none font-black text-[9px] uppercase tracking-widest text-[#010307] focus:ring-0 py-2 pr-6 appearance-none outline-none">
                        <option value="all">Any Duration</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="half_yearly">Half Yearly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1.5 shrink-0">
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-transparent border-none font-black text-[9px] uppercase tracking-widest text-[#010307] focus:ring-0 py-2 pr-6 appearance-none outline-none">
                        <option value="all">Any Status</option>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
             <thead>
                <tr className="bg-gray-50/80">
                   <th className="px-12 py-6 font-black text-[9px] uppercase tracking-[0.2em] text-[#010307]/40 w-[20%]">Brand Identity</th>
                   <th className="px-6 py-6 font-black text-[9px] uppercase tracking-[0.2em] text-[#010307]/40">Classification</th>
                   <th className="px-6 py-6 font-black text-[9px] uppercase tracking-[0.2em] text-[#010307]/40">Vertical Tier</th>
                   <th className="px-6 py-6 font-black text-[9px] uppercase tracking-[0.2em] text-[#010307]/40">Lease Plan</th>
                   <th className="px-6 py-6 font-black text-[9px] uppercase tracking-[0.2em] text-[#010307]/40 text-right">Commitment Vol</th>
                   <th className="px-12 py-6 font-black text-[9px] uppercase tracking-[0.2em] text-[#010307]/40 text-right">System Status</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-gray-50/80">
                {filteredBookings.length === 0 ? (
                   <tr>
                      <td colSpan={6} className="py-32 text-center bg-gray-50/20">
                          <div className="flex flex-col items-center justify-center gap-4 text-gray-300">
                              <Search className="w-12 h-12 mb-2 opacity-20" />
                              <p className="text-xl font-black italic lowercase text-gray-400">no leases discovered.</p>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Adjust your criteria or metrics to locate more records.</p>
                          </div>
                      </td>
                   </tr>
                ) : filteredBookings.map(b => (
                   <tr key={b.id} className="hover:bg-[#FE7F2D]/[0.02] transition-colors group border-none">
                      <td className="px-12 py-6 align-middle">
                         <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-[1rem] bg-gray-100 flex items-center justify-center font-black text-gray-400 shrink-0 group-hover:bg-[#010307] group-hover:text-white transition-all shadow-sm">
                               {b.brands?.business_name?.substring(0, 1) || "?"}
                            </div>
                            <div className="flex flex-col">
                               <p className="font-black italic text-gray-900 text-sm">{b.brands?.business_name?.toLowerCase() || "unidentified entity"}</p>
                               <p className="text-[9px] text-gray-400 font-bold tracking-[0.2em] uppercase mt-1">ID: {b.id.substring(0, 8)}</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-6 align-middle">
                         <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${b.section_tier === 'premium' ? 'bg-[#FE7F2D] shadow-[0_0_8px_rgba(254,127,45,0.8)]' : 'bg-blue-400'}`} />
                             <span className="font-black italic text-[#010307] text-xs">{(b.section_tier || 'standard').toLowerCase()}</span>
                         </div>
                      </td>
                      <td className="px-6 py-6 align-middle text-xs font-bold text-gray-500 lowercase italic tracking-tight">
                         <Badge variant="outline" className="border-gray-200 text-gray-500 font-black uppercase tracking-widest text-[8px] bg-gray-50">
                             {b.shelf_type?.replace("_", " ") || "unknown"}
                         </Badge>
                      </td>
                      <td className="px-6 py-6 align-middle text-xs font-bold text-gray-400 lowercase tracking-widest">
                         <div className="flex flex-col justify-start items-start gap-1">
                            <span className="text-[#010307] font-black italic">{b.duration?.replace("_", " ") || "contract"}</span>
                         </div>
                      </td>
                      <td className="px-6 py-6 align-middle text-right">
                         <div className="flex flex-col items-end gap-1">
                             <p className="font-black text-gray-900 text-sm tabular-nums truncate">NPR {(b.monthly_rent || 0).toLocaleString()}</p>
                             <p className="text-[8px] font-black uppercase tracking-widest text-gray-400">/ MO BASE</p>
                         </div>
                      </td>
                      <td className="px-12 py-6 align-middle text-right">
                         <Badge className={`font-black uppercase text-[8px] tracking-[0.2em] px-4 py-2 rounded-[0.8rem] border-none shadow-sm ${STATUS_COLORS[b.status] || "bg-gray-100 text-gray-400"}`}>
                            {b.status}
                         </Badge>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
