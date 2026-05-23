import { PrismaClient, QueueEntryStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// In-memory list or callback array to simulate reactive real-time updates via WebSockets
export type QueueUpdateCallback = (salonId: string, eventType: string, data: any) => void;
const listeners: QueueUpdateCallback[] = [];

export const registerQueueListener = (cb: QueueUpdateCallback) => {
  listeners.push(cb);
  return () => {
    const index = listeners.indexOf(cb);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
};

export const broadcastQueueChange = (salonId: string, eventType: string, data: any) => {
  for (const listener of listeners) {
    try {
      listener(salonId, eventType, data);
    } catch (err) {
      // Ignora erros de listeners desconectados
    }
  }
};

export const queueService = {
  /**
   * Abre uma nova sessão de fila para um profissional em um dia específico.
   * Importa automaticamente os agendamentos já marcados para o dia.
   */
  async openSession(salonId: string, professionalId: string, date: string) {
    // 1. Validar se o salão existe
    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon || !salon.isActive) {
      throw new Error('SALON_NOT_FOUND');
    }

    // 2. Verificar se já existe uma sessão aberta para o profissional na data
    const existingSession = await prisma.queueSession.findUnique({
      where: {
        professionalId_date: {
          professionalId,
          date,
        },
      },
      include: {
        professional: {
          include: {
            user: { select: { name: true } },
            services: { where: { isActive: true } }
          }
        },
        entries: {
          orderBy: { position: 'asc' },
          include: {
            appointment: {
              include: {
                customer: { include: { user: true } },
                service: true,
              },
            },
          },
        },
      },
    });

    if (existingSession) {
      return existingSession;
    }

    // 3. Criar a sessão de fila
    const session = await prisma.queueSession.create({
      data: {
        salonId,
        professionalId,
        date,
        isOpen: true,
      },
    });

    // 4. Buscar agendamentos existentes para esse profissional nesta data
    // Precisamos de início e fim do dia em formato DateTime
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);

    const appointments = await prisma.appointment.findMany({
      where: {
        professionalId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
      orderBy: { startTime: 'asc' },
    });

    // 5. Inserir agendamentos existentes na fila inicial
    if (appointments.length > 0) {
      const entriesToCreate = appointments.map((app, idx) => ({
        queueSessionId: session.id,
        appointmentId: app.id,
        position: idx + 1,
        originalPosition: idx + 1,
        status: 'WAITING' as QueueEntryStatus,
      }));

      await prisma.queueEntry.createMany({
        data: entriesToCreate,
      });
    }

    // 6. Calcular tempos estimados
    await this.recalculateEstimates(session.id);

    // 7. Retornar a sessão atualizada com os relacionamentos
    const updatedSession = await prisma.queueSession.findUnique({
      where: { id: session.id },
      include: {
        professional: {
          include: {
            user: { select: { name: true } },
            services: { where: { isActive: true } }
          }
        },
        entries: {
          orderBy: { position: 'asc' },
          include: {
            appointment: {
              include: {
                customer: { include: { user: true } },
                service: true,
              },
            },
          },
        },
      },
    });

    broadcastQueueChange(salonId, 'SESSION_OPENED', updatedSession);

    return updatedSession;
  },

  /**
   * Adiciona um novo agendamento à fila reativamente se houver sessão aberta para a data.
   */
  async addToQueue(appointmentId: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { professional: true, salon: true },
    });

    if (!appointment) return null;

    // Apenas se o profissional ou o salão opera em modo fila
    if (!appointment.professional.queueMode && !appointment.salon.queueMode) return null;

    const dateStr = appointment.startTime.toISOString().split('T')[0];

    // Verificar se existe uma sessão de fila aberta
    const session = await prisma.queueSession.findUnique({
      where: {
        professionalId_date: {
          professionalId: appointment.professionalId,
          date: dateStr,
        },
      },
    });

    if (!session || !session.isOpen) return null;

    // Verificar se já está na fila
    const existingEntry = await prisma.queueEntry.findUnique({
      where: { appointmentId },
    });

    if (existingEntry) return existingEntry;

    // Buscar a última posição
    const lastEntry = await prisma.queueEntry.findFirst({
      where: { queueSessionId: session.id },
      orderBy: { position: 'desc' },
    });

    const newPosition = lastEntry ? lastEntry.position + 1 : 1;

    const newEntry = await prisma.queueEntry.create({
      data: {
        queueSessionId: session.id,
        appointmentId,
        position: newPosition,
        originalPosition: newPosition,
        status: 'WAITING',
      },
    });

    await this.recalculateEstimates(session.id);

    broadcastQueueChange(appointment.salonId, 'QUEUE_UPDATED', { sessionId: session.id });

    return newEntry;
  },

  /**
   * Reordena a fila redefinindo as posições e mantendo o histórico de quem o fez.
   */
  async reorder(queueSessionId: string, entryId: string, newPosition: number, userId: string, reason?: string) {
    const session = await prisma.queueSession.findUnique({
      where: { id: queueSessionId },
      include: { entries: { orderBy: { position: 'asc' } } },
    });

    if (!session || !session.isOpen) {
      throw new Error('SESSION_NOT_FOUND_OR_CLOSED');
    }

    // Filtrar apenas entradas WAITING para reordenação
    const waitingEntries = session.entries.filter(e => e.status === 'WAITING');
    const movedEntry = waitingEntries.find(e => e.id === entryId);

    if (!movedEntry) {
      throw new Error('ENTRY_NOT_WAITING_OR_NOT_FOUND');
    }

    if (newPosition < 1 || newPosition > waitingEntries.length) {
      throw new Error('INVALID_POSITION');
    }

    // Remove do array e insere na nova posição
    const restWaiting = waitingEntries.filter(e => e.id !== entryId);
    restWaiting.splice(newPosition - 1, 0, movedEntry);

    // Obter todas as outras entradas (histórico e ativas) ordenadas pela posição atual
    const nonWaitingEntries = session.entries.filter(e => e.status !== 'WAITING');

    // Combinar mantendo as não-aguardando no início, seguidas das aguardando reordenadas
    const combinedEntries = [...nonWaitingEntries, ...restWaiting];

    // Salvar no banco usando transação, atualizando a posição de todos de forma contígua
    await prisma.$transaction(
      combinedEntries.map((entry, index) => {
        const isMoved = entry.id === entryId;
        return prisma.queueEntry.update({
          where: { id: entry.id },
          data: {
            position: index + 1,
            movedById: isMoved ? userId : undefined,
            moveReason: isMoved ? (reason || 'Reordenação manual') : undefined,
          },
        });
      })
    );

    await this.recalculateEstimates(queueSessionId);

    broadcastQueueChange(session.salonId, 'QUEUE_UPDATED', { sessionId: queueSessionId });

    return true;
  },

  /**
   * Finaliza o atendimento atual e inicia o próximo cliente.
   */
  async startNext(queueSessionId: string) {
    const session = await prisma.queueSession.findUnique({
      where: { id: queueSessionId },
      include: {
        entries: {
          orderBy: { position: 'asc' },
          include: { appointment: true },
        },
      },
    });

    if (!session || !session.isOpen) {
      throw new Error('SESSION_NOT_FOUND_OR_CLOSED');
    }

    // 1. Finalizar o atual 'IN_PROGRESS' se houver
    const activeEntry = session.entries.find(e => e.status === 'IN_PROGRESS');
    if (activeEntry) {
      await prisma.$transaction([
        prisma.queueEntry.update({
          where: { id: activeEntry.id },
          data: {
            status: 'DONE',
            actualEnd: new Date(),
          },
        }),
        prisma.appointment.update({
          where: { id: activeEntry.appointmentId },
          data: {
            status: 'COMPLETED',
          },
        }),
      ]);
    }

    // 2. Iniciar o próximo 'WAITING'
    const nextEntry = session.entries
      .filter(e => e.status === 'WAITING')
      .sort((a, b) => a.position - b.position)[0];

    if (nextEntry) {
      await prisma.$transaction([
        prisma.queueEntry.update({
          where: { id: nextEntry.id },
          data: {
            status: 'IN_PROGRESS',
            actualStart: new Date(),
          },
        }),
        prisma.appointment.update({
          where: { id: nextEntry.appointmentId },
          data: {
            status: 'CONFIRMED',
          },
        }),
      ]);
    }

    await this.recalculateEstimates(queueSessionId);

    broadcastQueueChange(session.salonId, 'QUEUE_UPDATED', { sessionId: queueSessionId });

    return true;
  },

  /**
   * Finaliza o atendimento atual (IN_PROGRESS) sem chamar o próximo automaticamente.
   */
  async completeActive(queueSessionId: string) {
    const session = await prisma.queueSession.findUnique({
      where: { id: queueSessionId },
      include: {
        entries: {
          include: { appointment: true },
        },
      },
    });

    if (!session || !session.isOpen) {
      throw new Error('SESSION_NOT_FOUND_OR_CLOSED');
    }

    const activeEntry = session.entries.find(e => e.status === 'IN_PROGRESS');
    if (!activeEntry) {
      throw new Error('NO_ACTIVE_ENTRY_FOUND');
    }

    await prisma.$transaction([
      prisma.queueEntry.update({
        where: { id: activeEntry.id },
        data: {
          status: 'DONE',
          actualEnd: new Date(),
        },
      }),
      prisma.appointment.update({
        where: { id: activeEntry.appointmentId },
        data: {
          status: 'COMPLETED',
        },
      }),
    ]);

    await this.recalculateEstimates(queueSessionId);

    broadcastQueueChange(session.salonId, 'QUEUE_UPDATED', { sessionId: queueSessionId });

    return true;
  },

  /**
   * Marca um cliente como pulado / falta.
   */
  async skipEntry(entryId: string, userId: string, reason?: string) {
    const entry = await prisma.queueEntry.findUnique({
      where: { id: entryId },
      include: { queueSession: true },
    });

    if (!entry || !entry.queueSession.isOpen) {
      throw new Error('ENTRY_NOT_FOUND_OR_CLOSED');
    }

    // 1. Atualizar o status do cliente pulado para SKIPPED e o agendamento para NO_SHOW
    await prisma.$transaction([
      prisma.queueEntry.update({
        where: { id: entryId },
        data: {
          status: 'SKIPPED',
          movedById: userId,
          moveReason: reason || 'Cliente pulado/Não compareceu',
        },
      }),
      prisma.appointment.update({
        where: { id: entry.appointmentId },
        data: {
          status: 'NO_SHOW',
        },
      }),
    ]);

    // 2. Buscar todas as entradas da sessão de fila atualizadas para reindexar
    const allEntries = await prisma.queueEntry.findMany({
      where: { queueSessionId: entry.queueSessionId },
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

    await this.recalculateEstimates(entry.queueSessionId);

    broadcastQueueChange(entry.queueSession.salonId, 'QUEUE_UPDATED', { sessionId: entry.queueSessionId });

    return true;
  },

  /**
   * Recalcula estimativas matemáticas da fila acumulando tempos dos atendimentos.
   */
  async recalculateEstimates(queueSessionId: string) {
    const session = await prisma.queueSession.findUnique({
      where: { id: queueSessionId },
      include: {
        salon: true,
        entries: {
          orderBy: { position: 'asc' },
          include: {
            appointment: {
              include: {
                service: true,
              },
            },
          },
        },
      },
    });

    if (!session) return;

    let currentEstimatedTime = new Date();

    // Se o horário de início hoje ainda é no futuro com base no horário de abertura do salão
    const [openHour, openMin] = (session.salon.openTime || '09:00').split(':').map(Number);
    const openingToday = new Date();
    openingToday.setHours(openHour, openMin, 0, 0);

    if (currentEstimatedTime < openingToday) {
      currentEstimatedTime = openingToday;
    }

    // 1. Se tem alguém IN_PROGRESS, o primeiro WAITING começará quando ele terminar
    const inProgressEntry = session.entries.find(e => e.status === 'IN_PROGRESS');
    if (inProgressEntry) {
      const startTime = inProgressEntry.actualStart || inProgressEntry.estimatedStart || new Date();
      const serviceDuration = inProgressEntry.appointment.service?.duration || 30;
      
      const inProgressEndTime = new Date(startTime.getTime() + serviceDuration * 60 * 1000);
      currentEstimatedTime = inProgressEndTime;
    }

    // 2. Atualizar todos os WAITING sequencialmente
    const waitingEntries = session.entries
      .filter(e => e.status === 'WAITING')
      .sort((a, b) => a.position - b.position);

    for (const entry of waitingEntries) {
      const serviceDuration = entry.appointment.service?.duration || 30;
      
      await prisma.queueEntry.update({
        where: { id: entry.id },
        data: {
          estimatedStart: currentEstimatedTime,
        },
      });

      // Avança o acumulador de estimativas
      currentEstimatedTime = new Date(currentEstimatedTime.getTime() + serviceDuration * 60 * 1000);
    }
  },

  /**
   * Encerra a sessão de fila.
   */
  async closeSession(queueSessionId: string) {
    const session = await prisma.queueSession.findUnique({
      where: { id: queueSessionId },
    });

    if (!session) throw new Error('SESSION_NOT_FOUND');

    const updated = await prisma.queueSession.update({
      where: { id: queueSessionId },
      data: { isOpen: false },
    });

    broadcastQueueChange(session.salonId, 'SESSION_CLOSED', { sessionId: queueSessionId });

    return updated;
  },

  /**
   * Retorna a fila atual com estimativas completas.
   */
  async getSessionWithEntries(sessionId: string) {
    return await prisma.queueSession.findUnique({
      where: { id: sessionId },
      include: {
        professional: {
          include: {
            user: {
              select: { name: true },
            },
            services: {
              where: { isActive: true }
            }
          },
        },
        entries: {
          orderBy: { position: 'asc' },
          include: {
            appointment: {
              include: {
                customer: {
                  include: {
                    user: {
                      select: { name: true, phone: true },
                    },
                  },
                },
                service: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Retorna a fila pública de um salão para o cliente final.
   */
  async getPublicSalonQueue(salonSlug: string) {
    const salon = await prisma.salon.findUnique({
      where: { slug: salonSlug },
    });

    if (!salon || !salon.isActive) {
      throw new Error('SALON_OR_QUEUE_NOT_AVAILABLE');
    }

    const todayStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const sessions = await prisma.queueSession.findMany({
      where: {
        salonId: salon.id,
        date: todayStr,
        isOpen: true,
      },
      include: {
        professional: {
          include: {
            user: {
              select: { name: true },
            },
            services: {
              where: { isActive: true },
            },
          },
        },
        entries: {
          orderBy: { position: 'asc' },
          include: {
            appointment: {
              include: {
                customer: {
                  include: {
                    user: {
                      select: { name: true },
                    },
                  },
                },
                service: true,
              },
            },
          },
        },
      },
    });

    return {
      salon: {
        id: salon.id,
        name: salon.name,
        phone: salon.phone,
        instagramUrl: salon.instagramUrl,
        queueAllowClientView: salon.queueAllowClientView,
        queueMode: salon.queueMode,
      },
      queues: sessions.map(session => ({
        sessionId: session.id,
        professionalName: session.professional.user.name,
        services: session.professional.services,
        entries: session.entries.map(e => ({
          id: e.id,
          position: e.position,
          estimatedStart: e.estimatedStart,
          status: e.status,
          userId: e.appointment.customer?.userId,
          serviceName: e.appointment.service?.name,
          customerName: e.appointment.customer?.user.name ? 
            e.appointment.customer.user.name.substring(0, 3) + '***' : 'Cliente',
        })),
      })),

    };
  },

  /**
   * Adiciona um cliente walk-in (presencial sem agendamento prévio) diretamente na fila.
   * Cria o User, CustomerProfile e o Appointment associado na data da sessão.
   */
  async addWalkIn(sessionId: string, data: { name: string; phone?: string; serviceId: string }) {
    const session = await prisma.queueSession.findUnique({
      where: { id: sessionId },
      include: { salon: true },
    });

    if (!session || !session.isOpen) {
      throw new Error('SESSION_NOT_FOUND_OR_CLOSED');
    }

    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
    });

    if (!service || !service.isActive) {
      throw new Error('SERVICE_NOT_FOUND');
    }

    // 1. Procurar ou criar o cliente baseado no telefone (se fornecido)
    let customerProfile = null;
    if (data.phone) {
      const existingUser = await prisma.user.findFirst({
        where: { phone: data.phone, role: 'CUSTOMER' },
        include: { customerProfile: true },
      });
      if (existingUser && existingUser.customerProfile) {
        customerProfile = existingUser.customerProfile;
      }
    }

    if (!customerProfile) {
      // Cria um usuário novo com e-mail fictício único
      const tempEmail = `walkin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}@styleflow.com`;
      const dummyPasswordHash = await bcrypt.hash('walkin-dummy-password', 10);
      
      customerProfile = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: data.name,
            email: tempEmail,
            passwordHash: dummyPasswordHash,
            phone: data.phone || null,
            role: 'CUSTOMER',
          },
        });
        
        return await tx.customerProfile.create({
          data: { userId: user.id },
        });
      });
    }

    // 2. Definir a hora de início e fim baseados na data da sessão
    const sessionDate = new Date(session.date + 'T12:00:00.000Z');
    const now = new Date();
    sessionDate.setUTCHours(now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());

    const serviceDuration = service.duration || 30;
    const endTime = new Date(sessionDate.getTime() + serviceDuration * 60 * 1000);

    // 3. Criar agendamento
    const appointment = await prisma.appointment.create({
      data: {
        salonId: session.salonId,
        customerId: customerProfile.id,
        professionalId: session.professionalId,
        serviceId: data.serviceId,
        startTime: sessionDate,
        endTime: endTime,
        status: 'PENDING',
      },
    });

    // 4. Inserir na fila ativa
    const entry = await this.addToQueue(appointment.id);
    return entry;
  }
};
