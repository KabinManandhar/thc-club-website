"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Printer, Eye, Receipt, FileText, Download } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ReceiptPrinter } from "./receipt-printer"
import { useRef } from "react"

export function InvoiceList() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, brands(business_name), invoice_line_items(*)")
        .order("created_at", { ascending: false })
      
      if (error) throw error
      setInvoices(data || [])
    } catch (err) {
      console.error("Error fetching invoices:", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredInvoices = invoices.filter(inv => 
    inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.brands?.business_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

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
    `);
    printWindow.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tighter flex items-center gap-3">
            <Receipt className="w-7 h-7 text-[#FE7F2D]" />
            Sales History & Invoices
          </h2>
          <p className="text-gray-500 font-medium text-sm">View and print standard 80mm thermal bills for all transactions.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search invoice or brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
      </div>

      <Card className="border-gray-100 shadow-xl rounded-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="font-black text-[10px] uppercase tracking-widest">Inv #</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest">Brand</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest">Total</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-center">Fee</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-right">Date</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.map((inv) => (
              <TableRow key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                <TableCell className="font-bold">{inv.invoice_number}</TableCell>
                <TableCell className="font-medium">{inv.brands?.business_name}</TableCell>
                <TableCell className="font-black">NPR {inv.total_amount.toLocaleString()}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-blue-600 border-blue-100 bg-blue-50/30">NPR {inv.ppf_amount?.toLocaleString() || '0'}</Badge>
                </TableCell>
                <TableCell className="text-right text-gray-500 tabular-nums text-xs">
                  {new Date(inv.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="rounded-xl h-8 px-3 font-black text-[10px] uppercase" onClick={() => setSelectedInvoice(inv)}>
                        View Bill
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
                      <div className="p-8">
                        {inv && (
                          <>
                            <div className="hidden">
                               <ReceiptPrinter 
                                 ref={printRef}
                                 invoiceNumber={inv.invoice_number}
                                 date={new Date(inv.created_at).toLocaleDateString("en-NP")}
                                 brandName={inv.brands?.business_name || "N/A"}
                                 customerName={inv.customer_name}
                                 items={inv.invoice_line_items?.map((item: any) => ({
                                   name: item.product_name,
                                   quantity: item.quantity,
                                   price: item.unit_price,
                                   total: item.line_total
                                 })) || []}
                                 subtotal={inv.subtotal}
                                 discount={inv.discount_amount}
                                 total={inv.total_amount}
                                 paymentMethod={inv.payment_method}
                               />
                            </div>

                            <div className="space-y-6">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="text-3xl font-black italic uppercase italic">THC Club</h3>
                                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Store Terminal 01</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-black text-xl italic text-[#FE7F2D]">{inv.invoice_number}</p>
                                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{new Date(inv.created_at).toLocaleDateString("en-NP")}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-8 py-4 border-y border-dashed border-gray-100">
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Partner Brand</p>
                                  <p className="font-black italic text-lg">{inv.brands?.business_name}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Customer</p>
                                  <p className="font-black italic text-lg">{inv.customer_name || "Walk-in"}</p>
                                </div>
                              </div>

                              <div className="max-h-64 overflow-y-auto">
                                <Table>
                                  <TableHeader className="bg-gray-50/50">
                                    <TableRow className="border-none">
                                      <TableHead className="font-black text-[8px] uppercase tracking-widest h-10">Product Name</TableHead>
                                      <TableHead className="text-right font-black text-[8px] uppercase tracking-widest h-10">Qty</TableHead>
                                      <TableHead className="text-right font-black text-[8px] uppercase tracking-widest h-10">Price</TableHead>
                                      <TableHead className="text-right font-black text-[8px] uppercase tracking-widest h-10">Total</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {inv.invoice_line_items?.map((item: any, i: number) => (
                                      <TableRow key={i} className="border-gray-50 py-4">
                                        <TableCell className="font-black text-xs uppercase italic">{item.product_name}</TableCell>
                                        <TableCell className="text-right font-mono text-xs">{item.quantity}</TableCell>
                                        <TableCell className="text-right font-mono text-xs">{item.unit_price.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-black text-sm italic">NPR {item.line_total.toLocaleString()}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>

                              <div className="pt-6 space-y-1 border-t border-dashed">
                                <div className="flex justify-between text-gray-400 font-black text-[10px] uppercase tracking-widest">
                                   <span>Gross Value</span><span>NPR {inv.subtotal.toLocaleString()}</span>
                                </div>
                                {inv.discount_amount > 0 && (
                                  <div className="flex justify-between text-green-600 font-black text-[10px] uppercase tracking-widest">
                                    <span>Platform Discount</span><span>- NPR {inv.discount_amount.toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="flex justify-between font-black text-3xl italic pt-2">
                                   <span>Total Paid</span>
                                   <span className="text-[#FE7F2D]">NPR {inv.total_amount.toLocaleString()}</span>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Method: {inv.payment_method}</p>
                              </div>
                            </div>
                          </>
                        )}
                        <div className="flex gap-3 justify-end pt-8">
                          <Button 
                             variant="outline" 
                             className="rounded-xl font-black text-[10px] uppercase tracking-widest h-12 px-8 flex items-center gap-2"
                             onClick={handlePrint}
                          >
                            <Printer className="w-4 h-4" /> Print POS Bill
                          </Button>
                          <Button onClick={() => setSelectedInvoice(null)} className="bg-[#010307] text-white rounded-xl font-black text-[10px] uppercase tracking-widest h-12 px-8">
                             Close
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      
      {filteredInvoices.length === 0 && (
        <div className="py-20 text-center space-y-4">
           <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
             <Receipt className="w-8 h-8" />
           </div>
           <p className="text-gray-400 font-bold">No invoices found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}
