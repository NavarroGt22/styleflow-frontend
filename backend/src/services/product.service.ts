import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const productService = {
  async createProduct(
    data: {
      name: string;
      description?: string;
      price: number;
      costPrice?: number;
      stockQuantity: number;
      minStockAlert: number;
      salonId: string;
    },
    userId: string
  ) {
    const salon = await prisma.salon.findUnique({ where: { id: data.salonId } });
    if (!salon || salon.ownerId !== userId) {
      throw new Error('UNAUTHORIZED_SALON');
    }

    return await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        costPrice: data.costPrice,
        stockQuantity: data.stockQuantity,
        minStockAlert: data.minStockAlert,
        salonId: data.salonId,
      },
    });
  },

  async updateProduct(
    id: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      costPrice?: number;
      stockQuantity?: number;
      minStockAlert?: number;
      isActive?: boolean;
    },
    userId: string
  ) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { salon: true },
    });

    if (!product || product.salon.ownerId !== userId) {
      throw new Error('UNAUTHORIZED_SALON');
    }

    return await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        costPrice: data.costPrice,
        stockQuantity: data.stockQuantity,
        minStockAlert: data.minStockAlert,
        isActive: data.isActive,
      },
    });
  },

  async getSalonProducts(salonId: string, onlyActive = false) {
    return await prisma.product.findMany({
      where: {
        salonId,
        ...(onlyActive ? { isActive: true } : {}),
      },
      orderBy: { name: 'asc' },
    });
  },

  async registerSale(
    data: {
      salonId: string;
      productId: string;
      quantity: number;
      paymentMethod: string;
      professionalId?: string;
    },
    userId: string,
    userRole: string
  ) {
    // 1. Autorização
    const salon = await prisma.salon.findUnique({ where: { id: data.salonId } });
    if (!salon) throw new Error('NOT_FOUND');

    if (userRole === 'OWNER') {
      if (salon.ownerId !== userId) throw new Error('FORBIDDEN');
    } else if (userRole === 'PROFESSIONAL') {
      const prof = await prisma.professionalProfile.findUnique({
        where: { userId },
      });
      if (!prof || prof.salonId !== data.salonId) throw new Error('FORBIDDEN');
    } else {
      throw new Error('FORBIDDEN');
    }

    // 2. Executa a venda em transação
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: data.productId },
      });

      if (!product) throw new Error('PRODUCT_NOT_FOUND');
      if (product.salonId !== data.salonId) throw new Error('INVALID_SALON');
      if (!product.isActive) throw new Error('PRODUCT_INACTIVE');
      if (product.stockQuantity < data.quantity) {
        throw new Error('INSUFFICIENT_STOCK');
      }

      // Decrementa estoque
      await tx.product.update({
        where: { id: data.productId },
        data: {
          stockQuantity: {
            decrement: data.quantity,
          },
        },
      });

      // Cria registro financeiro da venda de produto
      const financialRecord = await tx.financialRecord.create({
        data: {
          salonId: data.salonId,
          amount: product.price * data.quantity,
          paymentMethod: data.paymentMethod as any,
          isExpense: false,
          description: `Venda: ${product.name} (x${data.quantity})`,
        },
      });

      // Cria a venda de produto
      const sale = await tx.productSale.create({
        data: {
          salonId: data.salonId,
          productId: data.productId,
          quantity: data.quantity,
          unitPrice: product.price,
          paymentMethod: data.paymentMethod as any,
          financialRecordId: financialRecord.id,
          professionalId: data.professionalId || undefined,
        },
      });

      return sale;
    });
  },
};
