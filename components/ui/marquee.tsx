import { useState } from "react"

export default function Marquee() {
    const [showGif, setShowGif] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })

    return (
        <>
            {/* Hover GIF Preview */}
            {showGif && (
                <div
                    className="fixed z-[9999] pointer-events-none"
                    style={{
                        top: position.y + 20,
                        left: position.x + 20,
                    }}
                >
                    <img
                        src="/thc_club.gif"
                        alt="preview"
                        className="w-48 sm:w-64 rounded-xl shadow-2xl border border-[#FE7F2D]/20"
                    />
                </div>
            )}

            {/* Marquee */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-[#FFFCEB] text-[#010307] py-1.5 sm:py-3 overflow-hidden border-b border-[#FE7F2D]/20 flex items-center">

                {/* Hover Indicator (fixed on left) */}
                <div className="flex items-center px-3 sm:px-6 whitespace-nowrap">
                    <span className="text-[10px] sm:text-xs font-semibold tracking-wide animate-pulse text-[#FE7F2D]">
                        hover →
                    </span>
                </div>

                {/* Scrolling Text */}
                <div className="flex-1 overflow-hidden">
                    <div className="animate-marquee whitespace-nowrap">
                        {[1, 2, 3, 4].map((i) => (
                            <span
                                key={i}
                                className="inline-block px-4 sm:px-12 text-[10px] sm:text-sm font-bold tracking-wide"
                                onMouseEnter={() => setShowGif(true)}
                                onMouseLeave={() => setShowGif(false)}
                                onMouseMove={(e) =>
                                    setPosition({ x: e.clientX, y: e.clientY })
                                }
                            >
                                the first rule of{" "}
                                <span className="thc-highlight">THC Club</span> is you talk about{" "}
                                <span className="thc-highlight">THC Club</span>. the second rule of{" "}
                                <span className="thc-highlight">THC Club</span> is you TALK ABOUT{" "}
                                <span className="thc-highlight">THC Club</span>.
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}