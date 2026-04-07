"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { MessageSquare, Search, Filter, Eye, Clock, CheckCircle, AlertTriangle, User } from "lucide-react"
import { supabase, type Enquiry } from "@/lib/supabase"

export function EnquiriesManagement() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null)
  const [updateData, setUpdateData] = useState({
    status: "",
    priority: "",
    assigned_to: "",
    notes: "",
  })

  useEffect(() => {
    fetchEnquiries()
  }, [])

  const fetchEnquiries = async () => {
    try {
      const { data, error } = await supabase.from("enquiries").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setEnquiries(data || [])
    } catch (error) {
      console.error("Error fetching enquiries:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateEnquiry = async (id: string, updates: Partial<Enquiry>) => {
    try {
      const { error } = await supabase.rpc('admin_update_enquiry', {
        p_enquiry_id: id,
        p_status: updates.status,
        p_priority: updates.priority,
        p_assigned_to: updates.assigned_to || null,
      })

      if (error) throw error

      // Refresh the list
      fetchEnquiries()
      setSelectedEnquiry(null)
      setUpdateData({ status: "", priority: "", assigned_to: "", notes: "" })
    } catch (error) {
      console.error("Error updating enquiry:", error)
    }
  }

  const filteredEnquiries = enquiries.filter((enquiry) => {
    const matchesSearch =
      enquiry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enquiry.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enquiry.subject.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || enquiry.status === statusFilter
    const matchesPriority = priorityFilter === "all" || enquiry.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            New
          </Badge>
        )
      case "in_progress":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            In Progress
          </Badge>
        )
      case "resolved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Resolved
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            High
          </Badge>
        )
      case "medium":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            Medium
          </Badge>
        )
      case "low":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Low
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case "medium":
        return <Clock className="w-4 h-4 text-orange-500" />
      case "low":
        return <CheckCircle className="w-4 h-4 text-gray-500" />
      default:
        return null
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
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <h1 className="text-3xl font-black">Enquiries Management</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search enquiries..."
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
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredEnquiries.map((enquiry) => (
          <Card key={enquiry.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[#FE7F2D]" />
                      <h3 className="font-bold text-lg">{enquiry.subject}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(enquiry.priority)}
                      {getPriorityBadge(enquiry.priority)}
                      {getStatusBadge(enquiry.status)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1 mb-3">
                    <p>
                      <strong>From:</strong> {enquiry.name} ({enquiry.email})
                    </p>
                    {enquiry.phone && (
                      <p>
                        <strong>Phone:</strong> {enquiry.phone}
                      </p>
                    )}
                    <p>
                      <strong>Submitted:</strong> {new Date(enquiry.created_at).toLocaleDateString()}
                    </p>
                    {enquiry.assigned_to && (
                      <p className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <strong>Assigned to:</strong> {enquiry.assigned_to}
                      </p>
                    )}
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700 line-clamp-2">{enquiry.message}</p>
                  </div>
                </div>
                <div className="ml-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEnquiry(enquiry)
                          setUpdateData({
                            status: enquiry.status,
                            priority: enquiry.priority,
                            assigned_to: enquiry.assigned_to || "",
                            notes: "",
                          })
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Manage
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Manage Enquiry</DialogTitle>
                      </DialogHeader>
                      {selectedEnquiry && (
                        <div className="space-y-6">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-2">{selectedEnquiry.subject}</h4>
                            <div className="text-sm text-gray-600 space-y-1 mb-3">
                              <p>
                                <strong>From:</strong> {selectedEnquiry.name} ({selectedEnquiry.email})
                              </p>
                              {selectedEnquiry.phone && (
                                <p>
                                  <strong>Phone:</strong> {selectedEnquiry.phone}
                                </p>
                              )}
                              <p>
                                <strong>Submitted:</strong> {new Date(selectedEnquiry.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="bg-white p-3 rounded border">
                              <p className="text-sm">{selectedEnquiry.message}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="status">Status</Label>
                              <Select
                                value={updateData.status}
                                onValueChange={(value) => setUpdateData((prev) => ({ ...prev, status: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new">New</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor="priority">Priority</Label>
                              <Select
                                value={updateData.priority}
                                onValueChange={(value) => setUpdateData((prev) => ({ ...prev, priority: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="assigned_to">Assign To</Label>
                            <Input
                              id="assigned_to"
                              placeholder="Team member email or name"
                              value={updateData.assigned_to}
                              onChange={(e) => setUpdateData((prev) => ({ ...prev, assigned_to: e.target.value }))}
                            />
                          </div>

                          <div>
                            <Label htmlFor="notes">Internal Notes</Label>
                            <Textarea
                              id="notes"
                              placeholder="Add internal notes about this enquiry..."
                              value={updateData.notes}
                              onChange={(e) => setUpdateData((prev) => ({ ...prev, notes: e.target.value }))}
                              rows={3}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() =>
                                updateEnquiry(selectedEnquiry.id, {
                                  status: updateData.status as "new" | "in_progress" | "resolved",
                                  priority: updateData.priority as "low" | "medium" | "high",
                                  assigned_to: updateData.assigned_to || null,
                                })
                              }
                              className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white"
                            >
                              Update Enquiry
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEnquiries.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No enquiries found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
