import { Router } from "express";
import {
  listInstructorManagedCourses,
  submitInstructorCourse,
  updateInstructorCourse,
} from "../controllers/instructor.controller";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";

const router = Router();
router.use(requireAuth, requireRole("instructor"));
router.get("/courses", listInstructorManagedCourses);
router.patch("/courses/:courseId", updateInstructorCourse);
router.post("/courses/:courseId/submit", submitInstructorCourse);

export default router;
