"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  CreditCard, 
  ShieldCheck, 
  Building2, 
  Smartphone, 
  Banknote, 
  Save,
  ArrowUpRight
} from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SimplifiedPayoutTracker } from "@/components/shared/simplified-payout-tracker"
import { Badge } from "@/components/ui/badge"

type PaymentMethodType = "bank" | "wallet" | "cash"

interface SettlementDetails {
  type: PaymentMethodType
  accountName: string
  accountNumber: string
  bankName: string
  branchName: string
  swiftCode: string
  walletProvider: string
  walletNumber: string
}

export function BrandPayouts({ brandId }: { brandId: string }) {
  const [isSaving, setIsSaving] = useState(false)
  const [settlementDetails, setSettlementDetails] = useState<SettlementDetails>({
    type: "bank",
    accountName: "",
    accountNumber: "",
    bankName: "",
    branchName: "",
    swiftCode: "",
    walletProvider: "",
    walletNumber: "",
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    fetchSettlementDetails()
  }, [brandId])

  const fetchSettlementDetails = async () => {
    const { data } = await supabase
      .from("brands")
      .select("bank_account_details")
      .eq("id", brandId)
      .single()
    
    if (data?.bank_account_details) {
      const details = data.bank_account_details as Partial<SettlementDetails>
      setSettlementDetails({
        type: details.type || "bank",
        accountName: details.accountName || "",
        accountNumber: details.accountNumber || "",
        bankName: details.bankName || "",
        branchName: details.branchName || "",
        swiftCode: details.swiftCode || "",
        walletProvider: details.walletProvider || "",
        walletNumber: details.walletNumber || "",
      })
    }
  }

  const handleUpdateSettlementDetails = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("brands")
        .update({ bank_account_details: settlementDetails })
        .eq("id", brandId)
      if (error) throw error
      toast.success("Settlement account configured successfully.")
      setIsDialogOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Configuration transmission failed.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-12 pb-24 text-[#010307] animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Configuration Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 p-6 sm:p-8 rounded-[2rem] border border-gray-100 gap-6">
        <div>
           <h3 className="text-2xl font-black italic lowercase tracking-tight">receivables routing</h3>
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">configure where your payouts land</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
           <DialogTrigger asChild>
              <Button 
                 variant="outline" 
                 className="rounded-2xl bg-white border-[#010307]/10 hover:border-[#FE7F2D]/20 hover:bg-[#FE7F2D]/5 h-14 px-8 font-black lowercase text-[10px] tracking-widest flex items-center gap-3 shadow-sm transition-all"
              >
                 <CreditCard className="w-4 h-4 text-[#FE7F2D]" /> configure accounts
              </Button>
           </DialogTrigger>
           <DialogContent className="max-w-xl rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden focus:outline-none bg-white">
               <div className="bg-[#010307] text-white p-10 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#FE7F2D]/10 blur-3xl -mr-16 -mt-16"></div>
                  <div className="flex items-center gap-4 relative z-10">
                     <div className="w-12 h-12 bg-[#FE7F2D] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
                        <ShieldCheck className="w-6 h-6" />
                     </div>
                     <div>
                        <DialogTitle className="text-3xl font-black italic lowercase tracking-tighter">Treasury Terminal</DialogTitle>
                        <DialogDescription className="text-white/40 text-[10px] font-bold uppercase tracking-widest italic">Official Disbursement Configuration</DialogDescription>
                     </div>
                  </div>
               </div>
               <div className="p-10 space-y-10">
                  <Tabs value={settlementDetails.type} onValueChange={(v) => setSettlementDetails({...settlementDetails, type: v as PaymentMethodType})} className="w-full">
                    <TabsList className="grid grid-cols-3 w-full h-16 bg-gray-50 rounded-[1.5rem] p-1.5 border border-[#010307]/5">
                      <TabsTrigger value="bank" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-[#010307] data-[state=active]:text-white data-[state=active]:shadow-xl flex items-center gap-2 transition-all">
                         <Building2 className="w-3.5 h-3.5" /> Bank
                      </TabsTrigger>
                      <TabsTrigger value="wallet" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-[#010307] data-[state=active]:text-white data-[state=active]:shadow-xl flex items-center gap-2 transition-all">
                         <Smartphone className="w-3.5 h-3.5" /> Wallet
                      </TabsTrigger>
                      <TabsTrigger value="cash" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-[#010307] data-[state=active]:text-white data-[state=active]:shadow-xl flex items-center gap-2 transition-all">
                         <Banknote className="w-3.5 h-3.5" /> Cash
                      </TabsTrigger>
                    </TabsList>
                    
                    <div className="mt-10">
                      <TabsContent value="bank" className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-3 mb-2 px-1">
                           <div className="w-8 h-8 rounded-lg bg-[#FE7F2D]/10 flex items-center justify-center text-[#FE7F2D]">
                              <Building2 className="w-4 h-4" />
                           </div>
                           <h4 className="font-black text-sm italic lowercase tracking-tight">Bank Settlement Details</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2 col-span-2">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40 flex justify-between">
                                Account Holder Name
                                <span className="text-[8px] italic opacity-50">Legal Name Required</span>
                             </Label>
                             <Input 
                                value={settlementDetails.accountName}
                                onChange={(e) => setSettlementDetails({...settlementDetails, accountName: e.target.value})}
                                className="h-14 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#FE7F2D]/30 transition-all font-bold lowercase italic text-base"
                                placeholder="e.g. creative ventures pvt ltd"
                             />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40">Bank Name</Label>
                             <Input 
                                value={settlementDetails.bankName}
                                onChange={(e) => setSettlementDetails({...settlementDetails, bankName: e.target.value})}
                                className="h-14 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#FE7F2D]/30 transition-all font-bold lowercase italic text-base"
                                placeholder="e.g. NIC Asia Bank"
                             />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40">Account Number</Label>
                             <Input 
                                value={settlementDetails.accountNumber}
                                onChange={(e) => setSettlementDetails({...settlementDetails, accountNumber: e.target.value})}
                                className="h-14 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#FE7F2D]/30 transition-all font-black text-base tabular-nums"
                                placeholder="0000 0000 0000"
                             />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40">Branch Name</Label>
                             <Input 
                                value={settlementDetails.branchName}
                                onChange={(e) => setSettlementDetails({...settlementDetails, branchName: e.target.value})}
                                className="h-14 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#FE7F2D]/30 transition-all font-bold lowercase italic text-base"
                                placeholder="e.g. Thamel"
                             />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40">Swift Code <span className="text-[8px] opacity-30 font-bold">(Optional)</span></Label>
                             <Input 
                                value={settlementDetails.swiftCode}
                                onChange={(e) => setSettlementDetails({...settlementDetails, swiftCode: e.target.value})}
                                className="h-14 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#FE7F2D]/30 transition-all font-bold uppercase tracking-widest text-sm"
                                placeholder="NICANP..."
                             />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="wallet" className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                         <div className="flex items-center gap-3 mb-2 px-1">
                            <div className="w-8 h-8 rounded-lg bg-[#FE7F2D]/10 flex items-center justify-center text-[#FE7F2D]">
                               <Smartphone className="w-4 h-4" />
                            </div>
                            <h4 className="font-black text-sm italic lowercase tracking-tight">Digital Wallet Links</h4>
                         </div>
                         <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40">Provider</Label>
                              <Input 
                                 value={settlementDetails.walletProvider}
                                 onChange={(e) => setSettlementDetails({...settlementDetails, walletProvider: e.target.value})}
                                 className="h-14 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#FE7F2D]/30 transition-all font-bold lowercase italic text-base"
                                 placeholder="e.g. eSewa / Khalti"
                              />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40">Linked Phone Number</Label>
                              <Input 
                                 value={settlementDetails.walletNumber}
                                 onChange={(e) => setSettlementDetails({...settlementDetails, walletNumber: e.target.value})}
                                 className="h-14 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#FE7F2D]/30 transition-all font-black text-base tabular-nums"
                                 placeholder="98..."
                              />
                           </div>
                           <div className="space-y-2 col-span-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-[#010307]/40">Full Name on Wallet</Label>
                              <Input 
                                 value={settlementDetails.accountName}
                                 onChange={(e) => setSettlementDetails({...settlementDetails, accountName: e.target.value})}
                                 className="h-14 rounded-2xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-[#FE7F2D]/30 transition-all font-bold lowercase italic text-base"
                                 placeholder="as seen in wallet app"
                              />
                           </div>
                         </div>
                      </TabsContent>

                      <TabsContent value="cash" className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="p-10 bg-orange-50/50 rounded-[2.5rem] border border-[#FE7F2D]/10 flex flex-col items-center text-center gap-6 relative overflow-hidden group">
                           <div className="absolute top-0 left-0 w-full h-1 bg-[#FE7F2D]/20"></div>
                           <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-[#FE7F2D] shadow-xl shadow-orange-500/10 group-hover:scale-110 transition-transform">
                              <Banknote className="w-8 h-8" />
                           </div>
                           <div className="space-y-2">
                              <p className="text-[10px] font-black text-[#FE7F2D] uppercase tracking-widest">Physical Settlement Signal</p>
                              <p className="text-sm font-bold text-[#010307]/60 lowercase leading-relaxed max-w-xs mx-auto">
                                 Cash settlements are aggregated and disbursed directly at the <span className="text-[#010307] font-black italic">Club Treasury Desk</span>.
                              </p>
                           </div>
                           <Badge className="bg-[#FE7F2D]/10 text-[#FE7F2D] border-none font-bold italic lowercase text-[10px] px-6 py-2 rounded-full">Manual Voucher Signing</Badge>
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>

                  <div className="flex gap-4 pt-4 mt-8 border-t border-gray-100">
                     <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-black lowercase italic tracking-widest text-[#010307]/40 hover:bg-gray-50">cancel</Button>
                     <Button 
                        onClick={handleUpdateSettlementDetails} 
                        disabled={isSaving}
                        className="flex-1 h-14 bg-[#FE7F2D] text-white hover:bg-black rounded-2xl font-black lowercase italic tracking-widest shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-3"
                     >
                        <Save className="w-4 h-4" /> {isSaving ? "syncing..." : "save routing details"}
                     </Button>
                  </div>
               </div>
           </DialogContent>
        </Dialog>
      </div>

      {/* Main Simplified Payout Tracker Content */}
      <SimplifiedPayoutTracker brandId={brandId} isAdmin={false} />
      
      {/* Footer Info */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border border-[#010307]/5 text-[11px] font-bold lowercase tracking-widest text-[#010307]/20 italic justify-center text-center mx-auto max-w-lg mt-12 shadow-sm">
         <ArrowUpRight className="w-4 h-4 text-[#FE7F2D]" /> treasury link active • secure 256-bit encryption verified.
      </div>
    </div>
  )
}
