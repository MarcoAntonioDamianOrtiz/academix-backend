import { Router } from "express";
import { getMyProfile, updateMyProfile } from "../controllers/profile.controller";
import { requireAuth } from "../middleware/require-auth";

const router = Router();

router.use(requireAuth);
router.get("/me", getMyProfile);
router.patch("/me", updateMyProfile);

export default router;
