import { Router } from "express";
import {
  me,
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  updatePassword,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/require-auth";

const router = Router();

router.post("/register", signUp);
router.post("/login", signIn);
router.post("/password-reset", requestPasswordReset);
router.patch("/password", requireAuth, updatePassword);
router.get("/me", requireAuth, me);
router.post("/logout", requireAuth, signOut);

export default router;
