import { Router } from "express";
import { createCourseReview } from "../controllers/review.controller";
import { requireAuth } from "../middleware/require-auth";

const router = Router();

router.post("/courses/:courseId/reviews", requireAuth, createCourseReview);

export default router;
