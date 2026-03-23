"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Lock, CheckCircle, ShieldCheck } from "lucide-react"
import { userAuth } from "@/lib/user-auth"

interface WaitlistModalProps {
  isOpen: boolean
  onClose: () => void
  onLoginClick: () => void
}

export function WaitlistModal({ isOpen, onClose, onLoginClick }: WaitlistModalProps) {
  const [formData, setFormData] = useState({
    businessName: "",
    email: "",
    phone: "",
    password: "",
    brandDescription: "",
    socialHandle: "",
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const { user, error: signUpError } = await userAuth.signUp(
        formData.email,
        formData.password,
        formData.businessName,
        formData.phone,
        formData.brandDescription,
        formData.socialHandle
      )

      if (signUpError) throw new Error(signUpError)

      setIsSubmitted(true)
    } catch (err: any) {
      console.error("Registration error:", err)
      setError(err.message || "Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-[#FE7F2D] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FE7F2D] via-orange-400 to-[#FE7F2D]"></div>
        
        <CardHeader className="relative">
          <button 
            onClick={onClose} 
            className="absolute right-0 top-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#FE7F2D]/10 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[#FE7F2D]" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black">Join the Collective</CardTitle>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Account Registration</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            Create your account to apply for membership and gain instant access to member pricing and application details.
          </p>
        </CardHeader>
        
        <CardContent>
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-xs font-bold uppercase text-gray-500">Business/Brand Name</Label>
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="The Hidden Collective"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange("businessName", e.target.value)}
                    required
                    className="border-gray-200 focus:border-[#FE7F2D] focus:ring-1 focus:ring-[#FE7F2D]"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold uppercase text-gray-500">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="hello@thc.club"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                      className="border-gray-200 focus:border-[#FE7F2D]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-bold uppercase text-gray-500">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+977"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      required
                      className="border-gray-200 focus:border-[#FE7F2D]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="socialHandle" className="text-xs font-bold uppercase text-gray-500">Instagram / Social Link</Label>
                  <Input
                    id="socialHandle"
                    type="text"
                    placeholder="@yourbrand or instagram.com/brand"
                    value={formData.socialHandle}
                    onChange={(e) => handleInputChange("socialHandle", e.target.value)}
                    required
                    className="border-gray-200 focus:border-[#FE7F2D]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brandDescription" className="text-xs font-bold uppercase text-gray-500">What do you sell / Brand Pitch</Label>
                  <Input
                    id="brandDescription"
                    type="text"
                    placeholder="Handcrafted ceramics, organic tea, etc."
                    value={formData.brandDescription}
                    onChange={(e) => handleInputChange("brandDescription", e.target.value)}
                    required
                    className="border-gray-200 focus:border-[#FE7F2D]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-bold uppercase text-gray-500">Create Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    required
                    minLength={6}
                    className="border-gray-200 focus:border-[#FE7F2D]"
                  />
                  <p className="text-[10px] text-gray-400">Minimum 6 characters required.</p>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2">
                  <X className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="flex flex-col items-center gap-4">
                <Button
                  type="submit"
                  className="w-full bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-bold py-6 text-lg shadow-lg hover:shadow-orange-200 transition-all"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Creating Account...
                    </div>
                  ) : (
                    "Create Account & Join"
                  )}
                </Button>

                <button
                  type="button"
                  onClick={onLoginClick}
                  className="text-sm text-gray-400 hover:text-[#FE7F2D] font-medium transition-colors"
                >
                  already registered? <span className="underline decoration-[#FE7F2D]/30 underline-offset-4">Login.</span>
                </button>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-medium">
                <Lock className="w-3 h-3" />
                Your data is secure and will only be used for club applications.
              </div>
            </form>
          ) : (
            <div className="text-center py-8 space-y-6">
              <div className="relative">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-[bounce_1s_infinite]">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <div className="absolute top-0 right-1/4 animate-ping">
                  <div className="w-4 h-4 bg-green-400 rounded-full opacity-75"></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-black text-2xl text-[#010307]">Application Started!</h3>
                <p className="text-gray-600 leading-relaxed">
                  Your account has been created. You can now log in to view our **Member Pricing** and finalized your membership application.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-sm font-medium text-gray-700">Next Step:</p>
                <p className="text-xs text-gray-500">Log in using your email and the password you just created.</p>
              </div>

              <Button 
                onClick={onClose} 
                className="w-full bg-[#010307] text-white font-bold py-6 hover:bg-[#010307]/90"
              >
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
