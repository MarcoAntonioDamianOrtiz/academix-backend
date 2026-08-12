import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";
import { courseIdentifierSchema } from "../schemas/catalog.schemas";
import {
  createReviewSchema,
  moderateReviewSchema,
  reviewIdentifierSchema,
} from "../schemas/review.schemas";
import { reviewService } from "../services/review.service";
import { successResponse } from "../utils/api-response";

function actorId(req: Request): string {
  if (!req.auth) throw new AppError(401, "AUTH_REQUIRED", "Debes iniciar sesión.");
  return req.auth.user.id;
}

export async function createCourseReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { courseId } = courseIdentifierSchema.parse(req.params);
    const input = createReviewSchema.parse(req.body);
    res.status(201).json(
      successResponse(await reviewService.createReview(actorId(req), courseId, input))
    );
  } catch (error) {
    next(error);
  }
}

export async function moderateCourseReview(req: Request, res: Response, next: NextFunction) {
  try {
    const { reviewId } = reviewIdentifierSchema.parse(req.params);
    const input = moderateReviewSchema.parse(req.body);
    res.json(
      successResponse(await reviewService.moderateReview(reviewId, input, actorId(req)))
    );
  } catch (error) {
    next(error);
  }
}
