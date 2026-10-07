import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());

export const registerSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(100),
  password: z.string().min(12).max(1024),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(1024),
});

export const profileUpdateSchema = z
  .object({
    email: emailSchema.optional(),
    name: z.string().trim().min(1).max(100).optional(),
  })
  .strict()
  .refine((value) => value.email !== undefined || value.name !== undefined, {
    message: "Provide at least one profile field to update",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(1024),
    newPassword: z.string().min(12).max(1024),
  })
  .strict()
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
