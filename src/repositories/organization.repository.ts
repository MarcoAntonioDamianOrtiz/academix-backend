import { supabaseAdmin } from "../config/supabase";
import { AppError } from "../errors/app-error";
import type { CreateOrganizationInput } from "../schemas/organization.schemas";
import type {
  OrganizationCourseSummary,
  OrganizationMember,
  OrganizationRole,
  OrganizationSummary,
  OrganizationType,
} from "../types/organization.types";

interface MembershipRow {
  fk_organizacion: string;
  fk_usuario: string;
  matricula: string | null;
  rol: string;
  activo: boolean;
  fecha_union: string;
}

interface OrganizationRow {
  id_organizacion: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  tipo: string;
  codigo_union: string;
  activa: boolean;
  fecha_creacion: string;
}

interface MemberUserRow {
  id_usuario: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  correo: string;
}

interface OrganizationCourseRow {
  id_curso: string;
  titulo: string;
  activo: boolean;
  fecha_actualizacion: string;
  fk_estado_curso: number;
}

interface CourseAssignmentRow {
  fk_curso: string;
  fk_usuario: string;
}

function roleFromDatabase(value: string): OrganizationRole {
  const normalized = value.trim().toLowerCase();
  if (normalized === "administrador") return "administrator";
  if (normalized === "instructor") return "instructor";
  return "student";
}

function roleToDatabase(value: OrganizationRole): string {
  if (value === "administrator") return "Administrador";
  if (value === "instructor") return "Instructor";
  return "Estudiante";
}

function typeFromDatabase(value: string): OrganizationType {
  const normalized = value.trim().toLowerCase();
  if (normalized === "universidad") return "university";
  if (normalized === "empresa") return "company";
  return "other";
}

function typeToDatabase(value: OrganizationType): string {
  if (value === "university") return "Universidad";
  if (value === "company") return "Empresa";
  return "Otra";
}

function workflowStatus(value: string | undefined): OrganizationCourseSummary["status"] {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "en revisión") return "review";
  if (normalized === "publicado") return "published";
  if (normalized === "archivado") return "archived";
  if (normalized === "dado de baja por moderación") return "moderated";
  return "draft";
}

function fullName(user: MemberUserRow): string {
  return [user.nombres, user.apellido_paterno, user.apellido_materno]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function databaseError(error?: { code?: string; message?: string }): AppError {
  const custom: Record<string, [number, string, string]> = {
    USER_NOT_FOUND: [404, "USER_NOT_FOUND", "El usuario solicitado no existe."],
    ORGANIZATION_NOT_FOUND: [404, "ORGANIZATION_NOT_FOUND", "La organización no existe."],
    ORGANIZATION_ALREADY_MEMBER: [409, "ORGANIZATION_ALREADY_MEMBER", "Ya perteneces a esta organización."],
    INVALID_STUDENT_NUMBER: [422, "INVALID_STUDENT_NUMBER", "Debes indicar una matrícula válida."],
    STUDENT_NUMBER_ALREADY_USED: [409, "STUDENT_NUMBER_ALREADY_USED", "Esa matrícula ya está vinculada a otro usuario de la organización."],
  };
  const mapped = error?.message ? custom[error.message] : undefined;
  if (mapped) return new AppError(mapped[0], mapped[1], mapped[2]);
  if (error?.code === "23505") {
    return new AppError(409, "DUPLICATE_RECORD", "Ya existe una organización con esos datos.");
  }
  return new AppError(502, "DATABASE_ERROR", "No fue posible consultar la organización.");
}

export interface OrganizationRepository {
  listForUser(userId: string): Promise<OrganizationSummary[]>;
  create(input: CreateOrganizationInput & { slug: string }, userId: string): Promise<string>;
  join(userId: string, joinCode: string, studentNumber: string): Promise<string>;
  findMembership(organizationId: string, userId: string): Promise<MembershipRow | null>;
  listMembers(organizationId: string): Promise<OrganizationMember[]>;
  setMemberRole(organizationId: string, userId: string, role: OrganizationRole): Promise<void>;
  countAdministrators(organizationId: string): Promise<number>;
  listCourses(organizationId: string): Promise<OrganizationCourseSummary[]>;
}

async function organizationsByIds(ids: string[]): Promise<Map<string, OrganizationRow>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabaseAdmin
    .from("organizaciones")
    .select("id_organizacion,nombre,slug,descripcion,tipo,codigo_union,activa,fecha_creacion")
    .in("id_organizacion", ids)
    .eq("activa", true);
  if (error) throw databaseError(error);
  return new Map(
    ((data ?? []) as OrganizationRow[]).map((organization) => [organization.id_organizacion, organization])
  );
}

