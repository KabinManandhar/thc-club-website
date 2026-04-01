"use client"

import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { supabase, type PPFTier, type ShelfPricingTier } from "@/lib/supabase"
import { useEffect, useMemo, useState } from "react"
import { TabsContent } from "../ui/tabs"

// ── types ────────────────────────────────────────────────────────────────────
type Section = string
type Level = "eye_level" | "top_level" | "bottom"
type Duration = "yearly" | "half_yearly" | "quarterly"

// ── constants ─────────────────────────────────────────────────────────────────
const DURATION_ORDER: Record<string, number> = { yearly: 3, half_yearly: 2, quarterly: 1 }
const REGISTRATION_FEE = 800

// const STATS = [
//     {
//         num: "58%",
//         label: "more likely to impulse buy from an unknown brand in-store vs. online — physical presence converts discovery into purchase",
//         source: "bazaarvoice",
//         href: "https://www.bazaarvoice.com/press/the-joy-of-online-discovery-54-of-global-shoppers-enjoy-virtual-window-shopping-more-than-in-store-browsing/"
//     },
//     {
//         num: "60%",
//         label: "of shoppers now discover new products in physical stores — surpassing online marketplaces for the first time",
//         source: "salsify 2026",
//         href: "https://retailmediaage.co.uk/in-store/discerning-customers-want-an-in-store-experience-with-online-content/"
//     },
//     {
//         num: "82%",
//         label: "of consumers are more inclined to buy after seeing or holding a product in person — no digital channel replicates this",
//         source: "shopkick",
//         href: "https://www.businesswire.com/news/home/20200102005030/en/2020-Shopping-Outlook-82-Percent-of-Consumers-More-Inclined-to-Purchase-After-Seeing-Holding-or-Demoing-Products-In-Store"
//     },
//     {
//         num: "67%",
//         label: "of consumers trust local businesses more than online-only brands — physical presence builds credibility that instagram can't",
//         source: "uberall",
//         href: "https://www.prweb.com/releases/study-67-of-consumers-trust-local-businesses-more-than-internet-only-brands-826754056.html"
//     },
//     {
//         num: "55%",
//         label: "of consumers feel more emotionally connected to a business with a local physical presence than any other driver of connection",
//         source: "uberall",
//         href: "https://www.agilitypr.com/pr-news/public-relations/although-consumers-research-purchases-online-most-trust-local-brands-more-than-web-brands/"
//     },
//     {
//         num: "58%",
//         label: "of consumers became more loyal to local businesses post-pandemic — independent local retail has a trust advantage chains don't",
//         source: "uberall",
//         href: "https://www.agilitypr.com/pr-news/public-relations/although-consumers-research-purchases-online-most-trust-local-brands-more-than-web-brands/"
//     },
//     {
//         num: "40–80%",
//         label: "of all physical retail purchases are impulse buys — curated environments with easy browsing directly drive this",
//         source: "apepper designs",
//         href: "https://apepperdesigns.com/understanding-consumer-behavior-in-the-retail-environment-maximizing-in-store-purchases/"
//     },

// ]

