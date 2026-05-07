"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageLightbox } from "@/components/ui/lightbox"
import { SafeImage } from "@/components/ui/safe-image"
import { DURATION_MONTHS, supabase, type Duration, type PPFTier, type ShelfBundle, type ShelfPricingTier, type ShelfSection, type ShelfType } from "@/lib/supabase"
import { ArrowRight, Banknote, BarChart3, Camera, CheckCircle2, Clock, Info, Layout, Lock, Package, QrCode, Tag, Users, Zap } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { useEffect, useState } from "react"

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

export default function PricingInfoPage() {
  const [loading, setLoading] = useState(true)
  const [sections, setSections] = useState<ShelfSection[]>([])
  const [pricingTiers, setPricingTiers] = useState<ShelfPricingTier[]>([])
  const [bundles, setBundles] = useState<any[]>([])
  const [dynamicProtocols, setDynamicProtocols] = useState<{ title: string; items: string[] }[]>([])
  const [ppfTiers, setPpfTiers] = useState<PPFTier[]>([])
  const [storeImages, setStoreImages] = useState<any[]>([])
  const [sectionCapacity, setSectionCapacity] = useState<Record<string, { total: number, remaining: number }>>({})
  const [shelfAvailability, setShelfAvailability] = useState<{ sectionId: string, type: ShelfType, remaining: number }[]>([])
  const [selectedDuration, setSelectedDuration] = useState<Duration>("yearly")

  const [lbOpen, setLbOpen] = useState(false)
  const [lbImages, setLbImages] = useState<string[]>([])
  const [lbIndex, setLbIndex] = useState(0)

  const openLightbox = (imgs: string[], idx: number) => {
    setLbImages(imgs)
    setLbIndex(idx)
    setLbOpen(true)
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [secRes, priceRes, slotsRes, protRes, imgRes, bundleRes, ppfRes] = await Promise.all([
          supabase.from("shelf_sections").select("*"),
          supabase.from("shelf_pricing_tiers").select("*"),
          supabase.from("shelf_slots").select("id, shelf_type, slot_number, status, section_id"),
          supabase.from("platform_content").select("protocols").eq("id", 1).single(),
          supabase.from("store_images").select("*"),
          supabase.from("shelf_bundles").select("*, items:shelf_bundle_items(*)").eq("is_active", true),
          supabase.from("ppf_tiers").select("*").order("min_sales_amount", { ascending: true })
        ])

        setSections(secRes.data || [])
        setPricingTiers(priceRes.data || [])
        setStoreImages(imgRes.data || [])
        setPpfTiers(ppfRes.data || [])
        if (protRes.data) setDynamicProtocols(protRes.data.protocols || [])

        // Calculate market values for bundles
        const bundleData = (bundleRes.data || []).map(b => {
          let marketValue = 0
          const bundleSection = (secRes.data || []).find((s: any) => s.id === b.section_id)
          const sectionTier = bundleSection?.section_tier || 'regular'
          const pr = (priceRes.data || []).find((p: any) => p.duration === 'yearly' && p.section_tier === sectionTier)
          if (pr) {
            marketValue += (b.bottom_level_count || 0) * pr.bottom_price * 12
            marketValue += (b.eye_level_count || 0) * pr.eye_level_price * 12
            marketValue += (b.top_level_count || 0) * pr.top_level_price * 12
          }
          const price = b.discount_percentage ? marketValue * (1 - b.discount_percentage / 100) : b.price
          return { ...b, marketValue, price, sectionTier }
        })
        setBundles(bundleData)

        if (slotsRes.data) {
          const availabilityMap: Record<string, { total: number, remaining: number }> = {}
          const levelAvail: { sectionId: string, type: ShelfType, remaining: number }[] = []

          slotsRes.data.forEach(s => {
            const type = s.shelf_type as ShelfType
            const sId = s.section_id
            const isOcc = s.status !== 'available'

            if (sId) {
              if (!availabilityMap[sId]) availabilityMap[sId] = { total: 0, remaining: 0 }
              availabilityMap[sId].total++
              if (!isOcc) availabilityMap[sId].remaining++

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
          setSectionCapacity(availabilityMap)
          setShelfAvailability(levelAvail)
        }
      } catch (error) {
        console.error("Error fetching pricing data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const getPrice = (d: Duration, type: ShelfType, tier: string) => {
    const pricing = pricingTiers.find(t => t.duration === d && t.section_tier === tier)
    if (!pricing) return 0
    return type === "bottom" ? pricing.bottom_price : type === "eye_level" ? pricing.eye_level_price : pricing.top_level_price
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFCEB] flex flex-col items-center justify-center gap-6">
        <img src="/thc_club.gif" alt="loading" className="w-[70vw] max-w-[500px] h-auto object-contain" />
        <p className="text-[#010307]/40 font-black lowercase tracking-widest italic animate-pulse">curating the collective economics...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFFCEB] text-[#010307] font-space-grotesk pb-32">
      {/* Navigation - Simple Read Only */}
      <nav className="sticky top-0 z-40 bg-[#FFFCEB]/95 backdrop-blur-sm border-b border-[#FE7F2D]/20">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <Link href="/">
            <img src="/logo.png" alt="thc club logo" className="h-6 sm:h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
             <Badge variant="outline" className="border-[#FE7F2D]/20 text-[#FE7F2D] text-[10px] font-black uppercase tracking-widest">Secret Pricing List</Badge>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16 sm:py-24 space-y-24">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-[#FE7F2D]/10 text-[#FE7F2D] px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em]">
            exclusive information
          </div>
          <h1 className="text-5xl sm:text-7xl font-black lowercase italic tracking-tighter leading-none">
            the <span className="text-[#FE7F2D]">economics</span> of the club.
          </h1>
          <p className="text-lg sm:text-2xl text-[#010307]/50 italic font-medium max-w-2xl mx-auto leading-relaxed">
            transparent, flat-fee pricing designed to let brands scale without the traditional retail friction.
          </p>
        </div>

        {/* Bundle Deals */}
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
             <div className="space-y-2">
                <div className="flex items-center gap-2">
                   <Zap className="w-5 h-5 text-[#FE7F2D] fill-[#FE7F2D]" />
                   <h2 className="text-3xl font-black lowercase italic">featured bundle deals</h2>
                </div>
                <p className="text-sm text-[#010307]/40 italic">the best way to establish a heavy physical presence.</p>
             </div>
             <Badge className="bg-green-500 text-white font-black italic rounded-lg px-4 py-1.5">save up to 35% on yearly commitments</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {bundles.map((bundle) => {
              const savings = Math.max(0, bundle.marketValue - bundle.price)
              const savingsPct = bundle.marketValue > 0 ? Math.round((savings / bundle.marketValue) * 100) : 0
              const discountMult = bundle.discount_percentage ? (1 - bundle.discount_percentage / 100) : 1
              const pr = pricingTiers.find(t => t.duration === 'yearly' && t.section_tier === (bundle.sectionTier || 'regular'))

              return (
                <Card key={bundle.id} className="border-2 border-dashed border-[#FE7F2D]/20 rounded-[2.5rem] p-8 space-y-6 bg-white/50 backdrop-blur-sm transition-all hover:border-[#FE7F2D]/40 group">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black lowercase italic text-[#010307] group-hover:text-[#FE7F2D] transition-colors">{bundle.name}</h3>
                      <p className="text-xs text-gray-400 italic lowercase leading-relaxed">{bundle.description}</p>
                    </div>
                    {savingsPct > 0 && <Badge className="bg-green-500 text-white font-black italic rounded-lg">Save {savingsPct}%</Badge>}
                  </div>

                  <div className="bg-white/70 border border-gray-100 rounded-3xl p-6 space-y-4 shadow-sm">
                    <div className="space-y-3 pb-4 border-b border-gray-100">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">bundle composition • yearly</p>
                      {[
                        { label: "Eye Level", count: bundle.eye_level_count, color: "bg-[#FE7F2D]", price: pr?.eye_level_price },
                        { label: "Top Level", count: bundle.top_level_count, color: "bg-blue-400", price: pr?.top_level_price },
                        { label: "Bottom Level", count: bundle.bottom_level_count, color: "bg-gray-400", price: pr?.bottom_price }
                      ].filter(l => l.count > 0).map((lvl, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                             <span className={`w-2 h-2 rounded-full ${lvl.color}`} />
                             <span className="text-xs font-black lowercase italic text-gray-500">{lvl.label} × {lvl.count}</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] text-gray-300 line-through">npr {(lvl.price! * 12).toLocaleString()}</span>
                             <span className={`text-xs font-black ${lvl.color.replace('bg-', 'text-')}`}>npr {Math.round(lvl.price! * 12 * discountMult).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                       <span>Market Value Total</span>
                       <span className="line-through">NPR {bundle.marketValue?.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center">
                       <span className="text-sm font-bold lowercase italic text-[#FE7F2D]">Collective Bundle Deal:</span>
                       <span className="text-3xl font-black text-[#FE7F2D]">NPR {bundle.price.toLocaleString()}</span>
                    </div>

                    <div className="pt-4 border-t border-dashed border-[#FE7F2D]/20 flex justify-between items-center">
                       <span className="text-xs font-black uppercase tracking-widest text-green-600">Total Savings</span>
                       <span className="text-lg font-black text-green-600">NPR {savings.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                     <div className="px-4 py-1.5 bg-[#FE7F2D]/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#FE7F2D]">
                        {(bundle.eye_level_count || 0) + (bundle.top_level_count || 0) + (bundle.bottom_level_count || 0)} Total Shelf Slots
                     </div>
                     <span className="text-xs font-black lowercase italic text-gray-300">Annual commitment required</span>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Section Breakdown */}
        <div className="max-w-6xl mx-auto space-y-12">
           <div className="text-center space-y-4">
              <h2 className="text-4xl font-black lowercase italic">individual shelf tiers</h2>
              <p className="text-sm text-[#010307]/40 italic max-w-xl mx-auto">prefer to build your own presence? choose the zone and level that fits your brand profile.</p>
           </div>

           {/* Duration Toggle */}
           <div className="flex justify-center">
              <Tabs value={selectedDuration} onValueChange={(v) => setSelectedDuration(v as Duration)} className="w-full max-w-md">
                <TabsList className="grid grid-cols-3 bg-white/50 border border-[#FE7F2D]/10 rounded-2xl h-12 p-1">
                  <TabsTrigger value="quarterly" className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-[#FE7F2D] data-[state=active]:text-white">Quarterly</TabsTrigger>
                  <TabsTrigger value="half_yearly" className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-[#FE7F2D] data-[state=active]:text-white">Half-Yearly</TabsTrigger>
                  <TabsTrigger value="yearly" className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-[#FE7F2D] data-[state=active]:text-white">Yearly</TabsTrigger>
                </TabsList>
              </Tabs>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {sections.map(sec => {
                const zoneImages = storeImages.filter(img => img.section.toLowerCase().includes(sec.name.toLowerCase()))
                const tierPricing = pricingTiers.filter(t => t.section_tier === sec.section_tier && t.duration === selectedDuration)[0]
                
                return (
                  <div key={sec.id} className="space-y-6">
                     <Card className={`border-2 rounded-[2.5rem] p-8 space-y-6 bg-white/50 backdrop-blur-sm ${sec.section_tier === 'premium' ? 'border-[#FE7F2D]/30 shadow-xl shadow-orange-500/5' : 'border-gray-100'}`}>
                        <div className="flex justify-between items-start">
                           <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${sec.section_tier === 'premium' ? 'bg-[#FE7F2D]/10 text-[#FE7F2D]' : 'bg-gray-100 text-gray-400'}`}>
                                 <Layout className="w-6 h-6" />
                              </div>
                              <div>
                                 <h3 className="text-2xl font-black lowercase italic">{sec.name}</h3>
                                 {sec.section_tier === 'premium' && <Badge className="bg-[#FE7F2D] text-white text-[8px] font-black uppercase tracking-widest mt-1">Premium Traffic Zone</Badge>}
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">{selectedDuration.replace('_', '-')} Rate</p>
                              <p className="text-xl font-black italic text-[#010307]">NPR {tierPricing?.bottom_price.toLocaleString()}<span className="text-[10px] font-bold text-gray-400 lowercase">/mo</span></p>
                           </div>
                        </div>

                        <p className="text-sm text-[#010307]/50 italic leading-relaxed">{sec.description}</p>

                        <div className="space-y-3">
                           {(["top_level", "eye_level", "bottom"] as ShelfType[]).map((type) => {
                             const info = LEVEL_INFO[type]
                             const price = getPrice(selectedDuration, type, sec.section_tier)
                             const avail = shelfAvailability.find(la => la.sectionId === sec.id && la.type === type)?.remaining || 0
                             
                             return (
                               <div key={type} className="flex justify-between items-center p-4 bg-white/70 border border-gray-100 rounded-2xl transition-all hover:border-[#FE7F2D]/20">
                                  <div className="space-y-0.5">
                                     <p className="text-sm font-black lowercase italic text-[#010307]">{info.label}</p>
                                     <p className="text-[10px] text-gray-400 italic">positioning: {info.description.split('.')[0]}</p>
                                  </div>
                                  <div className="text-right">
                                     <p className="text-base font-black italic text-[#FE7F2D]">NPR {price.toLocaleString()}<span className="text-[10px] font-bold text-gray-400 lowercase">/mo</span></p>
                                     <p className="text-[9px] font-black uppercase tracking-tighter text-gray-300">{avail} slots open</p>
                                  </div>
                               </div>
                             )
                           })}
                        </div>

                        {zoneImages.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 pt-2">
                             {zoneImages.slice(0, 4).map((img, i) => (
                               <div 
                                 key={i} 
                                 className="aspect-video relative rounded-xl overflow-hidden grayscale hover:grayscale-0 transition-all cursor-pointer group"
                                 onClick={() => openLightbox(zoneImages.map(zi => zi.url), i)}
                               >
                                 <SafeImage src={img.url} alt={img.section} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                               </div>
                             ))}
                          </div>
                        )}
                     </Card>
                  </div>
                )
              })}
           </div>
        </div>

        {/* PPF Tiers Section */}
        <div className="max-w-6xl mx-auto space-y-12">
           <div className="text-center space-y-4">
              <h2 className="text-4xl font-black lowercase italic">partner processing fee (PPF)</h2>
              <p className="text-sm text-[#010307]/40 italic max-w-xl mx-auto">the club takes a small fee based on your sales performance to maintain operations and staffing.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {ppfTiers.map((tier) => (
                <Card key={tier.id} className="border border-gray-100 rounded-[2rem] p-8 space-y-4 bg-white/50 backdrop-blur-sm transition-all hover:border-[#FE7F2D]/30 text-center">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">{tier.tier_name}</p>
                      <h3 className="text-3xl font-black italic text-[#FE7F2D]">{tier.ppf_rate}%</h3>
                   </div>
                   <div className="pt-4 border-t border-gray-50">
                      <p className="text-xs text-gray-400 italic font-medium lowercase">Sales above</p>
                      <p className="text-lg font-black italic text-[#010307]">NPR {tier.min_sales_amount.toLocaleString()}</p>
                   </div>
                   {tier.rent_waiver_percent > 0 && (
                     <div className="bg-green-50 rounded-xl p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-green-600 mb-1">Performance Credit</p>
                        <p className="text-xs font-bold italic text-green-700">{tier.rent_waiver_percent}% Rent Refunded</p>
                     </div>
                   )}
                </Card>
              ))}
           </div>
        </div>

        {/* The Protocols */}
        <div className="max-w-4xl mx-auto space-y-12">
           <div className="text-center space-y-4">
              <h2 className="text-4xl font-black lowercase italic text-[#010307]">the club <span className="text-[#FE7F2D]">protocols</span></h2>
              <p className="text-sm text-[#010307]/40 italic">the rules of engagement within our collective.</p>
           </div>

           <Card className="border border-[#FE7F2D]/10 shadow-2xl rounded-[3rem] bg-white overflow-hidden">
             <div className="p-8 sm:p-12 space-y-12">
               <div className="grid md:grid-cols-2 gap-12 text-left">
                 {dynamicProtocols.map((p, idx) => (
                   <div key={idx} className="space-y-4">
                     <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FE7F2D] border-b border-[#FE7F2D]/10 pb-2">{p.title}</h4>
                     <ul className="space-y-4 text-xs text-[#010307]/60 font-medium lowercase italic leading-relaxed">
                       {p.items.map((item, i) => (
                         <li key={i} className="flex gap-3">
                            <span className="text-[#FE7F2D] font-bold">•</span>
                            <span>{item}</span>
                         </li>
                       ))}
                     </ul>
                   </div>
                 ))}
               </div>

               <div className="pt-10 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="text-center md:text-left">
                    <p className="text-[10px] font-black text-[#010307]/30 uppercase tracking-[0.2em]">official support</p>
                    <p className="text-xs font-black text-[#FE7F2D]">thehiddencollectiveclub@gmail.com</p>
                  </div>
                  <Badge variant="outline" className="border-gray-100 text-gray-300 text-[8px] font-black uppercase tracking-widest py-1.5 px-4 rounded-full">
                    Document Version v1.2
                  </Badge>
               </div>
             </div>
           </Card>
        </div>

        {/* Finalization Protocol Info */}
        <div className="max-w-3xl mx-auto">
          <Card className="bg-[#FE7F2D]/[0.02] border border-[#FE7F2D]/10 rounded-[2.5rem] p-10 text-center space-y-6">
            <div className="w-16 h-16 bg-[#FE7F2D]/10 rounded-full flex items-center justify-center mx-auto text-[#FE7F2D]">
               <Banknote className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black lowercase italic">no payment required today.</h3>
            <p className="text-sm text-[#010307]/50 italic leading-relaxed max-w-md mx-auto">
              we finalize all partner agreements in person at the club. this ensures you are 100% satisfied with your physical slot placement and visual positioning before any commitment is made.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-4 max-w-sm mx-auto opacity-50 grayscale">
               <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center"><QrCode className="w-5 h-5" /></div>
                  <span className="text-[8px] font-black uppercase tracking-widest">QR Scan</span>
               </div>
               <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center"><Banknote className="w-5 h-5" /></div>
                  <span className="text-[8px] font-black uppercase tracking-widest">Transfer</span>
               </div>
               <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center"><Package className="w-5 h-5" /></div>
                  <span className="text-[8px] font-black uppercase tracking-widest">Cash</span>
               </div>
            </div>
          </Card>
        </div>

        {/* Closing CTA */}
        <div className="max-w-4xl mx-auto text-center space-y-12 py-24 border-t border-[#FE7F2D]/10">
          <div className="space-y-6">
            <h2 className="text-5xl sm:text-7xl font-black italic lowercase tracking-tighter leading-tight">
              ready to take <br />
              <span className="text-[#FE7F2D]">your shelf?</span>
            </h2>
            <p className="text-lg sm:text-2xl text-[#010307]/60 font-medium italic leading-relaxed max-w-2xl mx-auto">
              membership is curated. apply today to reserve your position in the collective.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/?auth=signup">
              <Button size="lg" className="bg-[#FE7F2D] hover:bg-black text-white font-black lowercase italic tracking-widest text-xl px-12 py-10 rounded-[2rem] shadow-2xl shadow-orange-500/20 h-auto group transition-all">
                apply for membership
                <Zap className="ml-4 h-6 w-6 animate-pulse" />
              </Button>
            </Link>
            <Link href="/?auth=login">
              <Button variant="outline" size="lg" className="border-[#010307]/20 text-[#010307] hover:bg-white hover:text-black font-black lowercase italic tracking-widest text-xl px-12 py-10 rounded-[2rem] h-auto transition-all">
                <Lock className="mr-4 h-6 w-6" />
                member login
              </Button>
            </Link>
          </div>
          
          <p className="text-xs text-[#010307]/30 italic">
            by joining, you agree to uphold the club protocols and curate with intention.
          </p>
        </div>
      </div>

      <ImageLightbox
        isOpen={lbOpen}
        onClose={() => setLbOpen(false)}
        images={lbImages}
        initialIndex={lbIndex}
      />
      
      {/* Footer Branding */}
      <footer className="py-12 bg-white/30 border-t border-gray-100">
         <div className="container mx-auto px-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-300 italic">the hidden collective club • kathmandu • 2026</p>
         </div>
      </footer>
    </div>
  )
}
