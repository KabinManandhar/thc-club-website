"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase, type Brand, type BrandProduct, type Invoice, type InvoiceLineItem, calculateCommission } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ShoppingCart, Plus, Minus, Trash2, Receipt, Printer, CheckCircle2, Package, X
} from "lucide-react"

interface CartItem {
  product: BrandProduct
  quantity: number
}

export function InvoiceGenerator() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>("")
  const [products, setProducts] = useState<BrandProduct[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "qr" | "transfer">("cash")
  const [discount, setDiscount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [successInvoice, setSuccessInvoice] = useState<Invoice | null>(null)
  const [showInvoice, setShowInvoice] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from("brands").select("*").order("business_name")
      .then(({ data }) => setBrands(data || []))
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
  const commissionInfo = calculateCommission(total)

  const handleSubmitInvoice = async () => {
    if (!selectedBrandId || cart.length === 0) return
    setSubmitting(true)
    setError(null)

    try {
      // Generate invoice number
      const { data: numData } = await supabase.rpc("generate_invoice_number")
      const invoiceNumber = numData || `INV-${Date.now()}`

      // Create invoice header
      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          brand_id: selectedBrandId,
          created_by: "admin",
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          subtotal,
          discount_amount: discountAmt,
          total_amount: total,
          commission_rate: commissionInfo.rate,
          commission_amount: commissionInfo.amount,
          payment_method: paymentMethod,
          status: "paid",
        })
        .select("*")
        .single()

      if (invErr || !invoice) throw invErr || new Error("Invoice creation failed")

      // Insert line items (triggers will handle stock decrement + brand_sales update)
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

      setSuccessInvoice({ ...invoice, invoice_line_items: lineItems as any })
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
        <h2 className="text-2xl font-bold">Invoice Generator (POS)</h2>
        <p className="text-gray-600">Create a sale invoice — stock and sales data update automatically.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Brand + Products */}
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
                <CardTitle className="text-base">Product Catalog</CardTitle>
                <CardDescription>Click to add to invoice</CardDescription>
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
                              {p.sku && <p className="text-xs text-gray-400">SKU: {p.sku}</p>}
                            </div>
                            {inCart && (
                              <Badge className="bg-[#FE7F2D] text-white flex-shrink-0">×{inCart.quantity}</Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm font-bold">NPR {p.price.toLocaleString()}</span>
                            <span className="text-xs text-gray-500">
                              {outOfStock ? (
                                <span className="text-red-500">Out of stock</span>
                              ) : (
                                `Stock: ${p.stock_quantity}`
                              )}
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

        {/* Right: Cart + Invoice */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-[#010307]/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Invoice Cart
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="max-h-52">
                {cart.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-400">
                    No items added yet. Click products to add.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((c) => (
                      <div key={c.product.id} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{c.product.name}</p>
                          <p className="text-xs text-gray-500">NPR {c.product.price.toLocaleString()} each</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(c.product.id, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm w-6 text-center font-medium">{c.quantity}</span>
                          <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQty(c.product.id, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <span className="text-sm font-bold w-20 text-right flex-shrink-0">
                          NPR {(c.product.price * c.quantity).toLocaleString()}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removeFromCart(c.product.id)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <Separator />

              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Customer Name (optional)</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in Customer" className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Customer Phone (optional)</Label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="98XXXXXXXX" className="h-8 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="qr">QR / eSewa</SelectItem>
                        <SelectItem value="transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Discount (NPR)</Label>
                    <Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="h-8 text-sm" />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span><span>NPR {subtotal.toLocaleString()}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span><span>- NPR {discountAmt.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-lg pt-1">
                  <span>Total</span><span className="text-[#FE7F2D]">NPR {total.toLocaleString()}</span>
                </div>
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</p>}

              <Button
                onClick={handleSubmitInvoice}
                disabled={cart.length === 0 || !selectedBrandId || submitting}
                className="w-full bg-[#010307] hover:bg-[#010307]/90 text-white"
                size="lg"
              >
                {submitting ? "Creating Invoice..." : (
                  <><Receipt className="w-4 h-4 mr-2" /> Create Invoice</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success / Print Invoice Dialog */}
      <Dialog open={showInvoice} onOpenChange={setShowInvoice}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" /> Invoice Created Successfully
            </DialogTitle>
          </DialogHeader>
          {successInvoice && (
            <div className="space-y-4" id="printable-invoice">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="text-2xl font-black">THC Club</h3>
                  <p className="text-gray-500 text-sm">the hidden collective, kathmandu</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{successInvoice.invoice_number}</p>
                  <p className="text-gray-500 text-sm">{new Date(successInvoice.created_at).toLocaleDateString("en-NP")}</p>
                  <Badge className="bg-green-100 text-green-800 mt-1">Paid</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-gray-500 text-xs uppercase mb-1">Sold by</p>
                  <p className="font-medium">{selectedBrand?.business_name}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-500 text-xs uppercase mb-1">Customer</p>
                  <p className="font-medium">{successInvoice.customer_name || "Walk-in Customer"}</p>
                  {successInvoice.customer_phone && <p className="text-gray-500">{successInvoice.customer_phone}</p>}
                </div>
              </div>

              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {successInvoice.invoice_line_items?.map((item: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">NPR {item.unit_price.toLocaleString()}</TableCell>
                      <TableCell className="text-right">NPR {item.line_total.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="space-y-1 text-sm border-t pt-4">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span><span>NPR {successInvoice.subtotal.toLocaleString()}</span>
                </div>
                {successInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span><span>- NPR {successInvoice.discount_amount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-lg">
                  <span>Total Paid</span>
                  <span>NPR {successInvoice.total_amount.toLocaleString()}</span>
                </div>
                <p className="text-gray-400 text-xs">Payment: {successInvoice.payment_method?.toUpperCase()}</p>
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button onClick={() => setShowInvoice(false)} className="bg-[#010307] text-white">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
