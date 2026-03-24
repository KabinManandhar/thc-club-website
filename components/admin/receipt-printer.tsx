"use client"

import React from "react"
import { Separator } from "@/components/ui/separator"

interface ReceiptItem {
  name: string
  quantity: number
  price: number
  total: number
}

interface ReceiptPrinterProps {
  invoiceNumber: string
  date: string
  brandName: string
  customerName?: string
  items: ReceiptItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
}

export const ReceiptPrinter = React.forwardRef<HTMLDivElement, ReceiptPrinterProps>((props, ref) => {
  return (
    <div ref={ref} className="receipt-container bg-white text-black font-mono text-[12px] leading-tight p-4 w-[80mm] mx-auto">
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .receipt-container {
            width: 80mm;
            padding: 10mm 5mm;
          }
          .no-print {
            display: none !important;
          }
        }
        .receipt-container {
          width: 80mm;
          font-family: 'Courier New', Courier, monospace;
        }
      `}</style>

      <div className="text-center space-y-1 mb-4">
        <h1 className="text-xl font-bold uppercase">THC CLUB</h1>
        <p className="text-[10px] uppercase tracking-widest">Kathmandu, Nepal</p>
        <p className="text-[10px]">Terminal 01 • System Sync</p>
        <p className="text-[10px]">--------------------------------</p>
      </div>

      <div className="space-y-1 mb-4 text-[10px]">
        <div className="flex justify-between">
          <span>INVOICE:</span>
          <span className="font-bold">{props.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>DATE:</span>
          <span>{props.date}</span>
        </div>
        <div className="flex justify-between">
          <span>BRAND:</span>
          <span>{props.brandName}</span>
        </div>
        <div className="flex justify-between">
          <span>CUSTOMER:</span>
          <span>{props.customerName || "Walk-in"}</span>
        </div>
        <p className="text-[10px]">--------------------------------</p>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between font-bold text-[10px]">
          <span className="w-1/2">ITEM</span>
          <span className="w-1/6 text-right">QTY</span>
          <span className="w-1/3 text-right">TOTAL</span>
        </div>
        {props.items.map((item, i) => (
          <div key={i} className="flex justify-between text-[10px]">
            <span className="w-1/2 truncate">{item.name}</span>
            <span className="w-1/6 text-right">{item.quantity}</span>
            <span className="w-1/3 text-right">{item.total.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1 pt-2 border-t border-dashed border-black">
        <div className="flex justify-between text-[10px]">
          <span>SUBTOTAL:</span>
          <span>NPR {props.subtotal.toLocaleString()}</span>
        </div>
        {props.discount > 0 && (
          <div className="flex justify-between text-[10px]">
            <span>DISCOUNT:</span>
            <span>- NPR {props.discount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-[12px] pt-1 mt-1 border-t border-black">
          <span>TOTAL:</span>
          <span>NPR {props.total.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-6 text-center space-y-2">
        <p className="text-[10px] uppercase font-bold">Payment: {props.paymentMethod}</p>
        <p className="text-[9px] italic">Thank you for building with the Hidden Collective.</p>
        <div className="flex justify-center pt-2">
           <div className="w-24 h-1 bg-black"></div>
        </div>
        <p className="text-[8px] opacity-50">Terminal ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
      </div>
    </div>
  )
})

ReceiptPrinter.displayName = "ReceiptPrinter"
