import { FastifyInstance } from 'fastify';
import { authController } from '../controllers/auth.controller';
import { auditLog } from '../middlewares/audit.middleware';
import { verifyJwt } from '../middlewares/auth.middleware';
import { env } from '../config/env';

export async function authRoutes(app: FastifyInstance) {
  const authRateLimit = {
    config: {
      rateLimit: {
        max: env.NODE_ENV === 'development' ? 999999999 : 200000,
        timeWindow: '15 minutes',
        allowList: () => env.NODE_ENV === 'development'
      }
    },
    preHandler: [auditLog]
  };
  app.post('/register', authRateLimit, authController.register);
  app.post('/login', authRateLimit, authController.login);
  app.post('/refresh', authController.refresh);
  app.post('/logout', authController.logout);
  app.put('/change-password', { preHandler: [verifyJwt] }, authController.changePassword);
}
