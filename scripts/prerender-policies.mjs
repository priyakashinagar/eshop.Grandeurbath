// Runs after `vite build`. Writes real HTML for the policy and contact pages into dist/, so payment gateways
// (Razorpay) and search engines can read them without running JavaScript. In a browser, React loads on top
// and shows the normal page. Text comes from scripts/policy-content.json (a copy of the backend's seed content).
import fs from 'node:fs'
import path from 'node:path'

const dist = path.resolve('dist')
const shell = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
const content = JSON.parse(fs.readFileSync(path.resolve('scripts/policy-content.json'), 'utf8'))
const c = content.company
const values = { brand: c.brand, legal: c.legal, phone: c.phone, email: c.email, freeAbove: '999', deliveryCharge: '99', codLimit: '50,000', returnDays: 7 }
const fill = (t) => String(t).replace(/\{(\w+)\}/g, (m, k) => values[k] ?? m)
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch])

const footer = `<p>${esc(c.legal)} (${esc(c.brand)}), ${esc(c.address)}. Phone: ${esc(c.phone)}. Email: <a href="mailto:${esc(c.email)}">${esc(c.email)}</a>. GSTIN: ${esc(c.gstin)}</p>`
const nav = `<nav><a href="/">Home</a> · <a href="/privacy-policy">Privacy Policy</a> · <a href="/terms-and-conditions">Terms and Conditions</a> · <a href="/refund-policy">Cancellations and Refunds</a> · <a href="/shipping-policy">Shipping Policy</a> · <a href="/contact-us">Contact Us</a></nav>`

function page(title, bodyHtml) {
  const article = `<main style="max-width:860px;margin:0 auto;padding:24px 16px;font-family:Arial,sans-serif;line-height:1.6;color:#1c1c1c">${nav}<h1>${esc(title)}</h1>${bodyHtml}<hr>${footer}</main>`
  return shell
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)} | ${esc(c.brand)}</title>`)
    .replace('<div id="root"></div>', `<div id="root">${article}</div>`)
}

const policy = (slug) => content.policies.find((p) => p.slug === slug)
const policyHtml = (p) => p.sections.map((s, i) => `<h2>${i + 1}. ${esc(s.heading)}</h2><p>${esc(fill(s.body))}</p>`).join('')

// Razorpay asks for "Cancellations and Refunds" as one page, so it gets both policies
const refund = policy('return-refund')
const cancel = policy('cancellation')
const pages = {
  'privacy-policy': ['Privacy Policy', policyHtml(policy('privacy'))],
  'terms-and-conditions': ['Terms and Conditions', policyHtml(policy('terms'))],
  terms: ['Terms and Conditions', policyHtml(policy('terms'))],
  'shipping-policy': ['Shipping and Delivery Policy', policyHtml(policy('shipping'))],
  'refund-policy': ['Return and Refund Policy', policyHtml(refund) + `<h2>Cancellations</h2>` + policyHtml(cancel)],
  'cancellation-and-refund': ['Cancellation and Refund Policy', `<h2>Cancellations</h2>${policyHtml(cancel)}<h2>Returns and Refunds</h2>${policyHtml(refund)}`],
  'cancellation-policy': ['Cancellation Policy', policyHtml(cancel)],
  'return-policy': ['Return and Refund Policy', policyHtml(refund)],
  'policy/privacy': ['Privacy Policy', policyHtml(policy('privacy'))],
  'policy/terms': ['Terms and Conditions', policyHtml(policy('terms'))],
  'policy/shipping': ['Shipping and Delivery Policy', policyHtml(policy('shipping'))],
  'policy/return-refund': ['Return and Refund Policy', policyHtml(refund)],
  'policy/cancellation': ['Cancellation Policy', policyHtml(cancel)],
  'contact-us': ['Contact Us', `<p>We are happy to help with orders, delivery, returns and project quotations.</p><ul><li>Phone and WhatsApp: ${esc(c.phone)}</li><li>Email: <a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li><li>Address: ${esc(c.address)}</li><li>Hours: Monday to Saturday, 10 am to 7 pm</li></ul>`],
  contact: ['Contact Us', `<ul><li>Phone and WhatsApp: ${esc(c.phone)}</li><li>Email: <a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li><li>Address: ${esc(c.address)}</li><li>Hours: Monday to Saturday, 10 am to 7 pm</li></ul>`],
}

// privacy-policy.html is served at /privacy-policy because vercel.json has "cleanUrls": true
for (const [route, [title, html]] of Object.entries(pages)) {
  const file = path.join(dist, `${route}.html`)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, page(title, html))
}
console.log(`Pre-rendered ${Object.keys(pages).length} policy and contact pages`)
