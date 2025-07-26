"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, X, Eye, Search, Filter, Clock, AlertCircle } from "lucide-react"
import { supabase, type Application } from "@/lib/supabase"

export function ApplicationsManagement() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase.from("applications").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (error) {
      console.error("Error fetching applications:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateApplicationStatus = async (
    id: string,
    status: "under_review" | "approved" | "rejected",
    notes?: string,
  ) => {
    try {
      const { error } = await supabase
        .from("applications")
        .update({
          status,
          notes,
          reviewed_by: "admin@thcclub.com",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) throw error

      // If approved, create user account
      if (status === "approved") {
        const application = applications.find((app) => app.id === id)
        if (application) {
          // Generate login code and create approved user
          const loginCode = Math.random().toString(36).substring(2, 8).toUpperCase()

          await supabase.from("approved_users").insert({
            email: application.email,
            business_name: application.business_name,
            login_code: loginCode,
            application_id: id,
            is_active: true,
          })
        }
      }

      fetchApplications()
      setSelectedApplication(null)
      setReviewNotes("")
    } catch (error) {
      console.error("Error updating application:", error)
    }
  }

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || app.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        )
      case "under_review":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Eye className="w-3 h-3 mr-1" />
            Under Review
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Check className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <X className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getStatusCount = (status: string) => {
    return applications.filter((app) => app.status === status).length
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
        <h1 className="text-3xl font-black">Applications Management</h1>
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
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({applications.length})</SelectItem>
              <SelectItem value="pending">Pending ({getStatusCount("pending")})</SelectItem>
              <SelectItem value="under_review">Under Review ({getStatusCount("under_review")})</SelectItem>
              <SelectItem value="approved">Approved ({getStatusCount("approved")})</SelectItem>
              <SelectItem value="rejected">Rejected ({getStatusCount("rejected")})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{getStatusCount("pending")}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{getStatusCount("under_review")}</div>
            <div className="text-sm text-gray-600">Under Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{getStatusCount("approved")}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{getStatusCount("rejected")}</div>
            <div className="text-sm text-gray-600">Rejected</div>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      <div className="grid gap-4">
        {filteredApplications.map((application) => (
          <Card key={application.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{application.business_name}</h3>
                    {getStatusBadge(application.status)}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>Email:</strong> {application.email}
                    </p>
                    <p>
                      <strong>Business Type:</strong> {application.business_type}
                    </p>
                    <p>
                      <strong>Stage:</strong> {application.business_stage}
                    </p>
                    <p>
                      <strong>Applied:</strong> {new Date(application.created_at).toLocaleDateString()}
                    </p>
                    {application.notes && (
                      <p>
                        <strong>Notes:</strong> {application.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedApplication(application)
                          setReviewNotes(application.notes || "")
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Application Review - {selectedApplication?.business_name}</DialogTitle>
                      </DialogHeader>
                      {selectedApplication && (
                        <div className="space-y-6">
                          <Tabs defaultValue="details" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="details">Business Details</TabsTrigger>
                              <TabsTrigger value="story">Their Story</TabsTrigger>
                              <TabsTrigger value="review">Review</TabsTrigger>
                            </TabsList>

                            <TabsContent value="details" className="space-y-4">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Contact Information</h4>
                                  <div className="space-y-1 text-sm">
                                    <p>
                                      <strong>Business:</strong> {selectedApplication.business_name}
                                    </p>
                                    <p>
                                      <strong>Email:</strong> {selectedApplication.email}
                                    </p>
                                    <p>
                                      <strong>Phone:</strong> {selectedApplication.phone}
                                    </p>
                                    {selectedApplication.website && (
                                      <p>
                                        <strong>Website:</strong> {selectedApplication.website}
                                      </p>
                                    )}
                                    {selectedApplication.social_media && (
                                      <p>
                                        <strong>Social:</strong> {selectedApplication.social_media}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Business Info</h4>
                                  <div className="space-y-1 text-sm">
                                    <p>
                                      <strong>Type:</strong> {selectedApplication.business_type}
                                    </p>
                                    <p>
                                      <strong>Stage:</strong> {selectedApplication.business_stage}
                                    </p>
                                    <p>
                                      <strong>Revenue:</strong> {selectedApplication.monthly_revenue || "Not specified"}
                                    </p>
                                    <p>
                                      <strong>Team Size:</strong> {selectedApplication.team_size || "Not specified"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="story" className="space-y-4">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Product/Service Description</h4>
                                  <p className="text-sm bg-gray-50 p-3 rounded">
                                    {selectedApplication.product_description}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Why Join THC Club?</h4>
                                  <p className="text-sm bg-gray-50 p-3 rounded">{selectedApplication.why_join}</p>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">What Makes Them Unique?</h4>
                                  <p className="text-sm bg-gray-50 p-3 rounded">{selectedApplication.unique_value}</p>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">Community Contribution</h4>
                                  <p className="text-sm bg-gray-50 p-3 rounded">
                                    {selectedApplication.community_contribution}
                                  </p>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="review" className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium mb-2">Review Notes</label>
                                <Textarea
                                  placeholder="Add notes about this application..."
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  rows={4}
                                />
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  onClick={() =>
                                    updateApplicationStatus(selectedApplication.id, "under_review", reviewNotes)
                                  }
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Mark Under Review
                                </Button>
                                <Button
                                  onClick={() =>
                                    updateApplicationStatus(selectedApplication.id, "approved", reviewNotes)
                                  }
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  onClick={() =>
                                    updateApplicationStatus(selectedApplication.id, "rejected", reviewNotes)
                                  }
                                  variant="destructive"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>

                  {application.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateApplicationStatus(application.id, "under_review")}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateApplicationStatus(application.id, "approved")}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateApplicationStatus(application.id, "rejected")}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredApplications.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No applications found.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
