import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSKU(brandName: string, productName: string) {
  const cleanBrand = (brandName || "BRD").replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase()
  const cleanProduct = (productName || "PRD").replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase()
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  return `${cleanBrand}-${cleanProduct}-${randomNum}`
}

export async function processImageFile(file: File): Promise<File> {
  const isHeic = file.name.toLowerCase().endsWith(".heic") || 
                 file.name.toLowerCase().endsWith(".heif") ||
                 file.type === "image/heic" || 
                 file.type === "image/heif";

  if (isHeic) {
    try {
      const heic2any = (await import("heic2any")).default;
      const convertedBlob = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.8
      });
      
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
        type: "image/jpeg",
        lastModified: new Date().getTime()
      });
    } catch (err) {
      console.error("HEIC conversion failed:", err);
      throw new Error("Failed to process HEIC image.");
    }
  }
  return file;
}
