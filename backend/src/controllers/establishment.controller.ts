import { FastifyRequest, FastifyReply } from 'fastify';
import { createEstablishmentSchema, updateEstablishmentSchema } from '../validations/establishment.validation';
import { establishmentService } from '../services/establishment.service';

export const establishmentController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createEstablishmentSchema.parse(request.body);
      const userId = request.user!.userId;

      const salon = await establishmentService.create(data, userId);
      
      return reply.status(201).send(salon);
    } catch (error: any) {
      if (error.message === 'SLUG_IN_USE') return reply.status(409).send({ error: 'Este link já está em uso.' });
      throw error;
    }
  },

  async getAllPublic(request: FastifyRequest, reply: FastifyReply) {
    const salons = await establishmentService.getAllPublic();
    return reply.send(salons);
  },

  async get(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const userId = request.user!.userId;
      const role = request.user!.role;

      const salon = await establishmentService.getById(id, userId, role);
      
      // Filtro de dados de saída (Filter Pattern - Sem retorno excessivo)
      return reply.send({
        id: salon.id,
        name: salon.name,
        slug: salon.slug,
        address: salon.address,
        phone: salon.phone,
        openTime: salon.openTime,
        closeTime: salon.closeTime,
        productCommissionEnabled: salon.productCommissionEnabled,
        productCommissionRate: salon.productCommissionRate,
        instagramUrl: salon.instagramUrl,
        queueMode: salon.queueMode,
        queueAutoAdvance: salon.queueAutoAdvance,
        queueAllowClientView: salon.queueAllowClientView,
        queueNotifyClient: salon.queueNotifyClient,
        queueNotifyAhead: salon.queueNotifyAhead,
        queueAllowSkip: salon.queueAllowSkip,
        queueSkipTimeoutMin: salon.queueSkipTimeoutMin,
        whatsappTemplate: salon.whatsappTemplate,
        whatsappGatewayUrl: salon.whatsappGatewayUrl,
        whatsappGatewayToken: salon.whatsappGatewayToken
      });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ error: 'Estabelecimento não encontrado.' });
      if (error.message === 'FORBIDDEN') return reply.status(403).send({ error: 'Acesso negado ao recurso.' });
      throw error;
    }
  },

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const userId = request.user!.userId;

      await establishmentService.delete(id, userId);
      return reply.send({ message: 'Estabelecimento removido com sucesso.' });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ error: 'Estabelecimento não encontrado.' });
      if (error.message === 'FORBIDDEN') return reply.status(403).send({ error: 'Acesso negado ao recurso.' });
      throw error;
    }
  },

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const data = updateEstablishmentSchema.parse(request.body);
      const userId = request.user!.userId;

      const salon = await establishmentService.update(id, data, userId);
      return reply.send({
        message: 'Estabelecimento atualizado com sucesso.',
        establishment: {
          id: salon.id,
          name: salon.name,
          slug: salon.slug,
          address: salon.address,
          phone: salon.phone,
          openTime: salon.openTime,
          closeTime: salon.closeTime,
          productCommissionEnabled: salon.productCommissionEnabled,
          productCommissionRate: salon.productCommissionRate,
          instagramUrl: salon.instagramUrl,
          queueMode: salon.queueMode,
          queueAutoAdvance: salon.queueAutoAdvance,
          queueAllowClientView: salon.queueAllowClientView,
          queueNotifyClient: salon.queueNotifyClient,
          queueNotifyAhead: salon.queueNotifyAhead,
          queueAllowSkip: salon.queueAllowSkip,
          queueSkipTimeoutMin: salon.queueSkipTimeoutMin,
          whatsappTemplate: salon.whatsappTemplate,
          whatsappGatewayUrl: salon.whatsappGatewayUrl,
          whatsappGatewayToken: salon.whatsappGatewayToken
        }
      });
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') return reply.status(404).send({ error: 'Estabelecimento não encontrado.' });
      if (error.message === 'FORBIDDEN') return reply.status(403).send({ error: 'Acesso negado ao recurso.' });
      throw error;
    }
  }
};
