# Plano de unificação do CRM com o Super Admin

Data do plano: 20/11/2026; preparação de publicação atualizada em 22/11. Estado: implementação local incorporada e validada; publicação pelo usuário pendente. O relatório corrente está em [MASTER-CRM-IMPLEMENTATION.md](../MASTER-CRM-IMPLEMENTATION.md), com roteiro em [MASTER-CRM-RELEASE.md](../MASTER-CRM-RELEASE.md). Este plano preserva a especificação aprovada; as marcações abaixo se referem apenas ao trabalho local.

## Objetivo e decisão do usuário

Transformar o Super Admin atual no painel completo de gestão do MeuCorteJá. Manter o endereço e a conta atuais, com entrada em `/platform/super`. Usar o frontend Next.js, a API Fastify e o PostgreSQL já existentes no SaaS. Não implantar uma terceira aplicação, outro backend, outro banco ou outro serviço na VPS/Vercel.

O projeto `meucorteja-gestao` passa a ser fonte de código, testes e referências para a incorporação. A arquitetura anterior de aplicação Gestão separada e banco exclusivo fica substituída por este plano. Preservar o trabalho existente; não apagar checkouts, históricos ou migrations antigas.

Atualizar e publicar os dois projetos existentes continuará sendo necessário quando a implementação estiver pronta. A publicação não é uma ação desta etapa de planejamento. Mudanças estruturais serão migrations aditivas no banco SaaS existente, e não a aplicação da migration inicial da Gestão sobre esse banco.

## O que foi conferido no código

- `app/platform/super/page.tsx` renderiza `components/admin/SuperAdminDashboard.tsx`, que concentra a tela e os formulários atuais.
- `lib/auth.ts` e `lib/api.ts` implementam a sessão/transporte normal do frontend. O Master atual usa JWT no sessionStorage; a Gestão separada possui um mecanismo diferente, com sessão HttpOnly. A incorporação exige adaptação de autenticação e transporte, não apenas copiar JSX.
- `src/routes/admin.routes.ts`, no backend, já protege operações de criação, edição, exclusão/restauração, DNS, pagamento e confirmação por SUPER_ADMIN.
- `src/services/admin.service.ts` e `src/config/tenant-plans.ts` são as fontes atuais de mensalidade, cobrança e vencimento. O cadastro aceita valor personalizado, inclusive zero, independentemente do nome do plano.
- `TenantPlatformPayment` é um agregado por tenant/competência, com valores Float e uma data `paidAt`. Ele não representa separadamente cada recebimento e sua distribuição entre meses.
- `ensureCurrentBilling` usa o mês atual e depende de uma data explícita ou do dia padrão 5. O dia individual não está persistido em `Tenant` como regra recorrente.
- O bloqueio atual consulta a cobrança do mês; ausência de data/cobrança pode deixar a conta sem bloqueio. O novo ciclo deve funcionar mesmo sem alguém abrir o dashboard.
- O GET legado de dashboard pode criar cobranças. Indicadores novos terão consultas de leitura separadas dessa geração.
- O hook genérico `auditLog` está vazio; o histórico das novas operações precisará ser persistido explicitamente.
- Já existem diretório e sessão de suporte com prazo, escopo e auditoria. Devem ser reaproveitados.

Essas observações descrevem as worktrees locais. Não comprovam a versão atualmente publicada na VPS/Vercel.

## Regras definidas na entrevista

1. O Super Admin continua sendo a fonte do valor da mensalidade e do vencimento de cada barbearia. Não substituir mensalidade personalizada por preço nominal do plano.
2. Mensalidade R$ 0,00 significa isenção: sem contribuição ao MRR ou nova receita de mensalidade e sem bloqueio por mensalidade. Não equivale a receber dinheiro.
3. Para mensalidade positiva, sem pagamento confirmado até o vencimento, bloquear a partir do dia seguinte. Exemplo: vence dia 5; dia 6 bloqueia, sem tolerância.
4. O usuário confirma o pagamento; a confirmação válida libera o acesso e a conta volta a participar do indicador mensal conforme a competência quitada.
5. A falta de pagamento não deve virar automaticamente receita no mês seguinte.
6. Pagamentos antecipados podem quitar várias competências. Exemplo aprovado: mensalidade R$ 110; recebimento de R$ 220 distribuído em duas competências de R$ 110.
7. A liberação por mensalidade zero usa o mecanismo de preço/isenção do Super Admin. Não acrescentar uma regra de liberação temporária com prazo que o usuário não pediu.

