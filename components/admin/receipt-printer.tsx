"use client"

import React from "react"

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

      <div className="text-center space-y-2 mb-6">
        <div className="flex justify-center mb-1">
           <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-black text-xl italic">T</div>
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tighter italic">THC CLUB</h1>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-500">the hidden collective</p>
        </div>
        <div className="pt-2">
          <h2 className="text-sm font-black tracking-widest uppercase border-y border-dashed border-black/20 py-1.5 my-2">Proforma Invoice</h2>
        </div>
        <div className="text-[9px] font-bold tracking-widest text-gray-600 space-y-0.5">
          <p className="uppercase">Sayummy's Foods Pvt Ltd.</p>
          <p className="uppercase">Pan No: 622393542</p>
          <p className="text-[8px] text-gray-400 uppercase pt-1">kathmandu • outlet 01 access</p>
        </div>
      </div>

      <div className="space-y-2 mb-8 text-[10px]">
        <div className="flex justify-between border-b border-gray-100 pb-2">
          <span className="text-gray-400 font-bold lowercase">receipt no:</span>
          <span className="font-black italic">{props.invoiceNumber}</span>
        </div>
        <div className="flex justify-between border-b border-gray-100 pb-2">
          <span className="text-gray-400 font-bold lowercase">date:</span>
          <span className="font-bold">{props.date}</span>
        </div>
        <div className="flex justify-between border-b border-gray-100 pb-2">
          <span className="text-gray-400 font-bold lowercase">brand partner:</span>
          <span className="font-black italic lowercase">{props.brandName}</span>
        </div>
        <div className="flex justify-between border-b border-gray-100 pb-2">
          <span className="text-gray-400 font-bold lowercase">customer:</span>
          <span className="font-bold lowercase">{props.customerName || "walk-in member"}</span>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex justify-between font-black text-[9px] lowercase tracking-widest border-b-2 border-black pb-2">
          <span className="w-1/2">item / description</span>
          <span className="w-1/6 text-right">qty</span>
          <span className="w-1/3 text-right">total</span>
        </div>
        <div className="space-y-3">
          {props.items.map((item, i) => (
            <div key={i} className="flex justify-between text-[11px] items-start">
              <div className="w-1/2 flex flex-col">
                <span className="font-black lowercase leading-tight">{item.name}</span>
                <span className="text-[9px] text-gray-400 font-bold lowercase">npr {item.price.toLocaleString()}</span>
              </div>
              <span className="w-1/6 text-right font-bold">x{item.quantity}</span>
              <span className="w-1/3 text-right font-black italic">{(item.total).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-4 border-t-2 border-black">
        <div className="flex justify-between text-[10px] font-bold lowercase">
          <span className="text-gray-400">subtotal value:</span>
          <span className="font-black">npr {props.subtotal.toLocaleString()}</span>
        </div>
        {props.discount > 0 && (
          <div className="flex justify-between text-[10px] font-bold lowercase text-gray-500">
            <span>platform discount:</span>
            <span className="font-black">- npr {props.discount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-[18px] pt-4 mt-2 border-t border-dashed border-gray-200 tracking-tighter italic">
          <span className="lowercase">total:</span>
          <span>npr {props.total.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-8 text-center space-y-6">
        <div className="inline-block px-4 py-2 border-2 border-black rounded-lg">
           <p className="text-[10px] font-black lowercase tracking-widest">settled via {props.paymentMethod}</p>
        </div>
        
        <div className="space-y-1">
           <p className="text-[10px] font-black lowercase italic">"thanks for building with the club."</p>
           <p className="text-[8px] font-bold uppercase text-gray-500 tracking-[0.1em] mt-3 border-t border-dashed border-gray-200 pt-3">for pan bill need to pick from counter.</p>
           <p className="text-[8px] font-bold lowercase text-gray-400 tracking-[0.2em] pt-1">www.thehiddencollectiveclub.com</p>
        </div>

        <div className="flex justify-center pt-2">
           <div className="w-1.5 h-1.5 bg-black rounded-full mx-1"></div>
           <div className="w-1.5 h-1.5 bg-black rounded-full mx-1"></div>
           <div className="w-1.5 h-1.5 bg-black rounded-full mx-1"></div>
        </div>
      </div>
    </div>
  )
})

ReceiptPrinter.displayName = "ReceiptPrinter"
