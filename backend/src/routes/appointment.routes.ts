import { FastifyInstance } from 'fastify';
import { appointmentController } from '../controllers/appointment.controller';
import { verifyJwt } from '../middlewares/auth.middleware';
import { verifyEstablishmentAccess } from '../middlewares/ownership.middleware';
import { auditLog } from '../middlewares/audit.middleware';

export async function appointmentRoutes(app: FastifyInstance) {
  // Rotas Públicas (Qualquer um pode ver horários ocupados)
  app.get('/busy-slots', appointmentController.getBusySlots);

  // Rotas Privadas do Cliente (Requer apenas token JWT logado)
  app.register(async function (clientApp) {
    clientApp.addHook('preHandler', verifyJwt);
    clientApp.addHook('preHandler', auditLog);

    clientApp.post('/', appointmentController.schedule);
  });

  // Rotas Protegidas de Administração (Dono e Equipe)
  app.register(async function (protectedApp) {
    protectedApp.addHook('preHandler', verifyJwt);
    protectedApp.addHook('preHandler', verifyEstablishmentAccess);
    protectedApp.addHook('preHandler', auditLog);
    
    protectedApp.post('/block', appointmentController.block);
    protectedApp.get('/salon/:salonId', appointmentController.getSalonAppointments);
    protectedApp.put('/:id/complete', appointmentController.complete);
    protectedApp.patch('/:id/status', appointmentController.updateStatus);
  });
}
