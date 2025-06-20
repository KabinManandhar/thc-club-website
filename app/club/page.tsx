"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ArrowRight, Zap, Shield, ChevronDown, Heart, Users, CheckCircle, Eye, LogOut } from "lucide-react"
import { useState, useEffect } from "react"
import { userAuth } from "@/lib/user-auth"

const FAQItem = ({ question, answer, emoji }: { question: string; answer: string; emoji: string }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <Card className="border border-[#FE7F2D]/20 hover:border-[#FE7F2D]/40 transition-all duration-200 hover-lift">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-left">
                <span className="text-2xl">{emoji}</span>
                <h3 className="font-bold text-lg">{question}</h3>
              </div>
              <ChevronDown
                className={`h-5 w-5 text-[#FE7F2D] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </div>
          </CardContent>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-6 pb-6">
          <div className="bg-[#FFFCEB] rounded-lg p-4 mt-2 border-l-4 border-[#FE7F2D]">
            <div className="text-[#010307]/80 leading-relaxed whitespace-pre-line">{answer}</div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export default function ClubPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const isValid = await userAuth.verifySession()
      if (!isValid) {
        window.location.href = "/"
        return
      }
      setIsAuthenticated(true)
    } catch (error) {
      console.error("Auth check error:", error)
      window.location.href = "/"
    } finally {
      setIsLoading(false)
    }
  }

  const faqData = [
    {
      emoji: "🤝",
      question: "how do you choose who gets in?",
      answer: `anyone can apply — we're looking for creators building something real.
our vibe check looks for:
• authentic story behind your brand
• quality products made with care
• commitment to the local creative scene
• willingness to be part of a community

we don't gatekeep money. we gatekeep energy.`,
    },
    {
      emoji: "📝",
      question: "what's the application process like?",
      answer: `super straightforward:
1. fill out our application (takes 10 minutes)
2. we review within 7-14 days
3. if it's a good fit, we'll reach out to chat
4. approved creators choose their shelf and start selling

we want you here. if you're real, we'll help make it work.`,
    },
    {
      emoji: "🧠",
      question: "do you take commission on sales?",
      answer: `no. we don't take commission in the traditional sense.

we charge a small service fee (3–10%) to legally process your payments, handle taxes, and keep the system clean.

here's why this is legally required in nepal:
• if we process NPR 100,000 in sales for you and give you 100% back, the law sees us earning NPR 100,000 in revenue
• without a documented service fee, we can't claim your payout as a business expense
• this means we'd pay taxes on your full sales amount (NPR 15,000 tax on NPR 100,000) while keeping NPR 0
• the service fee ensures legal compliance and sustainable operations

what the fee covers:
• payment processing (pos, qr, website)
• transaction documentation & reporting
• legal compliance & audit protection
• accounting support for clean payouts
• tax handling to keep everyone safe

it's not a commission on your success — it's a processing charge that keeps the community legally protected and financially sustainable.`,
    },
    {
      emoji: "💸",
      question: "what is the shelf rent for?",
      answer: `shelf rent covers the physical space, promotion, maintenance, and operational costs of the store.
it's flat, transparent, and reinvested into improving the space and platform.`,
    },
    {
      emoji: "📦",
      question: "what's included in the service fee?",
      answer: `• payment handling (qr, pos, website)
• transaction records + reporting
• legal/audit documentation
• accounting support for payouts
• customer support for general inquiries`,
    },
    {
      emoji: "🏷️",
      question: "can i handle my own payments instead?",
      answer: `no, because it will cause problems for customers as they might have to make multiple payments, which leads to customer dissatisfaction.
having one unified payment system keeps things smooth for everyone shopping at thc club.`,
    },
    {
      emoji: "⏳",
      question: "how long is the commitment?",
      answer: `you can choose:
• quarterly (3 months)
• half-yearly (6 months)
• yearly (12 months)
longer terms = better pricing.`,
    },
    {
      emoji: "🔁",
      question: "can i change tiers or upgrade later?",
      answer: `yes, based on availability. if there's an open slot in your desired tier, we'll help you shift.`,
    },
    {
      emoji: "🧾",
      question: "will i get reports of my sales?",
      answer: `yes. we send a monthly breakdown of your sales, fees deducted, and your net payout.`,
    },
    {
      emoji: "🏪",
      question: "can i sell food, makeup, or other regulated items?",
      answer: `only if you have the proper licenses or permits. we don't take legal responsibility for your product category. you must comply with nepal's local laws.`,
    },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFCEB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D] mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const handleLogout = async () => {
    await userAuth.logout()
    window.location.href = "/"
  }

  return (
    <div className="min-h-screen bg-[#FFFCEB] text-[#010307] font-space-grotesk">
      {/* Persistent Marquee */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-[#FFFCEB] text-[#010307] py-3 overflow-hidden border-b border-[#FE7F2D]/20">
        <div className="marquee whitespace-nowrap">
          <span className="inline-block px-12 text-base font-bold tracking-wide">
            welcome to the club. you made it. now let's build something real together.
          </span>
          <span className="inline-block px-12 text-base font-bold tracking-wide">
            welcome to the club. you made it. now let's build something real together.
          </span>
          <span className="inline-block px-12 text-base font-bold tracking-wide">
            welcome to the club. you made it. now let's build something real together.
          </span>
          <span className="inline-block px-12 text-base font-bold tracking-wide">
            welcome to the club. you made it. now let's build something real together.
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
              <Badge className="bg-green-100 text-green-800 text-xs">member access</Badge>
            </div>
            <div className="flex items-center gap-6">
              <Image
                src="/broski.png"
                alt="broski mascot"
                width={32}
                height={32}
                className="h-8 w-8 transition-transform hover:rotate-12"
              />
              <Button
                size="sm"
                variant="outline"
                className="border-[#010307]/20 hover:bg-[#010307]/5 font-medium"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                logout
              </Button>
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
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
                  <CheckCircle className="w-3 h-3" />
                  welcome to the club
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
                  you made it. now let's build something real together. here's everything you need to know about joining
                  our curated creative collective.
                </p>
                <div className="bg-[#010307] text-[#FFFCEB] p-4 rounded-lg border-l-4 border-[#FE7F2D]">
                  <p className="text-sm italic">
                    "you're here because you're real. let's make something beautiful happen."
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-semibold px-8 py-6 text-lg group hover-lift"
                >
                  start your application
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-[#010307]/20 hover:bg-[#010307]/5 font-semibold px-8 py-6 text-lg hover-lift"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  see pricing details
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
                      <span>applications open • spots available</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Curated Transparency Banner */}
      <section className="py-12 bg-[#010307] text-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="flex items-center justify-center gap-4">
              <Users className="w-6 h-6 text-[#FE7F2D]" />
              <h2 className="text-2xl lg:text-3xl font-black">open applications, curated community</h2>
              <Users className="w-6 h-6 text-[#FE7F2D]" />
            </div>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              we believe in transparency. here's exactly what we look for, how we decide, and why we curate.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="text-center space-y-2">
                <div className="text-3xl font-black text-[#FE7F2D]">100%</div>
                <div className="text-sm text-white/70">transparent process</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-black text-[#FE7F2D]">7-14</div>
                <div className="text-sm text-white/70">days to hear back</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl font-black text-[#FE7F2D]">real</div>
                <div className="text-sm text-white/70">creators only</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Are */}
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
                { icon: Zap, title: "transparent pricing", desc: "all public, no hidden fees" },
                { icon: Shield, title: "quality curated", desc: "we help maintain the vibe" },
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

      {/* What We Look For */}
      <section className="py-20 lg:py-32 bg-[#FFFCEB] section-divider">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <div className="space-y-6">
              <h2 className="text-4xl lg:text-5xl font-black">what we look for</h2>
              <p className="text-xl text-[#010307]/70">here's our vibe check — transparent and simple</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="text-left border-2 border-[#FE7F2D]/20 hover:border-[#FE7F2D]/40 transition-all hover-lift">
                <CardHeader>
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <Heart className="w-5 h-5 text-[#FE7F2D]" />
                    authentic story
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-[#010307]/70">we want to know the real you behind the brand</p>
                  <ul className="text-sm space-y-1 text-[#010307]/60">
                    <li>• why did you start this?</li>
                    <li>• what problem are you solving?</li>
                    <li>• what's your connection to nepal?</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="text-left border-2 border-[#FE7F2D]/20 hover:border-[#FE7F2D]/40 transition-all hover-lift">
                <CardHeader>
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#FE7F2D]" />
                    quality products
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-[#010307]/70">made with care and intention</p>
                  <ul className="text-sm space-y-1 text-[#010307]/60">
                    <li>• thoughtful design and execution</li>
                    <li>• attention to detail and quality</li>
                    <li>• something you'd be proud to stand behind</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="text-left border-2 border-[#FE7F2D]/20 hover:border-[#FE7F2D]/40 transition-all hover-lift">
                <CardHeader>
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#FE7F2D]" />
                    community spirit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-[#010307]/70">willing to be part of something bigger</p>
                  <ul className="text-sm space-y-1 text-[#010307]/60">
                    <li>• support other creators</li>
                    <li>• participate in events</li>
                    <li>• help maintain the vibe</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="text-left border-2 border-[#FE7F2D]/20 hover:border-[#FE7F2D]/40 transition-all hover-lift">
                <CardHeader>
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#FE7F2D]" />
                    commitment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-[#010307]/70">ready to invest in your growth</p>
                  <ul className="text-sm space-y-1 text-[#010307]/60">
                    <li>• minimum 3-month commitment</li>
                    <li>• keep your shelf stocked</li>
                    <li>• respond to customer inquiries</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            <div className="bg-[#FE7F2D]/10 rounded-lg p-6 border border-[#FE7F2D]/20">
              <p className="text-lg font-bold text-[#FE7F2D] mb-2">the bottom line:</p>
              <p className="text-[#010307]/80">
                if you're building something real, with care and intention, we want you here. we'll help you succeed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How We Work */}
      <section className="py-20 lg:py-32 bg-white section-divider">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <div className="space-y-6">
              <h2 className="text-4xl lg:text-5xl font-black">how we work</h2>
              <p className="text-xl text-[#010307]/70">transparent system that works for everyone</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#FE7F2D]/20 text-left hover-lift">
              <div className="space-y-6">
                <p className="text-lg leading-relaxed">
                  we charge a small shelf rent to keep the lights on. the money raised covers rent, ops, and space
                  improvements.
                </p>
                <p className="text-lg leading-relaxed">
                  we also charge a small payment processing fee based on the revenue we generate for you. although our
                  plan was to only provide shelf rental with no margin, we couldn't because of how the law works in
                  nepal.
                </p>
                <p className="text-lg leading-relaxed">
                  anything extra gets reinvested back into the club — or into other indie projects we're building next.
                </p>
                <div className="bg-[#FE7F2D]/10 p-4 rounded-lg">
                  <p className="font-bold text-[#FE7F2D]">complete transparency. clean system. legal compliance.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 lg:py-32 bg-[#FFFCEB] section-divider">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-6">
              <h2 className="text-4xl lg:text-5xl font-black">shelf slot pricing</h2>
              <p className="text-xl text-[#010307]/70">transparent pricing — choose your duration</p>
            </div>

            {/* Main Pricing Table */}
            <div className="overflow-x-auto mb-12">
              <table className="w-full bg-white rounded-2xl shadow-lg border border-[#FE7F2D]/20 overflow-hidden">
                <thead className="bg-[#FE7F2D] text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold">duration</th>
                    <th className="px-6 py-4 text-center font-bold">bottom shelf slot</th>
                    <th className="px-6 py-4 text-center font-bold">eye level shelf slot</th>
                    <th className="px-6 py-4 text-center font-bold">top level shelf slot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FE7F2D]/10">
                  <tr className="hover:bg-[#FE7F2D]/5 transition-colors">
                    <td className="px-6 py-4 font-semibold">quarterly</td>
                    <td className="px-6 py-4 text-center">
                      <div>NPR 1,000/month</div>
                      <div className="text-sm text-[#010307]/60">(NPR 3,000 total)</div>
                      <Button size="sm" className="mt-2 bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white text-xs">
                        apply for this slot
                      </Button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div>NPR 1,500/month</div>
                      <div className="text-sm text-[#010307]/60">(NPR 4,500 total)</div>
                      <Button size="sm" className="mt-2 bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white text-xs">
                        apply for this slot
                      </Button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div>NPR 1,250/month</div>
                      <div className="text-sm text-[#010307]/60">(NPR 3,750 total)</div>
                      <Button size="sm" className="mt-2 bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white text-xs">
                        apply for this slot
                      </Button>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#FE7F2D]/5 transition-colors">
                    <td className="px-6 py-4 font-semibold">half-yearly</td>
                    <td className="px-6 py-4 text-center">
                      <div>NPR 850/month</div>
                      <div className="text-sm text-[#010307]/60">(NPR 5,100 total)</div>
                      <Button size="sm" className="mt-2 bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white text-xs">
                        apply for this slot
                      </Button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div>NPR 1,250/month</div>
                      <div className="text-sm text-[#010307]/60">(NPR 7,500 total)</div>
                      <Button size="sm" className="mt-2 bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white text-xs">
                        apply for this slot
                      </Button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div>NPR 1,050/month</div>
                      <div className="text-sm text-[#010307]/60">(NPR 6,300 total)</div>
                      <Button size="sm" className="mt-2 bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white text-xs">
                        apply for this slot
                      </Button>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#FE7F2D]/5 bg-[#FE7F2D]/5 transition-colors">
                    <td className="px-6 py-4 font-semibold">
                      yearly
                      <Badge className="ml-2 bg-[#FE7F2D] text-white text-xs">best value</Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-bold">NPR 800/month</div>
                      <div className="text-sm text-[#010307]/60">(NPR 9,600 total)</div>
                      <Button size="sm" className="mt-2 bg-[#010307] hover:bg-[#010307]/90 text-white text-xs">
                        apply for this slot
                      </Button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-bold">NPR 1,000/month</div>
                      <div className="text-sm text-[#010307]/60">(NPR 12,000 total)</div>
                      <Button size="sm" className="mt-2 bg-[#010307] hover:bg-[#010307]/90 text-white text-xs">
                        apply for this slot
                      </Button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-bold">NPR 1,200/month</div>
                      <div className="text-sm text-[#010307]/60">(NPR 14,400 total)</div>
                      <Button size="sm" className="mt-2 bg-[#010307] hover:bg-[#010307]/90 text-white text-xs">
                        apply for this slot
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Bundle Deals */}
      <section className="py-20 lg:py-32 bg-white section-divider">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-6">
              <h2 className="text-4xl lg:text-5xl font-black">bundle deals</h2>
              <p className="text-xl text-[#010307]/70">want to go all in? save with our bundles</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <Card className="border-2 border-[#FE7F2D] bg-orange-50 relative overflow-hidden hover-lift">
                <div className="absolute top-4 right-4">
                  <Badge className="bg-[#FE7F2D] text-white">🧃 full shelf</Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl font-black">full shelf bundle</CardTitle>
                  <p className="text-[#010307]/60">6 slots (2 per tier)</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-3xl font-black">NPR 6,000/month</div>
                    <div className="text-lg">
                      yearly: NPR 72,000 → <span className="text-[#FE7F2D] font-bold">NPR 64,800</span>
                    </div>
                    <div className="text-sm text-[#010307]/60">effective: NPR 5,400/month (10% off)</div>
                  </div>
                  <Button className="w-full bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white">apply for bundle</Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-[#FE7F2D] bg-orange-50 relative overflow-hidden hover-lift">
                <div className="absolute top-4 right-4">
                  <Badge className="bg-[#FE7F2D] text-white">🍬 sampler</Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-2xl font-black">starter bundle</CardTitle>
                  <p className="text-[#010307]/60">3 slots (1 bottom + 1 eye + 1 top)</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-3xl font-black">NPR 3,000/month</div>
                    <div className="text-lg">
                      yearly: NPR 36,000 → <span className="text-[#FE7F2D] font-bold">NPR 32,400</span>
                    </div>
                    <div className="text-sm text-[#010307]/60">effective: NPR 2,700/month (10% off)</div>
                  </div>
                  <Button className="w-full bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white">apply for bundle</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Service Fee Structure */}
      <section className="py-20 lg:py-32 bg-[#FFFCEB] section-divider">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 space-y-6">
              <h2 className="text-4xl lg:text-5xl font-black">service fee + growth benefit</h2>
              <p className="text-xl text-[#010307]/70">if we're handling your sales (via qr, pos, site, etc.)</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full bg-white rounded-2xl shadow-lg border border-[#FE7F2D]/20 overflow-hidden">
                <thead className="bg-[#010307] text-white">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold">monthly sales volume</th>
                    <th className="px-6 py-4 text-center font-bold">service fee %</th>
                    <th className="px-6 py-4 text-center font-bold">rent benefit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FE7F2D]/10">
                  <tr className="hover:bg-[#FE7F2D]/5 transition-colors">
                    <td className="px-6 py-4">below NPR 10,000</td>
                    <td className="px-6 py-4 text-center font-bold text-[#FE7F2D]">3%</td>
                    <td className="px-6 py-4 text-center">full rent applies</td>
                  </tr>
                  <tr className="hover:bg-[#FE7F2D]/5 transition-colors">
                    <td className="px-6 py-4">NPR 10,000 – NPR 50,000</td>
                    <td className="px-6 py-4 text-center font-bold text-[#FE7F2D]">5%</td>
                    <td className="px-6 py-4 text-center">full rent applies</td>
                  </tr>
                  <tr className="hover:bg-[#FE7F2D]/5 transition-colors">
                    <td className="px-6 py-4">NPR 50,000 – NPR 1,00,000</td>
                    <td className="px-6 py-4 text-center font-bold text-[#FE7F2D]">10%</td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-green-600">25% rent waived ✅</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#FE7F2D]/5 bg-green-50 transition-colors">
                    <td className="px-6 py-4 font-bold">above NPR 1,00,000</td>
                    <td className="px-6 py-4 text-center font-bold text-[#FE7F2D]">10%</td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-green-600">50% rent waived ✅</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 bg-white rounded-lg p-6 border border-[#FE7F2D]/20">
              <ul className="space-y-2 text-sm text-[#010307]/70">
                <li>• service fee covers processing, reconciliation, legal/admin costs</li>
                <li>• rent is prepaid (monthly/quarterly/half-yearly/yearly)</li>
                <li>• service fee is invoiced monthly, based on reported sales + receipts</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-20 lg:py-32 bg-white section-divider">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-6">
              <h2 className="text-4xl lg:text-5xl font-black">who should apply?</h2>
              <p className="text-xl text-[#010307]/70">
                We're built for creators and brands who are doing things with intention — whether you're just starting
                or scaling up. If your story, values, and product align with the vibe, you're in.
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

      {/* What You Get */}
      <section className="py-20 lg:py-32 bg-[#FFFCEB] section-divider">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16 space-y-6">
              <h2 className="text-4xl lg:text-5xl font-black">what you get</h2>
              <p className="text-xl text-[#010307]/70">when you join the collective</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {[
                { title: "premium shelf space", desc: "prime retail location in kathmandu", icon: "📦" },
                { title: "community marketing", desc: "featured in our campaigns and socials", icon: "📱" },
                { title: "creator network", desc: "connect with other real makers", icon: "🤝" },
                { title: "collaboration opportunities", desc: "events, boxes, digital campaigns", icon: "🎯" },
              ].map((item, index) => (
                <Card
                  key={index}
                  className="border-none shadow-lg hover:shadow-xl transition-all duration-300 hover-lift"
                >
                  <CardContent className="pt-6 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{item.icon}</div>
                      <div>
                        <h3 className="font-bold text-lg">{item.title}</h3>
                        <p className="text-[#010307]/60">{item.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 lg:py-32 bg-white section-divider">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16 space-y-6">
              <h2 className="text-4xl lg:text-5xl font-black">frequently asked questions</h2>
              <p className="text-xl text-[#010307]/70">everything you need to know</p>
            </div>
            <div className="space-y-4">
              {faqData.map((faq, index) => (
                <FAQItem key={index} question={faq.question} answer={faq.answer} emoji={faq.emoji} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-32 bg-[#010307] text-white">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-5xl lg:text-6xl font-black leading-tight">
              ready to <span className="gradient-text">apply</span>?
            </h2>
            <div className="space-y-4">
              <p className="text-2xl font-bold">108 shelf slots. curated community. transparent process.</p>
              <p className="text-xl text-white/80">you're here because you're real. let's make it happen.</p>
              <p className="text-3xl font-black text-[#FE7F2D]">🖤 welcome to thc club.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-semibold px-12 py-6 text-lg group hover-lift"
              >
                start your application
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/20 text-[#010307] bg-white hover:bg-white/90 font-semibold px-12 py-6 text-lg hover-lift"
              >
                <Eye className="mr-2 h-4 w-4" />
                see pricing details
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
              <Image
                src="/broski.png"
                alt="broski mascot"
                width={48}
                height={48}
                className="h-12 w-12 transition-transform hover:rotate-12"
              />
            </div>

            <div className="space-y-6">
              <p className="text-xl font-bold">kathmandu, nepal</p>

              <blockquote className="text-lg italic max-w-2xl mx-auto text-white/90 leading-relaxed">
                "you're here because you're real. let's make something beautiful happen."
              </blockquote>

              <div className="bg-white/10 rounded-lg p-6 max-w-3xl mx-auto">
                <h3 className="font-bold text-lg mb-4 text-[#FE7F2D]">application process</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-white/80">
                  <div>
                    <p>• applications reviewed within 7-14 days</p>
                    <p>• transparent criteria and process</p>
                    <p>• personal response to every application</p>
                  </div>
                  <div>
                    <p>• monthly sales reporting required</p>
                    <p>• community participation encouraged</p>
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
    </div>
  )
}
