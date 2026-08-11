import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { isProduction } from "../config/env";
import { AppError } from "../errors/app-error";
import type { ApiErrorFields } from "../types/api.types";
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
  if (err instanceof AppError) {
    res.status(err.status).json(errorResponse(err.code, err.message, err.fields));
    return;
  }

  if (err instanceof ZodError) {
    const fields: ApiErrorFields = {};

    for (const issue of err.issues) {
      const field = issue.path.join(".") || "request";
      const current = fields[field];
      fields[field] = current
        ? Array.isArray(current)
          ? [...current, issue.message]
          : [current, issue.message]
        : issue.message;
    }

    res
      .status(422)
      .json(errorResponse("VALIDATION_ERROR", "Los datos enviados no son válidos.", fields));
    return;
  }

  if (isInvalidJsonError(err)) {
    res
      .status(400)
      .json(errorResponse("INVALID_JSON", "El cuerpo de la solicitud no contiene JSON válido."));
    return;
  }

  if (isPayloadTooLargeError(err)) {
    res
      .status(413)
      .json(errorResponse("PAYLOAD_TOO_LARGE", "El cuerpo de la solicitud supera el límite permitido."));
    return;
  }

  if (!isProduction) {
    console.error("[error]", err);
  }

  res
    .status(500)
    .json(errorResponse("INTERNAL_SERVER_ERROR", "Ocurrió un error interno."));
}

function isPayloadTooLargeError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "type" in error &&
    (error as Error & { type?: string }).type === "entity.too.large"
  );
}

function isInvalidJsonError(error: unknown): boolean {
  return (
    error instanceof SyntaxError &&
    "type" in error &&
    (error as SyntaxError & { type?: string }).type === "entity.parse.failed"
  );
}
