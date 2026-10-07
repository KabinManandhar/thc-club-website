// Run: node --test lib/pos-invoice.test.ts
import assert from "node:assert/strict"
import { test } from "node:test"
import { buildInvoice, type PosProduct } from "./pos-invoice.ts"

const products: PosProduct[] = [
  { id: "a", brand_id: "b1", name: "Mug", sku: "M1", price: 500, stock_quantity: 3, is_active: true },
  { id: "c", brand_id: "b1", name: "Cup", sku: null, price: 199.5, stock_quantity: 10, is_active: true },
  { id: "x", brand_id: "b2", name: "Other", sku: null, price: 10, stock_quantity: 10, is_active: true },
]
const tiers = [
  { min_sales_amount: 0, ppf_rate: 3 },
  { min_sales_amount: 1000, ppf_rate: 5 },
]

test("totals, merged lines and tier pick", () => {
  const inv = buildInvoice("b1", [{ product_id: "a", quantity: 1 }, { product_id: "a", quantity: 1 }, { product_id: "c", quantity: 2 }], products, tiers, 99)
  assert.equal(inv.items.length, 2)
  assert.equal(inv.items[0].quantity, 2)
  assert.equal(inv.subtotal, 1399)
  assert.equal(inv.total, 1300)
  assert.equal(inv.ppfRate, 5)
  assert.equal(inv.ppfAmount, 65)
})

test("rejects bad input", () => {
  assert.throws(() => buildInvoice("b1", [], products, tiers, 0), /empty/)
  assert.throws(() => buildInvoice("b1", [{ product_id: "a", quantity: 4 }], products, tiers, 0), /Only 3/)
  assert.throws(() => buildInvoice("b1", [{ product_id: "x", quantity: 1 }], products, tiers, 0), /does not belong/)
  assert.throws(() => buildInvoice("b1", [{ product_id: "a", quantity: 1.5 }], products, tiers, 0), /whole numbers/)
  assert.throws(() => buildInvoice("b1", [{ product_id: "a", quantity: 1 }], products, tiers, 501), /exceed/)
})

test("falls back to default rate with no tiers", () => {
  assert.equal(buildInvoice("b1", [{ product_id: "a", quantity: 1 }], products, [], 0).ppfRate, 3)
})
