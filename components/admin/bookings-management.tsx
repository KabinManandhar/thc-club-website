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
import { CheckCircle2, XCircle, Clock, Package, MapPin, RefreshCw, Phone, Mail, Inbox } from "lucide-react"
import { ShelfGridPicker } from "./shelf-grid-picker"
import { type ShelfSlot } from "@/lib/supabase"
import { toast } from "sonner"

const SHELF_LABELS = { bottom: "Bottom Level", eye_level: "Eye Level", top_level: "Top Level" }
const DURATION_LABELS = { quarterly: "Quarterly (3 mo)", half_yearly: "Half-Yearly (6 mo)", yearly: "Yearly (12 mo)" }
const PAYMENT_LABELS: Record<string, string> = { bank_transfer: "Bank transfer", qr_payment: "QR in person", cash: "Cash at club", card: "Card", other: "Other" }
const NEW_WINDOW_MS = 48 * 60 * 60 * 1000

function timeAgo(dateStr: string) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 60) return `${Math.max(mins, 0)}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

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
    const { data, error } = await supabase
      .from("shelf_bookings")
      .select("*, brands(business_name, email, phone), shelf_bundles(name, eye_level_count, top_level_count, bottom_level_count)")
      .order("created_at", { ascending: false })
    if (error) toast.error(`Could not load bookings: ${error.message}`)
    setBookings(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchBookings() }, [])

  const counts = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1
    return acc
  }, { all: bookings.length })
  const visible = filterStatus === "all" ? bookings : bookings.filter((b) => b.status === filterStatus)
  const isNew = (b: ShelfBooking) => b.status === "pending" && Date.now() - new Date(b.created_at).getTime() < NEW_WINDOW_MS
  const newCount = bookings.filter(isNew).length

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
        toast.error("Please select at least one shelf slot.")
        setSaving(false)
        return
      }

      const { error } = await supabase.rpc("admin_process_booking", {
        p_booking_id: actionBooking.id,
        p_action: "approve",
        p_slot_number: slotsToProcess[0].slot_number,
        p_start_date: startDate.toISOString().split("T")[0],
        p_end_date: endDate.toISOString().split("T")[0],
        p_admin_notes: adminNotes + (actionBooking.bundle_id ? ` [Multiple shelf slots assigned: ${slotsToProcess.map(s => s.slot_number).join(', ')}]` : ''),
        p_brand_id: actionBooking.brand_id,
        p_slot_ids: slotsToProcess.map(s => s.id),
        p_monthly_rent: actionBooking.monthly_rent
      })

      if (error) {
        toast.error(error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.rpc("admin_process_booking", {
        p_booking_id: actionBooking.id,
        p_action: "reject",
        p_slot_number: null,
        p_start_date: null,
        p_end_date: null,
        p_admin_notes: adminNotes,
        p_brand_id: actionBooking.brand_id,
        p_slot_ids: [],
        p_monthly_rent: 0
      })

      if (error) {
        toast.error(error.message)
        setSaving(false)
        return
      }
    }

    toast.success(actionType === "approve" ? "Booking approved and shelf slot assigned." : "Booking rejected.")
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
          <h2 className="text-2xl font-bold">Shelf Slot Booking Requests</h2>
          <p className="text-gray-600">Bookings submitted by brands from their portal. Approve to assign a shelf slot.</p>
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
              <span className={`ml-1.5 rounded-full px-1.5 text-[10px] font-black ${s === "pending" && (counts.pending || 0) > 0 ? "bg-[#FE7F2D] text-white" : "bg-black/5"}`}>
                {counts[s] || 0}
              </span>
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={fetchBookings} disabled={loading} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {newCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[#FE7F2D]/30 bg-[#FE7F2D]/5 px-4 py-3">
          <Inbox className="w-5 h-5 text-[#FE7F2D] shrink-0" />
          <p className="text-sm font-bold text-[#010307]">
            {newCount} new booking request{newCount > 1 ? "s" : ""} in the last 48 hours waiting for review.
          </p>
          {filterStatus !== "pending" && (
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => setFilterStatus("pending")}>Show</Button>
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="table-responsive">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow className="whitespace-nowrap">
                  <TableHead className="px-4">Brand</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Requested shelf slot</TableHead>
                  <TableHead>Term &amp; payment</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-gray-400">Loading...</TableCell>
                  </TableRow>
                ) : visible.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <Package className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-400 text-sm">No {filterStatus === "all" ? "" : filterStatus} bookings found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((b) => {
                    const brand = b.brands as any
                    const bundle = (b as any).shelf_bundles
                    const fresh = isNew(b)
                    return (
                      <TableRow key={b.id} className={`align-top ${fresh ? "bg-[#FE7F2D]/[0.04]" : ""}`}>
                        <TableCell className="px-4 min-w-[200px]">
                          <div className="flex items-center gap-2 font-semibold">
                            {brand?.business_name || "Unknown brand"}
                            {fresh && <Badge className="bg-[#FE7F2D] text-white text-[9px] uppercase tracking-wider">New</Badge>}
                          </div>
                          {brand?.email && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><Mail className="w-3 h-3" />{brand.email}</div>
                          )}
                          {brand?.phone && (
                            <div className="flex items-center gap-1 text-xs text-gray-500"><Phone className="w-3 h-3" />{brand.phone}</div>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-sm font-bold">
                            <MapPin className="w-3.5 h-3.5 text-[#FE7F2D]" />
                            {b.section || <span className="font-normal text-gray-400">Not specified</span>}
                          </div>
                          {b.section_tier && (
                            <Badge variant="outline" className={`mt-1 text-[9px] uppercase ${b.section_tier === "premium" ? "border-[#FE7F2D]/40 text-[#FE7F2D]" : ""}`}>
                              {b.section_tier} zone
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[220px]">
                          <div className="text-sm font-medium">
                            {b.bundle_id ? (
                              <span className="font-bold text-[#FE7F2D]">Bundle: {bundle?.name || "Package"}</span>
                            ) : (
                              SHELF_LABELS[b.shelf_type] || b.shelf_type
                            )}
                          </div>
                          {b.bundle_id && bundle && (
                            <div className="text-xs text-gray-500 mt-1">
                              {bundle.eye_level_count || 0} eye · {bundle.top_level_count || 0} top · {bundle.bottom_level_count || 0} bottom
                            </div>
                          )}
                          {b.slot_number && <div className="text-xs text-[#FE7F2D] mt-1">Assigned shelf slot #{b.slot_number}</div>}
                          {b.admin_notes && <div className="text-[11px] text-gray-400 mt-1 max-w-xs whitespace-normal">{b.admin_notes}</div>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-sm">{DURATION_LABELS[b.duration] || b.duration}</div>
                          <div className="text-xs text-gray-500">{b.payment_method ? PAYMENT_LABELS[b.payment_method] || b.payment_method : "Payment: not chosen"}</div>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="text-sm font-semibold">NPR {(b.total_amount || 0).toLocaleString()}</div>
                          <div className="text-xs text-gray-500">NPR {Math.round(b.monthly_rent || 0).toLocaleString()}/mo</div>
                          {b.discount_percentage ? (
                            <div className="text-[10px] text-green-600 font-bold">-{b.discount_percentage}% bundle save</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          <div>{new Date(b.created_at).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{timeAgo(b.created_at)}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{statusBadge(b.status)}</TableCell>
                        <TableCell className="text-right px-4 whitespace-nowrap">
                          {b.status === "pending" && (
                            <div className="flex gap-2 justify-end">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => openAction(b, "approve")}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => openAction(b, "reject")}>
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
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
                <p><strong>Requested section:</strong> {actionBooking!.section ? `${actionBooking!.section}${actionBooking!.section_tier ? ` (${actionBooking!.section_tier})` : ""}` : "Not specified"}</p>
                <p><strong>Shelf slot:</strong> {actionBooking!.bundle_id ? (
                  <span className="text-[#FE7F2D] font-bold">Bundle: {(actionBooking! as any).shelf_bundles?.name || "Package"}</span>
                ) : (
                  SHELF_LABELS[actionBooking!.shelf_type]
                )} — {DURATION_LABELS[actionBooking!.duration]}</p>
                
                {actionBooking!.bundle_id && (actionBooking! as any).shelf_bundles && (
                  <div className="mt-2 p-3 bg-white border-2 border-[#FE7F2D]/20 rounded-2xl shadow-sm">
                    <p className="text-[10px] font-black uppercase text-[#FE7F2D] mb-2 tracking-widest flex items-center gap-2">
                       <Package className="w-3 h-3" />
                       Bundle Requirements:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                       <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 flex flex-col items-center">
                          <span className="text-[10px] font-black text-gray-400 uppercase">Eye</span>
                          <span className="text-lg font-black text-[#FE7F2D]">{(actionBooking! as any).shelf_bundles.eye_level_count || 0}</span>
                       </div>
                       <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 flex flex-col items-center">
                          <span className="text-[10px] font-black text-gray-400 uppercase">Top</span>
                          <span className="text-lg font-black text-blue-500">{(actionBooking! as any).shelf_bundles.top_level_count || 0}</span>
                       </div>
                       <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 flex flex-col items-center">
                          <span className="text-[10px] font-black text-gray-400 uppercase">Bottom</span>
                          <span className="text-lg font-black text-gray-700">{(actionBooking! as any).shelf_bundles.bottom_level_count || 0}</span>
                       </div>
                    </div>
                  </div>
                )}
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
                        preferredSection={actionBooking!.section}
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
                          <span className="font-black text-[#FE7F2D] uppercase tracking-widest text-[10px]">
                            Selected shelf slots: {selectedBundleSlots.length} / {((actionBooking! as any).shelf_bundles.eye_level_count || 0) + ((actionBooking! as any).shelf_bundles.top_level_count || 0) + ((actionBooking! as any).shelf_bundles.bottom_level_count || 0)}
                          </span>
                       </div>
                       <div className="flex flex-wrap gap-2">
                          {selectedBundleSlots.map(slot => (
                            <Badge key={slot.id} className="bg-white border-[#FE7F2D]/30 text-[#FE7F2D] font-black text-[10px] lowercase py-1 px-3">
                               {slot.section} — #{slot.slot_number}
                            </Badge>
                          ))}
                          {selectedBundleSlots.length === 0 && (
                            <span className="text-[10px] text-gray-400 font-bold lowercase italic">tap shelf slots above to assign to this bundle...</span>
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
