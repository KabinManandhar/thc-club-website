"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase, type PromotionalOffer, type Shelf, type ShelfSection, type ShelfSlot } from "@/lib/supabase"
import { Filter, LayoutGrid, Package, Plus, Search, Settings, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface SlotStats {
  total: number
  available: number
  occupied: number
  maintenance: number
}

export function ShelfSlotsManagement() {
  const [slots, setSlots] = useState<ShelfSlot[]>([])
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [sections, setSections] = useState<ShelfSection[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [offers, setOffers] = useState<PromotionalOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [shelfTypeFilter, setShelfTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedSlot, setSelectedSlot] = useState<ShelfSlot | null>(null)

  // Section Management State
  const [isSectionManagerOpen, setIsSectionManagerOpen] = useState(false)
  const [isCreateSectionOpen, setIsCreateSectionOpen] = useState(false)
  const [newSection, setNewSection] = useState({ name: "", description: "", section_tier: "regular" as "premium" | "regular" })
  const [editingSection, setEditingSection] = useState<ShelfSection | null>(null)

  // Shelf Creation State
  const [isCreateShelfOpen, setIsCreateShelfOpen] = useState(false)
  const [newShelf, setNewShelf] = useState<{
    name: string
    section_id: string
    is_movable: boolean
    size: "small" | "medium" | "large"
    shelf_type: "bottom" | "eye_level" | "top_level" | "mixed"
    total_slots: number
  }>({
    name: "",
    section_id: "",
    is_movable: false,
    size: "medium",
    shelf_type: "mixed",
    total_slots: 4,
  })

  const [updateData, setUpdateData] = useState({
    status: "",
    brand_id: "",
    occupied_by: "",
    rent_amount: "",
    occupied_from: "",
    occupied_until: "",
    notes: "",
    applied_promo_id: "",
  })

  // Edit / Delete Shelf State
  const [isEditShelfOpen, setIsEditShelfOpen] = useState(false)
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null)

  const [stats, setStats] = useState<{
    bottom: SlotStats
    eye_level: SlotStats
    top_level: SlotStats
    total: SlotStats
  }>({
    bottom: { total: 0, available: 0, occupied: 0, maintenance: 0 },
    eye_level: { total: 0, available: 0, occupied: 0, maintenance: 0 },
    top_level: { total: 0, available: 0, occupied: 0, maintenance: 0 },
    total: { total: 0, available: 0, occupied: 0, maintenance: 0 },
  })

  useEffect(() => {
    fetchSlots()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [slots])

  const fetchSlots = async () => {
    try {
      const [slotsRes, shelvesRes, brandsRes, sectionsRes, offersRes] = await Promise.all([
        supabase.from("shelf_slots").select("*, brands(business_name), promotional_offers(*)").order("slot_number", { ascending: true }),
        supabase.from("shelves").select("*").order("name"),
        supabase.from("brands").select("id, business_name").order("business_name"),
        supabase.from("shelf_sections").select("*").order("name"),
        supabase.from("promotional_offers").select("*").eq("is_active", true).order("name")
      ])

      if (slotsRes.error) throw slotsRes.error
      if (shelvesRes.error && shelvesRes.error.code !== "42P01") throw shelvesRes.error
      if (brandsRes.error) throw brandsRes.error
      if (sectionsRes.error) throw sectionsRes.error
      if (offersRes.error) throw offersRes.error

      setSlots(slotsRes.data || [])
      setShelves(shelvesRes.data || [])
      setBrands(brandsRes.data || [])
      setSections(sectionsRes.data || [])
      setOffers(offersRes.data || [])

      console.log("Loaded Infrastructure:", {
        slots: slotsRes.data?.length,
        shelves: shelvesRes.data?.length,
        sections: sectionsRes.data?.length
      })

      if (sectionsRes.data?.[0] && !newShelf.section_id) {
        setNewShelf(prev => ({ ...prev, section_id: sectionsRes.data[0].id }))
      }
    } catch (error) {
      console.error("Error fetching shelf data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateShelf = async () => {
    try {
      const targetSection = sections.find(s => s.id === newShelf.section_id)
      if (!targetSection) {
        toast.error("Please select a physical section.")
        return
      }

      const { data: shelf, error: shelfError } = await supabase
        .from("shelves")
        .insert({
          name: newShelf.name,
          section_id: newShelf.section_id,
          is_movable: newShelf.is_movable,
          size: newShelf.size,
          shelf_type: newShelf.shelf_type,
          total_slots: newShelf.total_slots
        })
        .select()
        .single()

      if (shelfError) throw shelfError

      // Generate slots
      const slotsToCreate = Array.from({ length: shelf.total_slots }).map((_, i) => ({
        shelf_id: shelf.id,
        shelf_name: shelf.name,
        section: targetSection.name,
        section_id: targetSection.id,
        shelf_type: shelf.shelf_type === 'mixed' ? 'eye_level' : shelf.shelf_type,
        slot_number: (slots.length + i + 1), // Simple auto-increment for global display
        status: 'available'
      }))

      const { error: slotsError } = await supabase.from("shelf_slots").insert(slotsToCreate)
      if (slotsError) throw slotsError

      setIsCreateShelfOpen(false)
      fetchSlots()
      toast.success("Physical shelf and slots synchronized.")
    } catch (error) {
      console.error("Error creating shelf:", error)
      toast.error("Critical failure during shelf generation.")
    }
  }

  const handleCreateSection = async () => {
    try {
      const { error } = await supabase.from('shelf_sections').insert(newSection)
      if (error) throw error
      setIsCreateSectionOpen(false)
      setNewSection({ name: "", description: "", section_tier: "regular" })
      fetchSlots()
      toast.success("New section added to thc club registry.")
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleUpdateSection = async () => {
    if (!editingSection) return
    try {
      const { error } = await supabase
        .from('shelf_sections')
        .update({
          name: editingSection.name,
          description: editingSection.description,
          section_tier: editingSection.section_tier
        })
        .eq('id', editingSection.id)
      if (error) throw error
      setEditingSection(null)
      fetchSlots()
      toast.success("Section configuration updated.")
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleDeleteSection = async (id: string) => {
    if (!confirm("Caution: Deleting a section will remove ALL physical shelves and slots within it. Continue?")) return
    try {
      const { error } = await supabase.from('shelf_sections').delete().eq('id', id)
      if (error) throw error
      fetchSlots()
      toast.success("Section purged from registry.")
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleUpdateShelfConfirm = async () => {
    if (!editingShelf || !editingShelf.id) return
    try {
      const targetSection = sections.find(s => s.id === editingShelf.section_id)
      const updates = {
        name: editingShelf.name,
        section_id: editingShelf.section_id,
        is_movable: editingShelf.is_movable,
        size: editingShelf.size,
        shelf_type: editingShelf.shelf_type,
      }

      const { error } = await supabase.from('shelves').update(updates).eq('id', editingShelf.id)
      if (error) throw error

      // Update cached values in slots if section changed
      if (targetSection) {
        await supabase.from('shelf_slots')
          .update({ shelf_name: editingShelf.name, section: targetSection.name, section_id: targetSection.id })
          .eq('shelf_id', editingShelf.id)
      }

      setIsEditShelfOpen(false)
      setEditingShelf(null)
      fetchSlots()
      toast.success("Structural configuration updated.")
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleDeleteShelf = async () => {
    if (!editingShelf || !editingShelf.id) return
    if (!confirm(`Are you sure you want to delete ${editingShelf.name}? This will remove all associated slots.`)) return
    try {
      const { error } = await supabase.from('shelves').delete().eq('id', editingShelf.id)
      if (error) throw error

      setIsEditShelfOpen(false)
      setEditingShelf(null)
      fetchSlots()
      toast.success("Physical shelf and slots purged.")
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const calculateStats = () => {
    const calculateSlotStats = (slotArray: ShelfSlot[]): SlotStats => ({
      total: slotArray.length,
      available: slotArray.filter((s) => s.status === "available").length,
      occupied: slotArray.filter((s) => s.status === "occupied").length,
      maintenance: slotArray.filter((s) => s.status === "maintenance").length,
    })

    setStats({
      bottom: calculateSlotStats(slots.filter(s => s.shelf_type === "bottom")),
      eye_level: calculateSlotStats(slots.filter(s => s.shelf_type === "eye_level")),
      top_level: calculateSlotStats(slots.filter(s => s.shelf_type === "top_level")),
      total: calculateSlotStats(slots),
    })
  }

  const updateSlot = async (id: string, updates: Partial<ShelfSlot>) => {
    try {
      const { error } = await supabase
        .from("shelf_slots")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) {
        // Fallback if brand_id or applied_promo_id columns are missing from db (SQL not run yet)
        if (error.code === '42703') {
          const { brand_id, rent_amount, occupied_from, occupied_until, notes, applied_promo_id, shelf_name, section, shelf_type, ...fallbackUpdates } = updates as any;
          const { error: fallbackError } = await supabase
            .from("shelf_slots")
            .update({ ...fallbackUpdates, updated_at: new Date().toISOString() })
            .eq("id", id)

          if (fallbackError) throw fallbackError;

          toast.warning(`Slot updated locally, but formal Brand Linking failed. Run the SQL migration in Supabase to sync the schema.`);
          fetchSlots()
          setSelectedSlot(null)
          return;
        }
        throw error;
      }

      toast.success(`Slot #${slots.find(s => s.id === id)?.slot_number} adjusted.`)
      fetchSlots()
      setSelectedSlot(null)
    } catch (error: any) {
      console.error("Error updating shelf slot:", JSON.stringify(error, null, 2))
      toast.error(error?.message || "terminal rejection: check database connectivity")
    }
  }
  const filteredSlots = slots.filter((slot) => {
    const matchesSearch =
      slot.slot_number.toString().includes(searchTerm) ||
      (slot.occupied_by && slot.occupied_by.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (slot.brands?.business_name && slot.brands.business_name.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesShelfType = shelfTypeFilter === "all" || slot.shelf_type === shelfTypeFilter
    const matchesStatus = statusFilter === "all" || slot.status === statusFilter

    return matchesSearch && matchesShelfType && matchesStatus
  })

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl sm:text-3xl font-black">Shelf Slots Management</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setIsSectionManagerOpen(true)} className="border-black/5 hover:bg-gray-50 font-bold w-full sm:w-auto">
            <Settings className="w-4 h-4 mr-2" />
            Manage Sections
          </Button>
          <Button onClick={() => setIsCreateShelfOpen(true)} className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-bold w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            New Shelf
          </Button>
          <div className="relative flex-1 min-w-[140px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search slots..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <Select value={shelfTypeFilter} onValueChange={setShelfTypeFilter}>
            <SelectTrigger className="w-full sm:w-32 flex-1 min-w-[120px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
              <SelectItem value="eye_level">Eye Level</SelectItem>
              <SelectItem value="top_level">Top Level</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32 flex-1 min-w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Bottom Shelf</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-green-600">
                <span>Available:</span>
                <span className="font-bold">{stats.bottom.available}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>Occupied:</span>
                <span className="font-bold">{stats.bottom.occupied}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Eye Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-green-600">
                <span>Available:</span>
                <span className="font-bold">{stats.eye_level.available}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>Occupied:</span>
                <span className="font-bold">{stats.eye_level.occupied}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Top Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-green-600">
                <span>Available:</span>
                <span className="font-bold">{stats.top_level.available}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>Occupied:</span>
                <span className="font-bold">{stats.top_level.occupied}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total ({stats.total.total} slots)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Occupancy:</span>
                <span className="font-bold text-[#FE7F2D]">
                  {stats.total.total > 0 ? ((stats.total.occupied / stats.total.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Grid Layout by Section */}
      <div className="space-y-16">
        {sections.length === 0 && !loading && (
          <Card className="border-dashed border-2 border-gray-100 bg-gray-50/50">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <LayoutGrid className="w-12 h-12 text-gray-200 mb-4" />
              <h3 className="text-xl font-black text-gray-500 italic">No Infrastructure Registered</h3>
              <p className="text-sm text-gray-400 max-w-xs mb-6 font-medium">Please define your club sections and add physical shelves to start managing slots.</p>
              <Button onClick={() => setIsCreateSectionOpen(true)} className="bg-black text-white font-bold rounded-2xl">Register First Section</Button>
            </CardContent>
          </Card>
        )}

        {sections.map(section => {
          const sectionSlots = filteredSlots.filter(s => s.section_id === section.id)
          if (sectionSlots.length === 0 && searchTerm === "" && shelfTypeFilter === "all" && statusFilter === "all") return null

          const sectionShelves = shelves.filter(sh => sh.section_id === section.id)

          return (
            <section key={section.id} className="space-y-6">
              <div className="flex items-center gap-4 border-b-2 border-[#FE7F2D]/20 pb-2">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-[#010307]">{section.name}</h2>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{section.description || "Active Club Area"}</p>
                </div>
                <Badge variant="outline" className="bg-[#FE7F2D]/5 text-[#FE7F2D] border-[#FE7F2D]/20 h-fit">
                  {sectionSlots.length} Slots
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sectionShelves.map(shelf => {
                  return (
                    <Card key={shelf.id} className={`border-gray-200 shadow-sm overflow-hidden transition-all ${shelf.is_movable ? 'border-dashed border-2 border-orange-200' : ''}`}>
                      <CardHeader className="bg-gray-50/50 py-3 border-b flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                          <Package className="w-4 h-4 text-[#FE7F2D]" />
                          {shelf.name}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{shelf.size}</Badge>
                          {shelf.is_movable && <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs hidden sm:inline-flex">Movable</Badge>}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-2 hover:bg-gray-200"
                            onClick={() => {
                              setEditingShelf(shelf)
                              setIsEditShelfOpen(true)
                            }}
                          >
                            <Settings className="w-3.5 h-3.5 text-gray-500" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-6 gap-2">
                          {sectionSlots
                            .filter(s => s.shelf_id === shelf.id)
                            .sort((a, b) => a.slot_number - b.slot_number)
                            .map(slot => (
                              <SlotSquare
                                key={slot.id}
                                slot={slot}
                                onSelect={() => {
                                  setSelectedSlot(slot)
                                  setUpdateData({
                                    status: slot.status,
                                    brand_id: slot.brand_id || "none",
                                    occupied_by: slot.occupied_by || "",
                                    rent_amount: slot.rent_amount?.toString() || "",
                                    occupied_from: slot.occupied_from || "",
                                    occupied_until: slot.occupied_until || "",
                                    notes: slot.notes || "",
                                    applied_promo_id: slot.applied_promo_id || "none",
                                  })
                                }}
                              />
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          )
        })}

        {/* Fallback for unlinked legacy slots */}
        {filteredSlots.some(s => !s.section_id || !s.shelf_id) && (
          <section className="space-y-6 pt-10 border-t border-dashed border-gray-100">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-gray-400">Legacy / Unassigned Slots</h2>
              <Badge variant="outline" className="animate-pulse">Migration Required</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-50 hover:opacity-100 transition-opacity">
              <Card className="border-gray-200 bg-gray-50/10">
                <CardContent className="p-4">
                  <p className="text-[10px] text-gray-400 mb-4 font-bold italic">Missing Section/Shelf assignment. Link to physical units to restore grouping.</p>
                  <div className="grid grid-cols-6 gap-2">
                    {filteredSlots
                      .filter(s => !s.section_id || !s.shelf_id)
                      .map(slot => (
                        <SlotSquare
                          key={slot.id}
                          slot={slot}
                          onSelect={() => {
                            setSelectedSlot(slot)
                            setUpdateData({
                              status: slot.status,
                              brand_id: slot.brand_id || "none",
                              occupied_by: slot.occupied_by || "",
                              rent_amount: slot.rent_amount?.toString() || "",
                              occupied_from: slot.occupied_from || "",
                              occupied_until: slot.occupied_until || "",
                              notes: slot.notes || "",
                              applied_promo_id: slot.applied_promo_id || "none",
                            })
                          }}
                        />
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}
      </div>

      {/* Management Dialog */}
      <Dialog open={!!selectedSlot} onOpenChange={(open) => !open && setSelectedSlot(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Slot #{selectedSlot?.slot_number}</DialogTitle>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2 text-[#FE7F2D]">Slot Information</h4>
                <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-600">
                  <p><strong>Section:</strong> {selectedSlot.section || "N/A"}</p>
                  <p><strong>Shelf:</strong> {selectedSlot.shelf_name || "N/A"}</p>
                  <p><strong>Slot Number:</strong> #{selectedSlot.slot_number}</p>
                  <p><strong>Tier:</strong> {selectedSlot.shelf_type.replace("_", " ")}</p>
                  <p><strong>Current Status:</strong> {selectedSlot.status}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={updateData.status}
                    onValueChange={(value) => setUpdateData((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="occupied">Occupied</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="rent_amount">Monthly Rent (NPR)</Label>
                  <Input
                    id="rent_amount"
                    type="number"
                    value={updateData.rent_amount}
                    onChange={(e) => setUpdateData((prev) => ({ ...prev, rent_amount: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="brand">Assign Brand (Occupied By)</Label>
                <Select
                  value={updateData.brand_id}
                  onValueChange={(value) => {
                    const brand = brands.find(b => b.id === value)
                    setUpdateData(prev => ({
                      ...prev,
                      brand_id: value,
                      occupied_by: brand ? brand.business_name : prev.occupied_by
                    }))
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned / Freelance</SelectItem>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.business_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!updateData.brand_id || updateData.brand_id === 'none' ? (
                  <div className="mt-2 text-[10px] text-gray-400 font-bold italic">No brand linked. Use the field below for manual reference if needed.</div>
                ) : null}
              </div>

              <div>
                <Label htmlFor="occupied_by">Display Label (Manual Override)</Label>
                <Input
                  id="occupied_by"
                  value={updateData.occupied_by}
                  onChange={(e) => setUpdateData((prev) => ({ ...prev, occupied_by: e.target.value }))}
                  placeholder="Business Name"
                />
              </div>

              <div>
                <Label htmlFor="offer">Active Platform Offer</Label>
                <Select
                  value={updateData.applied_promo_id}
                  onValueChange={(value) => setUpdateData(prev => ({ ...prev, applied_promo_id: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No Active Offer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Offer / Native Price</SelectItem>
                    {offers.map(offer => (
                      <SelectItem key={offer.id} value={offer.id}>
                        {offer.name} ({offer.discount_type === 'percentage' ? `${offer.discount_value}% Off` : `-${offer.discount_value} NPR`})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {updateData.applied_promo_id !== "none" && (
                  <p className="mt-1 text-[10px] text-green-600 font-bold uppercase italic">
                    {offers.find(o => o.id === updateData.applied_promo_id)?.description || "Offer Applied"}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() =>
                    updateSlot(selectedSlot.id, {
                      status: updateData.status as any,
                      brand_id: (updateData.brand_id && updateData.brand_id !== 'none') ? updateData.brand_id : null,
                      applied_promo_id: (updateData.applied_promo_id && updateData.applied_promo_id !== 'none') ? updateData.applied_promo_id : null,
                      occupied_by: updateData.occupied_by || null,
                      rent_amount: updateData.rent_amount ? Number(updateData.rent_amount) : null,
                    })
                  }
                  className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white flex-1"
                >
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setSelectedSlot(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Shelf Dialog */}
      <Dialog open={isCreateShelfOpen} onOpenChange={setIsCreateShelfOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Physical Shelf</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Shelf Name (e.g. Rack A1)</Label>
              <Input value={newShelf.name} onChange={e => setNewShelf({ ...newShelf, name: e.target.value })} placeholder="Shelf Name" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Section</Label>
                <Select value={newShelf.section_id} onValueChange={(v) => setNewShelf({ ...newShelf, section_id: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Size Profile</Label>
                <Select value={newShelf.size} onValueChange={(v: any) => setNewShelf({ ...newShelf, size: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Slots</Label>
                <Input type="number" min={1} value={newShelf.total_slots} onChange={e => setNewShelf({ ...newShelf, total_slots: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <Label>Primary Slot Type</Label>
                <Select value={newShelf.shelf_type} onValueChange={(v: any) => setNewShelf({ ...newShelf, shelf_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed Tier</SelectItem>
                    <SelectItem value="bottom">All Bottom</SelectItem>
                    <SelectItem value="eye_level">All Eye Level</SelectItem>
                    <SelectItem value="top_level">All Top Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 border p-3 rounded-md bg-gray-50">
              <input
                type="checkbox"
                id="is_movable"
                checked={newShelf.is_movable}
                onChange={(e) => setNewShelf({ ...newShelf, is_movable: e.target.checked })}
                className="w-4 h-4 accent-[#FE7F2D]"
              />
              <Label htmlFor="is_movable" className="cursor-pointer font-semibold flex-1">Is this shelf movable?</Label>
              <Badge variant="outline" className="text-xs">Physical Flag</Badge>
            </div>

            <Button onClick={handleCreateShelf} className="w-full bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white">Create Shelf</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Shelf Dialog */}
      <Dialog open={isEditShelfOpen} onOpenChange={setIsEditShelfOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="flex flex-row justify-between items-center pr-8">
            <DialogTitle>Edit Shelf Settings</DialogTitle>
          </DialogHeader>
          {editingShelf && (
            <div className="space-y-4">
              <div>
                <Label>Shelf Name (e.g. Rack A1)</Label>
                <Input value={editingShelf.name} onChange={e => setEditingShelf({ ...editingShelf, name: e.target.value })} placeholder="Shelf Name" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Section</Label>
                  <Select value={editingShelf.section_id} onValueChange={(v) => setEditingShelf({ ...editingShelf, section_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Size Profile</Label>
                  <Select value={editingShelf.size} onValueChange={(v: any) => setEditingShelf({ ...editingShelf, size: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Total Slots (Read Only)</Label>
                  <Input type="number" disabled value={editingShelf.total_slots} className="bg-gray-100" />
                  <p className="text-[10px] text-gray-500 mt-1 italic">Re-create shelf to alter slots length</p>
                </div>
                <div>
                  <Label>Primary Slot Type</Label>
                  <Select value={editingShelf.shelf_type} onValueChange={(v: any) => setEditingShelf({ ...editingShelf, shelf_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mixed">Mixed Tier</SelectItem>
                      <SelectItem value="bottom">All Bottom</SelectItem>
                      <SelectItem value="eye_level">All Eye Level</SelectItem>
                      <SelectItem value="top_level">All Top Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 border p-3 rounded-md bg-gray-50">
                <input
                  type="checkbox"
                  id="edit_is_movable"
                  checked={editingShelf.is_movable}
                  onChange={(e) => setEditingShelf({ ...editingShelf, is_movable: e.target.checked })}
                  className="w-4 h-4 accent-[#FE7F2D]"
                />
                <Label htmlFor="edit_is_movable" className="cursor-pointer font-semibold flex-1">Is this shelf movable?</Label>
                <Badge variant="outline" className="text-xs">Physical Flag</Badge>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpdateShelfConfirm} className="w-full bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white">Save Updates</Button>
                <Button variant="destructive" onClick={handleDeleteShelf} className="w-12 px-0 shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Section Manager Dialog */}
      <Dialog open={isSectionManagerOpen} onOpenChange={setIsSectionManagerOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
          <div className="bg-[#010307] text-white p-8">
            <DialogTitle className="text-2xl font-black italic lowercase tracking-tight">registry: physical sections</DialogTitle>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">active sectors</p>
              {!isCreateSectionOpen && (
                <Button
                  size="sm"
                  onClick={() => setIsCreateSectionOpen(true)}
                  className="bg-[#FE7F2D] hover:bg-black text-white rounded-xl font-bold lowercase text-[10px] h-8 px-4"
                >
                  <Plus className="w-3 h-3 mr-2" /> new sector
                </Button>
              )}
            </div>

            {isCreateSectionOpen && (
              <div className="bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-200 space-y-4 animate-in fade-in slide-in-from-top-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Sector Name"
                    value={newSection.name}
                    onChange={e => setNewSection({ ...newSection, name: e.target.value })}
                    className="bg-white rounded-xl"
                  />
                  <Input
                    placeholder="Short Description"
                    value={newSection.description}
                    onChange={e => setNewSection({ ...newSection, description: e.target.value })}
                    className="bg-white rounded-xl"
                  />
                </div>
                <div className="flex gap-4 items-center">
                  <Label className="text-[10px] uppercase font-black text-gray-400">Sector Tier</Label>
                  <Select
                    value={newSection.section_tier}
                    onValueChange={(v: any) => setNewSection({ ...newSection, section_tier: v })}
                  >
                    <SelectTrigger className="w-40 bg-white rounded-xl h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateSection} className="bg-[#FE7F2D] flex-1 h-10 rounded-xl font-bold">Deploy Sector</Button>
                  <Button variant="ghost" onClick={() => setIsCreateSectionOpen(false)} className="h-10">Cancel</Button>
                </div>
              </div>
            )}

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {sections.map(section => (
                <div key={section.id} className="group p-4 bg-white border border-gray-100 rounded-2xl hover:border-[#FE7F2D]/30 transition-all">
                  {editingSection?.id === section.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editingSection.name}
                        onChange={e => setEditingSection({ ...editingSection, name: e.target.value })}
                        className="h-10 rounded-xl"
                      />
                      <Input
                        value={editingSection.description || ""}
                        onChange={e => setEditingSection({ ...editingSection, description: e.target.value })}
                        className="h-10 rounded-xl"
                      />
                      <div className="flex gap-4 items-center">
                        <Label className="text-[10px] uppercase font-black text-gray-400">Tier</Label>
                        <Select
                          value={editingSection.section_tier}
                          onValueChange={(v: any) => setEditingSection({ ...editingSection, section_tier: v })}
                        >
                          <SelectTrigger className="w-40 bg-white rounded-xl h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleUpdateSection} size="sm" className="bg-black text-white rounded-xl">Save</Button>
                        <Button onClick={() => setEditingSection(null)} size="sm" variant="ghost">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm italic">{section.name}</h4>
                        <Badge variant="outline" className={`text-[8px] font-black uppercase tracking-widest ${section.section_tier === 'premium' ? 'bg-orange-500 text-white border-none' : 'text-gray-400'}`}>
                          {section.section_tier}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium">{section.description || "No description provided."}</p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => setEditingSection(section)} className="h-8 w-8 rounded-lg">
                          <Settings className="w-3.5 h-3.5 text-gray-400" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSection(section.id)} className="h-8 w-8 rounded-lg text-red-100 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button onClick={() => setIsSectionManagerOpen(false)} variant="ghost" className="w-full h-12 rounded-2xl font-bold lowercase italic text-gray-400 underline-offset-4 hover:underline">dismiss registry</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SlotSquare({ slot, onSelect }: { slot: ShelfSlot; onSelect: () => void }) {
  const isExpiring = (date: string | null | undefined) => {
    if (!date) return false
    const d = new Date(date)
    const today = new Date()
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff <= 30 && diff > 0
  }

  return (
    <div
      onClick={onSelect}
      className={`
        aspect-square rounded-md border flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-110 shadow-sm
        ${slot.status === "available" ? "bg-white border-green-200 hover:border-green-500 text-green-700" : ""}
        ${slot.status === "occupied" ? "bg-red-50 border-red-200 hover:border-red-500 text-red-700" : ""}
        ${slot.status === "maintenance" ? "bg-yellow-50 border-yellow-200 hover:border-yellow-500 text-yellow-700" : ""}
        ${isExpiring(slot.occupied_until) ? "ring-2 ring-orange-400 ring-offset-1" : ""}
      `}
      title={`${slot.status}${slot.brands?.business_name ? ` - ${slot.brands.business_name}` : (slot.occupied_by ? ` - ${slot.occupied_by}` : "")}`}
    >
      <span className="text-[10px] font-bold opacity-50">#{slot.slot_number}</span>
      {slot.status === "occupied" && <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1" />}
      {slot.status === "available" && <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1" />}
    </div>
  )
}
