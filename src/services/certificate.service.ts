import { AppError } from "../errors/app-error";
import {
  certificateRepository,
  type CertificateRepository,
} from "../repositories/certificate.repository";
import type {
  CertificateDetail,
  CertificateSummary,
  VerifiedCertificate,
} from "../types/certificate.types";

function summary(certificate: CertificateDetail): CertificateSummary {
  const { recipientName: _recipientName, durationHours: _durationHours, ...result } = certificate;
  return result;
}

export function createCertificateService(repository: CertificateRepository) {
  return {
    async listMyCertificates(userId: string): Promise<CertificateSummary[]> {
      return (await repository.listByUser(userId)).map(summary);
    },

    async getMyCertificate(userId: string, certificateId: string): Promise<CertificateDetail> {
      const certificate = await repository.findForUser(userId, certificateId);
      if (!certificate) {
        throw new AppError(404, "CERTIFICATE_NOT_FOUND", "El certificado solicitado no existe.");
      }
      return certificate;
    },

    async verifyCertificate(credentialCode: string): Promise<VerifiedCertificate> {
      const certificate = await repository.findByCredentialCode(credentialCode);
      if (!certificate) {
        throw new AppError(404, "CERTIFICATE_NOT_FOUND", "El certificado no existe o fue revocado.");
      }
      return { ...certificate, valid: true };
    },
  };
}

export const certificateService = createCertificateService(certificateRepository);
