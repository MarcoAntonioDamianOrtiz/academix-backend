import { Router } from "express";
import healthRoutes from "./health.routes";

/**
 * Punto único donde se registran todos los routers de /api/v1.
 * Cuando agreguemos contact, courses, etc. (fases siguientes), cada
 * uno tendrá su propio archivo de rutas y se registrará aquí, sin
 * tocar app.ts.
 */
const router = Router();

router.use(healthRoutes);

export default router;
