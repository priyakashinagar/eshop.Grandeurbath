import dns from 'node:dns'
import mongoose from 'mongoose'

// mongodb+srv links need a DNS SRV lookup. On some Windows setups Node's resolver points at 127.0.0.1 with
// nothing listening there (querySrv ECONNREFUSED), so fall back to public DNS. DNS_SERVERS in .env overrides it.
function fixDnsForSrv(uri) {
  if (!uri.startsWith('mongodb+srv://')) return
  const custom = (process.env.DNS_SERVERS || '').split(',').map((s) => s.trim()).filter(Boolean)
  const current = dns.getServers()
  const onlyLoopback = current.length > 0 && current.every((s) => s.startsWith('127.') || s === '::1')
  if (custom.length) dns.setServers(custom)
  else if (onlyLoopback) dns.setServers(['8.8.8.8', '1.1.1.1'])
}

export async function connectDb(uri) {
  if (!uri) throw new Error('MONGODB_URI is not set. Add it to server/.env or run `npm run dev:memory`.')
  if (/<db_username>|<db_password>/.test(uri)) {
    throw new Error('MONGODB_URI in server/.env still has <db_username> / <db_password>. Replace them with your MongoDB Atlas database user and password, and save the file.')
  }
  fixDnsForSrv(uri)
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 })
  return mongoose.connection
}

export const disconnectDb = () => mongoose.disconnect()
