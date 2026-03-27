"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { supabase, type PPFTier, type PromotionalOffer, type ShelfPricingTier } from "@/lib/supabase"
import { BarChart3, DollarSign, Package, Save, Tag, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export function PricingOffersManagement() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pricingTiers, setPricingTiers] = useState<ShelfPricingTier[]>([])
  const [ppfTiers, setPpfTiers] = useState<PPFTier[]>([])
  const [offers, setOffers] = useState<PromotionalOffer[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [pricingRes, ppfRes, offersRes] = await Promise.all([
        supabase.from("shelf_pricing_tiers").select("*").order("duration"),
        supabase.from("ppf_tiers").select("*").order("min_sales_amount", { ascending: false }),
        supabase.from("promotional_offers").select("*").order("created_at", { ascending: false })
      ])
      
      setPricingTiers(pricingRes.data || [])
      setPpfTiers(ppfRes.data || [])
      setOffers(offersRes.data || [])
    } catch (err: any) {
      toast.error('Failed to load configuration.')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePricing = async () => {
    setSaving(true)
    try {
      // Supabase does not have an easy bulk upsert hook inside client, so let's do one by one for updates
      for (const tier of pricingTiers) {
        await supabase.from("shelf_pricing_tiers").update({
          bottom_price: tier.bottom_price,
          eye_level_price: tier.eye_level_price,
          top_level_price: tier.top_level_price
        }).eq("id", tier.id)
      }
      toast.success("Shelf Pricing updated successfully!")
    } catch (err: any) {
      toast.error("Error updating pricing.")
    } finally {
      setSaving(false)
    }
  }

  const handleSavePPF = async () => {
    setSaving(true)
    try {
      for (const tier of ppfTiers) {
        await supabase.from("ppf_tiers").update({
          min_sales_amount: tier.min_sales_amount,
          ppf_rate: tier.ppf_rate,
          rent_waiver_percent: Math.min(100, Math.max(0, tier.rent_waiver_percent))
        }).eq("id", tier.id)
      }
      toast.success("PPF Rules updated successfully!")
    } catch (err: any) {
      toast.error("Error updating PPF tiers.")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveOffers = async () => {
    setSaving(true)
    try {
      for (const offer of offers) {
        if (offer.id.startsWith("new-")) {
          const { id, ...newOffer } = offer
          await supabase.from("promotional_offers").insert(newOffer)
        } else {
          await supabase.from("promotional_offers").update({
            name: offer.name,
            promo_code: offer.promo_code || null,
            discount_type: offer.discount_type,
            discount_value: offer.discount_value,
            target_limit: offer.target_limit || null,
            is_active: offer.is_active
          }).eq("id", offer.id)
        }
      }
      toast.success("Promotional options updated!")
      fetchData() // to get actual IDs
    } catch (err: any) {
      toast.error("Error updating offers.")
    } finally {
      setSaving(false)
    }
  }

  const addOfferRow = () => {
    setOffers([
      { id: `new-${Date.now()}`, name: "New Discount", promo_code: "", discount_type: "percentage", discount_value: 10, target_limit: 10, current_uses: 0, is_active: true },
      ...offers
    ])
  }

  if (loading) {
     return <div className="p-20 text-center animate-pulse text-gray-400 font-bold uppercase tracking-widest text-xs">Loading Configurations...</div>
  }

  return (
    <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
           <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
             <DollarSign className="w-8 h-8 text-[#FE7F2D]" />
             Pricing & Economics
           </h1>
           <p className="text-gray-500 font-medium text-sm">Configure dynamic shelf base prices, payment processing fee (PPF) thresholds, and global platform offers.</p>
        </div>
      </div>

      {/* Shelf Pricing Configuration */}
      <Card className="border border-black/5 shadow-xl rounded-3xl bg-white overflow-hidden">
         <CardHeader className="bg-gray-50/50 border-b border-black/5 flex flex-col sm:flex-row items-center justify-between">
            <div className="space-y-1">
               <CardTitle className="text-base font-black italic lowercase tracking-tighter flex items-center gap-2">
                 <Package className="w-5 h-5 text-[#FE7F2D]" /> Platform Slot Economics
               </CardTitle>
               <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Base monthly subscription fees</CardDescription>
            </div>
            <Button onClick={handleSavePricing} disabled={saving} className="bg-[#FE7F2D] hover:bg-black text-white rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest transition-all">
               <Save className="w-4 h-4 mr-2" /> Save Pricing
            </Button>
         </CardHeader>
         <CardContent className="p-8 space-y-8">
            <div className="grid md:grid-cols-3 gap-6">
               {pricingTiers.map(tier => (
                 <div key={tier.id} className="space-y-4 border border-gray-100 p-6 rounded-2xl bg-gray-50/30">
                    <Badge className="bg-gray-200 text-gray-700 font-black uppercase tracking-widest border-none px-4 py-1 text-[10px]">
                      {tier.duration.replace("_", " ")}
                    </Badge>
                    <div className="space-y-4 pt-2">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Top Level (NPR/mo)</Label>
                          <Input type="number" value={tier.top_level_price} 
                             onChange={(e) => setPricingTiers(pt => pt.map(t => t.id === tier.id ? { ...t, top_level_price: Number(e.target.value) } : t))} 
                             className="h-12 rounded-xl font-bold bg-white" />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Eye Level (NPR/mo) - <span className="text-orange-500">Premium</span></Label>
                          <Input type="number" value={tier.eye_level_price} 
                             onChange={(e) => setPricingTiers(pt => pt.map(t => t.id === tier.id ? { ...t, eye_level_price: Number(e.target.value) } : t))} 
                             className="h-12 rounded-xl font-black text-[#FE7F2D] border-orange-200 bg-orange-50/30" />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bottom Level (NPR/mo)</Label>
                          <Input type="number" value={tier.bottom_price} 
                             onChange={(e) => setPricingTiers(pt => pt.map(t => t.id === tier.id ? { ...t, bottom_price: Number(e.target.value) } : t))} 
                             className="h-12 rounded-xl font-bold bg-white" />
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </CardContent>
      </Card>

      {/* Processing Fees Configuration */}
      <Card className="border border-black/5 shadow-xl rounded-3xl bg-white overflow-hidden">
         <CardHeader className="bg-gray-50/50 border-b border-black/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
               <CardTitle className="text-base font-black italic lowercase tracking-tighter flex items-center gap-2">
                 <BarChart3 className="w-5 h-5 text-blue-500" /> Payment Processing Fee (PPF) Pipeline
               </CardTitle>
               <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Dynamic PPF layers and rent waivers based on gross</CardDescription>
            </div>
            <Button onClick={handleSavePPF} disabled={saving} className="w-full sm:w-auto bg-blue-600 hover:bg-black text-white rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest transition-all">
               <Save className="w-4 h-4 mr-2" /> Save Protocol
            </Button>
         </CardHeader>
         <CardContent className="p-0">
            <div className="table-responsive">
               <table className="w-full text-left">
                  <thead className="bg-[#010307] text-white">
                     <tr>
                        <th className="px-8 py-4 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Tier Classification</th>
                        <th className="py-4 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Floor Threshold (NPR)</th>
                        <th className="py-4 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">PPF Index (%)</th>
                        <th className="px-8 py-4 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Rent Relief (%)</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {ppfTiers.map((tier) => (
                        <tr key={tier.id} className="hover:bg-gray-50/50">
                           <td className="px-8 py-6">
                              <Badge variant="outline" className={`font-black uppercase tracking-widest border-2 px-3 
                                 ${tier.tier_name === "Platinum" ? "border-purple-200 text-purple-700 bg-purple-50" :
                                 tier.tier_name === "Gold" ? "border-amber-200 text-amber-600 bg-amber-50" :
                                 tier.tier_name === "Silver" ? "border-gray-200 text-gray-500 bg-gray-50" : "border-emerald-200 text-emerald-700 bg-emerald-50"}`}>
                                 {tier.tier_name}
                              </Badge>
                           </td>
                           <td className="py-6 min-w-[140px]">
                              <Input type="number" value={tier.min_sales_amount} onChange={(e) => setPpfTiers(pt => pt.map(t => t.id === tier.id ? { ...t, min_sales_amount: Number(e.target.value) } : t))} className="h-10 w-32 rounded-xl font-bold bg-white" />
                           </td>
                           <td className="py-6 min-w-[100px]">
                              <Input type="number" value={tier.ppf_rate} onChange={(e) => setPpfTiers(pt => pt.map(t => t.id === tier.id ? { ...t, ppf_rate: Number(e.target.value) } : t))} className="h-10 w-24 rounded-xl font-black text-red-600 bg-red-50/50" />
                           </td>
                           <td className="px-8 py-6 min-w-[100px]">
                              <Input type="number" value={tier.rent_waiver_percent} onChange={(e) => setPpfTiers(pt => pt.map(t => t.id === tier.id ? { ...t, rent_waiver_percent: Number(e.target.value) } : t))} className="h-10 w-24 rounded-xl font-bold text-green-700 bg-green-50/50" />
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </CardContent>
      </Card>

      {/* Promotional Offers Configuration */}
      <Card className="border border-black/5 shadow-xl rounded-3xl bg-black text-white overflow-hidden">
         <CardHeader className="bg-white/5 border-b border-white/5 flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
               <CardTitle className="text-base font-black italic lowercase tracking-tighter flex items-center gap-2">
                 <Tag className="w-5 h-5 text-purple-400" /> Active Platform Offers
               </CardTitle>
               <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-white/40">Incentivize new onboardings with dynamic discounts</CardDescription>
            </div>
            <div className="flex gap-4 w-full lg:w-auto">
               <Button onClick={addOfferRow} variant="outline" className="flex-1 lg:flex-none text-black border-white/20 hover:bg-white/90 rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest transition-all">
                  + Add Offer
               </Button>
               <Button onClick={handleSaveOffers} disabled={saving} className="flex-1 lg:flex-none bg-purple-600 hover:bg-white hover:text-black rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest transition-all">
                  <Save className="w-4 h-4 mr-2" /> Sync Offers
               </Button>
            </div>
         </CardHeader>
         <CardContent className="p-4 sm:p-8 space-y-4">
            {offers.length === 0 ? (
               <div className="py-10 text-center text-white/30 font-bold text-sm italic">No active promotional layers.</div>
            ) : offers.map((offer) => (
                <div key={offer.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 items-end group relative transition-all hover:bg-white/[0.07]">
                   <div className="space-y-2 sm:col-span-2">
                      <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Global Campaign Identifier</Label>
                      <Input value={offer.name} onChange={e => setOffers(os => os.map(o => o.id === offer.id ? { ...o, name: e.target.value} : o))} className="bg-white/10 border-none font-black text-white rounded-xl h-12" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Promo Code</Label>
                      <Input value={offer.promo_code || ""} placeholder="e.g. WELCOME10" onChange={e => setOffers(os => os.map(o => o.id === offer.id ? { ...o, promo_code: e.target.value.toUpperCase()} : o))} className="bg-white/10 border-none font-black text-purple-400 rounded-xl h-12 uppercase" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Type</Label>
                      <select value={offer.discount_type} onChange={(e) => setOffers(os => os.map(o => o.id === offer.id ? { ...o, discount_type: e.target.value as any} : o))} className="w-full flex h-12 rounded-xl bg-white/10 border-none px-3 py-2 text-sm text-white font-bold ring-offset-background outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                         <option value="percentage">Percentage (%)</option>
                         <option value="fixed">Fixed Flat (NPR)</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Index</Label>
                      <Input type="number" value={offer.discount_value} onChange={e => setOffers(os => os.map(o => o.id === offer.id ? { ...o, discount_value: Number(e.target.value)} : o))} className="bg-white/10 border-none font-bold text-green-400 rounded-xl h-12" />
                   </div>
                   <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Limit ({offer.current_uses} used)</Label>
                      <Input type="number" value={offer.target_limit || 0} onChange={e => setOffers(os => os.map(o => o.id === offer.id ? { ...o, target_limit: Number(e.target.value)} : o))} className="bg-white/10 border-none font-bold text-white rounded-xl h-12" />
                   </div>
                   <div className="space-y-2 flex flex-col items-center sm:items-start group/active">
                      <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Pipeline Active</Label>
                      <div className="h-12 flex items-center gap-4 w-full">
                        <Switch checked={offer.is_active} onCheckedChange={c => setOffers(os => os.map(o => o.id === offer.id ? { ...o, is_active: c} : o))} className="data-[state=checked]:bg-green-500" />
                        {!offer.id.startsWith("new-") && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={async () => {
                              if (confirm("Delete this campaign permanently?")) {
                                const { error } = await supabase.from("promotional_offers").delete().eq("id", offer.id)
                                if (error) toast.error("Failed to delete.")
                                else {
                                  toast.success("Offer deleted.")
                                  fetchData()
                                }
                              }
                            }}
                            className="text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                   </div>
                </div>
            ))}
         </CardContent>
      </Card>
    </div>
  )
}
