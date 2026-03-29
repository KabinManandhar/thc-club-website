"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldCheck, Check, X, ArrowRight, Lock } from "lucide-react"
import { userAuth } from "@/lib/user-auth"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

function PasswordRequirement({ label, met }: { label: string; met: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${met ? 'text-green-500' : 'text-[#010307]/30'}`}>
      {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </div>
  )
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()

  const validation = {
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
    minLength: password.length >= 8,
    matches: password.length > 0 && password === confirmPassword
  }

  const isValid = Object.values(validation).every(Boolean)

  useEffect(() => {
    // Check if we have a session (injected by Supabase via reset link)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // If no session, they shouldn't be here unless they just clicked a dead link
        // We could redirect to login, but let's show an error first
      }
    }
    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setIsLoading(true)
    setError("")

    try {
      const { success, error: resetError } = await userAuth.updatePassword(password)
      if (success) {
        setIsSuccess(true)
        setTimeout(() => {
          router.push("/")
        }, 3000)
      } else {
        setError(resetError || "Failed to update password")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFCEB] flex items-center justify-center p-4 font-space-grotesk">
      <Card className="w-full max-w-md border-[#FE7F2D]/10 shadow-sm overflow-hidden rounded-[2.5rem]">
        <CardHeader className="text-center space-y-6 p-8 pb-4 bg-white/50 backdrop-blur-sm">
          <div className="flex justify-center pt-4">
             <Image src="/logo.png" alt="THC Club" width={120} height={60} className="h-12 w-auto" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-black lowercase italic flex items-center justify-center gap-3">
              <Lock className="w-5 h-5 text-[#FE7F2D]" />
              set new password
            </CardTitle>
            <CardDescription className="text-[11px] lowercase font-bold tracking-widest text-[#010307]/40">brand recovery terminal</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-8 pb-10 bg-white/50 backdrop-blur-sm">
          {isSuccess ? (
            <div className="text-center space-y-6 py-8">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black lowercase italic">identity secured</h3>
                <p className="text-xs text-[#010307]/60 lowercase">your password has been updated. redirecting to the collective...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="rounded-2xl border-red-100 bg-red-50 text-red-600">
                  <AlertDescription className="font-bold text-xs lowercase italic text-center">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label htmlFor="password" title="new password" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="new security password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-[#010307]/10 focus:border-[#FE7F2D] rounded-2xl h-14 bg-white/80"
                  />
                </div>

                <div className="space-y-2 text-left">
                  <Label htmlFor="confirm" title="confirm password" />
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="confirm new security password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="border-[#010307]/10 focus:border-[#FE7F2D] rounded-2xl h-14 bg-white/80"
                  />
                </div>
              </div>

              {/* Security Requirements UI */}
              <div className="bg-white/30 backdrop-blur-sm p-5 rounded-3xl border border-[#010307]/5 space-y-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <ShieldCheck className={`w-4 h-4 ${isValid ? 'text-green-500' : 'text-[#FE7F2D]/40'}`} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#010307]/60">security requirements</p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <PasswordRequirement label="Uppercase" met={validation.hasUpper} />
                  <PasswordRequirement label="Lowercase" met={validation.hasLower} />
                  <PasswordRequirement label="Numerical" met={validation.hasDigit} />
                  <PasswordRequirement label="Symbol" met={validation.hasSymbol} />
                  <PasswordRequirement label="Min. 8 Chars" met={validation.minLength} />
                  <PasswordRequirement label="Matches" met={validation.matches} />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-bold lowercase text-lg h-16 rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98]"
                disabled={isLoading || !isValid}
              >
                {isLoading ? "updating credentials..." : "update password"}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
