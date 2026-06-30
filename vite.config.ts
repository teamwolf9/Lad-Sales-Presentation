import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standalone dev app. Base is relative so a production build can be dropped
// onto any static host (or later, adapted into an SPFx bundle).
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5174,
    open: true,
    watch: {
      // Don't watch the raw design-system drop, the source zip, or the
      // Playwright browser profile — they're large/locked and crash the file
      // watcher (EBUSY) on Windows.
      ignored: [
        '**/design-system/**',
        '**/*.zip',
        // Regex matches either path separator — globs miss the Windows
        // backslash form of this locked browser-profile dir.
        /[\\/]\.playwright-profile[\\/]/,
      ],
    },
  },
})
