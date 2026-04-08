import { BrandSalesReport } from "@/components/club/brand-sales-report"
import { ShelfTransactions } from "@/components/shared/shelf-transactions"
import { SimplifiedPayoutTracker } from "@/components/shared/simplified-payout-tracker"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SafeImage } from "@/components/ui/safe-image"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { supabase, type Brand, type BrandChangeRequest, type BrandContract, type BrandProduct, type Enquiry, type Invoice, type ShelfBooking, type VisitRequest } from "@/lib/supabase"
import { generateSKU, processImageFile } from "@/lib/utils"
import { AlertCircle, ArrowLeft, BarChart3, Calendar, Check, ChevronRight, Clock, X as CloseX, DollarSign, FileText, History, Image as ImageIcon, Info, Instagram, LayoutGrid, Mail, MessageSquare, Package, Phone, Search, ShieldCheck, StickyNote, Trash2, TrendingUp, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

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
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchBrands()
  }, [])

  const handleDeleteBrand = async () => {
    if (!selectedBrand) return
    setProcessingId(selectedBrand.id)
    try {
      console.log('[delete_brand] Attempting to delete brand:', selectedBrand.id, selectedBrand.business_name)
      const { data, error } = await supabase.rpc('delete_brand_entirely', {
        p_brand_id: selectedBrand.id
      })
      if (error) {
        console.error('[delete_brand] RPC error object:', error)
        throw new Error(JSON.stringify(error) || 'RPC call failed with an unknown error.')
      }
      console.log('[delete_brand] Success:', data)
      toast.success("Brand completely wiped from all records.")
      setView("list")
      setSelectedBrand(null)
      fetchBrands()
    } catch (err: any) {
      console.error('[delete_brand] Caught error:', err)
      toast.error(typeof err === "string" ? err : err?.message || "Failed to delete brand. Check browser console for details.")
    } finally {
      setProcessingId(null)
    }
  }

  const fetchBrands = async () => {
    const { data: brandsRes } = await supabase
      .from("brands")
      .select("*")
      .order("updated_at", { ascending: false })
    
    // Fetch total stock value across all brands efficiently
    const { data: stockData } = await supabase
      .from("brand_products")
      .select("brand_id, stock_quantity, price")

    const stockSummary: Record<string, number> = {}
    stockData?.forEach(p => {
      stockSummary[p.brand_id] = (stockSummary[p.brand_id] || 0) + ((p.stock_quantity * p.price) || 0)
    })

    const brandsWithStock = (brandsRes || []).map(b => ({
      ...b,
      total_stock_value: stockSummary[b.id] || 0
    }))

    setBrands(brandsWithStock)
    setLoading(false)
  }

  const loadBrandDetails = async (brand: Brand) => {
    setLoadingDetails(true)
    try {
      const [productsRes, invoicesRes, bookingsRes, enquiriesRes, visitsRes, changesRes, contractsRes] = await Promise.all([
        supabase.from("brand_products").select("*").eq("brand_id", brand.id).order("name", { ascending: true }),
        supabase.from("invoices").select("*").eq("brand_id", brand.id).order("created_at", { ascending: false }),
        supabase.from("shelf_bookings").select("*").eq("brand_id", brand.id).order("created_at", { ascending: false }),
        supabase.from("enquiries").select("*").eq("brand_id", brand.id).order("created_at", { ascending: false }),
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

      fetchInventoryLogs(brand.id)
    } catch (err) {
      console.error("Error fetching brand details:", err)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleBrandSelect = async (brand: Brand) => {
    setSelectedBrand(brand)
    setView("detail")
    await loadBrandDetails(brand)
  }

  const fetchInventoryLogs = async (brandId: string) => {
    setLoadingLogs(true)
    try {
      const { data } = await supabase
        .from("product_stock_logs")
        .select("*, brand_products(name)")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false })
      setInventoryLogs(data || [])
    } catch (err) {
      console.error("Error fetching stock logs:", err)
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to remove this product? This will also remove its sales history and stock logs association.")) return
    
    setProcessingId(productId)
    try {
      const { error } = await supabase.rpc('admin_delete_product', { p_product_id: productId })
      if (error) throw error
      
      toast.success("Product removed from catalog.")
      if (selectedBrand) await loadBrandDetails(selectedBrand)
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product")
    } finally {
      setProcessingId(null)
    }
  }

  const handleApproval = async (request: BrandChangeRequest, action: 'approve' | 'reject') => {
    setProcessingId(request.id)
    try {
      let sku = request.new_data?.sku
      if (!sku && request.request_type === 'product_add') {
        sku = generateSKU(selectedBrand?.business_name || "BRD", request.new_data?.name || "PRD")
      }

      const { error } = await supabase.rpc('admin_process_change_request_atomic', {
        p_request_id: request.id,
        p_action: action,
        p_sku_if_missing: sku || null
      })

      if (error) throw error

      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`)

      // Refresh details
      if (selectedBrand) await loadBrandDetails(selectedBrand)
    } catch (err: any) {
      toast.error(err.message || 'Failed to process request')
    } finally {
      setProcessingId(null)
    }
  }

  const updateBrandCRM = async (data: Partial<Brand>) => {
    if (!selectedBrand) return
    try {
      const { error } = await supabase.rpc('admin_update_brand_crm', {
        p_brand_id: selectedBrand.id,
        p_admin_notes: data.admin_notes !== undefined ? data.admin_notes : selectedBrand.admin_notes,
        p_onboarding_status: data.onboarding_status !== undefined ? data.onboarding_status : selectedBrand.onboarding_status
      })

      if (error) throw error
      setSelectedBrand({ ...selectedBrand, ...data })
      toast.success('CRM Record Updated Successfully')
      fetchBrands() // refresh the list
    } catch (err: any) {
      toast.error(err.message || 'Failed to update CRM data')
    }
  }

  const uploadContract = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedBrand) return

    try {
      const processedFile = await processImageFile(file)
      const fileExt = processedFile.name.split('.').pop()
      const fileName = `contracts/${selectedBrand.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, processedFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName)

      // Use RPC to bypass RLS for admin manual upload
      const { error: dbError } = await supabase.rpc('admin_upload_contract', {
        p_brand_id: selectedBrand.id,
        p_file_url: publicUrl,
        p_contract_type: 'manual_physical',
        p_status: 'signed',
        p_ip_note: `Admin Manual Upload: ${selectedBrand.business_name} Physical Agreement Recorded.`
      })

      if (dbError) throw dbError

      // Refresh contracts
      const { data } = await supabase.from('brand_contracts').select('*').eq('brand_id', selectedBrand.id).order('created_at', { ascending: false })
      setContracts(data || [])
      toast.success('Contract uploaded successfully.')
      fetchBrands()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const deleteContract = async (contract: any) => {
    if (!confirm('Are you sure you want to delete this contract? This will also remove the file from storage.')) return

    try {
      // 1. Delete from storage if file_url exists
      if (contract.file_url) {
        // Extract storage path from public URL
        const path = contract.file_url.split('/media/')[1]
        if (path) {
          await supabase.storage.from('media').remove([path])
        }
      }

      // 2. Delete database record
      const { error } = await supabase.rpc('admin_delete_contract', { p_contract_id: contract.id })
      if (error) throw error

      toast.success('Contract deleted.')
      // Refresh list
      if (selectedBrand) {
        const { data } = await supabase.from('brand_contracts').select('*').eq('brand_id', selectedBrand.id).order('created_at', { ascending: false })
        setContracts(data || [])
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete contract')
    }
  }

  const filtered = brands.filter(
    (b) =>
      b.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pendingBrands = filtered.filter((b) => b.onboarding_status === "pending")
  const activeBrands = filtered.filter((b) => b.onboarding_status !== "pending")

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
                  <Badge className="bg-orange-50 text-[#FE7F2D] border border-[#FE7F2D]/10 px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-[9px] shadow-sm ml-auto md:ml-2 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    Shelf Value: NPR {(selectedBrand.total_stock_value || 0).toLocaleString()}
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

          <Tabs defaultValue="info" orientation="vertical" className="flex-1 flex flex-col md:flex-row h-full items-stretch">
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-black/5 bg-gray-50/50 p-6 shrink-0 block overflow-x-auto md:overflow-y-auto">
              <TabsList className="flex flex-row md:flex-col justify-start bg-transparent p-0 h-auto gap-2 w-max md:w-full items-start">
                {[
                  { id: 'info', label: 'Brand Profile', icon: <Package className="w-4 h-4 mr-3" /> },
                  { id: 'crm', label: 'CRM (Admin)', icon: <ShieldCheck className="w-4 h-4 mr-3" /> },
                  { id: 'changes', label: 'Requests', count: changeRequests.length, icon: <Check className="w-4 h-4 mr-3" /> },
                  { id: 'products', label: 'Inventory', count: products.length, icon: <LayoutGrid className="w-4 h-4 mr-3" /> },
                  { id: 'sales_history', label: 'Sales History', count: invoices.length, icon: <ArrowLeft className="w-4 h-4 mr-3" /> },
                  { id: 'performance_analysis', label: 'Performance Report', icon: <BarChart3 className="w-4 h-4 mr-3" /> },
                  { id: 'payouts', label: 'EOM Payouts', icon: <DollarSign className="w-4 h-4 mr-3" /> },
                  { id: 'transactions', label: 'Shelf Ledger', icon: <StickyNote className="w-4 h-4 mr-3" /> },
                  { id: 'inventory_logs', label: 'Activity Logs', icon: <History className="w-4 h-4 mr-3" /> },
                  { id: 'contracts', label: 'Contracts', count: contracts.length, icon: <FileText className="w-4 h-4 mr-3" /> },
                  { id: 'enquiries', label: 'Enquiries', count: enquiries.length, icon: <MessageSquare className="w-4 h-4 mr-3" /> },
                  { id: 'danger', label: 'Danger Zone', icon: <Trash2 className="w-4 h-4 mr-3 text-red-500" /> },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="data-[state=active]:bg-white data-[state=active]:text-[#FE7F2D] data-[state=active]:shadow-sm border border-transparent hover:bg-black/5 w-full justify-start rounded-xl px-4 py-3 font-black uppercase tracking-widest text-[9px] transition-all relative group h-auto"
                  >
                    {tab.icon}
                    <span className="truncate">{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="ml-auto bg-[#FE7F2D] text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[8px]">
                        {tab.count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 p-8 md:p-10 overflow-y-auto bg-white/50 h-full">
              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4 h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D]"></div>
                  <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Crunching database...</p>
                </div>
              ) : (
                <div className="max-w-[1400px] h-full">
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
                              <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider leading-none mb-1">Total Brand Revenue</p>
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
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                                    {Object.entries(request.new_data || {}).map(([key, value]) => {
                                      if (key === 'image_url' && value) {
                                        return (
                                          <div key={key} className="col-span-2 flex items-center gap-4 py-2 border-b border-gray-100">
                                            <span className="text-[10px] font-black uppercase text-gray-400 w-24">Image</span>
                                            <SafeImage src={value as string} alt="preview" className="w-16 h-16 rounded-xl object-cover border" />
                                          </div>
                                        )
                                      }
                                      return (
                                        <div key={key} className="flex flex-col gap-1 py-2 border-b border-gray-100">
                                          <span className="text-[10px] font-black uppercase text-gray-400">{key.replace('_', ' ')}</span>
                                          <span className="text-sm font-bold text-gray-900">{String(value)}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
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

                  <TabsContent value="products" className="mt-0 outline-none space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="p-8 bg-orange-50/30 border border-orange-500/10 rounded-[2rem] shadow-sm group">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-[#FE7F2D] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-500/20 group-hover:scale-105 transition-transform">
                            <TrendingUp className="w-7 h-7" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-1">Total Stock Worth</p>
                            <h4 className="text-3xl font-black text-[#FE7F2D] tracking-tighter italic">NPR {(selectedBrand.total_stock_value || 0).toLocaleString()}</h4>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-8 bg-gray-50/50 border border-black/5 rounded-[2rem] shadow-sm group">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-white shadow-xl shadow-black/10 group-hover:scale-105 transition-transform">
                            <Package className="w-7 h-7" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-1">Catalog Depth</p>
                            <h4 className="text-3xl font-black text-gray-900 tracking-tighter italic">{products.length} Active SKUs</h4>
                          </div>
                        </div>
                      </Card>
                    </div>

                    <div className="table-responsive">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent text-gray-400 uppercase text-[10px] font-black whitespace-nowrap">
                            <TableHead className="px-4">Product</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Inventory Value</TableHead>
                            <TableHead className="text-right px-4">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.map(p => (
                            <TableRow key={p.id}>
                              <TableCell className="px-4">
                                <div className="flex items-center gap-3">
                                  {p.image_url ? (
                                    <SafeImage src={p.image_url} alt={p.name} className="w-8 h-8 rounded-lg object-cover bg-gray-100 border shadow-sm" />
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
                              <TableCell className="font-mono text-xs font-black text-[#FE7F2D] whitespace-nowrap">
                                NPR {(p.price * p.stock_quantity).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right px-4">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 font-black text-[10px] uppercase"
                                  onClick={() => handleDeleteProduct(p.id)}
                                  disabled={!!processingId}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" /> Remove
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="sales_history" className="mt-0 outline-none">
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


                  <TabsContent value="payouts" className="mt-0 outline-none">
                    <SimplifiedPayoutTracker brandId={selectedBrand.id} isAdmin={true} />
                  </TabsContent>

                  <TabsContent value="performance_analysis" className="mt-0 outline-none">
                    <BrandSalesReport brandId={selectedBrand.id} />
                  </TabsContent>

                  <TabsContent value="transactions" className="mt-0 outline-none">
                    <ShelfTransactions brandId={selectedBrand.id} isAdmin={true} />
                  </TabsContent>

                  <TabsContent value="inventory_logs" className="mt-0 outline-none">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-black lowercase italic tracking-tight text-gray-900 flex items-center gap-3">
                            <History className="w-6 h-6 text-[#FE7F2D]" />
                            Stock Activity Logs
                          </h3>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Full audit trail of stock movements.</p>
                        </div>
                        <Button 
                          onClick={() => fetchInventoryLogs(selectedBrand.id)}
                          variant="outline"
                          className="rounded-xl font-black uppercase text-[9px] tracking-widest h-10 px-4"
                          disabled={loadingLogs}
                        >
                          {loadingLogs ? "Syncing..." : "Refresh Logs"}
                        </Button>
                      </div>

                      <div className="bg-white rounded-[2rem] border border-black/5 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-gray-50/50">
                            <TableRow className="border-none whitespace-nowrap">
                              <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400">Date</TableHead>
                              <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400">Product</TableHead>
                              <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400">Type</TableHead>
                              <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400 text-center">Change</TableHead>
                              <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400 text-center">Final Stock</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loadingLogs ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-20 text-gray-400 font-bold lowercase italic animate-pulse">Syncing logs...</TableCell>
                              </TableRow>
                            ) : inventoryLogs.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-20 text-gray-400 font-bold lowercase italic">No logs found for this brand.</TableCell>
                              </TableRow>
                            ) : (
                              inventoryLogs.map((log) => (
                                <TableRow key={log.id} className="hover:bg-gray-50/50 border-gray-50 transition-colors">
                                  <TableCell className="px-6 py-4 text-[11px] font-bold text-gray-500 whitespace-nowrap">
                                    {new Date(log.created_at).toLocaleString()}
                                  </TableCell>
                                  <TableCell className="px-6 font-black text-[#010307] tracking-tight lowercase">
                                    {log.brand_products?.name || 'Unknown Product'}
                                  </TableCell>
                                  <TableCell className="px-6">
                                    <Badge variant="outline" className={`rounded-xl border-none font-black text-[8px] uppercase tracking-widest px-3 py-1 ${
                                      log.change_type === 'sale' ? 'text-green-600 bg-green-50' :
                                      log.change_type === 'admin_approval' ? 'text-blue-600 bg-blue-50' :
                                      'text-orange-600 bg-orange-50'
                                    }`}>
                                      {log.change_type.replace('_', ' ')}
                                    </Badge>
                                    {log.notes && <p className="text-[9px] text-gray-400 mt-1 max-w-[150px] truncate" title={log.notes}>{log.notes}</p>}
                                  </TableCell>
                                  <TableCell className="px-6 text-center">
                                    <span className={`font-black text-sm ${log.change_amount > 0 ? 'text-green-500' : log.change_amount < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                      {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                                    </span>
                                  </TableCell>
                                  <TableCell className="px-6 text-center font-black text-gray-900 text-sm">
                                    {log.new_stock}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
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

                  <TabsContent value="crm" className="mt-0 outline-none space-y-6">
                    <Card className="border-gray-100 shadow-sm rounded-[2rem] overflow-hidden">
                      <div className="p-8 space-y-8">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-black lowercase italic tracking-tight text-gray-900 flex items-center gap-3">
                              <ShieldCheck className="w-6 h-6 text-[#FE7F2D]" />
                              Internal CRM Controls
                            </h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Manage brand access and administrative lifecycle.</p>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Onboarding Vibe</label>
                            <div className="grid grid-cols-2 gap-2">
                              {['pending', 'slot_selected', 'active', 'rejected'].map((status) => (
                                <Button
                                  key={status}
                                  variant="outline"
                                  onClick={() => updateBrandCRM({ onboarding_status: status as any })}
                                  className={`rounded-xl h-12 font-black lowercase italic tracking-widest text-xs transition-all ${selectedBrand.onboarding_status === status
                                      ? 'bg-black text-white border-black scale-[1.02]'
                                      : 'text-gray-400 border-gray-100 hover:border-black/20'
                                    }`}
                                >
                                  {status.replace("_", " ")}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Member Status</label>
                            <div className="flex gap-3">
                              <Button
                                variant="outline"
                                onClick={() => updateBrandCRM({ is_active: true })}
                                className={`flex-1 rounded-xl h-12 font-black uppercase text-[10px] tracking-widest ${selectedBrand.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'text-gray-400'}`}
                              >
                                <Check className="w-4 h-4 mr-2" /> Active
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => updateBrandCRM({ is_active: false })}
                                className={`flex-1 rounded-xl h-12 font-black uppercase text-[10px] tracking-widest ${!selectedBrand.is_active ? 'bg-red-50 text-red-700 border-red-200' : 'text-gray-400'}`}
                              >
                                <CloseX className="w-4 h-4 mr-2" /> Blocked
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1 flex items-center gap-2">
                              <StickyNote className="w-3.5 h-3.5" />
                              Private Admin Notes
                            </label>
                            <Badge className="bg-orange-100 text-orange-700 border-none font-bold italic lowercase text-[10px] px-3 py-1">Visible to Admins Only</Badge>
                          </div>
                          <Textarea
                            placeholder="Internal notes about the brand..."
                            value={selectedBrand.admin_notes || ""}
                            onChange={(e) => setSelectedBrand({ ...selectedBrand, admin_notes: e.target.value })}
                            onBlur={() => updateBrandCRM({ admin_notes: selectedBrand.admin_notes })}
                            className="min-h-[200px] border-gray-100 bg-gray-50/30 rounded-2xl p-6 italic font-medium text-gray-700 focus:ring-[#FE7F2D]/20 focus:border-[#FE7F2D]/30"
                          />
                        </div>
                      </div>
                    </Card>
                  </TabsContent>

                  <TabsContent value="contracts" className="mt-0 outline-none space-y-6">
                    <div className="flex justify-between items-center bg-gray-50/50 border border-black/5 p-8 rounded-[2.5rem]">
                      <div>
                        <h3 className="text-xl font-black lowercase italic tracking-tight text-gray-900 flex items-center gap-3">
                          <FileText className="w-6 h-6 text-[#FE7F2D]" />
                          legal & contracts
                        </h3>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1 italic">manage signed agreements and partnership documents.</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="file"
                          id="contract-upload-final"
                          className="hidden"
                          onChange={uploadContract}
                          accept=".pdf,.doc,.docx,.jpg,.png,.heic,.heif"
                        />
                        <Button
                          onClick={() => document.getElementById('contract-upload-final')?.click()}
                          className="bg-[#FE7F2D] text-white hover:bg-black rounded-xl font-black uppercase text-[10px] tracking-widest h-12 px-8 shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                          <ImageIcon className="w-4 h-4" /> Upload Manual Contract
                        </Button>
                      </div>
                    </div>

                    {/* Digital Contract Helper Note */}
                    <div className="p-6 bg-blue-50/40 rounded-3xl border border-blue-100 flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-100/50 rounded-xl flex items-center justify-center shrink-0">
                        <Info className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-black text-blue-800 text-[10px] uppercase tracking-widest">Digital Contract Protocol</p>
                        <p className="text-xs text-blue-700 font-medium italic leading-relaxed">
                          Electronic agreements are signed by the brand via their portal. Once signed, they will automatically populate here as a "partnership agreement" for your final activation.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {contracts.map((contract) => (
                        <Card key={contract.id} className="p-8 border-gray-100 hover:border-[#FE7F2D]/30 transition-all rounded-[2rem] group bg-white shadow-sm space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-5">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${contract.contract_type === 'manual_physical' ? 'bg-blue-50 text-blue-500' : 'bg-gray-50 text-gray-400 group-hover:bg-[#FE7F2D]/10 group-hover:text-[#FE7F2D]'}`}>
                                <FileText className="w-7 h-7" />
                              </div>
                              <div>
                                <div className="font-black text-gray-900 lowercase italic tracking-tight text-xl mb-0.5 flex items-center gap-2">
                                  {contract.contract_type?.replace('_', ' ') || 'partnership agreement'}
                                  {contract.contract_type === 'manual_physical' && (
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none font-black uppercase text-[8px] tracking-widest px-2 py-0.5">Physical Scan</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Added {new Date(contract.created_at).toLocaleDateString()}</span>
                                  <Badge className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border-none ${contract.status === 'active' ? 'bg-black text-white' :
                                      contract.status === 'signed' ? 'bg-green-50 text-green-700' :
                                        'bg-gray-50 text-gray-500'
                                    }`}>
                                    {contract.status || 'active'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                variant="ghost"
                                className="rounded-xl h-10 px-5 font-black uppercase text-[9px] tracking-widest border border-gray-100 hover:bg-black hover:text-white"
                                asChild
                              >
                                <a href={contract.file_url} target="_blank" rel="noopener noreferrer">
                                  {contract.contract_type === 'manual_physical' ? 'View Scan' : 'View Doc'}
                                </a>
                              </Button>

                              {contract.status !== 'active' && (
                                <Button
                                  onClick={async () => {
                                    const { error: cntError } = await supabase.from('brand_contracts').update({ status: 'active' }).eq('id', contract.id)
                                    if (cntError) throw cntError
                                    const { error: brandError } = await supabase.from('brands').update({ onboarding_status: 'active' }).eq('id', selectedBrand.id)
                                    if (brandError) throw brandError
                                    toast.success('Contract activated & brand approved.')
                                    await loadBrandDetails(selectedBrand)
                                    fetchBrands()
                                  }}
                                  className="bg-[#FE7F2D] text-white hover:bg-black rounded-xl h-10 px-4 font-black uppercase text-[9px] tracking-widest"
                                >
                                  Activate
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                onClick={() => deleteContract(contract)}
                                className="w-10 h-10 p-0 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {(contract.signed_by || contract.stamp_number || contract.ip_note) && (
                            <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-gray-50">
                              {contract.signed_by && (
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Signed By</p>
                                  <p className="font-black text-gray-900 italic font-serif">{contract.signed_by}</p>
                                </div>
                              )}
                              {contract.signed_at && (
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Date Executed</p>
                                  <p className="font-bold text-gray-900 text-xs">{new Date(contract.signed_at).toLocaleDateString()}</p>
                                </div>
                              )}
                              {contract.stamp_number && (
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1">Stamp #</p>
                                  <p className="font-bold text-gray-900 text-xs">{contract.stamp_number}</p>
                                </div>
                              )}
                              {contract.ip_note && (
                                <div className="col-span-full bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                                  <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                  <p className="text-[10px] font-bold text-blue-700 italic">{contract.ip_note}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      ))}

                      {contracts.length === 0 && (
                        <div className="text-center py-20 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100 italic font-medium text-gray-400">
                          <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                          <p className="font-black lowercase tracking-tight text-lg">no legal documents staged</p>
                          <p className="text-[10px] uppercase font-bold tracking-[0.2em] mt-2">upload manual scans or wait for e-signature sync</p>
                        </div>
                      )}
                    </div>
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
                </div>
              )}
            </div>
          </Tabs>
        </div>
      </div>
    )
  }

  const BrandTable = ({ list }: { list: typeof brands }) => (
    <Table>
      <TableHeader className="bg-gray-50/50">
        <TableRow className="hover:bg-transparent border-none whitespace-nowrap">
          <TableHead className="w-[30%] px-6 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400">Brand Portfolio</TableHead>
          <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400">Communication</TableHead>
          <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400">Vibe Check</TableHead>
          <TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400">Shelf Value</TableHead>
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
        ) : list.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-24">
              <Users className="w-16 h-16 mx-auto text-gray-100 mb-6" />
              <p className="text-gray-500 font-black uppercase tracking-widest text-xs">No brands found matching your search.</p>
            </TableCell>
          </TableRow>
        ) : (
          list.map((b) => (
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
                <div className="flex flex-col">
                  <span className="text-xs font-black text-gray-900 leading-none">NPR {(b.total_stock_value || 0).toLocaleString()}</span>
                  <span className="text-[9px] text-gray-300 font-bold uppercase tracking-tighter mt-1">physical worth</span>
                </div>
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
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight">Brand CRM</h2>
          <p className="text-gray-500 font-bold">Manage membership lifecycle and vendor portfolio.</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingBrands.length > 0 && (
            <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-amber-700 bg-amber-50 px-5 py-3 rounded-2xl border border-amber-200 uppercase animate-pulse">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              {pendingBrands.length} Awaiting Approval
            </div>
          )}
          <div className="text-[10px] font-black tracking-[0.2em] text-[#FE7F2D] bg-[#FE7F2D]/10 px-6 py-3 rounded-2xl border border-[#FE7F2D]/20 uppercase">
            {activeBrands.length} Active Brands
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by brand name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 h-14 bg-white border border-black/5 focus:border-black shadow-sm transition-all rounded-xl font-bold"
        />
      </div>

      {/* Tabbed Sections */}
      <Tabs defaultValue={pendingBrands.length > 0 ? "pending" : "active"} className="w-full">
        <TabsList className="bg-transparent border-b border-gray-100 rounded-none w-full justify-start h-auto p-0 mb-0 gap-8">
          <TabsTrigger
            value="active"
            className="data-[state=active]:border-black data-[state=active]:border-b-2 data-[state=active]:text-black bg-transparent border-transparent rounded-none px-0 pb-4 font-black uppercase tracking-[0.2em] text-[10px] text-gray-400 flex items-center gap-2"
          >
            Active Brands
            <span className="bg-gray-900 text-white rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 text-[9px] font-black">
              {activeBrands.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="data-[state=active]:border-amber-500 data-[state=active]:border-b-2 data-[state=active]:text-amber-700 bg-transparent border-transparent rounded-none px-0 pb-4 font-black uppercase tracking-[0.2em] text-[10px] text-gray-400 flex items-center gap-2"
          >
            Pending Approval
            {pendingBrands.length > 0 && (
              <span className="bg-amber-500 text-white rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 text-[9px] font-black animate-pulse">
                {pendingBrands.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-0 outline-none">
          <Card className="border border-black/5 shadow-sm rounded-b-2xl rounded-tr-2xl overflow-hidden bg-white">
            <CardContent className="p-0">
              <div className="table-responsive">
                <BrandTable list={activeBrands} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-0 outline-none">
          {pendingBrands.length > 0 && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-t-2xl px-6 py-4">
              <div className="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white text-[9px] font-black">!</span>
              </div>
              <p className="text-[11px] font-bold text-amber-800 uppercase tracking-widest">
                These brands have registered but are awaiting your admin approval. Review their profile and approve or reject via the CRM tab.
              </p>
            </div>
          )}
          <Card className="border border-black/5 shadow-sm rounded-b-2xl overflow-hidden bg-white">
            <CardContent className="p-0">
              <div className="table-responsive">
                <BrandTable list={pendingBrands} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
