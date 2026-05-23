import { FastifyRequest, FastifyReply } from 'fastify';
import { financialService } from '../services/financial.service';

export const financialController = {
  async getDashboard(request: FastifyRequest<{ Params: { salonId: string } }>, reply: FastifyReply) {
    try {
      const { salonId } = request.params;
      const metrics = await financialService.getDashboardMetrics(salonId, request.user!.userId, request.user!.role);
      return reply.send(metrics);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') return reply.status(403).send({ error: 'Acesso negado.' });
      throw error;
    }
  },

  async closeRegister(request: FastifyRequest<{ Params: { salonId: string } }>, reply: FastifyReply) {
    try {
      const { salonId } = request.params;
      const result = await financialService.closeRegister(salonId, request.user!.userId, request.user!.role);
      return reply.send(result);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') return reply.status(403).send({ error: 'Acesso negado.' });
      throw error;
    }
  }
};
