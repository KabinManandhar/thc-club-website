"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

export default function FullScreenBanner() {
    const [isVisible, setIsVisible] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setIsMounted(true), 10);
        return () => clearTimeout(t);
    }, []);

    const handleClose = () => {
        setIsMounted(false);
        setTimeout(() => setIsVisible(false), 300);
    };

    if (!isVisible) return null;

    return (
        <div
            className={cn(
                "fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-300",
                isMounted
                    ? "bg-black/70 backdrop-blur-sm"
                    : "bg-black/0 backdrop-blur-none"
            )}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className={cn(
                    "relative w-[min(480px,88vw)] bg-[#0a0a0a] rounded-sm overflow-hidden",
                    "border border-white/10",
                    "shadow-[0_32px_80px_rgba(0,0,0,0.8),0_0_60px_rgba(254,127,45,0.06)]",
                    "transition-all duration-300 ease-out",
                    isMounted
                        ? "opacity-100 translate-y-0 scale-100"
                        : "opacity-0 translate-y-6 scale-95"
                )}
            >
                {/* Top accent line */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FE7F2D]/60 to-transparent z-10" />

                {/* Corner ticks */}
                <span className="absolute top-2.5 left-2.5 w-3 h-3 border-t border-l border-[#FE7F2D]/40" />
                <span className="absolute top-2.5 right-2.5 w-3 h-3 border-t border-r border-[#FE7F2D]/40" />
                <span className="absolute bottom-2.5 left-2.5 w-3 h-3 border-b border-l border-[#FE7F2D]/40" />
                <span className="absolute bottom-2.5 right-2.5 w-3 h-3 border-b border-r border-[#FE7F2D]/40" />

                {/* GIF */}
                <div className="w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
                    <img
                        src="/thc_club.gif"
                        alt="THC Club"
                        className="w-full h-full object-contain"
                    />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06]">
                    <span className="text-[10px] tracking-[0.18em] uppercase text-[#FE7F2D]/50 font-mono">
                        the hidden collective club
                    </span>

                    <button
                        onClick={handleClose}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-sm",
                            "text-[10px] tracking-widest uppercase font-mono",
                            "border border-[#FE7F2D]/20 text-[#FE7F2D]/60",
                            "transition-all duration-150",
                            "hover:bg-[#FE7F2D]/10 hover:border-[#FE7F2D]/40 hover:text-[#FE7F2D]"
                        )}
                    >
                        <X className="w-2.5 h-2.5" />
                        dismiss
                    </button>
                </div>
            </div>
        </div>
    );
}