const STATS = [
    {
        num: "60%",
        label: "of shoppers now discover new products in physical stores — surpassing online marketplaces for the first time",
        source: "salsify 2026",
        href: "https://retailmediaage.co.uk/in-store/discerning-customers-want-an-in-store-experience-with-online-content/"
    },
    {
        num: "58%",
        label: "more likely to impulse buy from an unknown brand in-store vs. online — physical presence converts discovery into purchase",
        source: "bazaarvoice",
        href: "https://www.bazaarvoice.com/press/the-joy-of-online-discovery-54-of-global-shoppers-enjoy-virtual-window-shopping-more-than-in-store-browsing/"
    },
    {
        num: "82%",
        label: "of consumers are more inclined to buy after seeing or holding a product in person — no digital channel replicates this",
        source: "shopkick",
        href: "https://www.businesswire.com/news/home/20200102005030/en/2020-Shopping-Outlook-82-Percent-of-Consumers-More-Inclined-to-Purchase-After-Seeing-Holding-or-Demoing-Products-In-Store"
    },
    {
        num: "67%",
        label: "of consumers trust local businesses more than online-only brands — physical presence builds credibility instagram can't",
        source: "uberall",
        href: "https://www.prweb.com/releases/study-67-of-consumers-trust-local-businesses-more-than-internet-only-brands-826754056.html"
    },
    {
        num: "55%",
        label: "of consumers feel more emotionally connected to a local business than any other driver — including product quality",
        source: "uberall",
        href: "https://www.agilitypr.com/pr-news/public-relations/although-consumers-research-purchases-online-most-trust-local-brands-more-than-web-brands/"
    },
    {
        num: "40–80%",
        label: "of all physical retail purchases are impulse buys — curated environments with easy browsing directly drive this",
        source: "apepper designs",
        href: "https://apepperdesigns.com/understanding-consumer-behavior-in-the-retail-environment-maximizing-in-store-purchases/"
    },
    {
        num: "77%",
        label: "of gift retail revenue comes from brick-and-mortar — tactile experience builds trust online cannot replicate",
        source: "mordor intel",
        href: "https://straitsresearch.com/report/gifts-novelty-and-souvenir-market"
    },
    {
        num: "20–60%",
        label: "commission is the documented industry standard at traditional retail and consignment spaces — before any other fees",
        source: "mass.gov",
        href: "https://www.mass.gov/info-details/chapter-4-calculating-costs-setting-a-price"
    },
    {
        num: "82%",
        label: "of small businesses fail due to poor cash flow — unpredictable commission payouts and delayed settlements are a direct cause",
        source: "u.s. bank",
        href: "https://taqtics.co/retail-operations/common-problems-and-solutions-a-retail-store-faces/"
    },
    {
        num: "1/3",
        label: "of supermarket profits come entirely from fees charged to supplier brands — the system is designed to extract, not support",
        source: "rangeme",
        href: "https://www.rangeme.com/blog/understanding-hidden-costs-and-fees-when-working-with-retailers/"
    },
    {
        num: "0%",
        label: "display control for brands in commission spaces — placement, presentation, and discounting are entirely the retailer's call",
        source: "trendsi",
        href: "https://www.trendsi.com/blog/business-tips/what-is-it-called-when-a-store-sells-your-product-a-clear-guide-to-retail-wholesale-and-consignment-sales/"
    },
    {
        num: "weeks",
        label: "to months is how long brands wait to get paid at commission stores — with no guarantee sales were reported accurately",
        source: "trendsi",
        href: "https://www.trendsi.com/blog/business-tips/what-is-it-called-when-a-store-sells-your-product-a-clear-guide-to-retail-wholesale-and-consignment-sales/"
    },
]

// ── formatting ────────────────────────────────────────────────────────────────
function fmt(n: number) {
    return "Rs. " + Math.round(n).toLocaleString("en-IN")
}

