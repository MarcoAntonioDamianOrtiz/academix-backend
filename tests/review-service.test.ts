import { describe, expect, it, vi } from "vitest";
import type { ReviewRecord, ReviewRepository } from "../src/repositories/review.repository";
import { createReviewService } from "../src/services/review.service";

const review: ReviewRecord = {
  id: "33333333-3333-4333-8333-333333333333",
  courseId: "22222222-2222-4222-8222-222222222222",
  authorId: "11111111-1111-4111-8111-111111111111",
  authorName: "Ana Pérez",
  rating: 5,
  comment: "Contenido claro y muy completo.",
  createdAt: "2026-08-12T01:00:00.000Z",
  visible: true,
  moderationReason: null,
};

function repository(overrides: Partial<ReviewRepository> = {}): ReviewRepository {
  return {
    create: vi.fn().mockResolvedValue(review.id),
    findById: vi.fn().mockResolvedValue(review),
    listByCourseIds: vi.fn().mockResolvedValue([]),
    moderate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("servicio de reseñas", () => {
  it("crea y devuelve una reseña sin campos internos de moderación", async () => {
    const repo = repository();
    const service = createReviewService(repo);

    const result = await service.createReview(review.authorId, review.courseId, {
      rating: 5,
      comment: review.comment,
    });

    expect(repo.create).toHaveBeenCalledWith(
      review.authorId,
      review.courseId,
      5,
      review.comment
    );
    expect(result).not.toHaveProperty("visible");
    expect(result.authorName).toBe("Ana Pérez");
  });

  it("calcula promedio y cantidad por curso", async () => {
    const service = createReviewService(
      repository({
        listByCourseIds: vi.fn().mockResolvedValue([
          review,
          { ...review, id: "44444444-4444-4444-8444-444444444444", rating: 4 },
        ]),
      })
    );

    const result = await service.statsByCourseIds([review.courseId]);

    expect(result.get(review.courseId)).toEqual({ rating: 4.5, reviewCount: 2 });
  });

  it("devuelve ceros para cursos sin reseñas", async () => {
    const result = await createReviewService(repository()).statsByCourseIds([review.courseId]);
    expect(result.get(review.courseId)).toEqual({ rating: 0, reviewCount: 0 });
  });

  it("modera y conserva el resultado administrativo", async () => {
    const hidden = { ...review, visible: false, moderationReason: "Contenido ofensivo" };
    const repo = repository({ findById: vi.fn().mockResolvedValue(hidden) });
    const result = await createReviewService(repo).moderateReview(
      review.id,
      { visible: false, reason: "Contenido ofensivo" },
      review.authorId
    );
    expect(repo.moderate).toHaveBeenCalled();
    expect(result.visible).toBe(false);
  });
});
