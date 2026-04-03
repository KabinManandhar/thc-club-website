"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, ArrowRight, X } from "lucide-react"
import { SafeImage } from "./safe-image"
import { useCallback, useEffect, useState } from "react"

interface ImageLightboxProps {
  images: string[]
  isOpen: boolean
  onClose: () => void
  initialIndex?: number
}

export function ImageLightbox({ images, isOpen, onClose, initialIndex = 0 }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  useEffect(() => {
    if (isOpen) setCurrentIndex(initialIndex)
  }, [isOpen, initialIndex])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }, [images.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === "ArrowRight") handleNext()
      if (e.key === "ArrowLeft") handlePrev()
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, handleNext, handlePrev, onClose])

  if (!isOpen || images.length === 0) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-black/90 flex flex-col items-center justify-center rounded-[2.5rem] overflow-hidden group">
        <DialogTitle className="sr-only">Image Preview</DialogTitle>
        <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-10">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-6 right-6 z-50 rounded-full bg-white/10 hover:bg-white text-black h-12 w-12 transition-all opacity-0 group-hover:opacity-100"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>

          {images.length > 1 && (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute left-6 z-50 rounded-full bg-white/10 hover:bg-white text-black h-14 w-14 transition-all opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              >
                <ArrowLeft className="w-8 h-8" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-6 z-50 rounded-full bg-white/10 hover:bg-white text-black h-14 w-14 transition-all opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
              >
                <ArrowRight className="w-8 h-8" />
              </Button>
            </>
          )}

          <div className="w-full h-full relative flex items-center justify-center">
            <SafeImage 
              src={images[currentIndex]} 
              alt={`Preview ${currentIndex + 1}`} 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
              key={images[currentIndex]} // Key to force re-animation
            />
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/5 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
            <p className="text-[10px] font-black uppercase text-white/50 tracking-widest">
              image {currentIndex + 1} <span className="opacity-30">of</span> {images.length}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
