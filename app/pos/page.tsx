"use client"

import { PosInvoiceCheckout } from "@/components/shared/pos-invoice-checkout"
import { StaffLoginForm } from "@/components/staff/staff-login-form"
import { StaffPosLayout } from "@/components/staff/staff-pos-layout"
import { StaffTodaysSales } from "@/components/staff/staff-todays-sales"
import { SafeImage } from "@/components/ui/safe-image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { staffAuth } from "@/lib/staff-auth"
import { Suspense, useEffect, useState } from "react"

function StaffPosContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [salesRefreshKey, setSalesRefreshKey] = useState(0)

  useEffect(() => {
    staffAuth.verifySession().then(setIsAuthenticated).finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFCEB] flex flex-col items-center justify-center gap-6">
        <SafeImage
          src="/thc_club.gif"
          alt="loading"
          width={500}
          height={300}
          className="w-[70vw] max-w-[500px] h-auto object-contain"
          unoptimized
        />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <StaffLoginForm onLoginSuccess={() => setIsAuthenticated(true)} />
  }

  return (
    <StaffPosLayout onLogout={() => setIsAuthenticated(false)}>
      <Tabs defaultValue="sale" className="w-full">
        <TabsList className="bg-white border border-black/5 rounded-2xl p-1 h-12 w-full max-w-md mb-8">
          <TabsTrigger
            value="sale"
            className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-[#FE7F2D] data-[state=active]:text-white"
          >
            New Sale
          </TabsTrigger>
          <TabsTrigger
            value="today"
            className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-[#FE7F2D] data-[state=active]:text-white"
          >
            Today&apos;s Sales
          </TabsTrigger>
        </TabsList>
        <TabsContent value="sale" className="mt-0 outline-none">
          <PosInvoiceCheckout
            compact
            title="store pos"
            description="ring up brand products and print receipts."
            onSaleComplete={() => setSalesRefreshKey((k) => k + 1)}
            getCurrentActor={async () => {
              const user = await staffAuth.getCurrentUser()
              if (!user) return null
              return { id: user.id, name: user.name }
            }}
          />
        </TabsContent>
        <TabsContent value="today" className="mt-0 outline-none">
          <StaffTodaysSales refreshKey={salesRefreshKey} />
        </TabsContent>
      </Tabs>
    </StaffPosLayout>
  )
}

export default function StaffPosPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFFCEB] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D]" />
        </div>
      }
    >
      <StaffPosContent />
    </Suspense>
  )
}
