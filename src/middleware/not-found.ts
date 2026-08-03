import type { Request, Response } from "express";
import { errorResponse } from "../utils/api-response";

/**
 * Se registra DESPUÉS de todas las rutas conocidas. Cualquier request
 * que llegue hasta aquí no coincidió con ningún endpoint real.
 */
export function notFound(_req: Request, res: Response): void {
  res
    .status(404)
    .json(errorResponse("NOT_FOUND", "El recurso solicitado no existe."));
}
