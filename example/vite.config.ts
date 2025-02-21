import { defineConfig } from 'vite'
import p from "../package/index"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    p()
],
})
