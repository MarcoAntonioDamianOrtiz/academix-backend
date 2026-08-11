import { z } from "zod";

export const enrollmentCourseIdentifierSchema = z.object({
  courseId: z.string().uuid("El identificador del curso no es válido."),
});

export const lessonIdentifierSchema = z.object({
  lessonId: z.string().uuid("El identificador de la lección no es válido."),
});

export const updateLessonProgressSchema = z
  .object({ completed: z.boolean() })
  .strict();
