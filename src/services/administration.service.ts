import { AppError } from "../errors/app-error";
import {
  administrationRepository,
  databaseRoleNames,
  type AdministrationRepository,
} from "../repositories/administration.repository";
import type {
  CreateCategoryInput,
  CreateCourseInput,
  ManagedCourseListQuery,
  SetUserRolesInput,
  UpdateCategoryInput,
  UpdateCourseInput,
  UpsertInstructorInput,
  UserListQuery,
} from "../schemas/administration.schemas";
import type { AppRole, ManagedCourse } from "../types/administration.types";
import { createSlug } from "../utils/slug";

function pagination<T>(records: T[], total: number, page: number, limit: number) {
  return {
    items: records,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

function requireCourse(course: ManagedCourse | null): ManagedCourse {
  if (!course) throw new AppError(404, "COURSE_NOT_FOUND", "El curso solicitado no existe.");
  return course;
}

function validSlug(explicitSlug: string | undefined, title: string): string {
  const slug = explicitSlug ?? createSlug(title);
  if (!slug) throw new AppError(422, "INVALID_SLUG", "No fue posible generar un slug válido.");
  return slug;
}

export function createAdministrationService(repository: AdministrationRepository) {
  async function editableCourse(courseId: string, actorId: string, actorRole: AppRole) {
    const course = requireCourse(await repository.findCourse(courseId));
    if (course.status === "archived") {
      throw new AppError(409, "COURSE_ARCHIVED", "Un curso archivado no se puede modificar.");
    }
    if (actorRole === "instructor") {
      if (!(await repository.isInstructorAssigned(courseId, actorId))) {
        throw new AppError(403, "COURSE_NOT_ASSIGNED", "Solo puedes modificar cursos asignados.");
      }
      if (course.status !== "draft") {
        throw new AppError(409, "COURSE_NOT_EDITABLE", "El curso ya no está en borrador.");
      }
    }
    return course;
  }

  return {
    async listUsers(input: UserListQuery) {
      const result = await repository.listUsers(input);
      return pagination(result.records, result.total, input.page, input.limit);
    },

    async setUserRoles(userId: string, input: SetUserRolesInput, actorId: string) {
      await repository.setUserRoles(
        userId,
        input.roles.map((role) => databaseRoleNames[role]),
        actorId
      );
      const user = await repository.findUser(userId);
      if (!user) throw new AppError(404, "USER_NOT_FOUND", "El usuario solicitado no existe.");
      return user;
    },

    listInstructors() {
      return repository.listInstructors();
    },

    async upsertInstructor(userId: string, input: UpsertInstructorInput, actorId: string) {
      await repository.upsertInstructor(userId, input.specialty, input.experienceYears, actorId);
      const instructor = await repository.findInstructor(userId);
      if (!instructor) {
        throw new AppError(502, "INSTRUCTOR_NOT_AVAILABLE", "No fue posible consultar al instructor.");
      }
      return instructor;
    },

    async createCategory(input: CreateCategoryInput, actorId: string) {
      return repository.createCategory(
        { ...input, slug: validSlug(input.slug, input.name) },
        actorId
      );
    },

    async updateCategory(categoryId: number, input: UpdateCategoryInput, actorId: string) {
      const category = await repository.updateCategory(categoryId, input, actorId);
      if (!category) {
        throw new AppError(404, "CATEGORY_NOT_FOUND", "La categoría solicitada no existe.");
      }
      return category;
    },

    courseOptions() {
      return repository.courseOptions();
    },

    async listCourses(input: ManagedCourseListQuery, instructorId?: string) {
      const result = await repository.listCourses(input, instructorId);
      return pagination(result.records, result.total, input.page, input.limit);
    },

    async createCourse(input: CreateCourseInput, actorId: string) {
      return repository.createCourse(
        { ...input, slug: validSlug(input.slug, input.title) },
        actorId
      );
    },

    async updateCourse(
      courseId: string,
      input: UpdateCourseInput,
      actorId: string,
      actorRole: AppRole
    ) {
      const current = await editableCourse(courseId, actorId, actorRole);
      if (current.status === "published" && input.slug && input.slug !== current.slug) {
        throw new AppError(409, "PUBLISHED_SLUG_IMMUTABLE", "El slug publicado no se puede cambiar.");
      }
      return requireCourse(await repository.updateCourse(courseId, input, actorId));
    },

    async assignPrincipalInstructor(courseId: string, instructorId: string, actorId: string) {
      const course = requireCourse(await repository.findCourse(courseId));
      if (course.status === "archived") {
        throw new AppError(409, "COURSE_ARCHIVED", "No puedes asignar un curso archivado.");
      }
      await repository.assignPrincipalInstructor(courseId, instructorId, actorId);
      return requireCourse(await repository.findCourse(courseId));
    },

    async submitCourse(courseId: string, actorId: string, actorRole: AppRole) {
      const course = await editableCourse(courseId, actorId, actorRole);
      if (course.status !== "draft") {
        throw new AppError(409, "INVALID_COURSE_TRANSITION", "Solo un borrador puede enviarse a revisión.");
      }
      const updated = await repository.transitionCourse(courseId, "draft", "review", actorId);
      if (!updated) throw new AppError(409, "COURSE_STATE_CHANGED", "El curso cambió de estado.");
      return updated;
    },

    async publishCourse(courseId: string, actorId: string) {
      const course = requireCourse(await repository.findCourse(courseId));
      if (course.status !== "review") {
        throw new AppError(409, "INVALID_COURSE_TRANSITION", "Solo un curso en revisión puede publicarse.");
      }
      if (
        !course.instructor ||
        !course.shortDescription ||
        !course.description ||
        course.learningOutcomes.length === 0
      ) {
        throw new AppError(
          422,
          "COURSE_NOT_READY",
          "El curso requiere instructor, descripciones y objetivos antes de publicarse."
        );
      }
      const updated = await repository.transitionCourse(courseId, "review", "published", actorId);
      if (!updated) throw new AppError(409, "COURSE_STATE_CHANGED", "El curso cambió de estado.");
      return updated;
    },

    async archiveCourse(courseId: string, actorId: string) {
      const course = requireCourse(await repository.findCourse(courseId));
      if (course.status === "archived") {
        throw new AppError(409, "INVALID_COURSE_TRANSITION", "El curso ya está archivado.");
      }
      const updated = await repository.transitionCourse(courseId, course.status, "archived", actorId);
      if (!updated) throw new AppError(409, "COURSE_STATE_CHANGED", "El curso cambió de estado.");
      return updated;
    },
  };
}

export const administrationService = createAdministrationService(administrationRepository);
