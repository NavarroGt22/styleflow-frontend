import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { redisService } from '../services/redis.service';

export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return reply.status(401).send({ error: 'Token de acesso não fornecido.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return reply.status(401).send({ error: 'Formato de token inválido.' });
    }
    
    // Validação da Blacklist no Redis / In-memory
    const isBlacklisted = await redisService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return reply.status(401).send({ error: 'Token revogado. Por favor, faça login novamente.' });
    }

    request.user = jwt.verify(token, env.JWT_SECRET) as any;
  } catch (e) { 
    return reply.status(401).send({ error: 'Sessão expirada ou inválida.' }); 
  }
}

export function verifyRole(roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return reply.status(403).send({ error: 'Permissões insuficientes.' });
    }
  };
}
