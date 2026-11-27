import nodemailer from 'nodemailer'
import { config } from './config.js'

let transport = null
const getTransport = () =>
  (transport ??= config.mail.host
    ? nodemailer.createTransport({ host: config.mail.host, port: config.mail.port, secure: config.mail.port === 465, auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined })
    : null)

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`

const layout = (title, body) => `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,sans-serif;color:#1c1c1c">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#161412;color:#d9b25f;padding:16px 20px;border-radius:10px 10px 0 0;font-weight:bold;letter-spacing:2px">GRANDEUR BATH</div>
<div style="background:#fff;padding:20px;border-radius:0 0 10px 10px">
<h2 style="margin:0 0 12px;font-size:20px">${esc(title)}</h2>${body}
<p style="margin-top:24px;font-size:12px;color:#666">${esc(config.company.legal)} · ${esc(config.company.phone)} · ${esc(config.company.email)}</p>
</div></div></body></html>`

// Sends an email; never throws, so a mail problem cannot break an order or a signup
export async function sendMail({ to, subject, html, text }) {
  if (!to) return { sent: false }
  try {
    const t = getTransport()
    if (!t) {
      if (config.env !== 'test') console.log(`\n[email not sent: SMTP_HOST not set]\nTo: ${to}\nSubject: ${subject}\n${text || ''}\n`)
      return { sent: false }
    }
    await t.sendMail({ from: config.mail.from, to, subject, html, text })
    return { sent: true }
  } catch (err) {
    console.error('Email failed:', err.message)
    return { sent: false, error: err.message }
  }
}

const itemsTable = (o) =>
  `<table style="width:100%;border-collapse:collapse;font-size:14px">${o.items
    .map((i) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${esc(i.name)} × ${i.qty}</td><td style="text-align:right;border-bottom:1px solid #eee">${inr(i.price * i.qty)}</td></tr>`)
    .join('')}<tr><td style="padding:8px 0;font-weight:bold">Total</td><td style="text-align:right;font-weight:bold">${inr(o.summary.total)}</td></tr></table>`

const statusText = {
  placed: 'has been placed',
  confirmed: 'is confirmed',
  shipped: 'has been shipped',
  out_for_delivery: 'is out for delivery',
  delivered: 'has been delivered',
  cancelled: 'has been cancelled',
}

export const mails = {
  orderPlaced: (o) =>
    sendMail({
      to: o.customer.email,
      subject: `Order ${o.orderNo} placed`,
      text: `Hi ${o.customer.name}, your order ${o.orderNo} for ${inr(o.summary.total)} is placed. Track it at ${config.websiteUrl}/track-order`,
      html: layout(`Thank you, ${o.customer.name.split(' ')[0]}!`, `<p>Your order <b>${esc(o.orderNo)}</b> is placed (${o.payment === 'cod' ? 'Cash on delivery' : 'Paid online'}).</p>${itemsTable(o)}<p>Deliver to: ${esc(o.address.line1)}, ${esc(o.address.city)}, ${esc(o.address.state)} ${esc(o.address.pincode)}</p><p><a href="${config.websiteUrl}/track-order" style="color:#ae7714">Track your order</a></p>`),
    }),

  orderStatus: (o, note) =>
    sendMail({
      to: o.customer.email,
      subject: `Order ${o.orderNo} ${statusText[o.status] || 'was updated'}`,
      text: `Your order ${o.orderNo} ${statusText[o.status] || 'was updated'}.${note ? ` ${note}` : ''}`,
      html: layout('Order update', `<p>Your order <b>${esc(o.orderNo)}</b> ${statusText[o.status] || 'was updated'}.</p>${note ? `<p>${esc(note)}</p>` : ''}<p><a href="${config.websiteUrl}/track-order" style="color:#ae7714">Track your order</a></p>`),
    }),

  returnUpdate: (o) =>
    sendMail({
      to: o.customer.email,
      subject: `Return request for order ${o.orderNo}: ${o.returnRequest.status}`,
      text: `Your return request for order ${o.orderNo} is ${o.returnRequest.status}.${o.returnRequest.adminNote ? ` ${o.returnRequest.adminNote}` : ''}`,
      html: layout('Return request update', `<p>Your return request for order <b>${esc(o.orderNo)}</b> is <b>${esc(o.returnRequest.status)}</b>.</p>${o.returnRequest.adminNote ? `<p>${esc(o.returnRequest.adminNote)}</p>` : ''}`),
    }),

  passwordReset: (user, link) =>
    sendMail({
      to: user.email,
      subject: 'Reset your Grandeur Bath password',
      text: `Reset your password using this link (valid for 30 minutes): ${link}`,
      html: layout('Reset your password', `<p>We received a request to reset your password. This link is valid for 30 minutes.</p><p><a href="${esc(link)}" style="display:inline-block;background:#ae7714;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Reset password</a></p><p style="font-size:12px;color:#666">If you did not ask for this, you can ignore this email.</p>`),
    }),

  adminNewOrder: (o) =>
    sendMail({
      to: config.mail.adminTo,
      subject: `New order ${o.orderNo}: ${inr(o.summary.total)}`,
      text: `New ${o.payment} order ${o.orderNo} from ${o.customer.name} (${o.customer.mobile}) for ${inr(o.summary.total)}.`,
      html: layout('New order', `<p><b>${esc(o.orderNo)}</b> from ${esc(o.customer.name)} (${esc(o.customer.mobile)}), ${o.payment === 'cod' ? 'COD' : 'paid online'}.</p>${itemsTable(o)}`),
    }),

  adminNewEnquiry: (e) =>
    sendMail({
      to: config.mail.adminTo,
      subject: `New ${e.kind} enquiry from ${e.name}`,
      text: `${e.name} (${e.phone}${e.email ? `, ${e.email}` : ''}) ${e.city ? `from ${e.city} ` : ''}sent a ${e.kind} enquiry. ${e.message || ''}`,
      html: layout('New enquiry', `<p><b>${esc(e.name)}</b> · ${esc(e.phone)} ${e.email ? `· ${esc(e.email)}` : ''}</p><p>${esc(e.message || '')}</p>${e.items?.length ? `<p>Items: ${e.items.map((i) => `${esc(i.name || i.code)} × ${i.qty}`).join(', ')}</p>` : ''}`),
    }),
}
