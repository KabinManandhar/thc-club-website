"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Lock } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface WaitlistModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
  const [formData, setFormData] = useState({
    businessName: "",
    email: "",
    phone: "",
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { error } = await supabase.from("waitlist").insert([
        {
          business_name: formData.businessName,
          email: formData.email,
          phone: formData.phone,
        },
      ])

      if (error) throw error

      setIsSubmitted(true)
    } catch (error) {
      console.error("Error submitting waitlist:", error)
      // Handle error (show toast, etc.)
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
      <Card className="w-full max-w-md border-2 border-[#FE7F2D]/20">
        <CardHeader className="relative">
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-[#FE7F2D]" />
            <CardTitle className="text-xl font-black">join the waitlist</CardTitle>
          </div>
          <p className="text-sm text-gray-600">
            get early access to thc club. we'll send you login details once approved.
          </p>
        </CardHeader>
        <CardContent>
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">business/brand name</Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="your awesome brand"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  required
                  className="border-[#FE7F2D]/20 focus:border-[#FE7F2D]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="hello@yourbrand.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                  className="border-[#FE7F2D]/20 focus:border-[#FE7F2D]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+977 98xxxxxxxx"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  required
                  className="border-[#FE7F2D]/20 focus:border-[#FE7F2D]"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "join waitlist"}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                we'll review your application and send login details within 7-14 days
              </p>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <div className="text-2xl">✅</div>
              </div>
              <div>
                <h3 className="font-bold text-lg">you're on the list!</h3>
                <p className="text-gray-600">we'll review your application and send you login details soon.</p>
              </div>
              <Button onClick={onClose} variant="outline" className="w-full">
                close
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
