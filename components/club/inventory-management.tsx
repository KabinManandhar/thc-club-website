"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase, type BrandProduct } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PlusCircle, Search, Edit2, Trash2, AlertTriangle, Package } from "lucide-react"

interface InventoryManagementProps {
  brandId: string
}

const EMPTY_FORM = {
  name: "",
  sku: "",
  description: "",
  category: "",
  price: "",
  stock_quantity: "",
  low_stock_threshold: "5",
}

export function InventoryManagement({ brandId }: InventoryManagementProps) {
  const [products, setProducts] = useState<BrandProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<BrandProduct | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("brand_products")
      .select("*")
      .eq("brand_id", brandId)
      .order("name")
    if (!error) setProducts(data || [])
    setLoading(false)
  }, [brandId])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  const openAdd = () => {
    setEditingProduct(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setIsFormOpen(true)
  }

  const openEdit = (product: BrandProduct) => {
    setEditingProduct(product)
    setForm({
      name: product.name,
      sku: product.sku || "",
      description: product.description || "",
      category: product.category || "",
      price: product.price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      low_stock_threshold: product.low_stock_threshold.toString(),
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.price) {
      setFormError("Product name and price are required.")
      return
    }
    setSaving(true)
    setFormError(null)

    const payload = {
      name: form.name,
      sku: form.sku || null,
      description: form.description || null,
      category: form.category || null,
      price: parseFloat(form.price),
      stock_quantity: parseInt(form.stock_quantity) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
    }

    try {
      const { error } = await supabase.from("brand_change_requests").insert({
        brand_id: brandId,
        request_type: editingProduct ? "product_update" : "product_add",
        target_id: editingProduct?.id,
        new_data: payload,
        status: "pending"
      })

      if (error) throw error
      
      setIsFormOpen(false)
      fetchProducts()
      alert("Changes submitted to admin for approval.")
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStockBadge = (p: BrandProduct) => {
    if (p.stock_quantity === 0)
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Out of Stock</Badge>
    if (p.stock_quantity <= p.low_stock_threshold)
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Low Stock ({p.stock_quantity})</Badge>
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">In Stock ({p.stock_quantity})</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Inventory Management</h2>
          <p className="text-gray-600">Request product additions or updates. Admin approval required for all changes.</p>
        </div>
        <Button onClick={openAdd} className="bg-[#010307] text-white hover:bg-[#010307]/90">
          <PlusCircle className="mr-2 h-4 w-4" /> Request New Product
        </Button>
      </div>

      <Card className="border-[#FE7F2D]/20">
        <CardHeader className="pb-2">
           <div className="flex justify-between items-center bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 mb-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                 </div>
                 <div>
                    <p className="text-sm font-bold text-blue-900">Admin Approval Required</p>
                    <p className="text-xs text-blue-700">All product additions, edits, and deletions are managed by the admin team.</p>
                 </div>
              </div>
           </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-gray-400">Loading...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-gray-500 text-sm">No products yet. Request your first product!</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => (
                    <TableRow key={p.id} className="hover:bg-gray-50/50">
                      <TableCell>
                        <div className="font-medium">{p.name}</div>
                        {p.sku && <div className="text-xs text-gray-500">SKU: {p.sku}</div>}
                      </TableCell>
                      <TableCell className="text-gray-600">{p.category || "—"}</TableCell>
                      <TableCell className="font-medium">NPR {p.price.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStockBadge(p)}
                          {p.stock_quantity <= p.low_stock_threshold && p.stock_quantity > 0 && (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => openEdit(p)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <div className="inline-block" title="Only Admin can delete products">
                           <Button
                             variant="ghost" size="icon" className="h-8 w-8 text-gray-300 cursor-not-allowed"
                             disabled
                           >
                             <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Request Product Edit" : "Request New Product"}</DialogTitle>
            <p className="text-xs text-[#FE7F2D] font-bold">Admin will verify and approve these changes.</p>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Product Name *</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Handcrafted Mug" />
              </div>
              <div>
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="MUG-001" />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Pottery" />
              </div>
              <div>
                <Label>Price (NPR) *</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} placeholder="1200" />
              </div>
              <div>
                <Label>Desired Stock Level</Label>
                <Input type="number" value={form.stock_quantity} onChange={(e) => setForm(f => ({ ...f, stock_quantity: e.target.value }))} placeholder="20" />
              </div>
              <div>
                <Label>Low Stock Alert At</Label>
                <Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} placeholder="5" />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief product description" rows={2} />
              </div>
            </div>
            {formError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white">
              {saving ? "Sending..." : editingProduct ? "Request Change" : "Submit Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
