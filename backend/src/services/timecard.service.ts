import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getOrCreateProfessionalProfile(userId: string) {
  let professional = await prisma.professionalProfile.findUnique({
    where: { userId }
  });

  if (!professional) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { ownedSalons: true }
    });
    if (user && (user.role === 'OWNER' || user.role === 'SUPER_ADMIN') && user.ownedSalons.length > 0) {
      professional = await prisma.professionalProfile.create({
        data: {
          userId: user.id,
          salonId: user.ownedSalons[0].id,
          commissionRate: 100,
          workStart: '09:00',
          workEnd: '18:00'
        }
      });
    } else {
      throw new Error('PROFESSIONAL_PROFILE_NOT_FOUND');
    }
  }
  return professional;
}

export const timecardService = {
  async clockIn(userId: string) {
    // 1. Busca ou cria o perfil profissional do usuário
    const professional = await getOrCreateProfessionalProfile(userId);

    // 2. Data de hoje no fuso local (fuso 'America/Sao_Paulo' de forma resiliente)
    const todayStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    // 3. Verifica se existe alguma batida em aberto hoje (sem clockOut)
    const openTimecard = await prisma.timecard.findFirst({
      where: {
        professionalId: professional.id,
        date: todayStr,
        clockOut: null
      }
    });

    if (openTimecard) throw new Error('ALREADY_CLOCKED_IN');

    // 4. Cria o registro de entrada
    return await prisma.timecard.create({
      data: {
        professionalId: professional.id,
        date: todayStr,
        clockIn: new Date()
      }
    });
  },

  async clockOut(userId: string) {
    // 1. Busca ou cria o perfil profissional do usuário
    const professional = await getOrCreateProfessionalProfile(userId);

    const todayStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    // 2. Busca o ponto aberto de hoje
    const openTimecard = await prisma.timecard.findFirst({
      where: {
        professionalId: professional.id,
        date: todayStr,
        clockOut: null
      }
    });

    if (!openTimecard) throw new Error('NOT_CLOCKED_IN');

    // 3. Registra a saída
    return await prisma.timecard.update({
      where: { id: openTimecard.id },
      data: { clockOut: new Date() }
    });
  },

  async getStatus(userId: string) {
    const professional = await getOrCreateProfessionalProfile(userId);

    const todayStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    // Busca todos os pontos de hoje
    const timecards = await prisma.timecard.findMany({
      where: {
        professionalId: professional.id,
        date: todayStr
      },
      orderBy: { clockIn: 'asc' }
    });

    if (timecards.length === 0) {
      return { status: 'NOT_STARTED', timecard: null, timecards: [] };
    }

    const openTimecard = timecards.find(tc => !tc.clockOut);

    if (openTimecard) {
      return { 
        status: 'CLOCKED_IN', 
        timecard: openTimecard, 
        timecards: timecards.map(tc => ({
          id: tc.id,
          clockIn: tc.clockIn,
          clockOut: tc.clockOut,
          date: tc.date
        }))
      };
    }

    // Se todos estão fechados, o último fechado é o timecard de status
    const lastClosed = timecards[timecards.length - 1];

    return { 
      status: 'CLOCKED_OUT', 
      timecard: lastClosed, 
      timecards: timecards.map(tc => ({
        id: tc.id,
        clockIn: tc.clockIn,
        clockOut: tc.clockOut,
        date: tc.date
      }))
    };
  },

  async getSalonTimecards(salonId: string, date: string, ownerId: string) {
    // 1. Validação de Segurança (Tenant Isolation)
    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) throw new Error('NOT_FOUND');
    if (salon.ownerId !== ownerId) throw new Error('FORBIDDEN');

    // 2. Busca todos os profissionais ativos do salão com os seus pontos daquela data específica
    const professionals = await prisma.professionalProfile.findMany({
      where: { salonId, isActive: true },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        timecards: {
          where: { date },
          orderBy: { clockIn: 'asc' }
        }
      }
    });

    // 3. Retorna formatado contendo os dados do funcionário e os pontos dele
    return professionals.map(prof => {
      // Compatibilidade retroativa: se houver pontos, expõe o último (ou ativo) no campo "timecard"
      const activeCard = prof.timecards.find(tc => !tc.clockOut);
      const lastClosedCard = prof.timecards[prof.timecards.length - 1] || null;
      const card = activeCard || lastClosedCard || null;

      return {
        professionalId: prof.id,
        name: prof.user.name,
        email: prof.user.email,
        phone: prof.user.phone,
        workStart: prof.workStart,
        workEnd: prof.workEnd,
        timecard: card ? {
          id: card.id,
          clockIn: card.clockIn,
          clockOut: card.clockOut,
          date: card.date
        } : null,
        timecards: prof.timecards.map(tc => ({
          id: tc.id,
          clockIn: tc.clockIn,
          clockOut: tc.clockOut,
          date: tc.date
        }))
      };
    });
  }
};
