import { FastifyRequest, FastifyReply } from 'fastify';
import { queueService, broadcastQueueChange } from '../services/queue.service';
import { openQueueSessionSchema, reorderQueueSchema, skipQueueEntrySchema, addWalkInSchema, joinQueueSchema } from '../validations/queue.validation';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const queueController = {
  /**
   * Abre uma sessão de fila diária para um profissional.
   */
  async openSession(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = openQueueSessionSchema.parse(request.body);
      const userId = request.user!.userId;
      const role = request.user!.role;

      // 1. Obter o perfil do profissional para validar o salonId e a posse
      const professional = await prisma.professionalProfile.findUnique({
        where: { id: data.professionalId },
        include: { salon: true },
      });

      if (!professional || !professional.isActive) {
        return reply.status(404).send({ error: 'Profissional não encontrado.' });
      }

      // Tenant Access Control: Apenas o dono do salão ou o próprio profissional pode abrir a fila
      if (role !== 'SUPER_ADMIN' && professional.salon.ownerId !== userId && professional.userId !== userId) {
        return reply.status(403).send({ error: 'Acesso negado ao recurso.' });
      }

      const session = await queueService.openSession(professional.salonId, professional.id, data.date);
      return reply.status(201).send(session);
    } catch (error: any) {
      if (error.message === 'SALON_NOT_FOUND') {
        return reply.status(404).send({ error: 'Salão não encontrado.' });
      }
      throw error;
    }
  },

  /**
   * Obtém a fila ativa por ID da sessão de fila.
   */
  async getSession(request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) {
    try {
      const { sessionId } = request.params;
      const userId = request.user!.userId;
      const role = request.user!.role;

      const session = await queueService.getSessionWithEntries(sessionId);
      if (!session) {
        return reply.status(404).send({ error: 'Sessão de fila não encontrada.' });
      }

      // Tenant Access Control: Apenas dono do salão, profissionais do salão ou admins podem consultar a fila privada
      const isProfessionalOfSalon = await prisma.professionalProfile.findFirst({
        where: { salonId: session.salonId, userId },
      });

      const salon = await prisma.salon.findUnique({ where: { id: session.salonId } });

      if (
        role !== 'SUPER_ADMIN' &&
        salon?.ownerId !== userId &&
        !isProfessionalOfSalon
      ) {
        return reply.status(403).send({ error: 'Acesso negado ao recurso.' });
      }

      return reply.send(session);
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Reordena os clientes na fila.
   */
  async reorder(request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) {
    try {
      const { sessionId } = request.params;
      const data = reorderQueueSchema.parse(request.body);
      const userId = request.user!.userId;
      const role = request.user!.role;

      const session = await prisma.queueSession.findUnique({
        where: { id: sessionId },
        include: { salon: true },
      });

      if (!session) {
        return reply.status(404).send({ error: 'Sessão de fila não encontrada.' });
      }

      // Tenant Access Control: Dono do salão ou o profissional associado à fila
      const professional = await prisma.professionalProfile.findUnique({
        where: { id: session.professionalId },
      });

      if (
        role !== 'SUPER_ADMIN' &&
        session.salon.ownerId !== userId &&
        professional?.userId !== userId
      ) {
        return reply.status(403).send({ error: 'Acesso negado ao recurso.' });
      }

      await queueService.reorder(sessionId, data.entryId, data.newPosition, userId, data.reason);
      return reply.send({ message: 'Fila reordenada com sucesso.' });
    } catch (error: any) {
      if (error.message === 'SESSION_NOT_FOUND_OR_CLOSED') {
        return reply.status(400).send({ error: 'Sessão fechada ou inválida.' });
      }
      if (error.message === 'ENTRY_NOT_WAITING_OR_NOT_FOUND') {
        return reply.status(404).send({ error: 'Cliente não está aguardando ou não encontrado.' });
      }
      if (error.message === 'INVALID_POSITION') {
        return reply.status(400).send({ error: 'Posição de reordenação inválida.' });
      }
      throw error;
    }
  },

  /**
   * Finaliza o atendimento atual e inicia o próximo cliente.
   */
  async startNext(request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) {
    try {
      const { sessionId } = request.params;
      const userId = request.user!.userId;
      const role = request.user!.role;

      const session = await prisma.queueSession.findUnique({
        where: { id: sessionId },
        include: { salon: true },
      });

      if (!session) {
        return reply.status(404).send({ error: 'Sessão de fila não encontrada.' });
      }

      // Tenant Access Control: Dono do salão ou o profissional da fila
      const professional = await prisma.professionalProfile.findUnique({
        where: { id: session.professionalId },
      });

      if (
        role !== 'SUPER_ADMIN' &&
        session.salon.ownerId !== userId &&
        professional?.userId !== userId
      ) {
        return reply.status(403).send({ error: 'Acesso negado.' });
      }

      await queueService.startNext(sessionId);
      return reply.send({ message: 'Próximo atendimento iniciado com sucesso.' });
    } catch (error: any) {
      if (error.message === 'SESSION_NOT_FOUND_OR_CLOSED') {
        return reply.status(400).send({ error: 'Sessão de fila fechada ou inválida.' });
      }
      throw error;
    }
  },

  /**
   * Apenas finaliza o atendimento atual (IN_PROGRESS) sem chamar o próximo automaticamente.
   */
  async completeActive(request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) {
    try {
      const { sessionId } = request.params;
      const userId = request.user!.userId;
      const role = request.user!.role;

      const session = await prisma.queueSession.findUnique({
        where: { id: sessionId },
        include: { salon: true },
      });

      if (!session) {
        return reply.status(404).send({ error: 'Sessão de fila não encontrada.' });
      }

      // Tenant Access Control: Dono do salão ou o profissional da fila
      const professional = await prisma.professionalProfile.findUnique({
        where: { id: session.professionalId },
      });

      if (
        role !== 'SUPER_ADMIN' &&
        session.salon.ownerId !== userId &&
        professional?.userId !== userId
      ) {
        return reply.status(403).send({ error: 'Acesso negado.' });
      }

      await queueService.completeActive(sessionId);
      return reply.send({ message: 'Atendimento finalizado com sucesso.' });
    } catch (error: any) {
      if (error.message === 'SESSION_NOT_FOUND_OR_CLOSED') {
        return reply.status(400).send({ error: 'Sessão de fila fechada ou inválida.' });
      }
      if (error.message === 'NO_ACTIVE_ENTRY_FOUND') {
        return reply.status(400).send({ error: 'Não há nenhum cliente em andamento para finalizar.' });
      }
      throw error;
    }
  },

  /**
   * Pula / registra falta de um cliente na fila.
   */
  async skip(request: FastifyRequest<{ Params: { entryId: string } }>, reply: FastifyReply) {
    try {
      const { entryId } = request.params;
      const data = skipQueueEntrySchema.parse(request.body);
      const userId = request.user!.userId;
      const role = request.user!.role;

      const entry = await prisma.queueEntry.findUnique({
        where: { id: entryId },
        include: {
          queueSession: {
            include: { salon: true },
          },
        },
      });

      if (!entry) {
        return reply.status(404).send({ error: 'Entrada de fila não encontrada.' });
      }

      // Tenant Access Control
      const professional = await prisma.professionalProfile.findUnique({
        where: { id: entry.queueSession.professionalId },
      });

      if (
        role !== 'SUPER_ADMIN' &&
        entry.queueSession.salon.ownerId !== userId &&
        professional?.userId !== userId
      ) {
        return reply.status(403).send({ error: 'Acesso negado.' });
      }

      await queueService.skipEntry(entryId, userId, data.reason);
      return reply.send({ message: 'Cliente pulado com sucesso.' });
    } catch (error: any) {
      if (error.message === 'ENTRY_NOT_FOUND_OR_CLOSED') {
        return reply.status(400).send({ error: 'Entrada não encontrada ou sessão de fila fechada.' });
      }
      throw error;
    }
  },

  /**
   * Rota Pública: Visualização da fila para o cliente sem login.
   */
  async getPublicQueue(request: FastifyRequest<{ Params: { salonSlug: string } }>, reply: FastifyReply) {
    try {
      const { salonSlug } = request.params;
      const publicQueue = await queueService.getPublicSalonQueue(salonSlug);
      return reply.send(publicQueue);
    } catch (error: any) {
      if (error.message === 'SALON_OR_QUEUE_NOT_AVAILABLE') {
        return reply.status(404).send({ error: 'Fila pública ou salão indisponível no momento.' });
      }
      throw error;
    }
  },

  /**
   * Adiciona um cliente presencial (walk-in) diretamente na fila.
   */
  async addWalkIn(request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) {
    try {
      const { sessionId } = request.params;
      const data = addWalkInSchema.parse(request.body);
      const userId = request.user!.userId;
      const role = request.user!.role;

      const session = await prisma.queueSession.findUnique({
        where: { id: sessionId },
        include: { salon: true },
      });

      if (!session) {
        return reply.status(404).send({ error: 'Sessão de fila não encontrada.' });
      }

      // Tenant Access Control: Apenas dono do salão, profissionais do salão ou admins podem gerenciar a fila
      const isProfessionalOfSalon = await prisma.professionalProfile.findFirst({
        where: { salonId: session.salonId, userId },
      });

      if (
        role !== 'SUPER_ADMIN' &&
        session.salon.ownerId !== userId &&
        !isProfessionalOfSalon
      ) {
        return reply.status(403).send({ error: 'Acesso negado ao recurso.' });
      }

      const entry = await queueService.addWalkIn(sessionId, data);
      return reply.status(201).send(entry);
    } catch (error: any) {
      if (error.message === 'SESSION_NOT_FOUND_OR_CLOSED') {
        return reply.status(400).send({ error: 'Sessão fechada ou inválida.' });
      }
      if (error.message === 'SERVICE_NOT_FOUND') {
        return reply.status(404).send({ error: 'Serviço não encontrado ou inativo.' });
      }
      throw error;
    }
  },

  /**
   * Rota do Cliente: Entrar na fila ativa do profissional.
   */
  async joinQueue(request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) {
    try {
      const { sessionId } = request.params;
      const { serviceId } = joinQueueSchema.parse(request.body);
      const userId = request.user!.userId;

      // 1. Verificar se a sessão existe e está aberta
      const session = await prisma.queueSession.findUnique({
        where: { id: sessionId },
        include: { salon: true },
      });

      if (!session || !session.isOpen) {
        return reply.status(400).send({ error: 'Sessão de fila fechada ou inválida.' });
      }

      // 2. Obter ou criar o perfil de cliente
      let customerProfile = await prisma.customerProfile.findUnique({
        where: { userId },
      });

      if (!customerProfile) {
        customerProfile = await prisma.customerProfile.create({
          data: { userId },
        });
      }

      // 3. Verificar se o cliente já está nesta fila (em andamento ou aguardando)
      const existingEntry = await prisma.queueEntry.findFirst({
        where: {
          queueSessionId: sessionId,
          appointment: {
            customerId: customerProfile.id,
          },
          status: { in: ['WAITING', 'IN_PROGRESS'] },
        },
      });

      if (existingEntry) {
        return reply.status(400).send({ error: 'Você já está na fila para este profissional.' });
      }

      // 4. Verificar se o serviço é válido e ativo
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!service || !service.isActive) {
        return reply.status(404).send({ error: 'Serviço não encontrado ou inativo.' });
      }

      // 5. Definir os tempos baseados no horário atual/sessão
      const sessionDate = new Date(session.date + 'T12:00:00.000Z');
      const now = new Date();
      sessionDate.setUTCHours(now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());

      const serviceDuration = service.duration || 30;
      const endTime = new Date(sessionDate.getTime() + serviceDuration * 60 * 1000);

      // 6. Criar o agendamento
      const appointment = await prisma.appointment.create({
        data: {
          salonId: session.salonId,
          customerId: customerProfile.id,
          professionalId: session.professionalId,
          serviceId: serviceId,
          startTime: sessionDate,
          endTime: endTime,
          status: 'PENDING',
        },
      });

      // 7. Inserir na fila ativa
      const entry = await queueService.addToQueue(appointment.id);
      return reply.status(201).send(entry);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({ error: 'Dados inválidos.', details: error.errors });
      }
      throw error;
    }
  },

  /**
   * Rota do Cliente: Sair voluntariamente da fila ativa.
   */
  async leaveQueue(request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) {
    try {
      const { sessionId } = request.params;
      const userId = request.user!.userId;

      // 1. Obter perfil do cliente
      const customerProfile = await prisma.customerProfile.findUnique({
        where: { userId },
      });

      if (!customerProfile) {
        return reply.status(404).send({ error: 'Perfil de cliente não encontrado.' });
      }

      // 2. Encontrar a entrada ativa (WAITING ou IN_PROGRESS) na fila
      const activeEntry = await prisma.queueEntry.findFirst({
        where: {
          queueSessionId: sessionId,
          appointment: {
            customerId: customerProfile.id,
          },
          status: { in: ['WAITING', 'IN_PROGRESS'] },
        },
        include: {
          queueSession: true,
        },
      });

      if (!activeEntry) {
        return reply.status(404).send({ error: 'Você não possui um atendimento ativo nesta fila.' });
      }

      // 3. Atualizar a entrada para SKIPPED e o agendamento correspondente
      await prisma.$transaction([
        prisma.queueEntry.update({
          where: { id: activeEntry.id },
          data: {
            status: 'SKIPPED',
            moveReason: 'Cliente desistiu voluntariamente (saiu da fila)',
          },
        }),
        prisma.appointment.update({
          where: { id: activeEntry.appointmentId },
          data: {
            status: 'CANCELED_BY_CUSTOMER',
          },
        }),
      ]);

      // 4. Reindexar posições contíguas
      const allEntries = await prisma.queueEntry.findMany({
        where: { queueSessionId: sessionId },
        orderBy: { position: 'asc' },
      });

      const nonWaitingEntries = allEntries.filter(e => e.status !== 'WAITING');
      const waitingEntries = allEntries.filter(e => e.status === 'WAITING');
      const combinedEntries = [...nonWaitingEntries, ...waitingEntries];

      await prisma.$transaction(
        combinedEntries.map((e, idx) =>
          prisma.queueEntry.update({
            where: { id: e.id },
            data: { position: idx + 1 },
          })
        )
      );

      // 5. Recalcular estimativas e transmitir via WebSocket
      await queueService.recalculateEstimates(sessionId);
      broadcastQueueChange(activeEntry.queueSession.salonId, 'QUEUE_UPDATED', { sessionId });

      return reply.send({ message: 'Você saiu da fila com sucesso.' });
    } catch (error: any) {
      throw error;
    }
  }
};

