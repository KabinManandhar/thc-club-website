"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lock, ArrowLeft } from "lucide-react"
import { userAuth } from "@/lib/user-auth"
import Image from "next/image"

interface UserLoginFormProps {
  onLoginSuccess: () => void
  onBack: () => void
}

export function UserLoginForm({ onLoginSuccess, onBack }: UserLoginFormProps) {
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { user, error: loginError } = await userAuth.login(loginData.email, loginData.password)

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
          <Button variant="ghost" onClick={onBack} className="absolute left-4 top-4 p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex justify-center">
            <Image src="/logo.png" alt="THC Club" width={120} height={60} className="h-12 w-auto" />
          </div>
          <div>
            <CardTitle className="text-2xl font-black flex items-center justify-center gap-2">
              <Lock className="w-6 h-6 text-[#FE7F2D]" />
              Member Access
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">Access your THC Club member portal</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
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
                  placeholder="your@email.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  className="border-[#FE7F2D]/20 focus:border-[#FE7F2D]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  className="border-[#FE7F2D]/20 focus:border-[#FE7F2D]"
                />
                <p className="text-xs text-gray-500">Enter your member password to access the portal</p>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Access Club"}
              </Button>
            </form>
          </div>

          <div className="text-center mt-6">
            <p className="text-xs text-gray-500">
              Don't have access yet?{" "}
              <button onClick={onBack} className="text-[#FE7F2D] hover:underline">
                Join the waitlist
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
