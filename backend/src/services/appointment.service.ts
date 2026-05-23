import { PrismaClient } from '@prisma/client';
import { queueService, broadcastQueueChange } from './queue.service';

const prisma = new PrismaClient();

export const appointmentService = {
  async getBusySlots(salonId: string, professionalId: string, date: string) {
    const professional = await prisma.professionalProfile.findUnique({ where: { id: professionalId } });
    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (professional?.queueMode || salon?.queueMode) {
      return [];
    }

    // Busca os horários já ocupados no dia selecionado em formato UTC para evitar shifts de fuso horário
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const appointments = await prisma.appointment.findMany({
      where: {
        salonId,
        professionalId,
        startTime: { gte: startOfDay },
        endTime: { lte: endOfDay },
        status: { notIn: ['CANCELED_BY_CUSTOMER', 'CANCELED_BY_SALON', 'NO_SHOW'] }
      },
      select: { startTime: true, endTime: true }
    });

    return appointments;
  },

  async schedule(data: any, customerUserId: string) {
    // 1. Busca o Perfil do Cliente vinculado a este usuário
    let customer = await prisma.customerProfile.findUnique({ where: { userId: customerUserId } });
    
    // Se o cliente acabou de se cadastrar e não tem perfil, cria agora
    if (!customer) {
      customer = await prisma.customerProfile.create({ data: { userId: customerUserId } });
    }

    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    // 1.5. Prevenção de Agendamentos no Passado
    const now = new Date();
    if (start.getTime() < now.getTime() - 5 * 60 * 1000) {
      throw new Error('CANNOT_BOOK_PAST');
    }

    // 2. Verifica Horário de Expediente
    const professional = await prisma.professionalProfile.findUnique({ where: { id: data.professionalId } });
    if (professional) {
      const [startHour, startMin] = professional.workStart.split(':').map(Number);
      const [endHour, endMin] = professional.workEnd.split(':').map(Number);
      
      const workStartMins = startHour * 60 + startMin;
      const workEndMins = endHour * 60 + endMin;
      const aptStartMins = start.getHours() * 60 + start.getMinutes();
      const aptEndMins = end.getHours() * 60 + end.getMinutes();

      if (aptStartMins < workStartMins || aptEndMins > workEndMins) {
        const err: any = new Error('OUTSIDE_WORKING_HOURS');
        err.workStart = professional.workStart;
        err.workEnd = professional.workEnd;
        throw err;
      }
    }

    // Busca as configurações de fila do salão
    const salon = await prisma.salon.findUnique({ where: { id: data.salonId } });
    if (!salon) {
      throw new Error('NOT_FOUND');
    }

    // 3. Prevenção de Choque de Horários (Conflito)
    // Procuramos se já existe alguém agendado naquele bloco de tempo APENAS se o profissional E o salão NÃO estiverem no modo Fila
    if (professional && !professional.queueMode && !salon.queueMode) {
      const conflict = await prisma.appointment.findFirst({
        where: {
          professionalId: data.professionalId,
          status: { notIn: ['CANCELED_BY_CUSTOMER', 'CANCELED_BY_SALON', 'NO_SHOW'] },
          startTime: { lt: end },
          endTime: { gt: start }
        }
      });

      if (conflict) {
        // I.A. de Sugestão: Procura o próximo horário livre neste dia
        const startOfDay = new Date(start);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(start);
        endOfDay.setHours(23, 59, 59, 999);

        const todaysApts = await prisma.appointment.findMany({
          where: {
            professionalId: data.professionalId,
            status: { notIn: ['CANCELED_BY_CUSTOMER', 'CANCELED_BY_SALON', 'NO_SHOW'] },
            startTime: { gte: startOfDay },
            endTime: { lte: endOfDay }
          },
          orderBy: { startTime: 'asc' }
        });

        // Adiciona 10 minutos de intervalo (buffer) para limpeza/preparação
        let suggestedStart = new Date(conflict.endTime.getTime() + 10 * 60000);
        let suggestedEnd = new Date(suggestedStart.getTime() + (end.getTime() - start.getTime()));

        // Avança a sugestão caso bata com algum outro compromisso do dia
        let hasConflict = true;
        while (hasConflict) {
          hasConflict = false;
          for (const apt of todaysApts) {
            if (
              (suggestedStart >= apt.startTime && suggestedStart < apt.endTime) ||
              (suggestedEnd > apt.startTime && suggestedEnd <= apt.endTime) ||
              (suggestedStart <= apt.startTime && suggestedEnd >= apt.endTime)
            ) {
               suggestedStart = new Date(apt.endTime.getTime() + 10 * 60000);
               suggestedEnd = new Date(suggestedStart.getTime() + (end.getTime() - start.getTime()));
               hasConflict = true;
               break; // reinicia a verificação com o novo horário
            }
          }
        }

        // Arredonda os minutos para ficar mais bonito (ex: 10:17 vira 10:20)
        const minutes = suggestedStart.getMinutes();
        if (minutes % 10 !== 0) {
          suggestedStart.setMinutes(minutes + (10 - (minutes % 10)));
        }

        // Se passou das 20h, não tem mais horário hoje
        const timeSuggestion = suggestedStart.getHours() >= 20 ? null : suggestedStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const err: any = new Error('TIME_SLOT_UNAVAILABLE');
        err.suggestion = timeSuggestion;
        throw err;
      }
    }

    // 3. Cria a reserva
    const appointment = await prisma.appointment.create({
      data: {
        salonId: data.salonId,
        customerId: customer.id,
        professionalId: data.professionalId,
        serviceId: data.serviceId,
        startTime: start,
        endTime: end,
        status: 'PENDING'
      }
    });

    // Se o profissional ou o salão estiverem no modo Fila Dinâmica, insere reativamente na fila ativa
    if (professional?.queueMode || salon?.queueMode) {
      try {
        await queueService.addToQueue(appointment.id);
      } catch (err) {
        console.error('Erro ao adicionar reativamente agendamento à fila:', err);
      }
    }

    return appointment;
  },

  async getSalonAppointments(salonId: string, userId: string, role: string) {
    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) throw new Error('NOT_FOUND');
    
    if (role === 'SUPER_ADMIN' || salon.ownerId === userId) {
      return await prisma.appointment.findMany({
        where: { salonId },
        include: {
          customer: { include: { user: { select: { name: true, phone: true } } } },
          service: { select: { name: true, price: true } },
          professional: { include: { user: { select: { name: true } } } },
          financialRecord: true
        },
        orderBy: { startTime: 'asc' }
      });
    } else if (role === 'PROFESSIONAL') {
      const profProfile = await prisma.professionalProfile.findUnique({
        where: { userId }
      });
      if (!profProfile || profProfile.salonId !== salonId) {
        throw new Error('FORBIDDEN');
      }

      return await prisma.appointment.findMany({
        where: { 
          salonId,
          professionalId: profProfile.id
        },
        include: {
          customer: { include: { user: { select: { name: true, phone: true } } } },
          service: { select: { name: true, price: true } },
          professional: { include: { user: { select: { name: true } } } },
          financialRecord: true
        },
        orderBy: { startTime: 'asc' }
      });
    } else {
      throw new Error('FORBIDDEN');
    }
  },

  async completeAppointment(
    appointmentId: string,
    userId: string,
    paymentMethod: string,
    finalPrice: number,
    products?: Array<{ productId: string; quantity: number }>
  ) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { salon: true, service: true, professional: true }
    });

    if (!appointment) throw new Error('NOT_FOUND');

    const isOwner = appointment.salon.ownerId === userId;
    const isSelf = appointment.professional?.userId === userId;

    if (!isOwner && !isSelf) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== 'SUPER_ADMIN') {
        throw new Error('FORBIDDEN');
      }
    }

    if (appointment.status === 'COMPLETED') throw new Error('ALREADY_COMPLETED');

    const amountToCharge = finalPrice !== undefined ? finalPrice : (appointment.service?.price ?? 0);

    // Transação para garantir integridade: Atualiza status + Cria registro financeiro + baixa produtos
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: 'COMPLETED' }
      });

      await tx.financialRecord.create({
        data: {
          salonId: appointment.salonId,
          appointmentId: appointment.id,
          amount: amountToCharge,
          paymentMethod: paymentMethod as any,
          isExpense: false,
          description: `Receita - ${appointment.service?.name ?? 'Serviço'}`
        }
      });

      // Se houver produtos no carrinho de checkout, processa um a um
      if (products && products.length > 0) {
        for (const item of products) {
          const product = await tx.product.findUnique({
            where: { id: item.productId }
          });

          if (!product) throw new Error('PRODUCT_NOT_FOUND');
          if (product.salonId !== appointment.salonId) throw new Error('INVALID_SALON');
          if (!product.isActive) throw new Error('PRODUCT_INACTIVE');
          if (product.stockQuantity < item.quantity) {
            throw new Error('INSUFFICIENT_STOCK');
          }

          // Decrementa o estoque do produto
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                decrement: item.quantity
              }
            }
          });

          // Cria registro financeiro para a venda do produto
          const financialRecord = await tx.financialRecord.create({
            data: {
              salonId: appointment.salonId,
              amount: product.price * item.quantity,
              paymentMethod: paymentMethod as any,
              isExpense: false,
              description: `Venda: ${product.name} (x${item.quantity}) via Checkout`
            }
          });

          // Cria o registro da venda
          await tx.productSale.create({
            data: {
              salonId: appointment.salonId,
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: product.price,
              paymentMethod: paymentMethod as any,
              financialRecordId: financialRecord.id,
              professionalId: appointment.professionalId
            }
          });
        }
      }

      return updated;
    });
  },

  async updateStatus(appointmentId: string, salonOwnerId: string, status: any) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { salon: true, professional: true }
    });

    if (!appointment) throw new Error('NOT_FOUND');
    const isOwner = appointment.salon.ownerId === salonOwnerId;
    const isSelf = appointment.professional?.userId === salonOwnerId;
    if (!isOwner && !isSelf) throw new Error('FORBIDDEN');
    
    const updatedApt = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status }
    });

    // Se o status for cancelamento ou no-show, e existir QueueEntry ativa, tratamos a fila
    if (['CANCELED_BY_CUSTOMER', 'CANCELED_BY_SALON', 'NO_SHOW'].includes(status)) {
      const queueEntry = await prisma.queueEntry.findUnique({
        where: { appointmentId },
        include: { queueSession: true }
      });

      if (queueEntry && queueEntry.queueSession.isOpen) {
        const queueStatus = status === 'NO_SHOW' ? 'NO_SHOW' : 'SKIPPED';
        
        // 1. Atualiza a entrada
        await prisma.queueEntry.update({
          where: { id: queueEntry.id },
          data: {
            status: queueStatus,
            moveReason: `Cancelado pela agenda (${status})`
          }
        });

        // 2. Busca todas as entradas da sessão de fila para reindexar
        const allEntries = await prisma.queueEntry.findMany({
          where: { queueSessionId: queueEntry.queueSessionId },
          orderBy: { position: 'asc' },
        });

        // 3. Separar e recombinar contiguamente mantendo não-aguardando primeiro e aguardando depois
        const nonWaitingEntries = allEntries.filter(e => e.status !== 'WAITING');
        const waitingEntries = allEntries.filter(e => e.status === 'WAITING');
        const combinedEntries = [...nonWaitingEntries, ...waitingEntries];

        // 4. Executar transação de atualização para reindexar posições de 1 a N
        await prisma.$transaction(
          combinedEntries.map((e, idx) =>
            prisma.queueEntry.update({
              where: { id: e.id },
              data: { position: idx + 1 },
            })
          )
        );

        // 5. Recalcular estimativas e disparar evento WebSocket
        await queueService.recalculateEstimates(queueEntry.queueSessionId);
        broadcastQueueChange(queueEntry.queueSession.salonId, 'QUEUE_UPDATED', { sessionId: queueEntry.queueSessionId });
      }
    }

    return updatedApt;
  },

  async blockSlot(data: any, ownerId: string) {
    const salon = await prisma.salon.findUnique({ where: { id: data.salonId } });
    if (!salon) throw new Error('NOT_FOUND');

    const professional = await prisma.professionalProfile.findUnique({
      where: { id: data.professionalId }
    });

    const isOwner = salon.ownerId === ownerId;
    const isSelf = professional?.userId === ownerId;
    if (!isOwner && !isSelf) throw new Error('FORBIDDEN');

    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    // Verifica se já existe agendamento ativo nesse intervalo
    const conflict = await prisma.appointment.findFirst({
      where: {
        professionalId: data.professionalId,
        status: { notIn: ['CANCELED_BY_CUSTOMER', 'CANCELED_BY_SALON', 'NO_SHOW'] },
        startTime: { lt: end },
        endTime: { gt: start }
      }
    });

    if (conflict) throw new Error('TIME_SLOT_UNAVAILABLE');

    return await prisma.appointment.create({
      data: {
        salonId: data.salonId,
        professionalId: data.professionalId,
        startTime: start,
        endTime: end,
        status: 'BLOCKED',
        customerId: null,
        serviceId: null
      }
    });
  }
};
