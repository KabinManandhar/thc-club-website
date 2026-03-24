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
