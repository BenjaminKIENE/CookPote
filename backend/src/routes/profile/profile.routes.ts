import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate.js';
import * as profileService from '../../services/profile.service.js';

const PASSWORD_RULES = z.string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères.')
  .max(128)
  .regex(/[A-Z]/, 'Au moins une majuscule requise.')
  .regex(/[0-9]/, 'Au moins un chiffre requis.');

const updateProfileSchema = z.object({
  pseudo: z.string()
    .min(2).max(30)
    .regex(/^[a-zA-Z0-9_\-]+$/, 'Le pseudo ne peut contenir que des lettres, chiffres, _ et -.')
    .optional(),
  bio: z.string().max(500).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis.'),
  newPassword: PASSWORD_RULES,
});

const requestEmailChangeSchema = z.object({
  newEmail: z.string().email('Email invalide.').max(255),
  password: z.string().min(1, 'Mot de passe requis.'),
});

const confirmEmailChangeSchema = z.object({
  token: z.string().min(1),
  newEmail: z.string().email().max(255),
});

export async function profileRoutes(fastify: FastifyInstance) {

  // ── GET /api/profile/me ───────────────────────────────────────────────────
  fastify.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const profile = await profileService.getMyProfile(request.user.sub);
    if (!profile) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Profil introuvable.' });
    return profile;
  });

  // ── PATCH /api/profile/me ─────────────────────────────────────────────────
  fastify.patch('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: parsed.error.issues[0].message });
    }
    return profileService.updateProfile(request.user.sub, parsed.data);
  });

  // ── POST /api/profile/me/avatar ───────────────────────────────────────────
  fastify.post('/me/avatar', { preHandler: [authenticate] }, async (request, reply) => {
    const data = await (request as any).file();
    if (!data) return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: 'Aucune image fournie.' });

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    return profileService.updateAvatar(request.user.sub, buffer);
  });

  // ── GET /api/profile/me/export  — GDPR data export ───────────────────────
  fastify.get('/me/export', { preHandler: [authenticate] }, async (request, reply) => {
    const data = await profileService.exportUserData(request.user.sub);
    reply.header('Content-Disposition', 'attachment; filename="cookpote-data.json"');
    reply.header('Content-Type', 'application/json');
    return data;
  });

  // ── POST /api/profile/me/change-password ─────────────────────────────────
  fastify.post('/me/change-password', {
    preHandler: [authenticate],
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, async (request, reply) => {
    const parsed = changePasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: parsed.error.issues[0].message });
    }
    await profileService.changePassword(request.user.sub, parsed.data.currentPassword, parsed.data.newPassword);
    return reply.send({ message: 'Mot de passe modifié. Reconnecte-toi sur tes autres appareils.' });
  });

  // ── POST /api/profile/me/request-email-change ────────────────────────────
  fastify.post('/me/request-email-change', {
    preHandler: [authenticate],
    config: { rateLimit: { max: 3, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    const parsed = requestEmailChangeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: parsed.error.issues[0].message });
    }
    await profileService.requestEmailChange(request.user.sub, parsed.data.newEmail, parsed.data.password);
    return reply.send({ message: 'Un email de confirmation a été envoyé à ta nouvelle adresse.' });
  });

  // ── POST /api/profile/me/confirm-email-change ────────────────────────────
  fastify.post('/me/confirm-email-change', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = confirmEmailChangeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message: parsed.error.issues[0].message });
    }
    await profileService.confirmEmailChange(request.user.sub, parsed.data.token, parsed.data.newEmail);
    return reply.send({ message: 'Email mis à jour avec succès.' });
  });

  // ── DELETE /api/profile/me  — Soft delete account ────────────────────────
  fastify.delete('/me', { preHandler: [authenticate] }, async (request, reply) => {
    await profileService.deleteAccount(request.user.sub);
    reply.clearCookie('refreshToken', { path: '/api/auth' });
    return reply.status(204).send();
  });
}
