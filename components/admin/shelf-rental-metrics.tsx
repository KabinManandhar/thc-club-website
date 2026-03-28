"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  LayoutGrid,
  TrendingUp,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  HelpCircle,
  ArrowUpRight,
  Building2,
} from "lucide-react"

const DURATION_MONTHS: Record<string, number> = {
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
}

const TIER_COLORS: Record<string, string> = {
  premium: "bg-[#FE7F2D]/10 text-[#FE7F2D] border-[#FE7F2D]/20",
  regular: "bg-blue-50 text-blue-600 border-blue-100",
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  pending: "bg-orange-50 text-orange-600 border-orange-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
  completed: "bg-gray-100 text-gray-500 border-gray-200",
}

export function ShelfRentalRevenueMetrics() {
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("shelf_bookings")
      .select("*, brands(business_name, email)")
      .order("created_at", { ascending: false })
    setBookings(data || [])
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center p-32">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D]"></div>
    </div>
  )

  // ── Metrics ──────────────────────────────────────────────────────────────
  const activeBookings  = bookings.filter(b => b.status === "active")
  const pendingBookings = bookings.filter(b => b.status === "pending")

  const totalContractValue  = bookings.reduce((s, b) => s + (b.total_amount || 0), 0)
  const activeMonthlyRevenue = activeBookings.reduce((s, b) => s + (b.monthly_rent || 0), 0)

  // confirmed revenue = sum of monthly_rent * months for ACTIVE bookings
  const confirmedRevenue = activeBookings.reduce(
    (s, b) => s + (b.monthly_rent || 0) * (DURATION_MONTHS[b.duration] || 1), 0
  )

  // pipeline = total_amount of pending bookings
  const pipelineValue = pendingBookings.reduce((s, b) => s + (b.total_amount || 0), 0)

  const premiumCount = bookings.filter(b => b.section_tier === "premium").length
  const regularCount = bookings.filter(b => b.section_tier === "regular").length

  const avgMonthly = activeBookings.length
    ? Math.round(activeMonthlyRevenue / activeBookings.length)
    : 0

  const metrics = [
    {
      label: "Active Monthly Revenue",
      value: `NPR ${activeMonthlyRevenue.toLocaleString()}`,
      sub: `${activeBookings.length} active leases`,
      icon: DollarSign,
      color: "text-green-500",
      bg: "bg-green-50",
      badge: "confirmed",
    },
    {
      label: "Total Contract Value",
      value: `NPR ${totalContractValue.toLocaleString()}`,
      sub: `${bookings.length} total bookings`,
      icon: TrendingUp,
      color: "text-[#FE7F2D]",
      bg: "bg-[#FE7F2D]/10",
      badge: "all-time",
    },
    {
      label: "Confirmed Lease Revenue",
      value: `NPR ${confirmedRevenue.toLocaleString()}`,
      sub: "active leases × duration",
      icon: CheckCircle2,
      color: "text-blue-500",
      bg: "bg-blue-50",
      badge: "locked-in",
    },
    {
      label: "Pipeline Value",
      value: `NPR ${pipelineValue.toLocaleString()}`,
      sub: `${pendingBookings.length} pending approvals`,
      icon: Clock,
      color: "text-purple-500",
      bg: "bg-purple-50",
      badge: "pending",
    },
  ]

  return (
    <div className="space-y-10 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-4 text-[#010307] lowercase italic">
            <LayoutGrid className="w-8 h-8 text-[#FE7F2D]" />
            shelf rental revenue
          </h2>
          <p className="text-[#010307]/40 font-medium italic mt-1 text-sm lowercase">
            financial overview of all shelf leasing activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-[#FE7F2D]/10 text-[#FE7F2D] border-[#FE7F2D]/20 border font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-full">
            {premiumCount} Premium · {regularCount} Regular
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {metrics.map((m) => {
          const Icon = m.icon
          return (
            <Card key={m.label} className="border border-black/5 shadow-sm rounded-3xl bg-white p-6 flex flex-col gap-4 hover:border-[#FE7F2D]/20 transition-all group">
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 ${m.bg} rounded-2xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <Badge className="bg-gray-50 text-gray-400 border-gray-100 border font-black uppercase text-[8px] tracking-widest px-2 py-0.5 rounded-full">
                  {m.badge}
                </Badge>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{m.label}</p>
                <p className="text-2xl font-black text-[#010307] tracking-tight mt-1">{m.value}</p>
                <p className="text-[10px] font-bold text-gray-300 mt-1 lowercase italic">{m.sub}</p>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Zone Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        {["premium", "regular"].map(tier => {
          const tierBookings = bookings.filter(b => b.section_tier === tier)
          const tierRevenue = tierBookings
            .filter(b => b.status === "active")
            .reduce((s, b) => s + (b.monthly_rent || 0), 0)
          return (
            <Card key={tier} className="border border-black/5 shadow-sm rounded-3xl bg-white overflow-hidden">
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg lowercase italic tracking-tight">{tier} zone</h3>
                      <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{tierBookings.length} bookings</p>
                    </div>
                  </div>
                  <Badge className={`font-black uppercase text-[9px] tracking-widest px-3 py-1 border rounded-full ${TIER_COLORS[tier]}`}>
                    {tier}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-gray-50 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Active Monthly Revenue</p>
                    <p className="font-black text-xl text-[#010307]">NPR {tierRevenue.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2">
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Active</p>
                    <p className="font-bold text-gray-700">{tierBookings.filter(b => b.status === "active").length}</p>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2">
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Pending</p>
                    <p className="font-bold text-gray-700">{tierBookings.filter(b => b.status === "pending").length}</p>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* All Bookings Table */}
      <Card className="border border-black/5 shadow-sm rounded-3xl bg-white overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-black text-lg lowercase italic tracking-tight">all shelf lease records</h3>
          <Badge className="bg-gray-50 border-gray-100 border text-gray-400 font-black uppercase text-[9px] tracking-widest px-3 py-1 rounded-full">
            {bookings.length} total
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr className="text-[9px] font-black uppercase tracking-widest text-gray-300">
                <th className="px-8 py-5 text-left">Brand</th>
                <th className="px-4 py-5 text-left">Zone / Tier</th>
                <th className="px-4 py-5 text-left">Shelf Level</th>
                <th className="px-4 py-5 text-left">Duration</th>
                <th className="px-4 py-5 text-right">Monthly</th>
                <th className="px-4 py-5 text-right">Total</th>
                <th className="px-8 py-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-gray-300 font-black uppercase tracking-widest text-xs italic">
                    No bookings recorded yet.
                  </td>
                </tr>
              ) : bookings.map(b => (
                <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <div>
                      <p className="font-black text-[#010307] truncate max-w-[160px]">{b.brands?.business_name || "---"}</p>
                      <p className="text-[9px] font-bold text-gray-300 font-mono tracking-tighter">{b.id.slice(0, 8)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-[#010307] lowercase">{b.section || "---"}</p>
                      {b.section_tier && (
                        <Badge className={`font-black uppercase text-[8px] tracking-widest px-2 py-0 border rounded-full ${TIER_COLORS[b.section_tier] || ""}`}>
                          {b.section_tier}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <p className="text-xs font-bold text-gray-600 lowercase">{b.shelf_type?.replace("_", " ") || "---"}</p>
                  </td>
                  <td className="px-4 py-5">
                    <p className="text-xs font-bold text-gray-600 lowercase">{b.duration?.replace("_", " ") || "---"}</p>
                  </td>
                  <td className="px-4 py-5 text-right">
                    <p className="font-bold text-gray-900 text-sm">NPR {(b.monthly_rent || 0).toLocaleString()}</p>
                  </td>
                  <td className="px-4 py-5 text-right">
                    <p className="font-black text-[#010307] text-sm">NPR {(b.total_amount || 0).toLocaleString()}</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <Badge className={`font-black uppercase text-[8px] tracking-widest px-3 py-1 border rounded-full ${STATUS_COLORS[b.status] || "bg-gray-50 text-gray-400 border-gray-100"}`}>
                      {b.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Footer summary */}
        <div className="p-8 border-t border-gray-50 bg-gray-50/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">rental revenue summary</p>
          <div className="flex gap-8">
            <div className="text-right">
              <p className="text-[9px] font-black uppercase text-gray-300 tracking-widest">Active Monthly</p>
              <p className="font-black text-xl text-green-600">NPR {activeMonthlyRevenue.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase text-gray-300 tracking-widest">Total Pipeline</p>
              <p className="font-black text-xl text-[#010307]">NPR {totalContractValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
