import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// /api and uploaded images go to the Express backend in ./server during development.
// API_PROXY lets you point at another backend, e.g. API_PROXY=http://localhost:5100 npm run dev
const target = process.env.API_PROXY || 'http://localhost:5000'
const proxy = { '/api': target, '/uploads': target }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy },
  preview: { proxy },
})
