import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function verifyEstablishmentAccess(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user?.userId;
  const role = request.user?.role;

  if (!userId) return reply.status(401).send({ error: 'Não autenticado.' });
  if (role === 'SUPER_ADMIN') return; // Acesso mestre irrestrito

  // 1. Extrai o salonId de params, query ou body
  let salonId = (request.params as any)?.salonId || 
                (request.query as any)?.salonId || 
                (request.body as any)?.salonId;

  const salonSlug = (request.params as any)?.salonSlug ||
                    (request.query as any)?.salonSlug ||
                    (request.body as any)?.salonSlug;

  // 2. Se não tiver salonId direto, mas tiver salonSlug, busca o salonId pelo slug
  if (!salonId && salonSlug) {
    try {
      const foundSalon = await prisma.salon.findUnique({
        where: { slug: salonSlug },
        select: { id: true }
      });
      if (foundSalon) {
        salonId = foundSalon.id;
      }
    } catch (e) {
      // Silenciosamente ignora erro
    }
  }

  // 3. Se ainda não tiver salonId e tiver ":id", ":sessionId" ou ":entryId" nos params, inferimos com base na rota
  const id = (request.params as any)?.id;
  const sessionId = (request.params as any)?.sessionId;
  const entryId = (request.params as any)?.entryId;
  const url = request.raw.url || '';

  if (!salonId) {
    try {
      if (sessionId) {
        const session = await prisma.queueSession.findUnique({
          where: { id: sessionId },
          select: { salonId: true }
        });
        if (session) salonId = session.salonId;
      } else if (entryId) {
        const entry = await prisma.queueEntry.findUnique({
          where: { id: entryId },
          include: { queueSession: { select: { salonId: true } } }
        });
        if (entry) salonId = entry.queueSession.salonId;
      } else if (id) {
        if (url.includes('/establishment') || url.includes('/salon')) {
          salonId = id;
        } else if (url.includes('/service')) {
          const service = await prisma.service.findUnique({
            where: { id },
            select: { salonId: true }
          });
          if (service) salonId = service.salonId;
        } else if (url.includes('/product')) {
          const product = await prisma.product.findUnique({
            where: { id },
            select: { salonId: true }
          });
          if (product) salonId = product.salonId;
        } else if (url.includes('/professional')) {
          const prof = await prisma.professionalProfile.findUnique({
            where: { id },
            select: { salonId: true }
          });
          if (prof) salonId = prof.salonId;
        } else if (url.includes('/appointment')) {
          const app = await prisma.appointment.findUnique({
            where: { id },
            select: { salonId: true }
          });
          if (app) salonId = app.salonId;
        } else if (url.includes('/financial')) {
          const record = await prisma.financialRecord.findUnique({
            where: { id },
            select: { salonId: true }
          });
          if (record) salonId = record.salonId;
        } else if (url.includes('/timecard')) {
          const tc = await prisma.timecard.findUnique({
            where: { id },
            include: { professional: { select: { salonId: true } } }
          });
          if (tc) salonId = tc.professional.salonId;
        }
      }
    } catch (err) {
      console.error('⚠️ [OWNERSHIP MIDDLEWARE RESOURCE CHECK ERROR]:', err);
    }
  }

  if (!salonId) {
    // Se nenhum salão pôde ser inferido e a rota não especificou nenhum, permite prosseguir.
    return;
  }

  try {
    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) return reply.status(404).send({ error: 'Estabelecimento não encontrado.' });

    if (role === 'OWNER') {
      if (salon.ownerId !== userId) {
        return reply.status(403).send({ error: 'Acesso negado: Você não possui a posse deste estabelecimento.' });
      }
    } else if (role === 'PROFESSIONAL') {
      const hasMembership = await prisma.professionalProfile.findFirst({
        where: { userId, salonId, isActive: true }
      });
      if (!hasMembership) {
        return reply.status(403).send({ error: 'Acesso negado: Você não faz parte da equipe deste estabelecimento.' });
      }
    } else {
      return reply.status(403).send({ error: 'Acesso restrito para esta funcionalidade.' });
    }
  } catch (e) {
    return reply.status(500).send({ error: 'Erro interno ao validar posse do salão.' });
  }
}
