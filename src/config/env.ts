import "dotenv/config";
import { z } from "zod";

/**
 * Punto central de lectura/validación de variables de entorno.
 *
 * Regla del proyecto: ningún otro archivo debe leer `process.env`
 * directamente. Todo pasa por aquí para que:
 *  - haya un único lugar que sepa qué variables existen y sus tipos;
 *  - el servidor falle al arrancar (con un mensaje claro) si falta algo
 *    crítico, en vez de fallar más tarde de forma confusa en tiempo de
 *    ejecución.
 */

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_URL: z
    .string({ required_error: "FRONTEND_URL es obligatoria (se usa para configurar CORS)." })
    .url("FRONTEND_URL debe ser una URL válida, ej. http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Variables de entorno inválidas o faltantes en academix-backend:\n");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  console.error("\nRevisa tu archivo .env (usa .env.example como referencia).");
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";