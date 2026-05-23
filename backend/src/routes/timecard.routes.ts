import { FastifyInstance } from 'fastify';
import { timecardController } from '../controllers/timecard.controller';
import { verifyJwt, verifyRole } from '../middlewares/auth.middleware';
import { verifyEstablishmentAccess } from '../middlewares/ownership.middleware';
import { auditLog } from '../middlewares/audit.middleware';

export async function timecardRoutes(app: FastifyInstance) {
  // Todas as rotas de ponto eletrônico são privadas e requerem JWT
  app.register(async function (protectedApp) {
    protectedApp.addHook('preHandler', verifyJwt);
    protectedApp.addHook('preHandler', verifyEstablishmentAccess);
    protectedApp.addHook('preHandler', auditLog);

    // Rotas do Funcionário (PROFESSIONAL, OWNER ou SUPER_ADMIN)
    protectedApp.register(async function (employeeApp) {
      employeeApp.addHook('preHandler', verifyRole(['PROFESSIONAL', 'OWNER', 'SUPER_ADMIN']));
      
      employeeApp.post('/in', timecardController.clockIn);
      employeeApp.post('/out', timecardController.clockOut);
      employeeApp.get('/status', timecardController.status);
    });

    // Rotas do Administrador (Apenas OWNER ou SUPER_ADMIN)
    protectedApp.register(async function (adminApp) {
      adminApp.addHook('preHandler', verifyRole(['OWNER', 'SUPER_ADMIN']));
      
      adminApp.get('/salon/:salonId', timecardController.getSalonTimecards);
    });
  });
}