// ── main component ────────────────────────────────────────────────────────────
export function WhyTHCClub({ value }: { value: string }) {
    // Calculator States
    const [section, setSection] = useState<Section>("premium")
    const [level, setLevel] = useState<Level>("eye_level")
    const [duration, setDuration] = useState<Duration>("yearly")
    const [sales, setSales] = useState(50000)
    const [storefront, setStorefront] = useState(25000)
    const [commRate, setCommRate] = useState(25)

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
                        // Priority initialization
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
    const { minPPF, maxPPF, creditDisclaimer, creditTiers } = useMemo(() => {
        const min = ppfTiers.length > 0 ? Math.min(...ppfTiers.map(t => t.ppf_rate)) : 3
        const max = ppfTiers.length > 0 ? Math.max(...ppfTiers.map(t => t.ppf_rate)) : 10
        const tiers = ppfTiers.filter(t => t.rent_waiver_percent > 0).sort((a, b) => a.min_sales_amount - b.min_sales_amount)
        const disclaimer = tiers.length > 0
            ? `rent credit applied when monthly sales exceed ${tiers.map(t => `${fmt(t.min_sales_amount)} (${t.rent_waiver_percent}% back)`).join(" or ")}.`
            : "standard rent applies regardless of sales volume."
        return { minPPF: min, maxPPF: max, creditDisclaimer: disclaimer, creditTiers: tiers }
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

        // Default to lowest tier
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
    const commMonthly = Math.round(sales * (commRate / 100))

    const thcAnnual = monthlyRent * 12 + ppfAmt * 12 - credit * 12 + REGISTRATION_FEE
    const ownAnnual = ownMonthly * 12
    const commAnnual = commMonthly * 12

    const saveVsComm = commAnnual - thcAnnual
    const saveVsOwn = ownAnnual - thcAnnual

    // Problem/Solution Content
    const dynamicProblems = useMemo(() => [
        {
            tag: "the money problem",
            title: "they take a cut. every time. forever.",
            them: [
                "20–60% commission is the documented industry standard — before any other fees or charges",
                "the more you sell, the more they earn. you carry all the risk, they take the upside",
                "payment timelines stretch weeks to months, with no guarantee sales were reported accurately",
                "supermarkets and retail spaces make up to a third of their profits from supplier fees alone",
            ],
            us: [
                `small processing fee of ${minPPF}–${maxPPF}% based only on that month's sales — resets every month, never accumulates`,
                "flat shelf rental upfront. your cost is fixed and known before a single product sells",
                "payout at the end of every month. no delays, no chasing, no exceptions — rent credits included",
                "transparent sales tracking. no black box, no chasing numbers, no blind trust required",
            ],
        },
        {
            tag: "the control problem",
            title: "your brand. someone else's decisions.",
            them: [
                "zero say over display — it goes where they put it, positioned however they decide",
                "need to restock, reprice, or swap products? schedule it around their availability",
                "your brand sits next to whoever else they onboarded — no curation, no context, no fit",
                "they can remove your products at will — little notice, limited recourse, no stability",
            ],
            us: [
                "you choose your shelf — first come first serve, but once it's yours, it stays yours",
                "we don't reposition, we don't reassign. your shelf is your decision from day one",
                "walk in anytime. restock on your schedule, reprice without asking anyone's permission",
                "every brand here is curated. your neighbours were chosen with the same care as you",
            ],
        },
        {
            tag: "the stability problem",
            title: "you can't build a brand on borrowed space.",
            them: [
                "commission stores can pull your products anytime — no security, no guaranteed tenure",
                "your slot, position, and display can change without warning based on their priorities",
                "no clear agreement on how long you stay, under what conditions, or what changes cost you",
                "every month you're at the mercy of whether they decide to keep carrying your products",
            ],
            us: [
                "once you're in, you're in — we don't throw you out at will or reassign your shelf without cause",
                "your slot is protected for the full duration of your commitment. no surprises, no reshuffling",
                "a clear partner agreement from day one. you know your rights, your term, and your exit",
                "we're rooting for you to renew, not looking for a reason to replace you",
            ],
        },
        {
            tag: "the visibility problem",
            title: "one of fifty products in a room nobody markets.",
            them: [
                "commission spaces promote themselves — your product fights for attention with no support",
                "no foot traffic data, no customer behaviour insights, no feedback on what's working",
                "slow months mean dead stock sitting on a shelf you're still paying commission on",
                "no onboarding, no support — drop off your products and figure the rest out yourself",
            ],
            us: [
                "shared footfall from sayummy's café — customers already in discovery mode when they arrive",
                "featured social content, discovery reels, and brand spotlights included in select bundles",
                "rent credits when your sales hit higher brackets — the better you do, the less your shelf costs",
                "full onboarding support and a partner agreement written to make you feel welcome, not managed",
            ],
        },
        {
            tag: "the cash flow problem",
            title: "commission bleeds you whether you're winning or losing.",
            them: [
                "82% of small businesses fail due to poor cash flow — unpredictable commission payouts are a direct cause",
                "a good month means a bigger cut to the retailer, not more margin for you",
                "no way to run promotions, adjust pricing, or respond to slow periods without their approval",
                "stall and event tables cost Rs. 3,000–5,000 for a single day — and 70% of brands lose money on them",
            ],
            us: [
                "fixed shelf rental means your biggest cost is known upfront — no surprises, no commission spikes",
                `processing fee of ${minPPF}% on slow months keeps your cost near zero when sales are low`,
                "the same Rs. 3,000–5,000 you'd spend on one event table gets you up to 3 months of permanent shelf space here",
                "you control your pricing entirely — run promotions, adjust on the fly, respond to the market without asking",
            ],
        },
        {
            tag: "the discovery problem",
            title: "online reach alone isn't enough anymore.",
            them: [
                "60% of shoppers now discover new products in physical stores — more than any online channel",
                "58% are more likely to impulse buy from an unknown brand in-store than online",
                "82% of consumers are more inclined to purchase after seeing or holding a product in person",
                "instagram followers don't replace the trust built when a customer picks up your product",
            ],
            us: [
                "a permanent physical shelf means you're always visible — not just when the algorithm decides",
                "customers walking past sayummy's are already in-store, already browsing, already open to discovering",
                "being in a curated space transfers credibility — 67% of consumers trust local physical businesses more",
                "one shelf in the right room reaches customers your online presence never will",
            ],
        },
    ], [minPPF, maxPPF])

    const selectClass = "w-full text-base font-bold lowercase italic bg-white/60 border border-[#FE7F2D]/20 rounded-xl px-4 py-3 text-[#010307] focus:outline-none focus:ring-1 focus:ring-[#FE7F2D]/40"

    return (
        <TabsContent value={value} className="space-y-12 py-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="max-w-4xl mx-auto space-y-10">

                {/* ── heading ── */}
                <div className="text-center space-y-4">
                    <h2 className="text-6xl font-black tracking-tighter lowercase italic text-[#010307]">
                        why <span className="italic opacity-30">thc club</span>
                    </h2>
                    <p className="text-base text-[#010307]/50 italic max-w-xl mx-auto">
                        the gap between creating and being seen is where most brands die. we built this to close it.
                    </p>
                </div>

                {/* ── problem / solution cards ── */}


                {/* ── three-way calculator ── */}
                <div className="space-y-6">
                    <p className="text-xs font-bold text-[#010307]/30 uppercase tracking-widest text-center">run your own numbers</p>

                    <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-[2.5rem] bg-white/50 backdrop-blur-sm p-8 sm:p-12 space-y-10">
                        {/* tier/level selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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

                        {/* sliders */}
                        {[
                            {
                                label: "monthly sales",
                                value: fmt(sales),
                                min: 1000, max: 200000, step: 1000,
                                current: sales, setter: setSales,
                                minLabel: "Rs. 1,000", maxLabel: "Rs. 2,00,000",
                                highlight: false,
                            },
                            {
                                label: "own storefront rent",
                                value: `${fmt(storefront)}/mo`,
                                min: 25000, max: 100000, step: 5000,
                                current: storefront, setter: setStorefront,
                                minLabel: "Rs. 25,000", maxLabel: "Rs. 1,00,000",
                                highlight: false,
                            },
                            {
                                label: "retail commission rate",
                                value: `${commRate}%`,
                                min: 20, max: 35, step: 1,
                                current: commRate, setter: setCommRate,
                                minLabel: "20%", maxLabel: "35%",
                                highlight: true,
                            },
                        ].map((slider, i) => (
                            <div key={i} className="space-y-4">
                                <div className="flex justify-between items-baseline">
                                    <p className="text-xs font-bold text-[#010307]/40 uppercase tracking-widest">{slider.label}</p>
                                    <p className={`text-lg font-black italic ${slider.highlight ? "text-[#FE7F2D]" : "text-[#010307]"}`}>{slider.value}</p>
                                </div>
                                <Slider
                                    min={slider.min} max={slider.max} step={slider.step}
                                    value={[slider.current]}
                                    onValueChange={([v]) => slider.setter(v)}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-[11px] text-[#010307]/30 font-bold uppercase tracking-widest">
                                    <span>{slider.minLabel}</span><span>{slider.maxLabel}</span>
                                </div>
                            </div>
                        ))}
                    </Card>

                    {/* comparison matrix */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 01 thc club */}
                        <Card className="border-2 border-[#FE7F2D]/40 shadow-sm rounded-[2.5rem] bg-white/50 backdrop-blur-sm overflow-hidden">
                            <div className="px-6 py-5 border-b border-[#FE7F2D]/10 bg-[#FE7F2D]/[0.04]">
                                <p className="text-[10px] font-bold text-[#FE7F2D] uppercase tracking-widest mb-0.5">01</p>
                                <h4 className="text-lg font-black tracking-tighter lowercase italic text-[#010307]">thc club</h4>
                            </div>
                            <div className="px-6 py-5 space-y-3">
                                {[
                                    { label: "shelf rental / mo", val: fmt(monthlyRent), accent: false },
                                    { label: `PPF (${ppfLabel})`, val: fmt(ppfAmt), accent: false },
                                    { label: "rent credit", val: credit > 0 ? `− ${fmt(credit)}` : "Rs. 0", accent: credit > 0 },
                                    { label: "reg. onboarding", val: `Rs. ${regFeePerMo}`, accent: false },
                                ].map((row, i) => (
                                    <div key={i} className="flex justify-between items-baseline border-b border-[#FE7F2D]/10 pb-4 last:border-0 last:pb-0 gap-2">
                                        <span className="text-[13px] text-[#010307]/50 italic whitespace-nowrap">{row.label}</span>
                                        <span className={`text-base font-black italic whitespace-nowrap ${row.accent ? "text-[#FE7F2D]" : "text-[#010307]"}`}>{row.val}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between items-baseline pt-2 border-t border-[#FE7F2D]/20">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-[#010307] uppercase tracking-widest">monthly cost</span>
                                        <span className="text-[8px] text-[#FE7F2D] font-black uppercase tracking-tighter italic">capped cost + credit back</span>
                                    </div>
                                    <span className="text-2xl font-black italic text-[#FE7F2D] whitespace-nowrap">{fmt(thcMonthly)}</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] text-[#010307]/30 uppercase tracking-widest">annual total</span>
                                    <span className="text-sm font-bold text-[#010307]/50 italic whitespace-nowrap">{fmt(thcAnnual)}</span>
                                </div>
                            </div>
                        </Card>

                        {/* 02 own storefront */}
                        <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-[2.5rem] bg-white/50 backdrop-blur-sm overflow-hidden">
                            <div className="px-5 py-5 border-b border-[#FE7F2D]/10">
                                <p className="text-[10px] font-bold text-[#010307]/30 uppercase tracking-widest mb-0.5">02</p>
                                <h4 className="text-lg font-black tracking-tighter lowercase italic text-[#010307]">own storefront</h4>
                            </div>
                            <div className="px-5 py-5 space-y-3">
                                {[
                                    { label: "rent", val: fmt(storefront) },
                                    { label: "utilities (10%)", val: fmt(ownUtilities) },
                                    { label: "staffing", val: fmt(staffCosts) },
                                    { label: "running (wifi/maint)", val: fmt(runningCosts) },
                                ].map((row, i) => (
                                    <div key={i} className="flex justify-between items-baseline border-b border-[#FE7F2D]/10 pb-4 last:border-0 last:pb-0 gap-2">
                                        <span className="text-[13px] text-[#010307]/50 italic whitespace-nowrap">{row.label}</span>
                                        <span className="text-base font-black italic whitespace-nowrap text-[#010307]">{row.val}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between items-baseline pt-2 border-t border-[#FE7F2D]/20">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-[#010307] uppercase tracking-widest">monthly cost</span>
                                        <span className="text-[8px] text-[#010307]/30 font-black uppercase tracking-tighter italic">+ Rs. X for interiors & stock</span>
                                    </div>
                                    <span className="text-2xl font-black italic text-[#010307]">{fmt(ownMonthly)}</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] text-[#010307]/30 uppercase tracking-widest">annual total</span>
                                    <span className="text-sm font-bold text-[#010307]/50 italic">{fmt(ownAnnual)}</span>
                                </div>
                            </div>
                        </Card>

                        {/* 03 retail commission */}
                        <Card className="border border-[#FE7F2D]/10 shadow-sm rounded-[2.5rem] bg-white/50 backdrop-blur-sm overflow-hidden">
                            <div className="px-5 py-5 border-b border-[#FE7F2D]/10">
                                <p className="text-[10px] font-bold text-[#010307]/30 uppercase tracking-widest mb-0.5">03</p>
                                <h4 className="text-lg font-black tracking-tighter lowercase italic text-[#010307]">retail commission</h4>
                            </div>
                            <div className="px-5 py-5 space-y-3">
                                {[
                                    { label: "shelf rent", val: "Rs. 0" },
                                    { label: "utilities", val: "Rs. 0" },
                                    { label: "staff", val: "Rs. 0" },
                                    { label: "commission", val: fmt(commMonthly) },
                                ].map((row, i) => (
                                    <div key={i} className="flex justify-between items-baseline border-b border-[#FE7F2D]/10 pb-4 last:border-0 last:pb-0 gap-2">
                                        <span className="text-[13px] text-[#010307]/50 italic whitespace-nowrap">{row.label}</span>
                                        <span className="text-base font-black italic whitespace-nowrap text-[#010307]">{row.val}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between items-baseline pt-2 border-t border-[#FE7F2D]/20">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-[#010307] uppercase tracking-widest">monthly cost</span>
                                        <span className="text-[8px] text-[#010307]/30 font-black uppercase tracking-tighter italic">fixed 25-35% tax on sales</span>
                                    </div>
                                    <span className="text-2xl font-black italic text-[#010307]">{fmt(commMonthly)}</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[11px] text-[#010307]/30 uppercase tracking-widest">annual total</span>
                                    <span className="text-sm font-bold text-[#010307]/50 italic">{fmt(commAnnual)}</span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* savings summary */}
                    <div className="space-y-3">
                        <Card className="border border-[#FE7F2D]/10 rounded-2xl bg-white/50 px-6 py-4 flex justify-between items-center gap-4">
                            <span className="text-xs text-[#010307]/50 italic">thc club vs. retail commission — total annual savings</span>
                            <span className={`text-lg font-black italic whitespace-nowrap ${saveVsComm > 0 ? "text-[#FE7F2D]" : "text-[#010307]/30"}`}>
                                {saveVsComm > 0 ? `${fmt(saveVsComm)} / yr` : "comm. cheaper here"}
                            </span>
                        </Card>
                        <Card className="border border-[#FE7F2D]/10 rounded-2xl bg-white/50 px-6 py-4 flex justify-between items-center gap-4">
                            <span className="text-xs text-[#010307]/50 italic">thc club vs. own storefront — total annual savings</span>
                            <span className={`text-lg font-black italic whitespace-nowrap ${saveVsOwn > 0 ? "text-[#FE7F2D]" : "text-[#010307]/30"}`}>
                                {saveVsOwn > 0 ? `${fmt(saveVsOwn)} / yr` : "comparable at this volume"}
                            </span>
                        </Card>
                    </div>

                    <p className="text-[10px] text-[#010307]/30 italic leading-relaxed text-center px-4">
                        PPF resets monthly — a slow month drops back to {minPPF}%, never locked in. {creditDisclaimer} own storefront excludes fitout, insurance and setup costs. registration fee of Rs. {REGISTRATION_FEE} amortised across 12 months.
                    </p>
                </div>

                {/* ── research stats ── */}
                <div className="space-y-6">
                    <p className="text-[10px] font-bold text-[#010307]/30 uppercase tracking-widest text-center">what the research says</p>
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

                <div className="space-y-4">
                    {dynamicProblems.map((p, idx) => (
                        <Card key={idx} className="border border-[#FE7F2D]/10 shadow-sm rounded-[2.5rem] bg-white/50 backdrop-blur-sm overflow-hidden">
                            <div className="px-8 sm:px-12 py-10 border-b border-[#FE7F2D]/10">
                                <p className="text-xs font-bold text-[#FE7F2D] uppercase tracking-widest mb-1">{p.tag}</p>
                                <h3 className="text-4xl font-black tracking-tighter lowercase italic text-[#010307]">{p.title}</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#FE7F2D]/10">
                                <div className="px-8 sm:px-12 py-10 space-y-6">
                                    <p className="text-xs font-bold text-[#010307]/30 uppercase tracking-widest">traditional retail</p>
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

                {/* ── closing card ── */}
                <Card className="p-10 sm:p-14 border border-[#FE7F2D]/10 bg-white/50 rounded-[2.5rem] text-center space-y-4">
                    <p className="text-[10px] font-bold text-[#FE7F2D] uppercase tracking-widest">the bottom line</p>
                    <h3 className="text-3xl sm:text-4xl font-black tracking-tighter lowercase italic text-[#010307] leading-tight">
                        you built something worth showing.<br />
                        <span className="opacity-30">we built the room to show it in.</span>
                    </h3>
                    <p className="text-sm text-[#010307]/50 italic max-w-lg mx-auto">
                        thc club isn't just retail space. it's what happens when a founder gets tired of being turned away and decides to build the door they kept being shut out of.
                    </p>
                </Card>

            </div>
        </TabsContent>
    )
}