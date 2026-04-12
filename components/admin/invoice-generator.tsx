"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase, type Brand, type BrandProduct, type Invoice, type PPFTier } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ShoppingCart, Plus, Minus, Trash2, Receipt, Printer, CheckCircle2, Package, X } from "lucide-react"
import { ReceiptPrinter } from "./receipt-printer"
import { adminAuth } from "@/lib/auth"

interface CartItem {
  product: BrandProduct
  quantity: number
}

export function InvoiceGenerator() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>("")
  const [products, setProducts] = useState<BrandProduct[]>([])
  const [ppfTiers, setPpfTiers] = useState<PPFTier[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "qr" | "transfer">("cash")
  const [discount, setDiscount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [successInvoice, setSuccessInvoice] = useState<any>(null)
  const [showInvoice, setShowInvoice] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from("brands").select("*").order("business_name")
      .then(({ data }) => setBrands(data || []))
    supabase.from("ppf_tiers").select("*").order("min_sales_amount", { ascending: false })
      .then(({ data }) => setPpfTiers(data || []))
  }, [])

  const fetchProducts = useCallback(async () => {
    if (!selectedBrandId) return
    const { data } = await supabase
      .from("brand_products")
      .select("*")
      .eq("brand_id", selectedBrandId)
      .eq("is_active", true)
      .order("name")
    setProducts(data || [])
    setCart([])
  }, [selectedBrandId])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const addToCart = (product: BrandProduct) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return prev
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      }
      if (product.stock_quantity === 0) return prev
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) =>
        c.product.id === productId
          ? { ...c, quantity: Math.max(1, Math.min(c.quantity + delta, c.product.stock_quantity)) }
          : c
      )
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId))
  }

  const subtotal = cart.reduce((acc, c) => acc + c.product.price * c.quantity, 0)
  const discountAmt = parseFloat(discount) || 0
  const total = Math.max(subtotal - discountAmt, 0)
  
  // Calculate PPF based on this invoice's total
  const applicableTier = ppfTiers.find((t) => total >= t.min_sales_amount) || ppfTiers[ppfTiers.length - 1] || { ppf_rate: 3 }
  const ppfInfo = { rate: applicableTier.ppf_rate, amount: total * (applicableTier.ppf_rate / 100) }

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

  const handleSubmitInvoice = async () => {
    if (!selectedBrandId || cart.length === 0) return
    setSubmitting(true)
    setError(null)

    try {
      const currentUser = await adminAuth.getCurrentUser()
      if (!currentUser) throw new Error("Not authenticated")

      const { data: numData } = await supabase.rpc("generate_invoice_number")
      const invoiceNumber = numData || `INV-${Date.now()}`

      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          brand_id: selectedBrandId,
          created_by: currentUser.id,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          subtotal,
          discount_amount: discountAmt,
          total_amount: total,
          ppf_rate: ppfInfo.rate,
          ppf_amount: ppfInfo.amount,
          payment_method: paymentMethod,
          status: "paid",
        })
        .select("*")
        .single()

      if (invErr || !invoice) throw invErr || new Error("Invoice creation failed")

      const lineItems = cart.map((c) => ({
        invoice_id: invoice.id,
        product_id: c.product.id,
        product_name: c.product.name,
        product_sku: c.product.sku || null,
        unit_price: c.product.price,
        quantity: c.quantity,
        line_total: c.product.price * c.quantity,
      }))

      const { error: lineErr } = await supabase.from("invoice_line_items").insert(lineItems)
      if (lineErr) throw lineErr

      const stockLogs = cart.map((c) => ({
        product_id: c.product.id,
        brand_id: selectedBrandId,
        previous_stock: c.product.stock_quantity,
        new_stock: c.product.stock_quantity - c.quantity,
        change_amount: -c.quantity,
        change_type: "sale" as const,
        reference_id: invoice.id,
        notes: `Sale generated via POS`
      }))
      const { error: logsErr } = await supabase.from("product_stock_logs").insert(stockLogs)
      if (logsErr) console.error("Error writing stock logs", logsErr)

      setSuccessInvoice({ ...invoice, invoice_line_items: lineItems })
      setShowInvoice(true)
      setCart([])
      setCustomerName("")
      setCustomerPhone("")
      setDiscount("")
      fetchProducts()
    } catch (err: any) {
      setError(err.message || "Failed to create invoice")
    } finally {
      setSubmitting(false)
    }
  }

  const selectedBrand = brands.find((b) => b.id === selectedBrandId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tighter lowercase italic">invoice generator (pos)</h2>
        <p className="text-[#010307]/40 font-medium italic lowercase">create a sale invoice — stock and sales data update automatically.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Card className="border-[#FE7F2D]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Brand</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a brand..." />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.business_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedBrandId && (
            <Card className="border-[#FE7F2D]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-black lowercase italic">product catalog</CardTitle>
              <CardDescription className="lowercase">click to add to invoice</CardDescription>
            </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-3">
                  {products.length === 0 ? (
                    <div className="col-span-2 py-8 text-center">
                      <Package className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-400 text-sm">No products in catalog</p>
                    </div>
                  ) : (
                    products.map((p) => {
                      const inCart = cart.find((c) => c.product.id === p.id)
                      const outOfStock = p.stock_quantity === 0
                      return (
                        <div
                          key={p.id}
                          onClick={() => !outOfStock && addToCart(p)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            outOfStock
                              ? "opacity-50 cursor-not-allowed border-gray-100 bg-gray-50"
                              : inCart
                              ? "border-[#FE7F2D] bg-orange-50/50 cursor-pointer"
                              : "border-gray-200 cursor-pointer hover:border-[#FE7F2D]/50 hover:bg-orange-50/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{p.name}</p>
                              {p.sku && <p className="text-xs text-gray-400 font-mono">SKU: {p.sku}</p>}
                            </div>
                            {inCart && (
                              <Badge className="bg-[#FE7F2D] text-white flex-shrink-0">×{inCart.quantity}</Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-bold">NPR {p.price.toLocaleString()}</span>
                            <span className="text-xs text-gray-500">
                              {outOfStock ? <span className="text-red-500">Out of stock</span> : `Stock: ${p.stock_quantity}`}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card className="border-[#010307]/20 shadow-xl rounded-3xl">
            <CardHeader className="pb-3 border-b border-[#010307]/5">
              <CardTitle className="text-base flex items-center gap-2 italic lowercase font-black">
                <ShoppingCart className="w-5 h-5 text-[#FE7F2D]" /> invoice cart
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <ScrollArea className="max-h-64">
                {cart.length === 0 ? (
                  <div className="py-10 text-center text-sm text-[#010307]/20 italic lowercase">no items added yet.</div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((c) => (
                      <div key={c.product.id} className="flex items-center gap-4 group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black truncate lowercase italic">{c.product.name}</p>
                          <p className="text-[10px] text-[#010307]/30 font-bold lowercase">npr {c.product.price.toLocaleString()} unit</p>
                        </div>
                        <div className="flex items-center gap-2 bg-[#010307]/5 p-1 rounded-xl">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-white transition-all" onClick={() => updateQty(c.product.id, -1)}>
                            <Minus className="w-3 h-3 text-[#010307]/40" />
                          </Button>
                          <span className="text-sm w-6 text-center font-black">{c.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-white transition-all" onClick={() => updateQty(c.product.id, 1)}>
                            <Plus className="w-3 h-3 text-[#010307]/40" />
                          </Button>
                        </div>
                        <span className="text-sm font-black w-24 text-right italic text-[#010307]">
                          {(c.product.price * c.quantity).toLocaleString()}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-[#010307]/10 hover:text-red-500 rounded-lg transition-all" onClick={() => removeFromCart(c.product.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <Separator />

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Customer Name</Label>
                      <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in" className="h-10 rounded-xl" />
                   </div>
                   <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Customer Phone</Label>
                      <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="98XXXXXXXX" className="h-10 rounded-xl" />
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment</Label>
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash Settlement</SelectItem>
                        <SelectItem value="card">Card Payment</SelectItem>
                        <SelectItem value="qr">QR Scan</SelectItem>
                        <SelectItem value="transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Discount (NPR)</Label>
                    <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="h-10 rounded-xl text-green-600 font-bold" />
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-2 border-t border-dashed">
                <div className="flex justify-between text-gray-400 font-black text-[10px] uppercase tracking-widest">
                  <span>Subtotal</span><span>NPR {subtotal.toLocaleString()}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-green-600 font-black text-[10px] uppercase tracking-widest">
                    <span>Discount Applied</span><span>- NPR {discountAmt.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-2xl tracking-tighter italic">
                  <span>TOTAL DUE</span><span className="text-[#FE7F2D]">NPR {total.toLocaleString()}</span>
                </div>
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl font-bold">{error}</p>}

              <Button
                onClick={handleSubmitInvoice}
                disabled={cart.length === 0 || !selectedBrandId || submitting}
                className="w-full bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white h-14 rounded-2xl font-bold lowercase tracking-widest text-[11px] shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
              >
                {submitting ? "transmitting..." : (
                  <><Receipt className="w-4 h-4 mr-2" /> sync & create invoice</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
          <div className="bg-green-50 p-6 flex items-center justify-between border-b border-green-100">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center">
                   <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                   <DialogTitle className="text-lg font-black italic">Invoice Synchronized</DialogTitle>
                   <DialogDescription className="text-green-700/60 text-[10px] font-black uppercase tracking-widest mt-0.5">Stock and sales records updated</DialogDescription>
                </div>
             </div>
             <Button variant="ghost" size="icon" onClick={() => setShowInvoice(false)} className="rounded-full hover:bg-green-100">
                <X className="w-5 h-5" />
             </Button>
          </div>
          <div className="p-8">
            {successInvoice && (
              <>
                <div className="hidden">
                   <ReceiptPrinter 
                     ref={printRef}
                     invoiceNumber={successInvoice.invoice_number}
                     date={new Date(successInvoice.created_at).toLocaleDateString("en-NP")}
                     brandName={selectedBrand?.business_name || "N/A"}
                     customerName={successInvoice.customer_name}
                     items={successInvoice.invoice_line_items.map((item: any) => ({
                       name: item.product_name,
                       quantity: item.quantity,
                       price: item.unit_price,
                       total: item.line_total
                     }))}
                     subtotal={successInvoice.subtotal}
                     discount={successInvoice.discount_amount}
                     total={successInvoice.total_amount}
                     paymentMethod={successInvoice.payment_method}
                   />
                </div>

                <div className="space-y-6" id="view-invoice">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-3xl font-black italic uppercase italic">THC Club</h3>
                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Store Terminal 01</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-xl italic text-[#FE7F2D]">{successInvoice.invoice_number}</p>
                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{new Date(successInvoice.created_at).toLocaleDateString("en-NP")}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 py-4 border-y border-dashed border-gray-100">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Partner Brand</p>
                      <p className="font-black italic text-lg">{selectedBrand?.business_name}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Customer</p>
                      <p className="font-black italic text-lg">{successInvoice.customer_name || "Walk-in"}</p>
                    </div>
                  </div>

                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow className="border-none">
                        <TableHead className="font-black text-[8px] uppercase tracking-widest h-10">Product Name</TableHead>
                        <TableHead className="text-right font-black text-[8px] uppercase tracking-widest h-10">Qty</TableHead>
                        <TableHead className="text-right font-black text-[8px] uppercase tracking-widest h-10">Unit</TableHead>
                        <TableHead className="text-right font-black text-[8px] uppercase tracking-widest h-10">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {successInvoice.invoice_line_items.map((item: any, i: number) => (
                        <TableRow key={i} className="border-gray-50 py-4">
                          <TableCell className="font-black text-xs uppercase italic">{item.product_name}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{item.quantity}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{item.unit_price.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-black text-sm italic">NPR {item.line_total.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="pt-6 space-y-1 border-t border-dashed">
                    <div className="flex justify-between text-gray-400 font-black text-[10px] uppercase tracking-widest">
                       <span>Gross Value</span><span>NPR {successInvoice.subtotal.toLocaleString()}</span>
                    </div>
                    {successInvoice.discount_amount > 0 && (
                      <div className="flex justify-between text-green-600 font-black text-[10px] uppercase tracking-widest">
                        <span>Platform Discount</span><span>- NPR {successInvoice.discount_amount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-3xl italic pt-2">
                       <span>Total Collected</span>
                       <span className="text-[#FE7F2D]">NPR {successInvoice.total_amount.toLocaleString()}</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Method: {successInvoice.payment_method}</p>
                  </div>
                </div>
              </>
            )}
            <div className="flex gap-3 justify-end pt-8">
              <Button 
                onClick={handlePrint} 
                className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white rounded-xl font-bold text-[11px] lowercase tracking-widest h-12 px-8 flex items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
              >
                <Printer className="w-4 h-4" /> print pos bill
              </Button>
              <Button onClick={() => setShowInvoice(false)} variant="ghost" className="text-[#010307]/40 hover:text-[#010307] rounded-xl font-bold text-[11px] lowercase tracking-widest h-12 px-8">
                dismiss access
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
