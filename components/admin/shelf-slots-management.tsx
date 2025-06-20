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
    const bottomSlots = slots.filter((slot) => slot.shelf_type === "bottom")
    const eyeLevelSlots = slots.filter((slot) => slot.shelf_type === "eye_level")
    const topLevelSlots = slots.filter((slot) => slot.shelf_type === "top_level")

    const calculateSlotStats = (slotArray: ShelfSlot[]): SlotStats => ({
      total: slotArray.length,
      available: slotArray.filter((s) => s.status === "available").length,
      occupied: slotArray.filter((s) => s.status === "occupied").length,
      maintenance: slotArray.filter((s) => s.status === "maintenance").length,
    })

    setStats({
      bottom: calculateSlotStats(bottomSlots),
      eye_level: calculateSlotStats(eyeLevelSlots),
      top_level: calculateSlotStats(topLevelSlots),
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

      // Refresh the list
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Available
          </Badge>
        )
      case "occupied":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Occupied
          </Badge>
        )
      case "maintenance":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Maintenance
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getShelfTypeBadge = (shelfType: string) => {
    switch (shelfType) {
      case "bottom":
        return <Badge className="bg-blue-100 text-blue-800">Bottom Shelf</Badge>
      case "eye_level":
        return <Badge className="bg-orange-100 text-orange-800">Eye Level</Badge>
      case "top_level":
        return <Badge className="bg-purple-100 text-purple-800">Top Level</Badge>
      default:
        return <Badge>Unknown</Badge>
    }
  }

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false
    const expiry = new Date(expiryDate)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0
  }

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false
    const expiry = new Date(expiryDate)
    const today = new Date()
    return expiry < today
  }

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
            <CardTitle className="text-sm font-medium text-gray-600">Bottom Shelf (1-36)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Available:</span>
                <span className="font-bold text-green-600">{stats.bottom.available}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Occupied:</span>
                <span className="font-bold text-red-600">{stats.bottom.occupied}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Maintenance:</span>
                <span className="font-bold text-yellow-600">{stats.bottom.maintenance}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Eye Level (37-72)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Available:</span>
                <span className="font-bold text-green-600">{stats.eye_level.available}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Occupied:</span>
                <span className="font-bold text-red-600">{stats.eye_level.occupied}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Maintenance:</span>
                <span className="font-bold text-yellow-600">{stats.eye_level.maintenance}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Top Level (73-108)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Available:</span>
                <span className="font-bold text-green-600">{stats.top_level.available}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Occupied:</span>
                <span className="font-bold text-red-600">{stats.top_level.occupied}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Maintenance:</span>
                <span className="font-bold text-yellow-600">{stats.top_level.maintenance}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total (108 slots)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Available:</span>
                <span className="font-bold text-green-600">{stats.total.available}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Occupied:</span>
                <span className="font-bold text-red-600">{stats.total.occupied}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Occupancy:</span>
                <span className="font-bold text-[#FE7F2D]">
                  {((stats.total.occupied / stats.total.total) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Slots Grid */}
      <div className="grid gap-4">
        {filteredSlots.map((slot) => (
          <Card key={slot.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-[#FE7F2D]" />
                      <h3 className="font-bold text-lg">Slot #{slot.slot_number}</h3>
                    </div>
                    {getShelfTypeBadge(slot.shelf_type)}
                    {getStatusBadge(slot.status)}
                    {slot.occupied_until && isExpiringSoon(slot.occupied_until) && (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Expiring Soon
                      </Badge>
                    )}
                    {slot.occupied_until && isExpired(slot.occupied_until) && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Expired
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {slot.occupied_by && (
                      <p className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <strong>Occupied by:</strong> {slot.occupied_by}
                      </p>
                    )}
                    {slot.rent_amount && (
                      <p>
                        <strong>Rent:</strong> NPR {slot.rent_amount}/month
                      </p>
                    )}
                    {slot.occupied_from && (
                      <p className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <strong>From:</strong> {new Date(slot.occupied_from).toLocaleDateString()}
                      </p>
                    )}
                    {slot.occupied_until && (
                      <p className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <strong>Until:</strong> {new Date(slot.occupied_until).toLocaleDateString()}
                        {isExpiringSoon(slot.occupied_until) && (
                          <span className="text-orange-600 text-xs ml-1">
                            (
                            {Math.ceil(
                              (new Date(slot.occupied_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                            )}{" "}
                            days left)
                          </span>
                        )}
                      </p>
                    )}
                    <p>
                      <strong>Last Updated:</strong> {new Date(slot.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="ml-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
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
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Manage
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Manage Slot #{selectedSlot?.slot_number}</DialogTitle>
                      </DialogHeader>
                      {selectedSlot && (
                        <div className="space-y-6">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-2">Slot Information</h4>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>
                                <strong>Slot Number:</strong> #{selectedSlot.slot_number}
                              </p>
                              <p>
                                <strong>Shelf Type:</strong> {selectedSlot.shelf_type.replace("_", " ")}
                              </p>
                              <p>
                                <strong>Current Status:</strong> {selectedSlot.status}
                              </p>
                              <p>
                                <strong>Created:</strong> {new Date(selectedSlot.created_at).toLocaleDateString()}
                              </p>
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
                                placeholder="1000"
                                value={updateData.rent_amount}
                                onChange={(e) => setUpdateData((prev) => ({ ...prev, rent_amount: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="occupied_by">Occupied By</Label>
                            <Input
                              id="occupied_by"
                              placeholder="Business/Brand name"
                              value={updateData.occupied_by}
                              onChange={(e) => setUpdateData((prev) => ({ ...prev, occupied_by: e.target.value }))}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="occupied_from">Occupied From</Label>
                              <Input
                                id="occupied_from"
                                type="date"
                                value={updateData.occupied_from}
                                onChange={(e) => setUpdateData((prev) => ({ ...prev, occupied_from: e.target.value }))}
                              />
                            </div>

                            <div>
                              <Label htmlFor="occupied_until">Occupied Until</Label>
                              <Input
                                id="occupied_until"
                                type="date"
                                value={updateData.occupied_until}
                                onChange={(e) => setUpdateData((prev) => ({ ...prev, occupied_until: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                              id="notes"
                              placeholder="Add notes about this slot..."
                              value={updateData.notes}
                              onChange={(e) => setUpdateData((prev) => ({ ...prev, notes: e.target.value }))}
                              rows={3}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() =>
                                updateSlot(selectedSlot.id, {
                                  status: updateData.status as "available" | "occupied" | "maintenance",
                                  occupied_by: updateData.occupied_by || null,
                                  rent_amount: updateData.rent_amount
                                    ? Number.parseFloat(updateData.rent_amount)
                                    : null,
                                  occupied_from: updateData.occupied_from || null,
                                  occupied_until: updateData.occupied_until || null,
                                })
                              }
                              className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white"
                            >
                              Update Slot
                            </Button>
                            {updateData.status === "available" && (
                              <Button
                                onClick={() =>
                                  updateSlot(selectedSlot.id, {
                                    status: "available",
                                    occupied_by: null,
                                    rent_amount: null,
                                    occupied_from: null,
                                    occupied_until: null,
                                  })
                                }
                                variant="outline"
                              >
                                Clear Occupancy
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSlots.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No shelf slots found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
