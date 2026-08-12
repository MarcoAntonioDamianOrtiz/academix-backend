import { describe, expect, it, vi } from "vitest";
import type { CertificateRepository } from "../src/repositories/certificate.repository";
import { createCertificateService } from "../src/services/certificate.service";

const certificate = {
  id: "33333333-3333-4333-8333-333333333333",
  courseId: "22222222-2222-4222-8222-222222222222",
  courseTitle: "TypeScript desde cero",
  issuedAt: "2026-08-12T01:00:00.000Z",
  credentialCode: "ACX-2026-ABCDEF123456",
  recipientName: "Ana Pérez",
  durationHours: 12,
};

function repository(overrides: Partial<CertificateRepository> = {}): CertificateRepository {
  return {
    listByUser: vi.fn().mockResolvedValue([]),
    findForUser: vi.fn().mockResolvedValue(null),
    findByCredentialCode: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("servicio de certificados", () => {
  it("lista resúmenes compatibles con el frontend", async () => {
    const service = createCertificateService(
      repository({ listByUser: vi.fn().mockResolvedValue([certificate]) })
    );
    const [result] = await service.listMyCertificates("user-id");
    expect(result).toEqual({
      id: certificate.id,
      courseId: certificate.courseId,
      courseTitle: certificate.courseTitle,
      issuedAt: certificate.issuedAt,
      credentialCode: certificate.credentialCode,
    });
  });

  it("impide consultar certificados ajenos mediante un 404 seguro", async () => {
    const service = createCertificateService(repository());
    await expect(service.getMyCertificate("user-id", certificate.id)).rejects.toMatchObject({
      status: 404,
      code: "CERTIFICATE_NOT_FOUND",
    });
  });

  it("verifica solamente credenciales activas encontradas", async () => {
    const service = createCertificateService(
      repository({ findByCredentialCode: vi.fn().mockResolvedValue(certificate) })
    );
    await expect(service.verifyCertificate(certificate.credentialCode)).resolves.toMatchObject({
      valid: true,
      credentialCode: certificate.credentialCode,
    });
  });
});
