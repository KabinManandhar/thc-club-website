"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UserPlus, ArrowLeft, CheckCircle2 } from "lucide-react"
import { userAuth } from "@/lib/user-auth"
import Image from "next/image"

interface UserSignupFormProps {
  onSignupSuccess: () => void
  onBack: () => void
  onSwitchToLogin: () => void
}

export function UserSignupForm({ onSignupSuccess, onBack, onSwitchToLogin }: UserSignupFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    businessName: "",
    phone: "",
    description: "",
    socialHandle: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const { user, error: signupError } = await userAuth.signUp(
        formData.email,
        formData.password,
        formData.businessName,
        formData.phone,
        formData.description,
        formData.socialHandle
      )

      if (signupError || !user) {
        setError(signupError || "Registration failed")
        return
      }

      setIsSuccess(true)
      setTimeout(() => {
        onSignupSuccess()
      }, 2000)
    } catch (error) {
      setError("An unexpected error occurred")
      console.error("Signup error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#FFFCEB] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-[#FE7F2D]/10 shadow-sm text-center p-8 space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black lowercase italic">welcome to THC Club</h2>
            <p className="text-[#010307]/60 text-sm lowercase">your account has been created successfully. entering the club...</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFFCEB] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-[#FE7F2D]/10 shadow-sm overflow-hidden rounded-[2.5rem]">
        <div className="md:flex">
          <div className="p-8 w-full bg-white/50 backdrop-blur-sm">
            <CardHeader className="p-0 mb-8 space-y-6 relative">
              <Button variant="ghost" onClick={onBack} className="absolute -left-2 top-0 p-2 hover:bg-black/5 rounded-full">
                <ArrowLeft className="w-4 h-4 text-[#010307]/40" />
              </Button>
              <div className="flex justify-center pt-2">
                <Image src="/logo.png" alt="THC Club" width={120} height={60} className="h-12 w-auto" />
              </div>
              <div className="text-center space-y-2">
                <CardTitle className="text-3xl font-black lowercase italic flex items-center justify-center gap-3">
                  <UserPlus className="w-6 h-6 text-[#FE7F2D]" />
                  join the collective
                </CardTitle>
                <CardDescription className="text-xs font-bold lowercase tracking-widest text-[#010307]/40 mt-2">
                  apply for membership & view shelf pricing
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <form onSubmit={handleSignup} className="space-y-8">
                {error && (
                  <Alert variant="destructive" className="rounded-2xl border-red-100 bg-red-50 text-red-600">
                    <AlertDescription className="font-bold text-xs lowercase italic">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="businessName" className="text-[11px] font-bold lowercase tracking-widest text-[#010307]/40 ml-1">brand / business name</Label>
                    <Input
                      id="businessName"
                      placeholder="your brand name"
                      value={formData.businessName}
                      onChange={handleChange}
                      required
                      className="border-[#010307]/10 focus:border-[#FE7F2D] rounded-2xl h-14 font-medium bg-white/80"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[11px] font-bold lowercase tracking-widest text-[#010307]/40 ml-1">phone number (mandatory)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+977 98XXXXXXXX"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="border-[#010307]/10 focus:border-[#FE7F2D] rounded-2xl h-14 font-medium bg-white/80"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[11px] font-bold lowercase tracking-widest text-[#010307]/40 ml-1">email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="creator@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="border-[#010307]/10 focus:border-[#FE7F2D] rounded-2xl h-14 font-medium bg-white/80"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="socialHandle" className="text-[11px] font-bold lowercase tracking-widest text-[#010307]/40 ml-1">instagram / social handle</Label>
                    <Input
                      id="socialHandle"
                      placeholder="@yourbrand"
                      value={formData.socialHandle}
                      onChange={handleChange}
                      required
                      className="border-[#010307]/10 focus:border-[#FE7F2D] rounded-2xl h-14 font-medium bg-white/80"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[11px] font-bold lowercase tracking-widest text-[#010307]/40 ml-1">security password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="border-[#010307]/10 focus:border-[#FE7F2D] rounded-2xl h-14 bg-white/80"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-[11px] font-bold lowercase tracking-widest text-[#010307]/40 ml-1">confirm password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="border-[#010307]/10 focus:border-[#FE7F2D] rounded-2xl h-14 bg-white/80"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-[11px] font-bold lowercase tracking-widest text-[#010307]/40 ml-1">brand pitch (what do you build?)</Label>
                  <Textarea
                    id="description"
                    placeholder="tell us about your story and products..."
                    value={formData.description}
                    onChange={handleChange}
                    required
                    className="border-[#010307]/10 focus:border-[#FE7F2D] rounded-2xl min-h-[120px] font-medium bg-white/80"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-bold lowercase text-lg tracking-wide h-16 rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading ? "creating identity..." : "initiate membership"}
                </Button>

                <div className="text-center pt-4">
                  <p className="text-[11px] font-bold text-[#010307]/40 lowercase tracking-widest">
                    already a member?{" "}
                    <button 
                      type="button"
                      onClick={onSwitchToLogin}
                      className="text-[#FE7F2D] hover:underline font-bold"
                    >
                      secure login
                    </button>
                  </p>
                </div>
              </form>
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  )
}

