import { FastifyInstance } from 'fastify';
import { verifyJwt, verifyRole } from '../middlewares/auth.middleware';
import { verifyEstablishmentAccess } from '../middlewares/ownership.middleware';
import { auditLog } from '../middlewares/audit.middleware';
import { productController } from '../controllers/product.controller';

export async function productRoutes(app: FastifyInstance) {
  // Rotas que exigem autenticação
  app.register(async function (protectedApp) {
    protectedApp.addHook('preHandler', verifyJwt);
    protectedApp.addHook('preHandler', verifyEstablishmentAccess);

    // GET /salon/:salonId - Donos e Profissionais podem ver produtos
    protectedApp.get(
      '/salon/:salonId',
      { preHandler: [verifyRole(['OWNER', 'SUPER_ADMIN', 'PROFESSIONAL'])] },
      productController.getSalonProducts
    );

    // POST /sell - Donos e Profissionais podem vender
    protectedApp.post(
      '/sell',
      { preHandler: [verifyRole(['OWNER', 'SUPER_ADMIN', 'PROFESSIONAL']), auditLog] },
      productController.sell
    );

    // Apenas OWNER ou SUPER_ADMIN podem criar e editar produtos
    protectedApp.post(
      '/',
      { preHandler: [verifyRole(['OWNER', 'SUPER_ADMIN']), auditLog] },
      productController.create
    );

    protectedApp.put(
      '/:id',
      { preHandler: [verifyRole(['OWNER', 'SUPER_ADMIN']), auditLog] },
      productController.update
    );
  });
}
