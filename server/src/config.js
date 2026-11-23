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
  },
  admin: {
    email: env.ADMIN_EMAIL || '',
    password: env.ADMIN_PASSWORD || '',
  },
  // Store rules shared with the website
  delivery: { freeAbove: 999, charge: 99, codLimit: 50000, gstRate: 18 },
}

export const razorpayEnabled = () => Boolean(config.razorpay.keyId && config.razorpay.keySecret)

if (config.isProd && config.jwtSecret === 'dev-only-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production')
}
