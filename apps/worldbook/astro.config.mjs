import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://skopunarverk.com",
  base: "/worldbook",
  output: "static",
  trailingSlash: "always",
  outDir: "./dist/worldbook",
  build: {
    format: "directory",
  },
});
