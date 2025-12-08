import { defineConfig } from "vite";
import threeUniformGui from "./dist/index.es.js";

export default defineConfig({
  plugins: [
    threeUniformGui({ devOnly: false, persistent: true, presets: false }),
  ],
});
