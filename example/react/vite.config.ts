import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import threeUniformGui from "./dist/index.es.js";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    threeUniformGui({ devOnly: false, persistent: true, presets: false, draggable: true }),
    react(),
  ],
})
