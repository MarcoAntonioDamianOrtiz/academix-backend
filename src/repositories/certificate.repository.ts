import { supabaseAdmin } from "../config/supabase";
import { AppError } from "../errors/app-error";
import type { CertificateDetail } from "../types/certificate.types";

interface CertificateRow {
  id_certificado: string;
  codigo_certificado: string;
  fecha_emision: string;
  fk_curso: string;
  cursos: {
    titulo: string;
    duracion_estimada_horas: number | string | null;
  } | null;
  usuarios: {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string | null;
  } | null;
}

export interface CertificateRepository {
  listByUser(userId: string): Promise<CertificateDetail[]>;
  findForUser(userId: string, certificateId: string): Promise<CertificateDetail | null>;
  findByCredentialCode(credentialCode: string): Promise<CertificateDetail | null>;
}

function databaseFailure(): AppError {
  return new AppError(502, "DATABASE_ERROR", "No fue posible consultar los certificados.");
}

function serialize(row: CertificateRow): CertificateDetail | null {
  if (!row.cursos || !row.usuarios) return null;
  return {
    id: row.id_certificado,
    courseId: row.fk_curso,
    courseTitle: row.cursos.titulo,
    issuedAt: row.fecha_emision,
    credentialCode: row.codigo_certificado,
    recipientName: [
      row.usuarios.nombres,
      row.usuarios.apellido_paterno,
      row.usuarios.apellido_materno,
    ]
      .filter(Boolean)
      .join(" ")
      .trim(),
    durationHours: Number(row.cursos.duracion_estimada_horas ?? 0),
  };
}

const CERTIFICATE_COLUMNS = [
  "id_certificado",
  "codigo_certificado",
  "fecha_emision",
  "fk_curso",
  "cursos!fk_certificado_curso(titulo,duracion_estimada_horas)",
  "usuarios!fk_certificado_usuario(nombres,apellido_paterno,apellido_materno)",
].join(",");

export const certificateRepository: CertificateRepository = {
  async listByUser(userId) {
    const { data, error } = await supabaseAdmin
      .from("certificados")
      .select(CERTIFICATE_COLUMNS)
      .eq("fk_usuario", userId)
      .eq("activo", true)
      .order("fecha_emision", { ascending: false });
    if (error) throw databaseFailure();
    return ((data ?? []) as unknown as CertificateRow[])
      .map(serialize)
      .filter((certificate): certificate is CertificateDetail => certificate !== null);
  },

  async findForUser(userId, certificateId) {
    const { data, error } = await supabaseAdmin
      .from("certificados")
      .select(CERTIFICATE_COLUMNS)
      .eq("id_certificado", certificateId)
      .eq("fk_usuario", userId)
      .eq("activo", true)
      .maybeSingle();
    if (error) throw databaseFailure();
    return data ? serialize(data as unknown as CertificateRow) : null;
  },

  async findByCredentialCode(credentialCode) {
    const { data, error } = await supabaseAdmin
      .from("certificados")
      .select(CERTIFICATE_COLUMNS)
      .eq("codigo_certificado", credentialCode)
      .eq("activo", true)
      .maybeSingle();
    if (error) throw databaseFailure();
    return data ? serialize(data as unknown as CertificateRow) : null;
  },
};
