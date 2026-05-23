import { FastifyRequest, FastifyReply } from 'fastify';
import { createAppointmentSchema } from '../validations/appointment.validation';
import { appointmentService } from '../services/appointment.service';

export const appointmentController = {
  async schedule(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createAppointmentSchema.parse(request.body);
      const appointment = await appointmentService.schedule(data, request.user!.userId);
      return reply.status(201).send({ message: 'Agendamento confirmado!', appointment });
    } catch (error: any) {
      if (error.message === 'TIME_SLOT_UNAVAILABLE') {
        const msg = error.suggestion 
          ? `Ops! Esse horário está ocupado. Que tal agendar às ${error.suggestion}?`
          : 'Ops! Esse horário está ocupado e não temos mais vagas hoje. Tente outro dia!';
        return reply.status(409).send({ error: msg, suggestion: error.suggestion });
      }
      if (error.message === 'OUTSIDE_WORKING_HOURS') {
        return reply.status(400).send({ error: `Este profissional trabalha apenas das ${error.workStart} às ${error.workEnd}.` });
      }
      if (error.message === 'CANNOT_BOOK_PAST') {
        return reply.status(400).send({ error: 'Não é possível agendar um horário que já passou.' });
      }
      throw error;
    }
  },

  async getBusySlots(request: FastifyRequest<{ Querystring: { salonId: string, professionalId: string, date: string } }>, reply: FastifyReply) {
    const { salonId, professionalId, date } = request.query;
    if (!salonId || !professionalId || !date) {
      return reply.status(400).send({ error: 'Faltam os parâmetros: salonId, professionalId, date' });
    }
    
    const slots = await appointmentService.getBusySlots(salonId, professionalId, date);
    return reply.send(slots);
  },

  async getSalonAppointments(request: FastifyRequest<{ Params: { salonId: string } }>, reply: FastifyReply) {
    try {
      const { salonId } = request.params;
      const appointments = await appointmentService.getSalonAppointments(salonId, request.user!.userId, request.user!.role);
      return reply.send(appointments);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') return reply.status(403).send({ error: 'Acesso negado à agenda.' });
      throw error;
    }
  },

  async complete(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        paymentMethod: string;
        finalPrice: number;
        products?: Array<{ productId: string; quantity: number }>;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const { paymentMethod, finalPrice, products } = request.body;
      const updated = await appointmentService.completeAppointment(
        id,
        request.user!.userId,
        paymentMethod,
        finalPrice,
        products
      );
      return reply.send(updated);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return reply.status(403).send({ error: 'Acesso negado.' });
      }
      if (error.message === 'ALREADY_COMPLETED') {
        return reply.status(400).send({ error: 'Este agendamento já foi concluído e cobrado.' });
      }
      if (error.message === 'PRODUCT_NOT_FOUND') {
        return reply.status(404).send({ error: 'Produto no carrinho não encontrado.' });
      }
      if (error.message === 'INSUFFICIENT_STOCK') {
        return reply.status(400).send({ error: 'Estoque insuficiente para um ou mais produtos no carrinho.' });
      }
      if (error.message === 'PRODUCT_INACTIVE') {
        return reply.status(400).send({ error: 'Um ou mais produtos no carrinho estão inativos.' });
      }
      if (error.message === 'INVALID_SALON') {
        return reply.status(400).send({ error: 'Produto inválido para este salão.' });
      }
      throw error;
    }
  },

  async updateStatus(request: FastifyRequest<{ Params: { id: string }, Body: { status: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const { status } = request.body;
      const updated = await appointmentService.updateStatus(id, request.user!.userId, status);
      return reply.send(updated);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') return reply.status(403).send({ error: 'Acesso negado.' });
      throw error;
    }
  },

  async block(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { salonId, professionalId, startTime, endTime } = request.body as any;
      if (!salonId || !professionalId || !startTime || !endTime) {
        return reply.status(400).send({ error: 'Faltam parâmetros obrigatórios.' });
      }

      const blocked = await appointmentService.blockSlot({ salonId, professionalId, startTime, endTime }, request.user!.userId);
      return reply.status(201).send({ message: 'Horário bloqueado com sucesso!', appointment: blocked });
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return reply.status(403).send({ error: 'Você não tem permissão para bloquear horários neste salão.' });
      }
      if (error.message === 'TIME_SLOT_UNAVAILABLE') {
        return reply.status(409).send({ error: 'Esse horário está ocupado por outro agendamento ativo.' });
      }
      throw error;
    }
  }
};
