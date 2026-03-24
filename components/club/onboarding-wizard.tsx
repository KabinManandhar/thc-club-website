"use client"

import { useState } from "react"
import { supabase, SHELF_PRICING, DURATION_MONTHS, type ShelfType, type Duration } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckCircle2, ArrowRight, ArrowLeft, Clock, Package, CreditCard, Banknote, QrCode } from "lucide-react"

interface OnboardingWizardProps {
  brandId: string
  businessName: string
  onComplete: () => void
}

const STEPS = ["choose shelf", "duration & pricing", "payment method", "confirm", "submitted"]

const SHELF_INFO = {
  top_level: {
    label: "top level",
    description: "maximum visibility — above eye line. premium placement for standout brands.",
    color: "purple",
    slots: "73–108",
  },
  eye_level: {
    label: "eye level",
    description: "best conversion — directly in the shopper's line of sight.",
    color: "orange",
    slots: "37–72",
  },
  bottom: {
    label: "bottom / low level",
    description: "budget-friendly standard placement. great for heavy or large items.",
    color: "blue",
    slots: "1–36",
  },
}

const DURATION_INFO: Record<Duration, { label: string; months: number }> = {
  quarterly: { label: "quarterly", months: 3 },
  half_yearly: { label: "half-yearly", months: 6 },
  yearly: { label: "yearly (best value)", months: 12 },
}

