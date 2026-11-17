# Painel interno MeuCorteJá — versão inicial

## Objetivo
Separar a operação da plataforma SaaS do painel de cada barbearia.

## Como acessar
1. Faça checkout da branch `feat/painel-interno-meucorteja-20261116`.
2. Execute o frontend com o backend existente configurado.
3. Entre com uma conta `SUPER_ADMIN` no host da plataforma.
4. Acesse `/platform/super/novo`.

## Entregue nesta branch
- Shell responsivo com menu lateral e navegação por seções.
- Dashboard com KPIs de barbearias, receita recorrente estimada, saldo em aberto e inadimplência.
- Lista de barbearias com pesquisa, filtros e detalhes.
- Financeiro com valores do período, recebimentos acumulados e saldo de cada conta.
- Relatórios básicos de composição da carteira.
- Estrutura inicial de CRM, Suporte e Configurações, **sem simular persistência que não existe**.
- Acesso ao painel clássico para ações de criação, cobrança, alteração de plano, domínios, bloqueio e exclusão.

## Fonte de dados atual
A página reutiliza `GET /admin/dashboard` via `authFetch`.
A API existente aplica JWT e função `SUPER_ADMIN`.
Os valores financeiros vêm do backend e não são preenchidos com dados fictícios.

`MRR estimado` = soma das mensalidades de contas ativas. Não representa pagamento recebido.
`Recebido acumulado` = resumo de pagamentos do backend, não necessariamente do mês.
Não calcular lucro sem registrar despesas.

## Lacunas para implementar
1. **CRM real**: modelos `Lead`, `LeadActivity`, `LeadMessageTemplate`, tarefas, origem e deduplicação. Endpoints protegidos para listar, criar, editar e avançar etapa, além de histórico de contatos.
2. **Suporte**: tickets, mensagens, status, prioridade, responsável e anexos com acesso restrito.
3. **Custos e lucro**: despesas recorrentes (VPS, domínio, e-mail, outros), conciliação mensal e demonstrativo por competência.
4. **Relatórios de evolução**: snapshots mensais ou agregações de receitas, ativação e cancelamento. Não inferir churn somente dos estados atuais.
5. **Permissões**: manter controles no backend, observabilidade, auditoria e testes para todas as novas rotas.

## Atenção aos planos
Em 16/11/2026, os arquivos `lib/admin/tenant-plans.ts` (frontend) e `src/config/tenant-plans.ts` (backend) ainda descrevem `BASIC: 99` e `PRO: 199`. A regra comercial informada é que o Básico deixou de existir e o Pro passou a custar R$ 110.

Antes de mudar os defaults em produção, definir a migração dos tenants antigos e o comportamento do enum `BASIC` no Prisma. Corrigir frontend e backend em conjunto; a tela nova evita preço de catálogo fixo e mostra a mensalidade devolvida pela API.

## Validação necessária
A nova página foi salva numa branch isolada, sem alterar `/platform/super`.
Ainda é necessário executar lint, build, login real e testes manuais com uma conta Super Admin antes de promover a branch.
