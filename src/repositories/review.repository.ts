import { supabaseAdmin } from "../config/supabase";
import { AppError } from "../errors/app-error";
import type { CourseReviewStats, ReviewModerationResult } from "../types/review.types";

interface ReviewRow {
  id_resena: string;
  calificacion: number;
  comentario: string;
  visible: boolean;
  motivo_moderacion: string | null;
  fecha_creacion: string;
  inscripciones: {
    fk_curso: string;
    fk_usuario: string;
    usuarios: {
      nombres: string;
      apellido_paterno: string;
      apellido_materno: string | null;
    } | null;
  } | null;
}

export interface ReviewRecord extends ReviewModerationResult {
  courseId: string;
}

export interface ReviewRepository {
  create(userId: string, courseId: string, rating: number, comment: string): Promise<string>;
  findById(reviewId: string): Promise<ReviewRecord | null>;
  listByCourseIds(courseIds: string[]): Promise<ReviewRecord[]>;
  moderate(reviewId: string, visible: boolean, reason: string | undefined, actorId: string): Promise<void>;
}

function databaseFailure(error?: { message?: string; code?: string }): AppError {
  const custom: Record<string, [number, string, string]> = {
    COURSE_COMPLETION_REQUIRED: [
      403,
      "COURSE_COMPLETION_REQUIRED",
      "Debes completar el curso antes de publicar una reseña.",
    ],
    REVIEW_ALREADY_EXISTS: [409, "REVIEW_ALREADY_EXISTS", "Ya publicaste una reseña para este curso."],
    REVIEW_NOT_FOUND: [404, "REVIEW_NOT_FOUND", "La reseña solicitada no existe."],
    ADMIN_REQUIRED: [403, "ROLE_FORBIDDEN", "Se requiere el rol Administrador."],
    INVALID_REVIEW_INPUT: [422, "INVALID_REVIEW_INPUT", "La reseña no cumple las reglas requeridas."],
    INVALID_MODERATION_INPUT: [422, "INVALID_MODERATION_INPUT", "La moderación no es válida."],
  };
  const mapped = error?.message ? custom[error.message] : undefined;
  if (mapped) return new AppError(mapped[0], mapped[1], mapped[2]);
  if (error?.code === "23505") {
    return new AppError(409, "REVIEW_ALREADY_EXISTS", "Ya publicaste una reseña para este curso.");
  }
  return new AppError(502, "DATABASE_ERROR", "No fue posible consultar las reseñas.");
}

function fullName(user: NonNullable<ReviewRow["inscripciones"]>["usuarios"]): string {
  if (!user) return "Estudiante Academix";
  return [user.nombres, user.apellido_paterno, user.apellido_materno]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function serialize(row: ReviewRow): ReviewRecord | null {
  if (!row.inscripciones) return null;
  return {
    id: row.id_resena,
    courseId: row.inscripciones.fk_curso,
    authorId: row.inscripciones.fk_usuario,
    authorName: fullName(row.inscripciones.usuarios),
    rating: row.calificacion,
    comment: row.comentario,
    createdAt: row.fecha_creacion,
    visible: row.visible,
    moderationReason: row.motivo_moderacion,
  };
}

const REVIEW_COLUMNS = [
  "id_resena",
  "calificacion",
  "comentario",
  "visible",
  "motivo_moderacion",
  "fecha_creacion",
  "inscripciones!fk_resena_inscripcion!inner(fk_curso,fk_usuario,usuarios!fk_inscripcion_usuario(nombres,apellido_paterno,apellido_materno))",
].join(",");

export const reviewRepository: ReviewRepository = {
  async create(userId, courseId, rating, comment) {
    const { data, error } = await supabaseAdmin.rpc("academix_create_course_review", {
      p_user_id: userId,
      p_course_id: courseId,
      p_rating: rating,
      p_comment: comment,
    });
    if (error) throw databaseFailure(error);
    const result = data as { reviewId?: string } | null;
    if (!result?.reviewId) throw databaseFailure();
    return result.reviewId;
  },

  async findById(reviewId) {
    const { data, error } = await supabaseAdmin
      .from("resenas_cursos")
      .select(REVIEW_COLUMNS)
      .eq("id_resena", reviewId)
      .eq("activo", true)
      .maybeSingle();
    if (error) throw databaseFailure(error);
    return data ? serialize(data as unknown as ReviewRow) : null;
  },

  async listByCourseIds(courseIds) {
    if (courseIds.length === 0) return [];
    const { data, error } = await supabaseAdmin
      .from("resenas_cursos")
      .select(REVIEW_COLUMNS)
      .eq("activo", true)
      .eq("visible", true)
      .in("inscripciones.fk_curso", courseIds)
      .order("fecha_creacion", { ascending: false });
    if (error) throw databaseFailure(error);
    return ((data ?? []) as unknown as ReviewRow[])
      .map(serialize)
      .filter((review): review is ReviewRecord => review !== null);
  },

  async moderate(reviewId, visible, reason, actorId) {
    const { error } = await supabaseAdmin.rpc("academix_moderate_course_review", {
      p_review_id: reviewId,
      p_visible: visible,
      p_reason: reason ?? null,
      p_actor_user: actorId,
    });
    if (error) throw databaseFailure(error);
  },
};

export function reviewStats(records: ReviewRecord[]): CourseReviewStats {
  if (records.length === 0) return { rating: 0, reviewCount: 0 };
  const average = records.reduce((total, review) => total + review.rating, 0) / records.length;
  return { rating: Math.round(average * 10) / 10, reviewCount: records.length };
}
