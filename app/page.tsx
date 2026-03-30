"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowLeft, BarChart3, Camera, Eye, Heart, Instagram, LayoutGrid, Lock, LogIn, Menu, Package, ShieldCheck, Users, X, Zap, CheckCircle2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
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

function CommonBanners({ brands, isAuthenticated, setAuthView, setActiveTab, origins, storeImages }: {
  brands: Brand[],
  isAuthenticated: boolean,
  setAuthView: (view: "none" | "login" | "signup") => void,
  setActiveTab: (tab: "home" | "members" | "origins") => void,
  origins?: string,
  storeImages?: any[]
}) {
  return (
    <>
      {/* Exclusive Access Banner */}
      <section className="py-12 bg-[#010307] text-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              <Lock className="w-4 h-4 sm:w-6 sm:h-6 text-[#FE7F2D]" />
              <h2 className="text-lg sm:text-2xl lg:text-3xl font-black lowercase italic tracking-tight">exclusive access required</h2>
              <Lock className="w-4 h-4 sm:w-6 sm:h-6 text-[#FE7F2D]" />
            </div>
            <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto font-medium lowercase italic">
              Register your account to get full access to pricing, shelf availability, and membership applications.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-6 mt-8 sm:mt-12">
              <div className="text-center space-y-1 sm:space-y-2">
                <div className="text-3xl sm:text-4xl font-black text-[#FE7F2D] lowercase italic leading-none">step 1</div>
                <div className="text-[10px] sm:text-xs text-white/40 font-black uppercase tracking-widest italic">register</div>
              </div>
              <div className="text-center space-y-1 sm:space-y-2 border-y sm:border-y-0 sm:border-x border-white/5 py-4 sm:py-0">
                <div className="text-3xl sm:text-4xl font-black text-[#FE7F2D] lowercase italic leading-none">step 2</div>
                <div className="text-[10px] sm:text-xs text-white/40 font-black uppercase tracking-widest italic">book slot</div>
              </div>
              <div className="text-center space-y-1 sm:space-y-2">
                <div className="text-3xl sm:text-4xl font-black text-[#FE7F2D] lowercase italic leading-none">step 3</div>
                <div className="text-[10px] sm:text-xs text-white/40 font-black uppercase tracking-widest italic">go live</div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12 sm:mt-16">
              <Button
                size="lg"
                className="bg-[#FE7F2D] text-white hover:bg-black font-black lowercase italic tracking-widest text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-8 rounded-2xl group transition-all h-auto shadow-2xl shadow-orange-500/20"
                onClick={() => setAuthView("signup")}
              >
                apply for membership
                <ArrowRight className="ml-2 sm:ml-3 h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              {!isAuthenticated && (
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-black hover:bg-white hover:text-black font-black lowercase italic tracking-widest text-base sm:text-lg px-10 py-8 rounded-2xl h-auto transition-all"
                  onClick={() => setAuthView("login")}
                >
                  <LogIn className="mr-3 h-5 w-5" />
                  already approved?
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Store Gallery Teaser */}
      {storeImages && storeImages.length > 0 && (
        <section className="py-20 sm:py-32 bg-[#FFFCEB]">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-end mb-16 sm:mb-24 gap-12">
                <div className="space-y-6 text-left md:max-w-3xl">
                  <h2 className="text-3xl sm:text-4xl lg:text-7xl font-black lowercase italic tracking-tighter leading-none">
                    the <span className="text-[#FE7F2D]">hidden</span> space.
                  </h2>
                  <p className="text-lg sm:text-2xl text-[#010307]/40 font-medium italic lowercase">
                    take a tour of 108 shelf slots across 3 rooms in bijeshwori. curated energy.
                  </p>
                </div>
                <Link href="/gallery">
                  <Button 
                    variant="outline" 
                    className="rounded-full border-[#FE7F2D]/20 text-[#010307] hover:bg-[#FE7F2D] hover:text-white font-black uppercase text-[10px] tracking-widest px-12 py-6 h-auto transition-all shadow-xl shadow-[#FE7F2D]/5"
                  >
                    view full collage ({storeImages.length})
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
                {storeImages.slice(0, 4).map((img: any, idx: number) => (
                  <div key={img.id} className={`group relative aspect-[4/5] rounded-[2rem] sm:rounded-[4rem] overflow-hidden border border-[#FE7F2D]/10 shadow-2xl transition-all duration-700 hover-lift ${idx % 2 === 1 ? 'translate-y-12' : ''}`}>
                    <img 
                      src={`${img.url}?width=400&quality=70`} 
                      alt={img.section} 
                      className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-8 flex flex-col justify-end">
                      <p className="text-white font-black italic lowercase text-sm leading-tight grow">{img.section}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Club Members Section Teaser */}
      <section className="py-20 sm:py-32 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 sm:mb-24 space-y-6">
              <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black lowercase italic tracking-tighter">our club members</h2>
              <p className="text-lg sm:text-2xl text-[#010307]/40 font-medium italic lowercase max-w-2xl mx-auto">
                the brands that make the collective real. approved, selling, and building.
              </p>
            </div>

            {brands.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
                {brands.slice(0, 4).map((brand) => (
                  <div key={brand.id} className="group relative flex flex-col items-center gap-6 sm:gap-8 transition-all duration-300 hover-lift">
                    <div className="w-32 h-32 sm:w-48 sm:h-48 bg-[#FFFCEB] rounded-[2.5rem] sm:rounded-[4rem] border border-[#FE7F2D]/10 flex items-center justify-center p-6 sm:p-12 overflow-hidden shadow-xl group-hover:shadow-[#FE7F2D]/10 transition-all">
                      {brand.logo_url ? (
                        <Image
                          src={brand.logo_url}
                          alt={brand.business_name}
                          width={200}
                          height={200}
                          className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all duration-700"
                        />
                      ) : (
                        <div className="text-4xl sm:text-6xl font-black text-[#FE7F2D]/20 transition-all group-hover:text-[#FE7F2D]/40 uppercase tracking-widest">{brand.business_name.substring(0, 2)}</div>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-2xl font-black lowercase italic text-[#010307]/60 group-hover:text-[#FE7F2D] transition-colors">{brand.business_name}</h3>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-24 sm:py-32 bg-[#FFFCEB]/50 rounded-[3rem] sm:rounded-[5rem] border border-dashed border-[#FE7F2D]/10">
                <p className="text-xl sm:text-2xl text-[#010307]/30 font-black lowercase italic">new creators joining the collective soon...</p>
              </div>
            )}

            {brands.length > 4 && (
              <div className="text-center mt-16 sm:mt-24">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("members")}
                  className="rounded-full border-[#FE7F2D]/20 text-[#010307] hover:bg-[#FE7F2D] hover:text-white font-black uppercase text-[10px] sm:text-xs tracking-[0.2em] px-10 sm:px-16 py-6 h-auto transition-all shadow-xl shadow-[#FE7F2D]/5"
                >
                  view all {brands.length} members
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Who It's For - Teaser */}
      <section className="py-20 sm:py-32 bg-[#FFFCEB] border-y border-[#FE7F2D]/10">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 sm:mb-24 space-y-6">
              <h2 className="text-4xl sm:text-4xl lg:text-7xl font-black lowercase italic tracking-tighter">is this for you?</h2>
              <p className="text-base sm:text-2xl text-[#010307]/50 max-w-3xl mx-auto italic lowercase font-medium">
                We're built for creators and brands who are doing things with intention — whether you're just starting
                or scaling up.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
              {[
                { title: "local product makers", desc: "handcrafted in nepal", emoji: "🏠" },
                { title: "handmade + custom brands", desc: "one-of-a-kind creations", emoji: "✋" },
                { title: "ethical fashion, food, home", desc: "conscious commerce", emoji: "🌱" },
                { title: "niche or experimental", desc: "testing bold ideas", emoji: "🧪" },
              ].map((item, index) => (
                <div
                  key={index}
                  className="text-center bg-white p-8 sm:p-12 rounded-[2.5rem] sm:rounded-[4rem] border border-[#FE7F2D]/5 shadow-2xl hover:shadow-[#FE7F2D]/10 transition-all duration-500 hover-lift"
                >
                  <div className="text-3xl sm:text-5xl mb-6 sm:mb-8 transition-transform group-hover:scale-125">{item.emoji}</div>
                  <h3 className="font-black lowercase italic text-base sm:text-xl mb-2">{item.title}</h3>
                  <p className="text-[10px] sm:text-xs text-[#010307]/40 font-black uppercase tracking-widest">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-16 sm:mt-24">
              <p className="text-xl sm:text-3xl font-black text-[#FE7F2D] lowercase italic">you bring the hustle. we'll bring the shelf.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 sm:py-40 bg-[#010307] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FE7F2D]/10 rounded-full blur-[120px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FE7F2D]/10 rounded-full blur-[120px] -ml-48 -mb-48" />

        <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
            <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black lowercase italic tracking-tighter leading-tight italic">
              ready to <span className="text-[#FE7F2D]">join</span>?
            </h2>
            <div className="space-y-4">
              <p className="text-lg sm:text-3xl font-black lowercase italic text-white/80 tracking-tight">108 shelf slots. curated community. exclusive access.</p>
              <p className="text-base sm:text-xl text-white/40 font-medium italic lowercase">if you're building something real, we want you here.</p>
              <p className="text-2xl sm:text-4xl font-black text-[#FE7F2D] mt-8 italic lowercase">🖤 this is thc club.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
              <Button
                size="lg"
                className="bg-[#FE7F2D] hover:bg-white hover:text-[#FE7F2D] text-white font-black lowercase italic tracking-widest text-lg sm:text-2xl px-12 sm:px-20 py-10 rounded-[2rem] group transition-all active:scale-95 shadow-2xl shadow-orange-500/40 h-auto"
                onClick={() => setAuthView("signup")}
              >
                join the club
                <Zap className="ml-4 h-6 w-6 animate-pulse" />
              </Button>
              {!isAuthenticated && (
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/20 text-black hover:bg-white hover:text-black font-black lowercase italic tracking-widest text-lg sm:text-2xl px-12 sm:px-20 py-10 rounded-[2rem] transition-all h-auto"
                  onClick={() => setAuthView("login")}
                >
                  <Lock className="mr-4 h-6 w-6" />
                  member access
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function LandingPage() {

  const [authView, setAuthView] = useState<"none" | "login" | "signup">("none")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [brands, setBrands] = useState<Brand[]>([])
  const [activeTab, setActiveTab] = useState<"home" | "members" | "origins" | "gallery">("home")
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)
  const [origins, setOrigins] = useState("")
  const [storeImages, setStoreImages] = useState<any[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Lightbox State
  const [previewIdx, setPreviewIdx] = useState<number | null>(null)

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
    fetchOrigins()
    fetchStoreImages()
  }, [])

  const fetchStoreImages = async () => {
    try {
      const { data } = await supabase.from("store_images").select("*").order("created_at", { ascending: false })
      if (data) setStoreImages(data)
    } catch (e) {
      console.error("Failed to fetch store images", e)
    }
  }

  const fetchOrigins = async () => {
    try {
      const { data } = await supabase.from("platform_content").select("origins").eq("id", 1).single()
      if (data) setOrigins(data.origins || "")
    } catch (e) {
      console.error("Failed to fetch origins", e)
    }
  }

  const fetchBrands = async () => {
    try {
      const { data } = await supabase
        .from("brands")
        .select("id, business_name, logo_url, instagram_handle")
        .eq("onboarding_status", "active")
        .order("business_name", { ascending: true })
      console.log("brandss", data)
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
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#FFFCEB] text-[#010307] py-1.5 sm:py-3 overflow-hidden border-b border-[#FE7F2D]/20">
        <div className="animate-marquee whitespace-nowrap">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className="inline-block px-4 sm:px-12 text-[10px] sm:text-sm font-bold tracking-wide ">
              the first rule of <span className="thc-highlight">THC Club</span> is you talk about{" "}
              <span className="thc-highlight">THC Club</span>. the second rule of{" "}
              <span className="thc-highlight">THC Club</span> is you TALK ABOUT{" "}
              <span className="thc-highlight">THC Club</span>.
            </span>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-8 sm:top-12 z-40 bg-[#FFFCEB]/95 backdrop-blur-sm border-b border-[#FE7F2D]/20 mt-8 sm:mt-12">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Image
                src="/logo.png"
                alt="thc club logo"
                width={100}
                height={50}
                className="h-6 sm:h-8 w-auto cursor-pointer transition-transform hover:scale-105"
                onClick={() => {
                  setActiveTab("home")
                  setIsMobileMenuOpen(false)
                }}
              />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8 ml-8">
              <button
                onClick={() => setActiveTab("home")}
                className={`text-xs font-black lowercase italic tracking-widest transition-all ${activeTab === "home" ? "text-[#FE7F2D] border-b border-[#FE7F2D]" : "text-[#010307]/40 hover:text-[#010307]"
                  }`}
              >
                home
              </button>
              <button
                onClick={() => setActiveTab("origins")}
                className={`text-xs font-black lowercase italic tracking-widest transition-all ${activeTab === "origins" ? "text-[#FE7F2D] border-b border-[#FE7F2D]" : "text-[#010307]/40 hover:text-[#010307]"
                  }`}
              >
                our origins
              </button>
              <button
                onClick={() => setActiveTab("members")}
                className={`text-xs font-black lowercase italic tracking-widest transition-all ${activeTab === "members" ? "text-[#FE7F2D] border-b border-[#FE7F2D]" : "text-[#010307]/40 hover:text-[#010307]"
                  }`}
              >
                the collective
              </button>
              <button
                onClick={() => setActiveTab("gallery")}
                className={`text-xs font-black lowercase italic tracking-widest transition-all ${activeTab === "gallery" ? "text-[#FE7F2D] border-b border-[#FE7F2D]" : "text-[#010307]/40 hover:text-[#010307]"
                  }`}
              >
                store gallery
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-6 shrink-0">
              <div className="hidden sm:flex items-center gap-4">
                <Image
                  src="/broski.png"
                  alt="broski mascot"
                  width={32}
                  height={32}
                  className="h-8 w-8 transition-transform hover:rotate-12"
                />
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  size="sm"
                  className="bg-[#FE7F2D] hover:bg-black text-white font-black lowercase italic tracking-widest shadow-lg rounded-xl h-8 sm:h-10 px-3 sm:px-8 text-[10px] sm:text-sm transition-all active:scale-95"
                  onClick={() => setAuthView("signup")}
                >
                  apply now
                </Button>
                {!isAuthenticated && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#010307]/20 text-[#010307] hover:bg-[#010307] hover:text-white font-black lowercase italic tracking-widest rounded-xl h-8 sm:h-10 px-2 sm:px-6 text-[10px] sm:text-sm transition-all hidden xs:flex"
                    onClick={() => setAuthView("login")}
                  >
                    <LogIn className="w-3 h-3 mr-2 hidden sm:inline" />
                    login
                  </Button>
                )}
                {/* Mobile Menu Toggle */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="lg:hidden p-1 h-8 w-8 text-[#010307]"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-[#FFFCEB] border-b border-[#FE7F2D]/20 py-6 px-4 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <button
              onClick={() => {
                setActiveTab("home")
                setIsMobileMenuOpen(false)
              }}
              className={`block w-full text-left py-2 px-4 text-sm font-black lowercase italic tracking-widest ${activeTab === "home" ? "text-[#FE7F2D] bg-[#FE7F2D]/5 rounded-xl" : "text-[#010307]"}`}
            >
              home
            </button>
            <button
              onClick={() => {
                setActiveTab("origins")
                setIsMobileMenuOpen(false)
              }}
              className={`block w-full text-left py-2 px-4 text-sm font-black lowercase italic tracking-widest ${activeTab === "origins" ? "text-[#FE7F2D] bg-[#FE7F2D]/5 rounded-xl" : "text-[#010307]"}`}
            >
              our origins
            </button>
            <button
              onClick={() => {
                setActiveTab("members")
                setIsMobileMenuOpen(false)
              }}
              className={`block w-full text-left py-2 px-4 text-sm font-black lowercase italic tracking-widest ${activeTab === "members" ? "text-[#FE7F2D] bg-[#FE7F2D]/5 rounded-xl" : "text-[#010307]"}`}
            >
              the collective
            </button>
            <button
              onClick={() => {
                setActiveTab("gallery")
                setIsMobileMenuOpen(false)
              }}
              className={`block w-full text-left py-2 px-4 text-sm font-black lowercase italic tracking-widest ${activeTab === "gallery" ? "text-[#FE7F2D] bg-[#FE7F2D]/5 rounded-xl" : "text-[#010307]"}`}
            >
              store gallery
            </button>
            <div className="pt-4 border-t border-[#FE7F2D]/10">
              {!isAuthenticated && (
                <Button
                  className="w-full bg-black text-white font-black lowercase italic tracking-widest rounded-xl py-6 h-auto"
                  onClick={() => {
                    setAuthView("login")
                    setIsMobileMenuOpen(false)
                  }}
                >
                  login to club
                </Button>
              )}
            </div>
          </div>
        )}
      </nav>

      {activeTab === "home" ? (
        <>
          {/* Hero Section */}
          <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 lg:py-32">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
                <div className="space-y-8 fade-in">
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 bg-[#FE7F2D]/10 text-[#FE7F2D] px-4 py-2 rounded-full text-xs font-medium lowercase tracking-wide">
                      <Heart className="w-3 h-3 fill-[#FE7F2D]" />
                      curated. transparent. real.
                    </div>

                    {/* Logo instead of text */}
                    <div className="flex flex-col items-center lg:items-start">
                      <h1 className="sr-only">thc club - the hidden collective club kathmandu</h1>
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
                            className={`h-1.5 transition-all duration-300 rounded-full ${current === i ? "w-8 bg-[#FE7F2D]" : "w-1.5 bg-[#010307]/10"
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
                        <div className="absolute -bottom-2 -right-2 sm:-bottom-8 sm:-right-8 bg-[#FE7F2D] text-white p-3 sm:p-6 rounded-xl sm:rounded-[2rem] shadow-2xl border-4 border-[#FFFCEB] rotate-12 transition-all group-hover:rotate-6 z-20 group-hover:scale-110">
                          <p className="text-sm sm:text-2xl font-black italic lowercase leading-none">zero fakes.</p>
                          <p className="text-[6px] sm:text-[10px] font-black uppercase tracking-widest mt-1 sm:mt-2 opacity-60 whitespace-nowrap">Verified Collective</p>
                        </div>

                        <div className="absolute -top-4 -left-2 sm:-top-10 sm:-left-10 bg-black text-white p-2 sm:p-4 rounded-xl sm:rounded-3xl shadow-2xl -rotate-12 transition-all group-hover:rotate-0 z-20">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-ping" />
                            <p className="text-[7px] sm:text-xs font-black uppercase tracking-widest italic whitespace-nowrap">Live from Kathmandu</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6 text-center w-full">
                        <div className="flex justify-center gap-6 sm:gap-12">
                          <div className="text-center group/stat">
                            <p className="text-2xl sm:text-3xl font-black italic text-[#FE7F2D] lowercase leading-none transition-transform group-hover/stat:scale-110">
                              {brands.length || "..."}+
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
                  <p className="text-base sm:text-xl lg:text-2xl text-[#010307]/60 font-medium italic leading-relaxed max-w-3xl mx-auto lowercase">
                    nepal's first curated creative collective. we're a community of real creators sharing space, telling
                    their stories, and making the city feel alive.
                  </p>
                  <div className="text-2xl font-black lowercase italic text-[#FE7F2D]">
                    it's a movement. it's a club. it's yours if you're real.
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
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

          {/* SHARED SECTIONS FOR HOME */}
          <CommonBanners storeImages={storeImages} brands={brands} isAuthenticated={isAuthenticated} setAuthView={setAuthView} setActiveTab={setActiveTab} origins={origins} />
        </>
      ) : activeTab === "gallery" ? (
        <section className="py-20 sm:py-40 bg-[#FFFCEB] animate-in fade-in slide-in-from-bottom-12 duration-1000 min-h-screen">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="max-w-6xl mx-auto space-y-24">
              <div className="text-center space-y-6">
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FE7F2D]">the visual archive</p>
                <h2 className="text-4xl sm:text-7xl lg:text-9xl font-black italic lowercase tracking-tighter leading-none">
                  the <span className="text-[#FE7F2D]">club</span> tour.
                </h2>
                <p className="text-lg sm:text-2xl text-[#010307]/40 font-medium italic lowercase max-w-2xl mx-auto">
                  curated energy. 108 slots. 3 rooms. zero fakes. take a walk through the collective.
                </p>
              </div>

              {storeImages.length > 0 ? (
                <div className="relative group">
                  <Carousel
                    opts={{
                      align: "start",
                      loop: true,
                    }}
                    className="w-full"
                  >
                    <CarouselContent className="-ml-4 sm:-ml-12">
                      {storeImages.map((img, idx) => (
                        <CarouselItem key={img.id} className="pl-4 sm:pl-12 basis-full md:basis-2/3 lg:basis-1/2">
                          <div 
                            onClick={() => setPreviewIdx(idx)}
                            className="relative aspect-[16/11] bg-white rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-2xl transition-all duration-700 hover:scale-[1.02] cursor-zoom-in"
                          >
                            <img 
                              src={`${img.url}?width=800&quality=75`} 
                              alt={img.section} 
                              className="w-full h-full object-cover grayscale transition-all duration-1000 hover:grayscale-0"
                              loading="lazy"
                            />
                            <div className="absolute top-6 left-6 sm:top-12 sm:left-12">
                               <Badge className="bg-black/90 text-white border-none rounded-full px-4 py-2 font-black italic lowercase text-[10px] sm:text-sm backdrop-blur-md">
                                 zone: {img.section}
                               </Badge>
                            </div>
                            <div className="absolute bottom-6 right-6 sm:bottom-12 sm:right-12">
                               <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/50 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full italic">
                                 frame {String(idx + 1).padStart(2, '0')}
                               </p>
                            </div>
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    
                    <div className="flex justify-center gap-12 mt-20">
                       <div className="flex items-center gap-3">
                          <div className="w-12 h-0.5 bg-[#FE7F2D]/20 rounded-full overflow-hidden">
                             <div className="h-full bg-[#FE7F2D] transition-all duration-500" style={{ width: `${((current + 1) / storeImages.length) * 100}%` }} />
                          </div>
                          <span className="text-xs font-black italic text-gray-300">
                            {String(current + 1).padStart(2, '0')} / {String(storeImages.length).padStart(2, '0')}
                          </span>
                       </div>
                    </div>
                  </Carousel>
                </div>
              ) : (
                <div className="text-center py-40 bg-white rounded-[5rem] border border-dashed border-[#FE7F2D]/10">
                   <Camera className="w-16 h-16 text-[#FE7F2D]/20 mx-auto mb-6" />
                   <p className="font-black italic lowercase text-[#010307]/20 text-2xl">visual archive opening soon...</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12">
                 <div className="p-12 bg-white rounded-[3rem] border border-black/5 space-y-6 flex flex-col justify-between">
                    <p className="text-2xl font-black italic lowercase text-[#010307]">high fidelity curation.</p>
                    <p className="text-[#010307]/60 font-medium italic lowercase leading-relaxed">
                      every corner of the hidden collective is curated to highlight the creator. no crowded shelves, no visual noise. just the product and the light.
                    </p>
                 </div>
                 <div className="p-12 bg-black text-white rounded-[3rem] border border-white/5 space-y-8">
                    <p className="text-2xl font-black italic lowercase leading-none">zero fakes policy.</p>
                    <div className="space-y-4">
                       <div className="flex items-center gap-4">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <p className="text-sm font-bold lowercase opacity-80">vetted brand partners only.</p>
                       </div>
                       <div className="flex items-center gap-4">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <p className="text-sm font-bold lowercase opacity-80">original intellectual property.</p>
                       </div>
                       <div className="flex items-center gap-4">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <p className="text-sm font-bold lowercase opacity-80">artisanal or small-batch focus.</p>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </section>
      ) : activeTab === "origins" ? (
        <>
          <section className="py-20 sm:py-32 bg-[#FFFCEB] overflow-hidden min-h-[70vh] flex items-center">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="max-w-6xl mx-auto relative animate-in fade-in slide-in-from-bottom-8 duration-1000">
                {/* Visual Background Deco */}
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#FE7F2D]/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#FE7F2D]/5 rounded-full blur-[100px] pointer-events-none" />

                <div className="grid lg:grid-cols-2 gap-20 items-center">
                  <div className="relative group">
                    <div className="aspect-[4/5] bg-white rounded-[3rem] p-8 border border-black/5 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center group-hover:border-[#FE7F2D]/30 transition-all duration-500">
                      <Image
                        src="/logo.png"
                        alt="The Origin"
                        width={400}
                        height={200}
                        className="w-full h-auto opacity-10 group-hover:opacity-20 transition-opacity duration-500"
                      />
                      <div className="absolute inset-x-8 bottom-12 text-center space-y-4">
                        <p className="text-4xl font-black italic lowercase tracking-tight text-[#010307]">est. 2026</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#FE7F2D]">the creative genesis</p>
                      </div>
                      <Image
                        src="/broski.png"
                        alt="Mascot"
                        width={200}
                        height={200}
                        className="absolute -top-10 -right-10 w-40 h-40 drop-shadow-2xl rotate-12 group-hover:rotate-0 transition-transform duration-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-12">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FE7F2D]">our origins</p>
                      <h2 className="text-4xl sm:text-7xl font-black italic lowercase tracking-tighter leading-[0.8]">born from the <span className="text-[#FE7F2D]">hustle</span>.</h2>
                      <p className="text-[#010307]/30 text-xs font-black uppercase tracking-[0.2em] italic">the mission log • kathmandu 2026</p>
                    </div>

                    <div className="space-y-8 text-lg sm:text-xl text-[#010307]/70 italic lowercase leading-relaxed font-medium">
                      {origins ? (
                        origins.split("\n\n").map((para, i) => (
                          <p key={i} className={para.startsWith("#") ? "hidden" : para.includes("why should") ? "text-[#010307] font-black border-l-4 border-[#FE7F2D] pl-6 py-2" : ""}>
                            {para}
                          </p>
                        ))
                      ) : (
                        <>
                          <p>
                            it started with a simple observation: kathmandu is overflowing with incredible talent, but the gap between "creating" and "discovering" was a bridge too expensive for most to cross alone.
                          </p>
                          <p>
                            we saw creators building absolute magic in their rooms, only to be hidden by algorithm shadows or crushed by high-street rents. we wanted to change the script.
                          </p>
                          <p className="text-[#010307] font-black border-l-4 border-[#FE7F2D] pl-6 py-2">
                            why should a brand's visibility depend on their bank balance instead of their soul?
                          </p>
                          <p>
                            the hidden collective was born to gatekeep energy, not money. we provided the stage, the lightings, the footfall, and the data—so creators could focus on what they do best: <span className="text-[#FE7F2D] font-bold">creating the cool stuff.</span>
                          </p>
                        </>
                      )}
                    </div>

                    <div className="pt-6 flex flex-wrap gap-4">
                      <div className="px-6 py-3 bg-white border border-[#FE7F2D]/20 rounded-2xl shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">the mission</p>
                        <p className="text-sm font-black italic lowercase">scale local stories</p>
                      </div>
                      <Button
                        onClick={() => setAuthView("signup")}
                        className="px-10 py-8 bg-[#010307] text-white hover:bg-[#FE7F2D] rounded-[2rem] shadow-xl shadow-orange-500/20 flex flex-col items-center justify-center transition-all group"
                      >
                        <p className="text-[10px] font-black italic lowercase leading-none mb-1 text-[#FE7F2D] group-hover:text-white">apply for access</p>
                        <p className="text-sm font-black italic lowercase leading-none">#thecollective</p>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <CommonBanners storeImages={storeImages} brands={brands} isAuthenticated={isAuthenticated} setAuthView={setAuthView} setActiveTab={setActiveTab} origins={origins} />
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
                  <Badge variant="outline" className="border-[#FE7F2D]/20 text-[#FE7F2D]/60 lowercase font-bold tracking-widest px-4 py-1 rounded-full">since 2026</Badge>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 sm:gap-12 text-left bg-white/40 backdrop-blur-sm p-6 sm:p-12 rounded-[2rem] sm:rounded-[3rem] border border-[#FE7F2D]/5">
              <div className="space-y-6">
                <h4 className="text-[#FE7F2D] font-black lowercase italic text-xl">membership process</h4>
                <ul className="space-y-4 text-[#010307]/60 font-medium lowercase italic leading-relaxed">
                  <li>• login to get instant pricing access</li>
                  <li>• select your slot: low, eye, or top level tier and your section</li>
                  <li>• instant access to your brand growth dashboard</li>
                </ul>
              </div>
              <div className="space-y-6">
                <h4 className="text-[#FE7F2D] font-black lowercase italic text-xl">the club advantage</h4>
                <ul className="space-y-4 text-[#010307]/60 font-medium lowercase italic leading-relaxed">
                  <li>• free cross-promo via sayummys cafe visitors</li>
                  <li>• performance-based: higher sales = lighter rent</li>
                  <li>• curated community of nepali makers & doers</li>
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


      {/* PREVIEW LIGHTBOX */}
      {previewIdx !== null && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-in fade-in duration-300" onClick={() => setPreviewIdx(null)}>
           {/* Close Button */}
           <button 
             onClick={() => setPreviewIdx(null)}
             className="absolute top-10 right-10 text-white/40 hover:text-white transition-all z-10"
           >
             <X className="w-10 h-10" />
           </button>

           {/* Navigation Arrows */}
           <button 
             onClick={(e) => {
               e.stopPropagation();
               setPreviewIdx(prev => prev! > 0 ? prev! - 1 : storeImages.length - 1);
             }}
             className="absolute left-10 p-5 rounded-full hover:bg-white/10 text-white/40 hover:text-[#FE7F2D] transition-all"
           >
             <ArrowLeft className="w-12 h-12" />
           </button>

           <button 
              onClick={(e) => {
                e.stopPropagation();
                setPreviewIdx(prev => prev! < storeImages.length - 1 ? prev! + 1 : 0);
              }}
              className="absolute right-10 p-5 rounded-full hover:bg-white/10 text-white/40 hover:text-[#FE7F2D] transition-all"
           >
             <ArrowRight className="w-12 h-12" />
           </button>

           {/* Image Frame */}
           <div className="flex flex-col items-center gap-10 max-w-7xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
              <div className="relative group/lb rounded-[2rem] sm:rounded-[4rem] overflow-hidden shadow-[0_0_100px_rgba(254,127,45,0.1)] border border-white/5">
                <img 
                  src={storeImages[previewIdx].url} 
                  className="max-w-full max-h-[80vh] object-contain"
                  alt="Store Preview"
                />
                <div className="absolute top-10 left-10">
                   <Badge className="bg-[#FE7F2D] text-white border-none rounded-full px-6 py-3 font-black italic lowercase text-xl shadow-2xl">
                     zone: {storeImages[previewIdx].section}
                   </Badge>
                </div>
              </div>
              <div className="text-center">
                 <p className="text-white font-black italic lowercase text-2xl tracking-tighter opacity-80 uppercase">
                   {storeImages[previewIdx].section} • {String(previewIdx + 1).padStart(2, '0')} / {String(storeImages.length).padStart(2, '0')}
                 </p>
                 <p className="text-white/20 text-[10px] uppercase font-black tracking-[0.5em] mt-2 italic">
                   the hidden collective • high fidelity visual archive
                 </p>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
