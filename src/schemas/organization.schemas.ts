import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug no es válido.");

export const createOrganizationSchema = z
  .object({
    name: z.string().trim().min(3).max(160),
    slug: slugSchema.optional(),
    description: z.string().trim().max(2000).default(""),
    type: z.enum(["university", "company", "other"]),
  })
  .strict();

export const joinOrganizationSchema = z
  .object({
    joinCode: z.string().trim().toUpperCase().min(6).max(20),
    studentNumber: z.string().trim().min(2).max(80),
  })
  .strict();

export const organizationIdentifierSchema = z.object({
  organizationId: z.string().uuid("El identificador de la organización no es válido."),
});

export const organizationMemberIdentifierSchema = organizationIdentifierSchema.extend({
  userId: z.string().uuid("El identificador del usuario no es válido."),
});

export const updateOrganizationMemberSchema = z
  .object({ role: z.enum(["administrator", "instructor", "student"]) })
  .strict();

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationMemberInput = z.infer<typeof updateOrganizationMemberSchema>;
