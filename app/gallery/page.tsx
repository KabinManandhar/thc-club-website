"use client"

import { Button } from "@/components/ui/button"
import { supabase, StoreImage } from "@/lib/supabase"
import { ImageLightbox } from "@/components/ui/lightbox"
import { ArrowLeft, Expand, Grid, LayoutGrid, Maximize2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function GalleryPage() {
  const [images, setImages] = useState<StoreImage[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState({ isOpen: false, index: 0 })

  useEffect(() => {
    fetchImages()
  }, [])

  const fetchImages = async () => {
    try {
      const { data } = await supabase
        .from("store_images")
        .select("*")
        .order("created_at", { ascending: false })
      if (data) setImages(data)
    } catch (err) {
      console.error("Error fetching images:", err)
    } finally {
      setLoading(false)
    }
  }

  const imageUrls = images.map(img => img.url)

  return (
    <div className="min-h-screen bg-[#FFFCEB] text-[#010307] font-space-grotesk p-6 md:p-12 lg:p-20">
      <div className="max-w-7xl mx-auto space-y-12 sm:space-y-20">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-[#FE7F2D] hover:text-black transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" /> back to home
            </Link>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black lowercase italic tracking-tighter leading-none">
              the store <span className="text-[#FE7F2D]">collage</span>.
            </h1>
            <p className="text-lg sm:text-2xl text-[#010307]/40 font-medium italic lowercase max-w-2xl">
              a visual exploration of the hidden collective space. every corner, every shelf, every story.
            </p>
          </div>
          <div className="hidden md:block">
             <div className="w-24 h-24 bg-black text-white rounded-[2rem] flex items-center justify-center rotate-12 shadow-2xl">
                <LayoutGrid className="w-10 h-10" />
             </div>
          </div>
        </div>

        {/* Collage Grid */}
        {loading ? (
          <div className="py-40 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D] mx-auto"></div>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {images.map((img, idx) => (
              <div 
                key={img.id} 
                className="break-inside-avoid group relative rounded-[2.5rem] overflow-hidden border border-[#FE7F2D]/5 shadow-xl hover:shadow-[#FE7F2D]/20 transition-all cursor-pointer bg-white"
                onClick={() => setLightbox({ isOpen: true, index: idx })}
              >
                <div className="relative w-full overflow-hidden">
                  <img 
                    src={img.url} 
                    alt={img.section} 
                    className="w-full h-auto object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 p-8 flex flex-col justify-end">
                    <p className="text-white font-black italic lowercase text-2xl leading-tight translate-y-4 group-hover:translate-y-0 transition-transform duration-500">{img.section}</p>
                    <div className="absolute top-6 right-6 p-3 bg-white/10 backdrop-blur-md rounded-xl text-white opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                      <Maximize2 className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {images.length === 0 && !loading && (
          <div className="py-40 text-center bg-white/30 rounded-[3rem] border border-dashed border-[#FE7F2D]/10">
            <p className="text-2xl text-[#010307]/20 font-black italic lowercase">no images in the collection yet...</p>
          </div>
        )}

        <ImageLightbox 
          images={imageUrls}
          isOpen={lightbox.isOpen}
          initialIndex={lightbox.index}
          onClose={() => setLightbox({ ...lightbox, isOpen: false })}
        />
      </div>

      <footer className="mt-40 border-t border-[#FE7F2D]/10 py-12 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#010307]/20">the hidden collective club • visual archive</p>
      </footer>
    </div>
  )
}
