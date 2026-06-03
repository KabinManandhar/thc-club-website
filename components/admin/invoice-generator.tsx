"use client"

import { PosInvoiceCheckout } from "@/components/shared/pos-invoice-checkout"
import { adminAuth } from "@/lib/auth"

export function InvoiceGenerator() {
  return (
    <PosInvoiceCheckout
      getCurrentActor={async () => {
        const user = await adminAuth.getCurrentUser()
        if (!user) return null
        return { id: user.id, name: user.name }
      }}
    />
  )
}
