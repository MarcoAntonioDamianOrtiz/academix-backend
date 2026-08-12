import request from "supertest";
import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../src/errors/app-error";

vi.mock("../src/services/auth.service", () => ({
  authService: {
    verifyAccessToken: vi.fn(),
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    requestPasswordReset: vi.fn(),
  },
}));

vi.mock("../src/services/student.service", () => ({
  studentService: {
    enroll: vi.fn(),
    listMyCourses: vi.fn(),
    getLearningCourse: vi.fn(),
    setLessonProgress: vi.fn(),
    getResourceContent: vi.fn(),
  },
}));

import { createApp } from "../src/app";
import { authService } from "../src/services/auth.service";
import { studentService } from "../src/services/student.service";

const app = createApp();
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  fullName: "Marco Antonio",
  email: "marco@example.com",
  role: "admin" as const,
};
const courseId = "22222222-2222-4222-8222-222222222222";
const lessonId = "33333333-3333-4333-8333-333333333333";

describe("rutas de inscripción y progreso", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exige JWT para listar los cursos del alumno", async () => {
    const response = await request(app).get("/api/v1/users/me/courses");
    expect(response.status).toBe(401);
  });

  it("crea una inscripción y devuelve 201", async () => {
    vi.mocked(authService.verifyAccessToken).mockResolvedValue(user);
    vi.mocked(studentService.enroll).mockResolvedValue({ id: "enrollment-id" } as never);

    const response = await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(201);
    expect(studentService.enroll).toHaveBeenCalledWith(user.id, courseId);
  });

  it("conserva el conflicto de inscripción duplicada", async () => {
    vi.mocked(authService.verifyAccessToken).mockResolvedValue(user);
    vi.mocked(studentService.enroll).mockRejectedValue(
      new AppError(409, "ENROLLMENT_ALREADY_EXISTS", "Ya estás inscrito.")
    );

    const response = await request(app)
      .post(`/api/v1/courses/${courseId}/enrollments`)
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ENROLLMENT_ALREADY_EXISTS");
  });

  it("rechaza identificadores de curso inválidos", async () => {
    vi.mocked(authService.verifyAccessToken).mockResolvedValue(user);
    const response = await request(app)
      .post("/api/v1/courses/no-es-uuid/enrollments")
      .set("Authorization", "Bearer token");
    expect(response.status).toBe(422);
    expect(studentService.enroll).not.toHaveBeenCalled();
  });

  it("devuelve la biblioteca del usuario autenticado", async () => {
    vi.mocked(authService.verifyAccessToken).mockResolvedValue(user);
    vi.mocked(studentService.listMyCourses).mockResolvedValue([]);
    const response = await request(app)
      .get("/api/v1/users/me/courses")
      .set("Authorization", "Bearer token");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(studentService.listMyCourses).toHaveBeenCalledWith(user.id);
  });

  it("obtiene el aula del curso inscrito", async () => {
    vi.mocked(authService.verifyAccessToken).mockResolvedValue(user);
    vi.mocked(studentService.getLearningCourse).mockResolvedValue({
      id: courseId,
      title: "Curso",
      instructorName: "Ana",
      progressPercentage: 0,
      completedLessons: 0,
      totalLessons: 0,
      modules: [],
    });
    const response = await request(app)
      .get(`/api/v1/users/me/courses/${courseId}/learning`)
      .set("Authorization", "Bearer token");
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(courseId);
  });

  it("entrega archivos protegidos sin exponer una URL de Storage", async () => {
    vi.mocked(authService.verifyAccessToken).mockResolvedValue(user);
    vi.mocked(studentService.getResourceContent).mockResolvedValue({
      courseId,
      storagePath: "courses/privado.pdf",
      originalName: "guía.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4,
      stream: Readable.from("PDF!"),
      status: 200,
      contentLength: "4",
      contentRange: null,
    });
    const resourceId = "55555555-5555-4555-8555-555555555555";
    const response = await request(app)
      .get(`/api/v1/lessons/${lessonId}/resources/${resourceId}/content`)
      .set("Authorization", "Bearer token");
    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(studentService.getResourceContent).toHaveBeenCalledWith(
      user.id,
      user.role,
      lessonId,
      resourceId,
      undefined
    );
  });

  it("propaga Range y responde 206 para reproducción parcial", async () => {
    vi.mocked(authService.verifyAccessToken).mockResolvedValue(user);
    vi.mocked(studentService.getResourceContent).mockResolvedValue({
      courseId,
      storagePath: "courses/video.mp4",
      originalName: "video.mp4",
      mimeType: "video/mp4",
      sizeBytes: 1_000,
      stream: Readable.from("VIDEO"),
      status: 206,
      contentLength: "5",
      contentRange: "bytes 100-104/1000",
    });
    const resourceId = "55555555-5555-4555-8555-555555555555";

    const response = await request(app)
      .get(`/api/v1/lessons/${lessonId}/resources/${resourceId}/content`)
      .set("Authorization", "Bearer token")
      .set("Range", "bytes=100-104");

    expect(response.status).toBe(206);
    expect(response.headers["accept-ranges"]).toBe("bytes");
    expect(response.headers["content-range"]).toBe("bytes 100-104/1000");
    expect(response.headers["content-disposition"]).toContain("inline");
    expect(studentService.getResourceContent).toHaveBeenCalledWith(
      user.id,
      user.role,
      lessonId,
      resourceId,
      "bytes=100-104"
    );
  });

  it("actualiza el progreso y devuelve 204", async () => {
    vi.mocked(authService.verifyAccessToken).mockResolvedValue(user);
    vi.mocked(studentService.setLessonProgress).mockResolvedValue(undefined);
    const response = await request(app)
      .patch(`/api/v1/lessons/${lessonId}/progress`)
      .set("Authorization", "Bearer token")
      .send({ completed: true });
    expect(response.status).toBe(204);
    expect(studentService.setLessonProgress).toHaveBeenCalledWith(user.id, lessonId, true);
  });

  it("valida el cuerpo del progreso", async () => {
    vi.mocked(authService.verifyAccessToken).mockResolvedValue(user);
    const response = await request(app)
      .patch(`/api/v1/lessons/${lessonId}/progress`)
      .set("Authorization", "Bearer token")
      .send({ completed: "sí" });
    expect(response.status).toBe(422);
    expect(studentService.setLessonProgress).not.toHaveBeenCalled();
  });
});
