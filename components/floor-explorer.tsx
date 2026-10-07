"use client"

import Link from "next/link"
import { useState } from "react"
import { LEVEL_LABEL, STANDING_LEVELS, ZONES, type FloorData, type FloorShelf, type FloorSlot, type Level, type SlotLevel, type ZoneKey } from "@/lib/floor-data"

const micro = "font-bold uppercase"
const display = "font-black italic lowercase"
const glass = "bg-white/60 border border-[#010307]/[0.06] backdrop-blur-[4px]"
const twoCol = "grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-5"
const zoneKeys = Object.keys(ZONES) as ZoneKey[]

// "Shelf CS 1" -> "CS 1", "Wall Shelf 1 [Top Level]" -> "Wall Shelf 1"
const shelfLabel = (name: string) => name.replace(/\s*\[.*\]$/, "").replace(/^shelf\s+/i, "")
const slotRange = (shelf: FloorShelf) => {
  const ns = shelf.slots.flatMap((s) => (s.n === null ? [] : [s.n]))
  return ns.length ? `#${Math.min(...ns)}–${Math.max(...ns)}` : null
}
const slotTitle = (s: FloorSlot) => (s.n === null ? undefined : `#${s.n} · ${LEVEL_LABEL[s.level]} · ${s.open ? "open" : "taken"}`)

