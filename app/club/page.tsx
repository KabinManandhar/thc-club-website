"use client"

import { BrandDashboardOverview } from "@/components/club/brand-dashboard-overview"
import { BrandInbox } from "@/components/club/brand-inbox"
import { BrandLayout } from "@/components/club/brand-layout"
import { BrandLegal } from "@/components/club/brand-legal"
import { BrandPayouts } from "@/components/club/brand-payouts"
import { BrandProfile } from "@/components/club/brand-profile"
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
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState("dashboard")

  useEffect(() => {
    if (searchParams.get("test_mode") === "true") {
      localStorage.setItem("thc_test_mode", "true")
    }
    checkAuth()
  }, [searchParams])

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
        {activeTab === "dashboard" && <BrandDashboardOverview brandId={brand.id} />}
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
         <div className="fixed top-0 left-0 right-0 z-[60] bg-[#FE7F2D] text-white py-3 px-10 text-center flex items-center justify-center gap-4">
            <Clock className="w-4 h-4" />
            <p className="text-[11px] font-bold lowercase tracking-widest italic">
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
          <TabsList className="w-full justify-start border-b border-[#FE7F2D]/10 rounded-none h-auto p-0 bg-transparent mb-16 gap-10">
            <TabsTrigger value="dashboard" className="data-[state=active]:border-b-2 data-[state=active]:border-[#FE7F2D] data-[state=active]:text-[#FE7F2D] rounded-none py-4 px-0 text-xs font-bold lowercase tracking-wide bg-transparent transition-all border-b-2 border-transparent">the pitch</TabsTrigger>
            <TabsTrigger value="pricing" className="data-[state=active]:border-b-2 data-[state=active]:border-[#FE7F2D] data-[state=active]:text-[#FE7F2D] rounded-none py-4 px-0 text-xs font-bold lowercase tracking-wide bg-transparent transition-all border-b-2 border-transparent">economics</TabsTrigger>
            <TabsTrigger value="slots" className="data-[state=active]:border-b-2 data-[state=active]:border-[#FE7F2D] data-[state=active]:text-[#FE7F2D] rounded-none py-4 px-0 text-xs font-bold lowercase tracking-wide bg-transparent transition-all border-b-2 border-transparent">slot space</TabsTrigger>
            <TabsTrigger value="onboarding" className="text-[#010307]/40 hover:text-[#FE7F2D] rounded-none py-4 px-0 text-xs font-bold lowercase tracking-wide ml-auto transition-all">initiate onboarding</TabsTrigger>
          </TabsList>
        
          <TabsContent value="dashboard" className="space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
               <div className="space-y-10">
                  <div className="space-y-6">
                     <h1 className="text-6xl lg:text-7xl font-black tracking-tighter lowercase leading-[0.9] italic">kathmandu's <span className="text-[#FE7F2D]">creative</span> HQ.</h1>
                     <p className="text-xl text-[#010307]/40 font-medium italic leading-relaxed lowercase">this is your gateway to the club's physical ecosystem.</p>
                  </div>
                  <div className="flex gap-4">
                     <Button className="bg-[#FE7F2D] text-white h-16 px-10 rounded-2xl font-bold lowercase text-sm tracking-wide shadow-xl shadow-orange-500/20" onClick={() => setActiveTab("onboarding")}>claim your slot</Button>
                     <Button variant="outline" className="h-16 px-10 rounded-2xl font-bold lowercase text-sm tracking-wide border-[#010307]/10" onClick={() => setActiveTab("pricing")}>view terms</Button>
                  </div>
               </div>
                <div className="relative">
                  <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-[2.5rem] p-12 bg-white/50 backdrop-blur-sm relative overflow-hidden group">
                     <div className="space-y-8 relative z-10 text-center md:text-left">
                        <div className="w-14 h-14 bg-[#FE7F2D] rounded-2xl flex items-center justify-center text-white mx-auto md:mx-0 shadow-lg shadow-orange-500/20">
                           <Zap className="w-8 h-8" />
                        </div>
                        <h3 className="text-3xl font-black tracking-tight italic lowercase">physical shelf presence</h3>
                        <p className="text-[#010307]/60 font-medium leading-relaxed italic lowercase">once onboarded, choose from 108 high-visibility floor slots. your brand gets its own dedicated territory in the club.</p>
                        <div className="pt-6 border-t border-[#010307]/5 flex flex-col md:flex-row items-center justify-between text-[11px] font-bold lowercase tracking-widest text-[#010307]/30 gap-4">
                           <span>current capacity: 108 slots</span>
                           <span className="bg-[#FE7F2D]/10 text-[#FE7F2D] px-3 py-1 rounded-full text-[9px]">verified status required</span>
                        </div>
                     </div>
                  </Card>
               </div>
            </div>

            <section className="grid md:grid-cols-3 gap-8">
                {[
                  { icon: Shield, title: "curated vibe", desc: "we gatekeep energy, not money. only real creators build here." },
                  { icon: Zap, title: "direct sync", desc: "your products appear on customer dashboards instantly." },
                  { icon: Clock, title: "support 24/7", desc: "access the community inbox for any assistance." }
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

          <TabsContent value="pricing" className="space-y-12 py-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="max-w-4xl mx-auto space-y-10">
                <h2 className="text-5xl font-black tracking-tighter lowercase italic text-center text-[#010307]">transparent <span className="italic opacity-30">economics</span></h2>
                 <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-[2.5rem] bg-white/50 backdrop-blur-sm overflow-hidden mb-12">
                   <table className="w-full text-left">
                      <thead className="bg-[#FE7F2D]/5 border-b border-[#FE7F2D]/10">
                         <tr>
                            <th className="px-12 py-6 font-bold lowercase text-xs tracking-wide text-[#010307]/40">monthly sales tier</th>
                            <th className="py-6 font-bold lowercase text-xs tracking-wide text-[#010307]/40 text-center">payment processing fee</th>
                            <th className="px-12 py-6 font-bold lowercase text-xs tracking-wide text-[#010307]/40 text-right">rent waiver</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-[#FE7F2D]/5 text-[#010307]">
                         <tr className="group hover:bg-[#FE7F2D]/5 transition-colors">
                            <td className="px-12 py-8">
                               <p className="font-black text-xl tracking-tighter lowercase italic">tier 01: explore</p>
                               <span className="text-[10px] font-bold text-[#010307]/30 lowercase tracking-widest">below npr 10,000</span>
                            </td>
                            <td className="py-8 text-center font-black text-lg italic text-[#FE7F2D]">
                               3%
                            </td>
                            <td className="px-12 py-8 text-right font-bold lowercase text-[#010307]/20 tracking-widest text-[11px]">standard rent</td>
                         </tr>
                         <tr className="group hover:bg-[#FE7F2D]/5 transition-colors">
                            <td className="px-12 py-8">
                               <p className="font-black text-xl tracking-tighter lowercase italic">tier 02: active</p>
                               <span className="text-[10px] font-bold text-[#010307]/30 lowercase tracking-widest">npr 10,000 - 50,000</span>
                            </td>
                            <td className="py-8 text-center font-black text-lg italic text-[#FE7F2D]">
                               5%
                            </td>
                            <td className="px-12 py-8 text-right font-bold lowercase text-[#010307]/20 tracking-widest text-[11px]">standard rent</td>
                         </tr>
                         <tr className="group hover:bg-[#FE7F2D]/5 transition-colors">
                            <td className="px-12 py-8">
                               <p className="font-black text-xl tracking-tighter lowercase italic">tier 03: momentum</p>
                               <span className="text-[10px] font-bold text-[#010307]/30 lowercase tracking-widest">npr 50,000 - 100,000</span>
                            </td>
                            <td className="py-8 text-center font-black text-lg italic text-[#FE7F2D]">
                               7%
                            </td>
                            <td className="px-12 py-8 text-right font-bold lowercase text-[#FE7F2D] tracking-widest text-[11px]">50% rent waived</td>
                         </tr>
                         <tr className="group bg-[#FE7F2D]/5 hover:bg-[#FE7F2D]/10 transition-colors">
                            <td className="px-12 py-8">
                               <p className="font-black text-xl tracking-tighter lowercase italic">tier 04: master</p>
                               <Badge className="bg-[#FE7F2D] text-white border-none text-[8px] font-bold lowercase tracking-widest px-4">premium</Badge>
                               <span className="block text-[10px] font-bold text-[#010307]/30 lowercase tracking-widest mt-1">above npr 100,000</span>
                            </td>
                            <td className="py-8 text-center font-black text-lg italic text-[#FE7F2D]">
                               10%
                            </td>
                            <td className="px-12 py-8 text-right font-bold lowercase text-[#FE7F2D] tracking-widest text-[11px]">100% rent waived</td>
                         </tr>
                      </tbody>
                   </table>
                </Card>

                 <div className="p-12 bg-white border border-[#FE7F2D]/10 rounded-[3rem] shadow-sm flex flex-col md:flex-row items-center gap-12 relative overflow-hidden">
                    <div className="flex-1 space-y-4 relative z-10">
                       <h3 className="text-3xl font-black italic tracking-tighter lowercase text-[#010307]">performance alignment</h3>
                       <p className="text-[#010307]/50 text-base font-medium italic leading-relaxed lowercase">
                          our economics are built to reward growth. as your sales volume climbs, our community management and fulfillment workload increases, which is reflected in a progressive service fee. in return, we incentivize performance by entirely absorbing your shelf rental fixed costs.
                       </p>
                    </div>
                    <div className="shrink-0 flex gap-4 relative z-10">
                       <div className="p-8 bg-[#FE7F2D]/5 rounded-[2.5rem] border border-[#FE7F2D]/10 text-center min-w-[140px]">
                          <p className="text-[9px] font-bold lowercase text-[#FE7F2D]/60 tracking-widest mb-2">max platform fee</p>
                          <p className="text-2xl font-black text-[#FE7F2D] italic">10%</p>
                       </div>
                       <div className="p-8 bg-[#FE7F2D] rounded-[2.5rem] text-center min-w-[140px] shadow-lg shadow-orange-500/20">
                          <p className="text-[9px] font-bold lowercase text-white/60 tracking-widest mb-2">peak incentives</p>
                          <p className="text-2xl font-black text-white italic">full rent waiver</p>
                       </div>
                    </div>
                </div>
             </div>
          </TabsContent>

          <TabsContent value="slots" className="space-y-12 py-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="max-w-4xl mx-auto space-y-12">
                <h2 className="text-5xl font-black tracking-tighter lowercase italic text-center text-[#010307]">physical <span className="italic opacity-30">footprint</span></h2>
                
                <div className="grid md:grid-cols-2 gap-8">
                   <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-[2.5rem] p-10 bg-white/50 backdrop-blur-sm space-y-6">
                      <div className="w-12 h-12 bg-[#FE7F2D]/10 text-[#FE7F2D] rounded-2xl flex items-center justify-center font-black italic">01</div>
                      <h4 className="text-2xl font-black lowercase italic tracking-tight">floor territory</h4>
                      <p className="text-[#010307]/50 text-sm font-medium italic lowercase leading-relaxed">standard 2ft x 2ft footprint within the high-traffic main hall. optimized for individual brand pedestals or floor-standing racks.</p>
                      <div className="pt-4 border-t border-[#010307]/5 flex justify-between items-center text-[10px] font-bold lowercase tracking-widest text-[#010307]/30">
                         <span>available slots: 72</span>
                         <span className="text-[#FE7F2D]">classic access</span>
                      </div>
                   </Card>

                   <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-[2.5rem] p-10 bg-white/50 backdrop-blur-sm space-y-6">
                      <div className="w-12 h-12 bg-[#FE7F2D] text-white rounded-2xl flex items-center justify-center font-black italic">02</div>
                      <h4 className="text-2xl font-black lowercase italic tracking-tight">prime wall gallery</h4>
                      <p className="text-[#010307]/50 text-sm font-medium italic lowercase leading-relaxed">curated wall space for lifestyle products and vertical displays. premium lighting and high-eye-level visibility for key collections.</p>
                      <div className="pt-4 border-t border-[#010307]/5 flex justify-between items-center text-[10px] font-bold lowercase tracking-widest text-[#010307]/30">
                         <span>available slots: 24</span>
                         <span className="text-[#FE7F2D]">premium gallery</span>
                      </div>
                   </Card>

                   <Card className="md:col-span-2 border border-[#FE7F2D]/10 shadow-sm rounded-[2.5rem] p-10 bg-[#010307] text-white space-y-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-[#FE7F2D]/10 rounded-full -mr-32 -mt-32"></div>
                      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                         <div className="space-y-4">
                            <h4 className="text-3xl font-black lowercase italic tracking-tighter">island feature hubs</h4>
                            <p className="text-white/40 text-base font-medium italic lowercase leading-relaxed max-w-md">360-degree visibility at key intersection points. these are extremely limited, high-engagement spots for market leaders.</p>
                         </div>
                         <div className="shrink-0 flex items-center gap-6">
                            <div className="text-center">
                               <p className="text-4xl font-black italic text-[#FE7F2D]">12</p>
                               <p className="text-[9px] font-bold lowercase tracking-widest text-white/30 uppercase mt-1">total hubs</p>
                            </div>
                            <Button variant="outline" className="border-white/10 text-white hover:bg-white hover:text-[#010307] rounded-xl font-bold lowercase h-12 px-6" onClick={() => setActiveTab("onboarding")}>reserve hub</Button>
                         </div>
                      </div>
                   </Card>
                </div>

                <div className="p-10 bg-[#FE7F2D]/5 rounded-[3rem] border border-[#FE7F2D]/10 text-center">
                   <p className="text-sm font-medium italic lowercase text-[#010307]/60">
                      all 108 slots are managed via real-time grid mapping. once onboarded, you get a dedicated territory to build your brand’s physical presence in kathmandu.
                   </p>
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
