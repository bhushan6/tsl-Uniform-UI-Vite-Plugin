import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const source = path.join(__dirname, "dist");
const destinations = [
  path.join(__dirname, "..", "example", "vanilla", "dist"),
  path.join(__dirname, "..", "example", "react", "dist"),
];

// Remove old dist folder
destinations.forEach((destination) => {
  if (fs.existsSync(destination)) {
    fs.rmSync(destination, { recursive: true, force: true });
    console.log("🗑️  Removed old dist folder");
  }
});

// Copy new dist folder
if (fs.existsSync(source)) {
  destinations.forEach((destination) => {
    fs.cpSync(source, destination, { recursive: true });
  })
  console.log("✅ Dist folder copied to example!");
} else {
  console.error("❌ Source dist folder not found!");
  process.exit(1);
}
