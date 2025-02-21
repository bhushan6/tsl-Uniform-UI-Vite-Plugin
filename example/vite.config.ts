import { defineConfig } from 'vite'
import threeUniformGuiPlugin from "../package/index"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    threeUniformGuiPlugin()
],
})
