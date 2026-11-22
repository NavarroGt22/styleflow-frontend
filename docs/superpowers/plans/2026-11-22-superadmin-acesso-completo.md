# Superadmin: acesso completo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** disponibilizar todas as operações do dono na sessão auditada da unidade selecionada.
**Architecture:** ampliar as allowlists no backend e BFF, validar recursos e referências contra tenant/unidade e reaproveitar componentes existentes. Preservar identidade OWNER efetiva e SUPER_ADMIN autor.
**Tech Stack:** Next.js 16, React, Fastify, Prisma/PostgreSQL, Node test/Vitest.
**Spec:** ../specs/2026-11-22-superadmin-acesso-completo-design.md (aprovado pelo usuário).

## Global Constraints
- Sem mudanças de banco ou dados de produção; manter 15 minutos, revogação e auditoria.
- Não abrir rotas globais, credenciais normais de autenticação ou outras unidades/contas.
- Código no GitHub; Vercel manual pelo usuário.

## Review Focus
- IDs estrangeiros em parâmetros, filtros e referências aninhadas devem ser rejeitados.
- OWNER efetivo deve resolver financeiro/estoque/fila sem sessão normal no navegador.
- Sessão revogada/expirada não opera nenhuma área nova.
- Alterações de slug precisam continuar permitindo encerrar a sessão.
- Operações financeiras só testadas em PostgreSQL descartável.

### Task 1: política completa e isolamento na API
Files: backend src/middlewares/support-access.middleware.ts; novo src/lib/support-owner-policy.ts; serviços com restrições legadas; src/tests/support-access.integration.test.ts.
- [x] Acrescentar testes de leitura de financeiro/clientes/assinaturas/produtos/grupos/cupons, alterações de equipe/configuração e referências estrangeiras. Executar e observar 403 antes da mudança.
- [x] Implementar política explícita por rota, conferir parâmetros e referências de corpo/filtros; retirar restrições extras mantendo escopo dos serviços.
- [x] Executar integração com e sem RLS em PostgreSQL descartável e compilar backend.

### Task 2: BFF e painel completo
Files: lib/support/proxy-policy.ts; components/admin/AdminDashboard.tsx; components/admin/tabs/{AdminAgendaTab,AdminTeamTab,AdminSalonTab,AdminFinancialTab,AdminStockTab,AdminQueueTab}.tsx; tests/support-access.test.mjs.
- [x] Testar caminhos novos, filtros financeiros/clientes e corpo de operações; observar falhas anteriores.
- [x] Ampliar política explícita do BFF, remover restrições de UI específicas do suporte e usar getAdminSessionUser nas abas.
- [x] Testar CSRF, destino fixo, IDs de salão, revogação; executar testes, TypeScript e build.

### Task 3: validação de fluxo e publicação
- [x] Executar browser com sessão de suporte e abas novas, verificando conteúdo real de teste e operações sem acessar produção.
- [x] Revisão independente do diff; corrigir problemas importantes com teste de regressão.
- [x] Atualizar documentação; commit nos dois repositórios e push para main/backend e frontend-only/frontend, após confirmar branches remotas sem divergência.

## Evidências da entrega

- Backend: 345 testes passaram,1 teste condicional ignorado;52 arquivos de teste.
- RLS: 23 testes de suporte passaram em PostgreSQL sem superuser/bypass, incluindo alterações reais de teste, isolamento, rollback de funcionário, status/benefícios atômicos e concorrência.
- Frontend: 21 testes passaram; fluxo de navegador confirmou login privado, abas completas, caixa do dono, encerramento/retorno ao Master e logout sem chamadas diretas à API ou exceções.
- Revisão independente concluída. Achados de marca compartilhada, concorrência e rollback corrigidos com regressões observadas RED→GREEN.
- Builds finais e publicação: conferidos no fechamento dos commits; implantação na Vercel permanece manual com Rafael.
