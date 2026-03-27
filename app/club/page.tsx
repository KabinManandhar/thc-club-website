"use client"

import { BrandDashboardOverview } from "@/components/club/brand-dashboard-overview"
import { BrandInbox } from "@/components/club/brand-inbox"
import { BrandLayout } from "@/components/club/brand-layout"
import { BrandLegal } from "@/components/club/brand-legal"
import { BrandPayouts } from "@/components/club/brand-payouts"
import { BrandProfile } from "@/components/club/brand-profile"
import { BrandSalesReport } from "@/components/club/brand-sales-report"
import { BrandShelfInfo } from "@/components/club/brand-shelf-info"
import { InventoryManagement } from "@/components/club/inventory-management"
import { OnboardingWizard } from "@/components/club/onboarding-wizard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { userAuth, type ApprovedUser } from "@/lib/user-auth"
import { Clock, LogOut, Shield, Zap } from "lucide-react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { toast } from "sonner"

function ClubPageContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<ApprovedUser | null>(null)
  const [brand, setBrand] = useState<any>(null)
  const [activeBooking, setActiveBooking] = useState<any | null>(null)
  const [pricingTiers, setPricingTiers] = useState<any[]>([])
  const [ppfTiers, setPpfTiers] = useState<any[]>([])
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("dashboard")

  useEffect(() => {
    if (searchParams.get("test_mode") === "true") {
      localStorage.setItem("thc_test_mode", "true")
    }
    checkAuth()
    fetchPublicConfig()
  }, [searchParams])

  const fetchPublicConfig = async () => {
    try {
      const [{ data: pt }, { data: ppf }] = await Promise.all([
        supabase.from("shelf_pricing_tiers").select("*"),
        supabase.from("ppf_tiers").select("*").order("min_sales_amount", { ascending: true })
      ])
      if (pt) setPricingTiers(pt)
      if (ppf) setPpfTiers(ppf)
    } catch (e) {
      console.error("Failed to load pricing config", e)
    }
  }

  const checkAuth = async () => {
    try {
      const isValid = await userAuth.verifySession()
      if (!isValid) {
        window.location.href = "/"
        return
      }
      const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development' || process.env.NODE_ENV === 'development'
      const isTestMode = typeof window !== 'undefined' && isDev && localStorage.getItem('thc_test_mode') === 'true'

      let user = await userAuth.getCurrentUser()

      if (!user && isTestMode) {
        user = { email: 'dev@thcclub.com', business_name: 'Dev Brand (Test)', id: 'test-user' } as any
      }

      setCurrentUser(user)
      if (user) await loadBrandData(user.email)
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Auth check error:', error)
      window.location.href = '/'
    } finally {
      setIsLoading(false)
    }
  }

  const loadBrandData = async (email: string) => {
    try {
      const { data: brandData } = await supabase
        .from("brands")
        .select("*")
        .eq("email", email)
        .maybeSingle()

      if (brandData) {
        setBrand(brandData)
        const { data: bookingData } = await supabase
          .from("shelf_bookings")
          .select("*")
          .eq("brand_id", brandData.id)
          .in("status", ["active", "pending"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        setActiveBooking(bookingData || null)
      } else {
        const { data: newBrand } = await supabase
          .from("brands")
          .insert({ email, business_name: email.split('@')[0], onboarding_status: "pending" })
          .select("*")
          .single()
        setBrand(newBrand || null)
      }
    } catch (err) {
      console.error("Error loading brand data:", err)
    }
  }

  const handleLogout = async () => {
    await userAuth.logout()
    window.location.href = "/"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFCEB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D] mx-auto mb-4"></div>
          <p className="text-[#010307]/60 font-medium lowercase tracking-wide text-sm">opening the club portal...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  const isApproved = activeBooking?.status === "active" || brand?.onboarding_status === "active"
  const isPendingApproval = brand && (brand.onboarding_status === "pending" || brand.onboarding_status === "slot_selected")

  if (isApproved && brand) {
    return (
      <BrandLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      >
        {activeTab === "dashboard" && <BrandDashboardOverview brandId={brand.id} onTabChange={setActiveTab} />}
        {activeTab === "sales" && <BrandSalesReport brandId={brand.id} />}
        {activeTab === "inventory" && <InventoryManagement brandId={brand.id} />}
        {activeTab === "inbox" && <BrandInbox brandId={brand.id} />}
        {activeTab === "shelf" && <BrandShelfInfo brandId={brand.id} onTabChange={setActiveTab} />}
        {activeTab === "payouts" && <BrandPayouts brandId={brand.id} />}
        {activeTab === "legal" && <BrandLegal brandId={brand.id} />}
        {activeTab === "profile" && <BrandProfile brandId={brand.id} />}
        {activeTab === "onboarding" && (
          <div className="max-w-4xl mx-auto py-10">
             <OnboardingWizard
              brandId={brand.id}
              businessName={brand.business_name}
              onComplete={() => {
                loadBrandData(brand.email)
                setActiveTab("dashboard")
                toast.success("Identity Synchronization Complete.")
              }}
            />
          </div>
        )}
      </BrandLayout>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFFCEB] text-[#010307] font-space-grotesk relative overflow-x-hidden">
      {isPendingApproval && (
         <div className="fixed top-0 left-0 right-0 z-[60] bg-[#FE7F2D] text-white py-3 px-4 sm:px-10 text-center flex items-center justify-center gap-2 sm:gap-4">
            <Clock className="w-4 h-4 shrink-0" />
            <p className="text-[10px] sm:text-[11px] font-bold lowercase tracking-widest italic truncate sm:whitespace-normal">
               identity verification in progress • limited access until approved
            </p>
         </div>
      )}

      <div className={`fixed top-0 left-0 right-0 z-50 bg-[#FFFCEB] text-[#010307] py-4 border-b border-[#FE7F2D]/10 flex items-center justify-center px-10 ${isPendingApproval ? 'mt-11' : ''}`}>
        <p className="text-[11px] font-bold lowercase tracking-widest italic text-[#010307]/40">
           the hidden collective • kathmandu club access
        </p>
      </div>

      <nav className="sticky top-12 z-40 bg-[#FFFCEB]/95 backdrop-blur-sm border-b border-[#FE7F2D]/10 mt-12 px-6 lg:px-12 py-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Image src="/logo.png" alt="THC Club" width={100} height={50} className="h-8 w-auto" />
              <Badge variant="outline" className="border-[#FE7F2D]/20 text-[#FE7F2D] text-[10px] lowercase font-bold tracking-wide px-4 py-1.5 rounded-full">partner access</Badge>
            </div>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="font-bold lowercase text-xs tracking-wide hover:bg-[#FE7F2D] hover:text-white rounded-xl h-12 px-6 transition-all"
            >
              <LogOut className="w-4 h-4 mr-2" /> secure logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-16 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex-nowrap justify-start border-b border-[#FE7F2D]/10 rounded-none h-auto p-0 bg-transparent mb-8 sm:mb-16 gap-6 sm:gap-10 overflow-x-auto scrollbar-hide">
            <TabsTrigger value="dashboard" className="data-[state=active]:border-b-2 data-[state=active]:border-[#FE7F2D] data-[state=active]:text-[#FE7F2D] rounded-none py-4 px-0 text-[10px] sm:text-xs font-bold lowercase tracking-wide bg-transparent transition-all border-b-2 border-transparent whitespace-nowrap">the pitch</TabsTrigger>
            <TabsTrigger value="pricing" className="data-[state=active]:border-b-2 data-[state=active]:border-[#FE7F2D] data-[state=active]:text-[#FE7F2D] rounded-none py-4 px-0 text-[10px] sm:text-xs font-bold lowercase tracking-wide bg-transparent transition-all border-b-2 border-transparent whitespace-nowrap">economics</TabsTrigger>
            <TabsTrigger value="slots" className="data-[state=active]:border-b-2 data-[state=active]:border-[#FE7F2D] data-[state=active]:text-[#FE7F2D] rounded-none py-4 px-0 text-[10px] sm:text-xs font-bold lowercase tracking-wide bg-transparent transition-all border-b-2 border-transparent whitespace-nowrap">slot space</TabsTrigger>
            <TabsTrigger value="onboarding" className="text-[#010307]/40 hover:text-[#FE7F2D] rounded-none py-4 px-0 text-[10px] sm:text-xs font-bold lowercase tracking-wide sm:ml-auto transition-all whitespace-nowrap">initiate onboarding</TabsTrigger>
          </TabsList>
        
          {/* --- THE PITCH --- */}
<TabsContent value="dashboard" className="space-y-12 sm:space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
  <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter lowercase leading-[0.9] italic">kathmandu's <span className="text-[#FE7F2D]">indie</span> marketplace.</h1>
        <p className="text-base sm:text-xl text-[#010307]/40 font-medium italic leading-relaxed lowercase">A curated collective in Bijeshwori, Swyambhu for Nepal's makers, doers, and dreamers.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button className="w-full sm:w-auto bg-[#FE7F2D] text-white h-14 sm:h-16 px-8 sm:px-10 rounded-2xl font-bold lowercase text-xs sm:text-sm tracking-wide shadow-xl shadow-orange-500/20" onClick={() => setActiveTab("onboarding")}>claim your shelf</Button>
        <Button variant="outline" className="w-full sm:w-auto h-14 sm:h-16 px-8 sm:px-10 rounded-2xl font-bold lowercase text-xs sm:text-sm tracking-wide border-[#010307]/10" onClick={() => setActiveTab("pricing")}>view tiers</Button>
      </div>
    </div>
    <div className="relative">
      <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-[2.5rem] p-12 bg-white/50 backdrop-blur-sm relative overflow-hidden group">
        <div className="space-y-8 relative z-10 text-center md:text-left">
          <div className="w-14 h-14 bg-[#FE7F2D] rounded-2xl flex items-center justify-center text-white mx-auto md:mx-0 shadow-lg shadow-orange-500/20">
            <Zap className="w-8 h-8" />
          </div>
          <h3 className="text-3xl font-black tracking-tight italic lowercase">cross-selling advantage</h3>
          <p className="text-[#010307]/60 font-medium leading-relaxed italic lowercase">Every shelf gets bonus exposure through Sayummys Cafe next door. People come for burgers and discover your brand.</p>
          <div className="pt-6 border-t border-[#010307]/5 flex flex-col md:flex-row items-center justify-between text-[11px] font-bold lowercase tracking-widest text-[#010307]/30 gap-4">
            <span>location: bijeshwori, swyambhu</span>
            <span className="bg-[#FE7F2D]/10 text-[#FE7F2D] px-3 py-1 rounded-full text-[9px]">108 shelf spaces</span>
          </div>
        </div>
      </Card>
    </div>
  </div>

  <section className="grid md:grid-cols-3 gap-8">
    {[
      { icon: Shield, title: "zero politics", desc: "Built by an indiepreneur to focus on your product and story, not pressure." },
      { icon: Zap, title: "shared muscle", desc: "Collaborative marketing, seasonal pushes, and social media spotlights." },
      { icon: Clock, title: "real data", desc: "We are working toward providing you with monthly sales and footfall insights." }
    ].map((item, i) => (
      <Card key={i} className="border border-[#FE7F2D]/10 shadow-sm rounded-2xl p-8 bg-white/50 backdrop-blur-sm group hover:border-[#FE7F2D]/30 transition-all">
        <div className="w-10 h-10 bg-[#FE7F2D]/10 text-[#FE7F2D] rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#FE7F2D] group-hover:text-white transition-colors">
          <item.icon className="w-5 h-5" />
        </div>
        <h4 className="text-lg font-black tracking-tight lowercase mb-2">{item.title}</h4>
        <p className="text-sm text-[#010307]/50 font-medium italic lowercase">{item.desc}</p>
      </Card>
    ))}
  </section>
</TabsContent>

{/* --- ECONOMICS --- */}
<TabsContent value="pricing" className="space-y-12 py-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
  <div className="max-w-4xl mx-auto space-y-10">
    <h2 className="text-5xl font-black tracking-tighter lowercase italic text-center text-[#010307]">the <span className="italic opacity-30">growth</span> model</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <Card className="p-8 border border-[#FE7F2D]/10 bg-white/50 rounded-3xl">
            <p className="text-[10px] font-bold text-[#FE7F2D] uppercase tracking-widest mb-2">entry</p>
            <h4 className="text-2xl font-black lowercase italic">Rs. 800 Registration</h4>
            <p className="text-sm text-[#010307]/50 italic">One-time fee for onboarding and slot setup.</p>
        </Card>
        <Card className="p-8 border border-[#FE7F2D]/10 bg-white/50 rounded-3xl">
            <p className="text-[10px] font-bold text-[#FE7F2D] uppercase tracking-widest mb-2">transparency</p>
            <h4 className="text-2xl font-black lowercase italic">No Hidden Cuts</h4>
            <p className="text-sm text-[#010307]/50 italic">Just simple shelf rent plus a performance-based fee.</p>
        </Card>
    </div>

    <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-[2.5rem] bg-white/50 backdrop-blur-sm overflow-hidden mb-12">
      <div className="table-responsive">
        <table className="w-full text-left">
          <thead className="bg-[#FE7F2D]/5 border-b border-[#FE7F2D]/10">
            <tr>
              <th className="px-6 sm:px-12 py-6 font-bold lowercase text-xs tracking-wide text-[#010307]/40 whitespace-nowrap">monthly sales</th>
              <th className="px-6 py-6 font-bold lowercase text-xs tracking-wide text-[#010307]/40 text-center whitespace-nowrap">processing fee</th>
              <th className="px-6 sm:px-12 py-6 font-bold lowercase text-xs tracking-wide text-[#010307]/40 text-right whitespace-nowrap">rent incentive</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#FE7F2D]/5 text-[#010307]">
            {ppfTiers.length > 0 ? ppfTiers.map((tier, idx) => {
               const nextTier = ppfTiers[idx + 1]
               const label = nextTier 
                  ? `Rs. ${tier.min_sales_amount.toLocaleString()} - ${nextTier.min_sales_amount.toLocaleString()}`
                  : `Rs. ${tier.min_sales_amount.toLocaleString()}+`
                  
               return (
                 <tr key={tier.id} className="group hover:bg-[#FE7F2D]/5 transition-colors">
                   <td className="px-6 sm:px-12 py-8 font-black text-lg sm:text-xl tracking-tighter lowercase italic whitespace-nowrap">{idx === 0 ? `Up to Rs. ${nextTier?.min_sales_amount.toLocaleString()}` : label}</td>
                   <td className="px-6 py-8 text-center font-black text-lg italic text-[#FE7F2D] whitespace-nowrap">{tier.ppf_rate}%</td>
                   <td className="px-6 sm:px-12 py-8 text-right font-bold lowercase text-[#FE7F2D] tracking-widest text-[11px] whitespace-nowrap">
                      {tier.rent_waiver_percent === 0 ? <span className="text-[#010307]/20">standard rent</span> : `${tier.rent_waiver_percent}% rent waived`}
                   </td>
                 </tr>
               )
            }) : (
               <tr className="group hover:bg-[#FE7F2D]/5 transition-colors">
                 <td colSpan={3} className="px-6 sm:px-12 py-8 text-center font-bold text-[#010307]/20 tracking-widest text-xs uppercase">Loading...</td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  </div>
</TabsContent>

{/* --- SLOT SPACE --- */}
<TabsContent value="slots" className="space-y-12 py-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
  <div className="max-w-4xl mx-auto space-y-12">
    
    {/* Opening Offer Alert */}
    <div className="relative overflow-hidden bg-[#FE7F2D] rounded-[2.5rem] p-8 text-white shadow-xl shadow-orange-500/20 border-4 border-white/20">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Zap className="w-32 h-32" />
      </div>
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <Badge className="bg-white text-[#FE7F2D] hover:bg-white font-black lowercase tracking-widest px-4 py-1">limited opening offer</Badge>
          <h3 className="text-3xl font-black italic lowercase tracking-tighter">first 40 slots only</h3>
          <p className="text-white/80 text-sm font-medium italic lowercase">These introductory rates are limited to the first 40 shelf slots. Pricing model is subject to change in the near future as we scale.</p>
        </div>
        <div className="shrink-0 bg-black/20 backdrop-blur-md rounded-2xl px-8 py-4 border border-white/10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1">status</p>
          <p className="text-2xl font-black italic">Active</p>
        </div>
      </div>
    </div>

    <h2 className="text-5xl font-black tracking-tighter lowercase italic text-center text-[#010307]">shelf <span className="italic opacity-30">tiers</span></h2>
    
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="border border-[#FE7F2D]/10 p-8 bg-white/50 rounded-[2rem] space-y-4 hover:border-[#FE7F2D]/30 transition-all">
        <h4 className="text-xl font-black lowercase italic">Low Level</h4>
        <div className="space-y-1">
          <p className="text-sm font-bold text-[#FE7F2D]">
            Rs. {pricingTiers.find(t => t.duration === 'yearly')?.bottom_price || '900'}/mo (Yearly)
          </p>
          <p className="text-[10px] text-[#010307]/40 font-bold uppercase">
            Rs. {pricingTiers.find(t => t.duration === 'quarterly')?.bottom_price || '1,100'} (Quarterly)
          </p>
        </div>
        <p className="text-xs text-[#010307]/50 italic">The bottom three rows of the shelf unit.</p>
      </Card>

      <Card className="border-2 border-[#FE7F2D] p-8 bg-white rounded-[2rem] space-y-4 relative shadow-lg">
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FE7F2D] text-[9px] uppercase tracking-widest font-black">top seller</Badge>
        <h4 className="text-xl font-black lowercase italic">Eye Level</h4>
        <div className="space-y-1">
          <p className="text-sm font-bold text-[#FE7F2D]">
            Rs. {pricingTiers.find(t => t.duration === 'yearly')?.eye_level_price || '1,200'}/mo (Yearly)
          </p>
          <p className="text-[10px] text-[#010307]/40 font-bold uppercase">
            Rs. {pricingTiers.find(t => t.duration === 'quarterly')?.eye_level_price || '1,500'} (Quarterly)
          </p>
        </div>
        <p className="text-xs text-[#010307]/50 italic">The two prime rows for maximum visibility and customer engagement.</p>
      </Card>

      <Card className="border border-[#FE7F2D]/10 p-8 bg-white/50 rounded-[2rem] space-y-4 hover:border-[#FE7F2D]/30 transition-all">
        <h4 className="text-xl font-black lowercase italic">Top Level</h4>
        <div className="space-y-1">
          <p className="text-sm font-bold text-[#FE7F2D]">
            Rs. {pricingTiers.find(t => t.duration === 'yearly')?.top_level_price || '1,000'}/mo (Yearly)
          </p>
          <p className="text-[10px] text-[#010307]/40 font-bold uppercase">
            Rs. {pricingTiers.find(t => t.duration === 'quarterly')?.top_level_price || '1,350'} (Quarterly)
          </p>
        </div>
        <p className="text-xs text-[#010307]/50 italic">The highest row of the display unit, ideal for larger statement pieces.</p>
      </Card>
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      <div className="p-10 bg-[#010307] text-white rounded-[3rem] space-y-4 relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-2xl font-black italic lowercase tracking-tighter">Multiple Shelves</h3>
          <p className="text-white/40 text-sm italic lowercase leading-relaxed">Brands taking multiple shelves get special discounts. We are open to talking about making this collab fruitful.</p>
        </div>
      </div>
      
      <div className="p-10 bg-[#FE7F2D]/5 border border-[#FE7F2D]/20 rounded-[3rem] flex items-center justify-center text-center">
        <p className="text-[#FE7F2D] text-sm font-bold italic lowercase">
          Total physical capacity: 108 shelf spaces across 3 curated rooms
        </p>
      </div>
    </div>
  </div>
</TabsContent>

          <TabsContent value="onboarding" className="py-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {brand && (
              <div className="max-w-4xl mx-auto">
                 <OnboardingWizard
                  brandId={brand.id}
                  businessName={brand.business_name}
                  onComplete={() => {
                    loadBrandData(brand.email)
                    setActiveTab("dashboard")
                    toast.success("brand setup complete.")
                  }}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <footer className="mt-32 border-t border-[#FE7F2D]/10 py-20 bg-[#FFFCEB] overflow-hidden relative">
         <div className="container mx-auto px-6 text-center space-y-6 relative z-10">
            <div className="flex justify-center flex-col items-center gap-6">
               <Image src="/logo.png" alt="THC Club" width={120} height={60} className="grayscale opacity-20" />
               <Badge variant="outline" className="border-[#010307]/10 text-[#010307]/20 font-mono text-[9px] lowercase font-bold tracking-widest px-4 py-1.5 rounded-full">kathmandu • nepal • outlet 01</Badge>
            </div>
            <p className="text-[11px] font-bold text-[#010307]/10 lowercase tracking-[0.2em]">the hidden collective club © 2026</p>
         </div>
      </footer>
    </div>
  )
}

export default function ClubPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFCEB] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D]"></div>
      </div>
    }>
      <ClubPageContent />
    </Suspense>
  )
}
