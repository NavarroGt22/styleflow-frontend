# Acesso de suporte no frontend SaaS

O painel usa uma sessão de suporte temporária aberta pela Gestão. A conta, a unidade, o operador e o vencimento aparecem na faixa do painel. A sessão administrativa que já existia no navegador permanece disponível após o encerramento.

## Configuração do servidor

- `SUPPORT_ADMIN_ORIGIN` define a origem externa do painel administrativo, com esquema e porta quando houver.
- `SUPPORT_ALLOWED_GESTAO_ORIGIN` define a única origem que pode enviar o formulário de entrada.
- `SUPPORT_API_BASE_URL` aponta para a API SaaS e termina em `/api/v1`.
- `SUPPORT_SESSION_SECRET` é um segredo de pelo menos 32 bytes para cifrar e autenticar o cookie. Use o mesmo valor nas instâncias do frontend. Rotacioná-lo invalida cookies de suporte ativos.

As quatro variáveis são lidas apenas no servidor. As origens usam HTTPS, com HTTP disponível em loopback para testes locais. O gateway deve preservar o `Host` externo. Configuração incompleta desabilita os handlers de suporte. A configuração do login normal é independente.

## Entrada e encerramento

1. A Gestão envia `code` e `sessionId` por `POST` de formulário URL-encoded para `/api/support/enter`. O código do SaaS tem duração de até 60 segundos e uso único.
2. O frontend verifica `Host` e `Origin` e troca o código com a API. A credencial de suporte fica no servidor e em um cookie cifrado com AES-256-GCM, `HttpOnly`, `SameSite=Lax`, sem `Domain` e com `Path=/api/support`. O nome do cookie é `support_session_<UUID>`, usando o UUID público da sessão. O cookie usa `Secure` em HTTPS. O prazo absoluto é o informado pela API, de até 15 minutos.
3. O redirecionamento passa por `/support?session=<id público>` e termina em `/admin/<slug>?session=<id público>`. O frontend valida o id no backend antes de renderizar o painel. O id na URL mantém a aba vinculada à sessão original. Os metadados verificados ficam em memória.
4. O transporte administrativo usa o proxy de mesma origem, que confere o id do cookie contra `X-Support-Session-Id`. Mutações também exigem `Host` e `Origin` da plataforma e `X-Support-CSRF: 1`. O service worker usa rede direta nos endpoints e páginas de suporte.
5. `Encerrar suporte` e `Sair` pedem revogação ao backend antes de liberar a sessão no frontend. Uma falha mantém a sessão disponível para nova tentativa. Ao abrir outra sessão com o mesmo operador, a API revoga a anterior. O BFF seleciona o cookie pelo UUID solicitado e exige que o UUID cifrado corresponda. O encerramento expira apenas o cookie desse UUID. A entrada pode expirar cookies de suporte anteriores que acompanhavam aquele POST. Respostas que chegam fora de ordem preservam o cookie da sessão mais nova. Uma aba antiga recebe `401` se a API já revogou sua sessão ou `409` se o navegador envia apenas o cookie de outra sessão.
6. Quando o painel não consegue validar o acesso, a aba ainda permite encerrar o suporte pelo UUID. Se a revogação falhar, a tela mostra o erro e permite repetir. A ação separada `Voltar ao painel sem encerrar` retorna à sessão normal por escolha do operador.

## Operações disponíveis

- Serviços da unidade com consulta, cadastro, alteração e exclusão.
- Agenda e cancelados com leitura, bloqueio de horário e status não financeiro nos agendamentos elegíveis.
- Equipe com leitura e ajuste de horário, preparação e comissão de barbeiros ativos.
- Salão com configuração operacional e visual, incluindo expediente e marca de exibição.

As rotas de credenciais, identidade, Master, assinatura, faturamento, pagamento, caixa, estoque, CRM, fila e WebSocket ficam fora do proxy. O backend valida os vínculos dos ids em cada operação. A API aceita corpos JSON de até 10 MiB para as alterações do painel.

## Verificação local

1. `npm ci --no-audit --no-fund`
2. `npm run test:support`
3. `npx tsc --noEmit --incremental false`
4. `npm run build`

O teste de interface usa Edge/Chromium via Playwright e um frontend local em `127.0.0.1:5310`. Defina `SUPPORT_ADMIN_ORIGIN=http://127.0.0.1:5310` no servidor de teste e aponte as URLs de API para loopback. Com o servidor iniciado, execute `npm run test:support:browser`. O script aceita `PLAYWRIGHT_MODULE_PATH` para uma instalação de Playwright externa ao checkout e `PLAYWRIGHT_CHANNEL=msedge` para o Edge instalado. O teste simula o bootstrap recusado e a primeira revogação indisponível, repete o encerramento e verifica a volta à unidade do profissional.

O checkout original `6749e4f` tinha quatro erros de nulabilidade em `PublicSalonPage.tsx`. A validação explícita do cache do pagamento e o estreitamento do método online resolveram esses diagnósticos preservando os fluxos existentes.

Em 17/11/2026, os 12 testes de handlers e transporte passaram, incluindo entradas entregues fora de ordem e encerramento tardio de uma sessão anterior. O TypeScript terminou sem diagnósticos e o build Next.js 16.3.3 com webpack concluiu. O Edge validou a revogação após falha de bootstrap e, em um segundo cenário no servidor de desenvolvimento local com API simulada, o POST entre origens, a faixa móvel, a recarga, o CSRF, a recusa da aba revogada, a retentativa de encerramento e a restauração da sessão normal. Nenhuma API de produção participou dessas verificações.

O teste de navegador aceita outra porta local via `SUPPORT_TEST_PORT`. A revisão automática de comandos bloqueou a tentativa adicional de iniciar `next start` em `127.0.0.1:5312`. A verificação do bundle neste checkout se limitou ao build.
# Ampliação em 22/11/2026

A sessão do SUPER_ADMIN agora oferece as áreas e operações do dono: financeiro, clientes, assinaturas, estoque, fila, CRM/WhatsApp e configurações, além de serviços, agenda e equipe. Não há nova migration ou variável de ambiente. Permanecem as configurações SUPPORT_* documentadas abaixo e o acesso por sessão temporária auditada.

As allowlists do BFF e da API são explícitas. A API valida os recursos nos parâmetros, filtros e referências aninhadas antes de executar a autorização normal do OWNER. A unidade selecionada e a conta continuam isoladas; autenticação normal, administração global e outras unidades não são admitidas por esse token. Operações sem corpo (fechar caixa, marcar pagamento, resgatar benefício) também passam pelo BFF. As abas usam o OWNER da sessão verificada, sem depender de token comum no sessionStorage.

As transações de assinatura, venda, fidelidade e criação de cliente avulso preservam o contexto RLS de suporte e suas opções de isolamento/timeout. A consulta de plano para estoque usa esse contexto. Cancelamento/falta de agendamento usa a mesma liquidação de benefícios do dono, e a agenda não remove os detalhes financeiros disponíveis ao dono.

Cadastro de funcionário, checkout e confirmação manual de pagamento também mantêm o contexto transacional. Status e movimentação de benefício são atômicos; cancelamento, falta e conclusão serializam o agendamento antes de ler a reserva. Ao encerrar o suporte, a validação da sessão independente do Master aguarda até 12 segundos, evitando retorno indevido ao login em uma resposta lenta.

Em contas com várias unidades, a política rejeita alterações de marca global feitas pela sessão de uma unidade, antes de qualquer gravação parcial. Valores globais inalterados podem acompanhar uma edição local. Expiração, revogação, CSRF, cookie HttpOnly e auditoria permanecem.

---
