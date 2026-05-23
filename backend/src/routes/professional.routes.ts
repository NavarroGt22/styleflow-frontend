import { FastifyInstance } from 'fastify';
import { professionalController } from '../controllers/professional.controller';
import { verifyJwt, verifyRole } from '../middlewares/auth.middleware';
import { verifyEstablishmentAccess } from '../middlewares/ownership.middleware';
import { auditLog } from '../middlewares/audit.middleware';

export async function professionalRoutes(app: FastifyInstance) {
  // Público: Clientes veem a lista de barbeiros para agendar
  app.get('/:salonId', professionalController.get);

  // Privado: Rota para o próprio profissional atualizar seu queueMode
  app.register(async function (myProfileApp) {
    myProfileApp.addHook('preHandler', verifyJwt);
    myProfileApp.addHook('preHandler', auditLog);
    myProfileApp.put('/me/queue-mode', { preHandler: verifyRole(['PROFESSIONAL', 'OWNER', 'SUPER_ADMIN']) }, professionalController.updateMyQueueMode);
  });

  // Privado: Apenas o dono cadastra seus barbeiros
  app.register(async function (protectedApp) {
    protectedApp.addHook('preHandler', verifyJwt);
    protectedApp.addHook('preHandler', verifyEstablishmentAccess);
    protectedApp.addHook('preHandler', verifyRole(['OWNER', 'SUPER_ADMIN']));
    protectedApp.addHook('preHandler', auditLog);
    
    protectedApp.post('/', professionalController.create);
    protectedApp.put('/:id', professionalController.update);
    protectedApp.delete('/:id', professionalController.delete);
  });
}
