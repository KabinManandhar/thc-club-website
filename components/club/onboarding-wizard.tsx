"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageLightbox } from "@/components/ui/lightbox"
import { DURATION_MONTHS, supabase, type Duration, type PromotionalOffer, type ShelfPricingTier, type ShelfSection, type ShelfType } from "@/lib/supabase"
import { ArrowLeft, ArrowRight, Banknote, Camera, CheckCircle2, Clock, Info, Layout, Package, QrCode, Tag, Users } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

interface OnboardingWizardProps {
  brandId: string
  businessName: string
  onComplete: () => void
  isSecondary?: boolean
}

const STEPS = ["choose zone", "shelf level", "duration", "club protocols", "finalization", "review", "submitted"]

const LEVEL_INFO = {
  top_level: {
    label: "top level",
    description: "maximum visibility — above eye line. premium placement for standout brands.",
    slots: "73–108",
  },
  eye_level: {
    label: "eye level",
    description: "best conversion — directly in the shopper's line of sight.",
    slots: "37–72",
  },
  bottom: {
    label: "bottom level",
    description: "budget-friendly standard placement. great for heavy or large items.",
    slots: "1–36",
  },
}

const DURATION_INFO: Record<Duration, { label: string; months: number }> = {
  quarterly: { label: "quarterly", months: 3 },
  half_yearly: { label: "half-yearly", months: 6 },
  yearly: { label: "yearly (best value)", months: 12 },
}

