import type { ApiErrorResponse, ApiSuccess } from "../types/api.types";

export function successResponse<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function errorResponse(
  code: string,
  message: string,
  fields?: Record<string, string | string[]>
): ApiErrorResponse {
  return {
    success: false,
    error: { code, message, ...(fields ? { fields } : {}) },
  };
}
