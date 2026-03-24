"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Heart, Users, CheckCircle, Lock, LogIn, Zap, Eye } from "lucide-react"

import { UserLoginForm } from "@/components/user-login-form"
import { UserSignupForm } from "@/components/user-signup-form"
import { userAuth } from "@/lib/user-auth"

export default function LandingPage() {

  const [authView, setAuthView] = useState<"none" | "login" | "signup">("none")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

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
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#FFFCEB] text-[#010307] py-3 overflow-hidden border-b border-[#FE7F2D]/20">
        <div className="animate-marquee whitespace-nowrap">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className="inline-block px-12 text-sm font-bold tracking-wide lowercase">
              the first rule of <span className="thc-highlight">THC Club</span> is you talk about{" "}
              <span className="thc-highlight">THC Club</span>. the second rule of{" "}
              <span className="thc-highlight">THC Club</span> is you talk about{" "}
              <span className="thc-highlight">THC Club</span>.
            </span>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <nav className="sticky top-12 z-40 bg-[#FFFCEB]/95 backdrop-blur-sm border-b border-[#FE7F2D]/20 mt-12">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="thc club logo"
                width={100}
                height={50}
                className="h-8 w-auto transition-transform hover:scale-105"
              />
            </div>
            <div className="flex items-center gap-6">
              <Image
                src="/broski.png"
                alt="broski mascot"
                width={32}
                height={32}
                className="h-8 w-8 transition-transform hover:rotate-12"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-medium lowercase tracking-wide shadow-lg rounded-xl h-10 px-6 transition-all active:scale-95"
                  onClick={() => setAuthView("signup")}
                >
                  join the club
                </Button>
                {!isAuthenticated && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#010307]/20 hover:bg-[#010307]/5 font-medium lowercase tracking-wide rounded-xl h-10 px-6"
                      onClick={() => setAuthView("login")}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      login
                    </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 lg:py-32">
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
                    className="w-full max-w-lg h-auto transition-transform hover:scale-105"
                    priority
                  />
                </div>

                <p className="text-xl lg:text-2xl text-[#010307]/70 leading-relaxed max-w-lg">
                  nepal's first curated creative collective. everyone can apply. not everyone gets in. and that's why
                  the vibe stays real.
                </p>
                <div className="bg-[#010307] text-[#FFFCEB] p-4 rounded-lg border-l-4 border-[#FE7F2D]">
                  <p className="text-sm italic">
                    "we don't gatekeep money. we gatekeep energy. if you're building something real, this club is
                    yours."
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-bold lowercase tracking-wide text-lg px-10 py-8 rounded-2xl group transition-all active:scale-95 shadow-xl shadow-orange-500/20"
                  onClick={() => setAuthView("signup")}
                >
                  join the club
                  <Zap className="ml-3 h-5 w-5 animate-pulse text-white" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-[#010307]/20 hover:bg-[#010307]/5 font-bold lowercase tracking-wide text-lg px-10 py-8 rounded-2xl transition-all"
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
              <div className="relative w-full max-w-md aspect-square bg-[#FFFCEB] rounded-[3rem] p-10 border border-[#FE7F2D]/10 shadow-2xl overflow-hidden group">
                {/* Minimal background deco */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FE7F2D]/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
                
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center space-y-8">
                  <div className="relative">
                    <Image 
                      src="/broski.png" 
                      alt="THC Club" 
                      width={320} 
                      height={320} 
                      className="w-full h-auto drop-shadow-2xl transition-all duration-500 group-hover:scale-105"
                      priority
                    />
                    <div className="absolute -bottom-4 -right-4 bg-[#FE7F2D] text-white p-4 rounded-2xl shadow-lg border-2 border-white rotate-6 transition-transform group-hover:rotate-0">
                       <p className="text-xl font-black italic lowercase leading-none">only real.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 text-center w-full">
                    <div className="flex justify-center gap-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-10 h-10 bg-[#010307]/5 rounded-xl flex items-center justify-center font-bold text-xs lowercase">
                           {i === 1 ? "01" : i === 2 ? "02" : "03"}
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] font-bold lowercase tracking-[0.2em] text-[#010307]/30 italic">
                       nepal's creative headquarters
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Are - Teaser */}
      <section className="py-20 lg:py-32 bg-white section-divider">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <div className="space-y-6">
              <h2 className="text-4xl lg:text-5xl font-black lowercase italic tracking-tighter">what is thc club?</h2>
              <p className="text-xl lg:text-2xl text-[#010307]/60 font-medium italic leading-relaxed max-w-3xl mx-auto lowercase">
                nepal's first curated creative collective. we're a community of real creators sharing space, telling
                their stories, and making the city feel alive.
              </p>
              <div className="text-2xl font-black lowercase italic text-[#FE7F2D]">
                it's a movement. it's a club. it's yours if you're real.
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
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
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="flex items-center justify-center gap-4">
              <Lock className="w-6 h-6 text-[#FE7F2D]" />
              <h2 className="text-2xl lg:text-3xl font-black">exclusive access required</h2>
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
                    className="border-white/20 text-white hover:bg-white/10 font-bold lowercase tracking-wide text-lg px-10 py-5 rounded-xl h-14"
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

      {/* Who It's For - Teaser */}
      <section className="py-20 lg:py-32 bg-[#FFFCEB] border-y border-[#FE7F2D]/10">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-6">
              <h2 className="text-4xl lg:text-5xl font-black">is this for you?</h2>
              <p className="text-xl text-[#010307]/70">
                We're built for creators and brands who are doing things with intention — whether you're just starting
                or scaling up.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <section className="py-20 lg:py-32 bg-[#010307] text-white">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-5xl lg:text-6xl font-black leading-tight">
              ready to <span className="gradient-text">join</span>?
            </h2>
            <div className="space-y-4">
              <p className="text-2xl font-bold">108 shelf slots. curated community. exclusive access.</p>
              <p className="text-xl text-white/80">if you're building something real, we want you here.</p>
              <p className="text-3xl font-black text-[#FE7F2D]">🖤 this is thc club.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-bold lowercase tracking-wide text-xl px-12 py-8 rounded-2xl group transition-all active:scale-95 shadow-2xl shadow-orange-500/40"
                onClick={() => setAuthView("signup")}
              >
                join the club
                <Zap className="ml-3 h-5 w-5 animate-pulse text-white" />
              </Button>
              {!isAuthenticated && (
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/20 text-white hover:bg-white/10 font-bold lowercase tracking-wide text-xl px-12 py-8 rounded-2xl transition-all"
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

      {/* Footer */}
      <footer className="py-32 bg-[#FFFCEB] border-t border-[#FE7F2D]/10">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-16">
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
                   <Badge variant="outline" className="border-[#FE7F2D]/20 text-[#FE7F2D]/60 lowercase font-bold tracking-widest px-4 py-1 rounded-full">gate 01</Badge>
                   <Badge variant="outline" className="border-[#FE7F2D]/20 text-[#FE7F2D]/60 lowercase font-bold tracking-widest px-4 py-1 rounded-full">since 2024</Badge>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 text-left bg-white/40 backdrop-blur-sm p-12 rounded-[3rem] border border-[#FE7F2D]/5">
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
