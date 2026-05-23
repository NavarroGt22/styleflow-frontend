import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiFinancialService } from '../services/ai-financial.service';
import { PrismaClient } from '@prisma/client';

vi.mock('@prisma/client', () => {
  const mPrismaClient = {
    salon: {
      findUnique: vi.fn(),
    },
    financialRecord: {
      findMany: vi.fn(),
    },
  };
  return {
    PrismaClient: class {
      constructor() { return mPrismaClient; }
    },
  };
});

const prisma = new PrismaClient() as any;

describe('Testes Unitários: AI Financial Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TENANT ISOLATION: Deve barrar acesso a conselhos financeiros de outro salão', async () => {
    const mockSalon = {
      id: 'salon-123',
      ownerId: 'owner-real',
      name: 'Barbearia Real',
      commissionRate: 40,
      professionals: [],
      services: [],
      products: [],
    };

    prisma.salon.findUnique.mockResolvedValue(mockSalon);

    // owner-fake tentando acessar salon-123
    await expect(
      aiFinancialService.getAiAdvice('salon-123', 'owner-fake', 'OWNER', 'forecast')
    ).rejects.toThrow('FORBIDDEN');
  });

  it('NOT FOUND: Deve retornar erro caso o salão não exista', async () => {
    prisma.salon.findUnique.mockResolvedValue(null);

    await expect(
      aiFinancialService.getAiAdvice('salon-fake', 'owner-any', 'OWNER', 'forecast')
    ).rejects.toThrow('NOT_FOUND');
  });

  it('LOCAL HEURISTIC ENGINE: Deve calcular métricas e gerar conselhos perfeitamente formatados', async () => {
    const mockSalon = {
      id: 'salon-123',
      ownerId: 'owner-real',
      name: 'Barbearia Faturamento Forte',
      commissionRate: 50,
      productCommissionEnabled: true,
      productCommissionRate: 10,
      professionals: [
        {
          id: 'prof-1',
          userId: 'user-prof-1',
          commissionRate: 40,
          workStart: '09:00',
          workEnd: '18:00',
          user: { name: 'Lucas Barbeiro' },
        },
      ],
      services: [
        { id: 'service-1', name: 'Corte Premium', price: 60 },
      ],
      products: [
        { id: 'product-1', name: 'Pomada Modeladora', stockQuantity: 2, minStockAlert: 5 },
      ],
    };

    const mockFinancialRecords = [
      { id: 'rec-1', amount: 150.00, isExpense: false, paymentMethod: 'PIX', isClosed: false },
      { id: 'rec-2', amount: 200.00, isExpense: false, paymentMethod: 'CREDIT_CARD', isClosed: false },
      { id: 'rec-3', amount: 50.00, isExpense: true, paymentMethod: 'CASH', isClosed: false },
    ];

    prisma.salon.findUnique.mockResolvedValue(mockSalon);
    prisma.financialRecord.findMany.mockResolvedValue(mockFinancialRecords);

    const oldKey = process.env.GEMINI_API_KEY;
    const oldEnable = process.env.ENABLE_AI_ADVISOR;
    process.env.GEMINI_API_KEY = 'mock-key';
    process.env.ENABLE_AI_ADVISOR = 'true';

    try {
      // Executando o teste com o tipo 'forecast' (previsão de faturamento)
      const advice = await aiFinancialService.getAiAdvice('salon-123', 'owner-real', 'OWNER', 'forecast');

      expect(advice).toBeDefined();
      expect(advice).toContain('Barbearia Faturamento Forte');
      expect(advice).toContain('Projeção Próximo Mês');
      expect(advice).toContain('Faturamento Bruto');
      expect(advice).toContain('350,00'); // Receita acumulada (150 + 200)
      expect(advice).toContain('50,00');  // Despesas acumuladas (50)
    } finally {
      process.env.GEMINI_API_KEY = oldKey;
      process.env.ENABLE_AI_ADVISOR = oldEnable;
    }
  });

  it('LOCKED: Deve barrar acesso se a chave GEMINI_API_KEY não estiver definida', async () => {
    const mockSalon = {
      id: 'salon-123',
      ownerId: 'owner-real',
      name: 'Barbearia Real',
      commissionRate: 40,
      professionals: [],
      services: [],
      products: [],
    };
    prisma.salon.findUnique.mockResolvedValue(mockSalon);

    const oldKey = process.env.GEMINI_API_KEY;
    const oldEnable = process.env.ENABLE_AI_ADVISOR;
    delete process.env.GEMINI_API_KEY;
    delete process.env.ENABLE_AI_ADVISOR;

    try {
      await expect(
        aiFinancialService.getAiAdvice('salon-123', 'owner-real', 'OWNER', 'forecast')
      ).rejects.toThrow('LOCKED');
    } finally {
      process.env.GEMINI_API_KEY = oldKey;
      process.env.ENABLE_AI_ADVISOR = oldEnable;
    }
  });

  it('LOCKED: Deve barrar acesso se a chave GEMINI_API_KEY estiver definida mas ENABLE_AI_ADVISOR não for true', async () => {
    const mockSalon = {
      id: 'salon-123',
      ownerId: 'owner-real',
      name: 'Barbearia Real',
      commissionRate: 40,
      professionals: [],
      services: [],
      products: [],
    };
    prisma.salon.findUnique.mockResolvedValue(mockSalon);

    const oldKey = process.env.GEMINI_API_KEY;
    const oldEnable = process.env.ENABLE_AI_ADVISOR;
    process.env.GEMINI_API_KEY = 'mock-key';
    delete process.env.ENABLE_AI_ADVISOR;

    try {
      await expect(
        aiFinancialService.getAiAdvice('salon-123', 'owner-real', 'OWNER', 'forecast')
      ).rejects.toThrow('LOCKED');
    } finally {
      process.env.GEMINI_API_KEY = oldKey;
      process.env.ENABLE_AI_ADVISOR = oldEnable;
    }
  });
});

