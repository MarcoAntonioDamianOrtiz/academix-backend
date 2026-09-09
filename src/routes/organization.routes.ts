import { Router } from "express";
import {
  createOrganization,
  joinOrganization,
  listOrganizationCourses,
  listOrganizationMembers,
  listOrganizations,
  organizationDetail,
  updateOrganizationMember,
} from "../controllers/organization.controller";
import { requireAuth } from "../middleware/require-auth";

const router = Router();
router.use(requireAuth);
router.get("/", listOrganizations);
router.post("/", createOrganization);
router.post("/join", joinOrganization);
router.get("/:organizationId", organizationDetail);
router.get("/:organizationId/members", listOrganizationMembers);
router.patch("/:organizationId/members/:userId", updateOrganizationMember);
router.get("/:organizationId/courses", listOrganizationCourses);

export default router;
