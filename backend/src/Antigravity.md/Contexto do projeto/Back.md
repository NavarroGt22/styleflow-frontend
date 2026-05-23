# Arquitetura do Backend - SaaS Salão de Beleza

  

Esta documentação detalha como o backend foi estruturado, quais tecnologias foram escolhidas e como os dados fluem da requisição até o banco de dados. O objetivo é fornecer uma visão clara para manutenções e futuras melhorias arquiteturais.

  

## 🚀 Tecnologias Principais

- **Node.js (v20+)**: Ambiente de execução.

- **Fastify**: Framework web de altíssima performance (escolhido no lugar do Express pela sua velocidade e suporte nativo a validações/hooks).

- **Prisma ORM**: Mapeamento objeto-relacional para interagir com o PostgreSQL de forma tipada e segura.

- **PostgreSQL**: Banco de dados relacional (estrutura sólida para gestão financeira e agendamentos).

- **Zod**: Biblioteca de validação de esquemas (garante que os dados enviados pelo frontend estão 100% corretos antes de processar).

- **TypeScript**: Tipagem estática em todo o código.

  

---

  

## 📁 Estrutura de Diretórios (`/backend/src`)

  

A arquitetura segue o padrão **Controller-Service-Route**, promovendo separação clara de responsabilidades (Clean Architecture lite):

  

```text

src/

├── app.ts                  # Configuração global do Fastify (CORS, plugins)

├── server.ts               # Ponto de entrada (Inicia o servidor na porta 3333)

├── routes/                 # Definição dos endpoints da API (Mapeia URL -> Controller)

├── controllers/            # Ponto de contato HTTP (Recebe req, valida com Zod, chama Service, devolve res)

├── services/               # Regras de Negócio Puras e chamadas ao banco (Prisma)

├── middlewares/            # Funções interceptadoras (Autenticação, RBAC, Auditoria)

├── validations/            # Esquemas do Zod reutilizáveis

└── config/                 # Variáveis de ambiente (env.ts)

```

  

---

  

## 🔄 Fluxo de uma Requisição (Exemplo: Criar Agendamento)

1. **Rota (`routes/appointment.routes.ts`)**:
   - A requisição `POST /api/v1/appointments` chega.
   - O Fastify executa os *Middlewares* (Hooks): `verifyJwt` (verifica se está logado) -> `auditLog`.

2. **Controller (`controllers/appointment.controller.ts`)**:
   - Valida o `request.body` usando o Zod (`createAppointmentSchema`). Se faltar o `professionalId`, o Zod já barra com erro 400.
   - Passa os dados limpos para o Service.

3. **Service (`services/appointment.service.ts`)**:
   - Executa as regras de negócio: O profissional trabalha nessa hora? Existe choque de horário (conflito)? Se sim, dispara erro `TIME_SLOT_UNAVAILABLE` com sugestão de buffer de 10 minutos.
   - Usa o Prisma para salvar no banco.

4. **Resposta (Controller)**:
   - Retorna o agendamento criado com status `201 Created` para o Frontend.

---

## 🛣️ Mapeamento Completo de Rotas da API

Aqui estão registradas todas as rotas ativas do backend, seus métodos HTTP, middlewares de segurança aplicados e ações correspondentes:

### 🔐 Autenticação (`/api/v1/auth`)
* **`POST /register`**
  - **Função**: Registra um novo usuário (`CUSTOMER` ou `OWNER`).
  - **Segurança**: Limitador de taxa (Rate Limit: máx 5 reqs / 15 min), `auditLog`.
  - **Controller**: `authController.register`
* **`POST /login`**
  - **Função**: Autentica o usuário e gera o token JWT.
  - **Segurança**: Limitador de taxa (Rate Limit: máx 5 reqs / 15 min), `auditLog`.
  - **Controller**: `authController.login`

### 🏢 Salões / Estabelecimentos (`/api/v1/establishments`)
* **`GET /public`**
  - **Função**: Lista todos os salões públicos (vitrine).
  - **Segurança**: Rota pública.
  - **Controller**: `establishmentController.getAllPublic`
* **`POST /`**
  - **Função**: Cria um novo salão.
  - **Segurança**: `verifyJwt`, `verifyRole(['OWNER', 'SUPER_ADMIN'])`, `auditLog`.
  - **Controller**: `establishmentController.create`
* **`GET /:id`**
  - **Função**: Retorna os detalhes de um salão específico.
  - **Segurança**: `verifyJwt`, `verifyRole(['OWNER', 'SUPER_ADMIN'])`, `auditLog`.
  - **Controller**: `establishmentController.get`
* **`DELETE /:id`**
  - **Função**: Remove um salão do banco de dados.
  - **Segurança**: `verifyJwt`, `verifyRole(['OWNER', 'SUPER_ADMIN'])`, `auditLog`.
  - **Controller**: `establishmentController.delete`

### 💇 Serviços (`/api/v1/services`)
* **`GET /:salonId`**
  - **Função**: Lista o catálogo de serviços de um salão (para clientes agendarem).
  - **Segurança**: Rota pública.
  - **Controller**: `serviceController.get`
* **`POST /`**
  - **Função**: Adiciona um novo serviço no catálogo do salão.
  - **Segurança**: `verifyJwt`, `verifyRole(['OWNER', 'SUPER_ADMIN'])`, `auditLog`.
  - **Controller**: `serviceController.create`
