# Master com CRM incorporado — 20–22/11/2026

Estado: implementação local incorporada e validada; publicação pendente. O endereço continua `/platform/super`. O produto usa o frontend Next.js, a API Fastify e o PostgreSQL do SaaS existentes. A Gestão separada foi usada como referência de código e testes; não precisa ser publicada.

Preparação de publicação de 22/11: [roteiro operacional](MASTER-CRM-RELEASE.md), SQL administrativo somente leitura no backend e pacote local com código/manifesto de migrations. A preparação mantém a publicação com o usuário. O banco permanente não foi conectado nem alterado.

## O que foi incorporado

- **Visão geral:** MRR confirmado por competência, mensalidade contratada, pendências e recebimentos com data efetiva, separados entre si.
- **CRM:** leads, etapas, atividades, filtros, paginação, revisão de contato, vínculo com uma barbearia existente e exportação CSV. Persistência na API e no banco SaaS.
- **Prospecção:** pesquisa server-side com Brave, revisão antes de salvar e indicação de Instagram, site e WhatsApp encontrados. Campo ausente continua ausente; telefone comum não vira WhatsApp por suposição. Não envia mensagens.
- **Barbearias:** tela do Super Admin existente, com cadastro, planos, preço individual, isenção, estoque, ativação, exclusão/restauração, domínios e DNS. O botão individual **Acessar como admin** inicia o suporte temporário já existente.
- **Financeiro:** recebimentos, distribuição entre competências, antecipação, histórico, despesas, câmbio e recorrências. Os botões antigos de pagamento usam o mesmo serviço de recebimentos quando o módulo está ativo.
- **Tarefas, modelos e relatórios:** módulos incorporados ao mesmo layout e transporte privado.
- **Suporte:** motivo obrigatório, unidade e conta delimitadas, expiração, auditoria, encerramento e retorno ao Master. O acesso continua respeitando as condições de atividade e bloqueio da conta.

Os componentes ficam em `components/admin/platform/`, as páginas em `app/platform/super/`, e o BFF em `app/api/platform/`. Os serviços da API ficam em `src/services/platform-management/`, no backend existente. Não há importação de código de outra worktree em tempo de execução.

## Regras financeiras implementadas

1. A mensalidade personalizada é preservada ao trocar apenas o nome do plano. O valor pode ser zero.
2. **Zero é isenção:** não gera nova cobrança/receita de mensalidade, não contribui para o MRR e libera o bloqueio financeiro. Recebimentos e cobranças já registrados são preservados.
3. O vencimento recorrente é individual, de 1 a 31. Em mês curto, a cobrança usa o último dia válido, mantendo o dia contratado para os meses seguintes.
4. Vencimento dia 5 permite acesso no dia 5 e bloqueia a partir do dia 6, no fuso `America/Sao_Paulo`. A verificação funciona mesmo sem linha materializada de cobrança e sem abrir o Master. Conta pagante sem vencimento confiável exige revisão.
5. Pagamento parcial reduz o saldo, mas não equivale a quitação. A confirmação registra apenas o restante. Repetir uma confirmação quitada não cria outro recebimento.
6. R$ 220 distribuídos em duas competências de R$ 110 são um recebimento de R$ 220 na data efetiva e duas mensalidades quitadas. O mês seguinte não recebe outro lançamento de caixa automaticamente.
7. Mudar preço com alocações futuras exige confirmar explicitamente a preservação dos adiantamentos. O sistema não redistribui nem estorna dinheiro automaticamente.
8. Recebimento, alocações, atualização dos agregados mensais e auditoria são transacionais. Tentativas repetidas usam idempotência; transações concorrentes não podem quitar o mesmo saldo duas vezes.

**MRR confirmado do mês** considera competências quitadas de contratos pagantes da carteira atualmente ativa. É uma leitura da carteira atual no período escolhido, e não uma reconstrução da situação contratual histórica. Contrato hoje isento/inativo/excluído não participa desse MRR; dinheiro efetivamente recebido permanece no histórico de caixa.

`TenantPlatformPayment` foi preservado. Valores pagos antigos sem alocação comprovada não recebem datas inventadas. A presença desse legado marca a cobertura de caixa como parcial de forma conservadora. Despesa em moeda estrangeira sem câmbio também impede apresentar resultado de caixa como completo. Estorno e perdão retroativo de dívida continuam dependendo de uma política própria, ainda não solicitada.

