import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// /api calls go to the Express backend in ./server during development
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': 'http://localhost:5000' } },
  preview: { proxy: { '/api': 'http://localhost:5000' } },
})
