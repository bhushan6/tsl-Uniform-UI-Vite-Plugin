import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const source = path.join(__dirname, "dist");
const destination = path.join(__dirname, "..", "example", "dist");

// Remove old dist folder
if (fs.existsSync(destination)) {
  fs.rmSync(destination, { recursive: true, force: true });
  console.log("🗑️  Removed old dist folder");
}

// Copy new dist folder
if (fs.existsSync(source)) {
  fs.cpSync(source, destination, { recursive: true });
  console.log("✅ Dist folder copied to example!");
} else {
  console.error("❌ Source dist folder not found!");
  process.exit(1);
}
