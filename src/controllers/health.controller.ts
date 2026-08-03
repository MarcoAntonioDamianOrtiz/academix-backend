import type { Request, Response } from "express";
import { env } from "../config/env";
import { successResponse } from "../utils/api-response";

/**
 * GET /api/v1/health
 *
 * Endpoint público sin autenticación. Sirve para comprobar que
 * academix-backend está vivo, tanto en pruebas manuales como desde
 * academix-frontend (Fase 4).
 *
 * Campos adicionales incluidos (todos seguros de exponer):
 * - environment: útil para confirmar contra qué entorno se está
 *   probando (development/production), sin revelar configuración.
 * - uptime: segundos desde que arrancó el proceso; útil para monitoreo
 *   básico, no expone información sensible.
 * - timestamp: hora del servidor al responder, útil para detectar
 *   problemas de reloj/caché.
 *
 * NO se incluyen: variables de entorno, rutas internas, versión de
 * dependencias, ni ningún dato de configuración o secretos.
 */
export function getHealth(_req: Request, res: Response): void {
  res.status(200).json(
    successResponse({
      status: "ok",
      environment: env.NODE_ENV,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  );
}
