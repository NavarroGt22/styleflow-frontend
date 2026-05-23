import { FastifyInstance } from 'fastify';
import { verifyJwt, verifyRole } from '../middlewares/auth.middleware';
import { verifyEstablishmentAccess } from '../middlewares/ownership.middleware';
import { auditLog } from '../middlewares/audit.middleware';
import { financialController } from '../controllers/financial.controller';
import { aiFinancialController } from '../controllers/ai-financial.controller';

export async function financialRoutes(app: FastifyInstance) {
  app.register(async function (protectedApp) {
    protectedApp.addHook('preHandler', verifyJwt);
    protectedApp.addHook('preHandler', verifyEstablishmentAccess);
    protectedApp.addHook('preHandler', verifyRole(['OWNER', 'SUPER_ADMIN']));
    protectedApp.addHook('preHandler', auditLog);

    protectedApp.get('/salon/:salonId', financialController.getDashboard);
    protectedApp.post('/salon/:salonId/close', financialController.closeRegister);
    protectedApp.post('/salon/:salonId/ai-advisor', aiFinancialController.getAdvice);
  });
}

