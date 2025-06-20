"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Lock } from "lucide-react"
import { adminAuth } from "@/lib/auth"
import Image from "next/image"

interface LoginFormProps {
  onLoginSuccess: () => void
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { user, error: loginError } = await adminAuth.login(formData.email, formData.password)

      if (loginError || !user) {
        setError(loginError || "Login failed")
        return
      }

      onLoginSuccess()
    } catch (error) {
      setError("An unexpected error occurred")
      console.error("Login error:", error)
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
              <Lock className="w-6 h-6 text-[#FE7F2D]" />
              Admin Login
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">Access the THC Club admin dashboard</p>
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
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@thcclub.com"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                required
                className="border-[#FE7F2D]/20 focus:border-[#FE7F2D]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
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
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center">
              <p className="text-xs text-gray-500">Authorized personnel only. All access is logged and monitored.</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
