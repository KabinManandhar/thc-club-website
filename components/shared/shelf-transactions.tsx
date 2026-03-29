"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabase, type ShelfBooking, type ShelfBookingPayment } from "@/lib/supabase"
import { CheckCircle2, CircleDollarSign, FileText, LayoutGrid } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface Props {
  brandId: string
  isAdmin?: boolean
}

export function ShelfTransactions({ brandId, isAdmin = false }: Props) {
  const [bookings, setBookings] = useState<ShelfBooking[]>([])
  const [payments, setPayments] = useState<ShelfBookingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

  // Payment Form State
  const [selectedBookingId, setSelectedBookingId] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("in_person")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<ShelfBookingPayment | null>(null)
  const [brand, setBrand] = useState<any>(null)
  const [isStatementOpen, setIsStatementOpen] = useState(false)

  useEffect(() => {
    if (brandId) fetchTransactions()
  }, [brandId])

  const fetchTransactions = async () => {
    setLoading(true)
    const [bookingsRes, paymentsRes] = await Promise.all([
      supabase.from("shelf_bookings").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }),
      supabase.from("shelf_booking_payments").select("*").eq("brand_id", brandId).order("payment_date", { ascending: false })
    ])

    setBookings(bookingsRes.data || [])
    setPayments(paymentsRes.data || [])

    // Fetch Brand Data for statements
    if (brandId) {
      const { data: bData } = await supabase.from("brands").select("*").eq("id", brandId).single()
      setBrand(bData)
    }

    // Auto-select first active/pending booking if modal opens
    if (bookingsRes.data?.length) {
      setSelectedBookingId(bookingsRes.data[0].id)
    }
    setLoading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleRecordPayment = async () => {
    if (!selectedBookingId || !amount || isNaN(Number(amount))) {
      toast.error("Please fill in a valid amount and select a booking.")
      return
    }

    setSubmitting(true)
    try {
      const parsedAmount = Number(amount)
      const targetBooking = bookings.find(b => b.id === selectedBookingId)
      if (!targetBooking) throw new Error("Booking not found")

      // 1. Insert Payment Record
      const { error: insertError } = await supabase.from("shelf_booking_payments").insert({
        booking_id: selectedBookingId,
        brand_id: brandId,
        amount_paid: parsedAmount,
        payment_method: method,
        notes: notes,
        confirmed_by: "Admin"
      })

      if (insertError) throw insertError

      // 2. Update Booking Totals
      const newAmountPaid = (targetBooking.amount_paid || 0) + parsedAmount
      const newStatus = newAmountPaid >= targetBooking.total_amount ? "paid" : "partial"

      const { error: updateError } = await supabase.from("shelf_bookings").update({
        amount_paid: newAmountPaid,
        payment_status: newStatus
      }).eq("id", selectedBookingId)

      if (updateError) throw updateError

      toast.success("Payment recorded successfully.")
      setIsPaymentModalOpen(false)
      setAmount("")
      setNotes("")
      fetchTransactions()
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="animate-pulse h-40 bg-gray-50 rounded-2xl"></div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
        <div>
          <h3 className="text-xl font-black lowercase italic tracking-tight text-gray-900 flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-[#FE7F2D]" />
            shelf transactions
          </h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Booking ledgers and payment history</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setIsPaymentModalOpen(true)}
            className="bg-[#FE7F2D] text-white hover:bg-black font-black uppercase tracking-widest text-[10px] rounded-xl h-10 px-6 shadow-xl shadow-orange-500/20"
          >
            Record Payment
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Bookings Summary */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Active & Pending Leases</h4>
          {bookings.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-3xl">
              <LayoutGrid className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs font-black uppercase text-gray-300 tracking-widest">No Shelf Records Found.</p>
            </div>
          ) : bookings.map(booking => {
            const paid = booking.amount_paid || 0
            const total = booking.total_amount || 0
            const balance = total - paid

            return (
              <Card key={booking.id} className="p-6 rounded-3xl border-gray-100 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h5 className="font-black text-gray-900 leading-none">
                      {booking.section || "Unassigned"} • {booking.shelf_type.replace('_', ' ')}
                    </h5>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      {booking.duration.replace('_', ' ')} Term
                    </p>
                  </div>
                  <Badge className={`font-black uppercase text-[8px] tracking-widest px-2 py-0 border ${balance <= 0 ? "bg-green-50 text-green-700 border-green-200" :
                      paid > 0 ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-orange-50 text-orange-600 border-orange-200"
                    }`}>
                    {balance <= 0 ? "Fully Paid" : paid > 0 ? "Partial" : "Pending"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Fee</p>
                    <p className="font-bold text-gray-900">NPR {total.toLocaleString()}</p>
                  </div>
                  <div className={`rounded-2xl p-4 border ${balance > 0 ? 'bg-red-50/50 border-red-100' : 'bg-green-50/50 border-green-100'}`}>
                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${balance > 0 ? 'text-red-400' : 'text-green-500'}`}>Balance Due</p>
                    <p className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>NPR {balance.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Ledger */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Payment Ledger</h4>
          {payments.length === 0 ? (
            <div className="p-8 text-center border border-gray-100 rounded-3xl bg-gray-50/30">
              <FileText className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs font-black uppercase text-gray-300 tracking-widest">No Payments Recorded.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map(payment => (
                <div key={payment.id} className="flex justify-between items-center p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-[#FE7F2D]/20 transition-colors">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900">NPR {payment.amount_paid.toLocaleString()}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        {new Date(payment.payment_date).toLocaleDateString()} • {payment.payment_method.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest text-[#FE7F2D] hover:text-white hover:bg-[#FE7F2D] transition-all"
                      onClick={() => {
                        setSelectedPayment(payment)
                        setIsStatementOpen(true)
                      }}
                    >
                      View Statement
                    </Button>
                    {isAdmin && payment.confirmed_by && (
                      <Badge variant="outline" className="text-[8px] uppercase tracking-widest font-black text-gray-300 pointer-events-none">
                        by {payment.confirmed_by}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="font-black text-2xl lowercase italic tracking-tight text-gray-900">
              record payment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">Select Booking</Label>
              <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                <SelectTrigger className="rounded-xl h-12 bg-gray-50 border-gray-100">
                  <SelectValue placeholder="Choose a lease" />
                </SelectTrigger>
                <SelectContent>
                  {bookings.map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.section || "Pending"} ({b.duration.replace('_', ' ')}) - Bal: NPR {(b.total_amount - (b.amount_paid || 0)).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black text-[#FE7F2D] tracking-widest ml-1">Amount Paid (NPR)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="rounded-xl h-12 border-gray-100 bg-gray-50 font-bold"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">Payment Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="rounded-xl h-12 bg-gray-50 border-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">In Person</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="qr_scan">QR Scan</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">Internal Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="rounded-xl border-gray-100 bg-gray-50 resize-none min-h-[80px]"
                placeholder="e.g. Cleared 1st quarter"
              />
            </div>

            <Button
              onClick={handleRecordPayment}
              disabled={submitting || !amount || !selectedBookingId}
              className="w-full h-12 rounded-xl bg-[#010307] hover:bg-[#FE7F2D] font-black uppercase tracking-widest text-[10px]"
            >
              {submitting ? "Processing..." : "Confirm Ledger Entry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shelf Payment Statement Modal */}
      <Dialog open={isStatementOpen} onOpenChange={setIsStatementOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-none shadow-2xl rounded-3xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Shelf Payment Statement</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-12 space-y-10 print:p-0">
            <div id="shelf-statement-print">
              {/* Header */}
              <div className="flex justify-between items-end border-b-2 border-gray-900 pb-8">
                <div>
                  <div className="text-4xl font-black italic tracking-tighter text-gray-900">THC Club</div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mt-1">Official Payment Record</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black uppercase tracking-[0.2em] text-[#FE7F2D] mb-1">Payment Receipt</div>
                  <p className="text-xs font-bold tabular-nums text-gray-900">Ref: #{selectedPayment?.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
                    {selectedPayment && new Date(selectedPayment.payment_date).toLocaleDateString('en-NP', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Entity Info */}
              <div className="grid grid-cols-2 gap-16 py-10">
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Payer Brand</p>
                    <p className="text-xl font-black italic text-gray-900 lowercase">{brand?.business_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Associated Lease</p>
                    {(() => {
                      const b = bookings.find(bk => bk.id === selectedPayment?.booking_id)
                      return (
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-gray-900 lowercase italic">
                            {b?.section || "The Collective Hub"} • {b?.shelf_type.replace('_', ' ')}
                          </p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{b?.duration.replace('_', ' ')} Cycle</p>
                        </div>
                      )
                    })()}
                  </div>
                </div>
                <div className="space-y-6 text-right sm:text-left">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Channel / Method</p>
                    <p className="text-sm font-bold text-gray-600 italic uppercase tracking-wider">{selectedPayment?.payment_method.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Confirmation</p>
                    <div className="flex items-center gap-2 justify-end sm:justify-start">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="text-sm font-black italic uppercase text-green-600">Payment Verified</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Details */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 pb-3">Financial Overview</h4>
                <div className="bg-gray-50/50 rounded-3xl p-8 space-y-6">
                  <div className="flex justify-between items-center text-sm border-b border-gray-100 pb-4">
                    <span className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">Total Lease Amount</span>
                    <span className="font-bold tabular-nums text-gray-900">NPR {bookings.find(b => b.id === selectedPayment?.booking_id)?.total_amount.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-[#FE7F2D] uppercase tracking-widest text-[10px]">Net Payment Realized</span>
                    <span className="text-3xl font-black text-[#FE7F2D] tabular-nums">NPR {selectedPayment?.amount_paid.toLocaleString()}</span>
                  </div>

                  {selectedPayment?.notes && (
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Transaction Notes</p>
                      <p className="text-xs italic text-gray-600">{selectedPayment.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center pt-20">
                <p className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-200">
                  this is a computer generated electronic receipt. thc club verification id: {selectedPayment?.id}
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-4 no-print">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="h-12 border-gray-200 rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 hover:bg-white"
            >
              Download Receipt
            </Button>
            <Button
              onClick={() => setIsStatementOpen(false)}
              className="bg-black text-white hover:bg-gray-800 font-black uppercase text-[10px] tracking-widest px-8 h-12 rounded-2xl"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
