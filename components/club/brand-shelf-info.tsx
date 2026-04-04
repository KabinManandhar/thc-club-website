"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShelfTransactions } from "@/components/shared/shelf-transactions"
import { supabase } from "@/lib/supabase"
import {
   LayoutGrid,
   Package,
   Zap,
   Plus,
   Calculator,
   Clock,
   ArrowLeft
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { OnboardingWizard } from "@/components/club/onboarding-wizard"

interface BrandShelfInfoProps {
  brandId: string
  onTabChange?: (tab: string) => void
}

const DURATION_LABELS: Record<string, string> = {
  quarterly: "Quarterly (3 mo)",
  half_yearly: "Half-Yearly (6 mo)",
  yearly: "Yearly (12 mo)",
}

const SHELF_TYPE_LABELS: Record<string, string> = {
  eye_level: "Eye Level",
  top_level: "Top Level",
  bottom: "Bottom",
  mixed: "Mixed",
}

const TIER_COLORS: Record<string, string> = {
  premium: "text-[#FE7F2D] bg-[#FE7F2D]/10 border-[#FE7F2D]/20",
  regular: "text-blue-600 bg-blue-50 border-blue-100",
}

export function BrandShelfInfo({ brandId, onTabChange }: BrandShelfInfoProps) {
  const [shelfData, setShelfData] = useState<any[]>([])
  const [pendingBookings, setPendingBookings] = useState<any[]>([])
  const [pricingTiers, setPricingTiers] = useState<any[]>([])
  const [brandSectionTier, setBrandSectionTier] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // New Slot Request states
  const [showWizard, setShowWizard] = useState(false)
  const [brandName, setBrandName] = useState("")

  useEffect(() => {
    fetchShelfInfo()
  }, [brandId])

  const fetchShelfInfo = async () => {
    setLoading(true)
    const [bookingsRes, slotsRes, pricingRes, brandRes] = await Promise.all([
      supabase
        .from("shelf_bookings")
        .select("*")
        .eq("brand_id", brandId)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("shelf_slots")
        .select("*, shelves(*, shelf_sections(*)), shelf_bookings(id, bundle_id, discount_percentage, shelf_bundles(name))")
        .eq("brand_id", brandId),
      supabase
        .from("shelf_pricing_tiers")
        .select("*")
        .order("section_tier")
        .order("duration"),
      supabase
        .from("brands")
        .select("business_name")
        .eq("id", brandId)
        .single()
    ])

    if (brandRes.data) {
       setBrandName(brandRes.data.business_name)
    }

    if (slotsRes.data) {
      setShelfData(slotsRes.data)
      // detect the brand's zone tier from their active slot
      const firstSlot = slotsRes.data[0]
      const tier = firstSlot?.shelves?.shelf_sections?.section_tier
      if (tier) setBrandSectionTier(tier)
    }
    if (bookingsRes.data) {
      setPendingBookings(bookingsRes.data)
      // also try to get tier from pending booking
      if (!brandSectionTier && bookingsRes.data[0]?.section_tier) {
        setBrandSectionTier(bookingsRes.data[0].section_tier)
      }
    }
    if (pricingRes.data) setPricingTiers(pricingRes.data)
    setLoading(false)
  }

  const getPriceForSlotType = (dur: string, slotType: string, tier: string) => {
    const p = pricingTiers.find(t => t.duration === dur && t.section_tier === tier)
    if (!p) return 0 // Default fallback
    if (slotType === "eye_level") return p.eye_level_price
    if (slotType === "top_level") return p.top_level_price
    return p.bottom_price
  }

  if (showWizard) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <Button 
          variant="outline" 
          onClick={() => setShowWizard(false)} 
          className="mb-4 rounded-xl font-black uppercase text-[10px] tracking-widest border-gray-100 hover:bg-gray-50"
        >
           <ArrowLeft className="w-4 h-4 mr-2" /> Cancel Request
        </Button>
        <OnboardingWizard 
          brandId={brandId} 
          businessName={brandName} 
          isSecondary={true} 
          onComplete={() => {
            setShowWizard(false)
            fetchShelfInfo()
          }} 
        />
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center p-32">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D]"></div>
    </div>
  )

  // Decide which tier to show pricing for
  const displayTier = brandSectionTier || "regular"
  const tierPricingRows = pricingTiers.filter(t => t.section_tier === displayTier)

  return (
    <div className="space-y-12 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-4 text-[#010307] lowercase italic">
            <LayoutGrid className="w-8 h-8 text-[#FE7F2D]" />
            shelf space
          </h2>
          <p className="text-[#010307]/40 font-medium italic mt-1 text-sm lowercase">real-time allotment, placement sync &amp; zone pricing.</p>
        </div>
        <div className="flex items-center gap-3">
          {displayTier && (
            <Badge className={`font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-full border ${TIER_COLORS[displayTier] || TIER_COLORS.regular}`}>
              {displayTier} zone member
            </Badge>
          )}
          <Button 
            onClick={() => setShowWizard(true)}
            className="bg-[#FE7F2D] text-white hover:bg-[#010307] font-black tracking-widest uppercase text-[10px] rounded-xl h-10 shadow-xl shadow-orange-500/20"
          >
            <Plus className="w-4 h-4 mr-2" /> Request Space
          </Button>
        </div>
      </div>

      {/* Pending Requests Section */}
      {pendingBookings.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
             <Clock className="w-5 h-5 text-[#FE7F2D]" />
             <h3 className="text-xl font-black italic lowercase tracking-tight">pending applications</h3>
             <Badge className="bg-[#FE7F2D]/10 text-[#FE7F2D] border-none font-black text-[10px] rounded-full px-3">{pendingBookings.length}</Badge>
          </div>
          <div className="grid gap-4">
             {pendingBookings.map((booking) => (
                <div key={booking.id} className={`p-6 bg-white border rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-[#FE7F2D]/30 transition-all shadow-sm ${booking.bundle_id ? 'border-[#FE7F2D]/30 bg-[#FE7F2D]/[0.02]' : 'border-[#FE7F2D]/10'}`}>
                   <div className="flex items-center gap-5">
                      <div className="h-14 w-14 bg-[#FE7F2D]/5 rounded-2xl flex items-center justify-center border border-[#FE7F2D]/10 text-[#FE7F2D]">
                         <LayoutGrid className="w-7 h-7" />
                      </div>
                      <div>
                         <h4 className="font-black italic text-lg lowercase leading-tight">{booking.shelf_type?.replace("_", " ")} shelf • {booking.section || "standard zone"}</h4>
                         <div className="flex items-center gap-2 mt-1 flex-wrap">
                           <p className="text-[10px] font-bold text-[#010307]/30 uppercase tracking-[0.2em] italic">Ref: {booking.id.split('-')[0]} • {booking.duration?.replace('_', ' ')}</p>
                           {booking.section_tier && (
                             <Badge className={`text-[8px] font-black uppercase tracking-widest px-2 border rounded-full ${TIER_COLORS[booking.section_tier] || TIER_COLORS.regular}`}>
                               {booking.section_tier}
                             </Badge>
                           )}
                           {booking.bundle_id && (
                             <Badge className="bg-green-50 text-green-600 border border-green-100 text-[8px] font-black uppercase tracking-widest px-2 rounded-full flex items-center gap-1">
                               <Zap className="w-2.5 h-2.5 fill-green-500" />
                               bundle deal{booking.discount_percentage ? ` · ${Math.round(booking.discount_percentage)}% off` : ''}
                             </Badge>
                           )}
                         </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-6">
                      <div className="text-right">
                         <p className="text-[9px] font-black uppercase text-[#010307]/20 tracking-widest mb-1">Total Lease</p>
                         {booking.bundle_id && booking.original_total && (
                           <p className="text-[10px] font-bold text-[#010307]/30 line-through">NPR {booking.original_total?.toLocaleString()}</p>
                         )}
                         <p className="font-black text-xl text-[#010307] italic lowercase">NPR {booking.total_amount?.toLocaleString() || '---'}</p>
                         <p className="text-[9px] font-bold text-[#010307]/20 uppercase">NPR {booking.monthly_rent?.toLocaleString()}/mo</p>
                      </div>
                      <Badge className="bg-[#FE7F2D]/10 text-[#FE7F2D] border-[#FE7F2D]/20 font-black lowercase italic px-4 py-1.5 rounded-full whitespace-nowrap">
                         Waitlist Active
                      </Badge>
                   </div>
                </div>
             ))}
          </div>
        </div>
      )}

      {shelfData.length === 0 && pendingBookings.length === 0 ? (
        <Card className="border-none shadow-xl rounded-[3rem] bg-white p-20 text-center">
           <Package className="w-16 h-16 text-[#010307]/10 mx-auto mb-6" />
           <h3 className="text-2xl font-black tracking-tighter lowercase italic">no active allotment</h3>
           <p className="text-[#010307]/40 font-medium max-w-md mx-auto mt-4 lowercase italic">you currently don't have any active shelf space bookings. contact admin to finalize your onboarding.</p>
           <Button
              variant="outline"
              className="mt-8 rounded-2xl border-[#010307]/5 h-14 px-10 font-bold lowercase text-[11px] tracking-widest text-[#010307]/60 hover:bg-[#010307]/5"
              onClick={() => toast.info("support request initiated. a club representative will reach out shortly.")}
           >
               connect with support
           </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8">
          {shelfData.map((slot) => {
             const isBundle = !!slot.shelf_bookings?.bundle_id
             const discount = slot.shelf_bookings?.discount_percentage
             const bundleName = slot.shelf_bookings?.shelf_bundles?.name
             
             return (
             <div key={slot.id} className={`p-8 bg-[#010307] rounded-[2.5rem] border ${isBundle ? 'border-green-500/30' : 'border-[#010307]'} flex flex-col gap-8 group hover:border-[#FE7F2D]/50 transition-all relative overflow-hidden shadow-2xl`}>
                {/* Background Glow */}
                <div className={`absolute top-0 right-0 w-48 h-48 blur-[100px] -mr-24 -mt-24 pointer-events-none transition-all ${isBundle ? 'bg-green-500/10 group-hover:bg-green-500/20' : 'bg-[#FE7F2D]/10 group-hover:bg-[#FE7F2D]/20'}`}></div>

                 <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-2">
                       <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isBundle ? 'bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.6)]' : 'bg-[#FE7F2D] shadow-[0_0_12px_rgba(254,127,45,0.6)]'}`}></div>
                          <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${isBundle ? 'text-green-400' : 'text-[#FE7F2D]'}`}>
                             {isBundle ? 'bundled shelf slot' : 'active shelf slot'}
                          </p>
                       </div>
                       <div className="flex items-center gap-3">
                          <h4 className="font-black text-3xl text-white lowercase italic leading-none truncate max-w-[240px]">{slot.shelf_name || (slot.shelves?.name) || 'Collective Hub'}</h4>
                       </div>
                       <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">{slot.section || slot.shelves?.shelf_sections?.name || 'General Gallery'}</p>
                          <Badge variant="outline" className="border-white/10 text-white/30 text-[8px] font-black uppercase tracking-widest px-2 py-0">
                             {slot.shelves?.shelf_sections?.section_tier || 'standard'} zone
                          </Badge>
                          {isBundle && (
                             <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10 text-[8px] font-black uppercase tracking-widest px-2 py-0 flex items-center gap-1">
                                <Zap className="w-2 h-2 fill-green-400" />
                                {bundleName || 'Bundle Package'}
                             </Badge>
                          )}
                       </div>
                    </div>
                   <div className="flex flex-col items-center">
                      <div className={`h-20 w-20 rounded-[1.5rem] flex flex-col items-center justify-center shadow-3xl border-2 border-white/10 group-hover:scale-110 transition-transform duration-500 ${isBundle ? 'bg-green-500/90 text-white shadow-green-500/20' : 'bg-[#FE7F2D] text-[#010307] shadow-[#FE7F2D]/40'}`}>
                         <p className="text-[11px] font-black opacity-60 uppercase leading-none mb-1">slot</p>
                         <p className="font-black text-4xl leading-none italic">#{slot.slot_number}</p>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-4 relative z-10">
                   <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/5 flex flex-col items-center text-center group-hover:bg-white/10 transition-colors">
                      <Package className="w-5 h-5 text-white/20 mb-3" />
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">shelf level</p>
                      <p className="text-[12px] font-black text-white lowercase italic">{SHELF_TYPE_LABELS[slot.shelf_type || 'mixed'] || 'standard'}</p>
                   </div>
                   <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/5 flex flex-col items-center text-center group-hover:bg-white/10 transition-colors">
                      <LayoutGrid className="w-5 h-5 text-white/20 mb-3" />
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">footprint</p>
                      <p className="text-[12px] font-black text-white lowercase italic">{slot.shelves?.size || 'standard'}</p>
                   </div>
                   <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/5 flex flex-col items-center text-center group-hover:bg-white/10 transition-colors">
                      <Zap className="w-5 h-5 text-white/20 mb-3" />
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">mobility</p>
                      <p className="text-[12px] font-black text-white lowercase italic">{slot.shelves?.is_movable ? 'movable' : 'fixed'}</p>
                   </div>
                </div>

                {slot.rent_amount && (
                  <div className="relative z-10 bg-white/5 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">current rent</p>
                      <div className="flex items-baseline gap-2">
                         <p className="text-2xl font-black text-white italic">NPR {slot.rent_amount.toLocaleString()}<span className="text-white/30 text-sm font-bold">/mo</span></p>
                         {isBundle && discount && (
                           <Badge className="bg-green-500/20 text-green-400 border-none font-black text-[8px] uppercase tracking-widest ml-2 px-2 py-0.5">
                             -{Math.round(discount)}% off
                           </Badge>
                         )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative z-10 pt-4 mt-2 border-t border-white/5 flex justify-between items-center px-2">
                   <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-red-400/60" />
                      <div>
                         <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">auto-renewal</p>
                         <p className="text-xs font-black text-white italic">{slot.occupied_until ? new Date(slot.occupied_until).toLocaleDateString() : 'Active Lease'}</p>
                      </div>
                   </div>
                   <Badge className="bg-white/5 text-white/40 border-none font-black text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-full">
                      synced pos
                   </Badge>
                </div>
             </div>
          )})}
        </div>
      )}

      {/* Transactions & Ledger */}
      <div className="pt-8 border-t border-gray-100">
        <ShelfTransactions brandId={brandId} />
      </div>
    </div>
  )
}
