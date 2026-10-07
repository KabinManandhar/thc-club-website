import { buildInvoice, type PosCartLine } from "@/lib/pos-invoice"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { verifyPosRequest } from "@/lib/verify-pos-request"
import { NextResponse } from "next/server"

const PAYMENT_METHODS = ["cash", "card", "qr", "transfer"] as const
const fail = (error: string, status: number) => NextResponse.json({ error }, { status })
const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : null)

export async function POST(request: Request) {
  const auth = await verifyPosRequest(request)
  if (!auth.ok) return fail(auth.error, auth.status)

  let body: any
  try {
    body = await request.json()
  } catch {
    return fail("Invalid request body.", 400)
  }

  const brandId = String(body?.brand_id || "")
  const paymentMethod = body?.payment_method
  if (!PAYMENT_METHODS.includes(paymentMethod)) return fail("Invalid payment method.", 400)
  const lines: PosCartLine[] = Array.isArray(body?.items)
    ? body.items.map((i: any) => ({ product_id: String(i?.product_id || ""), quantity: Number(i?.quantity) }))
    : []

  const db = getSupabaseAdmin()
  const productIds = [...new Set(lines.map((l) => l.product_id))]
  const [productsRes, tiersRes] = await Promise.all([
    db.from("brand_products").select("id, brand_id, name, sku, price, stock_quantity, is_active").in("id", productIds),
    db.from("ppf_tiers").select("min_sales_amount, ppf_rate"),
  ])
  if (productsRes.error) return fail(`Could not load products: ${productsRes.error.message}`, 500)

  let inv
  try {
    inv = buildInvoice(brandId, lines, productsRes.data || [], tiersRes.data || [], Number(body?.discount) || 0)
  } catch (e: any) {
    return fail(e.message, 400)
  }

  // Reserve stock first. The stock_quantity match is an optimistic lock: if another
  // sale changed it since we read it, the update hits 0 rows and we abort.
  // ponytail: sequential writes + compensation; move into one plpgsql function for true atomicity.
  const reserved: { id: string; prev: number; next: number }[] = []
  const restoreStock = async () => {
    for (const r of reserved) {
      await db.from("brand_products").update({ stock_quantity: r.prev }).eq("id", r.id).eq("stock_quantity", r.next)
    }
  }

  for (const item of inv.items) {
    const next = item.stock_before - item.quantity
    const { data, error } = await db
      .from("brand_products")
      .update({ stock_quantity: next })
      .eq("id", item.product_id)
      .eq("stock_quantity", item.stock_before)
      .select("id")
    if (error || !data?.length) {
      await restoreStock()
      return fail(
        error ? `Stock update failed: ${error.message}` : `Stock for "${item.product_name}" just changed. Refresh and try again.`,
        error ? 500 : 409
      )
    }
    reserved.push({ id: item.product_id, prev: item.stock_before, next })
  }

  const { data: invoiceNumber } = await db.rpc("generate_invoice_number")

  const { data: invoice, error: invErr } = await db
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber || `INV-${Date.now()}`,
      brand_id: brandId,
      created_by: auth.actor.id,
      customer_name: text(body?.customer_name),
      customer_phone: text(body?.customer_phone),
      subtotal: inv.subtotal,
      discount_amount: inv.discount,
      total_amount: inv.total,
      ppf_rate: inv.ppfRate,
      ppf_amount: inv.ppfAmount,
      payment_method: paymentMethod,
      status: "paid",
    })
    .select("*")
    .single()

  if (invErr || !invoice) {
    await restoreStock()
    return fail(`Invoice could not be saved: ${invErr?.message || "unknown error"}`, 500)
  }

  const lineItems = inv.items.map(({ stock_before, ...item }) => ({ ...item, invoice_id: invoice.id }))
  const { error: lineErr } = await db.from("invoice_line_items").insert(lineItems)
  if (lineErr) {
    await db.from("invoices").delete().eq("id", invoice.id)
    await restoreStock()
    return fail(`Invoice items could not be saved: ${lineErr.message}`, 500)
  }

  // Audit trail only; a failure here must not undo a completed sale.
  const { error: logErr } = await db.from("product_stock_logs").insert(
    inv.items.map((i) => ({
      product_id: i.product_id,
      brand_id: brandId,
      previous_stock: i.stock_before,
      new_stock: i.stock_before - i.quantity,
      change_amount: -i.quantity,
      change_type: "sale",
      reference_id: invoice.id,
      notes: `POS sale by ${auth.actor.kind} ${auth.actor.name}`,
    }))
  )
  if (logErr) console.error("[pos] stock log insert failed:", logErr.message)

  return NextResponse.json({ invoice: { ...invoice, invoice_line_items: lineItems } })
}
