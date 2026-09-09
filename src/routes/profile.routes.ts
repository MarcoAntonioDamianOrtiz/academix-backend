import { Router } from "express";
import { getMyProfile, updateMyProfile } from "../controllers/profile.controller";
import {
  getMyInstructorApplication,
  submitInstructorApplication,
} from "../controllers/instructor-application.controller";
import { requireAuth } from "../middleware/require-auth";

const router = Router();

router.use(requireAuth);
router.get("/me", getMyProfile);
router.patch("/me", updateMyProfile);
router.get("/me/instructor-application", getMyInstructorApplication);
router.post("/me/instructor-application", submitInstructorApplication);

export default router;
