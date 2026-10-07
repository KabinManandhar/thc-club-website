// Static floor facts for /the-floor. Slot→zone mapping for #1–90 is not confirmed yet; UI says so.
export const ZONES = {
  cafe:     { name: "café strip",    section: "Premium", size: "10 ft × 4 ft",  area: "40 sq ft floor", type: "A", shelves: 3 },
  room1:    { name: "room 1",        section: "Regular", size: "10 ft × 10 ft", area: "100 sq ft floor", type: "A", shelves: 6 },
  room2:    { name: "room 2",        section: "Regular", size: "10 ft × 10 ft", area: "100 sq ft floor", type: "A", shelves: 6 },
  corridor: { name: "corridor wall", section: "Regular", size: "wall run",      area: "wall only, no floor space", type: "B", shelves: 3 },
} as const

export type ZoneKey = keyof typeof ZONES
export type SlotLevel = "top" | "eye" | "bottom"
export type Level = "all" | SlotLevel

// Standing shelf (type A): one 3 ft column, 6 slots stacked, each full width
export const STANDING_LEVELS: { key: SlotLevel; label: string; slots: number }[] = [
  { key: "top", label: "top", slots: 1 },
  { key: "eye", label: "eye level", slots: 2 },
  { key: "bottom", label: "bottom", slots: 3 },
]

// Wall shelf (type B): 12 ft long, 4 slots of ~3 ft side by side
export const WALLS: { name: string; level: string; key: SlotLevel; slots: number[] }[] = [
  { name: "wall 1", level: "top", key: "top", slots: [91, 92, 93, 94] },
  { name: "wall 2", level: "eye level", key: "eye", slots: [95, 96, 97, 98] },
  { name: "wall 3", level: "eye level", key: "eye", slots: [99, 100, 101, 102] },
]

// ---- Live floor (shelf_slots), falls back to the static facts above ----

export const LEVEL_LABEL: Record<SlotLevel, string> = { top: "top", eye: "eye level", bottom: "bottom" }

export type FloorSlot = { n: number | null; level: SlotLevel; open: boolean }
export type FloorShelf = { name: string; slots: FloorSlot[] }
export type FloorData = { live: boolean; zones: Record<ZoneKey, FloorShelf[]> }

// shelf_sections.name for each zone
const SECTION_NAMES: Record<ZoneKey, string> = {
  cafe: "Cafe Section",
  room1: "Room One",
  room2: "Room Two",
  corridor: "Corridor Wall",
}

const DB_LEVEL: Record<string, SlotLevel> = { top_level: "top", eye_level: "eye", bottom: "bottom" }

const zoneKeys = Object.keys(ZONES) as ZoneKey[]

export const STATIC_FLOOR: FloorData = {
  live: false,
  zones: Object.fromEntries(
    zoneKeys.map((k) => [
      k,
      ZONES[k].type === "B"
        ? WALLS.map((w) => ({ name: w.name, slots: w.slots.map((n) => ({ n, level: w.key, open: true })) }))
        : Array.from({ length: ZONES[k].shelves }, (_, i) => ({
            name: `shelf ${i + 1}`,
            slots: STANDING_LEVELS.flatMap((l) => Array.from({ length: l.slots }, () => ({ n: null, level: l.key, open: true }))),
          })),
    ]),
  ) as Record<ZoneKey, FloorShelf[]>,
}

type SlotRow = { slot_number: number; shelf_type: string; status: string; shelf_id: string | null; shelves: { name: string } | null; shelf_sections: { name: string } | null }

export function buildFloor(rows: SlotRow[]): FloorData {
  const zones = Object.fromEntries(zoneKeys.map((k) => [k, [] as FloorShelf[]])) as Record<ZoneKey, FloorShelf[]>
  const byShelf = new Map<string, FloorShelf>()
  for (const r of rows) {
    const zone = zoneKeys.find((k) => SECTION_NAMES[k] === r.shelf_sections?.name)
    const level = DB_LEVEL[r.shelf_type]
    if (!zone || !level || !r.shelf_id) continue
    let shelf = byShelf.get(r.shelf_id)
    if (!shelf) {
      shelf = { name: r.shelves?.name ?? "shelf", slots: [] }
      byShelf.set(r.shelf_id, shelf)
      zones[zone].push(shelf)
    }
    shelf.slots.push({ n: r.slot_number, level, open: r.status === "available" })
  }
  // a zone missing from the DB keeps its static picture
  for (const k of zoneKeys) {
    if (!zones[k].length) return STATIC_FLOOR
    zones[k].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    zones[k].forEach((s) => s.slots.sort((a, b) => (a.n ?? 0) - (b.n ?? 0)))
  }
  return { live: true, zones }
}
