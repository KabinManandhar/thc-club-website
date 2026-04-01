"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import {
  FileText,
  CheckCircle2,
  Clock,
  Download,
  Pen,
  Shield,
  Building2,
  AlertCircle,
  Eye,
  Stamp,
} from "lucide-react"

interface BrandContractProps {
  brandId: string
  brandName: string
}

// Dynamic template logic fetched from DB

export function BrandContract({ brandId, brandName }: BrandContractProps) {
  const [brand, setBrand] = useState<any>(null)
  const [booking, setBooking] = useState<any>(null)
  const [contract, setContract] = useState<any>(null)
  const [templateStr, setTemplateStr] = useState("")
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [signatureName, setSignatureName] = useState("")
  const [stampNumber, setStampNumber] = useState("")
  const [showSigning, setShowSigning] = useState(false)
  const contractRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchData()
  }, [brandId])

  const fetchData = async () => {
    setLoading(true)
    const [brandRes, bookingRes, contractRes, configRes] = await Promise.all([
      supabase.from("brands").select("*").eq("id", brandId).single(),
      supabase.from("shelf_bookings").select("*").eq("brand_id", brandId).neq("status", "rejected").order("created_at", { ascending: false }).limit(1).single(),
      supabase.from("brand_contracts").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("platform_content").select("contract_template").eq("id", 1).single(),
    ])
    if (brandRes.data) setBrand(brandRes.data)
    if (bookingRes.data) setBooking(bookingRes.data)
    if (contractRes.data) setContract(contractRes.data)
    if (configRes.data) setTemplateStr(configRes.data.contract_template || "")
    setLoading(false)
  }

  const handleSign = async () => {
    if (!signatureName.trim()) {
      toast.error("Please enter your full legal name to sign.")
      return
    }
    setSigning(true)
    try {
      const signatureData = {
        signed_by: signatureName,
        signed_at: new Date().toISOString(),
        stamp_number: stampNumber || null,
        ip_note: "Digitally agreed via THC Club Brand Portal",
        contract_type: "partnership_v1",
        status: "signed",
        valid_from: new Date().toISOString().split("T")[0],
      }

      const { error } = await supabase.from("brand_contracts").upsert({
        brand_id: brandId,
        file_url: `digital_contract_${brandId}_${Date.now()}`,
        ...signatureData,
      })

      if (error) throw error

      toast.success("Contract digitally signed. Welcome to the collective.")
      setShowSigning(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to sign contract.")
    } finally {
      setSigning(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!contractRef.current) return
    toast.info("Generating PDF Document...")
    try {
      // Capture the agreement visually
      const canvas = await html2canvas(contractRef.current, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL("image/jpeg", 1.0)
      
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      // Add multiple pages if the document is long
      let heightLeft = pdfHeight
      let position = 0
      const pageHeight = pdf.internal.pageSize.getHeight()

      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight)
        heightLeft -= pageHeight
      }

      // Add Signature page if signed
      if (contract && contract.status === "signed") {
        pdf.addPage()
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(16)
        pdf.text("DIGITAL SIGNATURE RECEIPT", 20, 20)
        
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(12)
        pdf.text(`Brand Name: ${brandName}`, 20, 40)
        pdf.text(`Signed By / Authorized Party: ${contract.signed_by}`, 20, 50)
        pdf.text(`Date of Execution: ${new Date(contract.signed_at).toLocaleString()}`, 20, 60)
        
        if (contract.stamp_number) {
          pdf.text(`Stamp / Registration Number: ${contract.stamp_number}`, 20, 70)
        }
        
        pdf.setFontSize(10)
        pdf.setTextColor(100)
        pdf.text(`Digital Verification Note: ${contract.ip_note}`, 20, 90)
        pdf.text(`Contract ID: ${contract.id}`, 20, 100)
      }

      pdf.save(`THC_Partnership_Agreement_${brandName.replace(/[^z-z0-9]/gi, '_').toLowerCase()}.pdf`)
      toast.success("Contract PDF Downloaded.")
    } catch (e: any) {
      toast.error("Failed to generate PDF: " + e.message)
    }
  }

  const parseTemplate = () => {
    if (!templateStr || !brand) return "Template not configured by admin."
    return templateStr
      .replace(/\{\{BRAND_NAME\}\}/g, brand.business_name?.toUpperCase() || "BRAND NAME")
      .replace(/\{\{BRAND_EMAIL\}\}/g, brand.email || "BRAND EMAIL")
      .replace(/\{\{BRAND_PHONE\}\}/g, brand.phone || "N/A")
  }

  if (loading) return (
    <div className="flex items-center justify-center p-32">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D]"></div>
    </div>
  )

  const isSigned = contract?.status === "signed"

  return (
    <div className="space-y-10 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-4 text-[#010307] lowercase italic">
            <FileText className="w-8 h-8 text-[#FE7F2D]" />
            partnership contract
          </h2>
          <p className="text-[#010307]/40 font-medium italic mt-1 text-sm lowercase">your official thc club brand partnership agreement.</p>
        </div>
        <div className="flex items-center gap-3">
          {isSigned ? (
            <Badge className="bg-green-500 text-white border-none font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-full flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> Digitally Signed
            </Badge>
          ) : (
            <Badge className="bg-orange-100 text-[#FE7F2D] border-[#FE7F2D]/20 border font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-full flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Awaiting Signature
            </Badge>
          )}
        </div>
      </div>

      {/* Signed confirmation bar */}
      {isSigned && (
        <Card className="border border-green-100 bg-green-50/40 rounded-3xl overflow-hidden">
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                <Stamp className="w-6 h-6" />
              </div>
              <div>
                <p className="font-black text-green-800 tracking-tight">Agreement Executed</p>
                <p className="text-[10px] font-bold text-green-600/60 uppercase tracking-widest">
                  Signed by {contract.signed_by} • {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString() : ""} {contract.stamp_number ? `• Stamp: ${contract.stamp_number}` : ""}
                </p>
              </div>
            </div>
            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-100 font-black uppercase text-[10px] tracking-widest rounded-xl h-11 px-6 flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Copy
            </Button>
          </div>
        </Card>
      )}

      {/* Contract Document */}
      <Card className="border border-black/5 shadow-sm rounded-3xl bg-white overflow-hidden">
        <CardHeader className="border-b border-gray-50 p-6 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${contract?.contract_type === 'manual_physical' ? 'bg-blue-500' : 'bg-[#010307]'}`}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-black tracking-tight text-[#010307]">
                {contract?.contract_type === 'manual_physical' ? 'Manual Partnership Agreement' : 'Brand Partnership Agreement v1.0'}
              </CardTitle>
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                {contract?.contract_type === 'manual_physical' ? 'Physical Copy Scanned & Verified' : 'The Hidden Collective Club. • Effective 2026'}
              </p>
            </div>
          </div>
          {contract?.file_url && contract.file_url.startsWith('http') && (
            <Button asChild variant="ghost" size="sm" className="text-[#FE7F2D] hover:text-black font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
              <a href={contract.file_url} target="_blank" rel="noopener noreferrer">
                <Eye className="w-4 h-4" /> View Document
              </a>
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {contract?.contract_type === 'manual_physical' ? (
            <div className="p-20 text-center space-y-6 bg-gray-50/30">
              <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-500 mx-auto shadow-inner">
                <Shield className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black italic lowercase tracking-tight">Physical Agreement Recorded</h3>
                <p className="text-sm text-gray-400 font-medium italic lowercase max-w-sm mx-auto leading-relaxed">
                  Your partnership agreement was signed in person and has been manually uploaded to the club's database.
                </p>
              </div>
              <Button asChild className="bg-blue-600 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 px-10 transition-all shadow-xl shadow-blue-500/20">
                <a href={contract.file_url} target="_blank" rel="noopener noreferrer">Download Signed Scan</a>
              </Button>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto bg-gray-50/30 border-b border-gray-50">
              <div ref={contractRef} className="p-8 sm:p-12 font-mono text-[13px] md:text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-white">
                {parseTemplate()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signing Section */}
      {!isSigned ? (
        <Card className="border-2 border-[#FE7F2D]/20 rounded-3xl bg-white overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-3">
              <Pen className="w-5 h-5 text-[#FE7F2D]" />
              <h3 className="text-xl font-black italic lowercase tracking-tight">digital signature</h3>
            </div>
            <div className="p-5 bg-orange-50/40 border border-orange-100 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#FE7F2D] shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600 italic font-medium leading-relaxed lowercase">
                by signing, you confirm you have read and agree to all terms above. this constitutes a legally binding digital agreement under nepal's electronic transaction act.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">Full Legal Name *</Label>
                <Input
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Your full name as authorized representative"
                  className="rounded-2xl h-14 border-gray-100 font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">Company Stamp / Registration No. (optional)</Label>
                <Input
                  value={stampNumber}
                  onChange={(e) => setStampNumber(e.target.value)}
                  placeholder="e.g. REG-2023-KATHMANDU or stamp ref"
                  className="rounded-2xl h-14 border-gray-100 font-bold"
                />
              </div>
            </div>
            {/* Signature Preview */}
            {signatureName && (
              <div className="p-6 border-2 border-dashed border-[#FE7F2D]/30 rounded-2xl bg-white text-center space-y-2">
                <p className="text-[9px] font-black uppercase text-gray-300 tracking-widest mb-3">signature preview</p>
                <p className="text-3xl font-black italic text-[#010307]" style={{ fontFamily: "Georgia, serif" }}>{signatureName}</p>
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{brandName} • {new Date().toLocaleDateString()}</p>
                {stampNumber && <p className="text-[10px] font-bold text-[#FE7F2D]/60 uppercase tracking-widest">stamp: {stampNumber}</p>}
              </div>
            )}
            <Button
              onClick={handleSign}
              disabled={signing || !signatureName.trim()}
              className="w-full bg-[#010307] hover:bg-[#FE7F2D] text-white h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl transition-all active:scale-95 flex items-center gap-3"
            >
              <Pen className="w-5 h-5" />
              {signing ? "Executing Agreement..." : "Sign & Accept Partnership Agreement"}
            </Button>
            <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest text-center">secure • timestamped • legally binding under nepal eta</p>
          </div>
        </Card>
      ) : (
        <Card className="border border-black/5 rounded-3xl bg-white p-8 text-center space-y-4">
          <Shield className="w-12 h-12 text-green-500 mx-auto" />
          <h3 className="text-xl font-black italic lowercase tracking-tight">agreement secured</h3>
          <p className="text-sm text-gray-400 italic font-medium lowercase max-w-md mx-auto">
            your partnership agreement has been digitally executed and is on record. a physical copy will be provided during your in-person walkthrough.
          </p>
          <Button onClick={handleDownloadPDF} className="bg-[#010307] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] h-12 px-10 flex items-center gap-2 mx-auto">
            <Download className="w-4 h-4" /> Download Your Copy
          </Button>
        </Card>
      )}
    </div>
  )
}
