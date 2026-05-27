import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


export default defineConfig({
  plugins: [react()],
  server: {

    preview: {
      allowedHosts: [
        'coffee-market-dashboard-production-4b88.up.railway.app'
      ]
    }
  }
})