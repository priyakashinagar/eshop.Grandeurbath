// All settings come from environment variables (see .env.example)
const env = process.env

export const config = {
  env: env.NODE_ENV || 'development',
  isProd: env.NODE_ENV === 'production',
  port: Number(env.PORT) || 5000,
  mongoUri: env.MONGODB_URI || '',
  jwtSecret: env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: env.JWT_EXPIRES_IN || '30d',
  corsOrigins: (env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4173').split(',').map((s) => s.trim()).filter(Boolean),
  razorpay: {
    keyId: env.RAZORPAY_KEY_ID || '',
    keySecret: env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET || '',
  },
  // Outgoing email. Without SMTP_HOST, emails are printed to the console instead of being sent.
  mail: {
    host: env.SMTP_HOST || '',
    port: Number(env.SMTP_PORT) || 587,
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.MAIL_FROM || 'Grandeur Bath <no-reply@grandeurbath.com>',
    adminTo: env.ADMIN_NOTIFY_EMAIL || '',
  },
  // Used in emails and invoices to link back to the website and to uploaded images
  websiteUrl: (env.WEBSITE_URL || 'http://localhost:5173').replace(/\/$/, ''),
  publicApiUrl: (env.PUBLIC_API_URL || `http://localhost:${Number(env.PORT) || 5000}`).replace(/\/$/, ''),
  uploadDir: env.UPLOAD_DIR || 'uploads',
  company: {
    name: 'Grandeur Bath',
    legal: 'Ishan Tubes Private Limited',
    gstin: '09AACC19122J1ZE',
    address: '100, Prakash Industrial Estate, Near Raj Bagh Metro Station, Sahibabad, Ghaziabad, Uttar Pradesh',
    phone: '+91 88263 77525',
    email: 'info@grandeurbath.com',
  },
  admin: {
    email: env.ADMIN_EMAIL || '',
    password: env.ADMIN_PASSWORD || '',
  },
  // Default store rules; the admin can change them (stored in the Setting document)
  delivery: { freeAbove: 999, charge: 99, codLimit: 50000, gstRate: 18, returnDays: 7 },
}

export const razorpayEnabled = () => Boolean(config.razorpay.keyId && config.razorpay.keySecret)

// 'test' with rzp_test_ keys, 'live' with rzp_live_ keys, 'mock' without keys (development only)
export const paymentMode = () => (!razorpayEnabled() ? 'mock' : config.razorpay.keyId.startsWith('rzp_test_') ? 'test' : 'live')

if (config.razorpay.keyId && !/^rzp_(test|live)_[A-Za-z0-9]+$/.test(config.razorpay.keyId)) {
  console.warn('RAZORPAY_KEY_ID does not look like a Razorpay key (expected rzp_test_... or rzp_live_...)')
}
if (config.razorpay.keyId && !config.razorpay.keySecret) console.warn('RAZORPAY_KEY_SECRET is empty, online payments stay in mock mode')

if (config.isProd && config.jwtSecret === 'dev-only-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production')
}
