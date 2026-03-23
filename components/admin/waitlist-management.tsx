"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Check, X, Eye, Search, Filter, Trash2, Edit2, Plus, AlertCircle } from "lucide-react"
import { supabase, type WaitlistEntry } from "@/lib/supabase"

export function WaitlistManagement() {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedEntry, setSelectedEntry] = useState<WaitlistEntry | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [passwords, setPasswords] = useState<{ [key: string]: string }>({})
  const [isEditing, setIsEditing] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [editForm, setEditForm] = useState({ business_name: "", email: "", phone: "", notes: "" })

  useEffect(() => {
    fetchWaitlist()
  }, [])

  const fetchWaitlist = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("waitlist_entries").select("*").order("created_at", { ascending: false })
      if (error) throw error
      setWaitlist(data || [])
    } catch (error) {
      console.error("Error fetching waitlist:", error)
    } finally {
      setLoading(false)
    }
  }

  const addWaitlistEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from("waitlist_entries").insert([{
        ...editForm,
        status: "pending"
      }])
      if (error) throw error
      setIsAdding(false)
      setEditForm({ business_name: "", email: "", phone: "", notes: "" })
      fetchWaitlist()
    } catch (error) {
      console.error("Error adding entry:", error)
    }
  }

  const updateEntryDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEntry) return
    try {
      const { error } = await supabase
        .from("waitlist_entries")
        .update(editForm)
        .eq("id", selectedEntry.id)
      if (error) throw error
      setIsEditing(false)
      setSelectedEntry(null)
      fetchWaitlist()
    } catch (error) {
      console.error("Error updating entry:", error)
    }
  }

  const updateWaitlistStatus = async (id: string, status: "approved" | "rejected", notes?: string) => {
    try {
      const { error } = await supabase
        .from("waitlist_entries")
        .update({
          status,
          notes,
          reviewed_by: "admin@thcclub.com", // In real app, get from auth
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) throw error

      // If approved, fetch the generated password
      if (status === "approved") {
        const { data: approvedUser } = await supabase
          .from("approved_users")
          .select("password")
          .eq("waitlist_id", id)
          .single()

        if (approvedUser) {
          setPasswords((prev) => ({
            ...prev,
            [id]: approvedUser.password,
          }))
        }
      }

      // Refresh the list
      fetchWaitlist()
      setSelectedEntry(null)
      setReviewNotes("")
    } catch (error) {
      console.error("Error updating waitlist:", error)
    }
  }

  const removeWaitlistEntry = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this entry?")) return
    try {
      const { error } = await supabase.from("waitlist_entries").delete().eq("id", id)
      if (error) throw error
      fetchWaitlist()
    } catch (error) {
      console.error("Scale-level Error removing waitlist entry:", error)
    }
  }

  const filteredWaitlist = waitlist.filter((entry) => {
    const matchesSearch =
      entry.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || entry.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <h1 className="text-3xl font-black">Waitlist Management</h1>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Manually
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Waitlist Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={addWaitlistEntry} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-bold">Business Name</label>
                <Input 
                  value={editForm.business_name} 
                  onChange={e => setEditForm(p => ({...p, business_name: e.target.value}))} 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold">Email</label>
                  <Input 
                    type="email" 
                    value={editForm.email} 
                    onChange={e => setEditForm(p => ({...p, email: e.target.value}))} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold">Phone</label>
                  <Input 
                    value={editForm.phone} 
                    onChange={e => setEditForm(p => ({...p, phone: e.target.value}))} 
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Notes</label>
                <Textarea 
                  value={editForm.notes} 
                  onChange={e => setEditForm(p => ({...p, notes: e.target.value}))} 
                />
              </div>
              <Button type="submit" className="w-full bg-[#FE7F2D] text-white">Save Entry</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-xl border">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Quick Filters
        </h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by business name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredWaitlist.map((entry) => (
          <Card key={entry.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{entry.business_name}</h3>
                    {getStatusBadge(entry.status)}
                  </div>
                  {entry.status === "approved" && passwords[entry.id] && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm font-medium text-green-800">
                        Password: <span className="font-mono text-lg">{passwords[entry.id]}</span>
                      </p>
                      <p className="text-xs text-green-600">Share this password with the approved member</p>
                    </div>
                  )}
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>Email:</strong> {entry.email}
                    </p>
                    <p>
                      <strong>Phone:</strong> {entry.phone}
                    </p>
                    <p>
                      <strong>Applied:</strong> {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                    {entry.notes && (
                      <p>
                        <strong>Notes:</strong> {entry.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {/* Edit Dialog */}
                  <div className="flex gap-2">
                    <Dialog open={isEditing && selectedEntry?.id === entry.id} onOpenChange={(v) => {
                      if (!v) {
                        setIsEditing(false)
                        setSelectedEntry(null)
                      } else {
                        setSelectedEntry(entry)
                        setIsEditing(true)
                        setEditForm({
                          business_name: entry.business_name,
                          email: entry.email,
                          phone: entry.phone,
                          notes: entry.notes || ""
                        })
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Waitlist Entry</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={updateEntryDetails} className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <label className="text-sm font-bold">Business Name</label>
                            <Input 
                              value={editForm.business_name} 
                              onChange={e => setEditForm(p => ({...p, business_name: e.target.value}))} 
                              required 
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-bold">Email</label>
                              <Input 
                                type="email" 
                                value={editForm.email} 
                                onChange={e => setEditForm(p => ({...p, email: e.target.value}))} 
                                required 
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-bold">Phone</label>
                              <Input 
                                value={editForm.phone} 
                                onChange={e => setEditForm(p => ({...p, phone: e.target.value}))} 
                                required 
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-bold">Notes</label>
                            <Textarea 
                              value={editForm.notes} 
                              onChange={e => setEditForm(p => ({...p, notes: e.target.value}))} 
                            />
                          </div>
                          <Button type="submit" className="w-full bg-[#FE7F2D] text-white">Update Entry</Button>
                        </form>
                      </DialogContent>
                    </Dialog>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => {
                          setSelectedEntry(entry)
                          setReviewNotes(entry.notes || "")
                        }}>
                          <Eye className="w-4 h-4 mr-2" />
                          Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Review Application</DialogTitle>
                        </DialogHeader>
                        {selectedEntry && (
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold">{selectedEntry.business_name}</h4>
                              <p className="text-sm text-gray-600">{selectedEntry.email}</p>
                              <p className="text-sm text-gray-600">{selectedEntry.phone}</p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-2">Review Notes</label>
                              <Textarea
                                placeholder="Add notes about this application..."
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                rows={3}
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button
                                onClick={() => updateWaitlistStatus(selectedEntry.id, "approved", reviewNotes)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                onClick={() => updateWaitlistStatus(selectedEntry.id, "rejected", reviewNotes)}
                                variant="destructive"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    {entry.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateWaitlistStatus(entry.id, "approved")}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          title="Quick Approve"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateWaitlistStatus(entry.id, "rejected")}
                          title="Quick Reject"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeWaitlistEntry(entry.id)}
                      className="text-gray-400 hover:text-red-600"
                      title="Delete Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredWaitlist.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No waitlist entries found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