### Definição de apresentação financeira adotada no plano

Para refletir o critério do usuário, o indicador será identificado como **MRR confirmado do mês**: mensalidade atribuída à competência quitada de uma conta pagante elegível. Contas com competência não quitada ficam fora desse indicador, embora o acesso só bloqueie depois do vencimento. Conta inativa/excluída não compõe a carteira ativa. Uma competência futura antecipadamente quitada aparece na cobertura futura, sem somar duas vezes ao mês atual.

Exemplo: R$ 220 recebidos hoje e distribuídos entre novembro/dezembro geram um recebimento de R$ 220 na data efetiva e duas competências de R$ 110. Não geram MRR de R$ 220 em cada mês nem um segundo recebimento em dezembro.

Separar visualmente MRR confirmado, mensalidade contratada, cobranças/pendências, recebimentos por data e despesas/resultado de caixa. A interpretação de MRR confirmado acima é uma especificação proposta a partir da entrevista, e ficará explícita na interface. Não rotular o agregado mensal antigo como livro de caixa.

### Decisões técnicas para preservar histórico

- Alterar a mensalidade para zero não apaga recebimentos ou cobranças históricas. A vigência da mudança precisa ser explícita no formulário, preservando competências já quitadas.
- Persistir o dia de vencimento individual e a data específica de cada competência. Para dias 29–31, usar o último dia válido do mês quando necessário, com aviso na interface; esta é a regra técnica proposta para meses curtos.
- Usar o fuso comercial já adotado no bloqueio (`America/Sao_Paulo`) para competência, limites de data e comparação de vencimento; não depender do fuso do servidor da VPS.
- Pagamento parcial pode ser registrado como hoje, mas não significa quitação integral. Manter a regra atual de bloqueio até quitação, salvo isenção definida pelo usuário.
- Política de estorno/desconto retroativo ou baixa de dívida requer definição própria antes de acrescentar esses comandos. Não inferir essas ações a partir de alterar mensalidade.

## Como o painel será organizado

O endereço principal continua `/platform/super`, com navegação interna proposta:

- Visão geral: carteira, MRR confirmado, recebimentos disponíveis, vencimentos e bloqueios.
- CRM: funil de leads, atividades, próximos contatos e associação com conta existente.
- Prospecção: pesquisa por cidade/bairro, Instagram/site/WhatsApp encontrados, fonte e revisão antes de adicionar lead.
- Barbearias: todas as operações atuais do Master, incluindo mensalidade, vencimento, plano, isenção, ativação, exclusão/restauração e DNS.
- Financeiro: cobranças por competência, recebimentos e alocações, pagamentos antecipados, despesas, câmbio e recorrências.
- Tarefas/modelos e relatórios: reaproveitar os módulos já implementados da Gestão.
- Suporte: acesso temporário como admin de uma conta, com motivo, escopo, expiração e encerramento.

Os caminhos internos poderão ser `/platform/super/crm`, `/prospeccao`, `/barbearias`, `/financeiro`, `/tarefas`, `/relatorios` e `/configuracoes` sob o mesmo prefixo. Não criar um site separado ou usar iframe de uma aplicação Gestão externa.

## Arquitetura de destino

### Frontend existente

Dividir o componente Master em módulos sob `components/admin/platform/`, com layout e navegação compartilhados em `app/platform/super/`. Portar componentes úteis da Gestão; não importar arquivos pelo caminho absoluto de outra worktree. Estilos do CRM devem ser limitados ao painel Master para não alterar as telas do cliente/barbeiro.

