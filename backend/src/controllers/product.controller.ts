import { FastifyRequest, FastifyReply } from 'fastify';
import { productService } from '../services/product.service';

export const productController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as {
        name: string;
        description?: string;
        price: number;
        costPrice?: number;
        stockQuantity: number;
        minStockAlert: number;
        salonId: string;
      };
      const product = await productService.createProduct(
        body,
        request.user!.userId
      );
      return reply.status(201).send(product);
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED_SALON') {
        return reply.status(403).send({ error: 'Não autorizado para este salão.' });
      }
      throw error;
    }
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as {
        name?: string;
        description?: string;
        price?: number;
        costPrice?: number;
        stockQuantity?: number;
        minStockAlert?: number;
        isActive?: boolean;
      };
      const product = await productService.updateProduct(
        id,
        body,
        request.user!.userId
      );
      return reply.send(product);
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED_SALON') {
        return reply.status(403).send({ error: 'Não autorizado para este salão.' });
      }
      throw error;
    }
  },

  async getSalonProducts(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { salonId } = request.params as { salonId: string };
      const { onlyActive } = request.query as { onlyActive?: string };
      const isOnlyActive = onlyActive === 'true';
      const products = await productService.getSalonProducts(salonId, isOnlyActive);
      return reply.send(products);
    } catch (error: any) {
      throw error;
    }
  },

  async sell(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = request.body as {
        salonId: string;
        productId: string;
        quantity: number;
        paymentMethod: string;
        professionalId?: string;
      };
      const sale = await productService.registerSale(
        body,
        request.user!.userId,
        request.user!.role
      );
      return reply.send(sale);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return reply.status(403).send({ error: 'Acesso negado para este salão.' });
      }
      if (error.message === 'PRODUCT_NOT_FOUND') {
        return reply.status(404).send({ error: 'Produto não encontrado.' });
      }
      if (error.message === 'INSUFFICIENT_STOCK') {
        return reply.status(400).send({ error: 'Estoque insuficiente para a venda.' });
      }
      if (error.message === 'PRODUCT_INACTIVE') {
        return reply.status(400).send({ error: 'Este produto está inativo.' });
      }
      throw error;
    }
  },
};
