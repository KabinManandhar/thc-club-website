"use client"

import { useState, useEffect } from "react"
import Image, { ImageProps } from "next/image"

interface SafeImageProps extends Omit<ImageProps, "src"> {
  src: string | null | undefined
  fallback?: React.ReactNode
}

export function SafeImage({ src, alt, fallback, className, ...props }: SafeImageProps) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(src || null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!src) {
      setDisplaySrc(null)
      return
    }

    if (typeof window === "undefined") return;

    const lowerSrc = src.toLowerCase()
    const isHeic = (lowerSrc.includes(".heic") || lowerSrc.includes(".heif")) && !lowerSrc.startsWith("blob:")

    if (isHeic && !error) {
      setIsProcessing(true)
      const convertHeic = async () => {
        try {
          // Dynamic import to keep bundle smaller on other pages
          const hem = await import("heic2any")
          const heic2any = hem.default

          const response = await fetch(src)
          const blob = await response.blob()
          
          const converted = await heic2any({
            blob,
            toType: "image/jpeg",
            quality: 0.8
          })
          
          const resultBlob = Array.isArray(converted) ? converted[0] : converted
          const url = URL.createObjectURL(resultBlob)
          setDisplaySrc(url)
        } catch (err) {
          console.error("HEIC conversion failed:", err)
          setError(true)
          setDisplaySrc(src) // Fallback to original src if conversion fails
        } finally {
          setIsProcessing(false)
        }
      }
      convertHeic()
    } else {
      setDisplaySrc(src)
    }
  }, [src, error])

  if (!displaySrc) return fallback || null

  if (isProcessing) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 animate-pulse ${className}`}>
        <span className="text-[10px] font-black uppercase text-gray-300">Processing HEIC...</span>
      </div>
    )
  }

  if (error) return fallback || null

  // Check if it's a relative path or remote URL for Next.js Image
  const isRemote = displaySrc.startsWith("http") || displaySrc.startsWith("blob:")
  const hasDimensions = props.width && props.height
  const isFill = !!(props as any).fill
  
  if (isRemote || (!hasDimensions && !isFill)) {
    // For remote images, converted blobs, or local images without required Next.js dimensions,
    // we use standard img to avoid Next.js runtime errors.
    return <img src={displaySrc} alt={alt || ""} className={className} {...(props as any)} />
  }

  return <Image src={displaySrc} alt={alt || ""} className={className} {...props} />
}