export function OnboardingWizard({ brandId, businessName, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0)
  const [shelfType, setShelfType] = useState<ShelfType | null>(null)
  const [duration, setDuration] = useState<Duration | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const monthlyRent = shelfType && duration ? SHELF_PRICING[duration][shelfType] : 0
  const months = duration ? DURATION_MONTHS[duration] : 0
  const totalAmount = monthlyRent * months

  const handleSubmitBooking = async () => {
    if (!shelfType || !duration || !agreed) return
    setSubmitting(true)
    setError(null)

    try {
      const { error: bookingError } = await supabase.from("shelf_bookings").insert({
        brand_id: brandId,
        shelf_type: shelfType,
        duration: duration,
        monthly_rent: monthlyRent,
        total_amount: totalAmount,
        brand_agreement_accepted: true,
        status: "pending",
        payment_method: paymentMethod as any,
      })

      if (bookingError) throw bookingError

      await supabase
        .from("brands")
        .update({ onboarding_status: "slot_selected" })
        .eq("id", brandId)

      setStep(4)
    } catch (err: any) {
      setError(err.message || "Failed to submit booking")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12">
      {/* Progress Bar */}
      <div className="w-full max-w-2xl mb-10">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i < step
                    ? "bg-green-500 text-white"
                    : i === step
                    ? "bg-[#FE7F2D] text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-16 sm:w-24 mx-1 transition-all ${i < step ? "bg-green-500" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="text-center">
          <p className="text-sm text-[#010307]/40 font-bold lowercase tracking-wide">step {step + 1} of {STEPS.length}: <strong className="text-[#FE7F2D]">{STEPS[step]}</strong></p>
        </div>
      </div>

      {/* --- Step 0: Choose Shelf --- */}
      {step === 0 && (
        <div className="w-full max-w-3xl space-y-4">
          <h2 className="text-3xl font-black text-center mb-8 lowercase italic">select your shelf tier</h2>
          {(["top_level", "eye_level", "bottom"] as ShelfType[]).map((type) => {
            const info = SHELF_INFO[type]
            return (
              <div
                key={type}
                onClick={() => setShelfType(type)}
                className={`border-2 rounded-2xl p-6 cursor-pointer transition-all hover:shadow-md flex items-start gap-4 ${
                  shelfType === type
                    ? "border-[#FE7F2D] bg-[#FE7F2D]/5"
                    : "border-[#010307]/5 hover:border-[#FE7F2D]/30"
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-[#FE7F2D]/10 flex-shrink-0`}>
                   <Package className={`text-[#FE7F2D] w-6 h-6`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold lowercase italic">{info.label}</h3>
                    <Badge variant="outline" className="text-[10px] lowercase font-bold border-[#010307]/10">slots {info.slots}</Badge>
                    {type === "eye_level" && <Badge className="bg-[#FE7F2D] text-white text-[10px] lowercase font-bold">most popular</Badge>}
                  </div>
                  <p className="text-sm text-[#010307]/60 lowercase italic">{info.description}</p>
                  <p className="text-sm font-bold text-[#FE7F2D] mt-2 lowercase italic">
                    from npr {SHELF_PRICING.yearly[type].toLocaleString()}/mo (yearly)
                  </p>
                </div>
                {shelfType === type && <CheckCircle2 className="text-[#FE7F2D] w-6 h-6 flex-shrink-0" />}
              </div>
            )
          })}
          <div className="flex justify-end pt-4">
            <Button
              disabled={!shelfType}
              onClick={() => setStep(1)}
              className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white px-8"
            >
              Next <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* --- Step 1: Duration & Pricing --- */}
      {step === 1 && shelfType && (
        <div className="w-full max-w-3xl space-y-4">
          <h2 className="text-3xl font-black text-center mb-8">Choose Duration</h2>
          {(["quarterly", "half_yearly", "yearly"] as Duration[]).map((d) => {
            const dInfo = DURATION_INFO[d]
            const price = SHELF_PRICING[d][shelfType]
            const total = price * dInfo.months
            return (
              <div
                key={d}
                onClick={() => setDuration(d)}
                className={`border-2 rounded-xl p-6 cursor-pointer transition-all hover:shadow-md ${
                  duration === d ? "border-[#FE7F2D] bg-orange-50/50" : "border-gray-200 hover:border-[#FE7F2D]/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      {dInfo.label}
                      {d === "yearly" && <Badge className="bg-green-600 text-white text-xs">Best Value</Badge>}
                    </h3>
                    <p className="text-sm text-gray-500">{dInfo.months} months</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black">NPR {price.toLocaleString()}<span className="text-base font-normal text-gray-500">/mo</span></p>
                    <p className="text-sm text-gray-600">Total: <strong>NPR {total.toLocaleString()}</strong></p>
                  </div>
                  {duration === d && <CheckCircle2 className="text-[#FE7F2D] w-6 h-6 ml-4 flex-shrink-0" />}
                </div>
              </div>
            )
          })}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ArrowLeft className="mr-2 w-4 h-4" /> Back
            </Button>
            <Button disabled={!duration} onClick={() => setStep(2)} className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white px-8">
              Payment <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* --- Step 2: Payment Method --- */}
      {step === 2 && (
        <div className="w-full max-w-3xl space-y-4">
          <h2 className="text-3xl font-black text-center mb-8">Select Payment Mode</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { id: "bank_transfer", label: "bank transfer", icon: Banknote, desc: "direct transfer to club account" },
              { id: "qr_payment", label: "qr payment", icon: QrCode, desc: "scan and pay via fonepay/khalti" },
              { id: "cash", label: "cash at club", icon: Package, desc: "pay in person at kathmandu hq" },
              { id: "card", label: "debit/credit card", icon: CreditCard, desc: "swipe at the club access point" }
            ].map((pm) => (
              <div
                key={pm.id}
                onClick={() => setPaymentMethod(pm.id)}
                className={`border-2 rounded-2xl p-6 cursor-pointer transition-all hover:shadow-md flex items-center gap-4 ${
                  paymentMethod === pm.id ? "border-[#FE7F2D] bg-orange-50/50" : "border-gray-200 hover:border-[#FE7F2D]/50"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                  <pm.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">{pm.label}</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">{pm.desc}</p>
                </div>
                {paymentMethod === pm.id && <CheckCircle2 className="text-[#FE7F2D] w-5 h-5 ml-auto" />}
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 w-4 h-4" /> Back
            </Button>
            <Button disabled={!paymentMethod} onClick={() => setStep(3)} className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white px-8">
              Review <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* --- Step 3: Confirm Booking --- */}
      {step === 3 && shelfType && duration && (
        <div className="w-full max-w-2xl space-y-6">
          <h2 className="text-3xl font-black text-center mb-8">Review & Confirm</h2>
          <Card className="border-[#FE7F2D]">
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
              <CardDescription>for {businessName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Shelf Tier</span>
                <span className="font-semibold">{SHELF_INFO[shelfType].label}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Duration</span>
                <span className="font-semibold">{DURATION_INFO[duration].label}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Payment Mode</span>
                <span className="font-semibold uppercase text-xs tracking-widest">{paymentMethod?.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Monthly Rate</span>
                <span className="font-semibold">NPR {monthlyRent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="font-bold text-lg">Total Amount</span>
                <span className="text-2xl font-black text-[#FE7F2D]">NPR {totalAmount.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-50">
            <CardContent className="pt-6 text-sm text-gray-600 space-y-2 leading-relaxed">
              <p className="font-semibold text-[#010307]">Terms & Conditions</p>
              <p>• Your booking is subject to admin approval and slot assignment. You will be notified within 3-5 business days.</p>
              <p>• Payment is due upon booking confirmation. Non-payment will result in slot release.</p>
              <p>• Monthly sales reporting is required. Commission fees apply as per the published tier schedule.</p>
              <p>• Slot assignments are final and cannot be changed without prior admin approval.</p>
              <p>• Legal jurisdiction: Kathmandu, Nepal.</p>
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-xl border border-orange-200">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(c) => setAgreed(!!c)}
              className="mt-0.5"
            />
            <label htmlFor="agree" className="text-sm text-gray-700 cursor-pointer">
              I have read and agree to the THC Club Terms & Conditions for shelf placement.
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-2 w-4 h-4" /> Back
            </Button>
            <Button
              disabled={!agreed || submitting}
              onClick={handleSubmitBooking}
              className="bg-[#010307] hover:bg-[#010307]/90 text-white px-8"
            >
              {submitting ? "Submitting..." : "Submit Booking Request"}
            </Button>
          </div>
        </div>
      )}

      {/* --- Step 4: Submitted/Pending --- */}
      {step === 4 && (
        <div className="w-full max-w-lg text-center space-y-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-black">Booking Submitted!</h2>
          <p className="text-gray-600 leading-relaxed">
            Your shelf booking request has been sent to the THC Club team. We'll review it and assign your slot within <strong>3–5 business days</strong>.
          </p>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-amber-800">
                <Clock className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">You'll receive confirmation once the admin approves your booking. Your dashboard features will unlock automatically.</p>
              </div>
            </CardContent>
          </Card>
          <Button onClick={onComplete} className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white px-10">
            Go to Dashboard
          </Button>
        </div>
      )}
    </div>
  )
}
