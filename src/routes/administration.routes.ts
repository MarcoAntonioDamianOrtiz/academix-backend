import { Router } from "express";
import {
  archiveCourse,
  assignPrincipalInstructor,
  courseOptions,
  createCategory,
  createCourse,
  listCourses,
  listInstructors,
  listReviews,
  listUsers,
  moderateReview,
  publishCourse,
  setUserRoles,
  updateCategory,
  updateCourse,
  upsertInstructor,
} from "../controllers/administration.controller";
import { requireAuth } from "../middleware/require-auth";
import { requireRole } from "../middleware/require-role";

const router = Router();
router.use(requireAuth, requireRole("admin"));
router.get("/users", listUsers);
router.patch("/users/:userId/roles", setUserRoles);
router.get("/instructors", listInstructors);
router.put("/instructors/:userId", upsertInstructor);
router.post("/categories", createCategory);
router.patch("/categories/:categoryId", updateCategory);
router.get("/course-options", courseOptions);
router.get("/courses", listCourses);
router.post("/courses", createCourse);
router.patch("/courses/:courseId", updateCourse);
router.put("/courses/:courseId/instructor", assignPrincipalInstructor);
router.post("/courses/:courseId/publish", publishCourse);
router.post("/courses/:courseId/archive", archiveCourse);
router.get("/reviews", listReviews);
router.patch("/reviews/:reviewId/moderation", moderateReview);

export default router;
