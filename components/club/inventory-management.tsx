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
import { PlusCircle, Search, Edit2, Trash2, AlertTriangle, Package, Image as ImageIcon, Shield, AlertCircle } from "lucide-react"
import { FileUpload } from "@/components/ui/file-upload"
import { toast } from "sonner"

interface InventoryManagementProps {
  brandId: string
}

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "",
  price: "",
  stock_quantity: "",
  low_stock_threshold: "5",
  image_url: "",
}

export function InventoryManagement({ brandId }: InventoryManagementProps) {
  const [products, setProducts] = useState<BrandProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<BrandProduct | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [isStockOpen, setIsStockOpen] = useState(false)
  const [stockForm, setStockForm] = useState({ id: "", name: "", stock_quantity: "0" })

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
      description: product.description || "",
      category: product.category || "",
      price: product.price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      low_stock_threshold: product.low_stock_threshold.toString(),
      image_url: product.image_url || "",
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.price) {
      setFormError("Product name and price are required.")
      return
    }

    const price = parseFloat(form.price)
    if (isNaN(price) || price < 0) {
      setFormError("Price must be a valid positive number.")
      return
    }

    const stock = parseInt(form.stock_quantity)
    if (!isNaN(stock) && stock < 0) {
      setFormError("Initial stock cannot be negative.")
      return
    }
    setSaving(true)
    setFormError(null)

    const payload = {
      name: form.name,
      description: form.description || null,
      category: form.category || null,
      price: parseFloat(form.price),
      stock_quantity: parseInt(form.stock_quantity) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
      image_url: form.image_url || null,
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
      toast.success("Request submitted to community admin for verification.")
    } catch (error: any) {
      setFormError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const openStockUpdate = (product: BrandProduct) => {
    setStockForm({
      id: product.id,
      name: product.name,
      stock_quantity: product.stock_quantity.toString(),
    })
    setIsStockOpen(true)
  }

  const handleStockUpdate = async () => {
    const product = products.find(p => p.id === stockForm.id)
    if (!product) return

    setSaving(true)
    try {
      const payload = {
        ...product,
        stock_quantity: parseInt(stockForm.stock_quantity) || 0,
      }
      // Clean sensitive fields
      const { id, brand_id, created_at, updated_at, ...cleanedData } = payload as any;

      const { error } = await supabase.from("brand_change_requests").insert({
        brand_id: brandId,
        request_type: "product_update",
        target_id: product.id,
        new_data: cleanedData,
        status: "pending"
      })

      if (error) throw error
      setIsStockOpen(false)
      toast.success("Stock update request submitted for verification.")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStockBadge = (p: BrandProduct) => {
    if (p.stock_quantity === 0)
      return <Badge className="bg-red-50 text-red-700 border-none font-black uppercase tracking-widest text-[8px] px-2 py-0.5">Empty</Badge>
    if (p.stock_quantity <= p.low_stock_threshold)
      return <Badge className="bg-orange-50 text-orange-700 border-none font-black uppercase tracking-widest text-[8px] px-2 py-0.5">Low ({p.stock_quantity})</Badge>
    return <Badge className="bg-green-50 text-green-700 border-none font-black uppercase tracking-widest text-[8px] px-2 py-0.5">{p.stock_quantity} Units</Badge>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black flex items-center gap-3 tracking-tighter lowercase italic">
            <Package className="w-8 h-8 text-[#FE7F2D]" />
            product catalog
          </h2>
          <p className="text-[#010307]/40 font-medium text-sm italic lowercase">access your synchronized inventory.</p>
        </div>
        <Button onClick={openAdd} className="bg-[#FE7F2D] text-white hover:bg-[#FE7F2D]/90 px-8 py-3 rounded-2xl font-bold lowercase text-[11px] tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all h-12">
          <PlusCircle className="mr-2 h-4 w-4" /> add new product
        </Button>
      </div>

      <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#010307]/20" />
            <Input
              placeholder="search catalog..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 rounded-2xl h-12 border-[#010307]/5 bg-[#010307]/5 font-bold lowercase"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-[#010307]/5">
              <TableRow className="border-none">
                <TableHead className="px-8 font-bold text-[10px] lowercase tracking-widest text-[#010307]/40">product & identity</TableHead>
                <TableHead className="font-bold text-[10px] lowercase tracking-widest text-[#010307]/40">category</TableHead>
                <TableHead className="font-bold text-[10px] lowercase tracking-widest text-[#010307]/40">unit price</TableHead>
                <TableHead className="font-bold text-[10px] lowercase tracking-widest text-[#010307]/40 text-center">in-store stock</TableHead>
                <TableHead className="px-8 font-bold text-[10px] lowercase tracking-widest text-[#010307]/40 text-right">actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 animate-pulse text-[#010307]/20 font-bold lowercase italic">opening catalog...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-24">
                    <Package className="h-12 w-12 mx-auto mb-4 text-[#010307]/10" />
                    <p className="text-[#010307]/20 font-bold lowercase text-[10px] tracking-widest italic">no matching products found in your catalog.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id} className="hover:bg-gray-50/50 border-gray-50 transition-colors">
                    <TableCell className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-2xl object-cover bg-gray-50 border shadow-sm" />
                         ) : (
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100">
                               <ImageIcon className="w-6 h-6 text-gray-300" />
                            </div>
                         )}
                         <div className="flex flex-col">
                           <div className="font-bold text-[#010307] tracking-tight lowercase">{p.name}</div>
                           <div className="text-[10px] font-bold text-[#010307]/20 font-mono tracking-tighter lowercase">{p.id.slice(0, 8)} | active</div>
                         </div>
                      </div>
                    </TableCell>
                    <TableCell>
                       <Badge variant="outline" className="rounded-xl border-gray-100 text-gray-500 font-bold px-3 py-1 capitalize">{p.category || "General"}</Badge>
                    </TableCell>
                    <TableCell className="font-black text-gray-900">NPR {p.price.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                       {getStockBadge(p)}
                    </TableCell>
                    <TableCell className="px-8 text-right space-x-1">
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl border border-transparent hover:border-orange-100 transition-all" onClick={() => openStockUpdate(p)} title="Update stock">
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-gray-400 hover:text-black hover:bg-black/5 rounded-xl border border-transparent hover:border-black/5 transition-all" onClick={() => openEdit(p)} title="Edit product details">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <div className="inline-block" title="Admin access required for deletion">
                         <Button
                           variant="ghost" size="icon" className="h-10 w-10 text-gray-100 cursor-not-allowed"
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
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl rounded-[2rem]">
          <div className="bg-white p-10 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic">{editingProduct ? "Edit Entry" : "New Catalog Entry"}</DialogTitle>
              <p className="text-[10px] text-black/30 font-black uppercase tracking-widest flex items-center gap-2">
                 <Shield className="w-3.5 h-3.5" /> Community Admin Approval Required
              </p>
            </DialogHeader>
            
            <div className="space-y-6">
               <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <div>
                        <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Official Item Name *</Label>
                        <Input 
                           value={form.name} 
                           onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} 
                           placeholder="e.g. Classic Clay Pot" 
                           className="rounded-2xl h-14 border-gray-100 font-bold"
                        />
                     </div>
                     <div>
                        <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Market Category</Label>
                        <Input 
                           value={form.category} 
                           onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} 
                           placeholder="Pottery" 
                           className="rounded-2xl h-14 border-gray-100 font-bold"
                        />
                     </div>
                  </div>
                  <div>
                    <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Visual Identity (Image)</Label>
                    <FileUpload 
                      bucket="media" 
                      folder={`brand_${brandId}/products`}
                      value={form.image_url} 
                      onChange={(url) => setForm(f => ({ ...f, image_url: url }))} 
                    />
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-6">
                  <div>
                    <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Price (NPR) *</Label>
                    <Input 
                       type="number" 
                       value={form.price} 
                       onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} 
                       className="rounded-2xl h-14 border-gray-100 font-black text-lg"
                    />
                  </div>
                  {!editingProduct && (
                    <>
                      <div>
                        <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Opening Stock</Label>
                        <Input 
                           type="number" 
                           value={form.stock_quantity} 
                           onChange={(e) => setForm(f => ({ ...f, stock_quantity: e.target.value }))} 
                           className="rounded-2xl h-14 border-gray-100 font-bold"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Low Alert At</Label>
                        <Input 
                           type="number" 
                           value={form.low_stock_threshold} 
                           onChange={(e) => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} 
                           className="rounded-2xl h-14 border-gray-100 font-bold"
                        />
                      </div>
                    </>
                  )}
                  {editingProduct && (
                    <div className="col-span-2 flex items-center justify-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <p className="text-[10px] font-black uppercase text-gray-400">Use 'update stock' button for inventory changes</p>
                    </div>
                  )}
               </div>

               <div>
                 <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Product Manifest / Description</Label>
                 <Textarea 
                    value={form.description} 
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} 
                    placeholder="Brief details for the community" 
                    rows={3} 
                    className="rounded-3xl border-gray-100 bg-white/50 p-6 resize-none font-medium"
                 />
               </div>

               {formError && (
                  <div className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
                     <AlertCircle className="w-4 h-4" /> {formError}
                  </div>
               )}
            </div>

            <DialogFooter className="pt-4 gap-4 sm:justify-between border-t border-gray-100 mt-8">
              <Button variant="ghost" onClick={() => setIsFormOpen(false)} className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px]">Cancel</Button>
              <Button 
                 onClick={handleSave} 
                 disabled={saving} 
                 className="bg-black hover:bg-black/90 text-white rounded-2xl h-14 px-12 font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 transition-all"
              >
                {saving ? "Transmitting..." : editingProduct ? "Commit Edits" : "Launch Product"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Update Dialog */}
      <Dialog open={isStockOpen} onOpenChange={setIsStockOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[2rem]">
          <div className="bg-white p-10 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic">Update Stock</DialogTitle>
              <p className="text-[10px] text-black/30 font-black uppercase tracking-widest flex items-center gap-2">
                 <Shield className="w-3.5 h-3.5" /> Stock Synchronization Request
              </p>
            </DialogHeader>

            <div className="space-y-6">
               <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 italic">
                  <p className="text-xs font-bold text-gray-400 lowercase tracking-wide">Product Identity</p>
                  <p className="text-lg font-black text-gray-900 lowercase">{stockForm.name}</p>
               </div>
               
               <div>
                  <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Current/New In-Store Stock</Label>
                  <Input 
                     type="number" 
                     value={stockForm.stock_quantity} 
                     onChange={(e) => setStockForm(f => ({ ...f, stock_quantity: e.target.value }))} 
                     className="rounded-2xl h-16 border-gray-100 font-black text-2xl text-center"
                     autoFocus
                  />
               </div>
            </div>

            <DialogFooter className="pt-4 gap-4 sm:justify-between border-t border-gray-100 mt-2">
              <Button variant="ghost" onClick={() => setIsStockOpen(false)} className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px]">Cancel</Button>
              <Button 
                 onClick={handleStockUpdate} 
                 disabled={saving} 
                 className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white rounded-2xl h-14 px-12 font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all"
              >
                {saving ? "Transmitting..." : "Update Stock"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
