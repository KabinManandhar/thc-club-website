"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileUpload } from "@/components/ui/file-upload"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SafeImage } from "@/components/ui/safe-image"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import { userAuth } from "@/lib/user-auth"
import {
   Clock,
   Mail,
   Save,
   ShieldCheck,
   User
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

interface BrandProfileProps {
   brandId: string
}

export function BrandProfile({ brandId }: BrandProfileProps) {
   const [brand, setBrand] = useState<any>(null)
   const [loading, setLoading] = useState(true)
   const [saving, setSaving] = useState(false)
   const [form, setForm] = useState({
      business_name: "",
      full_name: "",
      description: "",
      phone: "",
      instagram_handle: "",
      website_url: "",
      logo_url: "",
      brand_story: "",
      business_sector: "",
      brand_tag: "",
   })
   const [passwordForm, setPasswordForm] = useState({
      password: "",
      confirmPassword: "",
   })
   const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

   const passwordValidation = {
      hasUpper: /[A-Z]/.test(passwordForm.password),
      hasLower: /[a-z]/.test(passwordForm.password),
      hasDigit: /[0-9]/.test(passwordForm.password),
      hasSymbol: /[^A-Za-z0-9]/.test(passwordForm.password),
      minLength: passwordForm.password.length >= 8,
      matches: passwordForm.password.length > 0 && passwordForm.password === passwordForm.confirmPassword
   }

   const isPasswordValid = Object.values(passwordValidation).every(Boolean)

   useEffect(() => {
      fetchBrand()
   }, [brandId])

   const fetchBrand = async () => {
      setLoading(true)
      const { data, error } = await supabase
         .from("brands")
         .select("*")
         .eq("id", brandId)
         .single()
      if (data) {
         setBrand(data)
         setForm({
            business_name: data.business_name || "",
            full_name: data.full_name || "",
            description: data.description || "",
            phone: data.phone || "",
            instagram_handle: data.instagram_handle || "",
            website_url: data.website_url || "",
            logo_url: data.logo_url || "",
            brand_story: data.brand_story || "",
            business_sector: data.business_sector || "",
            brand_tag: data.brand_tag || "",
         })
      }
      setLoading(false)
   }

   // Direct logo save — no admin approval needed for a logo image
   const handleLogoUpload = async (url: string) => {
      setForm(f => ({ ...f, logo_url: url }))
      try {
         const { error } = await supabase
            .from('brands')
            .update({ logo_url: url, updated_at: new Date().toISOString() })
            .eq('id', brandId)
         if (error) throw error
         toast.success('Brand image updated — visible on the homepage.')
      } catch (err: any) {
         toast.error('Image saved locally but failed to push live: ' + err.message)
      }
   }

   const handleSave = async () => {
      setSaving(true)
      try {
         // Create a change request instead of direct update for security/verification
         const { error } = await supabase.from("brand_change_requests").insert({
            brand_id: brandId,
            request_type: "profile_update",
            new_data: form,
            status: "pending",
         })
         if (error) throw error
         toast.success("Profile update requested. Admin will verify changes shortly.")
      } catch (err: any) {
         toast.error(err.message)
      } finally {
         setSaving(false)
      }
   }

   const handlePasswordUpdate = async () => {
      if (!isPasswordValid) return
      setIsUpdatingPassword(true)
      try {
         const { success, error } = await userAuth.updatePassword(passwordForm.password)
         if (success) {
            toast.success("Security credentials updated successfully")
            setPasswordForm({ password: "", confirmPassword: "" })
         } else {
            throw new Error(error || "Update failed")
         }
      } catch (err: any) {
         toast.error(err.message)
      } finally {
         setIsUpdatingPassword(false)
      }
   }

   function PasswordRequirement({ label, met }: { label: string; met: boolean }) {
      return (
         <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${met ? 'text-green-500' : 'text-[#010307]/30'}`}>
            {met ? <ShieldCheck className="w-3 h-3 text-green-500" /> : <ShieldCheck className="w-3 h-3 opacity-20" />}
            {label}
         </div>
      )
   }

   if (loading) return (
      <div className="flex items-center justify-center p-32">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FE7F2D]"></div>
      </div>
   )

   return (
      <div className="space-y-12 pb-24">
         {/* Header / Hero */}
         {/* Header / Hero */}
         <div className="relative p-10 bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden group">
            <div className="relative z-10 flex h-full items-center gap-10">
               <div className="relative group/logo">
                  {form.logo_url ? (
                     <SafeImage src={form.logo_url} alt="Brand Logo" className="w-24 h-24 rounded-2xl object-cover bg-gray-50 border border-black/5 shadow-sm transition-all group-hover/logo:scale-105" />
                  ) : (
                     <div className="w-24 h-24 rounded-2xl bg-gray-50 border border-black/5 flex items-center justify-center text-black/10">
                        <User className="w-10 h-10" />
                     </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
                     <FileUpload
                        bucket="media"
                        folder={`brand_${brandId}/meta`}
                        value={""}
                        onChange={handleLogoUpload}
                        className="!border-none !p-0 !bg-transparent !h-full w-full opacity-0"
                     />
                     <span className="absolute text-[8px] font-black text-white uppercase tracking-widest pointer-events-none">New Logo</span>
                  </div>
               </div>
               <div className="space-y-2">
                  <div className="flex items-center gap-3">
                     <h1 className="text-3xl font-black text-black tracking-tighter uppercase">{brand?.business_name}</h1>
                     <Badge className="bg-black text-white border-none px-3 font-black uppercase text-[8px] tracking-widest rounded-full">{brand?.onboarding_status}</Badge>
                  </div>
                  <div className="flex items-center gap-6 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                     <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 opacity-50" /> {brand?.email}</span>
                     <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 opacity-50" /> Partner Since {new Date(brand?.created_at).getFullYear()}</span>
                  </div>
               </div>
            </div>
         </div>

         <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
               <section className="space-y-6">
                  <h3 className="text-xl font-black tracking-tighter uppercase flex items-center gap-3 italic">
                     <Save className="w-5 h-5 text-black" />
                     Account Data
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-8">
                     <div className="space-y-2">
                        <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">Business Name</Label>
                        <Input
                           value={form.business_name}
                           onChange={(e) => setForm(f => ({ ...f, business_name: e.target.value }))}
                           className="rounded-2xl h-14 border-gray-100 font-bold bg-white"
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">Founder / Full Name</Label>
                        <Input
                           value={form.full_name}
                           onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
                           className="rounded-2xl h-14 border-gray-100 font-bold bg-white"
                           placeholder="e.g. Kabin Manandhar"
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">Contact Phone</Label>
                        <Input
                           value={form.phone}
                           onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                           className="rounded-2xl h-14 border-gray-100 font-bold bg-white"
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">Instagram (@)</Label>
                        <Input
                           value={form.instagram_handle}
                           onChange={(e) => setForm(f => ({ ...f, instagram_handle: e.target.value }))}
                           className="rounded-2xl h-14 border-gray-100 font-bold bg-white"
                           placeholder="e.g. thc_club"
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">Website URL</Label>
                        <Input
                           value={form.website_url}
                           onChange={(e) => setForm(f => ({ ...f, website_url: e.target.value }))}
                           className="rounded-2xl h-14 border-gray-100 font-bold bg-white"
                           placeholder="https://yourbrand.com"
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">Business Sector</Label>
                        <Input
                           value={form.business_sector}
                           onChange={(e) => setForm(f => ({ ...f, business_sector: e.target.value }))}
                           className="rounded-2xl h-14 border-gray-100 font-bold bg-white"
                           placeholder="e.g. fashion, food, lifestyle"
                        />
                     </div>
                     <div className="space-y-2 sm:col-span-2">
                        <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">Brand Tag <span className="text-[#FE7F2D] normal-case font-bold">(shown as badge on homepage)</span></Label>
                        <Input
                           value={form.brand_tag}
                           onChange={(e) => setForm(f => ({ ...f, brand_tag: e.target.value }))}
                           className="rounded-2xl h-14 border-gray-100 font-bold bg-white"
                           placeholder="e.g. handcrafted, artisanal, local-first"
                        />
                     </div>
                  </div>
               </section>

               <section className="space-y-6">
                  <h3 className="text-xl font-black tracking-tighter uppercase italic">The Narrative</h3>
                  <div className="space-y-8">
                     <div className="space-y-2">
                        <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">Hook / Short Description</Label>
                        <Input
                           value={form.description}
                           onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                           placeholder="Visible on mobile apps & shelf tabs"
                           className="rounded-2xl h-14 border-gray-100 font-bold bg-white"
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">Manifest / Narrative</Label>
                        <Textarea
                           value={form.brand_story}
                           onChange={(e) => setForm(f => ({ ...f, brand_story: e.target.value }))}
                           className="rounded-2xl border-black/5 bg-white p-6 resize-none font-medium text-gray-700 italic border"
                           rows={6}
                           placeholder="Describe your craft..."
                        />
                     </div>
                  </div>
               </section>

               <section className="space-y-6 pt-10 border-t border-black/5">
                  <div className="flex items-center justify-between">
                     <h3 className="text-xl font-black tracking-tighter uppercase italic flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-[#FE7F2D]" />
                        Security Terminal
                     </h3>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-8">
                     <div className="space-y-2">
                        <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">New Password</Label>
                        <Input
                           type="password"
                           value={passwordForm.password}
                           onChange={(e) => setPasswordForm(p => ({ ...p, password: e.target.value }))}
                           className="rounded-2xl h-14 border-gray-100 font-bold bg-white"
                           placeholder="enter your password"
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="uppercase text-[10px] font-black text-gray-400 tracking-widest ml-1">Confirm New Password</Label>
                        <Input
                           type="password"
                           value={passwordForm.confirmPassword}
                           onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                           className="rounded-2xl h-14 border-gray-100 font-bold bg-white"
                           placeholder="enter your password"
                        />
                     </div>
                  </div>

                  <div className="bg-white/50 backdrop-blur-sm p-6 rounded-3xl border border-black/5 space-y-4">
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3">
                        <PasswordRequirement label="Uppercase" met={passwordValidation.hasUpper} />
                        <PasswordRequirement label="Lowercase" met={passwordValidation.hasLower} />
                        <PasswordRequirement label="Numerical" met={passwordValidation.hasDigit} />
                        <PasswordRequirement label="Symbol" met={passwordValidation.hasSymbol} />
                        <PasswordRequirement label="Min. 8" met={passwordValidation.minLength} />
                        <PasswordRequirement label="Matches" met={passwordValidation.matches} />
                     </div>
                  </div>

                  <Button
                     onClick={handlePasswordUpdate}
                     disabled={isUpdatingPassword || !isPasswordValid}
                     className="bg-[#FE7F2D] hover:bg-[#FE7F2D]/90 text-white rounded-xl px-10 h-14 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-orange-500/10 active:scale-95 transition-all"
                  >
                     {isUpdatingPassword ? "Updating..." : "Secure New Credentials"}
                  </Button>
               </section>
            </div>

            <div className="space-y-10">
               <Card className="border border-black/5 shadow-sm rounded-2xl bg-white overflow-hidden p-8">
                  <h3 className="text-lg font-black tracking-tighter border-b border-black/5 pb-4 mb-6 uppercase italic">Visuals</h3>
                  <div className="space-y-6">
                     <FileUpload
                        bucket="media"
                        folder={`brand_${brandId}/meta`}
                        value={form.logo_url}
                        onChange={handleLogoUpload}
                     />
                     <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest text-center">Identity Asset • live on homepage</p>
                  </div>
               </Card>

               <Card className="border border-black/5 shadow-sm rounded-2xl bg-white p-8">
                  <h3 className="text-lg font-black tracking-tighter border-b border-gray-100 pb-4 mb-6 uppercase italic">Verification</h3>
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-black/5">
                     <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
                        <ShieldCheck className="w-5 h-5" />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase text-gray-900 tracking-widest">{brand?.onboarding_status} State</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Verified Official Partner</p>
                     </div>
                  </div>

                  <div className="mt-8">
                     <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-black hover:bg-black/90 text-white rounded-xl h-14 font-black uppercase text-[10px] tracking-widest shadow-sm active:scale-95 transition-all"
                     >
                        {saving ? "Transmitting..." : "Update Profile"}
                     </Button>
                     <p className="text-[9px] text-gray-400 mt-4 text-center px-4 font-bold uppercase tracking-wider">
                        All profile updates require administrative verification before appearing live on system terminals.
                     </p>
                  </div>
               </Card>
            </div>
         </div>
      </div>
   )
}
