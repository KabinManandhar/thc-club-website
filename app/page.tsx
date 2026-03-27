"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, BarChart3, Eye, Heart, Instagram, Lock, LogIn, Package, ShieldCheck, Users, Zap } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { UserLoginForm } from "@/components/user-login-form"
import { UserSignupForm } from "@/components/user-signup-form"
import { supabase, type Brand } from "@/lib/supabase"
import { userAuth } from "@/lib/user-auth"

export default function LandingPage() {

  const [authView, setAuthView] = useState<"none" | "login" | "signup">("none")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [brands, setBrands] = useState<Brand[]>([])
  const [activeTab, setActiveTab] = useState<"home" | "members">("home")
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!api) return

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })

    const interval = setInterval(() => {
      api.scrollNext()
    }, 5000)

    return () => clearInterval(interval)
  }, [api])

  useEffect(() => {
    checkAuth()
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    try {
      const { data } = await supabase
        .from("brands")
        .select("id, business_name, logo_url, instagram_handle")
        .eq("onboarding_status", "active")
        .order("business_name", { ascending: true })
      
      if (data) setBrands(data as Brand[])
    } catch (error) {
      console.error("Error fetching brands:", error)
    }
  }

  const checkAuth = async () => {
    try {
      const isValid = await userAuth.verifySession()
      if (isValid) {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error("Auth check error:", error)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthSuccess = () => {
    setIsAuthenticated(true)
    window.location.href = "/club"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFCEB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D] mx-auto mb-4"></div>
          <p className="text-[#010307]/60 font-medium lowercase tracking-wide text-sm">opening the club...</p>
        </div>
      </div>
    )
  }

  if (authView === "login") {
    return (
      <UserLoginForm 
        onLoginSuccess={handleAuthSuccess} 
        onBack={() => setAuthView("none")} 
        onSwitchToSignup={() => setAuthView("signup")}
      />
    )
  }

  if (authView === "signup") {
    return (
      <UserSignupForm 
        onSignupSuccess={handleAuthSuccess} 
        onBack={() => setAuthView("none")} 
        onSwitchToLogin={() => setAuthView("login")}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#FFFCEB] text-[#010307] font-space-grotesk">
      {/* Persistent Marquee */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#FFFCEB] text-[#010307] py-2 sm:py-3 overflow-hidden border-b border-[#FE7F2D]/20">
        <div className="animate-marquee whitespace-nowrap">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className="inline-block px-6 sm:px-12 text-xs sm:text-sm font-bold tracking-wide ">
              the first rule of <span className="thc-highlight">THC Club</span> is you talk about{" "}
              <span className="thc-highlight">THC Club</span>. the second rule of{" "}
              <span className="thc-highlight">THC Club</span> is you TALK ABOUT{" "}
              <span className="thc-highlight">THC Club</span>.
            </span>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-10 sm:top-12 z-40 bg-[#FFFCEB]/95 backdrop-blur-sm border-b border-[#FE7F2D]/20 mt-10 sm:mt-12">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="thc club logo"
                width={100}
                height={50}
                className="h-8 w-auto cursor-pointer transition-transform hover:scale-105"
                onClick={() => setActiveTab("home")}
              />
              <div className="flex flex-1 sm:ml-8 overflow-x-auto scrollbar-hide items-center gap-4 sm:gap-6 px-2 sm:px-0 mask-linear-fade">
                <button
                  onClick={() => setActiveTab("home")}
                  className={`text-[10px] sm:text-xs font-black lowercase italic tracking-widest whitespace-nowrap transition-all ${
                    activeTab === "home" ? "text-[#FE7F2D] border-b border-[#FE7F2D]" : "text-[#010307]/40 hover:text-[#010307]"
                  }`}
                >
                  home
                </button>
                <button
                  onClick={() => setActiveTab("members")}
                  className={`text-[10px] sm:text-xs font-black lowercase italic tracking-widest whitespace-nowrap transition-all ${
                    activeTab === "members" ? "text-[#FE7F2D] border-b border-[#FE7F2D]" : "text-[#010307]/40 hover:text-[#010307]"
                  }`}
                >
                  members
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-6 shrink-0">
              <Image
                src="/broski.png"
                alt="broski mascot"
                width={32}
                height={32}
                className="h-6 w-6 sm:h-8 sm:w-8 transition-transform hover:rotate-12 hidden sm:block"
              />
              <div className="flex gap-1.5 sm:gap-2">
                <Button
                  size="sm"
                  className="bg-[#FE7F2D] hover:bg-black text-white font-black lowercase italic tracking-widest shadow-lg rounded-xl h-8 sm:h-10 px-3 sm:px-8 text-[10px] sm:text-sm transition-all active:scale-95"
                  onClick={() => setAuthView("signup")}
                >
                  apply <span className="hidden sm:inline ml-1">now</span>
                </Button>
                {!isAuthenticated && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#010307]/20 text-[#010307] hover:bg-[#010307] hover:text-white font-black lowercase italic tracking-widest rounded-xl h-8 sm:h-10 px-2 sm:px-6 text-[10px] sm:text-sm transition-all"
                      onClick={() => setAuthView("login")}
                    >
                      <LogIn className="w-3 h-3 sm:mr-2 hidden sm:inline" />
                      login
                    </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {activeTab === "home" ? (
        <>
          {/* Hero Section */}
          <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 lg:py-32">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8 fade-in">
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 bg-[#FE7F2D]/10 text-[#FE7F2D] px-4 py-2 rounded-full text-xs font-medium lowercase tracking-wide">
                      <Heart className="w-3 h-3 fill-[#FE7F2D]" />
                      curated. transparent. real.
                    </div>

                    {/* Logo instead of text */}
                    <div className="flex justify-center lg:justify-start">
                      <Image
                        src="/logo.png"
                        alt="the hidden collective club logo"
                        width={500}
                        height={250}
                        className="w-full max-lg h-auto transition-transform hover:scale-105"
                        priority
                      />
                    </div>

                    <div className="pt-4 space-y-6">
                      <Carousel 
                        setApi={setApi}
                        opts={{
                          loop: true,
                        }}
                        className="w-full max-w-lg"
                      >
                        <CarouselContent>
                          {[
                            { 
                              icon: ShieldCheck, 
                              title: "01. apply for access", 
                              desc: "apply to join the collective. we curate energy, not just products. only the most intentional creators get a shelf." 
                            },
                            { 
                              icon: Package, 
                              title: "02. secure a slot", 
                              desc: "once approved, book your dedicated shelf. 108 slots, first-come first-served. your story starts on our shelf." 
                            },
                            { 
                              icon: BarChart3, 
                              title: "03. live analytics", 
                              desc: "go live and monitor your sales pulsate in real-time via your club terminal. automated payouts, zero friction." 
                            }
                          ].map((item, index) => (
                            <CarouselItem key={index}>
                              <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-[#FE7F2D]/10 flex items-center justify-center">
                                    <item.icon className="w-5 h-5 text-[#FE7F2D]" />
                                  </div>
                                  <h3 className="text-lg font-black lowercase italic text-[#010307]">{item.title}</h3>
                                </div>
                                <p className="text-base sm:text-xl text-[#010307]/60 leading-relaxed italic lowercase">
                                  {item.desc}
                                </p>
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                      </Carousel>
                      
                      {/* Carousel Indicators */}
                      <div className="flex gap-2">
                        {Array.from({ length: count }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 transition-all duration-300 rounded-full ${
                              current === i ? "w-8 bg-[#FE7F2D]" : "w-1.5 bg-[#010307]/10"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button
                      size="lg"
                      className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-bold lowercase tracking-wide text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-8 rounded-2xl group transition-all active:scale-95 shadow-xl shadow-orange-500/20"
                      onClick={() => setAuthView("signup")}
                    >
                      join the club
                      <Zap className="ml-3 h-5 w-5 animate-pulse text-white" />
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-[#010307]/20 text-[#010307] hover:bg-[#010307]/5 font-bold lowercase tracking-wide text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-8 rounded-2xl transition-all"
                      onClick={() => {
                        if (isAuthenticated) window.location.href = "/club"
                        else setAuthView("login")
                      }}
                    >
                      <Eye className="mr-3 h-4 w-4" />
                      {isAuthenticated ? "go to club" : "view pricing"}
                    </Button>
                  </div>
                </div>
                <div className="relative fade-in flex justify-center lg:justify-end">
                  <div className="relative w-full max-w-sm sm:max-w-md aspect-square bg-[#FFFCEB] rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 border border-[#FE7F2D]/10 shadow-2xl group overflow-visible">
                    {/* Minimal background deco with its own overflow clipping */}
                    {/* <div className="absolute inset-0 rounded-[3rem] overflow-visible pointer-events-none">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FE7F2D]/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
                    </div> */}
                    
                    <div className="relative z-10 w-full h-full flex flex-col items-center justify-center space-y-12">
                      <div className="relative">
                        <Image 
                          src="/broski.png" 
                          alt="THC Club" 
                          width={380} 
                          height={380} 
                          className="w-full h-auto drop-shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-2"
                          priority
                        />
                        <div className="absolute -bottom-4 -right-4 sm:-bottom-8 sm:-right-8 bg-[#FE7F2D] text-white p-3 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl border-4 border-[#FFFCEB] rotate-12 transition-all group-hover:rotate-6 z-20 group-hover:scale-110">
                           <p className="text-lg sm:text-2xl font-black italic lowercase leading-none">zero fakes.</p>
                           <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest mt-1 sm:mt-2 opacity-60">Verified Collective</p>
                        </div>
                        
                        <div className="absolute -top-6 -left-6 sm:-top-10 sm:-left-10 bg-black text-white p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-2xl -rotate-12 transition-all group-hover:rotate-0 z-20">
                           <div className="flex items-center gap-1.5 sm:gap-2">
                              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-ping" />
                              <p className="text-[9px] sm:text-xs font-black uppercase tracking-widest italic">Live from Kathmandu</p>
                           </div>
                        </div>
                      </div>
                      
                      <div className="space-y-6 text-center w-full">
                        <div className="flex justify-center gap-6 sm:gap-12">
                          <div className="text-center group/stat">
                            <p className="text-2xl sm:text-3xl font-black italic text-[#FE7F2D] lowercase leading-none transition-transform group-hover/stat:scale-110">
                              {brands.length || "12"}+
                            </p>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#010307]/30 mt-2">active brands</p>
                          </div>
                          
                          <div className="w-px h-10 bg-[#010307]/5 self-center" />
                          
                          <div className="text-center group/stat">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              <p className="text-2xl sm:text-3xl font-black italic text-[#010307] lowercase leading-none transition-transform group-hover/stat:scale-110">
                                active
                              </p>
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#010307]/30 mt-2">curation status</p>
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#010307]/5 rounded-xl">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40 italic">
                               nepal's creative headquarters
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* What We Are - Teaser */}
          <section className="py-12 sm:py-20 lg:py-32 bg-white section-divider">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-4xl mx-auto text-center space-y-12">
                <div className="space-y-6">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black lowercase italic tracking-tighter">what is thc club?</h2>
                  <p className="text-lg sm:text-xl lg:text-2xl text-[#010307]/60 font-medium italic leading-relaxed max-w-3xl mx-auto lowercase">
                    nepal's first curated creative collective. we're a community of real creators sharing space, telling
                    their stories, and making the city feel alive.
                  </p>
                  <div className="text-2xl font-black lowercase italic text-[#FE7F2D]">
                    it's a movement. it's a club. it's yours if you're real.
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
                  {[
                    { icon: Heart, title: "community first", desc: "real creators, real stories" },
                    { icon: Users, title: "curated collective", desc: "quality over quantity" },
                    { icon: Lock, title: "exclusive access", desc: "apply now to view pricing & details" },
                  ].map((item, index) => (
                    <div key={index} className="text-center space-y-4 hover-lift">
                      <div className="w-16 h-16 bg-[#FE7F2D]/10 rounded-2xl flex items-center justify-center mx-auto">
                        <item.icon className="w-8 h-8 text-[#FE7F2D]" />
                      </div>
                      <h3 className="font-bold text-lg">{item.title}</h3>
                      <p className="text-[#010307]/60">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Exclusive Access Banner */}
          <section className="py-12 bg-[#010307] text-white">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
                <div className="flex items-center justify-center gap-4">
                  <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-[#FE7F2D]" />
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black">exclusive access required</h2>
                  <Lock className="w-6 h-6 text-[#FE7F2D]" />
                </div>
                <p className="text-lg text-white/80 max-w-2xl mx-auto">
                  Register your account to get full access to pricing, shelf availability, and membership applications.
                </p>
                <div className="grid md:grid-cols-3 gap-6 mt-8">
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-black text-[#FE7F2D]">step 1</div>
                    <div className="text-sm text-white/70">register account</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-black text-[#FE7F2D]">step 2</div>
                    <div className="text-sm text-white/70">book a shelf</div>
                  </div>
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-black text-[#FE7F2D]">step 3</div>
                    <div className="text-sm text-white/70">get approved & live</div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                  <Button
                    size="lg"
                    className="bg-[#FE7F2D] text-white hover:bg-[#FE7F2D]/90 font-bold lowercase tracking-wide text-lg px-10 py-5 rounded-xl group transition-all h-14 shadow-lg shadow-orange-500/20"
                    onClick={() => setAuthView("signup")}
                  >
                    apply for membership
                    <ArrowRight className="ml-3 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                  {!isAuthenticated && (
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-white/20 text-black hover:bg-white/90 font-bold lowercase tracking-wide text-lg px-10 py-5 rounded-xl h-14"
                        onClick={() => setAuthView("login")}
                      >
                        <LogIn className="mr-3 h-4 w-4" />
                        already approved?
                      </Button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Club Members Section Teaser */}
          <section className="py-12 sm:py-20 lg:py-32 bg-white">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16 space-y-6">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black lowercase italic tracking-tighter">our club members</h2>
                  <p className="text-xl text-[#010307]/60 font-medium italic lowercase">
                    the brands that make the collective real. approved, selling, and building.
                  </p>
                </div>
                
                {brands.length > 0 ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    {brands.slice(0, 4).map((brand) => (
                      <div key={brand.id} className="group relative flex flex-col items-center gap-4 transition-all duration-300 hover-lift">
                        <div className="w-32 h-32 bg-[#FFFCEB] rounded-[2.5rem] border border-[#FE7F2D]/10 flex items-center justify-center p-6 overflow-hidden shadow-lg group-hover:shadow-xl transition-all">
                          {brand.logo_url ? (
                            <Image
                              src={brand.logo_url}
                              alt={brand.business_name}
                              width={120}
                              height={120}
                              className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-500"
                            />
                          ) : (
                            <div className="text-4xl font-black text-[#FE7F2D]/20">{brand.business_name.substring(0, 2).toLowerCase()}</div>
                          )}
                        </div>
                        <h3 className="font-bold lowercase italic text-[#010307]/80 group-hover:text-[#FE7F2D] transition-colors">{brand.business_name}</h3>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-[#FFFCEB]/50 rounded-[3rem] border border-dashed border-[#FE7F2D]/20">
                    <p className="text-[#010307]/40 font-medium italic lowercase">new creators joining the collective soon...</p>
                  </div>
                )}

                {brands.length > 4 && (
                  <div className="text-center mt-12">
                     <Button 
                        variant="outline" 
                        onClick={() => setActiveTab("members")}
                        className="rounded-full border-[#FE7F2D]/20 text-[#010307] hover:bg-[#FE7F2D]/5 font-black uppercase text-[10px] tracking-widest px-8 transition-all"
                     >
                        view all {brands.length} members
                     </Button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Who It's For - Teaser */}
          <section className="py-12 sm:py-20 lg:py-32 bg-[#FFFCEB] border-y border-[#FE7F2D]/10">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16 space-y-6">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black">is this for you?</h2>
                  <p className="text-xl text-[#010307]/70">
                    We're built for creators and brands who are doing things with intention — whether you're just starting
                    or scaling up.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {[
                    { title: "local product makers", desc: "handcrafted in nepal", emoji: "🏠" },
                    { title: "handmade + custom brands", desc: "one-of-a-kind creations", emoji: "✋" },
                    { title: "ethical fashion, food, home", desc: "conscious commerce", emoji: "🌱" },
                    { title: "niche or experimental", desc: "testing bold ideas", emoji: "🧪" },
                  ].map((item, index) => (
                    <Card
                      key={index}
                      className="text-center border-none shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
                    >
                      <CardContent className="pt-8 pb-8 space-y-4">
                        <div className="text-4xl mb-4">{item.emoji}</div>
                        <h3 className="font-bold text-lg">{item.title}</h3>
                        <p className="text-sm text-[#010307]/60">{item.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="text-center mt-12">
                  <p className="text-xl font-bold text-[#FE7F2D]">you bring the hustle. we'll bring the shelf.</p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-12 sm:py-20 lg:py-32 bg-[#010307] text-white">
            <div className="container mx-auto px-4 sm:px-6 text-center">
              <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-tight">
                  ready to <span className="gradient-text">join</span>?
                </h2>
                <div className="space-y-3 sm:space-y-4">
                  <p className="text-lg sm:text-2xl font-bold">108 shelf slots. curated community. exclusive access.</p>
                  <p className="text-xl text-white/80">if you're building something real, we want you here.</p>
                  <p className="text-2xl sm:text-3xl font-black text-[#FE7F2D]">🖤 this is thc club.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-bold lowercase tracking-wide text-base sm:text-xl px-8 sm:px-12 py-6 sm:py-8 rounded-2xl group transition-all active:scale-95 shadow-2xl shadow-orange-500/40"
                    onClick={() => setAuthView("signup")}
                  >
                    join the club
                    <Zap className="ml-3 h-5 w-5 animate-pulse text-white" />
                  </Button>
                  {!isAuthenticated && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="border-white/20 text-black hover:bg-white/90 font-bold lowercase tracking-wide text-base sm:text-xl px-8 sm:px-12 py-6 sm:py-8 rounded-2xl transition-all"
                      onClick={() => setAuthView("login")}
                    >
                      <Lock className="mr-3 h-4 w-4" />
                      member access
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="py-12 sm:py-20 lg:py-32 bg-[#FFFCEB] min-h-[60vh]">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12 sm:mb-24 space-y-4 sm:space-y-6">
                <div className="inline-flex items-center gap-2 bg-[#FE7F2D]/10 text-[#FE7F2D] px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                  <Users className="w-3 h-3" />
                  the collective
                </div>
                <h2 className="text-4xl sm:text-6xl lg:text-8xl font-black lowercase italic tracking-tighter">our club members</h2>
                <p className="text-lg sm:text-2xl text-[#010307]/60 font-medium italic lowercase max-w-3xl mx-auto leading-relaxed">
                  a curated gallery of nepal's most intentional creators. from hand-made ceramics to ethical fashion, this is the crew building the future.
                </p>
              </div>
              
              {brands.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-12">
                  {brands.map((brand) => (
                    <div key={brand.id} className="group relative flex flex-col items-center gap-4 sm:gap-6 transition-all duration-300 hover-lift">
                      <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-56 md:h-56 bg-white rounded-[2rem] sm:rounded-[3rem] border border-[#FE7F2D]/5 flex items-center justify-center p-6 sm:p-10 overflow-hidden shadow-2xl group-hover:shadow-[#FE7F2D]/10 transition-all">
                        {brand.logo_url ? (
                          <Image
                            src={brand.logo_url}
                            alt={brand.business_name}
                            width={200}
                            height={200}
                            className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-700"
                          />
                        ) : (
                          <div className="text-6xl font-black text-[#FE7F2D]/10 group-hover:text-[#FE7F2D]/30 transition-colors uppercase tracking-widest">{brand.business_name.substring(0, 2)}</div>
                        )}
                      </div>
                      <div className="text-center space-y-2">
                        <h3 className="text-lg sm:text-2xl font-black lowercase italic text-[#010307] group-hover:text-[#FE7F2D] transition-colors">{brand.business_name}</h3>
                        {brand.instagram_handle && (
                          <div className="flex items-center justify-center gap-2 bg-black/5 px-4 py-1.5 rounded-full group-hover:bg-[#FE7F2D]/10 group-hover:text-[#FE7F2D] transition-all">
                             <Instagram className="w-3 h-3" />
                             <p className="text-[10px] font-black lowercase tracking-widest">
                                @{brand.instagram_handle.replace("@", "")}
                             </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-40 bg-white/50 rounded-[4rem] border border-dashed border-[#FE7F2D]/10">
                  <p className="text-2xl text-[#010307]/30 font-black lowercase italic">new creators joining the collective soon...</p>
                </div>
              )}

              <div className="mt-16 sm:mt-40 bg-[#010307] text-[#FFFCEB] p-8 sm:p-16 rounded-[2rem] sm:rounded-[4rem] flex flex-col items-center text-center space-y-6 sm:space-y-8">
                 <h4 className="text-2xl sm:text-4xl font-black lowercase italic tracking-tight">want to see your brand here?</h4>
                 <p className="text-base sm:text-xl text-[#FFFCEB]/60 max-w-2xl font-medium">we're always looking for real creators doing real things. apply for membership today.</p>
                 <Button 
                    onClick={() => setAuthView("signup")}
                    className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-black lowercase italic tracking-widest px-8 sm:px-12 py-6 sm:py-8 rounded-2xl sm:rounded-3xl text-base sm:text-xl shadow-2xl shadow-orange-500/20"
                 >
                    join the collective
                 </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-16 sm:py-32 bg-[#FFFCEB] border-t border-[#FE7F2D]/10 safe-bottom">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-10 sm:space-y-16">
            <div className="flex flex-col items-center gap-10">
              <div className="flex items-center gap-8">
                <Image
                  src="/logo.png"
                  alt="THC Club Logo"
                  width={140}
                  height={70}
                  className="h-14 w-auto drop-shadow-sm"
                />
                <div className="w-px h-12 bg-[#FE7F2D]/20 rotate-12" />
                <Image
                  src="/broski.png"
                  alt="THC Club Mascot"
                  width={64}
                  height={64}
                  className="h-16 w-16 drop-shadow-md animate-bounce delay-700"
                />
              </div>
              
              <div className="space-y-4">
                <p className="text-2xl font-black lowercase italic tracking-tight">kathmandu, nepal</p>
                <div className="flex items-center justify-center gap-4">
                   <Badge variant="outline" className="border-[#FE7F2D]/20 text-[#FE7F2D]/60 lowercase font-bold tracking-widest px-4 py-1 rounded-full">outlet 01</Badge>
                   <Badge variant="outline" className="border-[#FE7F2D]/20 text-[#FE7F2D]/60 lowercase font-bold tracking-widest px-4 py-1 rounded-full">since 2024</Badge>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 sm:gap-12 text-left bg-white/40 backdrop-blur-sm p-6 sm:p-12 rounded-[2rem] sm:rounded-[3rem] border border-[#FE7F2D]/5">
              <div className="space-y-6">
                <h4 className="text-[#FE7F2D] font-black lowercase italic text-xl">membership process</h4>
                <ul className="space-y-4 text-[#010307]/60 font-medium lowercase italic leading-relaxed">
                  <li>• create account for instant pricing access</li>
                  <li>• select and book your preferred shelf slot</li>
                  <li>• curation team reviews all applications</li>
                </ul>
              </div>
              <div className="space-y-6">
                <h4 className="text-[#FE7F2D] font-black lowercase italic text-xl">jurisdiction</h4>
                <ul className="space-y-4 text-[#010307]/60 font-medium lowercase italic leading-relaxed">
                  <li>• slots confirmed upon payment & approval</li>
                  <li>• dedicated dashboard for sales & stock</li>
                  <li>• legal jurisdiction: kathmandu, nepal</li>
                </ul>
              </div>
            </div>

            <div className="space-y-8 pt-8 border-t border-[#FE7F2D]/10">
              <p className="text-[#010307]/20 font-bold lowercase tracking-[0.3em] text-[10px]">
                © {new Date().getFullYear()} the hidden collective club • all rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>


    </div>
  )
}