export function OnboardingWizard({ brandId, businessName, onComplete, isSecondary = false }: OnboardingWizardProps) {
  const [step, setStep] = useState(0)
  const [sections, setSections] = useState<ShelfSection[]>([])
  const [selectedSection, setSelectedSection] = useState<ShelfSection | null>(null)
  const [shelfType, setShelfType] = useState<ShelfType | null>(null)
  const [duration, setDuration] = useState<Duration | null>(null)
  const [pricingTiers, setPricingTiers] = useState<ShelfPricingTier[]>([])
  const [activeOffer, setActiveOffer] = useState<PromotionalOffer | null>(null)
  const [promoCode, setPromoCode] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slotRanges, setSlotRanges] = useState<Record<string, string>>({
    top_level: "73–108",
    eye_level: "37–72",
    bottom: "1–36",
  })
  const [dynamicProtocols, setDynamicProtocols] = useState<{ title: string; items: string[] }[]>([])
  const [storeImages, setStoreImages] = useState<any[]>([])
  const [shelfAvailability, setShelfAvailability] = useState<{ sectionId: string, type: ShelfType, remaining: number }[]>([])
  const [sectionCapacity, setSectionCapacity] = useState<Record<string, { total: number, remaining: number }>>({})

  const [lbOpen, setLbOpen] = useState(false)
  const [lbImages, setLbImages] = useState<string[]>([])
  const [lbIndex, setLbIndex] = useState(0)

  const openLightbox = (imgs: string[], idx: number) => {
    setLbImages(imgs)
    setLbIndex(idx)
    setLbOpen(true)
  }

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (step > 0) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [step])

  useEffect(() => {
    Promise.all([
      supabase.from("shelf_sections").select("*"),
      supabase.from("shelf_pricing_tiers").select("*"),
      supabase.from("shelf_slots").select("shelf_type, slot_number, status, section_id"),
      supabase.from("platform_content").select("protocols").eq("id", 1).single(),
      supabase.from("store_images").select("*")
    ]).then(([secRes, priceRes, slotsRes, protRes, imgRes]) => {
      setSections(secRes.data || [])
      setPricingTiers(priceRes.data || [])
      setStoreImages(imgRes.data || [])
      if (protRes.data) setDynamicProtocols(protRes.data.protocols || [])

      if (slotsRes.data) {
        const ranges: Record<string, { min: number; max: number }> = {}
        const availabilityMap: Record<string, { total: number, remaining: number }> = {}
        const levelAvail: { sectionId: string, type: ShelfType, remaining: number }[] = []

        slotsRes.data.forEach(s => {
          const type = s.shelf_type as ShelfType
          const sId = s.section_id
          const isOcc = s.status !== 'available'

          if (type !== null) {
            if (!ranges[type]) {
              ranges[type] = { min: s.slot_number, max: s.slot_number }
            } else {
              ranges[type].min = Math.min(ranges[type].min, s.slot_number)
              ranges[type].max = Math.max(ranges[type].max, s.slot_number)
            }
          }

          // Section level stats
          if (sId) {
            if (!availabilityMap[sId]) availabilityMap[sId] = { total: 0, remaining: 0 }
            availabilityMap[sId].total++
            if (!isOcc) availabilityMap[sId].remaining++

            // Level level stats
            if (type !== null) {
              const existing = levelAvail.find(la => la.sectionId === sId && la.type === type)
              if (existing) {
                if (!isOcc) existing.remaining++
              } else {
                levelAvail.push({ sectionId: sId, type, remaining: isOcc ? 0 : 1 })
              }
            }
          }
        })

        const newRanges: Record<string, string> = {}
        Object.entries(ranges).forEach(([k, v]) => {
          newRanges[k] = `${v.min}–${v.max}`
        })

        setSlotRanges(prev => ({ ...prev, ...newRanges }))
        setSectionCapacity(availabilityMap)
        setShelfAvailability(levelAvail)
      }
    })
  }, [])

  const getPrice = (d: Duration, type: ShelfType, tierOverride?: string) => {
    const tier = tierOverride || selectedSection?.section_tier || 'regular'
    const pricing = pricingTiers.find(t => t.duration === d && t.section_tier === tier)
    if (!pricing) return 0
    return type === "bottom" ? pricing.bottom_price : type === "eye_level" ? pricing.eye_level_price : pricing.top_level_price
  }

  const handleValidateCode = async () => {
    if (!promoCode.trim()) return
    setIsValidating(true)
    try {
      const { data, error } = await supabase
        .from("promotional_offers")
        .select("*")
        .eq("promo_code", promoCode.toUpperCase())
        .eq("is_active", true)
        .single()

      if (error || !data) {
        toast.error("Invalid or expired promo code.")
        setActiveOffer(null)
      } else if (data.target_limit && data.current_uses >= data.target_limit) {
        toast.error("This offer has reached its limit.")
        setActiveOffer(null)
      } else {
        setActiveOffer(data)
        toast.success(`Success! Applied ${data.name}`)
      }
    } catch (err) {
      toast.error("Error validating code.")
    } finally {
      setIsValidating(false)
    }
  }

  const monthlyRent = shelfType && duration ? getPrice(duration, shelfType) : 0
  const baseTotal = monthlyRent * (duration ? DURATION_MONTHS[duration] : 0)
  let discountAmount = 0
  if (activeOffer) {
    discountAmount = activeOffer.discount_type === "percentage"
      ? baseTotal * (activeOffer.discount_value / 100)
      : activeOffer.discount_value
  }
  const totalAmount = Math.max(0, baseTotal - discountAmount)

  const handleSubmitBooking = async () => {
    if (!shelfType || !duration || !agreed) return
    setSubmitting(true)
    setError(null)

    try {
      const { error: bookingError } = await supabase.from("shelf_bookings").insert({
        brand_id: brandId,
        shelf_type: shelfType,
        duration: duration,
        monthly_rent: monthlyRent,
        total_amount: totalAmount + 800, // Include registration fee
        brand_agreement_accepted: true,
        status: "pending",
        payment_method: paymentMethod as any,
        section: selectedSection?.name,
        section_tier: selectedSection?.section_tier,
        admin_notes: `Requested Zone: ${selectedSection?.name}. ${activeOffer ? `Applied Offer: ${activeOffer.name}` : ''}. Includes 800 NPR Registration Fee.`
      })

      if (bookingError) throw bookingError
      if (activeOffer) {
        await supabase.rpc('increment_offer_uses', { offer_id: activeOffer.id })
      }

      if (!isSecondary) {
        await supabase.from("brands").update({ onboarding_status: "slot_selected" }).eq("id", brandId)
      }
      setStep(6)
    } catch (err: any) {
      setError(err.message || "Failed to submit booking")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div ref={scrollRef} className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 scroll-mt-24">
      <div className="w-full max-w-2xl mb-10">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i < step ? "bg-green-500 text-white" : i === step ? "bg-[#FE7F2D] text-white" : "bg-gray-200 text-gray-500"}`}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`h-0.5 w-10 sm:w-16 mx-1 transition-all ${i < step ? "bg-green-500" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>
        <div className="text-center"><p className="text-[10px] text-[#010307]/40 font-bold lowercase tracking-widest uppercase">step {step + 1} of {STEPS.length}: <strong className="text-[#FE7F2D]">{STEPS[step]}</strong></p></div>
      </div>

      {step === 0 && (
        <div className="w-full max-w-3xl space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="text-center mb-8"><h2 className="text-3xl font-black lowercase italic">select your collective zone</h2><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">premium zones offer higher footfall exposure</p></div>
          <div className="grid grid-cols-1 gap-4">
            {sections.map(sec => {
              const zoneImages = storeImages.filter(img => img.section.toLowerCase().includes(sec.name.toLowerCase()))
              return (
                <div key={sec.id} onClick={() => setSelectedSection(sec)} className={`border-2 rounded-2xl p-6 cursor-pointer transition-all flex flex-col gap-4 ${selectedSection?.id === sec.id ? "border-[#FE7F2D] bg-[#FE7F2D]/5 shadow-sm" : "border-gray-100 hover:border-[#FE7F2D]/30"}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center"><Layout className="w-6 h-6 text-[#FE7F2D]" /></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold lowercase italic text-lg">{sec.name}</h3>
                        {sec.section_tier === 'premium' && <Badge className="bg-orange-500 text-white text-[8px] font-black uppercase tracking-widest">Premium Zone</Badge>}
                        {sectionCapacity[sec.id] && sectionCapacity[sec.id].remaining <= 3 && sectionCapacity[sec.id].remaining > 0 && (
                          <Badge className="bg-red-500 text-white text-[8px] font-black uppercase tracking-widest animate-pulse">Few Shelves Left</Badge>
                        )}
                        {sectionCapacity[sec.id] && sectionCapacity[sec.id].remaining === 0 && (
                          <Badge className="bg-gray-400 text-white text-[8px] font-black uppercase tracking-widest">Zone Full</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 lowercase italic">{sec.description}</p>
                      {sectionCapacity[sec.id] && (
                        <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mt-1">
                          {sectionCapacity[sec.id].remaining} available space left in this zone
                        </p>
                      )}
                    </div>
                    {selectedSection?.id === sec.id && <CheckCircle2 className="w-6 h-6 text-[#FE7F2D]" />}
                  </div>

                  {zoneImages.length > 0 ? (
                    <div className="grid grid-cols-4 gap-4">
                      {zoneImages.slice(0, 4).map((img, i) => (
                        <div
                          key={i}
                          className="aspect-video relative rounded-xl overflow-hidden grayscale hover:grayscale-0 transition-all cursor-pointer group"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLightbox(zoneImages.map(zi => zi.url), i);
                          }}
                        >
                          <img src={img.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 bg-gray-50 rounded-xl flex items-center justify-center">
                      <Camera className="w-6 h-6 text-gray-200" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex justify-end pt-4"><Button disabled={!selectedSection} onClick={() => setStep(1)} className="bg-[#FE7F2D] hover:bg-black text-white px-8">Next Zone <ArrowRight className="ml-2 w-4 h-4" /></Button></div>
        </div>
      )}

      {step === 1 && (
        <div className="w-full max-w-3xl space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="text-center mb-8"><h2 className="text-3xl font-black lowercase italic text-[#010307]">choose shelf level</h2></div>
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex gap-3 items-start mb-6">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" /><p className="text-xs text-blue-700 italic lowercase font-medium">note: the thc team allots the specific shelf slot within your chosen level based on category fit and best visual placement for your products.</p>
          </div>
          {(["top_level", "eye_level", "bottom"] as ShelfType[]).map((type) => {
            const info = LEVEL_INFO[type]
            return (
              <div key={type} onClick={() => setShelfType(type)} className={`border-2 rounded-2xl p-6 cursor-pointer transition-all flex flex-col gap-4 ${shelfType === type ? "border-[#FE7F2D] bg-[#FE7F2D]/5 shadow-sm" : "border-gray-100 hover:border-[#FE7F2D]/30"}`}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center"><Package className="w-6 h-6 text-[#FE7F2D]" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold lowercase italic">{info.label}</h3>
                      {selectedSection && (shelfAvailability.find(la => la.sectionId === selectedSection.id && la.type === type)?.remaining ?? 10) <= 2 && (
                        <Badge className="bg-red-500 text-white text-[7px] font-black uppercase tracking-widest">High Demand</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 lowercase italic">{info.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-xs font-bold text-[#FE7F2D] italic lowercase tracking-tight">from npr {getPrice('yearly', type).toLocaleString()}/mo ({selectedSection?.section_tier} rate)</p>
                      <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-gray-100 text-gray-400">Slots: {slotRanges[type]}</Badge>
                      {selectedSection && (
                        <p className="text-[10px] text-[#FE7F2D]/60 font-black uppercase tracking-tighter italic">
                          {shelfAvailability.find(la => la.sectionId === selectedSection.id && la.type === type)?.remaining || 0} slots available
                        </p>
                      )}
                    </div>
                  </div>
                  {shelfType === type && <CheckCircle2 className="w-6 h-6 text-[#FE7F2D]" />}
                </div>
              </div>
            )
          })}
          <div className="flex justify-between pt-4"><Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button><Button disabled={!shelfType} onClick={() => setStep(2)} className="bg-[#FE7F2D] hover:bg-black text-white px-8">Duration <ArrowRight className="ml-2 w-4 h-4" /></Button></div>
        </div>
      )}

      {step === 2 && shelfType && (
        <div className="w-full max-w-3xl space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="text-center mb-8"><h2 className="text-3xl font-black lowercase italic">commitment period</h2></div>
          <div className="grid grid-cols-1 gap-4">
            {(["quarterly", "half_yearly", "yearly"] as Duration[]).map((d) => {
              const dInfo = DURATION_INFO[d]; const price = getPrice(d, shelfType)
              return (
                <div key={d} onClick={() => setDuration(d)} className={`border-2 rounded-2xl p-6 cursor-pointer transition-all flex items-center justify-between ${duration === d ? "border-[#FE7F2D] bg-[#FE7F2D]/5 shadow-sm" : "border-gray-100 hover:border-[#FE7F2D]/30"}`}>
                  <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center"><Clock className="w-5 h-5 text-[#FE7F2D]" /></div><div><h3 className="font-bold lowercase italic">{dInfo.label}</h3><p className="text-[10px] text-gray-400 uppercase tracking-widest">{dInfo.months} months lease</p></div></div>
                  <div className="text-right">
                    <p className="text-xl font-black text-[#010307]">NPR {price.toLocaleString()}<span className="text-[10px] font-bold text-gray-400">/mo</span></p>
                    {d === 'yearly' && <Badge className="bg-green-500 text-white text-[8px] font-black uppercase tracking-widest">Max Value</Badge>}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between pt-4"><Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button><Button disabled={!duration} onClick={() => setStep(3)} className="bg-[#FE7F2D] hover:bg-black text-white px-8">Club Protocols <ArrowRight className="ml-2 w-4 h-4" /></Button></div>
        </div>
      )}

      {step === 3 && (
        <div className="w-full max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-[2.5rem] bg-white/50 backdrop-blur-sm overflow-hidden">
            <div className="p-8 sm:p-12 space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <h2 className="text-4xl font-black tracking-tighter lowercase italic text-[#010307]">
                  the club <span className="text-[#FE7F2D]">protocols</span>
                </h2>
                <Badge variant="outline" className="border-[#FE7F2D]/20 text-[#FE7F2D] text-[10px] lowercase font-bold tracking-widest px-4 py-2 rounded-full">
                  v1.0 • effective 2026
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-12 text-left">
                {dynamicProtocols.map((p, idx) => (
                  <div key={idx} className="space-y-4">
                    <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#FE7F2D]">{p.title}</h4>
                    <ul className="space-y-4 text-[13px] text-[#010307]/60 font-medium lowercase italic leading-relaxed">
                      {p.items.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="pt-10 border-t border-[#FE7F2D]/10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                  <p className="text-[10px] font-bold text-[#010307]/30 uppercase tracking-[0.2em]">official contact</p>
                  <p className="text-xs font-black text-[#FE7F2D]">9803904546 • thehiddencollectiveclub@gmail.com</p>
                </div>
              </div>
            </div>
          </Card>
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button>
            <Button onClick={() => setStep(4)} className="bg-[#FE7F2D] hover:bg-black text-white px-12 h-12 rounded-2xl font-black italic lowercase transition-all">I Accept the Protocols <ArrowRight className="ml-2 w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="w-full max-w-3xl space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="text-center mb-4"><h2 className="text-3xl font-black lowercase italic">finalization protocol</h2><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">ensuring 100% mutual satisfaction</p></div>
          <Card className="bg-orange-50 border-orange-200 rounded-3xl p-8 mb-6"><div className="flex gap-4 items-start"><Users className="w-6 h-6 text-[#FE7F2D] mt-1 flex-shrink-0" /><div className="space-y-2"><p className="text-sm font-bold text-orange-950 lowercase">the final payment and formal contractual agreement will be finalized in person at the club.</p><p className="text-[11px] text-orange-800 italic font-medium lowercase leading-relaxed">this ensures you are 100% satisfied with your physical slot placement, lightings, and branding visibility before we go active. no cards needed now.</p></div></div></Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[{ id: "bank_transfer", label: "bank transfer", icon: Banknote, desc: "direct wire to club hq" }, { id: "qr_payment", label: "collect via qr", icon: QrCode, desc: "scan and settle in person" }, { id: "cash", label: "cash at club", icon: Package, desc: "physical hand-over finalization" }].map((pm) => (
              <div key={pm.id} onClick={() => setPaymentMethod(pm.id)} className={`border-2 rounded-2xl p-6 cursor-pointer transition-all flex items-center gap-4 ${paymentMethod === pm.id ? "border-[#FE7F2D] bg-[#FE7F2D]/5" : "border-gray-100 hover:border-[#FE7F2D]/30"}`}>
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[#FE7F2D]"><pm.icon className="w-5 h-5" /></div>
                <div><h3 className="font-bold lowercase italic">{pm.label}</h3><p className="text-[10px] text-gray-400 uppercase tracking-widest">{pm.desc}</p></div>
                {paymentMethod === pm.id && <CheckCircle2 className="w-5 h-5 text-[#FE7F2D] ml-auto" />}
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-4"><Button variant="outline" onClick={() => setStep(3)}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button><Button disabled={!paymentMethod} onClick={() => setStep(5)} className="bg-[#FE7F2D] hover:bg-black text-white px-8">Review Summary <ArrowRight className="ml-2 w-4 h-4" /></Button></div>
        </div>
      )}

      {step === 5 && shelfType && duration && selectedSection && (
        <div className="w-full max-w-2xl space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="text-center mb-8"><h2 className="text-3xl font-black lowercase italic">the commitment summary</h2></div>
          <Card className="border-[#FE7F2D] border-2 shadow-2xl rounded-[2rem] overflow-hidden"><CardHeader className="bg-gray-50"><CardTitle className="text-xl font-black lowercase italic">partnership overview</CardTitle></CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="flex justify-between py-2 border-b text-sm italic font-medium"><span className="text-gray-400">Collective Zone</span><span className="text-[#FE7F2D] font-black uppercase text-[10px] tracking-widest">{selectedSection.name}</span></div>
              <div className="flex justify-between py-2 border-b text-sm italic font-medium"><span className="text-gray-400">Zone Tier</span><span className="font-black uppercase text-[10px] tracking-widest">{selectedSection.section_tier} zone</span></div>
              <div className="flex justify-between py-2 border-b text-sm italic font-medium"><span className="text-gray-400">Shelf Tier</span><span>{LEVEL_INFO[shelfType].label}</span></div>
              <div className="flex justify-between py-2 border-b text-sm italic font-medium"><span className="text-gray-400">Lease Cycle</span><span>{DURATION_INFO[duration].label}</span></div>
              <div className="flex justify-between py-2 border-b text-sm italic font-medium"><span className="text-gray-400">Monthly Rent</span><span className="font-black">NPR {monthlyRent.toLocaleString()}</span></div>
              <div className="flex justify-between py-2 border-b text-sm italic font-medium"><span className="text-gray-400">Lease Total ({DURATION_INFO[duration].months} mo)</span><span className="font-black">NPR {baseTotal.toLocaleString()}</span></div>
              {activeOffer && <div className="flex justify-between py-2 border-b text-green-600 text-sm font-black italic"><span className="flex items-center gap-2 uppercase tracking-widest text-[10px]"><Tag className="w-3 h-3" /> Offer applied</span><span>- NPR {discountAmount.toLocaleString()}</span></div>}
              <div className="flex justify-between py-2 border-b text-sm italic font-medium">
                <span className="flex flex-col gap-0.5">
                  <span className="text-gray-400">one-time registration fee</span>
                  <span className="text-[9px] font-black uppercase text-[#FE7F2D]/60 tracking-widest">identity onboarding + slot setup</span>
                </span>
                <span className="font-black text-[#FE7F2D]">NPR 800</span>
              </div>
              <div className="flex justify-between pt-6"><span className="font-black text-xl lowercase italic">estimated total due</span><span className="text-3xl font-black text-[#FE7F2D] tracking-tighter">NPR {(totalAmount + 800).toLocaleString()}</span></div>
            </CardContent>
          </Card>

          <div className="flex gap-3 items-center p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="flex-1 space-y-1"><Label className="text-[8px] font-black uppercase tracking-widest text-gray-400">Promotional Offer Index</Label><Input placeholder="CODE" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} className="h-10 rounded-xl font-black uppercase border-gray-100" /></div>
            <Button onClick={handleValidateCode} disabled={!promoCode || isValidating} className="mt-5 h-10 bg-[#FE7F2D] text-white hover:bg-black rounded-xl">Claim</Button>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
            <Checkbox id="agree" checked={agreed} onCheckedChange={(c) => setAgreed(!!c)} className="mt-0.5" />
            <label htmlFor="agree" className="text-xs text-gray-400 italic font-medium lowercase cursor-pointer">i understand that specific slot allotment is handled by the thc club team to ensure the best brand-mix across the collective. all financials including the registration fee are settled in-person.</label>
          </div>

          <div className="flex justify-between pt-2"><Button variant="outline" onClick={() => setStep(4)}><ArrowLeft className="mr-2 w-4 h-4" /> Back</Button><Button disabled={!agreed || submitting} onClick={handleSubmitBooking} className="bg-[#010307] hover:bg-[#FE7F2D] text-white px-10 transition-all">{submitting ? "Initiating Protocols..." : "Submit Booking Request"}</Button></div>
        </div>
      )}

      {step === 6 && (
        <div className="w-full max-w-lg text-center space-y-8 py-10 animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto shadow-sm"><CheckCircle2 className="w-12 h-12 text-green-500" /></div>
          <div className="space-y-2"><h2 className="text-4xl font-black lowercase italic">prototcol initiated</h2><p className="text-sm text-gray-400 italic lowercase leading-relaxed">your request for <span className="text-[#FE7F2D] font-bold">{businessName}</span> is now being reviewed by the collective council.</p></div>
          <Card className="bg-blue-50/30 border-blue-100 rounded-[2rem] p-6 "><p className="text-xs text-blue-800 italic lowercase leading-relaxed font-medium">our team will contact you within <strong>48-72 hours</strong> to schedule your in-person walkthrough and finalize the contractual handover.</p></Card>
          <Button onClick={onComplete} className="bg-[#FE7F2D] hover:bg-black text-white px-12 h-12 rounded-2xl font-black italic lowercase transition-all">Go to Dashboard</Button>
        </div>
      )}

      <ImageLightbox
        isOpen={lbOpen}
        onClose={() => setLbOpen(false)}
        images={lbImages}
        initialIndex={lbIndex}
      />
    </div>
  )
}
