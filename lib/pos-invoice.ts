// Pure invoice math for the POS. Runs server-side so prices, stock and fees
// come from the database, never from the browser.

export interface PosCartLine {
  product_id: string
  quantity: number
}

export interface PosProduct {
  id: string
  brand_id: string
  name: string
  sku: string | null
  price: number
  stock_quantity: number
  is_active: boolean
}

export interface PpfTierLite {
  min_sales_amount: number
  ppf_rate: number
}

export interface BuiltInvoiceItem {
  product_id: string
  product_name: string
  product_sku: string | null
  unit_price: number
  quantity: number
  line_total: number
  stock_before: number
}

export interface BuiltInvoice {
  subtotal: number
  discount: number
  total: number
  ppfRate: number
  ppfAmount: number
  items: BuiltInvoiceItem[]
}

const DEFAULT_PPF_RATE = 3
const round2 = (n: number) => Math.round(n * 100) / 100

export function buildInvoice(
  brandId: string,
  lines: PosCartLine[],
  products: PosProduct[],
  tiers: PpfTierLite[],
  discountInput: number
): BuiltInvoice {
  if (!brandId) throw new Error("Select a brand.")
  if (lines.length === 0) throw new Error("Cart is empty.")

  // Merge duplicate product lines so stock checks see the real quantity.
  const qtyById = new Map<string, number>()
  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new Error("Quantities must be whole numbers above zero.")
    }
    qtyById.set(line.product_id, (qtyById.get(line.product_id) || 0) + line.quantity)
  }

  const items: BuiltInvoiceItem[] = []
  for (const [productId, quantity] of qtyById) {
    const p = products.find((x) => x.id === productId)
    if (!p) throw new Error("A product in the cart no longer exists.")
    if (p.brand_id !== brandId) throw new Error(`"${p.name}" does not belong to the selected brand.`)
    if (!p.is_active) throw new Error(`"${p.name}" is not active.`)
    const price = Number(p.price)
    const stock = Number(p.stock_quantity)
    if (!(price >= 0)) throw new Error(`"${p.name}" has an invalid price.`)
    if (quantity > stock) throw new Error(`Only ${stock} of "${p.name}" left in stock.`)
    items.push({
      product_id: p.id,
      product_name: p.name,
      product_sku: p.sku || null,
      unit_price: price,
      quantity,
      line_total: round2(price * quantity),
      stock_before: stock,
    })
  }

  const subtotal = round2(items.reduce((s, i) => s + i.line_total, 0))
  const discount = Number.isFinite(discountInput) ? round2(discountInput) : 0
  if (discount < 0) throw new Error("Discount cannot be negative.")
  if (discount > subtotal) throw new Error("Discount cannot exceed the subtotal.")
  const total = round2(subtotal - discount)

  // Highest tier whose threshold the total meets; else the lowest tier; else default.
  const desc = [...tiers].sort((a, b) => b.min_sales_amount - a.min_sales_amount)
  const tier = desc.find((t) => total >= t.min_sales_amount) || desc[desc.length - 1]
  const ppfRate = tier ? Number(tier.ppf_rate) : DEFAULT_PPF_RATE

  return { subtotal, discount, total, ppfRate, ppfAmount: round2(total * (ppfRate / 100)), items }
}
