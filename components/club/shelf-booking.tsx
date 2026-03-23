"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

const PRICING = {
  quarterly: { low: 1100, eye: 1500, top: 1350 },
  half_yearly: { low: 1000, eye: 1350, top: 1100 },
  yearly: { low: 900, eye: 1200, top: 1000 },
}

export function ShelfBooking() {
  const [tier, setTier] = useState<"low" | "eye" | "top">("eye")
  const [duration, setDuration] = useState<"quarterly" | "half_yearly" | "yearly">("quarterly")

  const currentPrice = PRICING[duration][tier]
  const months = duration === "quarterly" ? 3 : duration === "half_yearly" ? 6 : 12
  const totalAmount = currentPrice * months

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border-[#FE7F2D]/20">
          <CardHeader>
            <CardTitle>Book a Shelf Slot</CardTitle>
            <CardDescription>Select your preferred tier and duration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Shelf Tier</label>
              <Select value={tier} onValueChange={(v: any) => setTier(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top Level (Premium)</SelectItem>
                  <SelectItem value="eye">Eye-Level (Best Visibility)</SelectItem>
                  <SelectItem value="low">Low Level (Standard)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration</label>
              <Select value={duration} onValueChange={(v: any) => setDuration(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarterly">Quarterly (3 Months)</SelectItem>
                  <SelectItem value="half_yearly">Half-Yearly (6 Months)</SelectItem>
                  <SelectItem value="yearly">Yearly (12 Months)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#FE7F2D] bg-orange-50/50">
          <CardHeader>
            <CardTitle>Pricing Summary</CardTitle>
            <CardDescription>Transparent pricing based on your selection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center border-b border-orange-200 pb-4">
              <span className="text-gray-600">Monthly Rate</span>
              <span className="text-2xl font-bold">NPR {currentPrice.toLocaleString()} / mo</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-orange-200 pb-4">
              <span className="text-gray-600">Total Duration</span>
              <span className="font-semibold">{months} Months</span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-lg">Total Amount</span>
              <span className="text-3xl font-black text-[#FE7F2D]">NPR {totalAmount.toLocaleString()}</span>
            </div>

            <Button className="w-full bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white mt-4" size="lg">
              Proceed to Booking
            </Button>
            {duration === "yearly" && (
              <p className="text-center text-sm text-green-600 font-medium">✨ You are getting the best value rates!</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#FE7F2D]/20">
        <CardHeader>
          <CardTitle>Pricing Matrix</CardTitle>
          <CardDescription>Compare our full pricing structure</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="py-3 font-semibold">Duration</th>
                  <th className="py-3 font-semibold">Low Level</th>
                  <th className="py-3 font-semibold">Eye-Level</th>
                  <th className="py-3 font-semibold">Top Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className={duration === "quarterly" ? "bg-orange-50/50" : ""}>
                  <td className="py-3 font-medium">Quarterly</td>
                  <td className="py-3">NPR 1,100/mo</td>
                  <td className="py-3">NPR 1,500/mo</td>
                  <td className="py-3">NPR 1,350/mo</td>
                </tr>
                <tr className={duration === "half_yearly" ? "bg-orange-50/50" : ""}>
                  <td className="py-3 font-medium">Half-Yearly</td>
                  <td className="py-3">NPR 1,000/mo</td>
                  <td className="py-3">NPR 1,350/mo</td>
                  <td className="py-3">NPR 1,100/mo</td>
                </tr>
                <tr className={duration === "yearly" ? "bg-[#FE7F2D]/10" : ""}>
                  <td className="py-3 font-medium">
                    Yearly <Badge className="ml-2 bg-[#FE7F2D] text-white">Best Value</Badge>
                  </td>
                  <td className="py-3 font-bold">NPR 900/mo</td>
                  <td className="py-3 font-bold">NPR 1,200/mo</td>
                  <td className="py-3 font-bold">NPR 1,000/mo</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