Manter a mesma conta e entrada Master. Adaptar o fluxo administrativo a uma sessão privada HttpOnly, com BFF em `app/api/platform/`, dentro do mesmo Next.js já publicado. As sessões persistem na API/banco já existentes. A conta é validada pelos serviços atuais de autenticação; não criar cadastro ou senha paralelos. Preservar o login normal dos clientes e barbearias.

O BFF terá destinos e operações permitidos, validação de Host/Origin/CSRF para mutações, expiração, revogação e respostas privadas sem cache. Não usar um proxy arbitrário de URLs. A integração dos formulários atuais entra nessa migração para não coexistirem dois controles financeiros divergentes.

### API existente

Portar validação, serviços transacionais e contratos da Gestão para módulos Fastify sob `src/services/platform-management/`, `src/controllers/platform-management/`, `src/validations/platform-management/` e rotas com prefixo `/api/v1/admin/management`.

O contrato interno da sessão Master será definido na primeira entrega, com login, consulta e revogação consumidos apenas pelo BFF. A API revalida usuário ativo, SUPER_ADMIN e allowlist por ID do operador autorizado nas rotas de gestão. Nenhuma decisão de autorização depende de role/id enviado livremente pelo navegador. A sessão de suporte não pode chamar endpoints globais da Gestão ou de cobrança.

Reutilizar os serviços administrativos atuais para conta, plano, domínio, exclusão e pagamento. Evoluir o serviço financeiro canônico compartilhado; a tela antiga, o novo financeiro e o bloqueio operacional devem ler/escrever a mesma regra. Nenhuma cobrança duplicada por existir um segundo formulário.

### Mesmo PostgreSQL do SaaS

Criar tabelas de gestão com nomes de plataforma para distingui-las de dados dos salões. Modelos propostos: `PlatformManagementSession`, `PlatformCrmLead`, `PlatformCrmActivity`, `PlatformManagementTask`, `PlatformMessageTemplate`, `PlatformExpense`, `PlatformExpenseSeries`, `PlatformManagementAudit` e `PlatformMutationReceipt`.

Para o financeiro: evento de recebimento `PlatformReceipt` e distribuição `PlatformReceiptAllocation`, ligados ao tenant e às competências. Preservar `TenantPlatformPayment` e reconciliá-lo de forma transacional com as novas alocações. Acrescentar regra de vencimento individual a `Tenant`; manter valores históricos por competência.

Nomes finais e FKs serão conferidos contra o schema Prisma do backend antes da migration. Usar centavos/decimal exato nos novos registros; conversão dos Float legados deve validar precisão, limites e inconsistências. Não fazer upgrade Prisma 5 → 6 apenas para copiar a Gestão. Não inserir as tabelas de plataforma nos relatórios financeiros dos salões.

Uma transação deve salvar alteração, atividade, auditoria e recibo de idempotência quando cabível. Definir políticas RLS de plataforma e autorização de aplicação, com negação para OWNER, PROFESSIONAL, RECEPTIONIST, CUSTOMER e credenciais de suporte. Testar também com usuário PostgreSQL sem bypass.

## Sequência de implementação

### Etapa 1 — Baseline, contratos e sessão unificada

**Arquivos principais:** `app/platform/super/page.tsx`, `components/admin/SuperAdminDashboard.tsx`, `lib/auth.ts`, `lib/api.ts`; no backend, `src/routes/admin.routes.ts`, `src/middlewares/auth.middleware.ts`, `src/services/auth.service.ts`, schema Prisma e novos módulos de sessão Master.

- [x] Registrar os fluxos atuais e os testes de cadastro, plano, zero, pagamento, bloqueio e suporte antes de refatorar.
- [x] Fechar o contrato do BFF/sessão e allowlist; adaptar login Master sem duplicar a identidade e sem alterar o login das barbearias.
- [x] Criar a migration aditiva da sessão Master nesta etapa, antes de usar persistência em `PlatformManagementSession`; verificar aplicação em banco descartável e expiração/revogação.
- [x] Criar layout/navegação Master reutilizáveis com uma chave de ativação no projeto existente; manter as operações atuais utilizáveis durante a adaptação.
- [x] Testar acesso direto às rotas privadas, expiração, revogação, CSRF, host de tenant e retorno após logout. Nunca cachear dados Master no service worker/PWA.

