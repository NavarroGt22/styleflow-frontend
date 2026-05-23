import { FastifyRequest, FastifyReply } from 'fastify';
import { aiFinancialService } from '../services/ai-financial.service';

export const aiFinancialController = {
  async getAdvice(
    request: FastifyRequest<{
      Params: { salonId: string };
      Body: { promptType: string; userMessage?: string };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { salonId } = request.params;
      const { promptType, userMessage } = request.body;

      if (!promptType) {
        return reply.status(400).send({ error: 'O parâmetro promptType é obrigatório.' });
      }

      // request.user is set by verifyJwt middleware
      const userId = request.user!.userId;
      const role = request.user!.role;

      const advice = await aiFinancialService.getAiAdvice(salonId, userId, role, promptType, userMessage);
      
      return reply.send({ advice });
    } catch (error: any) {
      if (error.message === 'LOCKED') {
        return reply.status(402).send({ error: 'LOCKED', isLocked: true, message: 'O assistente financeiro IA não está ativado para este estabelecimento.' });
      }
      if (error.message === 'NOT_FOUND') {
        return reply.status(404).send({ error: 'Salão não encontrado.' });
      }
      if (error.message === 'FORBIDDEN') {
        return reply.status(403).send({ error: 'Acesso negado. Você não tem permissão para acessar este salão.' });
      }
      
      console.error('Erro no aiFinancialController:', error);
      return reply.status(500).send({ error: 'Erro interno ao processar conselho financeiro com IA.' });
    }
  }
};
