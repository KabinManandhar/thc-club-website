"use client"

import { useState, useEffect } from "react"
import { supabase, type Brand } from "@/lib/supabase"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Users } from "lucide-react"

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  slot_selected: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function BrandManagement() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    supabase
      .from("brands")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setBrands(data || [])
        setLoading(false)
      })
  }, [])

  const filtered = brands.filter(
    (b) =>
      b.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Brand Management</h2>
          <p className="text-gray-600">All brands registered in the collective.</p>
        </div>
        <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border">
          {brands.length} brands total
        </div>
      </div>

      <Card className="border-[#FE7F2D]/20">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by brand name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Brand Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-gray-400">Loading brands...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10">
                      <Users className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-gray-400 text-sm">No brands yet</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((b) => (
                    <TableRow key={b.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{b.business_name}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        <div>{b.email}</div>
                        {b.phone && <div className="text-gray-400">{b.phone}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${STATUS_COLORS[b.onboarding_status] || "bg-gray-100 text-gray-700"} hover:opacity-90`}>
                          {b.onboarding_status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {timeAgo(b.updated_at || b.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
