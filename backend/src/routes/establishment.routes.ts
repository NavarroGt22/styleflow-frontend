import { FastifyInstance } from 'fastify';
import { establishmentController } from '../controllers/establishment.controller';
import { verifyJwt, verifyRole } from '../middlewares/auth.middleware';
import { verifyEstablishmentAccess } from '../middlewares/ownership.middleware';
import { auditLog } from '../middlewares/audit.middleware';

export async function establishmentRoutes(app: FastifyInstance) {
  // Rota pública para listar salões (vitrine)
  app.get('/public', establishmentController.getAllPublic);

  // Rotas protegidas
  app.register(async function (protectedApp) {
    // Middlewares obrigatórios de segurança para todas as rotas de Salão
    protectedApp.addHook('preHandler', verifyJwt);
    protectedApp.addHook('preHandler', verifyEstablishmentAccess);
    protectedApp.addHook('preHandler', verifyRole(['OWNER', 'SUPER_ADMIN']));
    protectedApp.addHook('preHandler', auditLog);

    protectedApp.post('/', establishmentController.create);
    protectedApp.get('/:id', establishmentController.get);
    protectedApp.delete('/:id', establishmentController.delete);
    protectedApp.put('/:id', establishmentController.update);
  });
}
