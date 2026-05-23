import { FastifyInstance } from 'fastify';
import { queueController } from '../controllers/queue.controller';
import { verifyJwt } from '../middlewares/auth.middleware';
import { verifyEstablishmentAccess } from '../middlewares/ownership.middleware';
import { auditLog } from '../middlewares/audit.middleware';

export async function queueRoutes(app: FastifyInstance) {
  // Rotas Públicas (Clientes sem login consultam a fila pública do salão)
  app.get('/public/:salonSlug', queueController.getPublicQueue);

  // Rotas Privadas do Cliente (Requer apenas token JWT logado)
  app.register(async function (clientApp) {
    clientApp.addHook('preHandler', verifyJwt);
    clientApp.addHook('preHandler', auditLog);

    clientApp.post('/:sessionId/join', queueController.joinQueue);
    clientApp.post('/:sessionId/leave', queueController.leaveQueue);
  });

  // Rotas Protegidas (Controle interno do salão - Dono e Equipe)
  app.register(async function (protectedApp) {
    protectedApp.addHook('preHandler', verifyJwt);
    protectedApp.addHook('preHandler', verifyEstablishmentAccess);
    protectedApp.addHook('preHandler', auditLog);

    protectedApp.post('/session', queueController.openSession);
    protectedApp.get('/:sessionId', queueController.getSession);
    protectedApp.post('/:sessionId/reorder', queueController.reorder);
    protectedApp.post('/:sessionId/start', queueController.startNext);
    protectedApp.post('/:sessionId/complete', queueController.completeActive);
    protectedApp.post('/:sessionId/walkin', queueController.addWalkIn);
    protectedApp.post('/entries/:entryId/skip', queueController.skip);
  });
}

