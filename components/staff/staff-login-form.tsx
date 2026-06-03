"use client"

import type React from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { staffAuth } from "@/lib/staff-auth"
import { Eye, EyeOff, ShoppingCart } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

interface StaffLoginFormProps {
  onLoginSuccess: () => void
}

export function StaffLoginForm({ onLoginSuccess }: StaffLoginFormProps) {
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { user, error: loginError } = await staffAuth.login(formData.email, formData.password)
      if (loginError || !user) {
        setError(loginError || "Login failed")
        return
      }
      onLoginSuccess()
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFCEB] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-[#FE7F2D]/20">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Image src="/logo.png" alt="THC Club" width={120} height={60} className="h-12 w-auto" />
          </div>
          <div>
            <CardTitle className="text-2xl font-black flex items-center justify-center gap-2">
              <ShoppingCart className="w-6 h-6 text-[#FE7F2D]" />
              Staff POS Login
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">In-store sales terminal access</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="staff-email">Email Address</Label>
              <Input
                id="staff-email"
                type="email"
                placeholder="staff@thcclub.com"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                required
                className="border-[#FE7F2D]/20 focus:border-[#FE7F2D]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-password">Password</Label>
              <div className="relative">
                <Input
                  id="staff-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  required
                  className="border-[#FE7F2D]/20 focus:border-[#FE7F2D] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Open POS"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
