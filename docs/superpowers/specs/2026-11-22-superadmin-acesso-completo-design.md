# Acesso completo do SUPER_ADMIN ao painel da barbearia

Status: aprovado pelo usuário em 22/11/2026; implementação validada em ambiente local descartável.

## Pedido e resultado esperado

Rafael precisa entrar pelo CRM em cada conta e operar o painel completo para atender solicitações do cliente. Deve conseguir consultar e alterar financeiro, clientes, assinaturas, serviços, agenda, cancelados, equipe, estoque, fila, CRM da barbearia e configurações, usando as funções já disponíveis ao dono. Remover as limitações específicas do suporte que hoje ocultam essas funções.

## Abordagem

Ampliar a sessão temporária existente, reaproveitando o painel e os endpoints do dono. Essa é a abordagem recomendada: preserva a identidade real do SUPER_ADMIN na auditoria, expiração, revogação e retorno ao Master. Emitir um login normal do cliente perderia essa separação; duplicar o painel no CRM criaria duas implementações das mesmas funções.

## Comportamento

- A entrada continua partindo de Barbearias no CRM, com conta identificada e motivo registrado.
- O painel apresenta todas as áreas e operações que o dono pode usar na unidade selecionada, sem ocultações adicionais por ser suporte.
- O backend executa as operações com as permissões do dono da conta selecionada, conservando o SUPER_ADMIN como autor do acesso na auditoria.
- O escopo continua preso à conta e unidade selecionadas: parâmetros, IDs de registros e referências no corpo não podem alcançar outra conta ou unidade. Para atender outra unidade, abrir sua sessão correspondente.
- Manter sessão de 15 minutos, cookie HttpOnly, encerramento, revogação, ausência de cache e registro das operações.
- Não mudar as permissões de OWNER, funcionários ou clientes. Não alterar mensalidades, vencimentos ou pagamentos reais durante a validação.
- O acesso completo usa os formatos já existentes do painel do dono; senhas não são recuperáveis e credenciais não entram em logs ou auditoria.
- Em contas com várias unidades, alterações de marca compartilhada (nome da empresa, logotipo e cores globais) não podem ser feitas silenciosamente por uma sessão de uma única unidade. Enviar os valores atuais junto de uma edição local continua permitido.

## Alterações identificadas

Frontend: `components/admin/AdminDashboard.tsx`, componentes de abas com restrições de suporte, `lib/support/proxy-policy.ts` e resolução do usuário da sessão em financeiro/estoque/fila. Conferir também operações auxiliares como Meu link e chamadas públicas necessárias às telas.

Backend: `src/middlewares/support-access.middleware.ts`, escopo dos recursos e serviços com tratamento especial de suporte. A permissão de acesso deve cobrir explicitamente as operações do painel e verificar os recursos relacionados; não basta aceitar qualquer rota autenticada.

## Validação e entrega

Testes devem provar leitura e operações das novas áreas com dados descartáveis, rejeição de IDs e referências de outra conta/unidade, preservação de auditoria, expiração e encerramento. Executar testes relevantes, compilação e TypeScript. Validar o fluxo no navegador com banco de teste. Publicar o código verificado no GitHub; Rafael continua responsável pelo deploy manual na Vercel e pelos comandos privados na VPS. Só criar migration se a análise de implementação comprovar necessidade; o desenho reutiliza as tabelas de sessão e auditoria existentes.
