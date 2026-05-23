import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const establishmentService = {
  async create(data: any, ownerId: string) {
    const slugExists = await prisma.salon.findUnique({ where: { slug: data.slug } });
    if (slugExists) {
      throw new Error('SLUG_IN_USE');
    }

    const salon = await prisma.salon.create({
      data: {
        name: data.name,
        slug: data.slug,
        address: data.address,
        phone: data.phone,
        ownerId: ownerId,
        instagramUrl: data.instagramUrl || undefined,
      }
    });

    return salon;
  },

  async getById(id: string, userId: string, role: string) {
    const salon = await prisma.salon.findUnique({
      where: { id }
    });

    if (!salon || !salon.isActive) {
      throw new Error('NOT_FOUND');
    }

    // Tenant Access Control (Posse do recurso garantida)
    if (role !== 'SUPER_ADMIN' && salon.ownerId !== userId) {
      throw new Error('FORBIDDEN');
    }

    return salon;
  },

  async getAllPublic() {
    return await prisma.salon.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, address: true, phone: true, instagramUrl: true }
    });
  },

  async delete(id: string, userId: string) {
    const salon = await prisma.salon.findUnique({ where: { id } });
    
    if (!salon || !salon.isActive) {
      throw new Error('NOT_FOUND');
    }

    // Tenant Access Control (Apenas o dono pode deletar)
    if (salon.ownerId !== userId) {
      throw new Error('FORBIDDEN');
    }

    // Soft delete aplicado (Não deleta fisicamente)
    await prisma.salon.update({
      where: { id },
      data: { isActive: false }
    });

    return true;
  },

  async update(id: string, data: any, ownerId: string) {
    const salon = await prisma.salon.findUnique({ where: { id } });
    if (!salon || !salon.isActive) {
      throw new Error('NOT_FOUND');
    }

    // Tenant Access Control (Apenas o dono pode editar)
    if (salon.ownerId !== ownerId) {
      throw new Error('FORBIDDEN');
    }

    return await prisma.salon.update({
      where: { id },
      data: {
        name: data.name || undefined,
        address: data.address !== undefined ? data.address : undefined,
        phone: data.phone !== undefined ? data.phone : undefined,
        openTime: data.openTime || undefined,
        closeTime: data.closeTime || undefined,
        productCommissionEnabled: data.productCommissionEnabled !== undefined ? data.productCommissionEnabled : undefined,
        productCommissionRate: data.productCommissionRate !== undefined ? Number(data.productCommissionRate) : undefined,
        instagramUrl: data.instagramUrl !== undefined ? data.instagramUrl : undefined,
        queueMode: data.queueMode !== undefined ? data.queueMode : undefined,
        queueAutoAdvance: data.queueAutoAdvance !== undefined ? data.queueAutoAdvance : undefined,
        queueAllowClientView: data.queueAllowClientView !== undefined ? data.queueAllowClientView : undefined,
        queueNotifyClient: data.queueNotifyClient !== undefined ? data.queueNotifyClient : undefined,
        queueNotifyAhead: data.queueNotifyAhead !== undefined ? Number(data.queueNotifyAhead) : undefined,
        queueAllowSkip: data.queueAllowSkip !== undefined ? data.queueAllowSkip : undefined,
        queueSkipTimeoutMin: data.queueSkipTimeoutMin !== undefined ? Number(data.queueSkipTimeoutMin) : undefined,
        whatsappTemplate: data.whatsappTemplate !== undefined ? data.whatsappTemplate : undefined,
        whatsappGatewayUrl: data.whatsappGatewayUrl !== undefined ? data.whatsappGatewayUrl : undefined,
        whatsappGatewayToken: data.whatsappGatewayToken !== undefined ? data.whatsappGatewayToken : undefined,
      }
    });
  }
};
