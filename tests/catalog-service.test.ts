import { describe, expect, it, vi } from "vitest";
import type {
  CatalogCourseRecord,
  CatalogRepository,
} from "../src/repositories/catalog.repository";
import { createCatalogService } from "../src/services/catalog.service";

const record: CatalogCourseRecord = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "curso-prueba",
  title: "Curso de prueba",
  shortDescription: "Descripción corta",
  description: "Descripción completa",
  objectives: "- Primer objetivo\n- Segundo objetivo",
  requirements: "Navegador;Conexión a internet",
  durationHours: 10,
  price: 125.5,
  certificateEnabled: true,
  category: { id: 1, name: "Programación", slug: "programacion", description: null },
  categoryId: 1,
  levelName: "Intermedio",
  language: "Español",
  instructor: {
    id: "11111111-1111-4111-8111-111111111111",
    fullName: "Ana Pérez",
    specialty: "Desarrollo web",
  },
  modules: [],
};

function repository(overrides: Partial<CatalogRepository> = {}): CatalogRepository {
  return {
    listCategories: vi.fn().mockResolvedValue([]),
    listCourses: vi.fn().mockResolvedValue({ records: [], total: 0 }),
    findCourse: vi.fn().mockResolvedValue(null),
    listRelatedCourses: vi.fn().mockResolvedValue([]),
    findInstructor: vi.fn().mockResolvedValue(null),
    listInstructorCourses: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("servicio de catálogo", () => {
  it("mapea el modelo SQL al contrato del frontend", async () => {
    const service = createCatalogService(
      repository({
        listCourses: vi.fn().mockResolvedValue({ records: [record], total: 1 }),
      })
    );

    const result = await service.listCourses({ page: 1, limit: 12 });

    expect(result.items[0]).toMatchObject({
      id: record.id,
      level: "intermediate",
      price: 125.5,
      rating: 0,
      reviewCount: 0,
    });
    expect(result.pagination).toEqual({ page: 1, limit: 12, total: 1, totalPages: 1 });
  });

  it("convierte objetivos y requisitos de texto en arreglos", async () => {
    const service = createCatalogService(
      repository({
        findCourse: vi.fn().mockResolvedValue(record),
        listRelatedCourses: vi.fn().mockResolvedValue([]),
      })
    );

    const detail = await service.getCourse(record.slug);

    expect(detail.learningOutcomes).toEqual(["Primer objetivo", "Segundo objetivo"]);
    expect(detail.requirements).toEqual(["Navegador", "Conexión a internet"]);
  });

  it("no publica registros sin instructor principal", async () => {
    const service = createCatalogService(
      repository({
        listCourses: vi.fn().mockResolvedValue({
          records: [{ ...record, instructor: null }],
          total: 1,
        }),
      })
    );

    const result = await service.listCourses({ page: 1, limit: 12 });

    expect(result.items).toEqual([]);
  });

  it("devuelve COURSE_NOT_FOUND para un detalle inexistente", async () => {
    const service = createCatalogService(repository());

    await expect(service.getCourse("no-existe")).rejects.toMatchObject({
      status: 404,
      code: "COURSE_NOT_FOUND",
    });
  });
});
