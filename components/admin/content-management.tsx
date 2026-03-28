"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { adminAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import {
  HelpCircle,
  Info,
  Plus,
  RefreshCcw,
  Save,
  Settings,
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

  useEffect(() => {
    fetchContent()
  }, [])

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

  if (loading) return (
    <div className="flex items-center justify-center p-32">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D]"></div>
    </div>
  )

  return (
    <div className="space-y-10 pb-24 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-4 text-[#010307] lowercase italic">
            <Settings className="w-8 h-8 text-[#FE7F2D]" />
            platform content
          </h2>
          <p className="text-[#010307]/40 font-medium italic mt-1 text-sm lowercase">
            manage legal documents, terms, and faqs shown across the app.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchContent}
            variant="outline"
            className="rounded-xl h-12 font-black uppercase text-[10px] tracking-widest border-gray-100"
          >
            <RefreshCcw className="w-4 h-4 mr-2" /> Discard Changes
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#FE7F2D] text-white hover:bg-black rounded-xl h-12 font-black uppercase text-[10px] tracking-widest px-8 shadow-xl shadow-orange-500/20"
          >
            <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Public Content"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="contract" className="w-full">
        <TabsList className="bg-gray-50 border border-gray-100 p-1 w-full max-w-2xl rounded-2xl grid grid-cols-5 mb-8">
          <TabsTrigger value="contract" className="rounded-xl font-bold uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Contract</TabsTrigger>
          <TabsTrigger value="terms" className="rounded-xl font-bold uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">T&C</TabsTrigger>
          <TabsTrigger value="origins" className="rounded-xl font-bold uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Origins</TabsTrigger>
          <TabsTrigger value="faqs" className="rounded-xl font-bold uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">FAQs</TabsTrigger>
          <TabsTrigger value="protocols" className="rounded-xl font-bold uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Protocols</TabsTrigger>
        </TabsList>

        {/* CONTARCT */}
        <TabsContent value="contract" className="mt-0 outline-none space-y-6">
          <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex gap-4">
            <Info className="w-6 h-6 text-blue-500 shrink-0" />
            <div className="space-y-2">
              <h3 className="font-black text-blue-900 tracking-tight text-lg">Contract Template Variables</h3>
              <p className="text-blue-700 font-medium italic text-sm">
                Use variables exactly as shown to auto-fill brand details: <code className="bg-white px-2 py-0.5 rounded font-mono text-blue-600 font-bold mx-1">{'{'}{'{'}BRAND_NAME{'}'}{'}'}</code>, <code className="bg-white px-2 py-0.5 rounded font-mono text-blue-600 font-bold mx-1">{'{'}{'{'}BRAND_EMAIL{'}'}{'}'}</code>, <code className="bg-white px-2 py-0.5 rounded font-mono text-blue-600 font-bold mx-1">{'{'}{'{'}BRAND_PHONE{'}'}{'}'}</code>.
              </p>
            </div>
          </div>
          <Card className="border border-black/5 shadow-sm rounded-[2.5rem] bg-white overflow-hidden p-8">
            <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest mb-4 block">Partnership Agreement Template</Label>
            <Textarea
              value={contractTemplate}
              onChange={(e) => setContractTemplate(e.target.value)}
              className="min-h-[600px] font-mono whitespace-pre-wrap bg-gray-50/50 border-gray-100 rounded-2xl md:text-sm leading-relaxed"
            />
          </Card>
        </TabsContent>

        {/* TERMS */}
        <TabsContent value="terms" className="mt-0 outline-none space-y-6">
          <Card className="border border-black/5 shadow-sm rounded-[2.5rem] bg-white overflow-hidden p-8">
            <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest mb-4 block">Platform Terms & Conditions (Markdown Supported)</Label>
            <Textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="min-h-[500px] font-mono bg-gray-50/50 border-gray-100 rounded-2xl md:text-sm leading-relaxed"
            />
          </Card>
        </TabsContent>

        {/* ORIGINS / ABOUT */}
        <TabsContent value="origins" className="mt-0 outline-none">
          <Card className="border border-gray-100 shadow-sm rounded-[2rem] overflow-hidden">
            <div className="p-8 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-[#FE7F2D]">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black lowercase italic text-xl">our origins (pitch)</h4>
                  <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">this narrative is shown on the brand dashboard pitch tab.</p>
                </div>
              </div>
              <Textarea
                value={origins}
                onChange={(e) => setOrigins(e.target.value)}
                placeholder="Tell the story of how THC Club started..."
                className="min-h-[500px] border-gray-100 font-medium italic lowercase text-[#010307]/70 rounded-2xl leading-relaxed p-8 focus:ring-[#FE7F2D]/20"
              />
            </div>
          </Card>
        </TabsContent>

        {/* FAQS */}
        <TabsContent value="faqs" className="mt-0 outline-none space-y-6">
          <div className="flex justify-between items-center bg-gray-50/50 border border-gray-100 p-8 rounded-[2.5rem]">
            <div>
              <h3 className="text-xl font-black lowercase italic tracking-tight text-[#010307]">manage faqs</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">These appear in the brand portal / onboarding guide.</p>
            </div>
            <Button onClick={handleAddFaq} className="bg-black text-white hover:bg-[#FE7F2D] rounded-xl font-black uppercase text-[10px] tracking-widest h-12 px-6">
              <Plus className="w-4 h-4 mr-2" /> Add Question
            </Button>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <Card key={idx} className="p-6 border border-gray-100 shadow-sm rounded-3xl relative group">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFaq(idx)}
                  className="absolute right-4 top-4 text-red-300 hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
                <div className="space-y-6 pr-10">
                  <div className="space-y-2">
                    <Label className="uppercase text-[9px] font-black text-[#FE7F2D] tracking-widest ml-2">Question {idx + 1}</Label>
                    <Input
                      value={faq.question}
                      onChange={(e) => handleUpdateFaq(idx, "question", e.target.value)}
                      placeholder="e.g., When are payouts transferred?"
                      className="font-bold text-lg border-gray-100 rounded-2xl h-14 bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase text-[9px] font-black text-gray-400 tracking-widest ml-2">Answer</Label>
                    <Textarea
                      value={faq.answer}
                      onChange={(e) => handleUpdateFaq(idx, "answer", e.target.value)}
                      placeholder="Clear, concise explanation..."
                      className="min-h-[100px] font-medium text-gray-600 border-gray-100 rounded-2xl bg-gray-50"
                    />
                  </div>
                </div>
              </Card>
            ))}
            {faqs.length === 0 && (
              <div className="text-center p-20 border-2 border-dashed border-gray-100 rounded-[3rem] text-gray-400">
                <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-300" />
                <p className="font-black uppercase tracking-widest text-xs italic">No FAQs configured</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* PROTOCOLS */}
        <TabsContent value="protocols" className="mt-0 outline-none space-y-6">
          <div className="flex justify-between items-center bg-gray-50/50 border border-gray-100 p-8 rounded-[2.5rem]">
            <div>
              <h3 className="text-xl font-black lowercase italic tracking-tight text-[#010307]">the club protocols</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Foundational rules shown during onboarding.</p>
            </div>
            <Button onClick={handleAddProtocol} className="bg-black text-white hover:bg-[#FE7F2D] rounded-xl font-black uppercase text-[10px] tracking-widest h-12 px-6">
              <Plus className="w-4 h-4 mr-2" /> Add Protocol Section
            </Button>
          </div>

          <div className="space-y-8">
            {protocols.map((p, pIdx) => (
              <Card key={pIdx} className="p-8 border border-gray-100 shadow-sm rounded-[2rem] relative bg-white">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveProtocol(pIdx)}
                  className="absolute right-6 top-6 text-red-300 hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>

                <div className="space-y-6">
                  <div className="space-y-2 max-w-md">
                    <Label className="uppercase text-[9px] font-black text-[#FE7F2D] tracking-widest ml-2">Section Title</Label>
                    <Input
                      value={p.title}
                      onChange={(e) => handleUpdateProtocolTitle(pIdx, e.target.value)}
                      placeholder="e.g., 01. economics"
                      className="font-black text-xl border-gray-100 rounded-2xl h-14 bg-gray-50 placeholder:italic placeholder:font-normal"
                    />
                  </div>

                  <div className="space-y-4">
                    <Label className="uppercase text-[9px] font-black text-gray-400 tracking-widest ml-2">Rules / Points</Label>
                    <div className="space-y-3">
                      {p.items.map((item, iIdx) => (
                        <div key={iIdx} className="flex gap-3">
                          <Input
                            value={item}
                            onChange={(e) => handleUpdateProtocolItem(pIdx, iIdx, e.target.value)}
                            placeholder="Add rule..."
                            className="bg-gray-50/50 border-gray-100 rounded-xl font-medium text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveProtocolItem(pIdx, iIdx)}
                            className="text-gray-300 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddProtocolItem(pIdx)}
                        className="rounded-xl border-dashed border-gray-200 text-gray-400 hover:border-[#FE7F2D] hover:text-[#FE7F2D] font-bold text-[10px] uppercase tracking-widest w-full py-6 mt-2"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add Rule to {p.title || 'Section'}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {content && (
        <p className="text-center text-[9px] font-bold uppercase tracking-widest text-gray-300">
          Last updated by {content.updated_by || 'System'} on {new Date(content.updated_at).toLocaleString()}
        </p>
      )}
    </div>
  )
}
