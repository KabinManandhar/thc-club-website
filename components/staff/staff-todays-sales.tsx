"use client"

import { ReceiptPrinter } from "@/components/admin/receipt-printer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { Calendar, DollarSign, Printer, Receipt, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

function getTodayBounds() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

interface StaffTodaysSalesProps {
  refreshKey?: number
}

export function StaffTodaysSales({ refreshKey = 0 }: StaffTodaysSalesProps) {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const fetchTodaysSales = useCallback(async () => {
    setLoading(true)
    try {
      const { start, end } = getTodayBounds()
      const { data, error } = await supabase
        .from("invoices")
        .select("*, brands(business_name), invoice_line_items(*)")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (err: any) {
      console.error("Error fetching today's sales:", err.message || err)
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTodaysSales()
  }, [fetchTodaysSales, refreshKey])

  const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0)
  const todayLabel = new Date().toLocaleDateString("en-NP", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent || !selectedInvoice) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Receipt</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { margin: 0; padding: 0; }
            * { font-family: 'Courier New', Courier, monospace; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tighter flex items-center gap-2 lowercase italic">
            <Receipt className="w-6 h-6 text-[#FE7F2D]" />
            today&apos;s sales
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{todayLabel}</p>
        </div>
        <Button
          variant="outline"
          onClick={fetchTodaysSales}
          disabled={loading}
          className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="border-[#FE7F2D]/20 rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-[#FE7F2D]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Transactions</p>
              <p className="text-3xl font-black tracking-tighter">{invoices.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-black/5 rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Collected</p>
              <p className="text-3xl font-black tracking-tighter text-[#FE7F2D]">NPR {totalRevenue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="table-responsive">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="whitespace-nowrap">
                <TableHead className="font-black text-[10px] uppercase tracking-widest px-4">Time</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Invoice</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Brand</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">Payment</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-right">Total</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-right px-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-400 font-bold italic animate-pulse">
                    Loading today&apos;s sales...
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-gray-400 font-bold">
                    No sales recorded today yet.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-gray-50/50">
                    <TableCell className="px-4 text-xs font-bold text-gray-500 tabular-nums whitespace-nowrap">
                      {new Date(inv.created_at).toLocaleTimeString("en-NP", { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell className="font-bold text-sm">{inv.invoice_number}</TableCell>
                    <TableCell className="text-sm font-medium whitespace-nowrap">{inv.brands?.business_name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest capitalize">
                        {inv.payment_method}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black whitespace-nowrap">
                      NPR {Number(inv.total_amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl h-8 px-3 font-black text-[10px] uppercase"
                        onClick={() => setSelectedInvoice(inv)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
          <div className="p-8">
            {selectedInvoice && (
              <>
                <div className="hidden">
                  <ReceiptPrinter
                    ref={printRef}
                    invoiceNumber={selectedInvoice.invoice_number}
                    date={new Date(selectedInvoice.created_at).toLocaleDateString("en-NP")}
                    brandName={selectedInvoice.brands?.business_name || "N/A"}
                    customerName={selectedInvoice.customer_name}
                    items={(selectedInvoice.invoice_line_items || []).map((item: any) => ({
                      name: item.product_name,
                      quantity: item.quantity,
                      price: item.unit_price,
                      total: item.line_total,
                    }))}
                    subtotal={selectedInvoice.subtotal}
                    discount={selectedInvoice.discount_amount}
                    total={selectedInvoice.total_amount}
                    paymentMethod={selectedInvoice.payment_method}
                  />
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <DialogTitle className="text-2xl font-black italic uppercase">THC Club</DialogTitle>
                      <DialogDescription className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">
                        {new Date(selectedInvoice.created_at).toLocaleString("en-NP")}
                      </DialogDescription>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-xl italic text-[#FE7F2D]">{selectedInvoice.invoice_number}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-dashed">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Brand</p>
                      <p className="font-black italic">{selectedInvoice.brands?.business_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Customer</p>
                      <p className="font-black italic">{selectedInvoice.customer_name || "Walk-in"}</p>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[8px] font-black uppercase">Item</TableHead>
                        <TableHead className="text-right text-[8px] font-black uppercase">Qty</TableHead>
                        <TableHead className="text-right text-[8px] font-black uppercase">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedInvoice.invoice_line_items || []).map((item: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-bold text-xs">{item.product_name}</TableCell>
                          <TableCell className="text-right text-xs">{item.quantity}</TableCell>
                          <TableCell className="text-right font-black text-xs">NPR {item.line_total.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex justify-between font-black text-2xl italic pt-2 border-t border-dashed">
                    <span>Total</span>
                    <span className="text-[#FE7F2D]">NPR {Number(selectedInvoice.total_amount).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-8">
                  <Button
                    variant="outline"
                    onClick={handlePrint}
                    className="rounded-xl font-black text-[10px] uppercase tracking-widest h-12 px-8"
                  >
                    <Printer className="w-4 h-4 mr-2" /> Print
                  </Button>
                  <Button
                    onClick={() => setSelectedInvoice(null)}
                    className="bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest h-12 px-8"
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