## Autenticação e isolamento

O Master usa a conta SUPER_ADMIN existente, validada contra a allowlist de IDs estáveis. Não existe senha ou cadastro paralelo. A sessão privada tem prazo absoluto de oito horas, credencial opaca com hash no banco e cookie HttpOnly no BFF; os tokens normais do SaaS não são entregues ao navegador nesse fluxo. O login normal de OWNER permanece disponível.

O BFF valida Host/Origin/CSRF, restringe caminhos/métodos/destino da API e limita corpos e tempo das requisições. As rotas revalidam usuário ativo, papel e allowlist; credenciais de suporte não recebem permissão global. As tabelas de plataforma têm RLS próprio, inclusive teste com usuário PostgreSQL sem privilégio de bypass.

As páginas/APIs Master usam respostas privadas sem cache. A configuração PWA usa `NetworkOnly` para esses caminhos. Logout revoga a sessão antes de limpar a credencial, descarta a navegação privada e é revalidado nas outras abas ao retomar o foco. O acesso ao suporte usa POST com código de uso único, sem credencial Master na URL ou no storage.

## Migrations do mesmo banco SaaS

No repositório `styleflow-backend`, foram acrescentadas quatro migrations:

- `20261120100000_platform_management_session`: sessão privada Master.
- `20261120110000_platform_management_crm`: CRM, tarefas, modelos, despesas, auditoria, idempotência, vínculos e policies.
- `20261120120000_platform_billing_due_day`: dia recorrente de vencimento; backfill somente de dias históricos sem conflito.
- `20261120130000_platform_receipts`: recebimentos e alocações em centavos, índices, relacionamentos e RLS.

A migration anterior `20261117170000_support_access` continua sendo requisito do suporte e foi preservada. **Não aplicar `202611170001_init` da Gestão no banco SaaS.** Ela pertence à arquitetura separada anterior.

O ensaio local aplicou suporte e as quatro novas migrations pelo Prisma, repetiu o deploy sem pendências, comparou schema sem divergência e conferiu preservação dos campos anteriores de tenant, usuário, salão e mensalidade. O histórico legado SaaS requer baseline reconciliado para criar um banco completamente vazio; o baseline de testes não deve ser marcado como aplicado em banco real por suposição.

Em 22/11, antes da primeira publicação confirmada como ainda não realizada pelo usuário, a migration nova de vencimento recebeu dois ajustes: transação com contexto administrativo local para respeitar o cenário de RLS forçada sem superusuário, e exclusão de históricos compostos apenas por datas finais de meses curtos, que não provam o dia contratado. Essa definição final será identificada pelo checksum no pacote; não substitui SQL de uma migration já aplicada em algum ambiente desconhecido. O ensaio agora carrega as policies RLS legadas reais e aplica como proprietário sem superuser/BYPASSRLS, além de preservar pagamentos parciais/quitados e não inventar recebimentos.

## Configuração nos dois projetos existentes

Na API, preservar o `DATABASE_URL` SaaS e as configurações normais do ambiente. Acrescentar:

```dotenv
PLATFORM_MANAGEMENT_ENABLED=true
PLATFORM_MANAGEMENT_ALLOWED_USER_IDS=<ID estável da sua conta SUPER_ADMIN>
SUPPORT_ALLOWED_SUPER_ADMIN_IDS=<mesmo ID autorizado para suporte>
BRAVE_SEARCH_API_KEY=<chave privada, se usar a pesquisa>
BRAVE_SEARCH_STORAGE_ALLOWED=false
```

A última variável só deve virar `true` quando o plano do provedor permitir armazenar os resultados. Sem chave/permissão, a pesquisa apresenta a pendência de configuração. O restante do CRM continua utilizável com cadastro manual.

No servidor do frontend existente:

```dotenv
PLATFORM_MANAGEMENT_ENABLED=true
PLATFORM_ADMIN_ORIGIN=https://<origem atual do Master>
PLATFORM_API_BASE_URL=https://<API existente>/api/v1
SUPPORT_ADMIN_ORIGIN=https://<mesma origem atual do Master>
SUPPORT_ALLOWED_GESTAO_ORIGIN=https://<mesma origem atual do Master>
SUPPORT_API_BASE_URL=https://<API existente>/api/v1
SUPPORT_SESSION_SECRET=<segredo privado de pelo menos 32 bytes>
NEXT_PUBLIC_USE_MOCK_ADMIN=false
```

