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
  onSwitchToSignup: () => void
}

export function UserLoginForm({ onLoginSuccess, onBack, onSwitchToSignup }: UserLoginFormProps) {
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
      <Card className="w-full max-w-md border-[#FE7F2D]/10 shadow-sm overflow-hidden rounded-[2.5rem]">
        <CardHeader className="text-center space-y-6 p-8 pb-4 relative bg-white/50 backdrop-blur-sm">
          <Button variant="ghost" onClick={onBack} className="absolute -left-2 top-2 p-2 hover:bg-black/5 rounded-full">
            <ArrowLeft className="w-4 h-4 text-[#010307]/40 hover:text-[#010307]" />
          </Button>
          <div className="flex justify-center pt-4">
             <Image src="/logo.png" alt="THC Club" width={120} height={60} className="h-12 w-auto" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-black lowercase italic flex items-center justify-center gap-3">
              <Lock className="w-5 h-5 text-[#FE7F2D]" />
              member access
            </CardTitle>
            <p className="text-[11px] lowercase font-bold tracking-widest text-[#010307]/40">secure kathmandu gate 01</p>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-0 bg-white/50 backdrop-blur-sm">
          <div className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="rounded-2xl border-red-100 bg-red-50 text-red-600">
                  <AlertDescription className="font-bold text-xs lowercase italic">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[11px] font-bold lowercase tracking-widest text-[#010307]/40 ml-1">email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="creator@email.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  className="border-[#010307]/10 focus:border-[#FE7F2D] rounded-2xl h-14 font-medium bg-white/80"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[11px] font-bold lowercase tracking-widest text-[#010307]/40 ml-1">security password</Label>
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
                  className="border-[#010307]/10 focus:border-[#FE7F2D] rounded-2xl h-14 bg-white/80"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-bold lowercase text-lg tracking-wide h-16 rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? "authenticating..." : "access the club area"}
              </Button>
            </form>

            <div className="text-center pt-8 border-t border-[#010307]/10">
              <p className="text-[11px] font-bold text-[#010307]/40 lowercase tracking-widest">
                new to the collective?{" "}
                <button 
                  onClick={onSwitchToSignup}
                  className="text-[#FE7F2D] hover:underline font-bold"
                >
                  apply here
                </button>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
