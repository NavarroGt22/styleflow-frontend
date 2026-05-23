import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

export const professionalService = {
  async createProfessional(data: any, ownerId: string) {
    // 1. Verificação de Segurança (Tenant Isolation)
    const salon = await prisma.salon.findUnique({ where: { id: data.salonId } });
    if (!salon || salon.ownerId !== ownerId) throw new Error('UNAUTHORIZED_SALON');

    // 2. Verifica se o email já existe no sistema
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new Error('EMAIL_ALREADY_EXISTS');

    // 3. Cria o Usuário e o Perfil Profissional em uma Transação segura
    const passwordHash = await bcrypt.hash(data.password || 'SenhaTemporaria123', 10);
    
    return await prisma.$transaction(async (tx) => {
      // Cria a conta do Barbeiro
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          phone: data.phone,
          role: 'PROFESSIONAL'
        }
      });

      // Vincula ele ao Salão com a sua comissão
      const profile = await tx.professionalProfile.create({
        data: {
          userId: user.id,
          salonId: data.salonId,
          commissionRate: data.commissionRate,
          workStart: data.workStart || '09:00',
          workEnd: data.workEnd || '18:00'
        }
      });
      return { profileId: profile.id, userId: user.id, name: user.name, email: user.email };
    });
  },
  
  async getSalonProfessionals(salonId: string) {
    let professionals = await prisma.professionalProfile.findMany({
      where: { salonId, isActive: true },
      include: { 
        user: { select: { name: true, email: true, phone: true } }
      }
    });

    // Mecanismo de auto-recuperação (Se o salão não tiver ninguém, o dono vira o 1º Barbeiro automaticamente)
    if (professionals.length === 0) {
      const salon = await prisma.salon.findUnique({ where: { id: salonId } });
      if (salon) {
        await prisma.professionalProfile.create({
          data: {
            userId: salon.ownerId,
            salonId: salon.id,
            commissionRate: 100
          }
        });
        
        // Busca novamente para retornar a lista preenchida
        professionals = await prisma.professionalProfile.findMany({
          where: { salonId, isActive: true },
          include: { 
            user: { select: { name: true, email: true, phone: true } }
          }
        });
      }
    }

    return professionals;
  },

  async updateProfessional(id: string, data: any, ownerId: string) {
    const professional = await prisma.professionalProfile.findUnique({
      where: { id },
      include: { salon: true }
    });

    if (!professional) throw new Error('NOT_FOUND');
    if (professional.salon.ownerId !== ownerId) throw new Error('FORBIDDEN');

    return await prisma.$transaction(async (tx) => {
      // Atualiza o perfil do funcionário
      const updatedProfile = await tx.professionalProfile.update({
        where: { id },
        data: {
          commissionRate: data.commissionRate !== undefined ? Number(data.commissionRate) : undefined,
          workStart: data.workStart || undefined,
          workEnd: data.workEnd || undefined
        }
      });

      // Se passou nome, celular/whatsapp ou senha, atualiza também a tabela de Usuário vinculada
      if (data.name || data.phone || data.password) {
        const updateUserData: any = {};
        if (data.name) updateUserData.name = data.name;
        if (data.phone) updateUserData.phone = data.phone;
        if (data.password) {
          updateUserData.passwordHash = await bcrypt.hash(data.password, 10);
        }
        await tx.user.update({
          where: { id: professional.userId },
          data: updateUserData
        });
      }

      return updatedProfile;
    });
  },

  async deleteProfessional(id: string, ownerId: string) {
    const professional = await prisma.professionalProfile.findUnique({
      where: { id },
      include: { salon: true }
    });

    if (!professional) throw new Error('NOT_FOUND');
    if (professional.salon.ownerId !== ownerId) throw new Error('FORBIDDEN');

    // Soft delete
    return await prisma.professionalProfile.update({
      where: { id },
      data: { isActive: false }
    });
  }
};
