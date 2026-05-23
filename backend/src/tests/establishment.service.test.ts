import { describe, it, expect, vi, beforeEach } from 'vitest';
import { establishmentService } from '../services/establishment.service';
import { PrismaClient } from '@prisma/client';

// Mock do banco de dados completo
vi.mock('@prisma/client', () => {
  const mPrismaClient = {
    salon: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  return { 
    PrismaClient: class {
      constructor() { return mPrismaClient; }
    }
  };
});

const prisma = new PrismaClient() as any;

describe('Testes Unitários: Establishment Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('CAMINHO FELIZ: Deve criar um salão', async () => {
    prisma.salon.findUnique.mockResolvedValue(null);
    prisma.salon.create.mockResolvedValue({ id: 'salon-1', name: 'Barbearia X' });

    const result = await establishmentService.create({ name: 'Barbearia X', slug: 'barba-x' }, 'user-1');
    expect(result.id).toBe('salon-1');
  });

  it('EDGE CASE: Deve falhar ao criar se o slug já existir', async () => {
    prisma.salon.findUnique.mockResolvedValue({ id: 'salon-99' });

    await expect(establishmentService.create({ name: 'B', slug: 'barba-x' }, 'user-1'))
      .rejects.toThrow('SLUG_IN_USE');
  });

  it('SEGURANÇA: Deve bloquear acesso (FORBIDDEN) se usuário não for o dono', async () => {
    prisma.salon.findUnique.mockResolvedValue({ id: 'salon-1', ownerId: 'dono-real', isActive: true });

    await expect(establishmentService.getById('salon-1', 'dono-fake', 'OWNER'))
      .rejects.toThrow('FORBIDDEN');
  });

  it('SEGURANÇA: Deve aplicar o Soft Delete ao excluir', async () => {
    prisma.salon.findUnique.mockResolvedValue({ id: 'salon-1', ownerId: 'user-1', isActive: true });
    prisma.salon.update.mockResolvedValue({ id: 'salon-1', isActive: false });

    await establishmentService.delete('salon-1', 'user-1');
    expect(prisma.salon.update).toHaveBeenCalledWith({
      where: { id: 'salon-1' },
      data: { isActive: false }
    });
  });
});
