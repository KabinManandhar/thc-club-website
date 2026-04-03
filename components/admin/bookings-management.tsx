"use client"

import { useState, useEffect } from "react"
import { supabase, type ShelfBooking } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { CheckCircle2, XCircle, Clock, Package, MapPin } from "lucide-react"
import { ShelfGridPicker } from "./shelf-grid-picker"
import { type ShelfSlot } from "@/lib/supabase"
import { toast } from "sonner"

const SHELF_LABELS = { bottom: "Bottom Level", eye_level: "Eye Level", top_level: "Top Level" }
const DURATION_LABELS = { quarterly: "Quarterly (3 mo)", half_yearly: "Half-Yearly (6 mo)", yearly: "Yearly (12 mo)" }

export function BookingsManagement() {
  const [bookings, setBookings] = useState<ShelfBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("pending")
  const [actionBooking, setActionBooking] = useState<ShelfBooking | null>(null)
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null)
  const [adminNotes, setAdminNotes] = useState("")
  const [slotNumber, setSlotNumber] = useState("")
  const [selectedSlot, setSelectedSlot] = useState<ShelfSlot | null>(null)
  const [selectedBundleSlots, setSelectedBundleSlots] = useState<ShelfSlot[]>([])
  const [saving, setSaving] = useState(false)

  const fetchBookings = async () => {
    setLoading(true)
    let query = supabase
      .from("shelf_bookings")
      .select("*, brands(business_name, email, phone), shelf_bundles(name)")
      .order("created_at", { ascending: false })
    if (filterStatus !== "all") query = query.eq("status", filterStatus)
    const { data } = await query
    setBookings(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchBookings() }, [filterStatus])

  const openAction = (booking: ShelfBooking, type: "approve" | "reject") => {
    setActionBooking(booking)
    setActionType(type)
    setAdminNotes("")
    setSlotNumber("")
    setSelectedSlot(null)
    setSelectedBundleSlots([])
  }

  const handleAction = async () => {
    if (!actionBooking || !actionType) return
    if (actionType === "approve" && !slotNumber) return
    setSaving(true)

    const startDate = new Date()
    const months = actionBooking.duration === "quarterly" ? 3 : actionBooking.duration === "half_yearly" ? 6 : 12
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + months)

    if (actionType === "approve") {
      const slotsToProcess = actionBooking.bundle_id ? selectedBundleSlots : (selectedSlot ? [selectedSlot] : [])
      if (slotsToProcess.length === 0) {
        toast.error("Please select at least one slot.")
        setSaving(false)
        return
      }

      // Update booking
      await supabase.from("shelf_bookings").update({
        status: "active",
        slot_number: slotsToProcess[0].slot_number, // Store primary slot
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        admin_notes: adminNotes + (actionBooking.bundle_id ? ` [Multiple slots assigned: ${slotsToProcess.map(s => s.slot_number).join(', ')}]` : ''),
      }).eq("id", actionBooking.id)

      // Update brand onboarding status
      await supabase.from("brands").update({ onboarding_status: "active" }).eq("id", actionBooking.brand_id)

      // Update ALL selected shelf slots
      for (const slot of slotsToProcess) {
        await supabase
          .from("shelf_slots")
          .update({
            status: "occupied",
            brand_id: actionBooking.brand_id,
            occupied_by: (actionBooking.brands as any)?.business_name || "",
            booking_id: actionBooking.id,
            rent_amount: actionBooking.monthly_rent / (slotsToProcess.length || 1),
            occupied_from: startDate.toISOString().split("T")[0],
            occupied_until: endDate.toISOString().split("T")[0],
          })
          .eq("id", slot.id)
      }
    } else {
      await supabase.from("shelf_bookings").update({
        status: "rejected",
        admin_notes: adminNotes,
      }).eq("id", actionBooking.id)

      await supabase.from("brands").update({ onboarding_status: "rejected" }).eq("id", actionBooking.brand_id)
    }

    setSaving(false)
    setActionBooking(null)
    setActionType(null)
    fetchBookings()
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case "active": return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>
      case "rejected": return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      case "expired": return <Badge variant="outline">Expired</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Shelf Booking Requests</h2>
          <p className="text-gray-600">Approve or reject brand applications for shelf slots.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["pending", "active", "rejected", "all"].map((s) => (
            <Button
              key={s}
              variant={filterStatus === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(s)}
              className={filterStatus === s ? "bg-[#010307] text-white" : ""}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="table-responsive">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow className="whitespace-nowrap">
                  <TableHead className="px-4">Brand</TableHead>
                  <TableHead>Shelf Request</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-gray-400">Loading...</TableCell>
                  </TableRow>
                ) : bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <Package className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-400 text-sm">No {filterStatus === "all" ? "" : filterStatus} bookings found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="px-4 whitespace-nowrap">
                        <div className="font-medium">{(b.brands as any)?.business_name}</div>
                        <div className="text-xs text-gray-500">{(b.brands as any)?.email}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm">
                          {b.bundle_id ? (
                            <span className="font-bold text-[#FE7F2D]">Bundle: {(b as any).shelf_bundles?.name || "Package"}</span>
                          ) : (
                            SHELF_LABELS[b.shelf_type]
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{DURATION_LABELS[b.duration]}</div>
                        {b.slot_number && <div className="text-xs text-[#FE7F2D]">Slot #{b.slot_number}</div>}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        <div className="flex flex-col items-end">
                           <span className="text-sm">NPR {b.total_amount.toLocaleString()}</span>
                           {b.discount_percentage && (
                             <span className="text-[10px] text-green-600 font-bold">
                               -{b.discount_percentage}% bundle save
                             </span>
                           )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{statusBadge(b.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                        {new Date(b.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right px-4 whitespace-nowrap">
                        {b.status === "pending" && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => openAction(b, "approve")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => openAction(b, "reject")}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!actionBooking} onOpenChange={(open) => !open && setActionBooking(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={actionType === "approve" ? "text-green-700" : "text-red-700"}>
              {actionType === "approve" ? "Approve Booking" : "Reject Booking"}
            </DialogTitle>
          </DialogHeader>
          {actionBooking && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <p><strong>Brand:</strong> {(actionBooking!.brands as any)?.business_name}</p>
                <p><strong>Shelf:</strong> {actionBooking!.bundle_id ? (
                  <span className="text-[#FE7F2D] font-bold">Bundle: {(actionBooking! as any).shelf_bundles?.name || "Package"}</span>
                ) : (
                  SHELF_LABELS[actionBooking!.shelf_type]
                )} — {DURATION_LABELS[actionBooking!.duration]}</p>
                <div className="flex justify-between items-center py-1 mt-1 border-t border-gray-100">
                  <span className="text-gray-500">Subtotal:</span>
                  <span className={actionBooking!.original_total ? "line-through text-gray-400" : "font-bold"}>
                    NPR {actionBooking!.original_total?.toLocaleString() || (actionBooking!.total_amount - 800).toLocaleString()}
                  </span>
                </div>
                {actionBooking!.discount_percentage && (
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-green-600 font-bold">Bundle Discount ({actionBooking!.discount_percentage}%):</span>
                    <span className="text-green-600 font-bold">
                      -NPR {Math.round(actionBooking!.original_total! * (actionBooking!.discount_percentage / 100)).toLocaleString()}
                    </span>
                  </div>
                )}
                <p><strong>Registration Fee:</strong> NPR 800</p>
                <p className="text-lg font-black text-[#FE7F2D] pt-1"><strong>Final Total:</strong> NPR {actionBooking!.total_amount.toLocaleString()}</p>
              </div>

              {actionType === "approve" && (
                <div className="space-y-4">
                  <div>
                    <Label className="flex items-center gap-2 mb-2 font-black text-gray-900 uppercase tracking-tighter text-sm">
                      <MapPin className="w-4 h-4 text-[#FE7F2D]" />
                      Select Shelf Slot *
                    </Label>
                    <div className="bg-white border rounded-xl p-4 shadow-sm">
                      <ShelfGridPicker
                        shelfTypeLimit={actionBooking!.bundle_id ? undefined : actionBooking!.shelf_type}
                        onSelect={(slot) => {
                          if (actionBooking!.bundle_id) {
                            setSelectedBundleSlots(prev => {
                              const exists = prev.find(s => s.id === slot.id)
                              if (exists) return prev.filter(s => s.id !== slot.id)
                              return [...prev, slot]
                            })
                            // We use slotNumber to satisfy the button's validation
                            setSlotNumber("multiple") 
                          } else {
                            setSelectedSlot(slot)
                            setSlotNumber(slot.slot_number.toString())
                          }
                        }}
                        selectedSlotId={selectedSlot?.id}
                        selectedSlotIds={selectedBundleSlots.map(s => s.id)}
                      />
                    </div>
                  </div>
                  {actionBooking!.bundle_id ? (
                    <div className="bg-[#FE7F2D]/5 border border-[#FE7F2D]/20 rounded-lg p-4 animate-in slide-in-from-top-2">
                       <div className="flex justify-between items-center mb-3">
                          <span className="font-black text-[#FE7F2D] uppercase tracking-widest text-[10px]">Bundle slots assigned: {selectedBundleSlots.length}</span>
                       </div>
                       <div className="flex flex-wrap gap-2">
                          {selectedBundleSlots.map(slot => (
                            <Badge key={slot.id} className="bg-white border-[#FE7F2D]/30 text-[#FE7F2D] font-black text-[10px] lowercase py-1 px-3">
                               {slot.section} — #{slot.slot_number}
                            </Badge>
                          ))}
                          {selectedBundleSlots.length === 0 && (
                            <span className="text-[10px] text-gray-400 font-bold lowercase italic">tap slots above to assign to this bundle...</span>
                          )}
                       </div>
                    </div>
                  ) : selectedSlot && (
                    <div className="bg-[#FE7F2D]/5 border border-[#FE7F2D]/20 rounded-lg p-3 flex justify-between items-center text-xs animate-in slide-in-from-top-2">
                       <div className="flex flex-col gap-0.5">
                          <span className="font-black text-[#FE7F2D] uppercase tracking-widest text-[10px]">Active Selection</span>
                          <span className="font-bold text-gray-900">{selectedSlot!.section} — {selectedSlot!.shelf_name}</span>
                       </div>
                       <div className="text-xl font-black text-[#FE7F2D]">
                          #{selectedSlot.slot_number}
                       </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label>Admin Notes (optional)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionBooking(null)}>Cancel</Button>
            <Button
              onClick={handleAction}
              disabled={saving || (actionType === "approve" && !slotNumber)}
              className={actionType === "approve" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
            >
              {saving ? "Processing..." : actionType === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
