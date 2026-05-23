import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { timecardService } from '../services/timecard.service';

export const timecardController = {
  async clockIn(request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await timecardService.clockIn(request.user!.userId);
      return reply.status(201).send({
        message: 'Entrada registrada com sucesso!',
        timecard: result
      });
    } catch (error: any) {
      if (error.message === 'PROFESSIONAL_PROFILE_NOT_FOUND') {
        return reply.status(404).send({ error: 'Perfil profissional não encontrado para este usuário.' });
      }
      if (error.message === 'ALREADY_CLOCKED_IN') {
        return reply.status(400).send({ error: 'Você já registrou a sua entrada hoje.' });
      }
      throw error;
    }
  },

  async clockOut(request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await timecardService.clockOut(request.user!.userId);
      return reply.send({
        message: 'Saída registrada com sucesso!',
        timecard: result
      });
    } catch (error: any) {
      if (error.message === 'PROFESSIONAL_PROFILE_NOT_FOUND') {
        return reply.status(404).send({ error: 'Perfil profissional não encontrado para este usuário.' });
      }
      if (error.message === 'NOT_CLOCKED_IN') {
        return reply.status(400).send({ error: 'Você precisa registrar a entrada de hoje antes de bater a saída.' });
      }
      if (error.message === 'ALREADY_CLOCKED_OUT') {
        return reply.status(400).send({ error: 'Você já registrou a sua saída hoje.' });
      }
      throw error;
    }
  },

  async status(request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await timecardService.getStatus(request.user!.userId);
      return reply.send(result);
    } catch (error: any) {
      if (error.message === 'PROFESSIONAL_PROFILE_NOT_FOUND') {
        return reply.status(404).send({ error: 'Perfil profissional não encontrado.' });
      }
      throw error;
    }
  },

  async getSalonTimecards(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { salonId } = z.object({
        salonId: z.string().uuid('ID do salão inválido')
      }).parse(request.params);

      const { date } = z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido (YYYY-MM-DD)').optional()
      }).parse(request.query);

      const todayStr = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
      const selectedDate = date || todayStr;

      const result = await timecardService.getSalonTimecards(
        salonId,
        selectedDate,
        request.user!.userId
      );

      return reply.send(result);
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return reply.status(404).send({ error: 'Estabelecimento não encontrado.' });
      }
      if (error.message === 'FORBIDDEN') {
        return reply.status(403).send({ error: 'Você não tem permissão para ver os pontos deste salão.' });
      }
      throw error;
    }
  }
};
