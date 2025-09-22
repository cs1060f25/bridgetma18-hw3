import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Minimal config; Tailwind handled via postcss.
export default defineConfig({
  plugins: [react()],
})