Apesar do nome legado, `SUPPORT_ALLOWED_GESTAO_ORIGIN` passa a ser a própria origem do Master unificado. O proxy deve preservar o Host externo. Nenhuma das credenciais privadas usa prefixo `NEXT_PUBLIC_`. Flags dos dois projetos precisam ser ativadas em conjunto; `/login` e as páginas Master são dinâmicas para ler a configuração do servidor.

## Verificação local

Resultados de 20–21/11/2026, com contas sintéticas e PostgreSQL descartável em loopback:

- Backend SaaS completo: **339 aprovados e 1 ignorado**, em 52 arquivos. O caso ignorado requer RLS e foi executado na rodada seguinte.
- Isolamento com RLS ativo e usuário PostgreSQL sem bypass: **34 aprovados**, incluindo sessão, CRM, recebimentos, concorrência e suporte.
- Frontend: **8 testes de sessão/dinheiro e 12 de suporte aprovados**; typecheck separado sem diagnósticos.
- Migrations: deploy, repetição sem pendências, comparação de schema e preservação de registros concluídos. Evidência local: `artifacts/migrations-852a2053-da75-4266-be10-8f48eb577614/result.json`, no checkout de referência.
- Navegador: cadeia integrada aprovada com login privado, OWNER preservado, CRM/recarga/vínculo, busca com revisão e persistência, resposta atrasada entre leads, preço negociado, dia recorrente, antecipação/MRR, suporte por conta/retorno, CSV, celular, logout entre abas e recusa de reentrada.

Foi feita revisão independente, somente leitura, seguida de nova revisão das correções. Os quatro achados importantes foram corrigidos: preservação do dia recorrente, preservação do preço ao trocar plano, atualização da cobrança dentro do mesmo lock de recebimentos e rejeição de respostas atrasadas entre leads. Nenhum achado importante desses quatro permaneceu na segunda revisão.

O teste de regressão do dia recorrente falhou antes da correção e passou depois; o mesmo ocorreu com a troca de lead por resposta atrasada no navegador. O ensaio também revelou que formulário sob `no-referrer` enviava `Origin:null` no Chromium. O suporte passou a usar fetch same-origin e o fluxo completo foi aprovado mantendo a validação estrita de origem.

Builds de frontend e backend concluídos com código 0; typecheck separado do frontend também concluído com código 0. As páginas Master e `/login` ficaram dinâmicas no build do módulo ativo. A advertência de convenção `middleware` é anterior ao módulo; a migração geral desse arquivo para `proxy` não faz parte desta mudança.

Logs locais: `artifacts/master-saas-full-tests.log`, `artifacts/master-rls-tests.log`, `artifacts/master-migrations.log` e `artifacts/master-browser-final.log`, no checkout de referência. Build do backend em `styleflow-backend/artifacts/master-build.log`; build, typecheck e testes do frontend em `.platform-*.log` e `.support-tests.log`. Capturas ficam em `styleflow-backend/artifacts/master-browser/`. Não houve acesso a banco permanente, alteração de conta real, DNS ou publicação.

Os runners locais usam as dependências de PostgreSQL embarcado e Playwright do checkout de referência `meucorteja-gestao`. Isso é uma conveniência do laboratório, não uma dependência dos serviços publicados. Na raiz desse checkout:

```powershell
node scripts/run-with-test-db.mjs --node C:/Users/rn558/.codex/worktrees/gestao-support-backend/styleflow-backend/scripts/test-support-db.mjs --maxWorkers 2
$env:RLS_ENABLED='true'
node scripts/run-with-test-db.mjs --node C:/Users/rn558/.codex/worktrees/gestao-support-backend/styleflow-backend/scripts/test-support-db.mjs src/tests/management-session.integration.test.ts src/tests/management-crm.integration.test.ts src/tests/management-receipts.integration.test.ts src/tests/support-access.integration.test.ts --maxWorkers 2
Remove-Item Env:RLS_ENABLED
npm run test:migrations
node scripts/run-with-test-db.mjs --node C:/Users/rn558/.codex/worktrees/gestao-support-backend/styleflow-backend/scripts/test-support-db.mjs --node scripts/test-master-browser.mjs
```

No frontend: `npm run test:platform`, `npm run test:support`, `npx tsc --noEmit --incremental false` e `npm run build` com o módulo ativo. No backend: `npm run build`. O projeto frontend mantém a configuração legada `ignoreBuildErrors`; por isso o typecheck separado é obrigatório e não pode ser substituído pelo build.

