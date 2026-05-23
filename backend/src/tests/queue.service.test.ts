import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queueService } from '../services/queue.service';
import { PrismaClient } from '@prisma/client';

vi.mock('@prisma/client', () => {
  const mPrismaClient = {
    salon: {
      findUnique: vi.fn(),
    },
    queueSession: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    appointment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    queueEntry: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  };
  return {
    PrismaClient: class {
      constructor() { return mPrismaClient; }
      $transaction(promises: any) { return Promise.all(promises); }
    },
  };
});

const prisma = new PrismaClient() as any;

describe('Testes Unitários: Queue Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('MATEMÁTICA: Deve calcular tempos estimados da fila em cascata a partir do horário de abertura', async () => {
    // Forçar a data/hora do sistema para antes da abertura (ex: 08:00)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-21T08:00:00.000'));

    // Mock do salão com horário de abertura às 09:00
    const mockSession = {
      id: 'session-123',
      salon: {
        openTime: '09:00',
      },
      entries: [
        {
          id: 'entry-1',
          status: 'WAITING',
          position: 1,
          appointment: {
            service: { duration: 30 },
          },
        },
        {
          id: 'entry-2',
          status: 'WAITING',
          position: 2,
          appointment: {
            service: { duration: 15 },
          },
        },
      ],
    };

    prisma.queueSession.findUnique.mockResolvedValue(mockSession);
    prisma.queueEntry.update.mockResolvedValue({});

    await queueService.recalculateEstimates('session-123');

    // Primeira entrada deve começar na abertura (09:00)
    expect(prisma.queueEntry.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'entry-1' },
      data: {
        estimatedStart: expect.any(Date),
      },
    });

    // Vamos extrair as datas enviadas
    const call1 = prisma.queueEntry.update.mock.calls[0][0].data.estimatedStart;
    const call2 = prisma.queueEntry.update.mock.calls[1][0].data.estimatedStart;

    expect(call1.getHours()).toBe(9);
    expect(call1.getMinutes()).toBe(0);

    // Segunda entrada começa 30 minutos depois (09:30)
    expect(call2.getHours()).toBe(9);
    expect(call2.getMinutes()).toBe(30);

    vi.useRealTimers();
  });

  it('COMPATIBILIDADE: Se o salão não operar em modo Fila, addToQueue não insere o agendamento', async () => {
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'app-999',
      startTime: new Date(),
      professionalId: 'prof-1',
      salon: {
        id: 'salon-1',
        queueMode: false, // Modo fila desativado
      },
    });

    const result = await queueService.addToQueue('app-999');
    expect(result).toBeNull();
    expect(prisma.queueEntry.create).not.toHaveBeenCalled();
  });

  it('SEGURANÇA: Reordenação deve falhar se a fila/sessão não existir ou estiver fechada', async () => {
    prisma.queueSession.findUnique.mockResolvedValue(null); // Fila não encontrada

    await expect(queueService.reorder('session-fake', 'entry-1', 2, 'user-admin'))
      .rejects.toThrow('SESSION_NOT_FOUND_OR_CLOSED');
  });
});