**Aceite:** mesma conta e endereço; login protegido e funções atuais preservadas. O layout pode ser revertido pela chave de ativação, sem criar outro deployment/projeto.

### Etapa 2 — Banco e serviços do CRM no backend atual

**Origem:** `meucorteja-gestao/prisma/schema.prisma`, `src/server/crm/`, `src/server/finance/` e testes associados. **Destino:** schema Prisma do SaaS, migration aditiva nova e módulos `platform-management`.

- [x] Criar migration compatível com o schema SaaS incluindo CRM/despesas/auditoria/idempotência e políticas, preservando a sessão criada na etapa 1. Não aplicar `202611170001_init` da Gestão no SaaS.
- [x] Portar CRUD de leads, atividades, tarefas e modelos, com filtros, paginação, versão e retries sem duplicação; adicionar vínculo ao tenant validado no mesmo banco.
- [x] Portar despesas, câmbio e recorrências preservando as regras e os testes existentes.
- [x] Validar migration em base descartável compatível, deploy repetido sem pendências, schema sem divergências e preservação de tenants/usuários/mensalidades existentes.
- [ ] Examinar se existem dados reais na Gestão antes de planejar importação; não importar fixtures ou conectar outro banco automaticamente. Nenhuma importação é necessária por haver código de teste local.

**Aceite:** APIs da Gestão funcionam no Fastify e no mesmo banco SaaS, com isolamento, auditoria, idempotência e persistência comprovados.

### Etapa 3 — Telas do CRM dentro do Master

**Origem:** `meucorteja-gestao/src/components/production/` e estilos úteis. **Destino:** `components/admin/platform/`, rotas filhas de `app/platform/super/` e transporte `lib/platform/`.

- [x] Incorporar o funil, cadastro/detalhe, atividades, tarefas, modelos e vínculo lead–tenant.
- [x] Adaptar transporte, contratos e tratamento de erro ao BFF/API do Master; não copiar URLs `/api/gestao` sem implementar o contrato de destino.
- [x] Incorporar Barbearias preservando todas as ações administrativas existentes e suas confirmações. Conectar a sessão de suporte existente pelo novo BFF, mantendo motivo/escopo/expiração e actor SUPER_ADMIN auditado.
- [x] Testar recarga, duas abas, conflito de versão, resposta atrasada após trocar de lead e páginas mobile. Estilos não podem vazar para `/admin/<salonSlug>` ou páginas públicas.

**Aceite:** CRM e gestão de contas no endereço Master, sem depender de servidor ou banco da Gestão separada.

### Etapa 4 — Prospecção no mesmo backend

**Origem:** `meucorteja-gestao/src/server/prospecting/search.ts` e `prospect-finder.tsx`. **Destino:** adaptador em `src/services/platform-management/prospecting.service.ts`, rota protegida e tela Prospecção do Master.

- [x] Portar a integração server-side com Brave, validação de links, fonte, paginação, limites e erros distintos de lista vazia.
- [x] Permitir revisão de Instagram/site/WhatsApp antes de criar lead; guardar URL/data de origem e manter ausências explícitas. Não converter telefone comum em WhatsApp.
- [ ] Configurar chave privada e direito de armazenamento nas variáveis do backend existente. Sem configuração, mostrar pendência; não inventar resultados ou enviar mensagens.
- [x] Testar busca com respostas controladas e persistência real local. Consulta externa real somente com chave/plano configurados pelo responsável.

**Aceite:** pesquisa e salvamento pelo painel unificado. API de busca é uma dependência externa opcional; não exige novo serviço na VPS/Vercel, mas pode exigir contratação do provedor.

