"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calculator, Save } from "lucide-react"

export function SalesInput() {
  const [selectedBrand, setSelectedBrand] = useState("1")
  const [salesAmount, setSalesAmount] = useState("")

  // Mock Brands
  const brands = [
    { id: "1", name: "Mountain Ceramics" },
    { id: "2", name: "Kathmandu Weaves" },
    { id: "3", name: "Everest Coffee" },
  ]

  const amount = parseFloat(salesAmount) || 0
  let feePercentage = 3
  if (amount >= 100000) feePercentage = 10
  else if (amount >= 50000) feePercentage = 7
  else if (amount >= 10000) feePercentage = 5

  const feeAmount = (amount * feePercentage) / 100
  const netAmount = amount - feeAmount

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Sales Input</h2>
          <p className="text-gray-600">Log monthly sales amounts for brands to automatically calculate commissions.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border-[#FE7F2D]/20">
          <CardHeader>
            <CardTitle>Log New Sale Record</CardTitle>
            <CardDescription>Enter the total POS/QR sales generating for the brand.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Brand</label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a brand..." />
                </SelectTrigger>
                <SelectContent>
                  {brands.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sales Amount (NPR)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">NPR</span>
                <Input 
                  type="number" 
                  className="pl-12" 
                  placeholder="0.00" 
                  value={salesAmount}
                  onChange={(e) => setSalesAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="pt-4">
              <Button className="w-full bg-[#010307] hover:bg-[#010307]/90 text-white">
                <Save className="h-4 w-4 mr-2" />
                Save Sales Record
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#FE7F2D] bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="h-5 w-5 mr-2 text-[#FE7F2D]" />
              Real-time Calculation
            </CardTitle>
            <CardDescription>Commission tier automatically applied.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between border-b border-orange-200 pb-2">
              <span className="text-gray-600">Gross Sales</span>
              <span className="font-medium">NPR {amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-orange-200 pb-2">
              <span className="text-gray-600">Service Fee ({feePercentage}%)</span>
              <span className="font-medium text-red-600">- NPR {feeAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="font-bold text-lg">Net Brand Payout</span>
              <span className="text-2xl font-black text-green-700">NPR {netAmount.toLocaleString()}</span>
            </div>
            {amount >= 50000 && (
              <div className="mt-4 bg-green-100 text-green-800 p-3 rounded-md text-sm font-medium text-center">
                ✨ Brand unlocks rent waiver tier!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
