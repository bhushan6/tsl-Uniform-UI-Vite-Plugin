import { defineConfig } from 'vite'
import threeUniformGui from "../package/index"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    threeUniformGui()
],
})
