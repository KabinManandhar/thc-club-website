"use client"

const env = process.env.NEXT_PUBLIC_APP_ENV

export function EnvBanner() {
  if (!env || env === "production") return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#FE7F2D] text-white text-center py-1 sm:py-1.5 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] border-t border-black/10 flex items-center justify-center gap-2 sm:gap-3 backdrop-blur-md bg-opacity-90">
      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse inline-block" />
      <span>DEVELOPMENT / TEST ENV — DATA IS NOT REAL</span>
      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse inline-block" />
    </div>
  )
}
