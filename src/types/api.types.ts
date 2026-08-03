/**
 * Contrato de respuesta común para toda la API de Academix.
 * Ningún controlador debe devolver un formato distinto a este.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string | string[]>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorResponse;
