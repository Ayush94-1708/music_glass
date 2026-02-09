import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173
  }
})

// export default defineConfig({
//   server: {
//     host: '10.121.108.213',
//     port: 5173
//   }
// })
