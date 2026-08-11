import { describe, expect, it, vi } from "vitest";
import type { AdministrationRepository } from "../src/repositories/administration.repository";
import { createAdministrationService } from "../src/services/administration.service";
import type { ManagedCourse } from "../src/types/administration.types";

const course: ManagedCourse = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "curso-prueba",
  title: "Curso de prueba",
  shortDescription: "Descripción corta",
  description: "Descripción completa",
  learningOutcomes: ["Aprender"],
  requirements: [],
  targetAudience: "Estudiantes",
  categoryId: 1,
  level: "beginner",
  modality: "self_paced",
  language: "es",
  durationHours: 8,
  price: 0,
  certificateEnabled: true,
  requiresApproval: false,
  status: "draft",
  active: true,
  instructor: { id: "11111111-1111-4111-8111-111111111111", name: "Ana Pérez" },
  publishedAt: null,
  createdAt: "2026-08-11T00:00:00.000Z",
  updatedAt: "2026-08-11T00:00:00.000Z",
};

function repository(overrides: Partial<AdministrationRepository> = {}): AdministrationRepository {
  return {
    listUsers: vi.fn().mockResolvedValue({ records: [], total: 0 }),
    setUserRoles: vi.fn().mockResolvedValue(undefined),
    findUser: vi.fn().mockResolvedValue(null),
    listInstructors: vi.fn().mockResolvedValue([]),
    upsertInstructor: vi.fn().mockResolvedValue(undefined),
    findInstructor: vi.fn().mockResolvedValue(null),
    createCategory: vi.fn(),
    updateCategory: vi.fn().mockResolvedValue(null),
    courseOptions: vi.fn(),
    listCourses: vi.fn().mockResolvedValue({ records: [], total: 0 }),
    findCourse: vi.fn().mockResolvedValue(course),
    createCourse: vi.fn().mockResolvedValue(course),
    updateCourse: vi.fn().mockResolvedValue(course),
    assignPrincipalInstructor: vi.fn().mockResolvedValue(undefined),
    isInstructorAssigned: vi.fn().mockResolvedValue(true),
    transitionCourse: vi.fn().mockResolvedValue({ ...course, status: "review" }),
    ...overrides,
  };
}

describe("servicio administrativo", () => {
  it("genera un slug estable al crear un curso", async () => {
    const repo = repository();
    const service = createAdministrationService(repo);
    await service.createCourse(
      {
        title: "Introducción a TypeScript",
        shortDescription: "",
        description: "",
        learningOutcomes: [],
        requirements: [],
        targetAudience: "",
        categoryId: 1,
        level: "beginner",
        modality: "self_paced",
        language: "es",
        durationHours: null,
        price: 0,
        certificateEnabled: true,
        requiresApproval: false,
      },
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    );
    expect(repo.createCourse).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "introduccion-a-typescript" }),
      expect.any(String)
    );
  });

  it("impide que un instructor edite un curso ajeno", async () => {
    const service = createAdministrationService(
      repository({ isInstructorAssigned: vi.fn().mockResolvedValue(false) })
    );
    await expect(
      service.updateCourse(course.id, { title: "Cambio" }, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "instructor")
    ).rejects.toMatchObject({ status: 403, code: "COURSE_NOT_ASSIGNED" });
  });

  it("permite enviar a revisión solo el borrador asignado", async () => {
    const repo = repository();
    const service = createAdministrationService(repo);
    const result = await service.submitCourse(
      course.id,
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "instructor"
    );
    expect(result.status).toBe("review");
    expect(repo.transitionCourse).toHaveBeenCalledWith(course.id, "draft", "review", expect.any(String));
  });

  it("rechaza publicar un curso incompleto", async () => {
    const service = createAdministrationService(
      repository({ findCourse: vi.fn().mockResolvedValue({ ...course, status: "review", instructor: null }) })
    );
    await expect(service.publishCourse(course.id, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).rejects.toMatchObject({
      status: 422,
      code: "COURSE_NOT_READY",
    });
  });

  it("detecta una transición concurrente", async () => {
    const service = createAdministrationService(
      repository({
        findCourse: vi.fn().mockResolvedValue({ ...course, status: "review" }),
        transitionCourse: vi.fn().mockResolvedValue(null),
      })
    );
    await expect(service.publishCourse(course.id, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).rejects.toMatchObject({
      status: 409,
      code: "COURSE_STATE_CHANGED",
    });
  });
});
