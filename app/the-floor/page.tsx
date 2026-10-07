import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { FloorExplorer } from "@/components/floor-explorer"
import { buildFloor, STATIC_FLOOR } from "@/lib/floor-data"
import { supabase } from "@/lib/supabase"

// refresh shelf slot availability at most once a minute
export const revalidate = 60

export const metadata: Metadata = {
  title: "the floor — thc club",
  description: "Explore the THC Club floor inside Sayummys Café, Kathmandu: 4 zones, 18 shelves and 102 shelf slots.",
}

export default async function TheFloorPage() {
  const { data, error } = await supabase
    .from("shelf_slots")
    .select("slot_number, shelf_type, status, shelf_id, shelves(name), shelf_sections(name)")
  if (error) console.error("the-floor: shelf_slots fetch failed", error)
  const floor = data ? buildFloor(data as any) : STATIC_FLOOR

  return (
    <main className="min-h-screen bg-[#FFFCEB] font-space-grotesk">
      <div className="px-[clamp(18px,5vw,72px)] pt-8">
        <div className="max-w-[1240px] mx-auto">
          <Link href="/" className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-[#FE7F2D] hover:text-black transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> back to home
          </Link>
        </div>
      </div>
      <FloorExplorer floor={floor} />
    </main>
  )
}
