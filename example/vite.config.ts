import { defineConfig } from "vite";
import threeUniformGui from "tsl-uniform-ui-vite-plugin";

export default defineConfig({
  plugins: [threeUniformGui({devOnly: false, persistent: true})],
});

