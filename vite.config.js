import { defineConfig } from 'vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  // ตั้งค่า Base สำหรับ GitHub Pages (เปลี่ยนเป็นชื่อ repository ของคุณ)
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
        accessories: resolve(__dirname, 'accessories.html'),
      },
    },
  },
})
