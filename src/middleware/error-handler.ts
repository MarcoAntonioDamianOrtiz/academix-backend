import type { NextFunction, Request, Response } from "express";
import { isProduction } from "../config/env";
import { errorResponse } from "../utils/api-response";

/**
 * Manejador central de errores. Debe registrarse al final, después de
 * `notFound`, para que Express lo reconozca como error handler (firma
 * de 4 argumentos).
 *
 * - En desarrollo: se loggea el error completo en consola para poder
 *   depurar.
 * - En cualquier entorno: la respuesta al cliente NUNCA incluye stack
 *   trace ni detalles internos, solo un mensaje genérico y seguro.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (!isProduction) {
    console.error("[error]", err);
  }

  res
    .status(500)
    .json(errorResponse("INTERNAL_SERVER_ERROR", "Ocurrió un error interno."));
}
