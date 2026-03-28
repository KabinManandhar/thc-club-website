"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export function ShelfBooking({ brandId, isFirstTime, onComplete }: { brandId?: string, isFirstTime?: boolean, onComplete?: () => void }) {
  const [tier, setTier] = useState<"low" | "eye" | "top">("eye")
  const [duration, setDuration] = useState<"quarterly" | "half_yearly" | "yearly">("quarterly")
  const [sections, setSections] = useState<any[]>([])
  const [selectedSection, setSelectedSection] = useState<any>(null)
  const [pricingTiers, setPricingTiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchBookingConfig()
  }, [])

  const fetchBookingConfig = async () => {
    setLoading(true)
    try {
      const [{ data: s }, { data: p }] = await Promise.all([
        supabase.from("shelf_sections").select("*"),
        supabase.from("shelf_pricing_tiers").select("*")
      ])

      if (s) {
        setSections(s)
        setSelectedSection(s[0] || null)
      }
      if (p) setPricingTiers(p)
    } catch (err) {
      console.error("Failed to fetch booking config", err)
    } finally {
      setLoading(false)
    }
  }

  const getPrice = (t: string, d: string, st: string) => {
    const pricing = pricingTiers.find(p => p.duration === d && p.section_tier === st)
    if (!pricing) return 0
    if (t === "low") return pricing.bottom_price
    if (t === "eye") return pricing.eye_level_price
    if (t === "top") return pricing.top_level_price
    return 0
  }

  const currentPrice = selectedSection ? getPrice(tier, duration, selectedSection.section_tier) : 0
  const months = duration === "quarterly" ? 3 : duration === "half_yearly" ? 6 : 12
  const rentTotal = currentPrice * months
  const registrationFee = isFirstTime ? 800 : 0
  const totalAmount = rentTotal + registrationFee

  const handleBooking = async () => {
    if (!brandId) {
      toast.error("You must be logged in to book a slot.")
      return
    }

    setIsSubmitting(true)
    try {
      // Use correct column names from schema: shelf_type instead of tier, monthly_rent instead of monthly_rate
      const { error } = await supabase.from("shelf_bookings").insert({
        brand_id: brandId,
        shelf_type: tier === 'low' ? 'bottom' : (tier === 'eye' ? 'eye_level' : 'top_level'),
        duration,
        monthly_rent: currentPrice, // correctly uses monthly_rent from schema
        total_amount: totalAmount,
        status: "pending",
        section: selectedSection?.name,
        section_tier: selectedSection?.section_tier,
        notes: `Alpha Portal Booking - ${selectedSection?.name} (${tier}) for ${duration}`
      })

      if (error) throw error

      toast.success("Application submitted. The club team will verify your brand and assign a slot shortly.")
      if (onComplete) onComplete()
    } catch (err: any) {
      console.error("Booking submission error:", err)
      toast.error(err.message || "Failed to submit booking.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE7F2D]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border-[#FE7F2D]/20 shadow-none bg-white p-2">
          <CardHeader>
            <CardTitle className="text-2xl font-black lowercase italic tracking-tighter">book your slot</CardTitle>
            <CardDescription className="text-xs uppercase font-bold tracking-widest text-[#010307]/40">select your preferred zone and duration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/60 ml-1">The Collective Zone</label>
              <Select
                value={selectedSection?.id}
                onValueChange={(id) => setSelectedSection(sections.find(s => s.id === id))}
              >
                <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold shadow-none focus:ring-orange-500/10">
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-100">
                  {sections.map(s => (
                    <SelectItem key={s.id} value={s.id} className="font-medium">
                      <div className="flex items-center gap-2">
                        {s.name}
                        {s.section_tier === 'premium' && <Badge className="scale-75 bg-orange-100 text-[#FE7F2D] border-none shadow-none uppercase font-black text-[9px]">Premium</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/60 ml-1">Shelf Tier</label>
              <Select value={tier} onValueChange={(v: any) => setTier(v)}>
                <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold shadow-none focus:ring-orange-500/10">
                  <SelectValue placeholder="Select Tier" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-100">
                  <SelectItem value="top">Top Level (Premium)</SelectItem>
                  <SelectItem value="eye">Eye-Level (Best Visibility)</SelectItem>
                  <SelectItem value="low">Low Level (Standard)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/60 ml-1">Commitment Period</label>
              <Select value={duration} onValueChange={(v: any) => setDuration(v)}>
                <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold shadow-none focus:ring-orange-500/10">
                  <SelectValue placeholder="Select Duration" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-100">
                  <SelectItem value="quarterly">Quarterly (3 Months)</SelectItem>
                  <SelectItem value="half_yearly">Half-Yearly (6 Months)</SelectItem>
                  <SelectItem value="yearly">Yearly (12 Months)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#FE7F2D] bg-orange-50/30 shadow-none p-2">
          <CardHeader>
            <CardTitle className="text-2xl font-black lowercase italic tracking-tighter">pricing summary</CardTitle>
            <CardDescription className="text-xs uppercase font-bold tracking-widest text-orange-600/60">transparent fee structure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center border-b border-orange-100 pb-4">
              <span className="text-[#010307]/60 font-medium italic lowercase">monthly rate</span>
              <span className="text-2xl font-black text-[#010307]">NPR {currentPrice.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center border-b border-orange-100 pb-4">
              <span className="text-[#010307]/60 font-medium italic lowercase">duration</span>
              <span className="font-black text-[#010307]">{months} Months</span>
            </div>

            {isFirstTime && (
              <div className="flex justify-between items-center border-b border-orange-100 pb-4">
                <div className="flex flex-col">
                  <span className="text-[#010307]/60 font-medium italic lowercase">registration fee</span>
                  <span className="text-[9px] text-[#FE7F2D] font-black uppercase tracking-tighter">one-time identity onboarding</span>
                </div>
                <span className="font-black text-[#010307]">NPR {registrationFee.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <span className="font-black text-lg lowercase italic">total amount</span>
              <span className="text-4xl font-black text-[#FE7F2D]">NPR {totalAmount.toLocaleString()}</span>
            </div>




          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-100 shadow-none bg-white p-2">
        <CardHeader>
          <CardTitle className="text-lg font-black lowercase italic tracking-tight">pricing matrix ({selectedSection?.name || 'Loading...'})</CardTitle>
          <CardDescription className="text-[9px] uppercase font-bold tracking-widest">rates vary based on zone tier and shelf height</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="py-4 text-[10px] uppercase font-black tracking-widest text-gray-400">Duration</th>
                  <th className="py-4 text-[10px] uppercase font-black tracking-widest text-gray-400 text-center">Low Level</th>
                  <th className="py-4 text-[10px] uppercase font-black tracking-widest text-gray-400 text-center">Eye-Level</th>
                  <th className="py-4 text-[10px] uppercase font-black tracking-widest text-gray-400 text-center">Top Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {['quarterly', 'half_yearly', 'yearly'].map(d => {
                  const pricing = pricingTiers.find(p => p.duration === d && p.section_tier === selectedSection?.section_tier)
                  return (
                    <tr key={d} className={duration === d ? "bg-orange-50/40" : ""}>
                      <td className="py-5 font-black lowercase italic text-sm">{d.replace('_', ' ')}</td>
                      <td className="py-5 text-center font-bold text-gray-600">NPR {pricing?.bottom_price || '0'}/mo</td>
                      <td className="py-5 text-center font-bold text-gray-600">NPR {pricing?.eye_level_price || '0'}/mo</td>
                      <td className="py-5 text-center font-bold text-gray-600">NPR {pricing?.top_level_price || '0'}/mo</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
