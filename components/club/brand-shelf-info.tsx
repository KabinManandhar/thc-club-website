"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import {
  Clock,
  LayoutGrid,
  Package,
  Zap
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface BrandShelfInfoProps {
  brandId: string
  onTabChange?: (tab: string) => void
}

export function BrandShelfInfo({ brandId, onTabChange }: BrandShelfInfoProps) {
  const [shelfData, setShelfData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchShelfInfo()
  }, [brandId])

  const fetchShelfInfo = async () => {
    setLoading(true)
    const [bookingsRes, slotsRes] = await Promise.all([
      supabase
        .from("shelf_bookings")
        .select("*")
        .eq("brand_id", brandId)
        .in("status", ["active", "pending"]),
      supabase
        .from("shelf_slots")
        .select("*, shelves(*)")
        .eq("brand_id", brandId)
    ])
    
    if (slotsRes.data) setShelfData(slotsRes.data)
    setLoading(false)
  }

  const handleExpandRequest = async () => {
    if (onTabChange) {
      onTabChange("onboarding")
    } else {
      toast.info("opening onboarding portal...")
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center p-32">
       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D]"></div>
    </div>
  )

  return (
    <div className="space-y-12 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-4 text-[#010307] lowercase italic">
            <LayoutGrid className="w-8 h-8 text-[#FE7F2D]" />
            shelf space
          </h2>
          <p className="text-[#010307]/40 font-medium italic mt-1 text-sm lowercase">real-time allotment and placement sync.</p>
        </div>
        <Button 
          onClick={handleExpandRequest}
          className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white rounded-2xl h-12 px-8 font-bold lowercase text-[11px] tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2"
        >
          book new slots
        </Button>
      </div>

      {shelfData.length === 0 ? (
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
          {shelfData.map((slot) => (
             <div key={slot.id} className="p-8 bg-[#010307] rounded-[2.5rem] border border-[#010307] flex flex-col gap-8 group hover:border-[#FE7F2D]/50 transition-all relative overflow-hidden shadow-2xl">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#FE7F2D]/10 blur-[100px] -mr-24 -mt-24 pointer-events-none group-hover:bg-[#FE7F2D]/20 transition-all"></div>
                
                <div className="flex justify-between items-start relative z-10">
                   <div className="space-y-2">
                      <div className="flex items-center gap-2">
                         <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(74,222,128,0.6)]"></div>
                         <p className="text-[10px] font-black text-[#FE7F2D] uppercase tracking-[0.4em]">active floor unit</p>
                      </div>
                      <h4 className="font-black text-3xl text-white lowercase italic leading-none truncate max-w-[240px]">{slot.shelf_name || (slot.shelves?.name) || 'Collective Hub'}</h4>
                      <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">{slot.section || (slot.shelves?.section) || 'Premium Hallway'}</p>
                   </div>
                   <div className="flex flex-col items-center">
                      <div className="h-20 w-20 bg-[#FE7F2D] rounded-[1.5rem] flex flex-col items-center justify-center text-[#010307] shadow-3xl shadow-[#FE7F2D]/40 border-2 border-white/10 group-hover:scale-110 transition-transform duration-500">
                         <p className="text-[11px] font-black opacity-60 uppercase leading-none mb-1">slot</p>
                         <p className="font-black text-4xl leading-none italic">#{slot.slot_number}</p>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-4 relative z-10">
                   <div className="bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/5 flex flex-col items-center text-center group-hover:bg-white/10 transition-colors">
                      <Package className="w-5 h-5 text-white/20 mb-3" />
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">height</p>
                      <p className="text-[12px] font-black text-white lowercase italic">{(slot.shelf_type || slot.shelves?.shelf_type || 'standard').replace('_', ' ')}</p>
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
          ))}
        </div>
      )}

      {/* Expansion Benefits Card */}
      <Card className="border border-black/5 shadow-sm rounded-2xl bg-white p-12 overflow-hidden relative group">
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10 text-center md:text-left">
            <div className="space-y-4">
               <h3 className="text-3xl font-black tracking-tighter lowercase italic leading-none">expand your presence</h3>
               <p className="text-[#010307]/40 font-medium max-w-sm text-sm lowercase italic">request additional floor zones or high-visibility slots to showcase more products.</p>
               <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
                  <Badge variant="outline" className="rounded-full border-[#010307]/5 text-[#010307]/20 font-bold lowercase text-[10px] px-3 py-1">premium placement</Badge>
                  <Badge variant="outline" className="rounded-full border-[#010307]/5 text-[#010307]/20 font-bold lowercase text-[10px] px-3 py-1">multi-slot bundling</Badge>
               </div>
            </div>
            <Button 
               onClick={handleExpandRequest}
               size="lg" 
               className="bg-[#010307] hover:bg-[#010307]/90 text-white px-10 h-14 rounded-2xl font-bold lowercase tracking-widest text-[11px] shadow-2xl active:scale-95 transition-all shrink-0"
            >
               request exploration
            </Button>
         </div>
      </Card>
    </div>
  )
}
