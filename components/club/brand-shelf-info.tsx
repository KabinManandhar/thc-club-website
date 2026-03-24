"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Package, 
  Clock, 
  MapPin, 
  Calendar, 
  LayoutGrid, 
  ShieldCheck, 
  Info,
  ArrowUpRight,
  HelpCircle,
} from "lucide-react"
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
    const { data, error } = await supabase
      .from("shelf_bookings")
      .select("*, shelf_slots(*)")
      .eq("brand_id", brandId)
      .in("status", ["active", "pending"])
    
    if (data) setShelfData(data)
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
            shelf slots
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {shelfData.map((booking) => (
            <Card key={booking.id} className="border border-black/5 shadow-sm rounded-2xl bg-white overflow-hidden transition-all group">
              <div className="relative h-32 bg-gray-50 p-6 flex flex-col justify-between overflow-hidden">
                 <div className="relative z-10 flex justify-between items-start">
                     <div className="w-10 h-10 bg-[#FE7F2D] rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                        <MapPin className="w-5 h-5" />
                     </div>
                     <Badge className={`${booking.status === 'active' ? 'bg-[#010307] text-white' : 'bg-[#010307]/5 text-[#010307]/40'} border-none font-bold lowercase text-[10px] px-3 tracking-widest rounded-full`}>
                        {booking.status}
                     </Badge>
                  </div>
                  <div className="relative z-10">
                     <p className="text-[10px] font-bold lowercase text-[#010307]/30 tracking-widest">floor assignment</p>
                     <h3 className="text-2xl font-black text-[#010307] tracking-tighter italic lowercase">{booking.shelf_slots?.slot_number || "gate"}</h3>
                  </div>
              </div>
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                   <div className="flex items-center gap-3 text-gray-500 font-bold text-xs lowercase tracking-tighter">
                      <Clock className="w-4 h-4 text-[#FE7F2D]" /> expiration
                   </div>
                   <span className="font-black text-gray-900 text-sm">
                      {new Date(booking.end_date).toLocaleDateString()}
                   </span>
                </div>
                
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                   <div className="flex items-center gap-3 text-gray-500 font-bold text-xs uppercase tracking-tighter">
                      <Calendar className="w-4 h-4 text-blue-500" /> Lease Term
                   </div>
                   <span className="font-black text-gray-900 text-sm">Monthly Basis</span>
                </div>

                <div className="pt-4 flex items-center gap-4 bg-[#010307]/5 rounded-2xl p-4 border border-transparent italic transition-transform group-hover:-translate-y-1">
                   <Info className="w-5 h-5 text-[#010307]/10 shrink-0" />
                   <p className="text-[10px] font-bold text-[#010307]/40 leading-relaxed tracking-tight lowercase">
                      this slot is synchronized with the club's physical floor plan. any layout changes must be requested via portal.
                   </p>
                </div>
              </CardContent>
            </Card>
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
