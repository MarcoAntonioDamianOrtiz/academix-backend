import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";
import {
  certificateIdentifierSchema,
  credentialCodeSchema,
} from "../schemas/certificate.schemas";
import { certificateService } from "../services/certificate.service";
import { successResponse } from "../utils/api-response";

function userId(req: Request): string {
  if (!req.auth) throw new AppError(401, "AUTH_REQUIRED", "Debes iniciar sesión.");
  return req.auth.user.id;
}

export async function listMyCertificates(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(successResponse(await certificateService.listMyCertificates(userId(req))));
  } catch (error) {
    next(error);
  }
}

export async function getMyCertificate(req: Request, res: Response, next: NextFunction) {
  try {
    const { certificateId } = certificateIdentifierSchema.parse(req.params);
    res.json(
      successResponse(await certificateService.getMyCertificate(userId(req), certificateId))
    );
  } catch (error) {
    next(error);
  }
}

export async function verifyCertificate(req: Request, res: Response, next: NextFunction) {
  try {
    const { credentialCode } = credentialCodeSchema.parse(req.params);
    res.json(successResponse(await certificateService.verifyCertificate(credentialCode)));
  } catch (error) {
    next(error);
  }
}
