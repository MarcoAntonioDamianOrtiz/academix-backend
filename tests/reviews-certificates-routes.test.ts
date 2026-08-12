import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/auth.service", () => ({
  authService: {
    verifyAccessToken: vi.fn(),
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    requestPasswordReset: vi.fn(),
  },
}));
vi.mock("../src/services/review.service", () => ({
  reviewService: {
    createReview: vi.fn(),
    listCourseReviews: vi.fn(),
    statsByCourseIds: vi.fn(),
    moderateReview: vi.fn(),
  },
}));
vi.mock("../src/services/certificate.service", () => ({
  certificateService: {
    listMyCertificates: vi.fn(),
    getMyCertificate: vi.fn(),
    verifyCertificate: vi.fn(),
  },
}));

import { createApp } from "../src/app";
import { authService } from "../src/services/auth.service";
import { certificateService } from "../src/services/certificate.service";
import { reviewService } from "../src/services/review.service";

const userId = "11111111-1111-4111-8111-111111111111";
const courseId = "22222222-2222-4222-8222-222222222222";
const reviewId = "33333333-3333-4333-8333-333333333333";
const certificateId = "44444444-4444-4444-8444-444444444444";
const student = { id: userId, fullName: "Ana Pérez", email: "ana@example.com", role: "student" as const };
const admin = { ...student, role: "admin" as const };
const app = createApp();

describe("rutas de reseñas y certificados", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exige autenticación para crear una reseña", async () => {
    const response = await request(app)
      .post(`/api/v1/courses/${courseId}/reviews`)
      .send({ rating: 5, comment: "Excelente curso y contenido." });
    expect(response.status).toBe(401);
  });

  it("valida y crea una reseña autenticada", async () => {
    vi.mocked(authService.verifyAccessToken).mockResolvedValue(student);
    vi.mocked(reviewService.createReview).mockResolvedValue({
      id: reviewId,
      authorId: userId,
      authorName: student.fullName,
      rating: 5,
      comment: "Excelente curso y contenido.",
      createdAt: "2026-08-12T01:00:00.000Z",
    });
    const response = await request(app)
      .post(`/api/v1/courses/${courseId}/reviews`)
      .set("Authorization", "Bearer token")
      .send({ rating: 5, comment: "Excelente curso y contenido." });
    expect(response.status).toBe(201);
    expect(response.body.data.rating).toBe(5);
  });

  it("requiere un motivo para ocultar una reseña", async () => {
    vi.mocked(authService.verifyAccessToken).mockResolvedValue(admin);
    const response = await request(app)
      .patch(`/api/v1/admin/reviews/${reviewId}/moderation`)
      .set("Authorization", "Bearer token")
      .send({ visible: false });
    expect(response.status).toBe(422);
    expect(reviewService.moderateReview).not.toHaveBeenCalled();
  });

  it("lista los certificados del usuario autenticado", async () => {
    vi.mocked(authService.verifyAccessToken).mockResolvedValue(student);
    vi.mocked(certificateService.listMyCertificates).mockResolvedValue([]);
    const response = await request(app)
      .get("/api/v1/users/me/certificates")
      .set("Authorization", "Bearer token");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it("valida el identificador al pedir un certificado propio", async () => {
    vi.mocked(authService.verifyAccessToken).mockResolvedValue(student);
    const response = await request(app)
      .get("/api/v1/users/me/certificates/no-es-uuid")
      .set("Authorization", "Bearer token");
    expect(response.status).toBe(422);
  });

  it("verifica públicamente una credencial con formato válido", async () => {
    vi.mocked(certificateService.verifyCertificate).mockResolvedValue({
      id: certificateId,
      courseId,
      courseTitle: "TypeScript desde cero",
      issuedAt: "2026-08-12T01:00:00.000Z",
      credentialCode: "ACX-2026-ABCDEF123456",
      recipientName: student.fullName,
      durationHours: 12,
      valid: true,
    });
    const response = await request(app).get(
      "/api/v1/certificates/verify/acx-2026-abcdef123456"
    );
    expect(response.status).toBe(200);
    expect(response.body.data.valid).toBe(true);
    expect(certificateService.verifyCertificate).toHaveBeenCalledWith(
      "ACX-2026-ABCDEF123456"
    );
  });
});
