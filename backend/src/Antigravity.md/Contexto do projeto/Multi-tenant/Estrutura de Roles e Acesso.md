# Estrutura de Roles e Acesso no SaaS StyleFlow 👥🛡️

O controle de privilégios e permissões no SaaS StyleFlow é baseado em **RBAC (Role-Based Access Control)**. Cada usuário é categorizado em um papel de acesso rígido que dita quais dados e interfaces ele está autorizado a consumir.

---

## 🎭 Os Quatro Cargos Operacionais (Roles)

No arquivo `schema.prisma`, os cargos são definidos através do tipo enumerado `UserRole`:

```prisma
enum UserRole {
  OWNER
  PROFESSIONAL
  CUSTOMER
  SUPER_ADMIN
}
```

Abaixo está o detalhamento de privilégios de cada papel:

| Cargo (`Role`) | Descrição | Escopo de Acesso na API | Acesso à UI Frontend |
| :--- | :--- | :--- | :--- |
| **`SUPER_ADMIN`** | Administrador master da plataforma SaaS. | Acesso irrestrito a todos os salões, financeiro geral e logs da plataforma. | Painel gerencial master (global). |
| **`OWNER`** | Proprietário/Dono do estabelecimento. | Controle total sobre os dados do seu salão (financeiro, produtos, equipe, serviços, agendamentos). | Painel administrativo (`/dashboard`) com abas de Finanças, Configurações e Estoque. |
| **`PROFESSIONAL`** | Colaborador/Funcionário (ex: barbeiro, manicure). | Acesso apenas à sua própria folha de ponto e visualização da sua agenda de atendimentos. | Acesso simplificado ao `/dashboard` (abas financeiro e configurações são ocultadas; exibe apenas o ponto eletrônico). |
| **`CUSTOMER`** | Cliente final que realiza agendamentos. | Permissão restrita para agendar serviços, visualizar a fila pública e consultar seu próprio histórico. | Interface pública do cliente (`/public/:slug`) para agendamento e acompanhamento de fila. |

---

## 🔒 Proteção de Rotas com Middleware de Roles

No backend, as rotas que exigem privilégios restritos são protegidas pelo middleware `verifyRole`:

```typescript
import { verifyJwt, verifyRole } from '../middlewares/auth.middleware';

export async function establishmentRoutes(fastify: FastifyInstance) {
  fastify.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', verifyJwt);

    // Apenas OWNER e SUPER_ADMIN podem atualizar configurações gerais do salão
    protectedApp.put('/:id', { preHandler: verifyRole(['OWNER', 'SUPER_ADMIN']) }, establishmentController.update);
  });
}
```

---

## 💎 Separação Clientes vs Equipe
* **Segurança Reforçada**: Um cliente (`CUSTOMER`) possui uma identidade completamente distinta de um profissional ou proprietário. 
* Ele interage unicamente com a interface externa de reservas e fila, sem expor endpoints de gerenciamento da empresa ou acesso a faturamentos.
* A API impede qualquer interceptação cruzada validando as credenciais em todas as transações críticas de banco de dados.