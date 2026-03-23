"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, Search, Filter, LayoutGrid, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase, type ShelfSlot } from "@/lib/supabase"

interface ShelfGridPickerProps {
  shelfTypeLimit?: string // e.g. "bottom", "eye_level", "top_level"
  onSelect: (slot: ShelfSlot) => void
  selectedSlotId?: string
}

export function ShelfGridPicker({ shelfTypeLimit, onSelect, selectedSlotId }: ShelfGridPickerProps) {
  const [slots, setSlots] = useState<ShelfSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("available") // Default to available for pickers

  useEffect(() => {
    fetchSlots()
  }, [])

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

  const filteredSlots = slots.filter((slot) => {
    const matchesSearch =
      slot.slot_number.toString().includes(searchTerm) ||
      (slot.occupied_by && slot.occupied_by.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesShelfType = !shelfTypeLimit || slot.shelf_type === shelfTypeLimit
    const matchesStatus = statusFilter === "all" || slot.status === statusFilter

    return matchesSearch && matchesShelfType && matchesStatus
  })

  const sections = Array.from(new Set(slots.map(s => s.section || "Unassigned"))).sort()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE7F2D]"></div>
      </div>
    )
  }

  const matchesAtLeastOne = filteredSlots.length > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 mb-4 p-2 bg-gray-50/50 rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search slot #, brand or shelf..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-10 text-xs shadow-none border-gray-200"
          />
        </div>
        <div className="flex gap-2">
           <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-10 text-xs bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status (Recommended)</SelectItem>
              <SelectItem value="available">Only Available</SelectItem>
              <SelectItem value="occupied">Already Occupied</SelectItem>
            </SelectContent>
          </Select>
          <div className="bg-[#FE7F2D] text-white px-3 py-2 rounded-md font-black text-xs flex items-center gap-2">
             <LayoutGrid className="w-3.5 h-3.5" />
             {filteredSlots.length} Slots Shown
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {sections.map(sectionName => {
          const sectionSlotsData = filteredSlots.filter(s => (s.section || "Unassigned") === sectionName)
          if (sectionSlotsData.length === 0) return null
          
          const shelves = Array.from(new Set(sectionSlotsData.map(s => s.shelf_name))).sort((a, b) => {
            return (a || "").localeCompare(b || "", undefined, { numeric: true, sensitivity: 'base' })
          })

          return (
            <div key={sectionName} className="space-y-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter border-l-4 border-[#FE7F2D] pl-3 leading-none">{sectionName}</h3>
                <div className="h-[1px] flex-1 bg-gray-100"></div>
                <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">{sectionSlotsData.length} Slots</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shelves.map(shelfName => (
                  <Card key={shelfName as string} className="border-gray-100 shadow-sm border p-0 overflow-hidden bg-white">
                    <CardHeader className="bg-gray-50/50 py-2.5 px-3 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-black text-gray-700 uppercase tracking-tight">
                          <Package className="w-3.5 h-3.5 text-[#FE7F2D]" />
                          {(shelfName as string) || "Unassigned Shelf"}
                        </div>
                        <span className="text-[9px] font-bold text-[#FE7F2D] bg-[#FE7F2D]/10 px-1.5 py-0.5 rounded leading-none">
                           {sectionSlotsData.filter(s => s.shelf_name === shelfName).length} slots
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="grid grid-cols-6 sm:grid-cols-6 gap-2">
                        {sectionSlotsData
                          .filter(s => s.shelf_name === shelfName)
                          .sort((a, b) => a.slot_number - b.slot_number)
                          .map(slot => (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={slot.status === "occupied" && selectedSlotId !== slot.id}
                              onClick={() => onSelect(slot)}
                              className={`
                                aspect-square rounded-lg border-2 flex flex-col items-center justify-center transition-all text-[11px] font-black
                                ${slot.status === "available" ? "bg-white border-green-50 hover:border-green-400 text-green-700 shadow-sm" : ""}
                                ${slot.status === "occupied" ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed grayscale" : ""}
                                ${selectedSlotId === slot.id ? "bg-[#FE7F2D] border-[#FE7F2D] text-white ring-4 ring-[#FE7F2D]/20 -translate-y-1 shadow-xl z-20" : ""}
                              `}
                              title={slot.status === "occupied" ? `Occupied by ${slot.occupied_by}` : `Slot #${slot.slot_number}`}
                            >
                              <span className="opacity-50 text-[9px]">#</span>
                              <span>{slot.slot_number}</span>
                              {slot.status === "occupied" && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-gray-400 rounded-full" />}
                            </button>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
        {!matchesAtLeastOne && (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
             <AlertCircle className="w-12 h-12 text-gray-200 mb-4" />
             <p className="text-gray-500 font-bold text-lg">No slots available for this filter.</p>
             <p className="text-gray-400 text-sm">Try changing the search or status filter.</p>
             <Button variant="ghost" onClick={() => {setSearchTerm(""); setStatusFilter("all")}} className="mt-4 text-[#FE7F2D] font-bold">Clear All Filters</Button>
          </div>
        )}
      </div>
    </div>
  )
}
