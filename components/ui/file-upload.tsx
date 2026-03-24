"use client"

import { useState } from "react"
import { UploadCloud, X, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "./button"
import { toast } from "sonner"

interface FileUploadProps {
  bucket?: string
  folder?: string
  value?: string
  onChange: (url: string) => void
  onRemove?: () => void
  accept?: string
}

export function FileUpload({
  bucket = "media",
  folder = "uploads",
  value,
  onChange,
  onRemove,
  accept = "image/*"
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const fileExt = file.name.split(".").pop()
      const fileName = `${folder}/${Math.random()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: false })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)

      onChange(publicUrl)
      toast.success("File uploaded successfully")
    } catch (err: any) {
      console.error("Upload error:", err)
      toast.error(err.message || "Failed to upload file.")
    } finally {
      setIsUploading(false)
    }
  }

  if (value) {
    return (
      <div className="relative inline-block border rounded-xl overflow-hidden shadow-sm">
        {/* If it's an image, display it */}
        <img 
          src={value} 
          alt="Uploaded File" 
          className="w-32 h-32 object-cover bg-gray-50" 
          onError={(e) => {
            // fallback if not an image (like a contract PDF)
            e.currentTarget.style.display = 'none'
          }} 
        />
        <Button
          type="button"
          onClick={() => {
            if (onRemove) onRemove();
            else onChange("");
          }}
          className="absolute top-1 right-1 w-6 h-6 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    )
  }

  return (
    <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-6 hover:bg-gray-50 hover:border-[#FE7F2D]/50 transition-all group flex flex-col items-center justify-center text-center cursor-pointer h-32">
       <input 
         type="file" 
         accept={accept} 
         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
         onChange={handleUpload}
         disabled={isUploading}
       />
       {isUploading ? (
         <div className="flex flex-col items-center gap-2">
           <Loader2 className="w-6 h-6 animate-spin text-[#FE7F2D]" />
           <span className="text-xs font-bold text-gray-400">Uploading...</span>
         </div>
       ) : (
         <>
           <div className="w-10 h-10 bg-[#FE7F2D]/10 text-[#FE7F2D] rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
             <UploadCloud className="w-5 h-5" />
           </div>
           <p className="text-sm font-bold text-gray-600">Click or drag to upload</p>
           <p className="text-[10px] text-gray-400 font-medium">JPEG, PNG, WebP up to 5MB</p>
         </>
       )}
    </div>
  )
}
