"use client"

import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { supabase, type PPFTier, type ShelfPricingTier } from "@/lib/supabase"
import { BarChart3, Calculator, HelpCircle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"

// ── types ────────────────────────────────────────────────────────────────────
type Section = string
type Level = "eye_level" | "top_level" | "bottom"
type Duration = "yearly" | "half_yearly" | "quarterly"

// ── constants ─────────────────────────────────────────────────────────────────
const DURATION_ORDER: Record<string, number> = { yearly: 3, half_yearly: 2, quarterly: 1 }
const REGISTRATION_FEE = 800

const STATS = [

    // ── NEPAL-SPECIFIC ─────────────────────────────────────────────

    {
        num: "75%",
        label: "of Nepal's potential ecommerce market remains untapped — only 1 in 4 Nepalis shops online at all. the majority of buyers are still in physical stores",
        source: "statista 2025",
        href: "https://www.statista.com/outlook/emo/ecommerce/nepal",
        tag: "nepal"
    },
    {
        num: "90%",
        label: "of online transactions in Nepal still use cash on delivery — trust in digital purchasing is a structural problem physical retail simply doesn't have",
        source: "incoffeed / nepal ecommerce analysis",
        href: "https://incoffeed.com/e-commerce-market-in-nepal/",
        tag: "nepal"
    },
    {
        num: "back to stores",
        label: "Nepali consumers reversed their post-COVID online shopping habit — a trust deficit sent them back to physical retail, reported by Kathmandu Post in 2024",
        source: "kathmandu post 2024",
        href: "https://kathmandupost.com/money/2024/04/14/back-to-physical-stores-e-commerce-falters-in-nepal-s-topsy-turvy-business-climate",
        tag: "nepal"
    },
    {
        num: "NPR 60K–1.5L",
        label: "minimum monthly rent for a street-facing retail space in central Kathmandu — before fit-out costs, staff wages, utilities, or a security deposit of 6–12 months paid upfront",
        source: "kathmandu property market 2024",
        href: "https://www.quora.com/What-is-the-minimum-cost-of-renting-a-building-in-Kathmandu-Nepal",
        tag: "nepal"
    },
    {
        num: "NPR 8K–15K/mo",
        label: "what a small Nepali brand typically spends on Facebook and Instagram ads each month — a recurring cost with no guaranteed sales, no shelf presence, and no physical trust signal",
        source: "abstractinfosys / nepal digital marketing 2025",
        href: "https://abstractinfosys.com/resource/social-media-marketing-in-nepal",
        tag: "nepal"
    },
    {
        num: "NPR 15K–60K/mo",
        label: "cost of hiring a social media marketing agency in Nepal — on top of ad spend, on top of product costs, before a single customer has physically held your product",
        source: "kumarijob / digital marketing nepal 2025",
        href: "https://www.kumarijob.com/blog/career-tips/digital-marketing-in-nepal",
        tag: "nepal"
    },
    {
        num: "NPR 20L",
        label: "maximum government startup loan available to young Nepali entrepreneurs in 2025/26 — which wouldn't even cover one year's rent on a modest central Kathmandu storefront",
        source: "government of nepal / companysewa 2025",
        href: "https://companysewa.com/blog/startup-loans-in-nepal/",
        tag: "nepal"
    },
    {
        num: "10,000+",
        label: "registered ecommerce websites in Nepal — and fewer than a handful generate meaningful revenue. the digital shelf here is already oversaturated",
        source: "primeitsewa / nepal ecommerce 2025",
        href: "https://primeitsewa.com/e-commerce-in-nepal/",
        tag: "nepal"
    },

    // ── GLOBAL CONTEXT ─────────────────────────────────────────────
    // framed honestly as global benchmarks, not Nepal-specific data

    {
        num: "80%",
        label: "of retail purchases globally still happen in physical stores — even in markets far more digitally mature than Nepal. online is growing, but it is still the minority channel",
        source: "salesso 2025 — global benchmark",
        href: "https://salesso.com/blog/in-store-vs-online-shopping-statistics/",
        tag: "global"
    },
    {
        num: "13.9%",
        label: "boost to online sales when an emerging brand opens its first physical store, per a study of 2,103 stores and $850B in transactions — presence in a shop lifts everything else including your instagram",
        source: "icsc halo effect III 2023 — global benchmark",
        href: "https://retail-insider.com/retail-insider/2024/01/icsc-report-reveals-brick-and-mortar-stores-boost-online-sales-with-the-halo-effect-iii-interview/",
        tag: "global"
    },
    {
        num: "84%",
        label: "of consumers globally prefer multi-brand retailers over single-brand stores for discovery and purchase — the instinct to browse and compare in one place is universal",
        source: "roland berger 2024 — global benchmark",
        href: "https://shoez.biz/en/mehrheit-der-verbraucher-kauft-im-multimarkenhandel/",
        tag: "global"
    },
    {
        num: "40–60%",
        label: "rise in digital customer acquisition costs globally since 2023 — instagram and facebook ads are getting more expensive and less effective everywhere, Nepal included",
        source: "phoenix strategy group 2025 — global benchmark",
        href: "https://www.phoenixstrategy.group/blog/cac-benchmarks-by-channel-2025",
        tag: "global"
    },
    {
        num: "1.7×",
        label: "more purchases made by omnichannel shoppers vs. single-channel — brands that only exist online are leaving half their potential on the table, regardless of market",
        source: "brandsgateway 2025 — global benchmark",
        href: "https://brandsgateway.com/blog/retail-statistics/",
        tag: "global"
    },

]

// ── formatting ────────────────────────────────────────────────────────────────
function fmt(n: number) {
    return "Rs. " + Math.round(n).toLocaleString("en-IN")
}

// ── main component ────────────────────────────────────────────────────────────
export function WhyTHCClub({ value, onTabChange }: { value: string, onTabChange?: (tab: string) => void }) {
    // UI States
    const [whyTab, setWhyTab] = useState("comparisons")

    // Calculator States
    const [section, setSection] = useState<Section>("premium")
    const [level, setLevel] = useState<Level>("eye_level")
    const [duration, setDuration] = useState<Duration>("yearly")
    const [sales, setSales] = useState(50000)
    const [storefront, setStorefront] = useState(25000)

    // Data States
    const [pricingTiers, setPricingTiers] = useState<ShelfPricingTier[]>([])
    const [ppfTiers, setPpfTiers] = useState<PPFTier[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadData() {
            setLoading(true)
            try {
                const [{ data: pt }, { data: ppf }] = await Promise.all([
                    supabase.from("shelf_pricing_tiers").select("*"),
                    supabase.from("ppf_tiers").select("*").order("min_sales_amount", { ascending: true }),
                ])
                if (pt) {
                    setPricingTiers(pt)
                    if (pt.length > 0) {
                        const initial = pt.find(t => t.section_tier === "premium" && t.duration === "yearly") || pt[0]
                        setSection(initial.section_tier)
                        setDuration(initial.duration)
                    }
                }
                if (ppf) setPpfTiers(ppf)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    // Derived Calculator Options
    const availableSections = useMemo(() =>
        Array.from(new Set(pricingTiers.map(t => t.section_tier))).sort(),
        [pricingTiers])

    const availableDurations = useMemo(() =>
        Array.from(new Set(pricingTiers.map(t => t.duration)))
            .sort((a, b) => (DURATION_ORDER[b] || 0) - (DURATION_ORDER[a] || 0)) as Duration[],
        [pricingTiers])

    const availableLevels: { val: Level; label: string }[] = useMemo(() => [
        { val: "eye_level", label: "eye level" },
        { val: "top_level", label: "top level" },
        { val: "bottom", label: "bottom level" },
    ], [])

    // Dynamic PPF and Credit Info
    const { minPPF, maxPPF, creditDisclaimer } = useMemo(() => {
        const min = ppfTiers.length > 0 ? Math.min(...ppfTiers.map(t => t.ppf_rate)) : 3
        const max = ppfTiers.length > 0 ? Math.max(...ppfTiers.map(t => t.ppf_rate)) : 10
        const tiers = ppfTiers.filter(t => t.rent_waiver_percent > 0).sort((a, b) => a.min_sales_amount - b.min_sales_amount)
        const disclaimer = tiers.length > 0
            ? `rent credit applied when monthly sales exceed ${tiers.map(t => `${fmt(t.min_sales_amount)} (${t.rent_waiver_percent}% back)`).join(" or ")}.`
            : "standard rent applies regardless of sales volume."
        return { minPPF: min, maxPPF: max, creditDisclaimer: disclaimer }
    }, [ppfTiers])

    // Calculation Logic
    const monthlyRent = useMemo(() => {
        const tier = pricingTiers.find(t => t.duration === duration && t.section_tier === section)
        if (!tier) return 0
        return Number(tier[`${level}_price` as keyof ShelfPricingTier]) || 0
    }, [pricingTiers, duration, section, level])

    const { ppfRate, ppfLabel, credit } = useMemo(() => {
        if (ppfTiers.length === 0) return { ppfRate: 0, ppfLabel: "0%", credit: 0 }
        const sortedDesc = [...ppfTiers].sort((a, b) => b.min_sales_amount - a.min_sales_amount)
        const matched = sortedDesc.find(t => sales >= t.min_sales_amount)
        if (matched) {
            return {
                ppfRate: matched.ppf_rate / 100,
                ppfLabel: `${matched.ppf_rate}%`,
                credit: Math.round(monthlyRent * (matched.rent_waiver_percent / 100))
            }
        }
        const lowest = [...ppfTiers].sort((a, b) => a.min_sales_amount - b.min_sales_amount)[0]
        return {
            ppfRate: lowest ? lowest.ppf_rate / 100 : 0,
            ppfLabel: lowest ? `${lowest.ppf_rate}%` : "0%",
            credit: 0
        }
    }, [ppfTiers, sales, monthlyRent])

    const ppfAmt = Math.round(sales * ppfRate)
    const regFeePerMo = Math.round(REGISTRATION_FEE / 12)

    // Financial Comparison
    const thcMonthly = monthlyRent + ppfAmt - credit + regFeePerMo
    const ownUtilities = Math.round(storefront * 0.1)
    const runningCosts = 5000
    const staffCosts = 15000
    const ownMonthly = storefront + ownUtilities + staffCosts + runningCosts

    const thcAnnual = monthlyRent * 12 + ppfAmt * 12 - credit * 12 + REGISTRATION_FEE
    const ownAnnual = ownMonthly * 12

    const saveVsOwn = ownAnnual - thcAnnual

    // Problem/Solution Content
    const dynamicProblems = useMemo(() => [
        {
            tag: "capital risk",
            title: "what it takes to start",
            them: [
                "opening a physical storefront requires significant upfront capital investment",
                "long-term leases, deposits, and setup costs lock capital before validation",
                "high commitment is required before understanding real demand",
                "exiting or pivoting comes with financial and operational friction",
            ],
            us: [
                "low upfront cost with no long-term lease commitments",
                "shelf rental allows you to validate demand before scaling",
                "capital remains flexible instead of being locked into infrastructure",
                "easy entry and exit without operational burden",
            ],
        },
        {
            tag: "cost structure",
            title: "how money actually flows",
            them: [
                "fixed monthly costs remain constant regardless of sales performance",
                "rent, staff, and utilities create a high break-even point",
                "downside risk is fully carried by the brand",
                "profitability depends on consistently high sales volume",
            ],
            us: [
                "fixed shelf cost with a controlled and predictable baseline",
                `a variable processing fee of ${minPPF}–${maxPPF}% tied directly to performance`,
                "lower downside risk during slower sales cycles",
                "cost structure designed to scale with your revenue, not against it",
            ],
        },
        {
            tag: "operational complexity",
            title: "what you actually have to manage",
            them: [
                "full responsibility for store operations, staffing, and maintenance",
                "time and energy split between selling and running a physical space",
                "inventory, security, and daily operations require constant attention",
                "operational inefficiencies directly impact profitability",
            ],
            us: [
                "no need to manage staff, rent, or daily store operations",
                "focus purely on product, branding, and growth",
                "shared infrastructure reduces operational overhead",
                "a system designed to remove distractions from core business",
            ],
        },
        {
            tag: "control",
            title: "ownership without burden",
            them: [
                "full control comes with full responsibility and risk",
                "every decision has operational and financial consequences",
                "experimentation is costly and slow to execute",
                "scaling requires duplicating the same heavy model",
            ],
            us: [
                "dedicated shelf space with full control over your products",
                "freedom to test pricing, packaging, and positioning quickly",
                "low-risk experimentation within a live retail environment",
                "scale presence without replicating full storefront costs",
            ],
        },
        {
            tag: "visibility",
            title: "getting discovered offline",
            them: [
                "single-location stores rely heavily on self-driven foot traffic",
                "marketing must be funded and executed independently",
                "limited cross-brand discovery within isolated spaces",
                "footfall variability directly impacts revenue stability",
            ],
            us: [
                "integrated footfall from sayummy’s café ensuring consistent traffic",
                "placement within a multi-brand discovery environment",
                "shared visibility benefits across complementary brands",
                "built-in ecosystem that increases product exposure organically",
            ],
        },
        {
            tag: "online limitation",
            title: "why online alone falls short",
            them: [
                "online-only brands lack physical trust and product interaction",
                "customer hesitation is higher without real-world validation",
                "discovery depends heavily on paid reach and algorithms",
                "conversion rates can be limited without physical presence",
            ],
            us: [
                "physical presence builds trust and product credibility instantly",
                "customers can see, feel, and evaluate before purchasing",
                "offline discovery complements and strengthens online channels",
                "a hybrid model that aligns with real consumer behavior",
            ],
        },
    ], [minPPF, maxPPF])

    const selectClass = "w-full text-base font-bold lowercase italic bg-white/60 border border-[#FE7F2D]/20 rounded-xl px-4 py-3 text-[#010307] focus:outline-none focus:ring-1 focus:ring-[#FE7F2D]/40 text-center"

    return (
        <TabsContent value={value} className="space-y-12 py-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="max-w-7xl mx-auto space-y-10">

                {/* ── heading ── */}
                <div className="text-center space-y-4">
                    <h2 className="text-6xl font-black tracking-tighter lowercase italic text-[#010307]">
                        why <span className="italic opacity-30">thc club</span>
                    </h2>
                    <p className="text-base text-[#010307]/50 italic max-w-xl mx-auto">
                        the gap between creating and being seen is where most brands die. we built this to close it.
                    </p>
                </div>

                <Tabs value={whyTab} onValueChange={setWhyTab} className="space-y-12">
                    <div className="flex justify-center">
                        <TabsList className="bg-white/50 border border-[#FE7F2D]/10 rounded-full h-14 p-1.5 space-x-1 shadow-sm backdrop-blur-md">
                            <TabsTrigger value="comparisons" className="rounded-full px-8 h-full text-xs font-black lowercase italic data-[state=active]:bg-[#FE7F2D] data-[state=active]:text-white transition-all duration-300 gap-2">
                                <HelpCircle className="w-3.5 h-3.5" /> problems we solve
                            </TabsTrigger>
                            <TabsTrigger value="research" className="rounded-full px-8 h-full text-xs font-black lowercase italic data-[state=active]:bg-[#FE7F2D] data-[state=active]:text-white transition-all duration-300 gap-2">
                                <BarChart3 className="w-3.5 h-3.5" /> research
                            </TabsTrigger>
                            <TabsTrigger value="calculator" className="rounded-full px-8 h-full text-xs font-black lowercase italic data-[state=active]:bg-[#FE7F2D] data-[state=active]:text-white transition-all duration-300 gap-2">
                                <Calculator className="w-3.5 h-3.5" /> economics
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="comparisons" className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500 outline-none">
                        {/* ── problem / solution cards ── */}
                        <div className="max-w-4xl mx-auto space-y-4">
                            {dynamicProblems.map((p, idx) => (
                                <Card key={idx} className="border border-[#FE7F2D]/10 shadow-sm rounded-[2.5rem] bg-white/50 backdrop-blur-sm overflow-hidden">
                                    <div className="px-8 sm:px-12 py-10 border-b border-[#FE7F2D]/10">
                                        <p className="text-xs font-bold text-[#FE7F2D] uppercase tracking-widest mb-1">{p.tag}</p>
                                        <h3 className="text-4xl font-black tracking-tighter lowercase italic text-[#010307]">{p.title}</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#FE7F2D]/10">
                                        <div className="px-8 sm:px-12 py-10 space-y-6">
                                            <p className="text-xs font-bold text-[#010307]/30 uppercase tracking-widest">traditional pattern</p>
                                            {p.them.map((item, i) => (
                                                <div key={i} className="flex items-start gap-3">
                                                    <span className="mt-1 w-4 h-4 rounded-full border border-[#010307]/20 flex-shrink-0 flex items-center justify-center">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#010307]/20" />
                                                    </span>
                                                    <p className="text-base text-[#010307]/60 italic">{item}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="px-8 sm:px-12 py-10 space-y-6 bg-[#FE7F2D]/[0.03]">
                                            <p className="text-xs font-bold text-[#FE7F2D] uppercase tracking-widest">thc club</p>
                                            {p.us.map((item, i) => (
                                                <div key={i} className="flex items-start gap-3">
                                                    <span className="mt-1 w-4 h-4 rounded-full bg-[#FE7F2D]/20 flex-shrink-0 flex items-center justify-center">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#FE7F2D]" />
                                                    </span>
                                                    <p className="text-base text-[#010307]/70 italic">{item}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="research" className="space-y-16 animate-in fade-in zoom-in-95 duration-500 outline-none">
                        {/* ── stall vs shelf comparison ── */}
                        <Card className="max-w-4xl mx-auto border border-[#FE7F2D]/10 rounded-[2.5rem] bg-white/50 backdrop-blur-sm p-10 sm:p-12 overflow-hidden shadow-sm">
                            <p className="text-xs font-bold text-[#FE7F2D] uppercase tracking-widest mb-8 text-center px-4 py-1.5 border border-[#FE7F2D]/20 rounded-full w-fit mx-auto">the event/stall table quick maths</p>
                            <div className="grid grid-cols-2 gap-6 sm:gap-12">
                                <div className="space-y-4 text-center">
                                    <p className="text-xs font-bold text-[#010307]/30 uppercase tracking-widest">event stall</p>
                                    <p className="text-5xl font-black tracking-tighter italic text-[#010307]">1 day</p>
                                    <div className="space-y-2">
                                        {[
                                            "Rs. 3,000–5,000 for a single table",
                                            "one event's crowd, gone by evening",
                                            "setup and breakdown every single time",
                                            "70% of brands don't break even",
                                            "zero presence the day after",
                                        ].map((line, i) => (
                                            <div key={i} className="flex items-start gap-2 text-left">
                                                <span className="mt-1.5 w-3 h-3 rounded-full border border-[#010307]/20 flex-shrink-0 flex items-center justify-center">
                                                    <span className="w-1 h-1 rounded-full bg-[#010307]/20" />
                                                </span>
                                                <p className="text-sm text-[#010307]/50 italic">{line}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4 text-center">
                                    <p className="text-xs font-bold text-[#FE7F2D] uppercase tracking-widest">thc club shelf</p>
                                    <p className="text-5xl font-black tracking-tighter italic text-[#FE7F2D]">3 months</p>
                                    <div className="space-y-2">
                                        {[
                                            "same Rs. 3,000–5,000 total",
                                            "daily footfall from sayummy's café",
                                            "set up once. always there",
                                            "your shelf, your rules, your brand",
                                            "visible every single day of the term",
                                        ].map((line, i) => (
                                            <div key={i} className="flex items-start gap-2 text-left">
                                                <span className="mt-1.5 w-3 h-3 rounded-full bg-[#FE7F2D]/20 flex-shrink-0 flex items-center justify-center">
                                                    <span className="w-1 h-1 rounded-full bg-[#FE7F2D]" />
                                                </span>
                                                <p className="text-sm text-[#010307]/70 italic">{line}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-10 pt-8 border-t border-[#FE7F2D]/10 text-center">
                                <p className="text-2xl font-black tracking-tighter lowercase italic text-[#010307]">
                                    same budget. <span className="text-[#FE7F2D]">90x the exposure.</span>
                                </p>
                            </div>
                        </Card>
                        {/* ── research stats ── */}
                        <div className="max-w-6xl mx-auto space-y-8">
                            <div className="text-center space-y-2">
                                <p className="text-[10px] font-bold text-[#FE7F2D] uppercase tracking-widest">the data layer</p>
                                <h3 className="text-4xl font-black tracking-tighter lowercase italic text-[#010307]">what the research says</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {STATS.map((stat, i) => (
                                    <a key={i} href={stat.href} target="_blank" rel="noopener noreferrer" className="block outline-none group">
                                        <Card className="p-6 border border-[#FE7F2D]/10 bg-white/50 rounded-3xl text-center space-y-2 h-full group-hover:border-[#FE7F2D]/40 group-hover:bg-white group-hover:shadow-lg group-hover:shadow-orange-500/5 transition-all duration-300">
                                            <p className="text-4xl font-black tracking-tighter italic text-[#010307] group-hover:text-[#FE7F2D] transition-colors">{stat.num}</p>
                                            <p className="text-xs text-[#010307]/50 italic leading-relaxed group-hover:text-[#010307]/70 transition-colors">{stat.label}</p>
                                            <div className="flex items-center justify-center gap-1 mt-2">
                                                <p className="text-[10px] font-bold text-[#FE7F2D] uppercase tracking-widest group-hover:underline underline-offset-4">{stat.source}</p>
                                                <svg className="w-2.5 h-2.5 text-[#FE7F2D] opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </div>
                                        </Card>
                                    </a>
                                ))}
                            </div>
                        </div>


                    </TabsContent>

                    <TabsContent value="calculator" className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 outline-none">
                        <div className="text-center space-y-2 mb-4">
                            <p className="text-[10px] font-bold text-[#FE7F2D] uppercase tracking-widest">the economics</p>
                            <h3 className="text-4xl font-black tracking-tighter lowercase italic text-[#010307]">compare the models</h3>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                            {/* LEFT CONTROL PANEL */}
                            <Card className="xl:col-span-4 border border-[#FE7F2D]/10 shadow-sm rounded-[2.5rem] bg-white/50 backdrop-blur-sm p-8 sm:p-10 space-y-8 sticky top-24">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-[#010307]/40 uppercase tracking-widest">section</p>
                                        <select className={selectClass} value={section} onChange={e => setSection(e.target.value)}>
                                            {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-[#010307]/40 uppercase tracking-widest">shelf level</p>
                                        <select className={selectClass} value={level} onChange={e => setLevel(e.target.value as Level)}>
                                            {availableLevels.map(l => <option key={l.val} value={l.val}>{l.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-[#010307]/40 uppercase tracking-widest">commitment</p>
                                        <select className={selectClass} value={duration} onChange={e => setDuration(e.target.value as Duration)}>
                                            {availableDurations.map(d => (
                                                <option key={d} value={d}>{d === "half_yearly" ? "half-yearly" : d}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-8 pt-4 border-t border-[#FE7F2D]/10">
                                    {[
                                        { label: "monthly sales", value: fmt(sales), min: 1000, max: 200000, setter: setSales, current: sales, highlight: false },
                                        { label: "own storefront rent", value: `${fmt(storefront)}/mo`, min: 25000, max: 100000, setter: setStorefront, current: storefront, highlight: false },
                                    ].map((slider, i) => (
                                        <div key={i} className="space-y-4">
                                            <div className="flex justify-between items-baseline">
                                                <p className="text-xs font-bold text-[#010307]/40 uppercase tracking-widest leading-none">{slider.label}</p>
                                                <p className={`text-base font-black italic ${slider.highlight ? "text-[#FE7F2D]" : "text-[#010307]"}`}>{slider.value}</p>
                                            </div>
                                            <Slider min={slider.min} max={slider.max} step={1000} value={[slider.current]} onValueChange={([v]) => slider.setter(v)} className="w-full" />
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* RIGHT CONTENT */}
                            <div className="xl:col-span-8 space-y-6">
                                {/* Row 1: THC Club */}
                                <Card className="w-full border-2 border-[#FE7F2D]/60 shadow-xl shadow-orange-500/5 rounded-[2.5rem] bg-white overflow-hidden relative group transition-all duration-300 hover:scale-[1.005]">
                                    <div className="absolute top-0 right-0 px-6 py-2 bg-[#FE7F2D] text-white text-[11px] font-black uppercase tracking-tighter italic rounded-bl-[2rem] shadow-md z-10">
                                        partner-preferred choice
                                    </div>
                                    <div className="flex flex-col md:flex-row h-full">
                                        <div className="flex-1 px-10 py-10 border-b md:border-b-0 md:border-r border-[#FE7F2D]/10 bg-[#FE7F2D]/[0.06]">
                                            <div className="space-y-1 mb-8">
                                                <p className="text-[10px] font-bold text-[#FE7F2D] uppercase tracking-widest">01</p>
                                                <h4 className="text-3xl font-black tracking-tighter lowercase italic text-[#010307]">thc club</h4>
                                                <p className="text-xs text-[#010307]/40 italic">the ultimate physical growth engine for your brand</p>
                                            </div>
                                            <div className="space-y-4">
                                                {[
                                                    { label: "shelf rental / mo", val: fmt(monthlyRent), accent: false },
                                                    { label: `PPF (${ppfLabel})`, val: fmt(ppfAmt), accent: false },
                                                    { label: "rent credit", val: credit > 0 ? `− ${fmt(credit)}` : "Rs. 0", accent: credit > 0 },
                                                    { label: "onboarding (one-time fee)", val: `Rs. ${regFeePerMo}`, accent: false },
                                                ].map((row, i) => (
                                                    <div key={i} className="flex justify-between items-baseline border-b border-[#FE7F2D]/10 pb-4 last:border-0 last:pb-0 gap-2">
                                                        <span className="text-sm text-[#010307]/50 italic whitespace-nowrap">{row.label}</span>
                                                        <span className={`text-base font-black italic whitespace-nowrap ${row.accent ? "text-[#FE7F2D]" : "text-[#010307]"}`}>{row.val}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="w-full md:w-[280px] p-10 flex flex-col justify-center items-center md:items-end text-center md:text-right space-y-2 bg-white">
                                            <p className="text-xs font-bold text-[#010307] uppercase tracking-widest leading-none">total monthly cost</p>
                                            <div className="space-y-0.5">
                                                <p className="text-5xl font-black italic text-[#FE7F2D] tracking-tighter whitespace-nowrap">{fmt(thcMonthly)}</p>
                                                <p className="text-[9px] text-[#FE7F2D]/60 font-black uppercase tracking-tighter italic">capped cost + credit back applied</p>
                                            </div>
                                            <div className="pt-6 w-full">
                                                <div className="px-4 py-2 rounded-xl bg-orange-50 border border-orange-100/50 text-[10px] text-[#FE7F2D] italic font-medium leading-tight">
                                                    includes physical presence, staff, curation & insurance
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                {/* Row 2: Comparison Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-[2.5rem] bg-white/50 backdrop-blur-sm overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                                        <div className="px-8 py-7 border-b border-[#FE7F2D]/10">
                                            <p className="text-[10px] font-bold text-[#010307]/30 uppercase tracking-widest mb-0.5">02</p>
                                            <h4 className="text-xl font-black tracking-tighter lowercase italic text-[#010307]">own storefront</h4>
                                        </div>
                                        <div className="px-8 py-8 space-y-3">
                                            {[
                                                { label: "rent", val: fmt(storefront) },
                                                { label: "utilities & running", val: fmt(ownUtilities + runningCosts) },
                                                { label: "staffing", val: fmt(staffCosts) },
                                            ].map((row, i) => (
                                                <div key={i} className="flex justify-between items-baseline border-b border-[#FE7F2D]/10 pb-4 last:border-0 last:pb-0 gap-2">
                                                    <span className="text-[13px] text-[#010307]/50 italic whitespace-nowrap">{row.label}</span>
                                                    <span className="text-base font-black italic whitespace-nowrap text-[#010307]">{row.val}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between items-baseline pt-4 border-t border-[#FE7F2D]/20">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-[#010307] uppercase tracking-widest">monthly cost</span>
                                                    <span className="text-[8px] text-[#010307]/30 font-black uppercase tracking-tighter italic">+ interiors & stock</span>
                                                </div>
                                                <span className="text-3xl font-black italic text-[#010307]">{fmt(ownMonthly)}</span>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-[2.5rem] bg-[#FE7F2D]/[0.02] overflow-hidden opacity-90 hover:opacity-100 transition-opacity flex items-center justify-center p-8 text-center">
                                        <div className="space-y-4">
                                            <div className="w-16 h-16 bg-[#FE7F2D]/10 rounded-full flex items-center justify-center mx-auto text-[#FE7F2D]">
                                                <Calculator className="w-8 h-8" />
                                            </div>
                                            <h4 className="text-xl font-black tracking-tighter lowercase italic text-[#010307]">aggregated infrastructure</h4>
                                            <p className="text-sm text-[#010307]/50 italic max-w-[240px]">sharing resources across brands reduces specific risk by up to 80%</p>
                                        </div>
                                    </Card>
                                </div>

                                {/* Row 3: Difference Highlights */}
                                <div className="pt-4 space-y-6">
                                    <div className="flex items-center gap-4 px-2">
                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#FE7F2D]/20 to-transparent" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] italic text-[#FE7F2D] whitespace-nowrap">your net advantage</span>
                                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#FE7F2D]/20 to-transparent" />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <Card className="border border-[#FE7F2D]/30 rounded-3xl bg-white shadow-xl shadow-orange-500/5 p-8 hover:border-[#FE7F2D]/50 transition-all duration-300">
                                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
                                                <div className="space-y-2">
                                                    <span className="text-[10px] font-bold text-[#010307]/30 uppercase tracking-widest">net advantage vs storefront (annual)</span>
                                                    <p className="text-5xl font-black italic tracking-tighter text-[#FE7F2D]">{saveVsOwn > 0 ? fmt(saveVsOwn) : "Rs. 0"}</p>
                                                </div>
                                                <div className="max-w-xs">
                                                    <p className="text-[11px] text-[#010307]/50 italic font-medium leading-relaxed">this represents capital freed up by shifting from individual overhead to our curated aggregated infrastructure. reinvest this directly into product R&D or marketing.</p>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                </div>

                                {/* NEUTRAL NOTE */}

                                {/* FOOTNOTE */}
                                <p className="text-[10px] text-[#010307]/30 italic leading-relaxed px-4 text-center">
                                    ppf resets monthly. storefront estimates exclude setup, interiors and insurance. registration fee is distributed across 12 months.
                                </p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                {/* ── closing card ── */}
                <Card className="p-10 sm:p-14 border border-[#FE7F2D]/10 bg-white/50 rounded-[2.5rem] text-center space-y-6 shadow-sm">
                    <p className="text-[10px] font-bold text-[#FE7F2D] uppercase tracking-widest">the bottom line</p>
                    <h3 className="text-3xl sm:text-4xl font-black tracking-tighter lowercase italic text-[#010307] leading-tight">
                        you built something worth showing.<br />
                        <span className="opacity-30">we built the room to show it in.</span>
                    </h3>
                    <p className="text-sm text-[#010307]/50 italic max-w-lg mx-auto">
                        thc club isn't just retail space. it's what happens when a founder gets tired of being turned away and decides to build the door they kept being shut out of.
                    </p>
                    <div className="pt-2">
                        <button
                            onClick={() => onTabChange?.("onboarding")}
                            className="px-10 py-4 rounded-full border border-[#FE7F2D]/40 text-sm font-black lowercase italic text-[#FE7F2D] hover:bg-[#FE7F2D]/10 hover:border-[#FE7F2D]/60 transition-all duration-300"
                        >
                            see if there's a shelf for you →
                        </button>
                        <p className="text-xs text-[#010307]/30 italic mt-3">no commitment until you're ready. we'll walk you through everything first.</p>
                    </div>
                </Card>

            </div>
        </TabsContent>
    )
}