"use client"

const env = process.env.NEXT_PUBLIC_APP_ENV

export function EnvBanner() {
  if (!env || env === "production") return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-yellow-400 text-yellow-900 text-center py-1.5 text-xs font-bold tracking-wide border-t-2 border-yellow-600 flex items-center justify-center gap-3">
      <span className="w-2 h-2 bg-yellow-700 rounded-full animate-pulse inline-block" />
      DEVELOPMENT / TEST ENV — Data is not real production data
      <span className="w-2 h-2 bg-yellow-700 rounded-full animate-pulse inline-block" />
    </div>
  )
}
