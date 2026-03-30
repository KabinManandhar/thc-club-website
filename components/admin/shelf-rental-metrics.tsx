"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  LayoutGrid,
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  Building2,
  Target,
  Layers,
  Search,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  BarChart3
} from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  pending: "bg-orange-50 text-orange-600 border-orange-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
  completed: "bg-gray-100 text-gray-500 border-gray-200",
}

const DURATION_MONTHS: Record<string, number> = {
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
}

export function ShelfRentalRevenueMetrics() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [projectionPlan, setProjectionPlan] = useState<"quarterly" | "half_yearly" | "yearly">("yearly")
  const [projectionLevel, setProjectionLevel] = useState<"all" | "bottom" | "eye_level" | "top_level">("all")
  const [pricingTiers, setPricingTiers] = useState<any[]>([])
  
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

  const calculateProjectedRevenue = () => {
    let total = 0
    
    // Regular Revenue
    const regPricing = pricingTiers.find(t => t.duration === projectionPlan && t.section_tier === 'regular')
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
    const premPricing = pricingTiers.find(t => t.duration === projectionPlan && t.section_tier === 'premium')
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

  if (loading) return (
    <div className="flex items-center justify-center p-32">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D]"></div>
    </div>
  )

  // ── Data Aggregations ──────────────────────────────────────────────────
  const activeBookings = bookings.filter(b => b.status === "active")
  const pendingBookings = bookings.filter(b => b.status === "pending")
  
  const activeMonthlyRevenue = activeBookings.reduce((s, b) => s + (b.monthly_rent || 0), 0)
  const totalContractValue = bookings.reduce((s, b) => s + (b.total_amount || 0), 0)
  const pipelineValue = pendingBookings.reduce((s, b) => s + (b.total_amount || 0), 0)
  
  const confirmedLeaseRevenue = activeBookings.reduce(
    (s, b) => s + (b.monthly_rent || 0) * (DURATION_MONTHS[b.duration as keyof typeof DURATION_MONTHS] || 1), 0
  )

  const premiumCount = bookings.filter(b => b.section_tier === "premium").length
  const regularCount = bookings.filter(b => b.section_tier === "regular").length

  const mainMetrics = [
    {
      label: "Active Monthly Revenue",
      value: `NPR ${activeMonthlyRevenue.toLocaleString()}`,
      sub: `${activeBookings.length} active leases`,
      icon: DollarSign,
      color: "text-green-500",
      bg: "bg-green-50",
      badge: "LIVE"
    },
    {
      label: "Confirmed Lease Revenue",
      value: `NPR ${confirmedLeaseRevenue.toLocaleString()}`,
      sub: "active total committed val",
      icon: ShieldCheck,
      color: "text-blue-500",
      bg: "bg-blue-50",
      badge: "LOCKED"
    },
    {
       label: "Total Contract Value",
       value: `NPR ${totalContractValue.toLocaleString()}`,
       sub: `${bookings.length} total records`,
       icon: BarChart3,
       color: "text-purple-500",
       bg: "bg-purple-50",
       badge: "GROSS"
    },
    {
      label: "Pipeline Value",
      value: `NPR ${pipelineValue.toLocaleString()}`,
      sub: `${pendingBookings.length} waiting approval`,
      icon: Clock,
      color: "text-[#FE7F2D]",
      bg: "bg-[#FE7F2D]/10",
      badge: "PENDING"
    }
  ]

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter flex items-center gap-4 text-[#010307] italic lowercase">
            Revenue <span className="text-[#FE7F2D]">Intelligence</span>
          </h2>
          <p className="text-[#010307]/40 font-medium italic mt-1 text-sm lowercase">
            Master control for all shelf rental financials and inventory analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Badge className="bg-white border-black/5 border text-gray-400 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl shadow-sm">
             {premiumCount} Premium · {regularCount} Regular
           </Badge>
        </div>
      </div>

      {/* KPI HUD */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {mainMetrics.map((m) => {
          const Icon = m.icon
          return (
            <Card key={m.label} className="border border-black/5 shadow-sm rounded-3xl bg-white p-6 flex flex-col gap-5 hover:border-[#FE7F2D]/20 transition-all group overflow-hidden relative">
              <div className="flex items-center justify-between relative z-10">
                <div className={`w-12 h-12 ${m.bg} rounded-2xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <Badge className="bg-gray-50 text-gray-400 border-gray-100 border font-black uppercase text-[8px] tracking-widest px-2 py-0.5 rounded-full">
                  {m.badge}
                </Badge>
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{m.label}</p>
                <p className="text-2xl font-black text-[#010307] tracking-tight mt-1">{m.value}</p>
                <p className="text-[10px] font-bold text-gray-300 mt-2 lowercase italic">{m.sub}</p>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform">
                 <Icon className="w-24 h-24" />
              </div>
            </Card>
          )
        })}
      </div>

      {/* Main Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Forecaster Card */}
        <Card className="lg:col-span-2 border-black/5 shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
          <div className="px-8 py-7 border-b border-black/5 flex justify-between items-center bg-gray-50/30">
            <div className="space-y-1">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gray-400">
                <Target className="w-4 h-4 text-[#FE7F2D]" /> Predictive Yield Engine
              </CardTitle>
            </div>
            <div className="flex bg-white border border-black/5 p-1 rounded-xl shadow-sm">
              {['quarterly', 'half_yearly', 'yearly'].map(plan => (
                <button 
                  key={plan}
                  onClick={() => setProjectionPlan(plan as any)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    projectionPlan === plan ? "bg-black text-white" : "text-gray-400 hover:text-black"
                  )}
                >
                  {plan.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <CardContent className="p-8 sm:p-12">
            <div className="grid sm:grid-cols-2 gap-16">
              <div className="space-y-10">
                <div className="space-y-4">
                  <Label className="uppercase text-[9px] font-black text-gray-300 tracking-widest">Zone Selective Filter</Label>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'bottom', 'eye_level', 'top_level'].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setProjectionLevel(lvl as any)}
                        className={cn(
                          "px-5 py-2.5 rounded-xl text-[10px] font-bold lowercase border transition-all",
                          projectionLevel === lvl ? "bg-[#FE7F2D]/10 border-[#FE7F2D] text-[#FE7F2D]" : "bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100"
                        )}
                      >
                        {lvl.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-7">
                  {(['bottom', 'eye_level', 'top_level'] as const).map(lvl => {
                    const reg = slotStats.regular[lvl]
                    const prem = slotStats.premium[lvl]
                    const total = reg.total + prem.total
                    const occupied = reg.occupied + prem.occupied
                    
                    const isSelected = projectionLevel === 'all' || projectionLevel === lvl
                    return (
                      <div key={lvl} className={cn("space-y-3 transition-opacity", !isSelected && "opacity-20 grayscale")}>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                          <span className="text-gray-400">{lvl.replace('_', ' ')}</span>
                          <span className="text-black font-black">{occupied} <span className="text-gray-300 font-bold lowercase italic tracking-tight">occupied</span> / {total} <span className="text-gray-300 font-bold lowercase italic tracking-tight">total</span></span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-1000",
                              lvl === 'eye_level' ? "bg-[#FE7F2D]" : lvl === 'bottom' ? "bg-blue-400" : "bg-purple-400"
                            )}
                            style={{ width: `${(total > 0 ? occupied / total : 0) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-gray-50/50 rounded-[3rem] p-12 flex flex-col items-center justify-center text-center space-y-5 border border-black/5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp className="w-40 h-40" /></div>
                <div className="space-y-2 relative z-10">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expected Monthly Yield</p>
                  <p className="text-6xl font-black tracking-tighter text-[#FE7F2D]">NPR {calculateProjectedRevenue().toLocaleString()}</p>
                </div>
                <div className="pt-6 space-y-3 relative z-10">
                  <div className="flex gap-2 justify-center">
                    <Badge variant="outline" className="bg-white border-black/5 text-black font-black text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-lg shadow-sm">
                      {projectionPlan}
                    </Badge>
                    <Badge variant="outline" className="bg-white border-black/5 text-black font-black text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-lg shadow-sm">
                      {projectionLevel}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-gray-300 italic max-w-[240px] mx-auto leading-relaxed">
                    Forecast model accounting for regular & premium tier variances.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Global Stats Sidebar */}
        <div className="space-y-8">
          <Card className="p-10 border-black/5 shadow-sm rounded-[2.5rem] bg-black text-white space-y-6 relative overflow-hidden group min-h-[220px] flex flex-col justify-center">
            <div className="absolute bottom-0 right-0 p-6 opacity-10 group-hover:translate-x-2 transition-transform"><Zap className="w-20 h-20 text-[#FE7F2D]" /></div>
            <div className="space-y-2 relative z-10">
              <p className="text-[10px] font-black text-[#FE7F2D] uppercase tracking-widest">Global Occupancy Pulse</p>
              <p className="text-5xl font-black tracking-tighter">
                {(() => {
                  const t = slotStats.regular.bottom.total + slotStats.regular.eye_level.total + slotStats.regular.top_level.total + 
                            slotStats.premium.bottom.total + slotStats.premium.eye_level.total + slotStats.premium.top_level.total;
                  const o = slotStats.regular.bottom.occupied + slotStats.regular.eye_level.occupied + slotStats.regular.top_level.occupied + 
                            slotStats.premium.bottom.occupied + slotStats.premium.eye_level.occupied + slotStats.premium.top_level.occupied;
                  return ((o / (t || 1)) * 100).toFixed(1);
                })()}%
              </p>
              <p className="text-[10px] text-white/30 italic font-mono uppercase tracking-tighter">Synchronized with physical inventory</p>
            </div>
          </Card>

          <Card className="p-10 border-black/5 shadow-sm rounded-[2.5rem] bg-white space-y-5 group relative overflow-hidden">
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Available Capacity</p>
                <p className="text-4xl font-black tracking-tighter text-black">
                  {(() => {
                    const t = slotStats.regular.bottom.total + slotStats.regular.eye_level.total + slotStats.regular.top_level.total + 
                              slotStats.premium.bottom.total + slotStats.premium.eye_level.total + slotStats.premium.top_level.total;
                    const o = slotStats.regular.bottom.occupied + slotStats.regular.eye_level.occupied + slotStats.regular.top_level.occupied + 
                              slotStats.premium.bottom.occupied + slotStats.premium.eye_level.occupied + slotStats.premium.top_level.occupied;
                    return t - o;
                  })()}
                </p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Ready for lease</p>
              </div>
              <div className="w-16 h-16 bg-gray-50 rounded-[1.5rem] flex items-center justify-center group-hover:bg-[#FE7F2D] group-hover:text-white transition-all shadow-sm">
                <Layers className="w-8 h-8" />
              </div>
            </div>
            <div className="pt-4 border-t border-gray-50 flex justify-between items-center relative z-10">
               <span className="text-[9px] font-black text-gray-300 uppercase">Growth Potential</span>
               <span className="text-xs font-black text-green-600">+ NPR {(pricingTiers.find(t => t.duration === 'yearly')?.eye_level_price || 0).toLocaleString()} /mo</span>
            </div>
          </Card>
        </div>

      </div>

      {/* Detailed Ledger Table */}
      <Card className="border border-black/5 shadow-sm rounded-[3rem] bg-white overflow-hidden">
        <div className="p-10 border-b border-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50/20 gap-4">
          <div className="space-y-1">
            <h3 className="font-black text-2xl lowercase italic tracking-tight">The Financial Ledger</h3>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Individual shelf lease audit & status tracking.</p>
          </div>
          <Badge className="bg-white border-black/5 border text-gray-400 font-black uppercase text-[10px] tracking-widest px-5 py-2.5 rounded-2xl shadow-sm">
            {bookings.length} Registered Records
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-gray-300 border-b border-gray-50 bg-gray-50/10">
                <th className="px-10 py-7 text-left">Brand Identity</th>
                <th className="px-6 py-7 text-left">Zone / Tier</th>
                <th className="px-6 py-7 text-left">Placement</th>
                <th className="px-6 py-7 text-left">Lease Term</th>
                <th className="px-6 py-7 text-right">Monthly Rent</th>
                <th className="px-10 py-7 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-gray-50/40 transition-colors group">
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-black text-gray-400 shrink-0 group-hover:bg-black group-hover:text-white transition-colors shadow-sm">
                          {b.brands?.business_name?.substring(0, 1)}
                       </div>
                       <div>
                         <p className="font-black text-gray-900 tracking-tight text-sm">{b.brands?.business_name || "---"}</p>
                         <p className="text-[9px] text-gray-400 font-mono tracking-tighter uppercase">{b.id.substring(0, 12)}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-7">
                    <Badge variant="outline" className="border-gray-100 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg group-hover:border-[#FE7F2D]/20 transition-colors">
                      {b.section_tier || 'standard'}
                    </Badge>
                  </td>
                  <td className="px-6 py-7 text-sm font-bold text-gray-600 lowercase tracking-tight">
                    {b.shelf_type?.replace("_", " ") || "---"}
                  </td>
                  <td className="px-6 py-7 text-xs font-bold text-gray-400 lowercase italic">
                    {b.duration?.replace("_", " ") || "---"}
                  </td>
                  <td className="px-6 py-7 text-right">
                    <p className="font-black text-gray-900 text-sm">NPR {(b.monthly_rent || 0).toLocaleString()}</p>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <Badge className={`font-black uppercase text-[9px] tracking-widest px-4 py-1.5 rounded-xl border-none shadow-sm ${STATUS_COLORS[b.status] || "bg-gray-50 text-gray-400"}`}>
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
