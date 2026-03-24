"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Shield, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Lock,
  History,
  Info,
} from "lucide-react"
import { FileUpload } from "@/components/ui/file-upload"
import { toast } from "sonner"

interface BrandLegalProps {
  brandId: string
}

export function BrandLegal({ brandId }: BrandLegalProps) {
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [newDocUrl, setNewDocUrl] = useState("")

  useEffect(() => {
    fetchContracts()
  }, [brandId])

  const fetchContracts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("brand_contracts")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false })
    
    setContracts(data || [])
    setLoading(false)
  }

  const handleUpload = async () => {
    if (!newDocUrl) {
      toast.error("Please upload a document first.")
      return
    }
    setUploading(true)
    try {
      const { error } = await supabase.from("brand_contracts").insert({
        brand_id: brandId,
        document_url: newDocUrl,
        type: "signed_agreement",
        status: "pending_review",
      })
      if (error) throw error
      toast.success("Signed agreement transmitted for verification.")
      setNewDocUrl("")
      fetchContracts()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
      case "verified":
        return <Badge className="bg-green-50 text-green-700 border-none font-black uppercase text-[8px] px-2 py-0.5 tracking-widest">Active Agreement</Badge>
      case "pending_review":
        return <Badge className="bg-orange-50 text-orange-700 border-none font-black uppercase text-[8px] px-2 py-0.5 tracking-widest">Awaiting Verification</Badge>
      case "expired":
        return <Badge className="bg-red-50 text-red-700 border-none font-black uppercase text-[8px] px-2 py-0.5 tracking-widest">Expired</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-500 border-none font-black uppercase text-[8px] px-2 py-0.5 tracking-widest">{status}</Badge>
    }
  }

  return (
    <div className="space-y-12 pb-24 text-[#010307]">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-4">
            <Shield className="w-8 h-8 text-black" />
            Legal & Contracts
          </h2>
          <p className="text-gray-400 font-medium italic mt-1 text-sm">Official documentation and partnership agreements.</p>
        </div>
        <div className="flex gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-100">
           <Lock className="w-5 h-5 text-gray-300" />
           <p className="max-w-[180px] text-[10px] font-bold text-gray-400 uppercase tracking-tight leading-relaxed">
              All documents are encrypted and accessible only by authorized club administrators.
           </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-10">
         <div className="lg:col-span-3 space-y-10">
            {/* Primary Agreement Display */}
            <h3 className="text-xl font-black tracking-tighter flex items-center gap-3 uppercase italic px-2">
               <History className="w-5 h-5 text-blue-600" />
               Agreement History
            </h3>
            
            <div className="space-y-4">
               {loading ? (
                  <div className="h-64 bg-white/50 animate-pulse rounded-[3rem]" />
               ) : contracts.length === 0 ? (
                  <div className="p-20 text-center border-2 border-dashed border-gray-100 rounded-[3rem] bg-white/30 backdrop-blur-sm">
                     <FileText className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                     <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest opacity-60">No official documents on record.</p>
                  </div>
               ) : (
                  contracts.map((contract) => (
                     <Card key={contract.id} className="border border-black/5 shadow-sm rounded-2xl bg-white p-8 group overflow-hidden relative transition-all">
                        <div className="flex items-center gap-6">
                           <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 transition-colors group-hover:bg-black/5 group-hover:text-black">
                              <FileText className="w-7 h-7" />
                           </div>
                           <div className="flex-1 space-y-1">
                              <h4 className="font-black text-gray-900 tracking-tight uppercase text-sm">{contract.type.replace('_', ' ')}</h4>
                              <p className="text-[10px] font-bold text-gray-300 font-mono tracking-widest">ID: {contract.id.slice(0, 8)}</p>
                           </div>
                           <div className="text-right flex flex-col items-end gap-3">
                              {getStatusBadge(contract.status)}
                           </div>
                        </div>
                     </Card>
                  ))
               )}
            </div>
         </div>

         <div className="lg:col-span-2 space-y-10">
            {/* Upload Section */}
            <Card className="border border-black/5 shadow-sm rounded-2xl bg-white p-10 overflow-hidden relative">
               <div className="relative z-10 space-y-8">
                  <div className="space-y-2">
                     <h3 className="text-2xl font-black tracking-tighter uppercase italic leading-none">Agreement Submission</h3>
                     <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Transmit signed partnership documents</p>
                  </div>

                  <FileUpload 
                     bucket="legal" 
                     folder={`brand_${brandId}/signed`} 
                     value={newDocUrl} 
                     onChange={setNewDocUrl}
                  />

                  <div className="pt-4">
                     <Button 
                        onClick={handleUpload}
                        disabled={uploading}
                        className="w-full bg-black hover:bg-black/90 text-white rounded-xl h-14 font-black uppercase text-[10px] tracking-widest shadow-sm active:scale-95 transition-all"
                     >
                        {uploading ? "Transmitting..." : "Submit for Verification"}
                     </Button>
                  </div>
               </div>
            </Card>

            {/* Quick Policy Card */}
            <div className="p-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl italic font-medium text-gray-500 text-xs flex items-start gap-4">
               <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5 text-blue-600" />
               </div>
               <p className="leading-relaxed">
                  The THC Club Commercial Code requires all partners to maintain active liability disclosure and a signed shelf-lease agreement on terminal record.
               </p>
            </div>
         </div>
      </div>
    </div>
  )
}
