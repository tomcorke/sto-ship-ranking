import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/sto-ship-ranking/" : "/",
  plugins: [react()],
  fmt: {},
  lint: { options: { typeAware: true, typeCheck: true } },
}));
