import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../app';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { PrismaClient } from '@prisma/client';

vi.mock('@prisma/client', () => {
  const mPrismaClient = {
    salon: { findUnique: vi.fn(), create: vi.fn() }
  };
  return {
    PrismaClient: class {
      constructor() { return mPrismaClient; }
    }
  };
});

describe('Testes de Integração: Rota /api/v1/establishments', () => {
  let app: any;
  let validToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = buildApp();
    await app.ready();
    
    validToken = jwt.sign({ userId: 'owner-1', role: 'OWNER' }, env.JWT_SECRET);
  });

  it('SEGURANÇA: Deve rejeitar usuário sem token (401 Unauthorized)', async () => {
    const response = await request(app.server).post('/api/v1/establishments').send({ name: 'X', slug: 'x' });
    expect(response.status).toBe(401);
  });

  it('SEGURANÇA: Deve rejeitar usuário com Role errada (403 Forbidden)', async () => {
    const customerToken = jwt.sign({ userId: 'cust-1', role: 'CUSTOMER' }, env.JWT_SECRET);
    const response = await request(app.server).post('/api/v1/establishments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'X', slug: 'x' });
    
    expect(response.status).toBe(403);
  });

  it('EDGE CASE: Deve validar input ausente via Zod e retornar 400', async () => {
    const response = await request(app.server).post('/api/v1/establishments')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: '' }); // Falta slug e name é muito curto
      
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('validação');
  });
});
