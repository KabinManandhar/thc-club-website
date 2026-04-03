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
    sectionId: "",
    slotIds: [] as string[]
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
        supabase.from("shelf_bundles").select("*").order("created_at", { ascending: false }),
        supabase.from("shelf_slots").select("*").order("slot_number", { ascending: true }),
        supabase.from("shelf_sections").select("*").order("name"),
        supabase.from("shelves").select("*").order("name"),
        supabase.from("shelf_pricing_tiers").select("*").eq("duration", "yearly")
      ])
      setBundles(bRes || [])
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
    if (!newBundle.name || newBundle.price <= 0 || newBundle.slotIds.length === 0) {
      toast.error("Please fill all required fields and select at least one slot.")
      return
    }

    try {
      const { data: bundle, error: bundleError } = await supabase
        .from('shelf_bundles')
        .insert({
          name: newBundle.name,
          description: newBundle.description,
          price: newBundle.price,
          section_id: newBundle.sectionId !== "none" ? newBundle.sectionId : null,
          is_active: true
        })
        .select()
        .single()

      if (bundleError) {
        if (bundleError.code === '42501') throw new Error("Security Rejection: Your account doesn't have internal permission to write bundles. please execute the RLS fix in sql editor.")
        throw bundleError
      }

      const items = newBundle.slotIds.map(id => ({
        bundle_id: bundle.id,
        slot_id: id
      }))

      const { error: itemsError } = await supabase.from('shelf_bundle_items').insert(items)
      if (itemsError) {
        if (itemsError.code === '42501') throw new Error("Security Rejection: cannot link slots to bundle due to policy violation.")
        throw itemsError
      }

      toast.success("Bundle created successfully.")
      setIsCreateOpen(false)
      setNewBundle({ name: "", description: "", price: 0, sectionId: "", slotIds: [] })
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleDeleteBundle = async (id: string) => {
    if (!confirm("Are you sure? This will not delete the slots, just the bundle itself.")) return
    try {
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

  const toggleSlotSelection = (slotId: string) => {
    setNewBundle(prev => ({
      ...prev,
      slotIds: prev.slotIds.includes(slotId) 
        ? prev.slotIds.filter(id => id !== slotId)
        : [...prev.slotIds, slotId]
    }))
  }

  const selectEntireShelf = (shelfId: string) => {
    const shelfSlots = slots.filter(s => s.shelf_id === shelfId).map(s => s.id)
    setNewBundle(prev => {
      const otherSlots = prev.slotIds.filter(id => !shelfSlots.includes(id))
      const allSelected = shelfSlots.every(id => prev.slotIds.includes(id))
      return { ...prev, slotIds: allSelected ? otherSlots : [...new Set([...prev.slotIds, ...shelfSlots])] }
    })
  }

  const calculateIndividualTotal = () => {
    let total = 0
    newBundle.slotIds.forEach(slotId => {
      const slot = slots.find(s => s.id === slotId)
      if (!slot) return
      
      const section = sections.find(sec => sec.id === slot.section_id)
      const tier = section?.section_tier || 'regular'
      const pricing = pricingTiers.find(p => p.section_tier === tier)
      
      if (pricing) {
        let slotPrice = 0
        const type = slot.shelf_type || 'eye_level'
        if (type === 'bottom') slotPrice = pricing.bottom_price
        else if (type === 'eye_level') slotPrice = pricing.eye_level_price
        else slotPrice = pricing.top_level_price
        
        total += (slotPrice * 12) // Individual Yearly Total
      }
    })
    return total
  }

  const individualTotal = calculateIndividualTotal()
  const discountAmount = Math.max(0, individualTotal - newBundle.price)
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
                  <p className="text-2xl font-black text-[#FE7F2D]">NPR {bundle.price.toLocaleString()}</p>
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
                <Label className="font-black italic lowercase px-2">Yearly Fixed Price (NPR)</Label>
                <div className="relative">
                  <Input type="number" value={newBundle.price || ""} onChange={e => setNewBundle(b => ({ ...b, price: parseFloat(e.target.value) || 0 }))} className="rounded-2xl" />
                  {newBundle.price > 0 && individualTotal > 0 && (
                    <Badge className="absolute right-3 top-1/2 -translate-y-1/2 bg-green-500 text-white font-black italic">Save {Math.round(discountPct)}%</Badge>
                  )}
                </div>
                {individualTotal > 0 && (
                   <div className="flex items-center justify-between px-2 pt-1 border-t border-dashed mt-2">
                      <span className="text-[10px] uppercase font-black text-gray-400">Individual Market Total:</span>
                      <span className="text-[10px] font-black text-gray-500 line-through">NPR {individualTotal.toLocaleString()}</span>
                   </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="font-black italic lowercase px-2">Description</Label>
                <Input placeholder="What's included in this deal?" value={newBundle.description} onChange={e => setNewBundle(b => ({ ...b, description: e.target.value.toLowerCase() }))} className="rounded-2xl" />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="font-black italic lowercase px-2">Hierarchical Inventory Picker ({newBundle.slotIds.length} Selected)</Label>
              <div className="border border-gray-100 rounded-3xl overflow-hidden bg-gray-50/30">
                {sections.map(section => (
                  <div key={section.id} className="border-b border-gray-100 last:border-b-0">
                    <button 
                      onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSection === section.id ? 'rotate-90' : ''}`} />
                        <span className="font-bold text-sm lowercase italic">{section.name}</span>
                      </div>
                      <Badge variant="outline" className="bg-white/80">{shelves.filter(sh => sh.section_id === section.id).length} Shelves</Badge>
                    </button>

                    {expandedSection === section.id && (
                      <div className="px-8 pb-4 space-y-3">
                        {shelves.filter(sh => sh.section_id === section.id).map(shelf => (
                          <div key={shelf.id} className="border border-gray-200/50 rounded-2xl bg-white overflow-hidden">
                            <div className="p-3 bg-gray-50 flex items-center justify-between border-b border-gray-100">
                               <button 
                                 onClick={() => setExpandedShelf(expandedShelf === shelf.id ? null : shelf.id)}
                                 className="flex items-center gap-2 hover:bg-gray-100 p-1 rounded-lg transition-colors"
                               >
                                 <Package className="w-3.5 h-3.5 text-[#FE7F2D]" />
                                 <span className="text-xs font-bold lowercase">{shelf.name}</span>
                               </button>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className="h-7 text-[10px] font-black uppercase tracking-tighter text-[#FE7F2D] hover:bg-orange-50"
                                 onClick={() => selectEntireShelf(shelf.id)}
                               >
                                 {slots.filter(s => s.shelf_id === shelf.id).every(id => newBundle.slotIds.includes(id.id)) 
                                   ? "Deselect Shelf" : "Select Entire Shelf"}
                               </Button>
                            </div>
                            
                            {expandedShelf === shelf.id && (
                              <div className="p-4 grid grid-cols-6 sm:grid-cols-10 gap-2">
                                {slots.filter(s => s.shelf_id === shelf.id).map(slot => (
                                  <div 
                                    key={slot.id} 
                                    onClick={() => toggleSlotSelection(slot.id)}
                                    className={`
                                      aspect-square rounded-lg flex items-center justify-center text-[10px] font-black cursor-pointer transition-all
                                      ${newBundle.slotIds.includes(slot.id) 
                                        ? 'bg-[#FE7F2D] text-white shadow-md' 
                                        : 'bg-gray-50 border border-gray-100 text-gray-300 hover:border-[#FE7F2D]/50'}
                                    `}
                                  >
                                    #{slot.slot_number}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
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
