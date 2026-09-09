import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";
import {
  instructorApplicationIdentifierSchema,
  instructorApplicationListQuerySchema,
  resolveInstructorApplicationSchema,
  submitInstructorApplicationSchema,
} from "../schemas/instructor-application.schemas";
import { instructorApplicationService } from "../services/instructor-application.service";
import { successResponse } from "../utils/api-response";

function actor(req: Request) {
  if (!req.auth) throw new AppError(401, "AUTH_REQUIRED", "Debes iniciar sesión.");
  return req.auth.user;
}

function handler(action: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await action(req, res); } catch (error) { next(error); }
  };
}

export const getMyInstructorApplication = handler(async (req, res) => {
  res.json(successResponse(await instructorApplicationService.getMine(actor(req).id)));
});

export const submitInstructorApplication = handler(async (req, res) => {
  const user = actor(req);
  const input = submitInstructorApplicationSchema.parse(req.body);
  res.status(201).json(successResponse(await instructorApplicationService.submit(user.id, user.role, input)));
});

export const listInstructorApplications = handler(async (req, res) => {
  const { status } = instructorApplicationListQuerySchema.parse(req.query);
  res.json(successResponse(await instructorApplicationService.list(status)));
});

export const resolveInstructorApplication = handler(async (req, res) => {
  const { applicationId } = instructorApplicationIdentifierSchema.parse(req.params);
  const input = resolveInstructorApplicationSchema.parse(req.body);
  res.json(successResponse(await instructorApplicationService.resolve(applicationId, input, actor(req).id)));
});
