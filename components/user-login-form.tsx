"use client"

import type React from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { userAuth } from "@/lib/user-auth"
import { ArrowLeft, Check, Lock, ShieldCheck, X } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

function PasswordRequirement({ label, met }: { label: string; met: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${met ? 'text-green-500' : 'text-[#010307]/30'}`}>
      {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </div>
  )
}

interface UserLoginFormProps {
  onLoginSuccess: () => void
  onBack: () => void
  onSwitchToSignup: () => void
}

export function UserLoginForm({ onLoginSuccess, onBack, onSwitchToSignup }: UserLoginFormProps) {
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showOtp, setShowOtp] = useState(false)
  const [otpToken, setOtpToken] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [isForgotView, setIsForgotView] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [isForgotSuccess, setIsForgotSuccess] = useState(false)

  const passwordValidation = {
    hasUpper: /[A-Z]/.test(loginData.password),
    hasLower: /[a-z]/.test(loginData.password),
    hasDigit: /[0-9]/.test(loginData.password),
    hasSymbol: /[^A-Za-z0-9]/.test(loginData.password),
    minLength: loginData.password.length >= 8,
  }

  const isPasswordValid = Object.values(passwordValidation).every(Boolean)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { user, error: loginError, emailNotConfirmed } = await userAuth.login(loginData.email, loginData.password)

      if (emailNotConfirmed) {
        setShowOtp(true)
        return
      }

      if (loginError || !user) {
        setError(loginError || "Login failed")
        return
      }

      onLoginSuccess()
    } catch (error) {
      setError("An unexpected error occurred")
      console.error("Login error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsVerifying(true)
    setError("")

    try {
      const { success, error: verifyError } = await userAuth.verifyOtp(loginData.email, otpToken)
      if (verifyError || !success) {
        setError(verifyError || "Verification failed")
        return
      }
      onLoginSuccess()
    } catch (error) {
      setError("An unexpected error occurred during verification")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendOtp = async () => {
    setIsResending(true)
    setError("")
    try {
      const { success, error: resendError } = await userAuth.resendOtp(loginData.email)
      if (success) {
        // Show success briefly? Alert?
      } else {
        setError(resendError || "Failed to resend code")
      }
    } catch (err) {
      setError("Failed to resend code")
    } finally {
      setIsResending(false)
    }
  }

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const { success, error: forgotError } = await userAuth.forgotPassword(forgotEmail)
      if (success) {
        setIsForgotSuccess(true)
      } else {
        setError(forgotError || "Failed to send reset link")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (isForgotView) {
    return (
      <div className="min-h-screen bg-[#FFFCEB] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-[#FE7F2D]/10 shadow-sm overflow-hidden rounded-[2.5rem] bg-white/50 backdrop-blur-sm p-8">
          <div className="text-center space-y-6">
            <Button variant="ghost" onClick={() => setIsForgotView(false)} className="absolute left-4 top-4 p-2 hover:bg-black/5 rounded-full">
              <ArrowLeft className="w-4 h-4 text-[#010307]/40" />
            </Button>

            <div className="flex justify-center pt-8">
              <Image src="/logo.png" alt="THC Club" width={100} height={50} className="h-10 w-auto" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black lowercase italic text-[#010307]">recover access</h2>
              <p className="text-[#010307]/60 text-xs lowercase italic font-medium">we'll send a recovery link for the collective terminal.</p>
            </div>

            {isForgotSuccess ? (
              <div className="bg-green-50 p-6 rounded-3xl border border-green-100 space-y-4 animate-in fade-in duration-500">
                <Check className="w-10 h-10 text-green-500 mx-auto" />
                <p className="text-sm font-bold text-green-600 lowercase italic">recovery link sent to your email. check your inbox.</p>
                <Button
                  onClick={() => setIsForgotView(false)}
                  className="w-full bg-[#010307] text-white rounded-2xl h-14 lowercase font-black"
                >
                  return home
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive" className="rounded-2xl border-red-100 bg-red-50 text-red-600">
                    <AlertDescription className="font-bold text-xs lowercase italic">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2 text-left">
                  <Label htmlFor="forgot-email" className="text-[11px] font-bold lowercase tracking-widest text-[#010307]/40 ml-1">recovery email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="creator@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="border-[#010307]/10 focus:border-[#FE7F2D] rounded-2xl h-14 bg-white/80"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-bold lowercase text-base h-16 rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading ? "sending recovery link..." : "send recovery link"}
                </Button>
              </form>
            )}
          </div>
        </Card>
      </div>
    )
  }

  if (showOtp) {
    return (
      <div className="min-h-screen bg-[#FFFCEB] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-[#FE7F2D]/10 shadow-sm overflow-hidden rounded-[2.5rem] bg-white/50 backdrop-blur-sm p-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center">
                <Image src="/logo.png" alt="THC" width={40} height={20} className="grayscale opacity-50" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black lowercase italic text-[#010307]">complete verification</h2>
              <p className="text-[#010307]/60 text-xs lowercase italic font-medium">your email hasn't been verified yet. we sent a code to <span className="font-bold text-[#010307]">{loginData.email}</span></p>
            </div>

            {error && (
              <Alert variant="destructive" className="rounded-2xl border-red-100 bg-red-50 text-red-600 py-3">
                <AlertDescription className="font-bold text-xs lowercase italic">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-[11px] font-bold lowercase tracking-widest text-[#010307]/40">6-digit security code</Label>
                <Input
                  id="otp"
                  placeholder="000000"
                  maxLength={6}
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  required
                  className="text-center text-2xl tracking-[0.5em] font-black border-[#010307]/10 focus:border-[#FE7F2D] rounded-2xl h-16 bg-white/80"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-bold lowercase text-lg h-16 rounded-2xl shadow-xl shadow-orange-500/10 transition-all active:scale-[0.98]"
                disabled={isVerifying || otpToken.length !== 6}
              >
                {isVerifying ? "verifying identity..." : "verify & enter club"}
              </Button>

              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  disabled={isResending}
                  onClick={handleResendOtp}
                  className="text-[10px] font-bold text-[#FE7F2D] hover:underline uppercase tracking-widest disabled:opacity-50"
                >
                  {isResending ? "sending..." : "resend verification code"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOtp(false)}
                  className="text-[10px] font-bold text-[#010307]/40 hover:text-[#FE7F2D] uppercase tracking-widest"
                >
                  ← return to login
                </button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFFCEB] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-[#FE7F2D]/10 shadow-sm overflow-hidden rounded-[2.5rem]">
        <CardHeader className="text-center space-y-6 p-8 pb-4 relative bg-white/50 backdrop-blur-sm">
          <Button variant="ghost" onClick={onBack} className="absolute -left-2 top-2 p-2 hover:bg-black/5 rounded-full">
            <ArrowLeft className="w-4 h-4 text-[#010307]/40 hover:text-[#010307]" />
          </Button>
          <div className="flex justify-center pt-4">
            <Image src="/logo.png" alt="THC Club" width={120} height={60} className="h-12 w-auto" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-black lowercase italic flex items-center justify-center gap-3">
              <Lock className="w-5 h-5 text-[#FE7F2D]" />
              member access
            </CardTitle>
            <p className="text-[11px] lowercase font-bold tracking-widest text-[#010307]/40">secure kathmandu outlet 01</p>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-0 bg-white/50 backdrop-blur-sm">
          <div className="space-y-6">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="rounded-2xl border-red-100 bg-red-50 text-red-600">
                  <AlertDescription className="font-bold text-xs lowercase italic">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[11px] font-bold lowercase tracking-widest text-[#010307]/40 ml-1">email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="creator@email.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  className="border-[#010307]/10 focus:border-[#FE7F2D] rounded-2xl h-14 font-medium bg-white/80"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[11px] font-bold lowercase tracking-widest text-[#010307]/40 ml-1">security password</Label>
                  <button
                    type="button"
                    onClick={() => setIsForgotView(true)}
                    className="text-[10px] font-black lowercase text-[#FE7F2D] hover:underline"
                  >
                    forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="enter your password"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  className="border-[#010307]/10 focus:border-[#FE7F2D] rounded-2xl h-14 bg-white/80"
                />
              </div>

              {/* Password Requirements Reminder (Subtle) */}
              {loginData.password.length > 0 && !isPasswordValid && (
                <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#FE7F2D]/60" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40">security standards</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <PasswordRequirement label="Uppercase" met={passwordValidation.hasUpper} />
                    <PasswordRequirement label="Lowercase" met={passwordValidation.hasLower} />
                    <PasswordRequirement label="Digit" met={passwordValidation.hasDigit} />
                    <PasswordRequirement label="Symbol" met={passwordValidation.hasSymbol} />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white font-bold lowercase text-lg tracking-wide h-16 rounded-2xl shadow-xl shadow-orange-500/20 transition-all active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? "authenticating..." : "access the club area"}
              </Button>
            </form>

            <div className="text-center pt-8 border-t border-[#010307]/10">
              <p className="text-[11px] font-bold text-[#010307]/40 lowercase tracking-widest">
                new to the collective?{" "}
                <button
                  onClick={onSwitchToSignup}
                  className="text-[#FE7F2D] hover:underline font-bold"
                >
                  apply here
                </button>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