export const organizationRepository: OrganizationRepository = {
  async listForUser(userId) {
    const { data: membershipsData, error: membershipsError } = await supabaseAdmin
      .from("miembros_organizacion")
      .select("fk_organizacion,fk_usuario,matricula,rol,activo,fecha_union")
      .eq("fk_usuario", userId)
      .eq("activo", true)
      .order("fecha_union", { ascending: true });
    if (membershipsError) throw databaseError(membershipsError);
    const memberships = (membershipsData ?? []) as MembershipRow[];
    if (memberships.length === 0) return [];

    const organizationIds = memberships.map((membership) => membership.fk_organizacion);
    const [organizations, countsResult] = await Promise.all([
      organizationsByIds(organizationIds),
      supabaseAdmin
        .from("miembros_organizacion")
        .select("fk_organizacion")
        .in("fk_organizacion", organizationIds)
        .eq("activo", true),
    ]);
    if (countsResult.error) throw databaseError(countsResult.error);
    const counts = new Map<string, number>();
    for (const row of (countsResult.data ?? []) as Array<{ fk_organizacion: string }>) {
      counts.set(row.fk_organizacion, (counts.get(row.fk_organizacion) ?? 0) + 1);
    }

    return memberships.flatMap((membership) => {
      const organization = organizations.get(membership.fk_organizacion);
      if (!organization) return [];
      const role = roleFromDatabase(membership.rol);
      return [{
        id: organization.id_organizacion,
        name: organization.nombre,
        slug: organization.slug,
        description: organization.descripcion ?? "",
        type: typeFromDatabase(organization.tipo),
        role,
        memberCount: counts.get(organization.id_organizacion) ?? 0,
        joinCode: role === "administrator" ? organization.codigo_union : null,
        createdAt: organization.fecha_creacion,
      }];
    });
  },

  async create(input, userId) {
    const { data, error } = await supabaseAdmin.rpc("academix_create_organization", {
      p_user_id: userId,
      p_name: input.name,
      p_slug: input.slug,
      p_description: input.description,
      p_type: typeToDatabase(input.type),
    });
    if (error) throw databaseError(error);
    if (typeof data !== "string") throw databaseError();
    return data;
  },

  async join(userId, joinCode, studentNumber) {
    const { data, error } = await supabaseAdmin.rpc("academix_join_organization", {
      p_user_id: userId,
      p_join_code: joinCode,
      p_student_number: studentNumber,
    });
    if (error) throw databaseError(error);
    if (typeof data !== "string") throw databaseError();
    return data;
  },

  async findMembership(organizationId, userId) {
    const { data, error } = await supabaseAdmin
      .from("miembros_organizacion")
      .select("fk_organizacion,fk_usuario,matricula,rol,activo,fecha_union")
      .eq("fk_organizacion", organizationId)
      .eq("fk_usuario", userId)
      .eq("activo", true)
      .maybeSingle();
    if (error) throw databaseError(error);
    return (data as MembershipRow | null) ?? null;
  },

  async listMembers(organizationId) {
    const { data: membershipsData, error: membershipsError } = await supabaseAdmin
      .from("miembros_organizacion")
      .select("fk_organizacion,fk_usuario,matricula,rol,activo,fecha_union")
      .eq("fk_organizacion", organizationId)
      .order("fecha_union", { ascending: true });
    if (membershipsError) throw databaseError(membershipsError);
    const memberships = (membershipsData ?? []) as MembershipRow[];
    if (memberships.length === 0) return [];

    const { data: usersData, error: usersError } = await supabaseAdmin
      .from("usuarios")
      .select("id_usuario,nombres,apellido_paterno,apellido_materno,correo")
      .in("id_usuario", memberships.map((membership) => membership.fk_usuario));
    if (usersError) throw databaseError(usersError);
    const users = new Map(
      ((usersData ?? []) as MemberUserRow[]).map((user) => [user.id_usuario, user])
    );
    return memberships.flatMap((membership) => {
      const user = users.get(membership.fk_usuario);
      if (!user) return [];
      return [{
        userId: user.id_usuario,
        fullName: fullName(user),
        email: user.correo,
        studentNumber: membership.matricula,
        role: roleFromDatabase(membership.rol),
        active: membership.activo,
        joinedAt: membership.fecha_union,
      }];
    });
  },

  async setMemberRole(organizationId, userId, role) {
    const { data, error } = await supabaseAdmin
      .from("miembros_organizacion")
      .update({ rol: roleToDatabase(role), fecha_actualizacion: new Date().toISOString() })
      .eq("fk_organizacion", organizationId)
      .eq("fk_usuario", userId)
      .eq("activo", true)
      .select("id_miembro")
      .maybeSingle();
    if (error) throw databaseError(error);
    if (!data) throw new AppError(404, "MEMBER_NOT_FOUND", "El miembro no existe en esta organización.");
  },

  async countAdministrators(organizationId) {
    const { count, error } = await supabaseAdmin
      .from("miembros_organizacion")
      .select("id_miembro", { count: "exact", head: true })
      .eq("fk_organizacion", organizationId)
      .eq("rol", "Administrador")
      .eq("activo", true);
    if (error) throw databaseError(error);
    return count ?? 0;
  },

  async listCourses(organizationId) {
    const { data, error } = await supabaseAdmin
      .from("cursos")
      .select("id_curso,titulo,activo,fecha_actualizacion,fk_estado_curso")
      .eq("fk_organizacion", organizationId)
      .order("fecha_actualizacion", { ascending: false });
    if (error) throw databaseError(error);
    const courses = (data ?? []) as OrganizationCourseRow[];
    if (courses.length === 0) return [];

    const courseIds = courses.map((course) => course.id_curso);
    const stateIds = [...new Set(courses.map((course) => course.fk_estado_curso))];
    const [statesResult, assignmentsResult] = await Promise.all([
      supabaseAdmin.from("estados_curso").select("id_estado_curso,nombre").in("id_estado_curso", stateIds),
      supabaseAdmin
        .from("cursos_instructores")
        .select("fk_curso,fk_usuario")
        .in("fk_curso", courseIds)
        .eq("activo", true)
        .eq("instructor_principal", true),
    ]);
    if (statesResult.error) throw databaseError(statesResult.error);
    if (assignmentsResult.error) throw databaseError(assignmentsResult.error);
    const states = new Map(
      ((statesResult.data ?? []) as Array<{ id_estado_curso: number; nombre: string }>).map((state) => [state.id_estado_curso, state.nombre])
    );
    const assignments = (assignmentsResult.data ?? []) as CourseAssignmentRow[];
    const userIds = [...new Set(assignments.map((assignment) => assignment.fk_usuario))];
    const usersResult = userIds.length
      ? await supabaseAdmin
          .from("usuarios")
          .select("id_usuario,nombres,apellido_paterno,apellido_materno,correo")
          .in("id_usuario", userIds)
      : { data: [], error: null };
    if (usersResult.error) throw databaseError(usersResult.error);
    const users = new Map(
      ((usersResult.data ?? []) as MemberUserRow[]).map((user) => [user.id_usuario, user])
    );
    const assignmentByCourse = new Map(assignments.map((assignment) => [assignment.fk_curso, assignment.fk_usuario]));

    return courses.map((course) => {
      const instructorId = assignmentByCourse.get(course.id_curso);
      const instructor = instructorId ? users.get(instructorId) : undefined;
      return {
        id: course.id_curso,
        title: course.titulo,
        status: workflowStatus(states.get(course.fk_estado_curso)),
        active: course.activo,
        instructor: instructor ? { id: instructor.id_usuario, name: fullName(instructor) } : null,
        updatedAt: course.fecha_actualizacion,
      };
    });
  },

};

export const organizationRoleNames = { roleFromDatabase, roleToDatabase };
