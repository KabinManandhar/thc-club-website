"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase, type BrandSales, calculateCommission } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Gift } from "lucide-react"

interface SalesTrackerProps {
  brandId: string
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function SalesTracker({ brandId }: SalesTrackerProps) {
  const [salesData, setSalesData] = useState<BrandSales[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const fetchSales = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("brand_sales")
      .select("*")
      .eq("brand_id", brandId)
      .eq("year", parseInt(selectedYear))
      .order("month")
    setSalesData(data || [])
    setLoading(false)
  }, [brandId, selectedYear])

  useEffect(() => { fetchSales() }, [fetchSales])

  const currentMonthData = salesData.find(
    (s) => s.month === currentMonth && s.year === currentYear
  )
  const currentSales = currentMonthData?.gross_sales || 0
  const commission = calculateCommission(currentSales)

  const totalYearSales = salesData.reduce((acc, s) => acc + s.gross_sales, 0)
  const previousMonth = salesData.find((s) => s.month === currentMonth - 1)
  const growth = previousMonth?.gross_sales
    ? ((currentSales - previousMonth.gross_sales) / previousMonth.gross_sales) * 100
    : null

  const years = [currentYear, currentYear - 1, currentYear - 2].map(String)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Sales & Commission Tracker</h2>
          <p className="text-gray-600">Your real-time sales performance and commission breakdown.</p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#FE7F2D]/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <BarChart3 className="w-4 h-4" /> This Month
            </div>
            <p className="text-2xl font-black text-[#010307]">
              NPR {currentSales.toLocaleString()}
            </p>
            {growth !== null && (
              <p className={`text-sm mt-2 flex items-center gap-1 ${growth >= 0 ? "text-green-600" : "text-red-500"}`}>
                {growth >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(growth).toFixed(1)}% vs last month
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#FE7F2D]/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <DollarSign className="w-4 h-4" /> Current Tier
            </div>
            <p className="text-2xl font-black text-[#FE7F2D]">{commission.tierName}</p>
            <p className="text-sm text-gray-600 mt-2">{commission.rate}% service fee</p>
          </CardContent>
        </Card>

        <Card className="border-[#FE7F2D]/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <DollarSign className="w-4 h-4" /> Fee This Month
            </div>
            <p className="text-2xl font-black text-red-600">
              NPR {commission.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-sm text-gray-600 mt-2">Deducted from payout</p>
          </CardContent>
        </Card>

        <Card className={`border-2 ${commission.waiverPercent > 0 ? "border-green-400 bg-green-50" : "border-gray-200"}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Gift className="w-4 h-4" /> Rent Waiver
            </div>
            <p className="text-2xl font-black text-green-700">{commission.waiverPercent}%</p>
            <p className="text-sm text-green-700 mt-2">
              {commission.waiverPercent > 0 ? "Applied to next billing!" : `Reach NPR ${currentSales < 10000 ? "10k" : "50k"} to unlock`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown Table */}
      <Card className="border-[#FE7F2D]/20">
        <CardHeader>
          <CardTitle>Monthly Breakdown — {selectedYear}</CardTitle>
          <CardDescription>Annual total: <strong>NPR {totalYearSales.toLocaleString()}</strong></CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-gray-400">Loading sales data...</div>
          ) : salesData.length === 0 ? (
            <div className="py-10 text-center">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 text-sm">No sales recorded for {selectedYear} yet.</p>
              <p className="text-gray-400 text-xs mt-1">Sales appear here automatically when invoices are generated for your brand.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Gross Sales</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Fee Rate</TableHead>
                  <TableHead className="text-right">Fee Amount</TableHead>
                  <TableHead className="text-center">Rent Waiver</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.map((s) => {
                  const isCurrent = s.month === currentMonth && s.year === currentYear
                  return (
                    <TableRow key={s.id} className={isCurrent ? "bg-orange-50/50 font-medium" : ""}>
                      <TableCell>
                        {MONTH_NAMES[s.month - 1]} {s.year}
                        {isCurrent && <Badge className="ml-2 bg-[#FE7F2D] text-white text-xs">Current</Badge>}
                      </TableCell>
                      <TableCell className="text-right">NPR {s.gross_sales.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{s.invoice_count}</TableCell>
                      <TableCell className="text-right">{s.commission_rate || "—"}%</TableCell>
                      <TableCell className="text-right text-red-600">
                        {s.commission_amount ? `NPR ${s.commission_amount.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {(s.rent_waiver_percent || 0) > 0 ? (
                          <Badge className="bg-green-100 text-green-800">{s.rent_waiver_percent}% waived</Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Commission Tier Reference */}
      <Card className="border-[#FE7F2D]/20">
        <CardHeader>
          <CardTitle>Commission Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Monthly Sales</TableHead>
                <TableHead className="text-center">Fee</TableHead>
                <TableHead className="text-center">Rent Benefit</TableHead>
                <TableHead className="text-center">Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { range: "Below NPR 10,000", fee: "3%", waiver: "Full rent", tier: "Starter", active: currentSales < 10000 },
                { range: "NPR 10,000 – 50,000", fee: "5%", waiver: "Full rent", tier: "Silver", active: currentSales >= 10000 && currentSales < 50000 },
                { range: "NPR 50,000 – 1,00,000", fee: "7%", waiver: "50% rent waived", tier: "Gold", active: currentSales >= 50000 && currentSales < 100000 },
                { range: "Above NPR 1,00,000", fee: "10%", waiver: "100% rent waived", tier: "Platinum", active: currentSales >= 100000 },
              ].map((row) => (
                <TableRow key={row.tier} className={row.active ? "bg-orange-50/50" : ""}>
                  <TableCell>{row.range}</TableCell>
                  <TableCell className="text-center font-bold text-[#FE7F2D]">{row.fee}</TableCell>
                  <TableCell className="text-center">{row.waiver}</TableCell>
                  <TableCell className="text-center">
                    {row.active ? (
                      <Badge className="bg-[#FE7F2D] text-white">Current</Badge>
                    ) : (
                      <span className="text-gray-500">{row.tier}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
