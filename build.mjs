// Web dosyalarını www/ klasörüne paketler (Capacitor bu klasörü uygulamaya koyar).
import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";

await mkdir("www", { recursive: true });
await build({
  entryPoints: ["src/main.js"],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  outfile: "www/app.js",
  define: { __APP_BUILD__: JSON.stringify(process.env.APP_BUILD_NUMBER || "0") },
});
await copyFile("src/index.html", "www/index.html");
console.log("www/ hazır");
