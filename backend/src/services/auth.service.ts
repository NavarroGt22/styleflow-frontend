import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env';
import { redisService } from './redis.service';

const prisma = new PrismaClient();

export const authService = {
  async register(data: any, ip: string, userAgent: string) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    
    // Transação garantindo criação atômica do Usuário + Perfil + Log LGPD
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ 
        data: { 
          name: data.name, 
          email: data.email, 
          passwordHash,
          phone: data.phone,
          role: data.role || 'CUSTOMER' // Permite especificar se é dono de salão ou cliente final
        } 
      });

      // Cria o perfil do cliente automaticamente
      if (user.role === 'CUSTOMER') {
        await tx.customerProfile.create({ data: { userId: user.id } });
      }

      // Registro inalterável de consentimento LGPD
      await tx.lgpdLog.create({
        data: {
          userId: user.id,
          action: 'TERMS_ACCEPTED_ON_REGISTER',
          ipAddress: ip,
          userAgent: userAgent
        }
      });

      return { userId: user.id, role: user.role };
    });
  },
  async login(data: any) {
    const user = await prisma.user.findUnique({ 
      where: { email: data.email },
      include: { 
        ownedSalons: { select: { id: true, name: true, slug: true } },
        professionalProfile: { include: { salon: { select: { id: true, name: true, slug: true } } } }
      }
    });
    
    if (!user || !user.isActive || !(await bcrypt.compare(data.password, user.passwordHash))) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Access Token de curta duração (15 minutos)
    const token = jwt.sign({ userId: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '15m' });
    
    // Refresh Token persistido no banco com expiração de 7 dias
    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });
    
    return { 
      token,
      refreshToken,
      user: { 
        id: user.id, 
        name: user.name, 
        role: user.role, 
        salons: user.ownedSalons,
        professionalProfile: user.professionalProfile
      } 
    };
  },
  async refresh(token: string) {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!storedToken || storedToken.expiresAt < new Date() || !storedToken.user.isActive) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    // Rotação Atômica: Excluir refresh token antigo e emitir novas credenciais
    await prisma.refreshToken.delete({ where: { token } });

    const newAccessToken = jwt.sign(
      { userId: storedToken.user.id, role: storedToken.user.role },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    const newRefreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt
      }
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  },
  async logout(accessToken?: string, refreshToken?: string) {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
      });
    }

    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken) as { exp?: number };
        if (decoded && decoded.exp) {
          const ttlSeconds = decoded.exp - Math.floor(Date.now() / 1000);
          if (ttlSeconds > 0) {
            await redisService.blacklistToken(accessToken, ttlSeconds);
          }
        }
      } catch (err) {
        console.warn('⚠️ [LOGOUT ERROR] Falha ao decodificar token para blacklist:', err);
      }
    }
  },
  async changePassword(userId: string, currentPassword: string, newPassword: string, activeAccessToken?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new Error('INVALID_CURRENT_PASSWORD');
    }
    
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Transação: atualiza a senha, revoga todos os refresh tokens deste usuário e coloca o access token na blacklist
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash }
      });

      // Deleta todos os refresh tokens (força logout em outros dispositivos)
      await tx.refreshToken.deleteMany({
        where: { userId }
      });
    });

    if (activeAccessToken) {
      try {
        const decoded = jwt.decode(activeAccessToken) as { exp?: number };
        if (decoded && decoded.exp) {
          const ttlSeconds = decoded.exp - Math.floor(Date.now() / 1000);
          if (ttlSeconds > 0) {
            await redisService.blacklistToken(activeAccessToken, ttlSeconds);
          }
        }
      } catch (err) {
        console.warn('⚠️ [CHANGE_PASSWORD ERROR] Falha ao colocar token na blacklist:', err);
      }
    }
  }
};

