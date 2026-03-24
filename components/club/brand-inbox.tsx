"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  Shield,
  Zap,
  HelpCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface BrandInboxProps {
  brandId: string
}

export function BrandInbox({ brandId }: BrandInboxProps) {
  const [enquiries, setEnquiries] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formType, setFormType] = useState<"enquiry" | "request">("enquiry")
  const [form, setForm] = useState({ subject: "", message: "", category: "general" })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [brandId])

  const fetchData = async () => {
    setLoading(true)
    const [enqRes, reqRes] = await Promise.all([
      supabase.from("enquiries").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }),
      supabase.from("brand_change_requests").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }),
    ])
    setEnquiries(enqRes.data || [])
    setRequests(reqRes.data || [])
    setLoading(false)
  }

  const handleSend = async () => {
    if (!form.subject || !form.message) {
      toast.error("Subject and message are required.")
      return
    }
    setSubmitting(true)
    try {
      if (formType === "enquiry") {
        const { error } = await supabase.from("enquiries").insert({
          brand_id: brandId,
          subject: form.subject,
          message: form.message,
          status: "pending",
        })
        if (error) throw error
      } else {
        const { error } = await supabase.from("brand_change_requests").insert({
          brand_id: brandId,
          request_type: "general_request",
          new_data: { subject: form.subject, message: form.message, category: form.category },
          status: "pending",
        })
        if (error) throw error
      }
      toast.success(`${formType === "enquiry" ? "Enquiry" : "Request"} transmitted successfully.`)
      setIsFormOpen(false)
      setForm({ subject: "", message: "", category: "general" })
      fetchData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-orange-50 text-orange-700 border-none font-black uppercase text-[8px] px-2 py-0.5 tracking-widest">Transmitted</Badge>
      case "approved":
      case "resolved":
        return <Badge className="bg-green-50 text-green-700 border-none font-black uppercase text-[8px] px-2 py-0.5 tracking-widest">Synchronized</Badge>
      case "rejected":
        return <Badge className="bg-red-50 text-red-700 border-none font-black uppercase text-[8px] px-2 py-0.5 tracking-widest">Cancelled</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-500 border-none font-black uppercase text-[8px] px-2 py-0.5 tracking-widest">{status}</Badge>
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-4 text-[#010307]">
            <MessageSquare className="w-8 h-8 text-black" />
            Communication
          </h2>
          <p className="text-gray-400 font-medium italic mt-1 text-sm">Direct channel to the club administration.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={() => { setFormType("enquiry"); setIsFormOpen(true); }}
            className="border-black/5 hover:border-black/10 text-black rounded-xl h-12 px-6 font-black uppercase text-[10px] tracking-widest transition-all"
          >
            Submit Enquiry
          </Button>
          <Button 
            onClick={() => { setFormType("request"); setIsFormOpen(true); }}
            className="bg-black hover:bg-black/90 text-white rounded-xl h-12 px-6 font-black uppercase text-[10px] tracking-widest shadow-sm active:scale-95 transition-all"
          >
            System Request
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Enquiries Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black tracking-tighter flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              General Enquiries
            </h3>
            <Badge variant="outline" className="rounded-full font-black text-[9px] uppercase px-3">{enquiries.length}</Badge>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <div className="h-64 bg-white/50 animate-pulse rounded-[2.5rem]" />
            ) : enquiries.length === 0 ? (
              <div className="p-10 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem]">
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest opacity-60">No enquiries submitted yet.</p>
              </div>
            ) : (
              enquiries.map((enq) => (
                <Card key={enq.id} className="border border-black/5 shadow-sm rounded-2xl bg-white overflow-hidden group transition-all">
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-4">
                      {getStatusBadge(enq.status)}
                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest font-mono">
                        {new Date(enq.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-black text-xl tracking-tight text-gray-900 group-hover:text-[#FE7F2D] transition-colors">{enq.subject}</h4>
                    <p className="text-gray-500 mt-3 text-sm font-medium line-clamp-2 italic">“{enq.message}”</p>
                    {enq.admin_reply && (
                      <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 text-xs font-bold text-blue-800 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>Admin response: {enq.admin_reply}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* System Change Requests Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black tracking-tighter flex items-center gap-3">
              <Zap className="w-5 h-5 text-orange-600" />
              System Requests
            </h3>
            <Badge variant="outline" className="rounded-full font-black text-[9px] uppercase px-3">{requests.length}</Badge>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="h-64 bg-white/50 animate-pulse rounded-[2.5rem]" />
            ) : requests.length === 0 ? (
              <div className="p-10 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem]">
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest opacity-60">No system requests found.</p>
              </div>
            ) : (
              requests.map((req) => (
                <Card key={req.id} className="border border-black/5 shadow-sm rounded-2xl bg-white overflow-hidden group transition-all">
                  <CardContent className="p-8">
                    <div className="flex justify-between items-start mb-4">
                      {getStatusBadge(req.status)}
                      <div className="flex items-center gap-2">
                         <Badge variant="outline" className="rounded-full font-black text-[9px] uppercase px-3 bg-gray-50 border-gray-100">{req.request_type.split('_').join(' ')}</Badge>
                         <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest font-mono">
                           {new Date(req.created_at).toLocaleDateString()}
                         </span>
                      </div>
                    </div>
                    <h4 className="font-black text-xl tracking-tight text-gray-900 group-hover:text-black transition-colors">
                      {req.request_type === "general_request" ? req.new_data?.subject : `Change Request: ${req.request_type.replace('_', ' ')}`}
                    </h4>
                    <p className="text-gray-500 mt-3 text-sm font-medium line-clamp-2 italic">
                       {req.request_type === "general_request" ? req.new_data?.message : `A system update was requested for target ID: ${req.target_id || "N/A"}.`}
                    </p>
                    {req.admin_notes && (
                      <div className="mt-6 p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50 text-xs font-bold text-orange-800 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>Admin response: {req.admin_notes}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* New Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-[2rem]">
          <div className="bg-white p-10 space-y-8">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black tracking-tighter uppercase italic">
                {formType === "enquiry" ? "Transmit Enquiry" : "System Change Request"}
              </DialogTitle>
              <p className="text-[10px] text-black/30 font-black uppercase tracking-widest flex items-center gap-2">
                 <Shield className="w-3.5 h-3.5" /> Direct Support Protocol
              </p>
            </DialogHeader>

            <div className="space-y-6">
              <div>
                <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Transmission Subject</Label>
                <Input 
                   value={form.subject} 
                   onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} 
                   placeholder="Brief topic summary" 
                   className="rounded-2xl h-14 border-gray-100 font-bold"
                />
              </div>

              {formType === "request" && (
                <div>
                  <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Request Category</Label>
                  <select 
                     value={form.category} 
                     onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                     className="w-full rounded-2xl h-14 border-gray-100 bg-white font-bold px-4 appearance-none focus:outline-none focus:ring-2 focus:ring-[#FE7F2D]"
                  >
                     <option value="general">General System</option>
                     <option value="profile">Profile Meta-Data</option>
                     <option value="contract">Legal / Contract</option>
                     <option value="payout">Financial / Payout</option>
                  </select>
                </div>
              )}

              <div>
                <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Full Transmission Message</Label>
                <Textarea 
                   value={form.message} 
                   onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))} 
                   placeholder="Detailed communication details..." 
                   rows={5} 
                   className="rounded-3xl border-gray-100 bg-white/50 p-6 resize-none font-medium"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 gap-4 sm:justify-between border-t border-gray-100 mt-8">
              <Button variant="ghost" onClick={() => setIsFormOpen(false)} className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px]">Cancel</Button>
              <Button 
                 onClick={handleSend} 
                 disabled={submitting} 
                 className="bg-black hover:bg-black/90 text-white rounded-2xl h-14 px-12 font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 transition-all flex items-center gap-2"
              >
                {submitting ? "Transmitting..." : (
                  <>
                    <Send className="w-4 h-4" /> Finalize Signal
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
