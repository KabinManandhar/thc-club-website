"use client"

import { Button } from "@/components/ui/button"
import { supabase, StoreImage } from "@/lib/supabase"
import { ArrowLeft, Expand, Grid, LayoutGrid, Maximize2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function GalleryPage() {
  const [images, setImages] = useState<StoreImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<StoreImage | null>(null)

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
            {images.map((img) => (
              <div 
                key={img.id} 
                className="break-inside-avoid group relative rounded-[2rem] overflow-hidden border border-[#FE7F2D]/5 shadow-xl hover:shadow-[#FE7F2D]/10 transition-all cursor-pointer"
                onClick={() => setSelectedImage(img)}
              >
                <img 
                  src={`${img.url}?width=600&quality=70`} 
                  alt={img.section} 
                  className="w-full h-auto object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-8 flex flex-col justify-end">
                  <p className="text-white font-black italic lowercase text-2xl leading-tight">{img.section}</p>
                  <div className="absolute top-6 right-6">
                    <Maximize2 className="w-6 h-6 text-white/50" />
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

        {/* Lightbox */}
        {selectedImage && (
          <div 
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 md:p-12 animate-in fade-in duration-300"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-6xl w-full max-h-[85vh] flex flex-col items-center">
              <img 
                src={`${selectedImage.url}?width=1600&quality=85`} 
                alt={selectedImage.section}
                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              />
              <div className="mt-8 text-center space-y-2">
                <h3 className="text-3xl font-black italic text-[#FE7F2D] lowercase">{selectedImage.section}</h3>
              </div>
              <Button 
                variant="ghost" 
                className="absolute -top-12 right-0 text-white hover:text-[#FE7F2D] font-black uppercase text-xs tracking-widest"
                onClick={() => setSelectedImage(null)}
              >
                Close (Esc)
              </Button>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-40 border-t border-[#FE7F2D]/10 py-12 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#010307]/20">the hidden collective club • visual archive</p>
      </footer>
    </div>
  )
}
