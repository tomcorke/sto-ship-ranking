import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";

const BASE = process.env.VITE_BUILD_FOR_PAGES === "1" ? "/sto-ship-ranking/" : "/";

export default defineConfig({
  base: BASE,
  plugins: [react()],
  fmt: {},
  lint: { options: { typeAware: true, typeCheck: true } },
});
