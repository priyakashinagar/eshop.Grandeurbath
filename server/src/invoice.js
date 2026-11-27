import { config } from './config.js'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const money = (n) => (Math.round((n || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Printable GST tax invoice (prices are GST inclusive). Intra-state (UP) orders show CGST + SGST, others IGST.
export function invoiceHtml(o, gstRate, company) {
  const intra = /uttar pradesh/i.test(o.address.state)
  const factor = 1 + gstRate / 100
  const rows = o.items.map((i, n) => {
    const gross = i.price * i.qty
    const taxable = gross / factor
    return { n: n + 1, name: i.name, code: i.code, qty: i.qty, rate: i.price / factor, taxable, tax: gross - taxable, gross }
  })
  const couponOff = o.summary.couponOff || 0
  const taxable = (o.summary.subtotal - couponOff) / factor
  const tax = o.summary.subtotal - couponOff - taxable
  const date = new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
  const c = { ...config.company, ...(company || {}) }

  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(o.invoiceNo || o.orderNo)}</title>
<style>body{font-family:Arial,sans-serif;color:#1c1c1c;margin:24px;font-size:13px}h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin-top:12px}
th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f6f1e6}.r{text-align:right}.muted{color:#666}.grid{display:flex;justify-content:space-between;gap:24px;margin-top:16px}
@media print{button{display:none}}</style></head><body>
<button onclick="print()" style="float:right;padding:8px 14px">Print / Save PDF</button>
<h1>Tax Invoice</h1><p class="muted">${esc(c.legal)} (${esc(c.brand || c.name)})<br>${esc(c.address)}<br>GSTIN: ${esc(c.gstin)} · ${esc(c.phone)}</p>
<div class="grid"><div><b>Bill / Ship to</b><br>${esc(o.customer.name)}<br>${esc(o.address.line1)}${o.address.landmark ? `, ${esc(o.address.landmark)}` : ''}<br>${esc(o.address.city)}, ${esc(o.address.state)} ${esc(o.address.pincode)}<br>+91 ${esc(o.customer.mobile)}${o.address.gstin ? `<br>GSTIN: ${esc(o.address.gstin)}` : ''}</div>
<div class="r">Invoice no: <b>${esc(o.invoiceNo || o.orderNo)}</b><br>Order no: ${esc(o.orderNo)}<br>Date: ${date}<br>Payment: ${o.payment === 'cod' ? 'Cash on delivery' : 'Online (Razorpay)'}</div></div>
<table><thead><tr><th>#</th><th>Item</th><th>SKU</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Taxable</th><th class="r">GST ${gstRate}%</th><th class="r">Amount</th></tr></thead><tbody>
${rows.map((r) => `<tr><td>${r.n}</td><td>${esc(r.name)}</td><td>${esc(r.code)}</td><td class="r">${r.qty}</td><td class="r">${money(r.rate)}</td><td class="r">${money(r.taxable)}</td><td class="r">${money(r.tax)}</td><td class="r">${money(r.gross)}</td></tr>`).join('')}
</tbody></table>
<table style="width:50%;margin-left:auto"><tbody>
${couponOff ? `<tr><td>Coupon ${esc(o.coupon)}</td><td class="r">- ${money(couponOff)}</td></tr>` : ''}
<tr><td>Taxable value</td><td class="r">${money(taxable)}</td></tr>
${intra ? `<tr><td>CGST ${gstRate / 2}%</td><td class="r">${money(tax / 2)}</td></tr><tr><td>SGST ${gstRate / 2}%</td><td class="r">${money(tax / 2)}</td></tr>` : `<tr><td>IGST ${gstRate}%</td><td class="r">${money(tax)}</td></tr>`}
<tr><td>Delivery</td><td class="r">${money(o.summary.shipping)}</td></tr>
<tr><th>Total</th><th class="r">₹ ${money(o.summary.total)}</th></tr></tbody></table>
<p class="muted">This is a computer generated invoice.</p></body></html>`
}
