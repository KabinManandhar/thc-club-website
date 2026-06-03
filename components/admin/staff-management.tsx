"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { adminAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { Check, Eye, EyeOff, UserPlus, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface StaffRow {
  id: string
  email: string
  name: string
  is_active: boolean
  last_login_at?: string | null
  created_at: string
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: sessionData } = await supabase.auth.getSession()
  let accessToken = sessionData.session?.access_token

  if (!accessToken && typeof window !== "undefined") {
    accessToken = localStorage.getItem("admin_session") || undefined
  }

  if (!accessToken) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError || !refreshed.session?.access_token) {
      throw new Error("Not authenticated. Please sign out and sign in to admin again.")
    }
    accessToken = refreshed.session.access_token
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  }
}

function PasswordRequirement({ label, met }: { label: string; met: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${met ? "text-green-500" : "text-[#010307]/30"}`}>
      {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </div>
  )
}

export function StaffManagement() {
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [canManage, setCanManage] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const validation = {
    minLength: form.password.length >= 8,
    matches: form.password.length > 0 && form.password === form.confirmPassword,
  }
  const isValid = form.name.trim() && form.email.trim() && validation.minLength && validation.matches

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch("/api/admin/staff", { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load staff")
      setStaff(json.staff || [])
    } catch (err: any) {
      toast.error(err.message)
      setStaff([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    adminAuth.getCurrentUser().then((user) => {
      setCanManage(!!user && user.role !== "viewer")
      if (user && user.role !== "viewer") fetchStaff()
      else setLoading(false)
    })
  }, [fetchStaff])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || !canManage) return

    setSubmitting(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to create staff")

      toast.success(json.message || "Staff account created.")
      setForm({ name: "", email: "", password: "", confirmPassword: "" })
      fetchStaff()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (row: StaffRow) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/staff/${row.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ is_active: !row.is_active }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Update failed")
      toast.success(row.is_active ? "Staff access deactivated." : "Staff access reactivated.")
      fetchStaff()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  if (!canManage) {
    return (
      <div className="p-12 text-center text-gray-500 font-bold">
        You do not have permission to manage staff accounts.
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-2xl font-black tracking-tighter lowercase italic flex items-center gap-3">
          <UserPlus className="w-7 h-7 text-[#FE7F2D]" />
          staff accounts
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Create POS login credentials for in-store staff. Staff sign in at{" "}
          <span className="font-mono text-[#FE7F2D]">/pos</span>.
        </p>
      </div>

      <Card className="border-[#FE7F2D]/20 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-black lowercase italic">create staff account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Store Staff"
                  className="h-11 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email (login)</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="staff@thcclub.com"
                  className="h-11 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Min. 8 characters"
                    className="h-11 rounded-xl pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Confirm password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  className="h-11 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <PasswordRequirement label="8+ characters" met={validation.minLength} />
              <PasswordRequirement label="passwords match" met={validation.matches} />
            </div>

            <Button
              type="submit"
              disabled={!isValid || submitting}
              className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white rounded-xl h-12 px-8 font-black uppercase text-[10px] tracking-widest"
            >
              {submitting ? "Creating..." : "Create staff account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-gray-100 rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-gray-50">
          <CardTitle className="text-base font-black lowercase italic">active staff roster</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-black text-[10px] uppercase">Name</TableHead>
                <TableHead className="font-black text-[10px] uppercase">Email</TableHead>
                <TableHead className="font-black text-[10px] uppercase">Status</TableHead>
                <TableHead className="font-black text-[10px] uppercase">Last login</TableHead>
                <TableHead className="text-right font-black text-[10px] uppercase">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-gray-400 animate-pulse">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-gray-400">
                    No staff accounts yet.
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-bold">{row.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{row.email}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          row.is_active
                            ? "bg-green-50 text-green-700 border-none"
                            : "bg-gray-100 text-gray-500 border-none"
                        }
                      >
                        {row.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {row.last_login_at
                        ? new Date(row.last_login_at).toLocaleString("en-NP")
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-[10px] font-black uppercase"
                        onClick={() => toggleActive(row)}
                      >
                        {row.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
