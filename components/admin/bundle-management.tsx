"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase, type ShelfBundle, type ShelfSection, type ShelfSlot } from "@/lib/supabase"
import { LayoutGrid, Package, Plus, Trash2, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export function BundleManagement() {
  const [bundles, setBundles] = useState<ShelfBundle[]>([])
  const [slots, setSlots] = useState<ShelfSlot[]>([])
  const [sections, setSections] = useState<ShelfSection[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newBundle, setNewBundle] = useState({
    name: "",
    description: "",
    price: 0,
    sectionId: "",
    slotIds: [] as string[]
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [{ data: bRes }, { data: sRes }, { data: secRes }] = await Promise.all([
        supabase.from("shelf_bundles").select("*").order("created_at", { ascending: false }),
        supabase.from("shelf_slots").select("*").order("slot_number", { ascending: true }),
        supabase.from("shelf_sections").select("*").order("name")
      ])
      setBundles(bRes || [])
      setSlots(sRes || [])
      setSections(secRes || [])
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
          section_id: newBundle.sectionId || null
        })
        .select()
        .single()

      if (bundleError) throw bundleError

      const items = newBundle.slotIds.map(id => ({
        bundle_id: bundle.id,
        slot_id: id
      }))

      const { error: itemsError } = await supabase.from('shelf_bundle_items').insert(items)
      if (itemsError) throw itemsError

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
      if (error) throw error
      toast.success("Bundle removed.")
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
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
          <Card key={bundle.id} className="border-[#FE7F2D]/10 bg-white/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-[#FE7F2D]/5 flex flex-row justify-between items-center py-4">
              <CardTitle className="text-lg font-black lowercase italic">{bundle.name}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => handleDeleteBundle(bundle.id)} className="text-red-400 hover:text-red-500 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-gray-500 italic lowercase">{bundle.description || "No description provided."}</p>
              <div className="flex justify-between items-end pt-4 border-t border-[#FE7F2D]/5">
                <div>
                  <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Bundle Price</p>
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
            <DialogTitle className="text-2xl font-black lowercase italic">Create Shelf Bundle</DialogTitle>
            <DialogDescription className="lowercase italic">Select multiple slots to offer as a discounted bundle.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-black italic lowercase px-2">Bundle Name</Label>
                <Input 
                  placeholder="e.g. eye level combo" 
                  value={newBundle.name} 
                  onChange={e => setNewBundle(b => ({ ...b, name: e.target.value }))}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-black italic lowercase px-2">Associated Zone (Optional)</Label>
                <Select value={newBundle.sectionId} onValueChange={v => setNewBundle(b => ({ ...b, sectionId: v }))}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue placeholder="Select Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General / No Zone</SelectItem>
                    {sections.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-black italic lowercase px-2">Bundle Price (NPR)</Label>
                <Input 
                  type="number" 
                  placeholder="8500" 
                  value={newBundle.price || ""} 
                  onChange={e => setNewBundle(b => ({ ...b, price: parseFloat(e.target.value) || 0 }))}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-black italic lowercase px-2">Description</Label>
                <Input 
                  placeholder="Brief advantage" 
                  value={newBundle.description} 
                  onChange={e => setNewBundle(b => ({ ...b, description: e.target.value }))}
                  className="rounded-2xl"
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="font-black italic lowercase px-2">Select Slots to include ({newBundle.slotIds.length} Selected)</Label>
              <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 p-4 bg-gray-50 rounded-3xl border border-gray-100">
                {slots.map(slot => (
                  <div 
                    key={slot.id} 
                    onClick={() => toggleSlotSelection(slot.id)}
                    className={`
                      aspect-square rounded-lg flex items-center justify-center text-[10px] font-black cursor-pointer transition-all
                      ${newBundle.slotIds.includes(slot.id) 
                        ? 'bg-[#FE7F2D] text-white' 
                        : 'bg-white border border-gray-200 text-gray-400 hover:border-[#FE7F2D]'}
                    `}
                  >
                    #{slot.slot_number}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-2xl">Cancel</Button>
              <Button onClick={handleCreateBundle} className="bg-[#FE7F2D] text-white px-10 rounded-2xl font-black italic">Activate Bundle</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