O navegador usa Next dev local e API real, com um único banco SaaS. O provedor de busca recebe resposta controlada; a persistência de leads, recebimentos e suporte é real. Não foi realizada pesquisa comercial externa. A configuração `NetworkOnly` foi conferida no código/build; ainda cabe validar atualização de um service worker já instalado em aparelho real antes da liberação.

## Atualização posterior dos serviços atuais

Para disponibilizar a implementação será necessário atualizar **os mesmos dois projetos** já existentes e aplicar as migrations aditivas ao banco SaaS correspondente. Não foi criado terceiro app, banco, cron ou processo hospedado.

Antes dessa atualização: conferir destinos privados e histórico com `npx prisma migrate status`, preparar backup/restauração e revisar os tenants cujo vencimento não pôde ser inferido. No backend correto, o comando de aplicação é `npm run db:migrate`. Esse comando foi executado apenas pelos ensaios descartáveis nesta entrega.

Depois: atualizar a API, o frontend existente e ativar suas flags em conjunto; homologar com conta de teste no ambiente de destino. Para recuar a interface, desativar a ativação de forma coordenada e preservar tabelas, recebimentos e auditoria. Não reverter SQL com exclusões nem continuar registrando pagamentos pelos serviços financeiros antigos durante uma reversão sem avaliar a reconciliação.

Continuam pendentes a publicação, a configuração privada do buscador, a revisão dos dados reais de vencimento e a homologação no ambiente existente. Os testes locais não comprovam o estado atualmente publicado na VPS/Vercel.

## Preparação para publicação concluída em 22/11

- Nova execução: backend **339 aprovados e 1 ignorado**, isolamento RLS **34 aprovados**, frontend **8 + 12 aprovados**. O caso ignorado da suíte geral foi exercitado na execução com RLS.
- Builds dos dois projetos e typecheck separado do frontend concluídos com código 0.
- Navegador com API/banco reais de teste: cadastro completo de conta/OWNER/unidade pela interface, isenção zero sem cobrança, CRM, vínculo, busca controlada/revisão, preço negociado, dia recorrente, recebimentos por competência, MRR, suporte/retorno, CSV, celular, logout entre abas e reentrada negada.
- Migrations aplicadas como proprietário PostgreSQL sem superuser/BYPASSRLS sobre as policies legadas reais. Aplicação repetida sem pendências, schema sem divergência e pagamentos históricos preservados. Datas curtas ambíguas permaneceram nulas; não foram criados recebimentos. Evidência: `artifacts/migrations-85d20145-efa1-4548-85c5-c358c2332aa3/result.json` do laboratório.
- Os cenários de backfill falharam antes das correções e passaram depois. A suíte também deixou de depender da inexistência de fixtures de outros arquivos no teste do diretório; as consultas do produto não foram filtradas artificialmente.
- Revisão independente de preparação resultou nos ajustes de RLS/backfill, conferência manual de histórico/checksums antes do deploy e restrição de pagamentos fictícios ao laboratório. Os fluxos de produção do roteiro conferem leitura/acesso; não criam receita artificial.

Evidências atuais no laboratório: `artifacts/release-2026-11-22-{migrations,backend-tests,rls-tests,browser}.log`. No backend, `artifacts/release-2026-11-22-build.log`. No frontend, `.platform-release-*.log`. A verificação Gitleaks dos arquivos preparados não encontrou segredos; arquivos privados de ambiente e anexos ficam fora da entrega.

O pacote local fica em `artifacts/master-crm-release-2026-11-22/`, no frontend: arquivos ZIP dos dois projetos, bundles das branches, manifesto de versões/arquivos e `migrations-sha256.json`. Só contém arquivos versionados, sem `node_modules`, `.env` privado ou dados de bancos de teste. Os hashes de SQL usam os bytes do Git.

Decisões de preparação: manter as branches/worktrees e a publicação com o usuário; não aplicar em um banco real sem conexão/destino conferidos; confirmar a Production Branch do Vercel antes do envio, pois a origem do frontend é `frontend-only`; manter a busca comercial desativada enquanto a autorização de armazenamento/configuração não estiver conferida. Por isso, backup/histórico/dados reais, publicação e aceitação no destino continuam sendo gates do roteiro — prontidão local não certifica esses dados externos.
