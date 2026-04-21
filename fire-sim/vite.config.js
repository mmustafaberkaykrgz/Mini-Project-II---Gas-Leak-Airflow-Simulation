import { defineConfig } from "vite";

// Vite dev sunucusunu tüm hostlardan erişilebilir yap
// (nginx reverse proxy + farklı domainler için).
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    // Tüm hostlara izin ver (test ve farklı domain'ler için)
    allowedHosts: true,
  },
});

