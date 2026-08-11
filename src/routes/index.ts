import { Router } from "express";
import authRoutes from "./auth.routes";
import authoringRoutes from "./authoring.routes";
import administrationRoutes from "./administration.routes";
import catalogRoutes from "./catalog.routes";
import healthRoutes from "./health.routes";
import instructorRoutes from "./instructor.routes";
import profileRoutes from "./profile.routes";
import studentRoutes from "./student.routes";

/**
 * Punto único donde se registran todos los routers de /api/v1.
 * Cuando agreguemos contact, courses, etc. (fases siguientes), cada
 * uno tendrá su propio archivo de rutas y se registrará aquí, sin
 * tocar app.ts.
 */
const router = Router();

router.use(healthRoutes);
router.use("/auth", authRoutes);
router.use("/authoring", authoringRoutes);
router.use("/admin", administrationRoutes);
router.use("/instructor", instructorRoutes);
router.use(studentRoutes);
router.use(catalogRoutes);
router.use("/users", profileRoutes);

export default router;
