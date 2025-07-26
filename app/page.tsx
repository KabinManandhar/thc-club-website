"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Heart, Users, CheckCircle, Lock, LogIn } from "lucide-react"
import { WaitlistModal } from "@/components/waitlist-modal"
import { UserLoginForm } from "@/components/user-login-form"
import { userAuth } from "@/lib/user-auth"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

export default function WaitlistPage() {
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const isValid = await userAuth.verifySession()
      if (isValid) {
        // Redirect to club page if already authenticated
        window.location.href = "/club"
        return
      }
      setIsAuthenticated(false)
    } catch (error) {
      console.error("Auth check error:", error)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
    window.location.href = "/club"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFCEB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (showLogin) {
    return <UserLoginForm onLoginSuccess={handleLoginSuccess} onBack={() => setShowLogin(false)} />
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#FFFCEB] text-[#010307] font-space-grotesk">
        {/* Persistent Marquee */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#FFFCEB] text-[#010307] py-3 overflow-hidden border-b border-[#FE7F2D]/20">
          <div className="marquee whitespace-nowrap">
            <span className="inline-block px-12 text-base font-bold tracking-wide">
              the first rule of <span className="thc-highlight">THC CLUB</span> is you talk about{" "}
              <span className="thc-highlight">THC CLUB</span>. the second rule of{" "}
              <span className="thc-highlight">THC CLUB</span> is YOU TALK ABOUT{" "}
              <span className="thc-highlight">THC CLUB</span>.
            </span>
            <span className="inline-block px-12 text-base font-bold tracking-wide">
              the first rule of <span className="thc-highlight">THC CLUB</span> is you talk about{" "}
              <span className="thc-highlight">THC CLUB</span>. the second rule of{" "}
              <span className="thc-highlight">THC CLUB</span> is YOU TALK ABOUT{" "}
              <span className="thc-highlight">THC CLUB</span>.
            </span>
            <span className="inline-block px-12 text-base font-bold tracking-wide">
              the first rule of <span className="thc-highlight">THC CLUB</span> is you talk about{" "}
              <span className="thc-highlight">THC CLUB</span>. the second rule of{" "}
              <span className="thc-highlight">THC CLUB</span> is YOU TALK ABOUT{" "}
              <span className="thc-highlight">THC CLUB</span>.
            </span>
            <span className="inline-block px-12 text-base font-bold tracking-wide">
              the first rule of <span className="thc-highlight">THC CLUB</span> is you talk about{" "}
              <span className="thc-highlight">THC CLUB</span>. the second rule of{" "}
              <span className="thc-highlight">THC CLUB</span> is YOU TALK ABOUT{" "}
              <span className="thc-highlight">THC CLUB</span>.
            </span>
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Image
                      src="/broski.png"
                      alt="broski mascot"
                      width={32}
                      height={32}
                      className="h-8 w-8 transition-transform hover:rotate-12 cursor-pointer"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="p-0 border-none bg-transparent">
                    <img
                      src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWp3NDR2MG85d3ZjMmtqMXlqaG42Z2FxcDNmdDBscDh4OHNjNmM2YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/kLxG58iOYdE8bccTFQ/giphy.gif"
                      alt="broski animation"
                      className="w-64 h-auto rounded-lg"
                    />
                  </TooltipContent>
                </Tooltip>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#010307]/20 hover:bg-[#010307]/5 font-medium bg-transparent"
                    onClick={() => setShowLogin(true)}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    member login
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-medium"
                    onClick={() => setIsWaitlistOpen(true)}
                  >
                    join waitlist
                  </Button>
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
                  <div className="inline-flex items-center gap-2 bg-[#FE7F2D]/10 text-[#FE7F2D] px-4 py-2 rounded-full text-sm font-medium">
                    <Heart className="w-3 h-3" />
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
                    className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-semibold px-8 py-6 text-lg group hover-lift"
                    onClick={() => setIsWaitlistOpen(true)}
                  >
                    join waitlist
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-[#010307]/20 hover:bg-[#010307]/5 font-semibold px-8 py-6 text-lg hover-lift bg-transparent"
                    onClick={() => setShowLogin(true)}
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    member access
                  </Button>
                </div>
              </div>
              <div className="relative fade-in">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FE7F2D]/20 to-transparent rounded-3xl transform rotate-3"></div>
                <div className="relative bg-white rounded-3xl p-8 shadow-2xl border border-[#FE7F2D]/10 hover-lift">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">108 shelf slots</h3>
                      <Badge className="bg-[#FE7F2D] text-white">curated community</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                          key={i}
                          className="aspect-square bg-[#FE7F2D]/10 rounded-lg flex items-center justify-center hover:bg-[#FE7F2D]/20 transition-colors relative"
                        >
                          <div className="w-8 h-8 bg-[#FE7F2D]/30 rounded"></div>
                          {i <= 3 && (
                            <div className="absolute -top-1 -right-1">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-sm text-[#010307]/60">built by an indiepreneur, for the community</p>
                      <div className="flex items-center justify-center gap-2 text-xs text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        <span>waitlist open • early access available</span>
                      </div>
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
                <h2 className="text-4xl lg:text-5xl font-black">what is thc club?</h2>
                <p className="text-xl lg:text-2xl text-[#010307]/70 leading-relaxed max-w-3xl mx-auto">
                  nepal's first curated creative collective. we're a community of real creators sharing space, telling
                  their stories, and making the city feel alive.
                </p>
                <div className="text-2xl font-bold text-[#FE7F2D]">
                  it's a movement. it's a club. it's yours if you're real.
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { icon: Heart, title: "community first", desc: "real creators, real stories" },
                  { icon: Users, title: "curated collective", desc: "quality over quantity" },
                  { icon: Lock, title: "exclusive access", desc: "join the waitlist to learn more" },
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
                join our waitlist to get full access to pricing, application details, and everything you need to know
                about joining thc club.
              </p>
              <div className="grid md:grid-cols-3 gap-6 mt-8">
                <div className="text-center space-y-2">
                  <div className="text-3xl font-black text-[#FE7F2D]">step 1</div>
                  <div className="text-sm text-white/70">join waitlist</div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-black text-[#FE7F2D]">step 2</div>
                  <div className="text-sm text-white/70">get approved</div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-black text-[#FE7F2D]">step 3</div>
                  <div className="text-sm text-white/70">full access</div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Button
                  size="lg"
                  className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-semibold px-8 py-4 group"
                  onClick={() => setIsWaitlistOpen(true)}
                >
                  join waitlist
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-[#010307] bg-white hover:bg-white/90 font-semibold px-8 py-4"
                  onClick={() => setShowLogin(true)}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  already approved?
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Who It's For - Teaser */}
        <section className="py-20 lg:py-32 bg-[#FFFCEB] section-divider">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16 space-y-6">
                <h2 className="text-4xl lg:text-5xl font-black">who should join the waitlist?</h2>
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
                  className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-semibold px-12 py-6 text-lg group hover-lift"
                  onClick={() => setIsWaitlistOpen(true)}
                >
                  join waitlist
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/20 text-[#010307] bg-white hover:bg-white/90 font-semibold px-12 py-6 text-lg hover-lift"
                  onClick={() => setShowLogin(true)}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  member access
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#010307] text-white py-16 border-t border-[#FE7F2D]">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <div className="flex items-center justify-center gap-6">
                <Image
                  src="/logo.png"
                  alt="thc club logo"
                  width={120}
                  height={60}
                  className="h-12 w-auto opacity-80 hover:opacity-100 transition-opacity"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Image
                      src="/broski.png"
                      alt="broski mascot"
                      width={48}
                      height={48}
                      className="h-12 w-12 transition-transform hover:rotate-12 cursor-pointer"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="p-0 border-none bg-transparent">
                    <img
                      src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWp3NDR2MG85d3ZjMmtqMXlqaG42Z2FxcDNmdDBscDh4OHNjNmM2YiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/kLxG58iOYdE8bccTFQ/giphy.gif"
                      alt="broski animation"
                      className="w-64 h-auto rounded-lg"
                    />
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="space-y-6">
                <p className="text-xl font-bold">kathmandu, nepal</p>

                <blockquote className="text-lg italic max-w-2xl mx-auto text-white/90 leading-relaxed">
                  "we don't gatekeep money. we gatekeep energy. if you're building something real, this club is yours."
                </blockquote>

                <div className="bg-white/10 rounded-lg p-6 max-w-3xl mx-auto">
                  <h3 className="font-bold text-lg mb-4 text-[#FE7F2D]">waitlist process</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-white/80">
                    <div>
                      <p>• waitlist applications reviewed within 7-14 days</p>
                      <p>• transparent criteria and process</p>
                      <p>• personal response to every application</p>
                    </div>
                    <div>
                      <p>• login details sent upon approval</p>
                      <p>• full access to pricing and details</p>
                      <p>• legal jurisdiction: kathmandu, nepal</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-16 h-1 bg-[#FE7F2D] mx-auto"></div>

              <p className="text-sm text-white/60">
                © {new Date().getFullYear()} the hidden collective club. all rights reserved.
              </p>
            </div>
          </div>
        </footer>

        {/* Waitlist Modal */}
        <WaitlistModal isOpen={isWaitlistOpen} onClose={() => setIsWaitlistOpen(false)} />
      </div>
    </TooltipProvider>
  )
}
