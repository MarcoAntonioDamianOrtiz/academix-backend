import { defineConfig } from "vitest/config";

/**
 * Las pruebas NO deben depender de un .env local (que además está
 * ignorado por Git y no existe tras clonar/descomprimir el proyecto).
 *
 * `test.env` inyecta estas variables en `process.env` únicamente para
 * la ejecución de Vitest, antes de que se importe cualquier módulo de
 * la app (incluyendo src/config/env.ts). Son valores seguros de prueba,
 * no secretos reales.
 */
export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      PORT: "3000",
      FRONTEND_URL: "http://localhost:5173",
    },
  },
});
