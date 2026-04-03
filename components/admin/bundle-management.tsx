"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase, type ShelfBundle, type ShelfSection, type ShelfSlot, type Shelf } from "@/lib/supabase"
import { ChevronRight, Package, Plus, Trash2, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export function BundleManagement() {
  const [bundles, setBundles] = useState<ShelfBundle[]>([])
  const [slots, setSlots] = useState<ShelfSlot[]>([])
  const [sections, setSections] = useState<ShelfSection[]>([])
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [pricingTiers, setPricingTiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newBundle, setNewBundle] = useState({
    name: "",
    description: "",
    price: 0,
    discountPercentage: 15,
    sectionId: "",
    eyeLevelCount: 0,
    topLevelCount: 0,
    bottomLevelCount: 0
  })

  // Hierarchical Display State
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [expandedShelf, setExpandedShelf] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [{ data: bRes }, { data: sRes }, { data: secRes }, { data: shRes }, { data: pRes }] = await Promise.all([
        supabase.from("shelf_bundles").select("*, items:shelf_bundle_items(*)").order("created_at", { ascending: false }),
        supabase.from("shelf_slots").select("*").order("slot_number", { ascending: true }),
        supabase.from("shelf_sections").select("*").order("name"),
        supabase.from("shelves").select("*").order("name"),
        supabase.from("shelf_pricing_tiers").select("*").eq("duration", "yearly")
      ])

      const calculatedBundles = (bRes || []).map(b => {
        let mv = 0
        // Get the section for bundle to determine correct section_tier
        const bundleSection = (secRes || []).find(s => s.id === b.section_id)
        const sectionTier = bundleSection?.section_tier || 'regular'
        
        // Find pricing tiers that match both yearly duration AND this section's tier
        const eyePr = (pRes || []).find(p => p.duration === 'yearly' && p.section_tier === sectionTier)
        const topPr = eyePr // same row has all level prices
        const botPr = eyePr

        if (eyePr) {
          mv += (b.bottom_level_count || 0) * eyePr.bottom_price * 12
          mv += (b.eye_level_count || 0) * eyePr.eye_level_price * 12
          mv += (b.top_level_count || 0) * eyePr.top_level_price * 12
        }
        return { ...b, marketValue: mv, sectionTier }
      })

      setBundles(calculatedBundles)
      setSlots(sRes || [])
      setSections(secRes || [])
      setShelves(shRes || [])
      setPricingTiers(pRes || [])
    } catch (e) {
      toast.error("Failed to fetch bundling data.")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBundle = async () => {
    if (!newBundle.name || (newBundle.eyeLevelCount === 0 && newBundle.topLevelCount === 0 && newBundle.bottomLevelCount === 0)) {
      toast.error("Please fill required fields and provide counts for at least one level.")
      return
    }

    try {
      const { data: bundle, error } = await supabase.from('shelf_bundles').insert({
        name: newBundle.name,
        description: newBundle.description,
        price: Math.round(calculatedPrice),
        discount_percentage: newBundle.discountPercentage,
        section_id: newBundle.sectionId !== "none" ? newBundle.sectionId : null,
        eye_level_count: newBundle.eyeLevelCount,
        top_level_count: newBundle.topLevelCount,
        bottom_level_count: newBundle.bottomLevelCount,
        is_active: true
      }).select().single()

      if (error) throw error

      toast.success("Bundle created successfully.")
      setIsCreateOpen(false)
      setNewBundle({ name: "", description: "", price: 0, discountPercentage: 15, sectionId: "", eyeLevelCount: 0, topLevelCount: 0, bottomLevelCount: 0 })
      fetchData()
    } catch (e: any) {
      toast.error(e.message || "Failed to create bundle")
    }
  }

  const handleDeleteBundle = async (id: string) => {
    if (!confirm("Are you sure? This will not delete the physical slots, just the bundle definition.")) return
    try {
      // First delete associated items
      const { error: itemsError } = await supabase.from("shelf_bundle_items").delete().eq("bundle_id", id)
      if (itemsError) throw itemsError

      // Then delete the bundle
      const { error } = await supabase.from("shelf_bundles").delete().eq("id", id)
      if (error) {
        if (error.code === '23503') {
           throw new Error("Cabinet Lockout: This bundle is linked to active bookings. deactivate it instead or settle associated bookings to purge.")
        }
        throw error
      }
      toast.success("Bundle removed.")
      fetchData()
    } catch (e: any) {
      toast.error(e.message || "terminal rejection: check database connectivity")
    }
  }


  const calculateIndividualTotal = () => {
    let total = 0
    // Determine section tier for the selected section
    const selectedSec = sections.find(s => s.id === newBundle.sectionId)
    const sectionTier = selectedSec?.section_tier || 'regular'
    const pr = (pricingTiers || []).find(p => p.duration === 'yearly' && p.section_tier === sectionTier)
    if (pr) {
      total += newBundle.bottomLevelCount * pr.bottom_price * 12
      total += newBundle.eyeLevelCount * pr.eye_level_price * 12
      total += newBundle.topLevelCount * pr.top_level_price * 12
    }
    return total
  }

  const individualTotal = calculateIndividualTotal()
  const calculatedPrice = newBundle.discountPercentage > 0 ? individualTotal * (1 - newBundle.discountPercentage / 100) : newBundle.price
  const discountAmount = Math.max(0, individualTotal - calculatedPrice)
  const discountPct = individualTotal > 0 ? (discountAmount / individualTotal * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black italic lowercase tracking-tight">Shelf Bundling</h1>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-[#FE7F2D] text-white">
          <Plus className="w-4 h-4 mr-2" /> New Bundle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bundles.map(bundle => (
          <Card key={bundle.id} className={`border-[#FE7F2D]/10 bg-white/50 backdrop-blur-sm overflow-hidden transition-opacity ${!bundle.is_active ? 'opacity-50 grayscale-[0.5]' : ''}`}>
            <CardHeader className="bg-[#FE7F2D]/5 flex flex-row justify-between items-center py-4">
              <div className="flex flex-col gap-1">
                 <CardTitle className="text-lg font-black lowercase italic">{bundle.name}</CardTitle>
                 <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-widest ${bundle.is_active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                      {bundle.is_active ? 'active deal' : 'inactive'}
                    </Badge>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                   variant="ghost" 
                   size="icon" 
                   onClick={async () => {
                     const { error } = await supabase.from('shelf_bundles').update({ is_active: !bundle.is_active }).eq('id', bundle.id)
                     if (!error) fetchData()
                   }} 
                   className="text-gray-400 hover:text-[#FE7F2D] hover:bg-orange-50"
                   title="Toggle Active Status"
                >
                  <Zap className={`w-4 h-4 ${bundle.is_active ? 'fill-[#FE7F2D] text-[#FE7F2D]' : ''}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteBundle(bundle.id)} className="text-red-400 hover:text-red-500 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                 <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-100 text-[10px]">
                   {sections.find(s => s.id === (bundle as any).section_id)?.name || "General"}
                 </Badge>
              </div>
              <p className="text-sm text-gray-500 italic lowercase">{bundle.description || "No description provided."}</p>
              <div className="flex justify-between items-end pt-4 border-t border-[#FE7F2D]/5">
                <div>
                  <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Yearly Price</p>
                  <p className="text-xl font-bold line-through text-gray-300">NPR {bundle.marketValue?.toLocaleString()}</p>
                  <p className="text-2xl font-black text-[#FE7F2D]">NPR {(bundle.discount_percentage ? (bundle.marketValue! * (1 - bundle.discount_percentage / 100)) : bundle.price).toLocaleString()}</p>
                </div>
                {bundle.discount_percentage && bundle.discount_percentage > 0 && (
                  <Badge className="bg-green-500 text-white font-black italic">Save {Math.round(bundle.discount_percentage)}%</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bundles.length === 0 && !loading && (
        <div className="text-center py-20 bg-gray-50/50 border-2 border-dashed border-gray-100 rounded-[2.5rem]">
          <Zap className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="font-bold text-gray-400 lowercase italic">No active bundles created yet.</p>
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl scrollbar-hide max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black lowercase italic">Configure Bundle</DialogTitle>
            <DialogDescription className="lowercase italic italic">Hierarchical selection: section {">"} shelf {">"} slots</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-black italic lowercase px-2">Bundle ID / Name</Label>
                <Input placeholder="e.g. entrance row 1" value={newBundle.name} onChange={e => setNewBundle(b => ({ ...b, name: e.target.value.toLowerCase() }))} className="rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label className="font-black italic lowercase px-2">Primary Zone</Label>
                <Select value={newBundle.sectionId} onValueChange={v => setNewBundle(b => ({ ...b, sectionId: v }))}>
                  <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Select Zone" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General / Unassigned</SelectItem>
                    {sections.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-black italic lowercase px-2">Package Discount (%)</Label>
                <div className="relative">
                  <Input type="number" value={newBundle.discountPercentage || ""} onChange={e => setNewBundle(b => ({ ...b, discountPercentage: parseFloat(e.target.value) || 0 }))} className="rounded-2xl border-[#FE7F2D]/30" />
                  <Badge className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#FE7F2D] text-white font-black italic">Target Discount</Badge>
                </div>
                {individualTotal > 0 && (
                   <div className="pt-2 flex flex-col gap-1 px-2">
                      <div className="flex justify-between items-center text-xs font-bold text-gray-500 italic">
                         <span>Final Dynamic Price:</span>
                         <span className="text-[#FE7F2D] font-black">NPR {Math.round(calculatedPrice).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-dashed mt-1 pt-1 opacity-50">
                         <span className="text-[10px] uppercase font-black text-gray-400">Market Price:</span>
                         <span className="text-[10px] font-black text-gray-500 line-through">NPR {individualTotal.toLocaleString()}</span>
                      </div>
                   </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-black italic lowercase px-2">Description</Label>
                <Input placeholder="What's included in this deal?" value={newBundle.description} onChange={e => setNewBundle(b => ({ ...b, description: e.target.value.toLowerCase() }))} className="rounded-2xl" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <Label className="font-black italic lowercase">Define Slot Requirements</Label>
                <div className="flex gap-2">
                    <Badge variant="outline" className="bg-orange-50 text-[#FE7F2D] border-orange-100 font-bold px-3 py-1">
                      {newBundle.eyeLevelCount + newBundle.topLevelCount + newBundle.bottomLevelCount} Total Slots
                    </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-6 bg-white border-2 border-[#FE7F2D]/10 rounded-[2.5rem] shadow-sm">
                 <div className="space-y-4">
                    {/* Eye Level Input */}
                    <div className="flex items-center justify-between group">
                       <div className="flex items-center gap-3">
                          <div className={newBundle.eyeLevelCount > 0 ? "text-[#FE7F2D]" : "text-gray-300"}>
                            <Zap className={`w-5 h-5 ${newBundle.eyeLevelCount > 0 ? 'fill-[#FE7F2D]' : ''}`} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black italic lowercase text-lg">Eye Level Slots</span>
                            <span className="text-[10px] uppercase font-black text-gray-400">Most popular / premium</span>
                          </div>
                       </div>
                       <div className="flex items-center gap-2 border-2 border-gray-100 rounded-2xl p-1 bg-gray-50 group-hover:border-[#FE7F2D]/30 transition-all">
                          <Button variant="ghost" size="icon" onClick={() => setNewBundle(b => ({ ...b, eyeLevelCount: Math.max(0, b.eyeLevelCount - 1) }))} className="h-8 w-8 text-gray-400">-</Button>
                          <input 
                            type="number" 
                            className="bg-transparent w-8 text-center font-black text-[#FE7F2D] border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={newBundle.eyeLevelCount}
                            onChange={e => setNewBundle(b => ({ ...b, eyeLevelCount: Math.max(0, parseInt(e.target.value) || 0) }))}
                          />
                          <Button variant="ghost" size="icon" onClick={() => setNewBundle(b => ({ ...b, eyeLevelCount: b.eyeLevelCount + 1 }))} className="h-8 w-8 text-[#FE7F2D]">+</Button>
                       </div>
                    </div>

                    {/* Top Level Input */}
                    <div className="flex items-center justify-between group">
                       <div className="flex items-center gap-3">
                          <div className={newBundle.topLevelCount > 0 ? "text-blue-500" : "text-gray-300"}>
                            <Package className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black italic lowercase text-lg">Top Level Slots</span>
                            <span className="text-[10px] uppercase font-black text-gray-400">High visibility</span>
                          </div>
                       </div>
                       <div className="flex items-center gap-2 border-2 border-gray-100 rounded-2xl p-1 bg-gray-50 group-hover:border-blue-200 transition-all">
                          <Button variant="ghost" size="icon" onClick={() => setNewBundle(b => ({ ...b, topLevelCount: Math.max(0, b.topLevelCount - 1) }))} className="h-8 w-8 text-gray-400">-</Button>
                          <input 
                            type="number" 
                            className="bg-transparent w-8 text-center font-black text-blue-500 border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={newBundle.topLevelCount}
                            onChange={e => setNewBundle(b => ({ ...b, topLevelCount: Math.max(0, parseInt(e.target.value) || 0) }))}
                          />
                          <Button variant="ghost" size="icon" onClick={() => setNewBundle(b => ({ ...b, topLevelCount: b.topLevelCount + 1 }))} className="h-8 w-8 text-blue-500">+</Button>
                       </div>
                    </div>

                    {/* Bottom Level Input */}
                    <div className="flex items-center justify-between group">
                       <div className="flex items-center gap-3">
                          <div className={newBundle.bottomLevelCount > 0 ? "text-gray-500" : "text-gray-300"}>
                            <ChevronRight className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black italic lowercase text-lg">Bottom Level Slots</span>
                            <span className="text-[10px] uppercase font-black text-gray-400">Essential storage</span>
                          </div>
                       </div>
                       <div className="flex items-center gap-2 border-2 border-gray-100 rounded-2xl p-1 bg-gray-50 group-hover:border-gray-200 transition-all">
                          <Button variant="ghost" size="icon" onClick={() => setNewBundle(b => ({ ...b, bottomLevelCount: Math.max(0, b.bottomLevelCount - 1) }))} className="h-8 w-8 text-gray-400">-</Button>
                          <input 
                            type="number" 
                            className="bg-transparent w-8 text-center font-black text-gray-700 border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={newBundle.bottomLevelCount}
                            onChange={e => setNewBundle(b => ({ ...b, bottomLevelCount: Math.max(0, parseInt(e.target.value) || 0) }))}
                          />
                          <Button variant="ghost" size="icon" onClick={() => setNewBundle(b => ({ ...b, bottomLevelCount: b.bottomLevelCount + 1 }))} className="h-8 w-8 text-gray-700">+</Button>
                       </div>
                    </div>
                 </div>
              </div>
            </div>

            <div className="pt-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-2xl">Cancel</Button>
              <Button onClick={handleCreateBundle} className="bg-[#FE7F2D] text-white px-10 rounded-2xl font-black italic">Activate Deal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
