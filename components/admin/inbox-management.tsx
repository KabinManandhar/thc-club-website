"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { MessageSquare, Inbox, Clock, CheckCircle2, XCircle, Search, AlertCircle, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"

export function InboxManagement() {
  const [enquiries, setEnquiries] = useState<any[]>([])
  const [changeRequests, setChangeRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("enquiries")
  const [requestView, setRequestView] = useState<"active" | "history" | "all">("active")
  
  const [selectedEntry, setSelectedEntry] = useState<any>(null)
  const [entryType, setEntryType] = useState<"enquiry" | "request" | null>(null)
  const [replyText, setReplyText] = useState("")

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [enqRes, reqRes] = await Promise.all([
        supabase.from("enquiries").select("*, brands(business_name)").order("created_at", { ascending: false }),
        supabase.from("brand_change_requests").select("*, brands(business_name)").order("created_at", { ascending: false })
      ])
      setEnquiries(enqRes.data || [])
      setChangeRequests(reqRes.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleAction = async (status: string) => {
    if (!selectedEntry || !entryType) return
    
    try {
      const dbTable = entryType === "enquiry" ? "enquiries" : "brand_change_requests"
      const updateData: any = { status }
      
      if (entryType === "enquiry") {
        updateData.admin_reply = replyText
      } else {
        updateData.admin_notes = replyText
      }

      const { error } = await supabase
        .from(dbTable)
        .update(updateData)
        .eq("id", selectedEntry.id)

      if (error) throw error
      
      toast.success(`${entryType === "enquiry" ? "Enquiry" : "Request"} marked as ${status}`)
      setSelectedEntry(null)
      setReplyText("")
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || "Failed to update status")
    }
  }

  const handleDelete = async (id: string, type: "enquiry" | "request") => {
    if (!confirm("Are you sure you want to permanently delete this record?")) return
    try {
      const dbTable = type === "enquiry" ? "enquiries" : "brand_change_requests"
      const { error } = await supabase.from(dbTable).delete().eq("id", id)
      if (error) throw error
      toast.success("Record purged from terminal.")
      fetchAll()
    } catch (err: any) {
      toast.error(err.message || "Deletion failed")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "resolved":
        return <Badge className="bg-green-50 text-green-700 border-none font-black text-[8px] uppercase tracking-widest px-3">Complete</Badge>
      case "rejected":
        return <Badge className="bg-red-50 text-red-700 border-none font-black text-[8px] uppercase tracking-widest px-3">Rejected</Badge>
      case "on_hold":
        return <Badge className="bg-orange-50 text-orange-700 border-none font-black text-[8px] uppercase tracking-widest px-3">On Hold</Badge>
      default:
        return <Badge className="bg-blue-50 text-blue-700 border-none font-black text-[8px] uppercase tracking-widest px-3">Pending</Badge>
    }
  }

  const filteredEnquiries = enquiries.filter(e => 
    e.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.brands?.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredRequests = changeRequests.filter(r => 
    r.request_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.brands?.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const requestStatusFiltered = filteredRequests.filter((r) => {
    if (requestView === "active") return r.status === "pending" || r.status === "on_hold"
    if (requestView === "history") return ["approved", "rejected"].includes(r.status)
    return true
  })
  const activeRequestsCount = changeRequests.filter((r) => r.status === "pending" || r.status === "on_hold").length
  const historyRequestsCount = changeRequests.filter((r) => ["approved", "rejected"].includes(r.status)).length

  if (loading) {
    return (
      <div className="p-20 text-center animate-pulse">
        <Inbox className="w-12 h-12 mx-auto text-gray-200" />
        <p className="mt-4 text-gray-400 font-black uppercase tracking-widest text-xs">Syncing Terminal...</p>
      </div>
    )
  }

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
           <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
             <MessageSquare className="w-8 h-8 text-[#FE7F2D]" />
             Inbox & Requests
           </h1>
           <p className="text-gray-500 font-medium text-sm">Central hub for brand communications and system change triggers.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 pl-12 rounded-2xl border-gray-100 bg-white"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white/50 border-b border-gray-100 p-0 h-16 w-full justify-start space-x-12 px-2 overflow-x-auto scrollbar-hide">
          <TabsTrigger 
            value="enquiries" 
            className="data-[state=active]:border-b-4 data-[state=active]:border-[#FE7F2D] data-[state=active]:text-black rounded-none px-0 font-black uppercase tracking-widest text-[10px] h-full bg-transparent border-transparent transition-all"
          >
            Enquiries ({enquiries.length})
          </TabsTrigger>
          <TabsTrigger 
            value="requests" 
            className="data-[state=active]:border-b-4 data-[state=active]:border-[#FE7F2D] data-[state=active]:text-black rounded-none px-0 font-black uppercase tracking-widest text-[10px] h-full bg-transparent border-transparent transition-all"
          >
            System Requests ({changeRequests.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-10">
          <TabsContent value="enquiries" className="space-y-6">
            {filteredEnquiries.map(enq => (
              <Card key={enq.id} className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden group hover:scale-[1.01] transition-transform">
                <CardContent className="p-8">
                  <div className="flex justify-between items-start mb-6">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center">
                           <MessageSquare className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-widest text-[#FE7F2D]">{enq.brands?.business_name || "Guest Brand"}</p>
                           <h3 className="text-xl font-black tracking-tight">{enq.subject}</h3>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        {getStatusBadge(enq.status)}
                        {["resolved", "rejected"].includes(enq.status) && (
                          <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-8 w-8 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full"
                             onClick={() => handleDelete(enq.id, "enquiry")}
                          >
                             <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                     </div>
                  </div>
                  <p className="bg-gray-50/50 p-6 rounded-3xl text-sm font-medium italic border border-gray-50 leading-relaxed mb-8">
                     “{enq.message}”
                  </p>
                  <div className="flex items-center justify-between">
                     <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest font-mono">ID: #{enq.id.slice(0,8)} • {new Date(enq.created_at).toLocaleDateString()}</span>
                     <Button 
                       onClick={() => {
                         setSelectedEntry(enq)
                         setEntryType("enquiry")
                         setReplyText(enq.admin_reply || "")
                       }}
                       className="rounded-xl font-black text-[10px] uppercase tracking-widest h-10 px-8 bg-black text-white hover:bg-black/90"
                     >
                        Open Response Terminal
                     </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <div className="flex items-center gap-2">
              <Button
                variant={requestView === "active" ? "default" : "outline"}
                className="rounded-xl h-9 px-4 font-black uppercase tracking-widest text-[9px]"
                onClick={() => setRequestView("active")}
              >
                Active ({activeRequestsCount})
              </Button>
              <Button
                variant={requestView === "history" ? "default" : "outline"}
                className="rounded-xl h-9 px-4 font-black uppercase tracking-widest text-[9px]"
                onClick={() => setRequestView("history")}
              >
                History ({historyRequestsCount})
              </Button>
              <Button
                variant={requestView === "all" ? "default" : "outline"}
                className="rounded-xl h-9 px-4 font-black uppercase tracking-widest text-[9px]"
                onClick={() => setRequestView("all")}
              >
                All ({changeRequests.length})
              </Button>
            </div>
            {requestStatusFiltered.map(req => (
              <Card key={req.id} className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden group hover:scale-[1.01] transition-transform">
                <CardContent className="p-8">
                  <div className="flex justify-between items-start mb-6">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center">
                           <Clock className="w-5 h-5 text-[#FE7F2D]" />
                        </div>
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-widest text-[#FE7F2D]">{req.brands?.business_name}</p>
                           <h3 className="text-xl font-black tracking-tight capitalize">{req.request_type.replace('_', ' ')}</h3>
                        </div>
                     </div>
                     <div className="flex items-center gap-3">
                        {getStatusBadge(req.status)}
                        {["approved", "rejected"].includes(req.status) && (
                           <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full"
                              onClick={() => handleDelete(req.id, "request")}
                           >
                              <Trash2 className="w-4 h-4" />
                           </Button>
                        )}
                     </div>
                  </div>
                  
                  <div className="bg-orange-50/30 p-6 rounded-3xl border border-orange-50 mb-8 space-y-4">
                     <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">Request Particulars</p>
                     <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(req.new_data || {}).map(([key, value]) => (
                           <div key={key}>
                              <Label className="text-[9px] font-black uppercase tracking-widest text-gray-400">{key.replace('_', ' ')}</Label>
                              <p className="font-bold text-xs truncate">{String(value)}</p>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div className="flex items-center justify-between">
                     <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest font-mono">REF: {req.target_id || "NEW ENTRY"} • {new Date(req.created_at).toLocaleDateString()}</span>
                     <Button 
                       onClick={() => {
                         setSelectedEntry(req)
                         setEntryType("request")
                         setReplyText(req.admin_notes || "")
                       }}
                       className="rounded-xl font-black text-[10px] uppercase tracking-widest h-10 px-8 bg-[#FE7F2D] text-white"
                     >
                        Process Request
                     </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </div>
      </Tabs>

      {/* Response Terminal Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl rounded-[3rem] border-none shadow-2xl overflow-hidden p-0 bg-white">
          <div className="bg-black text-white p-10 space-y-2">
             <div className="flex items-center gap-2 text-[#FE7F2D] font-black text-[10px] uppercase tracking-widest">
                <AlertCircle className="w-3.5 h-3.5" />
                Terminal Response System
             </div>
             <DialogTitle className="text-3xl font-black italic uppercase tracking-tight">
               {entryType === "enquiry" ? "Finalize Inquiry" : "Review Change Proposal"}
             </DialogTitle>
             <DialogDescription className="text-white/50 font-bold uppercase text-[10px] tracking-widest">Partner: {selectedEntry?.brands?.business_name || "Guest"}</DialogDescription>
          </div>
          
          <div className="p-10 space-y-8">
             <div className="space-y-4">
                <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Internal Payload / Message</p>
                   <p className="text-sm font-medium italic text-gray-700">“{entryType === "enquiry" ? selectedEntry?.message : (selectedEntry?.new_data?.message || selectedEntry?.new_data?.description || "Structural update proposal detected.")}”</p>
                </div>

                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Decision Context / Reply Message</Label>
                   <Textarea 
                      placeholder="Enter the message the brand will see in their dashboard..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="min-h-[150px] rounded-[2rem] border-gray-100 p-6 font-medium italic"
                   />
                </div>
             </div>

             <div className="grid grid-cols-3 gap-3">
                <Button onClick={() => handleAction(entryType === "enquiry" ? "resolved" : "approved")} className="bg-green-600 hover:bg-green-700 text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-green-500/20">
                   <CheckCircle2 className="w-4 h-4 mr-2" />
                   {entryType === "enquiry" ? "Resolved" : "Approve"}
                </Button>
                <Button onClick={() => handleAction("on_hold")} className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-orange-500/20">
                   <Clock className="w-4 h-4 mr-2" />
                   On Hold
                </Button>
                <Button onClick={() => handleAction("rejected")} className="bg-red-600 hover:bg-red-700 text-white rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-500/20">
                   <XCircle className="w-4 h-4 mr-2" />
                   Reject
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