### Etapa 5 — Vencimentos e bloqueio conforme o Super Admin

**Arquivos principais do backend:** `src/config/tenant-plans.ts`, `src/services/admin.service.ts`, `src/middlewares/billing.middleware.ts`, `src/lib/tenant-billing-access.ts`, autenticação, suporte e novos serviços financeiros compartilhados.

- [x] Persistir o dia de vencimento individual e sua vigência. Backfill usa dado confiável do tenant/cobranças; ausência ou conflito deve ser revisado, sem inventar dia específico.
- [x] Criar e validar nesta etapa a migration aditiva dos campos de vencimento; não esperar a entrega de recebimentos para persistir essa regra.
- [x] Resolver a situação da competência atual a partir da condição contratada e pagamentos, mesmo se ainda não houver linha materializada de cobrança. Não depender da abertura do dashboard, de novo cron ou de novo processo para bloquear.
- [x] Manter criação/materialização de cobranças em operações idempotentes explícitas. As novas leituras de métricas/listagem não geram cobranças. Distinguir cobrança esperada de documento já emitido.
- [x] Aplicar a mesma função de elegibilidade à autenticação, painel, operações públicas já cobertas e suporte; não liberar acesso por faltar uma cobrança ou data no banco.
- [x] Cobrir: vence 5/libera dia 5/bloqueia dia 6, fuso da VPS diferente, virada do mês sem visita ao Master, mensalidade zero, conta inativa/excluída e dia 29–31 em mês curto.

**Aceite:** zero mantém isenção; conta pagante vencida bloqueia no dia seguinte; data individual é respeitada em cada competência. Regras históricas não são apagadas por mudança de mensalidade.

### Etapa 6 — Recebimentos, antecipação e indicadores

**Arquivos principais:** modelos `PlatformReceipt`/`PlatformReceiptAllocation`, serviços financeiros administrativos, contratos/validações de pagamento, formulários do Master e consultas de indicadores.

- [x] Criar migration aditiva de recebimentos/alocações, preservando os campos de vencimento da etapa 5 e os checksums/valores das migrations anteriores.
- [x] Registrar um recebimento com data efetiva e valor, distribuindo explicitamente entre competências. Exigir soma consistente, tenant correto e confirmação transacional/idempotente.
- [x] Encaminhar `recordPayment` e `confirmPayment` atuais ao mesmo serviço canônico. Ao confirmar um saldo restante, não registrar novamente o que já foi pago; uma confirmação repetida não cria receita duplicada.
- [x] Permitir escolher competências de um pagamento antecipado e revisar os valores antes de confirmar. Não atribuir todo o recebimento ao mês atual ou substituir silenciosamente o preço vigente de meses já quitados.
- [x] Se uma mudança de mensalidade atingir competências futuras já pagas, apresentar a divergência para resolução explícita; não redistribuir ou estornar o adiantamento automaticamente.
- [x] Criar consultas somente leitura para MRR confirmado, contratado, pendências, recebimentos por data e despesas/caixa. Mostrar período, cobertura e indisponibilidade parcial.
- [x] Reconciliar o legado: preservar agregados mensais, classificar sua origem e não estimar datas de parcelas inexistentes. Data `paidAt` de quitação não é prova da data de todas as parcelas anteriores. Caixa histórico sem evidência permanece incompleto.
- [x] Testar R$ 220 distribuídos em duas competências de R$ 110, repetição de request, parcial e quitação posterior, mudança para zero sem apagar histórico, valores monetários limites, câmbio ausente e ausência de histórico confiável.

**Aceite:** MRR confirmado e recebimentos representam coisas distintas; antecipações quitam os meses escolhidos e não dobram o faturamento. Indicadores com cobertura incompleta aparecem identificados.

### Etapa 7 — Revisão, verificação integrada e atualização dos deployments existentes

