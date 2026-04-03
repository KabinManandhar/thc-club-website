"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SafeImage } from "@/components/ui/safe-image"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { adminAuth } from "@/lib/auth"
import { StoreImage, supabase } from "@/lib/supabase"
import { cn, processImageFile } from "@/lib/utils"
import {
  Camera,
  Check,
  CheckCircle2,
  Edit2,
  ExternalLink,
  FileText,
  HelpCircle,
  History,
  Image as ImageIcon,
  Info,
  Plus,
  RefreshCcw,
  Save,
  Settings,
  Shield,
  Trash2
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export function ContentManagement() {
  const [content, setContent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Local state for editing
  const [contractTemplate, setContractTemplate] = useState("")
  const [terms, setTerms] = useState("")
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([])
  const [protocols, setProtocols] = useState<{ title: string; items: string[] }[]>([])
  const [origins, setOrigins] = useState("")

  // Store Gallery state
  const [storeImages, setStoreImages] = useState<StoreImage[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [newImageSection, setNewImageSection] = useState("")
  const [uploadingImage, setUploadingImage] = useState(false)

  // UI State
  const [activeTab, setActiveTab] = useState("contract")
  const [previewMode, setPreviewMode] = useState(false)

  // Gallery Edit state
  const [editingImageId, setEditingImageId] = useState<string | null>(null)
  const [editSectionValue, setEditSectionValue] = useState("")
  const [updatingMetadata, setUpdatingMetadata] = useState(false)

  useEffect(() => {
    fetchContent()
    fetchStoreImages()
    fetchSections()
  }, [])

  const fetchSections = async () => {
    const { data } = await supabase.from("shelf_sections").select("*")
    if (data) setSections(data)
  }

  const fetchStoreImages = async () => {
    const { data } = await supabase.from("store_images").select("*").order("created_at", { ascending: false })
    if (data) setStoreImages(data)
  }

  const fetchContent = async () => {
    setLoading(true)
    const { data } = await supabase.from("platform_content").select("*").eq("id", 1).single()
    if (data) {
      setContent(data)
      setContractTemplate(data.contract_template || "")
      setTerms(data.terms_conditions || "")
      setFaqs(data.faqs || [])
      setProtocols(data.protocols || [])
      setOrigins(data.origins || "")
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const user = await adminAuth.getCurrentUser()

      const { error } = await supabase.rpc("update_platform_content", {
        p_id: 1,
        p_contract_template: contractTemplate,
        p_terms_conditions: terms,
        p_faqs: faqs,
        p_protocols: protocols,
        p_origins: origins,
        p_updated_by: user?.name || "Admin",
      })

      if (error) throw error
      toast.success("Platform content updated successfully")
      fetchContent()
    } catch (err: any) {
      console.error("Content update error:", err)
      toast.error(err.message || "Failed to update content")
    } finally {
      setSaving(false)
    }
  }

  const handleAddFaq = () => {
    setFaqs([...faqs, { question: "", answer: "" }])
  }

  const handleUpdateFaq = (index: number, field: "question" | "answer", value: string) => {
    const newFaqs = [...faqs]
    newFaqs[index][field] = value
    setFaqs(newFaqs)
  }

  const handleRemoveFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index))
  }

  const handleAddProtocol = () => {
    setProtocols([...protocols, { title: "", items: [""] }])
  }

  const handleUpdateProtocolTitle = (index: number, title: string) => {
    const newProtocols = [...protocols]
    newProtocols[index].title = title
    setProtocols(newProtocols)
  }

  const handleUpdateProtocolItem = (pIndex: number, iIndex: number, value: string) => {
    const newProtocols = [...protocols]
    newProtocols[pIndex].items[iIndex] = value
    setProtocols(newProtocols)
  }

  const handleAddProtocolItem = (index: number) => {
    const newProtocols = [...protocols]
    newProtocols[index].items.push("")
    setProtocols(newProtocols)
  }

  const handleRemoveProtocolItem = (pIndex: number, iIndex: number) => {
    const newProtocols = [...protocols]
    newProtocols[pIndex].items = newProtocols[pIndex].items.filter((_, i) => i !== iIndex)
    setProtocols(newProtocols)
  }

  const handleRemoveProtocol = (index: number) => {
    setProtocols(protocols.filter((_, i) => i !== index))
  }

  const handleUploadGalleryImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!newImageSection) {
      toast.error("Please specify a section for the image")
      return
    }

    setUploadingImage(true)
    try {
      const processedFile = await processImageFile(file)
      const fileExt = processedFile.name.split('.').pop()
      const fileName = `store-gallery/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, processedFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName)

      // Use RPC to bypass RLS for admin gallery content
      const { data: dbData, error: dbError } = await supabase.rpc("admin_upload_store_image", {
        p_url: publicUrl,
        p_section: newImageSection,
      })

      if (dbError) throw dbError
      if (dbData && !dbData.success) throw new Error(dbData.error || "Failed to save image metadata")

      toast.success("Image added to store gallery")
      setNewImageSection("")
      fetchStoreImages()
    } catch (err: any) {
      console.error("Full Gallery Upload Error Diagnostics:", {
        message: err.message,
        name: err.name,
        stack: err.stack,
        code: err.code,
        statusCode: err.statusCode,
        details: err.details,
        raw: err
      })
      toast.error(err.message || "Failed to upload image")
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDeleteGalleryImage = async (id: string, url: string) => {
    if (!confirm("Are you sure you want to remove this image?")) return

    try {
      // Extract path from URL
      const path = url.split('/media/')[1]
      if (path) {
        await supabase.storage.from('media').remove([path])
      }

      const { error } = await supabase.from("store_images").delete().eq("id", id)
      if (error) throw error

      setStoreImages(prev => prev.filter(img => img.id !== id))
      toast.success("Image removed from gallery")
    } catch (err: any) {
      toast.error(err.message || "Failed to delete image")
    }
  }

  const handleUpdateImageSection = async (id: string) => {
    setUpdatingMetadata(true)
    try {
      const { error } = await supabase.from("store_images")
        .update({ section: editSectionValue })
        .eq("id", id)

      if (error) throw error

      setStoreImages(prev => prev.map(img => img.id === id ? { ...img, section: editSectionValue } : img))
      toast.success("Section updated")
      setEditingImageId(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to update category")
    } finally {
      setUpdatingMetadata(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center p-32">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D]"></div>
    </div>
  )

  return (
    <div className="pb-24">
      {/* Premium Header */}
      <div className="relative mb-8 py-8 px-8 bg-white border border-black/5 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FE7F2D]/5 rounded-full blur-[80px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FE7F2D]/5 rounded-full blur-[60px] -ml-24 -mb-24" />

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3 text-[#010307] lowercase italic leading-none">
              <span className="p-2.5 bg-[#FE7F2D]/10 rounded-xl">
                <Settings className="w-6 h-6 text-[#FE7F2D]" />
              </span>
              platform content
            </h2>
            <p className="text-[#010307]/40 font-medium italic text-sm lowercase max-w-xl">
              the foundational narrative. manage legal frameworks and visuals.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              onClick={fetchContent}
              variant="ghost"
              className="flex-1 md:flex-none rounded-xl h-11 font-black uppercase text-[9px] tracking-widest text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Discard
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 md:flex-none bg-[#FE7F2D] text-white hover:bg-black rounded-xl h-11 font-black uppercase text-[9px] tracking-widest px-8 shadow-xl shadow-orange-500/10 active:scale-95 transition-all"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" /> {saving ? "Syncing..." : "PublishChanges"}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="contract" onValueChange={setActiveTab} className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <TabsList className="flex flex-col h-auto bg-transparent border-none p-0 space-y-2">
              {[
                { id: "contract", label: "Partnership Contract", icon: FileText },
                { id: "terms", label: "Terms & Conditions", icon: Shield },
                { id: "origins", label: "The Origin Pitch", icon: History },
                { id: "faqs", label: "Help & FAQs", icon: HelpCircle },
                { id: "protocols", label: "Club Protocols", icon: CheckCircle2 },
                { id: "gallery", label: "Store Gallery", icon: ImageIcon },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "flex items-center justify-start gap-4 px-5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all w-full text-left",
                    "data-[state=active]:bg-[#010307] data-[state=active]:text-white data-[state=active]:shadow-lg active:scale-95",
                    "hover:bg-gray-100/50 text-gray-400"
                  )}
                >
                  <tab.icon className={cn("w-3.5 h-3.5", activeTab === tab.id ? "text-[#FE7F2D]" : "text-gray-300")} />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="p-6 bg-[#FE7F2D]/5 rounded-[2rem] border border-[#FE7F2D]/10 mt-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#FE7F2D] mb-2">Live Status</p>
              <p className="text-xs text-[#010307]/60 font-medium italic lowercase leading-relaxed">
                changes published here will be instantly visible to all brands and visitors.
              </p>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 space-y-8 min-h-[600px]">
            {/* CONTRACT */}
            <TabsContent value="contract" className="mt-0 outline-none space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-blue-50/50 p-6 rounded-[1.5rem] border border-blue-100 flex gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <Info className="w-5 h-5 text-blue-500 shrink-0" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-blue-900 tracking-tight text-lg lowercase italic leading-none">Template Variables</h3>
                  <p className="text-blue-700/60 font-medium italic text-xs">
                    Use handles. available:
                    <code className="bg-white/80 px-2 py-0.5 rounded font-mono text-blue-600 font-bold ml-2">{"{{"}BRAND_NAME{"}}"}</code>
                    <code className="bg-white/80 px-2 py-0.5 rounded font-mono text-blue-600 font-bold ml-2">{"{{"}BRAND_EMAIL{"}}"}</code>
                    <code className="bg-white/80 px-2 py-0.5 rounded font-mono text-blue-600 font-bold ml-2">{"{{"}BRAND_PHONE{"}}"}</code>
                  </p>
                </div>
              </div>
              <Card className="border border-black/5 shadow-sm rounded-[2rem] bg-white overflow-hidden">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center pr-2">
                    <Label className="uppercase text-[9px] font-black text-gray-400 tracking-widest">legal template engine</Label>
                  </div>
                  <Textarea
                    value={contractTemplate}
                    onChange={(e) => setContractTemplate(e.target.value)}
                    className="min-h-[400px] font-mono whitespace-pre-wrap bg-gray-50/30 border-gray-100 rounded-[1.5rem] text-sm leading-relaxed p-6 focus:ring-[#FE7F2D]/10"
                  />
                </div>
              </Card>
            </TabsContent>

            {/* TERMS */}
            <TabsContent value="terms" className="mt-0 outline-none animate-in fade-in slide-in-from-right-4 duration-500">
              <Card className="border border-black/5 shadow-sm rounded-[3rem] bg-white overflow-hidden p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black lowercase italic text-[#010307]">terms & conditions</h3>
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">Platform governance for all collective members.</p>
                  </div>
                </div>
                <Textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="min-h-[600px] font-mono bg-gray-50/30 border-gray-100 rounded-[2rem] text-sm leading-relaxed p-8 focus:ring-[#FE7F2D]/10"
                />
              </Card>
            </TabsContent>

            {/* ORIGINS */}
            <TabsContent value="origins" className="mt-0 outline-none animate-in fade-in slide-in-from-right-4 duration-500">
              <Card className="border border-black/5 shadow-sm rounded-[3rem] bg-white overflow-hidden p-8 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-[#FE7F2D]">
                      <History className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black lowercase italic text-[#010307]">the founder's pitch</h3>
                      <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest italic">The 'Born from the Hustle' narrative.</p>
                    </div>
                  </div>
                </div>
                <Textarea
                  value={origins}
                  onChange={(e) => setOrigins(e.target.value)}
                  placeholder="Tell the story of how THC Club started..."
                  className="min-h-[600px] border-none bg-gray-50/30 font-medium italic lowercase text-[#010307]/70 rounded-[2rem] leading-relaxed p-10 focus:ring-0 text-xl shadow-inner"
                />
              </Card>
            </TabsContent>

            {/* FAQS */}
            <TabsContent value="faqs" className="mt-0 outline-none space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex justify-between items-center bg-gray-50/50 border border-gray-100 p-10 rounded-[3rem]">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black lowercase italic tracking-tight text-[#010307]">knowledge base</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">Curate helpful responses for brands.</p>
                </div>
                <Button onClick={handleAddFaq} className="bg-black text-white hover:bg-[#FE7F2D] rounded-2xl font-black uppercase text-[10px] tracking-widest h-14 px-8 shadow-xl transition-all">
                  <Plus className="w-4 h-4 mr-2" /> Add Question
                </Button>
              </div>

              <div className="space-y-6">
                {faqs.map((faq, idx) => (
                  <Card key={idx} className="p-8 border border-gray-100 shadow-sm rounded-[2.5rem] relative group bg-white hover:border-[#FE7F2D]/20 transition-all">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFaq(idx)}
                      className="absolute right-6 top-6 text-gray-200 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                    <div className="space-y-6 pr-10">
                      <div className="space-y-3">
                        <Label className="uppercase text-[9px] font-black text-[#FE7F2D] tracking-widest ml-4">Question {idx + 1}</Label>
                        <Input
                          value={faq.question}
                          onChange={(e) => handleUpdateFaq(idx, "question", e.target.value)}
                          placeholder="What if I miss a payout?"
                          className="font-black text-xl border-gray-50 rounded-2xl h-16 bg-gray-50/50 px-6 focus:bg-white"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label className="uppercase text-[9px] font-black text-gray-400 tracking-widest ml-4">Answer</Label>
                        <Textarea
                          value={faq.answer}
                          onChange={(e) => handleUpdateFaq(idx, "answer", e.target.value)}
                          placeholder="Describe the solution clearly."
                          className="min-h-[140px] font-medium text-gray-500 border-gray-50 rounded-2xl bg-gray-50/50 px-6 py-4 focus:bg-white leading-relaxed italic"
                        />
                      </div>
                    </div>
                  </Card>
                ))}

                {faqs.length === 0 && (
                  <div className="text-center py-40 border-2 border-dashed border-gray-100 rounded-[4rem] text-gray-300">
                    <HelpCircle className="w-16 h-16 mx-auto mb-6 opacity-30" />
                    <p className="font-black uppercase tracking-widest text-xs italic">the knowledge base is currently empty</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* PROTOCOLS */}
            <TabsContent value="protocols" className="mt-0 outline-none space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex justify-between items-center bg-gray-50/50 border border-gray-100 p-10 rounded-[3rem]">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black lowercase italic tracking-tight text-[#010307]">the club protocols</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">Foundational rules for collective survival.</p>
                </div>
                <Button onClick={handleAddProtocol} className="bg-black text-white hover:bg-[#FE7F2D] rounded-2xl font-black uppercase text-[10px] tracking-widest h-14 px-8 shadow-xl transition-all">
                  <Plus className="w-4 h-4 mr-2" /> New Protocol Group
                </Button>
              </div>

              <div className="space-y-10">
                {protocols.map((p, pIdx) => (
                  <Card key={pIdx} className="p-10 border border-gray-100 shadow-sm rounded-[3rem] relative bg-white group overflow-hidden">
                    <div className="absolute top-0 right-0 w-2 h-full bg-[#FE7F2D]/10" />

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveProtocol(pIdx)}
                      className="absolute right-8 top-8 text-gray-200 hover:text-red-500 transition-all z-10"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>

                    <div className="space-y-10">
                      <div className="space-y-3 max-w-sm">
                        <Label className="uppercase text-[9px] font-black text-[#FE7F2D] tracking-widest ml-4 italic">group title</Label>
                        <Input
                          value={p.title}
                          onChange={(e) => handleUpdateProtocolTitle(pIdx, e.target.value)}
                          placeholder="e.g., 01. economics"
                          className="font-black text-2xl border-none bg-transparent h-auto p-0 focus:ring-0 lowercase italic"
                        />
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-4 mb-2">
                          <Label className="uppercase text-[9px] font-black text-gray-400 tracking-widest italic grow">specific protocol directives</Label>
                        </div>
                        <div className="space-y-4">
                          {p.items.map((item, iIdx) => (
                            <div key={iIdx} className="flex gap-4 group/item">
                              <div className="flex-none pt-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#FE7F2D]/40 mt-1" />
                              </div>
                              <Input
                                value={item}
                                onChange={(e) => handleUpdateProtocolItem(pIdx, iIdx, e.target.value)}
                                placeholder="State the rule..."
                                className="bg-gray-50/50 border-transparent rounded-2xl font-medium text-sm h-12 px-6 focus:bg-white focus:border-gray-100 transition-all italic"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveProtocolItem(pIdx, iIdx)}
                                className="opacity-0 group-hover/item:opacity-100 transition-opacity text-gray-300 hover:text-red-500 shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            onClick={() => handleAddProtocolItem(pIdx)}
                            className="rounded-2xl border-dashed border-gray-200 text-gray-400 hover:border-[#FE7F2D] hover:text-[#FE7F2D] font-bold text-[10px] uppercase tracking-widest w-full py-8 mt-4 bg-gray-50/30 transition-all"
                          >
                            <Plus className="w-4 h-4 mr-2" /> Add Protocol to {p.title || 'Group'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* GALLERY */}
            <TabsContent value="gallery" className="mt-0 outline-none space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#010307] p-10 rounded-[3rem] gap-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#FE7F2D]/10 rounded-full blur-[80px] -mr-32 -mt-32" />

                <div className="space-y-2 relative z-10">
                  <h3 className="text-3xl font-black lowercase italic tracking-tight text-white">store <span className="text-[#FE7F2D]">curation</span></h3>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Add high-fidelity visuals to the platform.</p>
                </div>

                <div className="flex flex-wrap items-center gap-6 w-full md:w-auto relative z-10">
                  <div className="flex-1 md:w-64 space-y-2">
                    <Label className="uppercase text-[8px] font-black text-white/40 tracking-widest ml-2 block">Zone Context</Label>
                    <select
                      value={newImageSection}
                      onChange={(e) => setNewImageSection(e.target.value)}
                      className="w-full rounded-2xl h-14 bg-white/5 border-white/10 text-white font-black text-sm px-6 focus:bg-white/10 focus:border-[#FE7F2D]/50 outline-none appearance-none cursor-pointer italic"
                    >
                      <option value="" className="bg-[#010307] text-white/40">Select Zone...</option>
                      {sections.map(sec => (
                        <option key={sec.id} value={sec.name} className="bg-[#010307] text-white">
                          {sec.name} ({sec.section_tier})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-auto">
                    <input
                      type="file"
                      id="gallery-upload"
                      className="hidden"
                      onChange={handleUploadGalleryImage}
                      accept="image/*,.heic,.heif"
                    />
                    <Button
                      onClick={() => document.getElementById('gallery-upload')?.click()}
                      disabled={uploadingImage || !newImageSection}
                      className="bg-[#FE7F2D] text-white hover:bg-white hover:text-black rounded-2xl h-14 px-10 font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-orange-500/20 active:scale-95 transition-all"
                    >
                      <Camera className="w-4 h-4 mr-2" /> {uploadingImage ? "Processing..." : "Select & Upload"}
                    </Button>
                  </div>
                </div>
              </div>

              <Card className="border border-black/5 shadow-sm rounded-[2rem] bg-white overflow-hidden p-6">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-gray-100 text-[9px] font-black uppercase tracking-widest text-gray-400">
                      <TableHead className="w-[80px]">Thumb</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storeImages.map((img) => (
                      <TableRow key={img.id} className="group border-gray-50 hover:bg-gray-50/50 transition-all h-20">
                        <TableCell>
                          <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm relative group/btn">
                            <SafeImage
                              src={img.url}
                              alt={img.section}
                              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                              loading="lazy"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {editingImageId === img.id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={editSectionValue}
                                onChange={(e) => setEditSectionValue(e.target.value)}
                                className="h-8 rounded-lg bg-gray-50 border-gray-100 px-2 text-[10px] font-bold lowercase italic outline-none"
                              >
                                {sections.map(sec => (
                                  <option key={sec.id} value={sec.name}>{sec.name}</option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateImageSection(img.id)}
                                disabled={updatingMetadata}
                                className="h-8 w-8 rounded-lg p-0"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-black italic lowercase text-sm text-[#010307]">{img.section}</span>
                              <Edit2
                                onClick={() => {
                                  setEditingImageId(img.id)
                                  setEditSectionValue(img.section)
                                }}
                                className="w-3 h-3 text-gray-200 cursor-pointer hover:text-[#FE7F2D] opacity-0 group-hover:opacity-100"
                              />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={img.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-blue-50 text-gray-200 hover:text-blue-500"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <Trash2
                              onClick={() => handleDeleteGalleryImage(img.id, img.url)}
                              className="w-3.5 h-3.5 text-gray-200 cursor-pointer hover:text-red-500"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {storeImages.length === 0 && (
                  <div className="py-48 text-center bg-gray-50/50 rounded-[4rem] italic text-gray-300">
                    <ImageIcon className="w-16 h-16 mx-auto mb-6 opacity-20" />
                    <p className="font-black uppercase tracking-widest text-[10px]">visual archive is currently empty</p>
                  </div>
                )}
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {content && (
        <div className="mt-20 flex flex-col items-center gap-4">
          <div className="h-px w-24 bg-[#FE7F2D]/20" />
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-300 flex items-center gap-3">
            <History className="w-3 h-3" />
            sync log: last updated by {content.updated_by || 'Council'} • {new Date(content.updated_at).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  )
}
