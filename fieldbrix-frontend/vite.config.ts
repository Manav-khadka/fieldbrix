import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Uploaded in protected CI; hidden maps are not referenced by deployed JS.
    sourcemap: 'hidden',
  },
})
