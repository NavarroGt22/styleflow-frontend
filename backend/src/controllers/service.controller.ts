import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { catalogService } from '../services/service.service';

const createServiceSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Preço deve ser maior que zero"),
  duration: z.coerce.number().positive("Duração deve ser maior que zero"),
  salonId: z.string().uuid(),
  isActive: z.boolean().optional()
});

export const serviceController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = createServiceSchema.parse(request.body);
    try {
      const service = await catalogService.createService(data, request.user!.userId);
      return reply.status(201).send(service);
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED_SALON') {
        return reply.status(403).send({ error: 'Acesso negado: Você não tem permissão para criar serviços neste estabelecimento.' });
      }
      throw error;
    }
  },

  async get(request: FastifyRequest, reply: FastifyReply) {
    const { salonId } = z.object({ salonId: z.string().uuid() }).parse(request.params);
    // Para donos, buscamos todos os serviços. Para clientes, apenas os ativos.
    // Como a rota de get é pública, catalogService.getSalonServices traz só os ativos.
    // Vamos adicionar uma pequena alteração no backend futuro se precisar.
    const services = await catalogService.getSalonServices(salonId);
    return reply.send(services);
  },

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      // partial() permite enviar apenas o campo que queremos atualizar (ex: isActive)
      const data = createServiceSchema.partial().parse(request.body);
      const service = await catalogService.updateService(id, data, request.user!.userId);
      return reply.send(service);
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED_SALON') return reply.status(403).send({ error: 'Acesso negado.' });
      throw error;
    }
  },

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      await catalogService.deleteService(id, request.user!.userId);
      return reply.send({ message: 'Deletado com sucesso' });
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED_SALON') return reply.status(403).send({ error: 'Acesso negado.' });
      throw error;
    }
  }
};