export function FloorExplorer({
  floor,
  defaultZone = "cafe",
  showAnatomy = true,
  showFuture = true,
  onClaim,
}: {
  floor: FloorData
  onClaim?: () => void
  defaultZone?: ZoneKey
  showAnatomy?: boolean
  showFuture?: boolean
}) {
  const [zoneKey, setZoneKey] = useState<ZoneKey>(defaultZone)
  const [level, setLevel] = useState<Level>("all")
  const zone = ZONES[zoneKey]
  const on = (k: SlotLevel) => level === "all" || level === k
  const cell = (s: FloorSlot) =>
    on(s.level) ? (s.open ? "bg-[#FE7F2D]" : "bg-[#010307]") : s.open ? "bg-[#010307]/[0.08]" : "bg-[#010307]/25"
  const anatomyCell = (k: SlotLevel) => (on(k) ? "bg-[#FE7F2D]" : "bg-[#010307]/[0.08]")

  const slotsOf = (k: ZoneKey) => floor.zones[k].flatMap((s) => s.slots)
  const allSlots = zoneKeys.flatMap(slotsOf)
  const total = allSlots.length
  const premium = zoneKeys.filter((k) => ZONES[k].section === "Premium").reduce((n, k) => n + slotsOf(k).length, 0)
  const shelvesOf = (k: ZoneKey) => floor.zones[k].length
  const standingShelves = zoneKeys.filter((k) => ZONES[k].type === "A").reduce((n, k) => n + shelvesOf(k), 0)
  const zoneSlots = slotsOf(zoneKey)
  const atLevel = (k: Level) => zoneSlots.filter((s) => k === "all" || s.level === k)
  const openCount = (slots: FloorSlot[]) => slots.filter((s) => s.open).length

  const zoneButton = (k: ZoneKey, className: string, children: React.ReactNode) => {
    const sel = k === zoneKey
    return (
      <button
        key={k}
        type="button"
        aria-pressed={sel}
        onClick={() => setZoneKey(k)}
        className={`text-left border-2 transition-[transform,background-color] duration-200 hover:-translate-y-0.5 ${sel ? "bg-[#FE7F2D] text-[#010307] border-[#FE7F2D]" : "bg-[#FFFCEB]/[0.04] text-[#FFFCEB] border-[#FFFCEB]/[0.14]"} ${className}`}
      >
        {children}
      </button>
    )
  }
  const pill = (k: ZoneKey) =>
    k === zoneKey ? "bg-[#010307] text-[#FFFCEB]" : "bg-[#FE7F2D] text-[#010307]"
  const slotCount = (n: number, size: string) => (
    <div className={`${size} ${display} tracking-[-0.04em] leading-none`}>
      {n}
      <span className="text-[13px] font-bold tracking-[0.1em] ml-1">slots</span>
    </div>
  )
  const zoneName = `text-[clamp(20px,2.4vw,28px)] ${display} tracking-[-0.03em]`
  const zoneMeta = "text-[13px] font-medium italic opacity-80"

  const ctaClass = `flex items-center gap-2.5 bg-[#010307] text-[#FFFCEB] px-[30px] py-[18px] rounded-[28px] text-[17px] ${display} transition-all duration-200 hover:bg-[#FFFCEB] hover:text-[#010307] active:scale-95`

  return (
    <section className="bg-[#FFFCEB] text-[#010307] px-[clamp(18px,5vw,72px)] py-[clamp(28px,6vw,96px)]">
      <div className="max-w-[1240px] mx-auto flex flex-col gap-[clamp(32px,5vw,56px)]">
        {/* Header */}
        <header className="flex flex-col gap-[18px] max-w-[820px]">
          <div className={`text-xs ${micro} tracking-[0.28em] text-[#FE7F2D]`}>The floor · inside Sayummys Café, Kathmandu</div>
          <h2 className={`m-0 text-[clamp(40px,6.4vw,92px)] leading-[0.92] ${display} tracking-[-0.04em] [text-wrap:balance]`}>
            {total} shelf slots. four zones. find yours.
          </h2>
          <p className="m-0 text-[clamp(17px,1.6vw,21px)] leading-[1.45] font-medium italic text-[#010307]/70 [text-wrap:pretty]">
            tap a zone to see its shelves. tap a level to see where every top, eye and bottom slot sits.
          </p>
        </header>

        {/* Stat row */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5">
          {[
            { n: total, label: floor.live ? `Total slots · ${openCount(allSlots)} open` : "Total slots", tile: "bg-[#010307] text-[#FFFCEB]", labelTone: "text-[#FFFCEB]/70" },
            { n: premium, label: "Premium · café", tile: "bg-[#FE7F2D] shadow-[0_18px_40px_-18px_rgba(254,127,45,0.6)]", labelTone: "" },
            { n: total - premium, label: "Regular · rooms + wall", tile: glass, labelTone: "text-[#010307]/60" },
            { n: zoneKeys.reduce((n, k) => n + shelvesOf(k), 0), label: "Shelves on the floor", tile: glass, labelTone: "text-[#010307]/60" },
          ].map((s) => (
            <div key={s.label} className={`rounded-[28px] px-[26px] py-6 flex flex-col gap-1.5 ${s.tile}`}>
              <div className={`text-[52px] ${display} tracking-[-0.04em] leading-none`}>{s.n}</div>
              <div className={`text-[11px] ${micro} tracking-[0.24em] ${s.labelTone}`}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Explorer */}
        <div className={`${twoCol} items-stretch`}>
          {/* Floor plan */}
          <div className="bg-[#010307] text-[#FFFCEB] rounded-[44px] p-[clamp(22px,3vw,36px)] flex flex-col gap-[18px] relative overflow-hidden">
            <div className="absolute w-80 h-80 -right-[120px] -top-[120px] rounded-full bg-[#FE7F2D] opacity-[0.22] blur-[120px] pointer-events-none" />
            <div className="flex justify-between items-baseline gap-3 flex-wrap relative">
              <div className={`text-[11px] ${micro} tracking-[0.26em] text-[#FFFCEB]/70`}>Floor plan</div>
              <div className={`text-[11px] ${micro} tracking-[0.2em] text-[#FFFCEB]/45`}>Schematic · not to scale</div>
            </div>
            <div className="grid grid-cols-2 gap-3 relative">
              {zoneButton(
                "cafe",
                "col-span-2 aspect-[10/4] min-h-[120px] rounded-[26px] px-5 py-[18px] flex flex-col justify-between",
                <>
                  <div className="flex w-full justify-between items-start gap-2.5">
                    <div className={zoneName}>café strip</div>
                    <div className={`text-[10px] ${micro} tracking-[0.22em] px-2.5 py-1.5 rounded-[20px] ${pill("cafe")}`}>Premium</div>
                  </div>
                  <div className="flex w-full justify-between items-end gap-2.5">
                    <div className={zoneMeta}>10 ft × 4 ft · {shelvesOf("cafe")} shelves</div>
                    {slotCount(slotsOf("cafe").length, "text-[32px]")}
                  </div>
                </>,
              )}
              {zoneButton(
                "corridor",
                "col-span-2 min-h-[76px] rounded-[22px] px-5 py-3.5 flex items-center justify-between gap-3.5 flex-wrap",
                <>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
                    <div className={`text-[clamp(17px,2vw,22px)] ${display} tracking-[-0.03em]`}>corridor wall</div>
                    <div className="flex gap-[5px]">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="flex-1 h-1.5 rounded-[3px] bg-current opacity-[0.55]" />
                      ))}
                    </div>
                  </div>
                  <div className={zoneMeta}>{shelvesOf("corridor")} wall shelves</div>
                  {slotCount(slotsOf("corridor").length, "text-[28px]")}
                </>,
              )}
              {(["room1", "room2"] as const).map((k) =>
                zoneButton(
                  k,
                  "aspect-square rounded-[26px] px-5 py-[18px] flex flex-col justify-between",
                  <>
                    <div className={zoneName}>{ZONES[k].name}</div>
                    <div className="flex flex-col gap-1">
                      {slotCount(slotsOf(k).length, "text-[36px]")}
                      <div className={zoneMeta}>10 × 10 ft · {shelvesOf(k)} shelves</div>
                    </div>
                  </>,
                ),
              )}
            </div>
            <p className="m-0 text-[13px] leading-normal font-medium italic text-[#FFFCEB]/55 relative">
              the corridor links the café and both rooms. exact shelf positions, doors and corridor length are still being confirmed — this plan shows zones, not a measured layout.
            </p>
          </div>

          {/* Zone detail */}
          <div className={`${glass} shadow-[0_1px_2px_rgba(1,3,7,0.04)] rounded-[44px] p-[clamp(22px,3vw,36px)] flex flex-col gap-[22px]`}>
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-2.5 items-center flex-wrap">
                <div className={`text-[10px] ${micro} tracking-[0.24em] px-3 py-1.5 rounded-[20px] ${zone.section === "Premium" ? "bg-[#FE7F2D] text-[#010307]" : "bg-[#010307] text-[#FFFCEB]"}`}>
                  {zone.section}
                </div>
                <div className={`text-[11px] ${micro} tracking-[0.22em] text-[#010307]/50`}>{shelvesOf(zoneKey)} {zone.type === "A" ? "standing" : "wall"} shelves</div>
              </div>
              <div className={`text-[clamp(34px,4.4vw,56px)] ${display} tracking-[-0.04em] leading-[0.95]`}>{zone.name}</div>
              <div className="text-base font-medium italic text-[#010307]/65">{zone.size} · {zone.area}</div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {([["all", "all levels"], ...STANDING_LEVELS.map((l) => [l.key, l.label])] as [Level, string][]).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={level === k}
                  onClick={() => setLevel(k)}
                  className={`px-[18px] py-2.5 rounded-[20px] text-sm font-bold italic lowercase border transition-all duration-150 active:scale-95 ${level === k ? "bg-[#010307] text-[#FFFCEB] border-[#010307]" : "bg-transparent border-[#010307]/15"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {([["top", "top"], ["eye", "eye"], ["bottom", "bottom"], ["all", "total"]] as [Level, string][]).map(([k, label]) => (
                <div key={k} className={`rounded-[20px] px-3.5 pt-3.5 pb-3 flex flex-col gap-1 transition-all duration-150 ${level === k ? "bg-[#FE7F2D]" : "bg-[#010307]/[0.04]"}`}>
                  <div className={`text-[30px] ${display} tracking-[-0.04em] leading-none`}>{atLevel(k).length}</div>
                  <div className={`text-[10px] ${micro} tracking-[0.2em] opacity-75`}>{label}</div>
                  {floor.live && <div className="text-[11px] font-medium italic opacity-75">{openCount(atLevel(k))} open</div>}
                </div>
              ))}
            </div>

            {floor.live && (
              <div className={`flex gap-4 text-[10px] ${micro} tracking-[0.2em] text-[#010307]/60`}>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px] bg-[#FE7F2D]" />open</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px] bg-[#010307]" />taken</span>
              </div>
            )}

            {zone.type === "A" ? (
              <div className="flex flex-col gap-3">
                <div className={`text-[11px] ${micro} tracking-[0.24em] text-[#010307]/50`}>Standing shelves in this zone</div>
                <div className="flex flex-wrap gap-3">
                  {floor.zones[zoneKey].map((shelf) => (
                    <div key={shelf.name} className="flex flex-col gap-1.5 items-center">
                      <div className="w-[52px] h-[140px] border-2 border-[#010307] rounded-xl p-[5px] flex flex-col gap-[5px] bg-[#FFFCEB]">
                        {STANDING_LEVELS.map((l) => {
                          const slots = shelf.slots.filter((s) => s.level === l.key)
                          return slots.length ? (
                            <div key={l.key} className="flex flex-col gap-1" style={{ flex: slots.length }}>
                              {slots.map((s, j) => (
                                <div key={s.n ?? j} title={slotTitle(s)} className={`flex-1 rounded-[5px] transition-colors duration-150 ${cell(s)}`} />
                              ))}
                            </div>
                          ) : null
                        })}
                      </div>
                      <div className={`text-[10px] ${micro} tracking-[0.18em] text-[#010307]/50`}>{shelfLabel(shelf.name)}</div>
                      {slotRange(shelf) && <div className="text-[10px] font-bold text-[#010307]/40 -mt-1">{slotRange(shelf)}</div>}
                    </div>
                  ))}
                </div>
                <p className="m-0 text-[13px] leading-normal font-medium italic text-[#010307]/55">
                  {floor.live
                    ? "slot numbers sit under each shelf, top to bottom. hover a slot to see its number."
                    : "standing slots are numbered #1–90. which numbers sit in which zone is being confirmed."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className={`text-[11px] ${micro} tracking-[0.24em] text-[#010307]/50`}>Wall shelves · 12 ft each</div>
                {floor.zones.corridor.map((w) => (
                  <div key={w.name} className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 items-center">
                    <div className="flex flex-col gap-0.5">
                      <div className={`text-[15px] ${display}`}>{shelfLabel(w.name)}</div>
                      <div className={`text-[10px] ${micro} tracking-[0.2em] text-[#010307]/50`}>{LEVEL_LABEL[w.slots[0].level]}</div>
                    </div>
                    <div className="grid grid-cols-4 gap-1 p-[5px] border-2 border-[#010307] rounded-xl bg-[#FFFCEB]">
                      {w.slots.map((s, j) => (
                        <div
                          key={s.n ?? j}
                          title={slotTitle(s)}
                          className={`rounded-md px-1 py-[9px] text-center text-[13px] font-bold transition-all duration-150 ${!on(s.level) ? "bg-[#010307]/[0.06] text-[#010307]/40" : s.open ? "bg-[#FE7F2D]" : "bg-[#010307] text-[#FFFCEB]"}`}
                        >
                          #{s.n}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="m-0 text-[13px] leading-normal font-medium italic text-[#010307]/55">
                  shallow (~8–10 in deep). suits flat, light product — prints, stationery, soap, small packs.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Shelf anatomy */}
        {showAnatomy && (
          <div className="flex flex-col gap-[22px]">
            <div className="flex flex-col gap-2.5">
              <div className={`text-xs ${micro} tracking-[0.28em] text-[#FE7F2D]`}>Shelf anatomy</div>
              <h3 className={`m-0 text-[clamp(32px,4.4vw,60px)] leading-[0.95] ${display} tracking-[-0.04em]`}>two kinds of shelf.</h3>
            </div>
            <div className={twoCol}>
              {/* Standing shelf */}
              <div className={`${glass} rounded-[44px] p-[clamp(22px,3vw,36px)] flex flex-col gap-[22px]`}>
                <div className="flex justify-between items-baseline gap-3 flex-wrap">
                  <div className={`text-[clamp(24px,2.6vw,32px)] ${display} tracking-[-0.03em]`}>standing shelf</div>
                  <div className={`text-[11px] ${micro} tracking-[0.22em] text-[#010307]/50`}>Type A · {standingShelves} on the floor</div>
                </div>
                <div className="flex gap-6 items-center flex-wrap">
                  <div className="flex gap-2.5 items-stretch">
                    <div className={`[writing-mode:vertical-rl] rotate-180 text-xs ${micro} tracking-[0.16em] text-[#010307]/55 flex items-center justify-center border-l-2 border-[#010307]/20 pl-1.5`}>
                      5.5–6 ft high
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className={`text-xs ${micro} tracking-[0.16em] text-[#010307]/55 text-center border-b-2 border-[#010307]/20 pb-1`}>3 ft wide</div>
                      <div className="w-[150px] h-[340px] border-[3px] border-[#010307] rounded-2xl p-2 flex flex-col gap-1.5 bg-[#FFFCEB]">
                        {STANDING_LEVELS.map((l) => (
                          <button
                            key={l.key}
                            type="button"
                            aria-label={l.label}
                            aria-pressed={level === l.key}
                            onClick={() => setLevel(level === l.key ? "all" : l.key)}
                            className="flex flex-col gap-1.5"
                            style={{ flex: l.slots }}
                          >
                            {Array.from({ length: l.slots }, (_, j) => (
                              <div key={j} className={`w-full flex-1 rounded-lg transition-colors duration-150 ${anatomyCell(l.key)}`} />
                            ))}
                          </button>
                        ))}
                      </div>
                      <div className={`text-xs ${micro} tracking-[0.16em] text-[#010307]/55 text-center`}>~1 ft deep</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
                    {STANDING_LEVELS.map((l) => (
                      <button
                        key={l.key}
                        type="button"
                        aria-pressed={level === l.key}
                        onClick={() => setLevel(level === l.key ? "all" : l.key)}
                        className={`flex justify-between items-center gap-2.5 px-[18px] py-3.5 rounded-[20px] transition-all duration-150 hover:-translate-y-0.5 ${level === l.key ? "bg-[#FE7F2D]" : "bg-[#010307]/[0.04]"}`}
                      >
                        <span className={`text-lg ${display}`}>{l.label}</span>
                        <span className={`text-xs ${micro} tracking-[0.16em]`}>
                          {l.slots} {l.slots === 1 ? "slot" : "slots"} · 3 ft
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <p className="m-0 text-[13px] leading-normal font-medium italic text-[#010307]/55">
                  one column, 6 slots stacked — every slot runs the full 3 ft width. drawing not to scale — gaps between levels are being confirmed.
                </p>
              </div>

              {/* Wall shelf */}
              <div className="bg-[#010307] text-[#FFFCEB] rounded-[44px] p-[clamp(22px,3vw,36px)] flex flex-col gap-[22px]">
                <div className="flex justify-between items-baseline gap-3 flex-wrap">
                  <div className={`text-[clamp(24px,2.6vw,32px)] ${display} tracking-[-0.03em]`}>wall shelf</div>
                  <div className={`text-[11px] ${micro} tracking-[0.22em] text-[#FFFCEB]/55`}>Type B · {shelvesOf("corridor")} on the corridor</div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className={`text-xs ${micro} tracking-[0.16em] text-[#FFFCEB]/60 text-center border-b-2 border-[#FFFCEB]/20 pb-1`}>12 ft long</div>
                  <div className="grid grid-cols-4 gap-1.5 p-2 border-[3px] border-[#FFFCEB] rounded-2xl">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-16 rounded-lg bg-[#FE7F2D] text-[#010307] flex items-center justify-center text-[13px] font-bold">~3 ft</div>
                    ))}
                  </div>
                  <div className={`text-xs ${micro} tracking-[0.16em] text-[#FFFCEB]/60 text-center`}>~8–10 in deep · wall-mounted</div>
                </div>
                <div className="flex flex-col rounded-[20px] overflow-hidden border border-[#FFFCEB]/10">
                  <div className={`grid grid-cols-3 gap-2.5 px-[18px] py-3 text-[10px] ${micro} tracking-[0.22em] text-[#FFFCEB]/50 bg-[#FFFCEB]/[0.04]`}>
                    <span>Shelf</span><span>Level</span><span>Slots</span>
                  </div>
                  {floor.zones.corridor.map((w) => (
                    <div key={w.name} className="grid grid-cols-3 gap-2.5 px-[18px] py-3 text-[15px] font-bold italic lowercase border-t border-[#FFFCEB]/[0.08]">
                      <span>{shelfLabel(w.name)}</span>
                      <span>{LEVEL_LABEL[w.slots[0].level]}</span>
                      <span className="text-[#FE7F2D]">{slotRange(w)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        {/* logged-in brands book in-app; visitors go to signup */}
        <div className="flex flex-wrap gap-5 items-center justify-between bg-[#FE7F2D] rounded-[44px] px-[clamp(24px,4vw,48px)] py-[clamp(24px,3.4vw,40px)] shadow-[0_24px_60px_-24px_rgba(254,127,45,0.55)]">
          <div className="flex flex-col gap-1.5 max-w-[640px]">
            {showFuture && (
              <div className={`text-[11px] ${micro} tracking-[0.26em]`}>+12 slots coming · 2 more shelves waiting to go on the floor → 114</div>
            )}
            <div className={`text-[clamp(28px,3.6vw,46px)] ${display} tracking-[-0.04em] leading-[0.95]`}>seen your spot? claim it.</div>
          </div>
          {onClaim ? (
            <button type="button" onClick={onClaim} className={ctaClass}>
              book a shelf slot →
            </button>
          ) : (
            <Link href="/?auth=signup" className={ctaClass}>
              apply for a shelf →
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
