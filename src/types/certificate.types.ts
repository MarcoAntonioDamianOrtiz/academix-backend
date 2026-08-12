export interface CertificateSummary {
  id: string;
  courseId: string;
  courseTitle: string;
  issuedAt: string;
  credentialCode: string;
}

export interface CertificateDetail extends CertificateSummary {
  recipientName: string;
  durationHours: number;
}

export interface VerifiedCertificate extends CertificateDetail {
  valid: true;
}
