import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { professionalService } from '../services/professional.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const createProfessionalSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  commissionRate: z.coerce.number().min(0).max(100, "Comissão deve ser entre 0 e 100"),
  salonId: z.string().uuid(),
  workStart: z.string().optional().default("09:00"),
  workEnd: z.string().optional().default("18:00"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres").optional()
});

const updateProfessionalSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
  phone: z.string().optional(),
  commissionRate: z.coerce.number().min(0).max(100, "Comissão deve ser entre 0 e 100").optional(),
  workStart: z.string().optional(),
  workEnd: z.string().optional(),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres").optional()
});

export const professionalController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createProfessionalSchema.parse(request.body);
    try {
      const result = await professionalService.createProfessional(data, request.user!.userId);
      return reply.status(201).send(result);
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED_SALON') return reply.status(403).send({ error: 'Você não é o dono deste salão.' });
      if (error.message === 'EMAIL_ALREADY_EXISTS') return reply.status(400).send({ error: 'Este email já está em uso.' });
      throw error;
    }
  },

  async get(request: FastifyRequest, reply: FastifyReply) {
    const { salonId } = z.object({ salonId: z.string().uuid() }).parse(request.params);
    const professionals = await professionalService.getSalonProfessionals(salonId);
    return reply.send(professionals);
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const data = updateProfessionalSchema.parse(request.body);
      const result = await professionalService.updateProfessional(id, data, request.user!.userId);
      return reply.send(result);
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ error: 'Profissional não encontrado.' });
      if (error.message === 'FORBIDDEN') return reply.status(403).send({ error: 'Você não tem permissão para editar este profissional.' });
      throw error;
    }
  },

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      await professionalService.deleteProfessional(id, request.user!.userId);
      return reply.send({ message: 'Profissional excluído com sucesso.' });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ error: 'Profissional não encontrado.' });
      if (error.message === 'FORBIDDEN') return reply.status(403).send({ error: 'Você não tem permissão para excluir este profissional.' });
      throw error;
    }
  },

  async updateMyQueueMode(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { queueMode } = z.object({
        queueMode: z.boolean()
      }).parse(request.body);

      const userId = request.user!.userId;
      
      const profile = await prisma.professionalProfile.findUnique({
        where: { userId }
      });

      if (!profile) {
        return reply.status(404).send({ error: 'Perfil profissional não encontrado.' });
      }

      const updated = await prisma.professionalProfile.update({
        where: { id: profile.id },
        data: { queueMode }
      });

      return reply.send({
        message: 'Preferência de agenda atualizada com sucesso!',
        profile: updated
      });
    } catch (error: any) {
      throw error;
    }
  }
};
