import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { execSync } from 'node:child_process'

// PHIÊN BẢN = 7 ký tự đầu commit. Dùng cho báo lỗi Telegram: biết user đang chạy bản nào mới
// tra được đúng đoạn code lúc đó. Cloudflare Pages có sẵn biến CF_PAGES_COMMIT_SHA khi build;
// local thì hỏi git. Cả hai đều hỏng (vd tải zip về build) → 'dev', KHÔNG được để build chết.
const commit = (() => {
  if (process.env.CF_PAGES_COMMIT_SHA) return process.env.CF_PAGES_COMMIT_SHA.slice(0, 7)
  try { return execSync('git rev-parse --short=7 HEAD').toString().trim() } catch { return 'dev' }
})()

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(commit) },
  plugins: [
    react(),
    nodePolyfills({
      include: ['util', 'stream', 'buffer', 'events', 'crypto'],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