- [x] Executar os testes Fastify/Prisma/RLS e os testes de frontend/suporte; build e typecheck dos dois projetos existentes.
- [ ] Rodar no navegador a cadeia: login Master → prospectar/revisar → salvar lead → vincular → cadastrar/editar conta → mensalidade personalizada/zero → pagar/antecipar → verificar competências/MRR → suporte/encerramento → logout.
- [ ] Exercitar duas contas e dois usuários, tentativas diretas de API, sessionStorage/cookies/HTML/logs, PWA sem cache privado e uso em celular.
- [x] Fazer revisão independente de isolamento, dinheiro, concorrência e compatibilidade antes da liberação; registrar evidências da implementação unificada. Os testes antigos da Gestão não comprovam essa unificação por si só.
- [ ] Preparar backup/restauração, conferir o histórico Prisma e os destinos reais. Validar primeiro localmente e em um ambiente de teste já disponível; não criar um novo ambiente hospedado por suposição.
- [x] Entregar diff, comandos de migration e instruções de atualização. Quando a publicação estiver autorizada: aplicar migrations aditivas no banco existente, atualizar API, atualizar o mesmo frontend/deployment e ativar os módulos gradualmente.
- [x] Manter tabelas/auditoria em rollback de aplicação; desativar módulos por chave e manter encerramento de suporte disponível. Não executar downgrade SQL destrutivo automático. O histórico legado SaaS exige baseline reconciliado para bancos vazios de teste.

**Aceite final:** um único Master no endereço atual, dois projetos já existentes atualizados, mesmo banco SaaS e nenhuma implantação adicional da Gestão.

## Limites e pontos de atenção

- O trabalho já feito na Gestão será reaproveitado, mas handlers Next e Prisma 6 não podem ser copiados diretamente para Fastify/Prisma 5 sem adaptação e testes.
- O fluxo Master atual de JWT no navegador é diferente do BFF privado proposto. Esta mudança é parte explícita do trabalho e precisa preservar a entrada e os usuários existentes, não enfraquecer autorização para encaixar a UI.
- Dados de gestão de plataforma compartilham infraestrutura, mas não devem ficar acessíveis a contas de barbearias. RLS e autorização precisam negar acesso também às exportações, pesquisa e rotas diretas.
- Preservar todos os recursos atuais, inclusive criação com cópia de configuração, estoques por tenant, domínios/DNS, contas excluídas e restauração. Não alterar preços globais nem provisionar domínios reais durante testes.
- A liberação de acesso de suporte continua respeitando o bloqueio financeiro atual; não conceder acesso global pela sessão de uma barbearia.
- Ainda dependem de definição comercial posterior: política de estorno/cancelamento financeiro e tratamento de divergências históricas. Não bloquear a incorporação do CRM por esses comandos ainda não pedidos.
- A implementação foi autorizada pelo usuário após a revisão deste plano. Esta entrega local não configura chaves privadas, não aplica migration permanente e não publica código.

## Resultado atualizado da implementação local

As etapas 1 a 6 foram incorporadas ao frontend e backend existentes, com quatro migrations novas no banco SaaS e reaproveitamento do suporte. A etapa 7 tem testes locais, builds, revisão de código e instruções de atualização; publicação e homologação no destino permanecem pendentes.

Os itens de navegador não marcados acima são propositalmente mais amplos que o ensaio automatizado atual. O ensaio cobre login, cadastro completo de conta/OWNER/unidade pela interface e mensalidade zero, CRM/recarga/vínculo, resposta atrasada de lead, prospecção revisada, edição de plano/preço/dia, recebimentos/antecipação/MRR, suporte/retorno, CSV, celular e logout entre abas. Atualização de um PWA já instalado continua no roteiro manual. Ensaios financeiros fictícios devem permanecer em banco descartável, inclusive usando conta de teste; não lançar receita artificial em produção. APIs de criação/bloqueio/permissão têm testes separados.

Não houve inspeção/importação de dados permanentes da Gestão. O código local usa contas sintéticas. Não houve publicação, migration permanente ou DNS. A arquitetura antiga de três aplicações continua histórica, e não é necessária para usar o novo Master.
