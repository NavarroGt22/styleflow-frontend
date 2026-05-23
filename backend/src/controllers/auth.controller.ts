import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authService } from '../services/auth.service';

const registerSchema = z.object({
  name: z.string().min(3), 
  email: z.string().email(), 
  password: z.string().min(8), 
  phone: z.string().optional(),
  role: z.enum(['CUSTOMER', 'OWNER']).optional()
});
const loginSchema = z.object({ email: z.string().email(), password: z.string() });
const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8)
});

export const authController = {
  async register(request: FastifyRequest, reply: FastifyReply) {
    const data = registerSchema.parse(request.body);
    try {
      const result = await authService.register(data, request.ip, request.headers['user-agent'] || '');
      reply.status(201).send({ message: 'OK', ...result });
    } catch (e: any) { throw e; }
  },
  async login(request: FastifyRequest, reply: FastifyReply) {
    const data = loginSchema.parse(request.body);
    try {
      const result = await authService.login(data);
      return reply.send(result);
    } catch (error: any) {
      if (error.message === 'INVALID_CREDENTIALS') {
        return reply.status(401).send({ error: 'E-mail ou senha incorretos. A conta existe?' });
      }
      throw error;
    }
  },
  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const refreshSchema = z.object({ refreshToken: z.string() });
    const { refreshToken } = refreshSchema.parse(request.body);
    try {
      const result = await authService.refresh(refreshToken);
      return reply.send(result);
    } catch (error: any) {
      if (error.message === 'INVALID_REFRESH_TOKEN') {
        return reply.status(401).send({ error: 'Refresh token inválido ou expirado.' });
      }
      throw error;
    }
  },
  async logout(request: FastifyRequest, reply: FastifyReply) {
    const logoutSchema = z.object({ refreshToken: z.string().optional() });
    const { refreshToken } = logoutSchema.parse(request.body || {});
    const authHeader = request.headers.authorization;
    const accessToken = authHeader ? authHeader.split(' ')[1] : undefined;
    
    try {
      await authService.logout(accessToken, refreshToken);
      return reply.send({ message: 'Logout realizado com sucesso!' });
    } catch (error: any) {
      throw error;
    }
  },
  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    const data = changePasswordSchema.parse(request.body);
    const authHeader = request.headers.authorization;
    const activeAccessToken = authHeader ? authHeader.split(' ')[1] : undefined;
    
    try {
      await authService.changePassword(request.user!.userId, data.currentPassword, data.newPassword, activeAccessToken);
      return reply.send({ message: 'Senha atualizada com sucesso!' });
    } catch (error: any) {
      if (error.message === 'INVALID_CURRENT_PASSWORD') {
        return reply.status(400).send({ error: 'Senha atual incorreta.' });
      }
      throw error;
    }
  }
};

