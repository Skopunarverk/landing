import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://skopunarverk.com",
  base: "/sevara",
  output: "static",
  trailingSlash: "always",
  outDir: "./dist/sevara",
  build: {
    format: "directory",
  },
});