* **`PUT /:id`**
  - **Função**: Atualiza dados de um serviço.
  - **Segurança**: `verifyJwt`, `verifyRole(['OWNER', 'SUPER_ADMIN'])`, `auditLog`.
  - **Controller**: `serviceController.update`
* **`DELETE /:id`**
  - **Função**: Remove um serviço do catálogo.
  - **Segurança**: `verifyJwt`, `verifyRole(['OWNER', 'SUPER_ADMIN'])`, `auditLog`.
  - **Controller**: `serviceController.delete`

### 👥 Profissionais / Equipe (`/api/v1/professionals`)
* **`GET /:salonId`**
  - **Função**: Lista a equipe/profissionais do salão (para clientes agendarem).
  - **Segurança**: Rota pública.
  - **Controller**: `professionalController.get`
* **`POST /`**
  - **Função**: Cadastra um profissional na equipe do salão (com comissão customizada).
  - **Segurança**: `verifyJwt`, `verifyRole(['OWNER', 'SUPER_ADMIN'])`, `auditLog`.
  - **Controller**: `professionalController.create`

### 📅 Agendamentos (`/api/v1/appointments`)
* **`GET /busy-slots`**
  - **Função**: Lista horários já preenchidos (evitando choque de horários).
  - **Segurança**: Rota pública.
  - **Controller**: `appointmentController.getBusySlots`
* **`POST /`**
  - **Função**: Realiza um agendamento.
  - **Segurança**: `verifyJwt`, `auditLog`.
  - **Controller**: `appointmentController.schedule`
* **`GET /salon/:salonId`**
  - **Função**: Retorna a lista completa de agendamentos de um salão.
  - **Segurança**: `verifyJwt`, `auditLog` (Valida a propriedade/permissão do dono ou super admin).
  - **Controller**: `appointmentController.getSalonAppointments`
* **`PUT /:id/complete`**
  - **Função**: Finaliza o atendimento e realiza a cobrança, gerando registro no fluxo financeiro.
  - **Segurança**: `verifyJwt`, `auditLog`.
  - **Controller**: `appointmentController.complete`
* **`PATCH /:id/status`**
  - **Função**: Modifica o status de um agendamento (`PENDING`, `CONFIRMED`, `CANCELLED`).
  - **Segurança**: `verifyJwt`, `auditLog`.
  - **Controller**: `appointmentController.updateStatus`

### 💵 Financeiro (`/api/v1/financials`)
* **`GET /salon/:salonId`**
  - **Função**: Retorna o faturamento bruto, total de comissões calculadas, lucro líquido e últimos registros financeiros não consolidados.
  - **Segurança**: `verifyJwt`, `verifyRole(['OWNER', 'SUPER_ADMIN'])`, `auditLog`.
  - **Controller**: `financialController.getDashboard`
* **`POST /salon/:salonId/close`**
  - **Função**: Consolida o caixa do salão (fecha todos os lançamentos financeiros pendentes).
  - **Segurança**: `verifyJwt`, `verifyRole(['OWNER', 'SUPER_ADMIN'])`, `auditLog`.
  - **Controller**: `financialController.closeRegister`

---

  

## 🛡️ Pilares de Segurança

  

### 1. Tenant Isolation (Isolamento de Inquilinos)

Sendo um SaaS (Software as a Service), vários salões usam o mesmo banco. Para impedir que o Salão A veja os clientes do Salão B, **todas as queries do Prisma nos Services possuem o filtro `where: { salonId }`**, e o sistema valida se o `ownerId` do banco bate com o `userId` do token do usuário que fez a requisição.

  

### 2. Autenticação e RBAC (Role-Based Access Control)

- Uso de **JWT (JSON Web Token)**. Ao logar, um token é gerado com o `userId` e a `role`.

- **Roles**: `SUPER_ADMIN`, `OWNER` (Dono do Salão), `PROFESSIONAL` (Equipe), `CUSTOMER` (Cliente final).

- O middleware `verifyRole(['OWNER'])` impede que um cliente acesse a rota financeira, por exemplo.

  

### 3. Log de Auditoria / LGPD

O middleware `audit.middleware.ts` intercepta ações críticas (cadastro, deleção, alteração de configurações) e salva um registro silencioso (`LgpdLog`) contendo a ação, o IP e o ID do usuário para conformidade jurídica.

  

---

  

## 💡 Pontos de Melhoria / Futuro da Arquitetura

  

1. **Injeção de Dependências (DI)**: Atualmente os Services exportam objetos diretos (`export const financialService = {...}`). Em uma escala maior, poderíamos usar classes e um contêiner de injeção (como o *TSyringe*) para facilitar testes unitários (Mocking).

2. **Mensageria (Background Jobs)**: Funções como envio de e-mail ou lembretes de WhatsApp para o agendamento do dia seguinte poderiam ser jogadas em uma fila (ex: Redis + BullMQ) para não prender a resposta HTTP.

3. **Paginação**: No momento os métodos `findMany` trazem listas completas. Será necessário adicionar `take` e `skip` no Prisma quando a base de clientes crescer muito.

4. **Camada de Repositório (Repository Pattern)**: Extrair as chamadas do `prisma` de dentro dos Services para classes Repositories isoladas, deixando o Service 100% agnóstico de banco de dados.