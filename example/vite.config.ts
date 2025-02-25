import { defineConfig } from "vite";
import threeUniformGui from "tsl-uniform-ui-vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [threeUniformGui(true)],
});

