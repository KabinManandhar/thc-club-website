"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { adminAuth, type AdminUser } from "@/lib/auth"
import { ArrowRight, Check, Lock, ShieldCheck, User, X } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

function PasswordRequirement({ label, met }: { label: string; met: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${met ? 'text-green-500' : 'text-[#010307]/30'}`}>
      {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </div>
  )
}

export function AdminProfile() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: "",
  })
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const user = await adminAuth.getCurrentUser()
      setCurrentUser(user)
    }
    loadUser()
  }, [])

  const validation = {
    hasUpper: /[A-Z]/.test(passwordForm.password),
    hasLower: /[a-z]/.test(passwordForm.password),
    hasDigit: /[0-9]/.test(passwordForm.password),
    hasSymbol: /[^A-Za-z0-9]/.test(passwordForm.password),
    minLength: passwordForm.password.length >= 8,
    matches: passwordForm.password.length > 0 && passwordForm.password === passwordForm.confirmPassword
  }

  const isValid = Object.values(validation).every(Boolean)

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setIsUpdating(true)
    try {
      const { success, error } = await adminAuth.updatePassword(passwordForm.password)
      if (success) {
        toast.success("Identity secured. Password updated successfully.")
        setPasswordForm({ password: "", confirmPassword: "" })
      } else {
        toast.error(error || "Update failed")
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsUpdating(false)
    }
  }

  if (!currentUser) return null

  return (
    <div className="space-y-12 pb-24 font-space-grotesk max-w-4xl mx-auto">
      {/* Header */}
      <div className="relative p-10 bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden group">
        <div className="relative z-10 flex h-full items-center gap-10">
          <div className="w-24 h-24 rounded-3xl bg-[#FE7F2D]/5 border border-[#FE7F2D]/10 flex items-center justify-center text-[#FE7F2D]">
            <User className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-black tracking-tighter uppercase">{currentUser.name}</h1>
              <Badge className="bg-[#FE7F2D] text-white border-none px-3 font-black uppercase text-[8px] tracking-widest rounded-full">{currentUser.role.replace("_", " ")}</Badge>
            </div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 opacity-50 text-[#FE7F2D]" />
              Authorized Account: {currentUser.email.toLowerCase()}
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-8">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse inline-block" />
        </div>
      </div>

      <div className="grid md:grid-cols-1 gap-10">
        <section className="space-y-8">
          <div className="flex items-center gap-3 italic">
            <Lock className="w-5 h-5 text-black" />
            <h3 className="text-xl font-black tracking-tighter uppercase">Security Terminal</h3>
          </div>

          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0 space-y-8">
              <form onSubmit={handlePasswordUpdate} className="space-y-8">
                <div className="grid sm:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">New Password </Label>
                    <Input
                      type="password"
                      value={passwordForm.password}
                      onChange={(e) => setPasswordForm(p => ({ ...p, password: e.target.value }))}
                      className="rounded-2xl h-14 border-black/5 font-bold bg-white"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">Confirm Password</Label>
                    <Input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      className="rounded-2xl h-14 border-black/5 font-bold bg-white"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm p-8 rounded-[2rem] border border-black/5 space-y-6">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className={`w-5 h-5 ${isValid ? 'text-green-500' : 'text-[#FE7F2D]/40'}`} />
                    <p className="text-[11px] font-black uppercase tracking-widest text-[#010307]/60">administrative requirements</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4">
                    <PasswordRequirement label="Uppercase" met={validation.hasUpper} />
                    <PasswordRequirement label="Lowercase" met={validation.hasLower} />
                    <PasswordRequirement label="Numerical" met={validation.hasDigit} />
                    <PasswordRequirement label="Symbol" met={validation.hasSymbol} />
                    <PasswordRequirement label="Min. 8" met={validation.minLength} />
                    <PasswordRequirement label="Matches" met={validation.matches} />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isUpdating || !isValid}
                  className="bg-[#010307] hover:bg-black text-white rounded-2xl px-12 h-16 font-black uppercase text-sm tracking-widest shadow-2xl active:scale-95 transition-all w-full sm:w-auto"
                >
                  {isUpdating ? "Securing Entry..." : "Update Private Access"}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
