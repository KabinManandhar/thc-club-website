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
import { Calendar, Search, Filter, Eye, Clock, Users, Building, CheckCircle, X } from "lucide-react"
import { supabase, type VisitRequest } from "@/lib/supabase"

export function VisitRequestsManagement() {
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedRequest, setSelectedRequest] = useState<VisitRequest | null>(null)
  const [updateData, setUpdateData] = useState({
    status: "",
    notes: "",
  })

  useEffect(() => {
    fetchVisitRequests()
  }, [])

  const fetchVisitRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("visit_requests")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setVisitRequests(data || [])
    } catch (error) {
      console.error("Error fetching visit requests:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateVisitRequest = async (id: string, updates: Partial<VisitRequest>) => {
    try {
      const { error } = await supabase.rpc('admin_update_visit_request', {
        p_request_id: id,
        p_status: updates.status,
        p_notes: updates.notes || null,
      })

      if (error) throw error

      // Refresh the list
      fetchVisitRequests()
      setSelectedRequest(null)
      setUpdateData({ status: "", notes: "" })
    } catch (error) {
      console.error("Error updating visit request:", error)
    }
  }

  const filteredRequests = visitRequests.filter((request) => {
    const matchesSearch =
      request.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request.company && request.company.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = statusFilter === "all" || request.status === statusFilter

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
      case "confirmed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Confirmed
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Cancelled
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Completed
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const formatDateTime = (date: string, time: string) => {
    const visitDate = new Date(date)
    return `${visitDate.toLocaleDateString()} at ${time}`
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
        <h1 className="text-3xl font-black">Visit Requests Management</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search visit requests..."
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#FE7F2D]" />
                      <h3 className="font-bold text-lg">{request.name}</h3>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1 mb-3">
                    <p>
                      <strong>Email:</strong> {request.email}
                    </p>
                    <p>
                      <strong>Phone:</strong> {request.phone}
                    </p>
                    {request.company && (
                      <p className="flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        <strong>Company:</strong> {request.company}
                      </p>
                    )}
                    <p className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <strong>Preferred Visit:</strong> {formatDateTime(request.preferred_date, request.preferred_time)}
                    </p>
                    <p className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <strong>Visitors:</strong> {request.number_of_visitors}
                    </p>
                    <p>
                      <strong>Purpose:</strong> {request.visit_purpose}
                    </p>
                    <p>
                      <strong>Requested:</strong> {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {request.special_requirements && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong>Special Requirements:</strong> {request.special_requirements}
                      </p>
                    </div>
                  )}
                  {request.notes && (
                    <div className="bg-blue-50 p-3 rounded-lg mt-2">
                      <p className="text-sm text-blue-700">
                        <strong>Admin Notes:</strong> {request.notes}
                      </p>
                    </div>
                  )}
                </div>
                <div className="ml-4 flex gap-2">
                  {request.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateVisitRequest(request.id, { status: "confirmed" })}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateVisitRequest(request.id, { status: "cancelled" })}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </>
                  )}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request)
                          setUpdateData({
                            status: request.status,
                            notes: request.notes || "",
                          })
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Manage
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Manage Visit Request</DialogTitle>
                      </DialogHeader>
                      {selectedRequest && (
                        <div className="space-y-6">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-2">Visit Request Details</h4>
                            <div className="text-sm text-gray-600 space-y-2">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p>
                                    <strong>Name:</strong> {selectedRequest.name}
                                  </p>
                                  <p>
                                    <strong>Email:</strong> {selectedRequest.email}
                                  </p>
                                  <p>
                                    <strong>Phone:</strong> {selectedRequest.phone}
                                  </p>
                                  {selectedRequest.company && (
                                    <p>
                                      <strong>Company:</strong> {selectedRequest.company}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <p>
                                    <strong>Visit Date:</strong> {selectedRequest.preferred_date}
                                  </p>
                                  <p>
                                    <strong>Visit Time:</strong> {selectedRequest.preferred_time}
                                  </p>
                                  <p>
                                    <strong>Number of Visitors:</strong> {selectedRequest.number_of_visitors}
                                  </p>
                                  <p>
                                    <strong>Requested:</strong>{" "}
                                    {new Date(selectedRequest.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <p>
                                  <strong>Visit Purpose:</strong>
                                </p>
                                <p className="bg-white p-2 rounded border mt-1">{selectedRequest.visit_purpose}</p>
                              </div>
                              {selectedRequest.special_requirements && (
                                <div>
                                  <p>
                                    <strong>Special Requirements:</strong>
                                  </p>
                                  <p className="bg-white p-2 rounded border mt-1">
                                    {selectedRequest.special_requirements}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

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
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="notes">Admin Notes</Label>
                            <Textarea
                              id="notes"
                              placeholder="Add notes about this visit request..."
                              value={updateData.notes}
                              onChange={(e) => setUpdateData((prev) => ({ ...prev, notes: e.target.value }))}
                              rows={3}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={() =>
                                updateVisitRequest(selectedRequest.id, {
                                  status: updateData.status as "pending" | "confirmed" | "cancelled" | "completed",
                                  notes: updateData.notes || " ",
                                })
                              }
                              className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white"
                            >
                              Update Request
                            </Button>
                            {selectedRequest.status === "pending" && (
                              <>
                                <Button
                                  onClick={() =>
                                    updateVisitRequest(selectedRequest.id, {
                                      status: "confirmed",
                                      notes: updateData.notes || " ",
                                    })
                                  }
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  Confirm Visit
                                </Button>
                                <Button
                                  onClick={() =>
                                    updateVisitRequest(selectedRequest.id, {
                                      status: "cancelled",
                                      notes: updateData.notes || " ",
                                    })
                                  }
                                  variant="destructive"
                                >
                                  Cancel Visit
                                </Button>
                              </>
                            )}
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

      {filteredRequests.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No visit requests found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
