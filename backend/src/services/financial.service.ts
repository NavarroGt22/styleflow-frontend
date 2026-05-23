import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const financialService = {
  async getDashboardMetrics(salonId: string, ownerId: string, role: string) {
    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) throw new Error('NOT_FOUND');
    if (role !== 'SUPER_ADMIN' && salon.ownerId !== ownerId) throw new Error('FORBIDDEN');

    const records = await prisma.financialRecord.findMany({
      where: { 
        salonId,
        isClosed: false
      },
      include: {
        appointment: {
          include: {
            professional: {
              include: { user: { select: { name: true } } }
            },
            service: true
          }
        },
        productSale: {
          include: {
            professional: {
              include: { user: { select: { name: true } } }
            },
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let totalRevenue = 0;
    let totalCommissions = 0;

    for (const record of records) {
      if (!record.isExpense) {
        totalRevenue += record.amount;
        
        // 1. Calcula a comissão do profissional se houver agendamento
        if (record.appointment && record.appointment.professional) {
          const prof = record.appointment.professional;
          
          // O dono não recebe repasse dele mesmo (o lucro já é a receita)
          if (prof.userId !== salon.ownerId) {
            const commissionAmount = (record.amount * prof.commissionRate) / 100;
            totalCommissions += commissionAmount;
          }
        }

        // 2. Calcula a comissão de produto se habilitada
        if (salon.productCommissionEnabled && record.productSale && record.productSale.professional) {
          const prof = record.productSale.professional;
          
          // O dono não recebe repasse dele mesmo
          if (prof.userId !== salon.ownerId) {
            const commissionAmount = (record.amount * salon.productCommissionRate) / 100;
            totalCommissions += commissionAmount;
          }
        }
      }
    }

    const netProfit = totalRevenue - totalCommissions;

    return {
      totalRevenue,
      totalCommissions,
      netProfit,
      recentRecords: records.slice(0, 10),
      aiAdvisorLocked: process.env.ENABLE_AI_ADVISOR !== 'true' || !process.env.GEMINI_API_KEY
    };
  },

  async closeRegister(salonId: string, ownerId: string, role: string) {
    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) throw new Error('NOT_FOUND');
    if (role !== 'SUPER_ADMIN' && salon.ownerId !== ownerId) throw new Error('FORBIDDEN');

    const result = await prisma.financialRecord.updateMany({
      where: { salonId, isClosed: false },
      data: { isClosed: true }
    });

    return { success: true, count: result.count };
  }
};
