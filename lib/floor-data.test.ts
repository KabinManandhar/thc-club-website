// Run: node --test lib/floor-data.test.ts
import assert from "node:assert/strict"
import { test } from "node:test"
import { buildFloor, STATIC_FLOOR } from "./floor-data.ts"

const row = (n: number, type: string, shelf: string, section: string, status = "available") => ({
  slot_number: n, shelf_type: type, status, shelf_id: shelf, shelves: { name: shelf }, shelf_sections: { name: section },
})

const rows = [
  row(2, "eye_level", "R1-10", "Room One", "occupied"),
  row(1, "top_level", "R1-10", "Room One"),
  row(7, "top_level", "R1-9", "Room One"),
  row(3, "top_level", "CS 1", "Cafe Section"),
  row(4, "top_level", "R2-1", "Room Two"),
  row(5, "eye_level", "W1", "Corridor Wall", "maintenance"),
]
test("buildFloor maps live slots onto zones, falls back when a zone is missing", () => {
  const f = buildFloor(rows)
  assert.equal(f.live, true)
  assert.deepEqual(f.zones.room1.map((s) => s.name), ["R1-9", "R1-10"]) // numeric sort
  assert.deepEqual(f.zones.room1[1].slots, [{ n: 1, level: "top", open: true }, { n: 2, level: "eye", open: false }])
  assert.equal(f.zones.corridor[0].slots[0].open, false)
  assert.equal(buildFloor(rows.slice(0, 3)), STATIC_FLOOR) // missing zones fall back
  assert.equal(STATIC_FLOOR.zones.cafe.length, 3)
  assert.equal(STATIC_FLOOR.zones.corridor[0].slots[0].n, 91)
})
