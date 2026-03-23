"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Package, Search, Filter, Calendar, User, AlertCircle, Settings } from "lucide-react"
import { supabase, type ShelfSlot } from "@/lib/supabase"

interface SlotStats {
  total: number
  available: number
  occupied: number
  maintenance: number
}

export function ShelfSlotsManagement() {
  const [slots, setSlots] = useState<ShelfSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [shelfTypeFilter, setShelfTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedSlot, setSelectedSlot] = useState<ShelfSlot | null>(null)
  const [updateData, setUpdateData] = useState({
    status: "",
    occupied_by: "",
    rent_amount: "",
    occupied_from: "",
    occupied_until: "",
    notes: "",
  })

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
      const { data, error } = await supabase.from("shelf_slots").select("*").order("slot_number", { ascending: true })

      if (error) throw error
      setSlots(data || [])
    } catch (error) {
      console.error("Error fetching shelf slots:", error)
    } finally {
      setLoading(false)
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

      if (error) throw error

      fetchSlots()
      setSelectedSlot(null)
      setUpdateData({
        status: "",
        occupied_by: "",
        rent_amount: "",
        occupied_from: "",
        occupied_until: "",
        notes: "",
      })
    } catch (error) {
      console.error("Error updating shelf slot:", error)
    }
  }

  const filteredSlots = slots.filter((slot) => {
    const matchesSearch =
      slot.slot_number.toString().includes(searchTerm) ||
      (slot.occupied_by && slot.occupied_by.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesShelfType = shelfTypeFilter === "all" || slot.shelf_type === shelfTypeFilter
    const matchesStatus = statusFilter === "all" || slot.status === statusFilter

    return matchesSearch && matchesShelfType && matchesStatus
  })

  const SECTIONS = ["Cafe Section", "Room One", "Room Two", "Corridor Wall"]

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
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <h1 className="text-3xl font-black">Shelf Slots Management</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search slots..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-48"
            />
          </div>
          <Select value={shelfTypeFilter} onValueChange={setShelfTypeFilter}>
            <SelectTrigger className="w-32">
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
            <SelectTrigger className="w-32">
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
        {SECTIONS.map(sectionName => {
          const sectionSlots = filteredSlots.filter(s => s.section === sectionName)
          if (sectionSlots.length === 0 && searchTerm === "" && shelfTypeFilter === "all" && statusFilter === "all") return null
          
          // Group by shelf_name within section
          const shelves = Array.from(new Set(sectionSlots.map(s => s.shelf_name))).sort((a, b) => {
            return (a || "").localeCompare(b || "", undefined, { numeric: true, sensitivity: 'base' })
          })

          return (
            <section key={sectionName} className="space-y-6">
              <div className="flex items-center gap-4 border-b-2 border-[#FE7F2D]/20 pb-2">
                <h2 className="text-2xl font-black text-[#010307]">{sectionName}</h2>
                <Badge variant="outline" className="bg-[#FE7F2D]/5 text-[#FE7F2D] border-[#FE7F2D]/20">
                  {sectionSlots.length} Slots
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {shelves.map(shelfName => (
                  <Card key={shelfName as string} className="border-gray-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gray-50/50 py-3 border-b">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Package className="w-4 h-4 text-[#FE7F2D]" />
                        {(shelfName as string) || "Unassigned Shelf"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-6 gap-2">
                        {sectionSlots
                          .filter(s => s.shelf_name === shelfName)
                          .sort((a, b) => a.slot_number - b.slot_number)
                          .map(slot => (
                            <SlotSquare 
                              key={slot.id} 
                              slot={slot} 
                              onSelect={() => {
                                setSelectedSlot(slot)
                                setUpdateData({
                                  status: slot.status,
                                  occupied_by: slot.occupied_by || "",
                                  rent_amount: slot.rent_amount?.toString() || "",
                                  occupied_from: slot.occupied_from || "",
                                  occupied_until: slot.occupied_until || "",
                                  notes: "",
                                })
                              }} 
                            />
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )
        })}
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
                <Label htmlFor="occupied_by">Occupied By</Label>
                <Input
                  id="occupied_by"
                  value={updateData.occupied_by}
                  onChange={(e) => setUpdateData((prev) => ({ ...prev, occupied_by: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() =>
                    updateSlot(selectedSlot.id, {
                      status: updateData.status as "available" | "occupied" | "maintenance",
                      occupied_by: updateData.occupied_by || undefined,
                      rent_amount: updateData.rent_amount ? Number.parseFloat(updateData.rent_amount) : undefined,
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
      title={`${slot.status}${slot.occupied_by ? ` - ${slot.occupied_by}` : ""}`}
    >
      <span className="text-[10px] font-bold opacity-50">#{slot.slot_number}</span>
      {slot.status === "occupied" && <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1" />}
      {slot.status === "available" && <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1" />}
    </div>
  )
}
