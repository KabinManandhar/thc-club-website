"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Lock, Mail, ArrowLeft } from "lucide-react"
import { userAuth } from "@/lib/user-auth"
import Image from "next/image"

interface UserLoginFormProps {
  onLoginSuccess: () => void
  onBack: () => void
}

export function UserLoginForm({ onLoginSuccess, onBack }: UserLoginFormProps) {
  const [loginData, setLoginData] = useState({
    email: "",
    loginCode: "",
  })
  const [requestEmail, setRequestEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { user, error: loginError } = await userAuth.login(loginData.email, loginData.loginCode)

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

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const { success: requestSuccess, error: requestError } = await userAuth.requestLoginCode(requestEmail)

      if (requestError) {
        setError(requestError)
        return
      }

      setSuccess("If your email is in our approved list, you should have received your login code during approval.")
    } catch (error) {
      setError("An unexpected error occurred")
      console.error("Request code error:", error)
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
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="request">Get Code</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
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
                  <Label htmlFor="loginCode">6-Digit Login Code</Label>
                  <Input
                    id="loginCode"
                    type="text"
                    placeholder="123456"
                    value={loginData.loginCode}
                    onChange={(e) =>
                      setLoginData((prev) => ({ ...prev, loginCode: e.target.value.replace(/\D/g, "").slice(0, 6) }))
                    }
                    required
                    maxLength={6}
                    className="border-[#FE7F2D]/20 focus:border-[#FE7F2D] text-center text-lg tracking-widest"
                  />
                  <p className="text-xs text-gray-500">Enter the 6-digit code you received when approved</p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Access Club"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="request" className="space-y-4">
              <form onSubmit={handleRequestCode} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {success && (
                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="requestEmail">Email Address</Label>
                  <Input
                    id="requestEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={requestEmail}
                    onChange={(e) => setRequestEmail(e.target.value)}
                    required
                    className="border-[#FE7F2D]/20 focus:border-[#FE7F2D]"
                  />
                  <p className="text-xs text-gray-500">Enter the email you used for your waitlist application</p>
                </div>

                <Button
                  type="submit"
                  variant="outline"
                  className="w-full border-[#FE7F2D] text-[#FE7F2D] hover:bg-[#FE7F2D] hover:text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Checking..." : "Find My Code"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

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
