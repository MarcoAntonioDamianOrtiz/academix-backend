import { AppError } from "../errors/app-error";
import {
  organizationRepository,
  organizationRoleNames,
  type OrganizationRepository,
} from "../repositories/organization.repository";
import type {
  CreateOrganizationInput,
  UpdateOrganizationMemberInput,
} from "../schemas/organization.schemas";
import { createSlug } from "../utils/slug";

function validSlug(explicit: string | undefined, name: string): string {
  const slug = explicit ?? createSlug(name);
  if (!slug) throw new AppError(422, "INVALID_SLUG", "No fue posible generar un slug válido.");
  return slug;
}

export function createOrganizationService(repository: OrganizationRepository) {
  async function requireMember(organizationId: string, userId: string) {
    const membership = await repository.findMembership(organizationId, userId);
    if (!membership) {
      throw new AppError(403, "ORGANIZATION_ACCESS_DENIED", "No perteneces a esta organización.");
    }
    return membership;
  }

  async function requireAdministrator(organizationId: string, userId: string) {
    const membership = await requireMember(organizationId, userId);
    if (organizationRoleNames.roleFromDatabase(membership.rol) !== "administrator") {
      throw new AppError(403, "ORGANIZATION_ADMIN_REQUIRED", "Se requiere administrar esta organización.");
    }
    return membership;
  }

  return {
    listForUser(userId: string) {
      return repository.listForUser(userId);
    },

    async create(input: CreateOrganizationInput, userId: string) {
      const id = await repository.create({ ...input, slug: validSlug(input.slug, input.name) }, userId);
      const organization = (await repository.listForUser(userId)).find((item) => item.id === id);
      if (!organization) throw new AppError(502, "ORGANIZATION_NOT_AVAILABLE", "No fue posible consultar la organización recién creada.");
      return organization;
    },

    async join(userId: string, joinCode: string, studentNumber: string) {
      const id = await repository.join(userId, joinCode, studentNumber);
      const organization = (await repository.listForUser(userId)).find((item) => item.id === id);
      if (!organization) throw new AppError(502, "ORGANIZATION_NOT_AVAILABLE", "No fue posible consultar la organización.");
      return organization;
    },

    async detail(organizationId: string, userId: string) {
      await requireMember(organizationId, userId);
      const organization = (await repository.listForUser(userId)).find((item) => item.id === organizationId);
      if (!organization) throw new AppError(404, "ORGANIZATION_NOT_FOUND", "La organización no existe.");
      return organization;
    },

    async listMembers(organizationId: string, userId: string) {
      await requireAdministrator(organizationId, userId);
      return repository.listMembers(organizationId);
    },

    async setMemberRole(
      organizationId: string,
      targetUserId: string,
      input: UpdateOrganizationMemberInput,
      actorId: string
    ) {
      await requireAdministrator(organizationId, actorId);
      const target = await requireMember(organizationId, targetUserId);
      const currentRole = organizationRoleNames.roleFromDatabase(target.rol);
      if (currentRole === "administrator" && input.role !== "administrator") {
        const administrators = await repository.countAdministrators(organizationId);
        if (administrators <= 1) {
          throw new AppError(409, "LAST_ORGANIZATION_ADMIN", "La organización debe conservar al menos un administrador.");
        }
      }
      await repository.setMemberRole(organizationId, targetUserId, input.role);
      return (await repository.listMembers(organizationId)).find((member) => member.userId === targetUserId) ?? null;
    },

    async listCourses(organizationId: string, userId: string) {
      await requireMember(organizationId, userId);
      return repository.listCourses(organizationId);
    },

    async canInstructorCreateCourse(organizationId: string, userId: string) {
      const membership = await requireMember(organizationId, userId);
      const role = organizationRoleNames.roleFromDatabase(membership.rol);
      if (role !== "administrator" && role !== "instructor") {
        throw new AppError(403, "ORGANIZATION_INSTRUCTOR_REQUIRED", "Tu rol en la organización no permite crear cursos.");
      }
      return true;
    },
  };
}

export const organizationService = createOrganizationService(organizationRepository);
