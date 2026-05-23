import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function isAuthorizedUser(salonId: string, userId: string): Promise<boolean> {
  const salon = await prisma.salon.findUnique({ where: { id: salonId } });
  if (!salon) return false;
  if (salon.ownerId === userId) return true; // É o dono do salão

  // Verifica se é um profissional ativo do salão
  const prof = await prisma.professionalProfile.findFirst({
    where: { userId, salonId, isActive: true }
  });
  return !!prof;
}

export const catalogService = {
  async createService(data: { name: string, description?: string, price: number, duration: number, salonId: string }, userId: string) {
    // Segurança Isolada: Verifica se o usuário autenticado realmente é dono ou profissional ativo do salão
    const isAuth = await isAuthorizedUser(data.salonId, userId);
    if (!isAuth) {
      throw new Error('UNAUTHORIZED_SALON');
    }
    
    return await prisma.service.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        duration: data.duration,
        salonId: data.salonId
      }
    });
  },
  
  async getSalonServices(salonId: string) {
    return await prisma.service.findMany({
      where: { salonId, isActive: true },
      orderBy: { name: 'asc' }
    });
  },
  
  async updateService(id: string, data: any, userId: string) {
    const service = await prisma.service.findUnique({ where: { id }, include: { salon: true } });
    if (!service) throw new Error('UNAUTHORIZED_SALON');
    
    const isAuth = await isAuthorizedUser(service.salonId, userId);
    if (!isAuth) throw new Error('UNAUTHORIZED_SALON');
    
    return await prisma.service.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        duration: data.duration,
        isActive: data.isActive
      }
    });
  },

  async deleteService(id: string, userId: string) {
    const service = await prisma.service.findUnique({ where: { id }, include: { salon: true } });
    if (!service) throw new Error('UNAUTHORIZED_SALON');

    const isAuth = await isAuthorizedUser(service.salonId, userId);
    if (!isAuth) throw new Error('UNAUTHORIZED_SALON');

    return await prisma.service.delete({ where: { id } });
  }
};
