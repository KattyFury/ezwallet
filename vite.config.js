import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { execSync } from 'node:child_process'

// THE VERSION = the first 7 characters of the commit. Used by the Telegram bug reports: knowing which build a user is on
// is what makes it possible to find the code as it was then. Cloudflare Pages provides CF_PAGES_COMMIT_SHA at build time;
// locally we ask git. If both fail (e.g. building from a downloaded zip) → 'dev', and the build must NEVER die over it.
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
