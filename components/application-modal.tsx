"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, CheckCircle, AlertCircle, Users, Target, Lightbulb, Heart } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface ApplicationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ApplicationModal({ isOpen, onClose }: ApplicationModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Personal Info
    businessName: "",
    email: "",
    phone: "",
    website: "",
    socialMedia: "",

    // Business Details
    businessType: "",
    businessStage: "",
    monthlyRevenue: "",
    teamSize: "",

    // Application Details
    productDescription: "",
    whyJoin: "",
    uniqueValue: "",
    communityContribution: "",

    // Criteria Acknowledgment
    acknowledgedCriteria: false,
    agreeToTerms: false,
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const criteria = [
    {
      icon: Target,
      title: "Local & Authentic",
      description: "Nepal-based businesses with genuine local connection",
      examples: ["Handcrafted products", "Local ingredients", "Cultural authenticity"],
    },
    {
      icon: Lightbulb,
      title: "Creative & Innovative",
      description: "Unique products or services that stand out",
      examples: ["Original designs", "Innovative solutions", "Creative storytelling"],
    },
    {
      icon: Heart,
      title: "Values-Driven",
      description: "Ethical practices and positive community impact",
      examples: ["Sustainable practices", "Fair trade", "Community support"],
    },
    {
      icon: Users,
      title: "Community-Minded",
      description: "Willing to collaborate and contribute to the collective",
      examples: ["Knowledge sharing", "Cross-promotion", "Event participation"],
    },
  ]

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { error } = await supabase.from("applications").insert([
        {
          business_name: formData.businessName,
          email: formData.email,
          phone: formData.phone,
          website: formData.website,
          social_media: formData.socialMedia,
          business_type: formData.businessType,
          business_stage: formData.businessStage,
          monthly_revenue: formData.monthlyRevenue,
          team_size: formData.teamSize,
          product_description: formData.productDescription,
          why_join: formData.whyJoin,
          unique_value: formData.uniqueValue,
          community_contribution: formData.communityContribution,
          status: "pending",
        },
      ])

      if (error) throw error
      setIsSubmitted(true)
    } catch (error) {
      console.error("Error submitting application:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 4))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto border-2 border-[#FE7F2D]/20">
        <CardHeader className="relative">
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-[#FE7F2D] rounded-full flex items-center justify-center text-white font-bold">
              {currentStep}
            </div>
            <CardTitle className="text-2xl font-black">
              {currentStep === 1 && "What We Look For"}
              {currentStep === 2 && "Personal Information"}
              {currentStep === 3 && "Business Details"}
              {currentStep === 4 && "Your Story"}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full ${step <= currentStep ? "bg-[#FE7F2D]" : "bg-gray-200"}`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {!isSubmitted ? (
            <>
              {/* Step 1: Criteria */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center space-y-4">
                    <h3 className="text-xl font-bold">We're looking for businesses that are:</h3>
                    <p className="text-gray-600">
                      THC Club is curated to maintain quality and community spirit. Here's what we value:
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {criteria.map((criterion, index) => {
                      const Icon = criterion.icon
                      return (
                        <div key={index} className="border rounded-lg p-6 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#FE7F2D]/10 rounded-lg flex items-center justify-center">
                              <Icon className="w-5 h-5 text-[#FE7F2D]" />
                            </div>
                            <h4 className="font-bold text-lg">{criterion.title}</h4>
                          </div>
                          <p className="text-gray-600">{criterion.description}</p>
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Examples:</p>
                            <div className="flex flex-wrap gap-2">
                              {criterion.examples.map((example, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {example}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="bg-[#FE7F2D]/10 rounded-lg p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-[#FE7F2D]" />
                      <h4 className="font-bold">Important Notes</h4>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• Applications are reviewed within 7-14 days</li>
                      <li>• We maintain a curated community of 108 shelf slots</li>
                      <li>• Approval is based on fit with our community values</li>
                      <li>• Rejected applications can reapply after 6 months</li>
                    </ul>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="criteria"
                      checked={formData.acknowledgedCriteria}
                      onCheckedChange={(checked) => handleInputChange("acknowledgedCriteria", checked)}
                    />
                    <Label htmlFor="criteria" className="text-sm">
                      I understand the criteria and believe my business is a good fit for THC Club
                    </Label>
                  </div>
                </div>
              )}

              {/* Step 2: Personal Information */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business/Brand Name *</Label>
                      <Input
                        id="businessName"
                        value={formData.businessName}
                        onChange={(e) => handleInputChange("businessName", e.target.value)}
                        placeholder="Your awesome brand"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        placeholder="hello@yourbrand.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        placeholder="+977 98xxxxxxxx"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => handleInputChange("website", e.target.value)}
                        placeholder="https://yourbrand.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="socialMedia">Social Media Handles</Label>
                    <Input
                      id="socialMedia"
                      value={formData.socialMedia}
                      onChange={(e) => handleInputChange("socialMedia", e.target.value)}
                      placeholder="@yourbrand on Instagram, Facebook, etc."
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Business Details */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessType">Business Type *</Label>
                      <Select
                        value={formData.businessType}
                        onValueChange={(value) => handleInputChange("businessType", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="handmade">Handmade Products</SelectItem>
                          <SelectItem value="fashion">Fashion & Accessories</SelectItem>
                          <SelectItem value="food">Food & Beverages</SelectItem>
                          <SelectItem value="home">Home & Lifestyle</SelectItem>
                          <SelectItem value="art">Art & Crafts</SelectItem>
                          <SelectItem value="beauty">Beauty & Wellness</SelectItem>
                          <SelectItem value="tech">Tech & Digital</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessStage">Business Stage *</Label>
                      <Select
                        value={formData.businessStage}
                        onValueChange={(value) => handleInputChange("businessStage", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="idea">Idea Stage</SelectItem>
                          <SelectItem value="startup">Early Startup</SelectItem>
                          <SelectItem value="growing">Growing Business</SelectItem>
                          <SelectItem value="established">Established Business</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monthlyRevenue">Monthly Revenue Range</Label>
                      <Select
                        value={formData.monthlyRevenue}
                        onValueChange={(value) => handleInputChange("monthlyRevenue", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0-10k">NPR 0 - 10,000</SelectItem>
                          <SelectItem value="10k-50k">NPR 10,000 - 50,000</SelectItem>
                          <SelectItem value="50k-100k">NPR 50,000 - 100,000</SelectItem>
                          <SelectItem value="100k-500k">NPR 100,000 - 500,000</SelectItem>
                          <SelectItem value="500k+">NPR 500,000+</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teamSize">Team Size</Label>
                      <Select value={formData.teamSize} onValueChange={(value) => handleInputChange("teamSize", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solo">Just me</SelectItem>
                          <SelectItem value="2-5">2-5 people</SelectItem>
                          <SelectItem value="6-10">6-10 people</SelectItem>
                          <SelectItem value="11-20">11-20 people</SelectItem>
                          <SelectItem value="20+">20+ people</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Your Story */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="productDescription">Describe your product/service *</Label>
                    <Textarea
                      id="productDescription"
                      value={formData.productDescription}
                      onChange={(e) => handleInputChange("productDescription", e.target.value)}
                      placeholder="Tell us what you create, make, or offer..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whyJoin">Why do you want to join THC Club? *</Label>
                    <Textarea
                      id="whyJoin"
                      value={formData.whyJoin}
                      onChange={(e) => handleInputChange("whyJoin", e.target.value)}
                      placeholder="What attracts you to our community?"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="uniqueValue">What makes your business unique? *</Label>
                    <Textarea
                      id="uniqueValue"
                      value={formData.uniqueValue}
                      onChange={(e) => handleInputChange("uniqueValue", e.target.value)}
                      placeholder="What sets you apart from others in your field?"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="communityContribution">How would you contribute to the THC Club community? *</Label>
                    <Textarea
                      id="communityContribution"
                      value={formData.communityContribution}
                      onChange={(e) => handleInputChange("communityContribution", e.target.value)}
                      placeholder="Workshops, collaborations, knowledge sharing, etc."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked)}
                    />
                    <Label htmlFor="terms" className="text-sm">
                      I agree to the terms and conditions and understand that approval is not guaranteed
                    </Label>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="px-6 bg-transparent"
                >
                  Previous
                </Button>

                {currentStep < 4 ? (
                  <Button
                    onClick={nextStep}
                    disabled={
                      (currentStep === 1 && !formData.acknowledgedCriteria) ||
                      (currentStep === 2 && (!formData.businessName || !formData.email || !formData.phone)) ||
                      (currentStep === 3 && (!formData.businessType || !formData.businessStage))
                    }
                    className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white px-6"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={
                      isSubmitting ||
                      !formData.productDescription ||
                      !formData.whyJoin ||
                      !formData.uniqueValue ||
                      !formData.communityContribution ||
                      !formData.agreeToTerms
                    }
                    className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white px-6"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-2xl mb-2">Application Submitted!</h3>
                <p className="text-gray-600 mb-4">
                  Thank you for applying to THC Club. We'll review your application and get back to you within 7-14
                  days.
                </p>
                <div className="bg-[#FE7F2D]/10 rounded-lg p-4 text-sm">
                  <p className="font-medium mb-2">What happens next?</p>
                  <ul className="text-left space-y-1">
                    <li>• We'll review your application against our criteria</li>
                    <li>• You'll receive a personal response via email</li>
                    <li>• If approved, you'll get access to pricing and next steps</li>
                    <li>• If not approved, you can reapply after 6 months</li>
                  </ul>
                </div>
              </div>
              <Button onClick={onClose} variant="outline" className="w-full bg-transparent">
                Close
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
