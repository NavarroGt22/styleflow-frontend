import { FastifyInstance } from 'fastify';
import { serviceController } from '../controllers/service.controller';
import { verifyJwt, verifyRole } from '../middlewares/auth.middleware';
import { verifyEstablishmentAccess } from '../middlewares/ownership.middleware';
import { auditLog } from '../middlewares/audit.middleware';

export async function serviceRoutes(app: FastifyInstance) {
  // Rota Pública: Listar serviços do catálogo para os clientes marcarem hora
  app.get('/:salonId', serviceController.get);

  // Rotas Privadas: Donos de Salão e Profissionais podem gerenciar serviços
  app.register(async function (protectedApp) {
    protectedApp.addHook('preHandler', verifyJwt);
    protectedApp.addHook('preHandler', verifyEstablishmentAccess);
    protectedApp.addHook('preHandler', verifyRole(['OWNER', 'PROFESSIONAL', 'SUPER_ADMIN']));
    protectedApp.addHook('preHandler', auditLog);
    
    protectedApp.post('/', serviceController.create);
    protectedApp.put('/:id', serviceController.update);
    protectedApp.delete('/:id', serviceController.delete);
  });
}
