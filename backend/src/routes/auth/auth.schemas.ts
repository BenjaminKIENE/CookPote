import { z } from 'zod';

const PASSWORD_RULES = z.string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
  .max(128, 'Le mot de passe est trop long.')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule.')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre.');

export const registerSchema = z.object({
  email: z.string().email('Email invalide.').max(255),
  password: PASSWORD_RULES,
  pseudo: z.string()
    .min(2, 'Le pseudo doit contenir au moins 2 caractères.')
    .max(30, 'Le pseudo ne doit pas dépasser 30 caractères.')
    .regex(/^[a-zA-Z0-9_\-]+$/, 'Le pseudo ne peut contenir que des lettres, chiffres, _ et -.'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: PASSWORD_RULES,
});

export const verify2FASchema = z.object({
  code: z.string().length(6, 'Le code doit contenir 6 chiffres.').regex(/^\d{6}$/),
  tempToken: z.string().min(1),
});

export const enable2FASchema = z.object({
  code: z.string().length(6, 'Le code doit contenir 6 chiffres.').regex(/^\d{6}$/),
});

export const disable2FASchema = z.object({
  password: z.string().min(1, 'Le mot de passe est requis.'),
});

export type RegisterBody = z.infer<typeof registerSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type Verify2FABody = z.infer<typeof verify2FASchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>;
export type Enable2FABody = z.infer<typeof enable2FASchema>;
export type Disable2FABody = z.infer<typeof disable2FASchema>;
