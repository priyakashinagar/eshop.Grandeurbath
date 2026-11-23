import mongoose from 'mongoose'

export async function connectDb(uri) {
  if (!uri) throw new Error('MONGODB_URI is not set. Add it to server/.env or run `npm run dev:memory`.')
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri)
  return mongoose.connection
}

export const disconnectDb = () => mongoose.disconnect()
