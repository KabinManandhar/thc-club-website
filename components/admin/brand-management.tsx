import { useState, useEffect } from "react"
import { supabase, type Brand, type BrandProduct, type ShelfBooking, type Invoice, type Enquiry, type VisitRequest, type BrandChangeRequest, type BrandContract } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Search, Users, Phone, Mail, Instagram, Package, Receipt, Calendar, Info, BarChart3, ChevronRight, LayoutGrid, MessageSquare, MapPin, ArrowLeft, Check, X as CloseX, AlertCircle, Clock, Trash2, Image as ImageIcon, ShieldCheck, FileText, StickyNote, DollarSign, Plus } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { generateSKU } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const STATUS_COLORS: Record<string, string> = {
  active: "bg-black text-white",
  pending: "bg-gray-100 text-gray-500",
  slot_selected: "bg-gray-50 text-gray-400",
  rejected: "bg-red-50 text-red-600",
}

function timeAgo(dateStr: string) {
  if (!dateStr) return "N/A"
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function BrandManagement() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [view, setView] = useState<"list" | "detail">("list")
  
  // Detail States
  const [products, setProducts] = useState<BrandProduct[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [bookings, setBookings] = useState<ShelfBooking[]>([])
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([])
  const [changeRequests, setChangeRequests] = useState<BrandChangeRequest[]>([])
  const [contracts, setContracts] = useState<BrandContract[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchBrands()
  }, [])

  const handleDeleteBrand = async () => {
    if (!selectedBrand) return
    setProcessingId(selectedBrand.id)
    try {
      const { error } = await supabase.rpc('delete_brand_entirely', { 
        p_brand_id: selectedBrand.id 
      })
      if (error) throw error
      
      toast.success("Brand footprint wiped successfully.")
      setView("list")
      setSelectedBrand(null)
      fetchBrands()
    } catch (err: any) {
      console.error("Deletion error:", err)
      toast.error(err.message || "Failed to delete brand.")
    } finally {
      setProcessingId(null)
    }
  }

  const fetchBrands = async () => {
    const { data } = await supabase
      .from("brands")
      .select("*")
      .order("updated_at", { ascending: false })
    setBrands(data || [])
    setLoading(false)
  }

  const handleBrandSelect = async (brand: Brand) => {
    setLoadingDetails(true)
    setSelectedBrand(brand)
    setView("detail")
    
    try {
      const [productsRes, invoicesRes, bookingsRes, enquiriesRes, visitsRes, changesRes, contractsRes] = await Promise.all([
        supabase.from("brand_products").select("*").eq("brand_id", brand.id).order("name", { ascending: true }),
        supabase.from("invoices").select("*").eq("brand_id", brand.id).order("created_at", { ascending: false }),
        supabase.from("shelf_bookings").select("*").eq("brand_id", brand.id).order("created_at", { ascending: false }),
        supabase.from("enquiries").select("*").eq("email", brand.email).order("created_at", { ascending: false }),
        supabase.from("visit_requests").select("*").eq("email", brand.email).order("created_at", { ascending: false }),
        supabase.from("brand_change_requests").select("*").eq("brand_id", brand.id).eq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("brand_contracts").select("*").eq("brand_id", brand.id).order("created_at", { ascending: false })
      ])

      setProducts(productsRes.data || [])
      setInvoices(invoicesRes.data || [])
      setBookings(bookingsRes.data || [])
      setEnquiries(enquiriesRes.data || [])
      setVisitRequests(visitsRes.data || [])
      setChangeRequests(changesRes.data || [])
      setContracts(contractsRes.data || [])
    } catch (err) {
      console.error("Error fetching brand details:", err)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleApproval = async (request: BrandChangeRequest, action: 'approve' | 'reject') => {
    setProcessingId(request.id)
    try {
      if (action === 'approve') {
        const data = request.new_data
        
        if (request.request_type === 'product_add') {
          // Auto Generate SKU if missing
          let sku = data.sku
          if (!sku) {
            sku = generateSKU(selectedBrand?.business_name || "BRD", data.name)
          }

          const { error } = await supabase.from('brand_products').insert({
             brand_id: request.brand_id,
             ...data,
             sku // Insert the (possibly auto-generated) SKU
          })
          if (error) throw error
        } else if (request.request_type === 'product_update' && request.target_id) {
          const { error } = await supabase.from('brand_products').update(data).eq('id', request.target_id)
          if (error) throw error
        } else if (request.request_type === 'brand_update') {
          const { error } = await supabase.from('brands').update(data).eq('id', request.brand_id)
          if (error) throw error
        }
      }

      const { error } = await supabase
        .from('brand_change_requests')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', request.id)
      
      if (error) throw error
      
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
      
      // Refresh details
      if (selectedBrand) handleBrandSelect(selectedBrand)
    } catch (err: any) {
      toast.error(err.message || 'Failed to process request')
    } finally {
      setProcessingId(null)
    }
  }

  const updateBrandCRM = async (data: Partial<Brand>) => {
    if (!selectedBrand) return
    try {
      const { error } = await supabase.from('brands').update(data).eq('id', selectedBrand.id)
      if (error) throw error
      setSelectedBrand({...selectedBrand, ...data})
      toast.success('CRM Record Updated')
      fetchBrands()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const uploadContract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedBrand) return
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `contracts/${selectedBrand.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName)

      const { error: dbError } = await supabase.from('brand_contracts').insert({
        brand_id: selectedBrand.id,
        file_url: publicUrl
      })

      if (dbError) throw dbError

      // Refresh contracts
      const { data } = await supabase.from('brand_contracts').select('*').eq('brand_id', selectedBrand.id).order('created_at', { ascending: false })
      setContracts(data || [])
      toast.success('Contract Uploaded Successfully')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const filtered = brands.filter(
    (b) =>
      b.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (view === "detail" && selectedBrand) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
        <Button 
          variant="ghost" 
          onClick={() => { setView("list"); setSelectedBrand(null); }}
          className="hover:bg-black/5 hover:text-black -ml-2 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Brand CRM
        </Button>

        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 bg-gray-50/50 border-b border-black/5 relative">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="w-16 h-16 rounded-xl bg-black flex items-center justify-center text-white text-2xl font-black uppercase shrink-0">
                {selectedBrand.business_name.substring(0, 2)}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">{selectedBrand.business_name}</h2>
                  <Badge className={`${STATUS_COLORS[selectedBrand.onboarding_status]} px-4 py-1 rounded-full font-black uppercase tracking-wider text-[10px]`}>
                    {selectedBrand.onboarding_status.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-widest">
                    <Mail className="w-3.5 h-3.5" />
                    {selectedBrand.email}
                  </div>
                  {selectedBrand.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase tracking-widest">
                      <Phone className="w-3.5 h-3.5" />
                      {selectedBrand.phone}
                    </div>
                  )}
                  {selectedBrand.instagram_handle && (
                    <div className="flex items-center gap-2 text-xs text-black font-black uppercase tracking-widest">
                      <Instagram className="w-3.5 h-3.5" />
                      {selectedBrand.instagram_handle}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {changeRequests.length > 0 && (
              <div className="absolute top-8 right-8 animate-pulse">
                 <Badge className="bg-red-500 text-white font-black px-4 py-2 rounded-xl shadow-lg shadow-red-500/20">
                    {changeRequests.length} Pending Actions
                 </Badge>
              </div>
            )}
          </div>

          <Tabs defaultValue="info" className="flex-1 flex flex-col">
            <div className="px-8 border-b border-black/5 bg-white">
              <TabsList className="bg-transparent border-none gap-8 h-14 p-0">
                {[
                  { id: 'info', label: 'Brand Profile' },
                  { id: 'changes', label: `Requests`, count: changeRequests.length },
                  { id: 'products', label: 'Inventory', count: products.length },
                  { id: 'sales', label: 'Sales History', count: invoices.length },
                  { id: 'contracts', label: 'Legal' },
                  { id: 'crm', label: 'CRM (Admin)' },
                  { id: 'enquiries', label: 'Enquiries', count: enquiries.length },
                  { id: 'danger', label: 'Danger Zone' },
                ].map(tab => (
                  <TabsTrigger 
                    key={tab.id}
                    value={tab.id} 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-black data-[state=active]:text-black rounded-none px-0 font-black uppercase tracking-widest text-[9px] h-full bg-transparent border-transparent transition-all"
                  >
                    {tab.label} {tab.count !== undefined && <span className="ml-1 opacity-30">({tab.count})</span>}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="p-8">
              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D]"></div>
                  <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Crunching database...</p>
                </div>
              ) : (
                <>
                  <TabsContent value="info" className="mt-0 outline-none space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                      <Card className="border-none bg-gray-50/50 rounded-2xl p-6">
                        <CardHeader className="p-0 mb-4">
                          <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 text-gray-400">
                            <Info className="w-4 h-4 text-[#FE7F2D]" />
                            The Brand Pitch
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                          <p className="text-gray-700 leading-relaxed font-medium italic text-lg">
                            {selectedBrand.description || "No brand pitch provided."}
                          </p>
                        </CardContent>
                      </Card>

                      <div className="space-y-4">
                         <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-[#FE7F2D]/30 transition-all shadow-sm">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center group-hover:bg-[#FE7F2D]/10 transition-colors">
                                  <Users className="w-5 h-5 text-[#FE7F2D]" />
                               </div>
                               <div>
                                  <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider leading-none mb-1">Contact Person</p>
                                  <p className="font-bold text-gray-900">{selectedBrand.contact_name || "---"}</p>
                               </div>
                            </div>
                         </div>
                         <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-[#FE7F2D]/30 transition-all shadow-sm">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
                                  <BarChart3 className="w-5 h-5 text-green-600" />
                               </div>
                               <div>
                                  <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider leading-none mb-1">Total Venue Revenue</p>
                                  <p className="font-bold text-gray-900">NPR {invoices.reduce((acc, inv) => acc + (inv.total_amount || 0), 0).toLocaleString()}</p>
                               </div>
                            </div>
                         </div>
                         <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-[#FE7F2D]/30 transition-all shadow-sm">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                                  <Package className="w-5 h-5 text-purple-600" />
                               </div>
                               <div>
                                  <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider leading-none mb-1">Active Portfolio</p>
                                  <p className="font-bold text-gray-900">{products.length} Products listed</p>
                               </div>
                            </div>
                         </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                       <h4 className="text-[10px] uppercase font-black text-[#FE7F2D] tracking-[0.2em] flex items-center gap-2">
                          <LayoutGrid className="w-4 h-4" /> Active Subscriptions & Shelves
                       </h4>
                       <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {bookings.map(booking => (
                             <Card key={booking.id} className="border-gray-100 shadow-sm rounded-2xl overflow-hidden group hover:border-[#FE7F2D]/20 transition-all">
                                <div className="p-5 space-y-3">
                                   <div className="flex justify-between items-center">
                                      <Badge className="bg-blue-50 text-blue-700 border-none font-black uppercase text-[8px] tracking-widest px-3 py-1">
                                         Slot #{booking.slot_number || "TBD"}
                                      </Badge>
                                      <Badge variant="outline" className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 ${booking.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : ''}`}>
                                         {booking.status}
                                      </Badge>
                                   </div>
                                   <div>
                                      <p className="font-bold text-gray-900 capitalize italic">{booking.shelf_type.replace('_', ' ')}</p>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{booking.duration} Plan</p>
                                   </div>
                                   <div className="pt-3 border-t border-gray-50 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                                      <span>NPR {booking.monthly_rent.toLocaleString()}/mo</span>
                                      <div className="flex items-center gap-1">
                                         <Calendar className="w-3 h-3" />
                                         <span>Exp {booking.end_date ? new Date(booking.end_date).toLocaleDateString() : '---'}</span>
                                      </div>
                                   </div>
                                </div>
                             </Card>
                          ))}
                          {bookings.length === 0 && (
                             <div className="col-span-full py-12 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 italic text-gray-400 font-medium">
                                No active shelf bookings found.
                             </div>
                          )}
                       </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="changes" className="mt-0 outline-none space-y-4">
                    {changeRequests.length === 0 ? (
                      <div className="py-20 text-center space-y-4">
                         <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                            <Check className="w-8 h-8 text-gray-300" />
                         </div>
                         <p className="text-gray-400 font-bold">No pending change requests.</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {changeRequests.map(request => (
                          <Card key={request.id} className="border-[#FE7F2D]/20 overflow-hidden shadow-lg">
                             <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">
                                <div className="p-5 flex-1 space-y-3">
                                   <div className="flex items-center justify-between">
                                      <Badge className="bg-orange-50 text-[#FE7F2D] font-black uppercase tracking-widest text-[9px]">
                                        {request.request_type.replace('_', ' ')}
                                      </Badge>
                                      <span className="text-[10px] text-gray-400 font-bold">{new Date(request.created_at).toLocaleString()}</span>
                                   </div>
                                   <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                      <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                                        {JSON.stringify(request.new_data, null, 2)}
                                      </pre>
                                   </div>
                                </div>
                                <div className="p-5 w-full md:w-48 flex md:flex-col justify-center gap-3 bg-gray-50/30">
                                   <Button 
                                      className="w-full bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px] h-11 rounded-xl"
                                      disabled={!!processingId}
                                      onClick={() => handleApproval(request, 'approve')}
                                   >
                                      <Check className="w-4 h-4 mr-2" /> Approve
                                   </Button>
                                   <Button 
                                      variant="outline"
                                      className="w-full border-red-200 text-red-600 hover:bg-red-50 font-black uppercase text-[10px] h-11 rounded-xl"
                                      disabled={!!processingId}
                                      onClick={() => handleApproval(request, 'reject')}
                                   >
                                      <CloseX className="w-4 h-4 mr-2" /> Reject
                                   </Button>
                                </div>
                             </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="products" className="mt-0 outline-none">
                    <div className="table-responsive">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent text-gray-400 uppercase text-[10px] font-black whitespace-nowrap">
                            <TableHead className="px-4">Product</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead className="text-right px-4">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.map(p => (
                            <TableRow key={p.id}>
                              <TableCell className="px-4">
                                <div className="flex items-center gap-3">
                                   {p.image_url ? (
                                      <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded-lg object-cover bg-gray-100 border shadow-sm" />
                                   ) : (
                                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0">
                                         <ImageIcon className="w-4 h-4 text-gray-300" />
                                      </div>
                                   )}
                                   <div className="flex flex-col min-w-[120px]">
                                     <div className="font-bold text-gray-900 truncate">{p.name}</div>
                                     <div className="text-[10px] text-gray-400 uppercase tracking-widest">{p.sku}</div>
                                   </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs font-black whitespace-nowrap">NPR {p.price.toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${p.stock_quantity > 10 ? 'bg-green-500' : p.stock_quantity > 0 ? 'bg-amber-500' : 'bg-red-500'}`} />
                                  <span className="font-black italic text-gray-600 tabular-nums">{p.stock_quantity}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right px-4">
                                 <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 font-black text-[10px] uppercase">
                                    <Trash2 className="w-3 h-3 mr-1" /> Remove
                                 </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="sales" className="mt-0 outline-none">
                    <div className="table-responsive">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent text-gray-400 uppercase text-[10px] font-black whitespace-nowrap">
                            <TableHead className="px-4">Invoice</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right px-4">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoices.map(inv => (
                            <TableRow key={inv.id}>
                              <TableCell className="font-mono text-xs font-black text-[#FE7F2D] px-4 whitespace-nowrap">{inv.invoice_number}</TableCell>
                              <TableCell className="text-xs text-gray-500 font-medium whitespace-nowrap">{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-sm font-bold text-gray-900 whitespace-nowrap">{inv.customer_name || "Guest Checkout"}</TableCell>
                              <TableCell className="text-right font-black text-gray-900 px-4 whitespace-nowrap">NPR {inv.total_amount.toLocaleString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="contracts" className="mt-0 outline-none space-y-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-black tracking-tight">Active Contracts & Legal</h3>
                      <div className="relative">
                        <input 
                          type="file" 
                          id="contract-upload" 
                          className="hidden" 
                          onChange={uploadContract}
                          accept=".pdf,.doc,.docx" 
                        />
                        <Button 
                          onClick={() => document.getElementById('contract-upload')?.click()}
                          className="bg-[#FE7F2D] text-white rounded-xl font-black uppercase text-[10px] tracking-widest px-6"
                        >
                          <Plus className="w-4 h-4 mr-2" /> Upload New Version
                        </Button>
                      </div>
                    </div>

                    {contracts.length === 0 ? (
                      <div className="bg-gray-50 rounded-3xl p-16 text-center border-2 border-dashed border-gray-100 italic font-medium text-gray-400">
                        No contracts uploaded yet for this brand.
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {contracts.map(contract => (
                          <div key={contract.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-[#FE7F2D]/30 transition-all shadow-sm">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                <FileText className="w-6 h-6 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">Brand Partnership Agreement</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider leading-none">Uploaded {new Date(contract.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <Button variant="ghost" className="text-[#FE7F2D] font-black uppercase text-[10px] tracking-widest" asChild>
                              <a href={contract.file_url} target="_blank" rel="noopener noreferrer">View Document</a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="crm" className="mt-0 outline-none space-y-6">
                    <div className="grid md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                          <div>
                             <h4 className="text-[10px] uppercase font-black text-[#FE7F2D] mb-4 tracking-[0.2em] flex items-center gap-2">
                                <StickyNote className="w-4 h-4" /> Internal Admin Notes
                             </h4>
                             <Textarea 
                                className="min-h-[200px] rounded-2xl bg-gray-50/50 border-gray-100 p-6 text-sm font-medium leading-relaxed italic"
                                placeholder="Add private notes about brand performance, issues, or relationship status..."
                                value={selectedBrand.admin_notes || ""}
                                onChange={(e) => setSelectedBrand({...selectedBrand, admin_notes: e.target.value})}
                             />
                             <Button 
                                onClick={() => updateBrandCRM({ admin_notes: selectedBrand.admin_notes })}
                                className="mt-4 bg-black text-white rounded-xl font-black uppercase text-[10px] tracking-widest px-8"
                             >
                                Save CRM Notes
                             </Button>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <div>
                             <h4 className="text-[10px] uppercase font-black text-[#FE7F2D] mb-4 tracking-[0.2em] flex items-center gap-2">
                                <DollarSign className="w-4 h-4" /> Settlement Details
                             </h4>
                             <Card className="border-none bg-orange-50/30 rounded-2xl p-6">
                                <div className="space-y-3">
                                   <div className="flex justify-between items-center bg-white/50 p-4 rounded-xl">
                                      <p className="text-[10px] font-black text-gray-400 uppercase">Bank Account</p>
                                      <p className="font-bold text-gray-900">{selectedBrand.bank_account_details?.account_number || "Not Shared"}</p>
                                   </div>
                                   <div className="flex justify-between items-center bg-white/50 p-4 rounded-xl">
                                      <p className="text-[10px] font-black text-gray-400 uppercase">Bank Name</p>
                                      <p className="font-bold text-gray-900">{selectedBrand.bank_account_details?.bank_name || "---"}</p>
                                   </div>
                                   <div className="flex justify-between items-center bg-white/50 p-4 rounded-xl">
                                      <p className="text-[10px] font-black text-gray-400 uppercase">Pan No.</p>
                                      <p className="font-bold text-gray-900">{selectedBrand.bank_account_details?.pan_number || "---"}</p>
                                   </div>
                                </div>
                             </Card>
                          </div>

                          <div>
                             <h4 className="text-[10px] uppercase font-black text-gray-400 mb-4 tracking-[0.2em] flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Lifecycle Tracking
                             </h4>
                             <div className="flex items-center gap-4 bg-gray-50 p-6 rounded-2xl">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-100">
                                   <Calendar className="w-6 h-6 text-gray-400" />
                                </div>
                                <div>
                                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Joined Club</p>
                                   <p className="font-bold text-gray-900">{new Date(selectedBrand.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="enquiries" className="mt-0 outline-none space-y-4">
                    {enquiries.map((enq) => (
                      <Card key={enq.id} className="border-gray-100 shadow-sm rounded-2xl overflow-hidden hover:border-[#FE7F2D]/20 transition-all">
                        <div className="p-6 space-y-4">
                           <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-[#FE7F2D]/10 rounded-xl flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-[#FE7F2D]" />
                                 </div>
                                 <div>
                                    <p className="font-black text-gray-900 tracking-tight">{enq.subject}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">{new Date(enq.created_at).toLocaleDateString()}</p>
                                 </div>
                              </div>
                              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-white">
                                {enq.status}
                              </Badge>
                           </div>
                           <p className="text-sm text-gray-600 leading-relaxed italic border-l-2 border-[#FE7F2D]/20 pl-4 py-1">"{enq.message}"</p>
                        </div>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="danger" className="mt-0 outline-none">
                      <div className="bg-red-50 border-2 border-dashed border-red-200 rounded-[3rem] p-16 text-center space-y-8 animate-in zoom-in-95 duration-500">
                         <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl shadow-red-500/20">
                            <Trash2 className="w-12 h-12" />
                         </div>
                         <div className="space-y-4 max-w-lg mx-auto">
                            <h3 className="text-3xl font-black tracking-tighter lowercase italic text-red-900 leading-none">nuclear deletion</h3>
                            <p className="text-red-700/60 font-medium italic text-lg leading-relaxed">
                               You are about to permanently wipe <span className="font-black text-red-800 underline decoration-red-800/20">{selectedBrand.business_name}</span>. 
                               This will erase all sales history, invoices, shelf allotments, and inventory records. <span className="font-black">This action is IRREVERSIBLE.</span>
                            </p>
                         </div>
                         
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button 
                                  variant="destructive"
                                  className="h-20 px-16 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[12px] shadow-2xl shadow-red-500/30 hover:scale-105 transition-all active:scale-95 bg-red-600"
                               >
                                  Confirm Total Wipe
                               </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2.5rem] p-10 border-red-100 shadow-2xl">
                               <AlertDialogHeader className="space-y-4">
                                  <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-2">
                                     <AlertCircle className="w-8 h-8" />
                                  </div>
                                  <AlertDialogTitle className="text-2xl font-black lowercase italic tracking-tight">Final Authorization Required</AlertDialogTitle>
                                  <AlertDialogDescription className="text-gray-500 font-medium leading-relaxed italic text-lg">
                                     This will trigger a cascading database wipe. All cloud synchronization and POS associations for this brand will be severed immediately.
                                  </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter className="mt-10 gap-4">
                                  <AlertDialogCancel className="h-14 px-10 rounded-2xl font-bold lowercase tracking-widest text-[11px] border-none bg-gray-50">abort mission</AlertDialogCancel>
                                  <AlertDialogAction 
                                     onClick={handleDeleteBrand}
                                     className="h-14 px-10 rounded-2xl font-black lowercase tracking-widest text-[11px] bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-500/20"
                                  >
                                     confirm execution
                                  </AlertDialogAction>
                               </AlertDialogFooter>
                            </AlertDialogContent>
                         </AlertDialog>

                         <div className="pt-8 flex flex-wrap justify-center gap-3">
                            <Badge variant="outline" className="rounded-full border-red-100 text-red-800/40 font-bold lowercase text-[10px] px-3 py-1 italic">cascading wipe enabled</Badge>
                            <Badge variant="outline" className="rounded-full border-red-100 text-red-800/40 font-bold lowercase text-[10px] px-3 py-1 italic">pos link termination</Badge>
                            <Badge variant="outline" className="rounded-full border-red-100 text-red-800/40 font-bold lowercase text-[10px] px-3 py-1 italic">financial record purge</Badge>
                         </div>
                      </div>
                   </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight">Brand CRM</h2>
          <p className="text-gray-500 font-bold">Manage membership lifecycle and vendor portfolio.</p>
        </div>
        <div className="text-[10px] font-black tracking-[0.2em] text-[#FE7F2D] bg-[#FE7F2D]/10 px-6 py-3 rounded-2xl border border-[#FE7F2D]/20 uppercase">
          {brands.length} Active Member Brands
        </div>
      </div>

      <Card className="border border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-white border-b border-black/5 p-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by brand name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 bg-gray-50 border-transparent focus:bg-white focus:border-black transition-all rounded-xl font-bold"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-responsive">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow className="hover:bg-transparent border-none whitespace-nowrap">
                  <TableHead className="w-[30%] px-6 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400">Brand Portfolio</TableHead>
                  <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400">Communication</TableHead>
                  <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400">Vibe Check</TableHead>
                  <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400">Latest Pulse</TableHead>
                  <TableHead className="w-[80px] px-6 py-4"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-24">
                      <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D] border-t-transparent shadow-lg shadow-orange-500/10"></div>
                        <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Waking up the database...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-24">
                      <Users className="w-16 h-16 mx-auto text-gray-100 mb-6" />
                      <p className="text-gray-500 font-black uppercase tracking-widest text-xs">No curators found matching sequence.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((b) => (
                    <TableRow 
                      key={b.id} 
                      className="hover:bg-[#FE7F2D]/5 cursor-pointer group transition-all border-b border-gray-50"
                      onClick={() => handleBrandSelect(b)}
                    >
                      <TableCell className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center font-black text-[#FE7F2D] text-lg uppercase group-hover:bg-[#FE7F2D] group-hover:text-white group-hover:border-transparent transition-all shadow-sm">
                            {b.business_name.substring(0, 2)}
                          </div>
                          <div>
                            <div className="font-black text-gray-900 text-lg tracking-tight group-hover:translate-x-1 transition-transform">
                              {b.business_name}
                            </div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                              @{b.instagram_handle?.replace('@', '') || "no_handle"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                             {b.email}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-gray-400 font-medium italic">
                             {b.phone || "---"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 text-center">
                        <Badge className={`${STATUS_COLORS[b.onboarding_status] || "bg-gray-100 text-gray-700"} px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-none`}>
                          {b.onboarding_status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-white group-hover:border-[#FE7F2D]/30 transition-colors">
                              <Clock className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#FE7F2D]" />
                           </div>
                           <span className="text-xs font-bold text-gray-500 group-hover:text-gray-900 transition-colors">{timeAgo(b.updated_at || b.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6">
                        <div className="flex justify-end">
                           <div className="w-10 h-10 rounded-full flex items-center justify-center group-hover:bg-[#FE7F2D] group-hover:text-white transition-all transform group-hover:-rotate-45">
                              <ChevronRight className="w-6 h-6" />
                           </div>
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
    </div>
  )
}

