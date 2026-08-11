import { AppError } from "../errors/app-error";
import {
  catalogRepository,
  type CatalogRepository,
} from "../repositories/catalog.repository";
import {
  studentRepository,
  type StudentEnrollmentRecord,
  type StudentRepository,
} from "../repositories/student.repository";
import { serializeCourseSummary } from "./catalog.service";
import type { EnrollmentSummary, LearningCourse } from "../types/student.types";
import type { AppRole } from "../types/administration.types";

function normalized(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function percentage(completed: number, total: number): number {
  return total === 0 ? 0 : Math.round((completed / total) * 10_000) / 100;
}

function isCompleted(enrollment: StudentEnrollmentRecord): boolean {
  return normalized(enrollment.databaseStatus) === "finalizada";
}

function hasLearningAccess(enrollment: StudentEnrollmentRecord): boolean {
  return ["activa", "finalizada"].includes(normalized(enrollment.databaseStatus));
}

export function createStudentService(
  repository: StudentRepository,
  courses: CatalogRepository
) {
  async function enrollmentSummary(
    enrollment: StudentEnrollmentRecord
  ): Promise<EnrollmentSummary> {
    const records = await courses.listCoursesByIds([enrollment.courseId]);
    const course = records[0] ? serializeCourseSummary(records[0]) : null;
    if (!course) {
      throw new AppError(404, "COURSE_NOT_AVAILABLE", "El curso inscrito ya no está disponible.");
    }
    return {
      id: enrollment.id,
      course,
      status: isCompleted(enrollment) ? "completed" : "in_progress",
      progressPercentage: percentage(
        enrollment.completedLessons,
        enrollment.totalLessons
      ),
      completedLessons: enrollment.completedLessons,
      totalLessons: enrollment.totalLessons,
      lastAccessedAt: enrollment.lastAccessedAt,
    };
  }

  return {
    async enroll(userId: string, courseId: string): Promise<EnrollmentSummary> {
      await repository.enroll(userId, courseId);
      const enrollment = await repository.findEnrollment(userId, courseId);
      if (!enrollment) {
        throw new AppError(502, "ENROLLMENT_NOT_AVAILABLE", "No fue posible consultar la inscripción.");
      }
      return enrollmentSummary(enrollment);
    },

    async listMyCourses(userId: string): Promise<EnrollmentSummary[]> {
      const enrollments = await repository.listEnrollments(userId);
      if (enrollments.length === 0) return [];
      const records = await courses.listCoursesByIds(
        enrollments.map((enrollment) => enrollment.courseId)
      );
      const courseMap = new Map(
        records
          .map((record) => [record.id, serializeCourseSummary(record)] as const)
          .filter((entry): entry is readonly [string, NonNullable<(typeof entry)[1]>] => Boolean(entry[1]))
      );

      return enrollments.flatMap((enrollment) => {
        const course = courseMap.get(enrollment.courseId);
        return course
          ? [
              {
                id: enrollment.id,
                course,
                status: isCompleted(enrollment) ? ("completed" as const) : ("in_progress" as const),
                progressPercentage: percentage(
                  enrollment.completedLessons,
                  enrollment.totalLessons
                ),
                completedLessons: enrollment.completedLessons,
                totalLessons: enrollment.totalLessons,
                lastAccessedAt: enrollment.lastAccessedAt,
              },
            ]
          : [];
      });
    },

    async getLearningCourse(userId: string, courseId: string): Promise<LearningCourse> {
      const enrollment = await repository.findEnrollment(userId, courseId);
      if (!enrollment) {
        throw new AppError(403, "ENROLLMENT_REQUIRED", "Necesitas inscribirte para acceder al aula.");
      }
      if (!hasLearningAccess(enrollment)) {
        throw new AppError(403, "ENROLLMENT_NOT_ACTIVE", "La inscripción todavía no permite acceder al aula.");
      }

      const [courseRecord, modules, completedIds] = await Promise.all([
        courses.findCourse(courseId),
        repository.listLearningModules(courseId),
        repository.completedLessonIds(enrollment.id),
      ]);
      if (!courseRecord || !courseRecord.instructor) {
        throw new AppError(404, "COURSE_NOT_AVAILABLE", "El curso ya no está disponible.");
      }
      const completed = new Set(completedIds);
      const totalLessons = modules.reduce((total, module) => total + module.lessons.length, 0);
      const completedLessons = modules.reduce(
        (total, module) =>
          total + module.lessons.filter((lesson) => completed.has(lesson.id)).length,
        0
      );

      return {
        id: courseRecord.id,
        title: courseRecord.title,
        instructorName: courseRecord.instructor.fullName,
        progressPercentage: percentage(completedLessons, totalLessons),
        completedLessons,
        totalLessons,
        modules: modules.map((module) => ({
          ...module,
          lessons: module.lessons.map((lesson) => ({
            ...lesson,
            isCompleted: completed.has(lesson.id),
          })),
        })),
      };
    },

    setLessonProgress(
      userId: string,
      lessonId: string,
      completed: boolean
    ): Promise<void> {
      return repository.setLessonProgress(userId, lessonId, completed);
    },

    async getResourceContent(
      userId: string,
      actorRole: AppRole,
      lessonId: string,
      resourceId: string
    ) {
      const file = await repository.findProtectedResource(lessonId, resourceId);
      if (!file) {
        throw new AppError(
          404,
          "RESOURCE_NOT_FOUND",
          "El recurso solicitado no existe o no contiene un archivo."
        );
      }
      const allowed =
        actorRole === "admin" ||
        (actorRole === "instructor" &&
          (await repository.isInstructorAssigned(userId, file.courseId))) ||
        (await repository.hasCourseAccess(userId, file.courseId));
      if (!allowed) {
        throw new AppError(403, "RESOURCE_ACCESS_DENIED", "No tienes acceso a este recurso.");
      }
      return {
        ...file,
        data: await repository.downloadStorageObject(file.storagePath),
      };
    },
  };
}

export const studentService = createStudentService(studentRepository, catalogRepository);
