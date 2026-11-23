// Runs the API with a temporary in-memory MongoDB and dummy data. Nothing is saved after you stop it.
// Handy for trying the website without installing MongoDB. Use `npm run dev` with MONGODB_URI for real data.
import { MongoMemoryServer } from 'mongodb-memory-server'

const mongo = await MongoMemoryServer.create()
process.env.MONGODB_URI = mongo.getUri()
process.env.ADMIN_EMAIL ||= 'admin@grandeurbath.local'
process.env.ADMIN_PASSWORD ||= 'admin12345'

const { config } = await import('../src/config.js')
const { connectDb } = await import('../src/db.js')
const { seed } = await import('../src/seed/seed.js')
const { createApp } = await import('../src/app.js')

await connectDb(config.mongoUri)
await seed()
createApp().listen(config.port, () => {
  console.log(`\nGrandeur Bath API (in-memory database) on http://localhost:${config.port}/api`)
  console.log(`Admin login: ${process.env.ADMIN_EMAIL} / ${process.env.ADMIN_PASSWORD}  (data resets when you stop this)\n`)
})

const stop = async () => {
  await mongo.stop()
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
