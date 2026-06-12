import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Allow tunnel hosts (localtunnel/ngrok) during development so QR callbacks work
  server: process.env.NODE_ENV === 'production' ? undefined : {
    // You can list specific hosts, e.g. ['mean-emus-yell.loca.lt']
    // or allow all hosts during development with `allowedHosts: true`.
    allowedHosts: true
  }
})
