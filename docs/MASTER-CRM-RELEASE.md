# Publicação do Master com CRM — 22/11/2026

Este roteiro atualiza os dois projetos existentes. Não criar outro banco, projeto Vercel, serviço VPS ou deploy da aplicação `meucorteja-gestao`. O usuário fará a publicação; a preparação local não acessa banco permanente nem dispara autodeploy.

## Versões e branches

- Backend: repositório `NavarroGt22/styleflow-backend`; base `90df0ea`, igual a `origin/main` conferido em 22/11.
- Frontend: repositório `NavarroGt22/styleflow-frontend`; base `6749e4f`, igual a `origin/frontend-only` conferido em 22/11. `origin/main` é uma linha diferente, 87 commits atrás desta base. Conferir a **Production Branch do projeto Vercel atual** antes de publicar; não trocar essa configuração nem enviar esta entrega para `main` por suposição.
- As duas branches locais de entrega são `feat/gestao-support-access`, uma em cada repositório. Commits finais e resultados ficam no relatório `MASTER-CRM-IMPLEMENTATION.md` e no manifesto local da entrega.

O backend possui workflow de autodeploy em push para `main`, webhook e atualização por cron na VPS. **Antes de enviar para uma branch monitorada**, pausar/coordenar essa automação na janela de atualização e concluir o backup e a conferência do histórico abaixo. Não confiar apenas em desligar o webhook: o cron também pode atualizar. Conferir o código candidato em uma cópia administrativa fora do checkout monitorado ou manter a automação pausada até passar pelos gates. Nenhum push foi feito nesta preparação.

## 1. Preparar o destino existente

Confirmar privadamente o `DATABASE_URL` da API, seu histórico Prisma, as origens do Master/API e o ID estável do SUPER_ADMIN. Esses valores reais não estão neste checkout. Preservar JWT, configuração de e-mail, domínios e demais segredos atuais; não substituir o `.env` inteiro pelo exemplo.

Fazer backup do banco SaaS com a ferramenta PostgreSQL já utilizada na operação, por exemplo `pg_dump -Fc`, para local privado fora do repositório. Conferir que o arquivo é legível e testar a restauração em banco isolado. Este roteiro não é autorização para restaurar por cima do banco real. Manter também a versão anterior dos dois aplicativos disponível para retorno.

Preparar inicialmente `PLATFORM_MANAGEMENT_ENABLED=false` nos dois projetos. O banco e os dois aplicativos devem estar atualizados antes de ativar o módulo. A chave Brave é opcional para a primeira publicação do CRM.

## 2. Aplicar as migrations do backend

Migrations necessárias, em ordem:

1. `20261117170000_support_access` — pré-requisito do suporte.
2. `20261120100000_platform_management_session`.
3. `20261120110000_platform_management_crm`.
4. `20261120120000_platform_billing_due_day`.
5. `20261120130000_platform_receipts`.

As quatro últimas são as migrations novas do CRM. Se suporte já estiver aplicado, o Prisma não o reaplica. **Não aplicar a migration inicial da Gestão separada no SaaS. Não usar `db push`, `migrate reset` ou `migrate resolve` para esconder divergências.** O histórico legado só cria um banco vazio com baseline reconciliado; o baseline dos testes não pertence à produção.

Com o código desta entrega no checkout de backend correto e o `.env` privado apontando para o banco SaaS correspondente:

```sh
npm ci
npm run build
npx prisma migrate status
```

**Parar e revisar antes de qualquer aplicação.** `migrate status` pode retornar código 1 por pendências esperadas ou por erros; não prosseguir automaticamente. As únicas pendências desta entrega são o subconjunto ainda não aplicado dos cinco nomes listados acima. Qualquer migration antiga inesperada, falha, banco inacessível ou histórico incompatível exige investigação. `migrate deploy` aplica todas as pendências, não somente as do CRM.

O Prisma 5.22 não confere SQL editado/checksums por meio de `migrate status`. Em cliente SQL privado, conferir também os registros já aplicados:

```sql
SELECT migration_name, checksum, finished_at, rolled_back_at
FROM "_prisma_migrations"
ORDER BY started_at, migration_name;
```

Comparar com `migrations-sha256.json` do pacote local da entrega. Os hashes correspondem aos bytes versionados no Git; não calcular sobre uma cópia Windows convertida para CRLF. Divergência não deve ser ocultada com `resolve`, edição do histórico ou reaplicação por suposição. O baseline descartável dos testes não aparece no manifesto de produção.

Somente após aprovar destino, backup, histórico, checksums e lista exata de pendências, executar a aplicação como etapa separada:

```sh
npm run db:migrate
```

Se concluir com código 0, conferir novamente em uma etapa separada:

```sh
npx prisma migrate status
```

O resultado final deve informar que não há pendências. Não reiniciar a API com a entrega nova se a aplicação/conferência falhar.

### Se a API atual usa o Docker Compose da VPS

No diretório do backend que contém o `.env` e `docker-compose.vps.yml`, após preparar backup e conferir o código:

```sh
docker compose -f docker-compose.vps.yml build api
docker compose -f docker-compose.vps.yml run --rm --no-deps api npx prisma migrate status
```

**Parar aqui e passar pelo mesmo gate de banco/backup/histórico/checksums/pendências acima.** Não enviar para a branch monitorada nem seguir para o comando seguinte enquanto houver divergência.

Só após aprovação, aplicar:

```sh
docker compose -f docker-compose.vps.yml run --rm --no-deps api npx prisma migrate deploy
```

Se a aplicação concluir com código 0, conferir:

```sh
docker compose -f docker-compose.vps.yml run --rm --no-deps api npx prisma migrate status
```

Esses comandos futuros usam o banco configurado no `env_file` da API; não iniciar outro Postgres. O `CMD` existente do Docker também executa `migrate deploy` antes de iniciar o servidor; a segunda execução não deve ter pendências. Se a operação atual usa Railway, manter seu serviço existente, cujo `start:railway` já executa as migrations. Não iniciar ambos os caminhos de hospedagem por causa deste roteiro.

## 3. Conferir dados antes de ativar

Executar, em cliente SQL privado do mesmo banco/schema, `prisma/scripts/master-crm-postflight.sql`, incluído no backend. É uma transação somente leitura que verifica o histórico e os flags de RLS habilitada/forçada das onze tabelas de plataforma, lista SUPER_ADMINs ativos e identifica contas pagantes sem dia recorrente confiável. Não enumera/verifica cada policy individual nem certifica as permissões efetivas da aplicação.

Uma lista vazia na consulta final de contas é o esperado. Havendo contas, definir os dias com o responsável antes da ativação: ausência ou conflito histórico não pode virar um dia presumido. Com o módulo ativo, conta pagante sem vencimento confiável fica bloqueada. Nenhum pagamento antigo recebe data de caixa inventada.

Histórico composto somente por finais de meses curtos também é ambíguo: dia 30 de novembro pode representar contrato no dia 30 ou 31. Essas contas permanecem sem dia presumido e aparecem para conferência.

O SQL não confirma sozinho permissões efetivas da aplicação nem substitui os testes com OWNER e SUPER_ADMIN. Os testes locais de RLS usam um usuário PostgreSQL sem superuser/bypass; conferir também a política de permissões da instalação real.

## 4. Configurar e atualizar o frontend existente

No backend, acrescentar às variáveis privadas existentes:

```dotenv
PLATFORM_MANAGEMENT_ENABLED=false
PLATFORM_MANAGEMENT_ALLOWED_USER_IDS=<ID SUPER_ADMIN conferido no banco>
SUPPORT_ALLOWED_SUPER_ADMIN_IDS=<ID autorizado para suporte>
BRAVE_SEARCH_STORAGE_ALLOWED=false
```

Se já cadastrou `BRAVE_SEARCH_API_KEY`, preservá-la no servidor. Só ativar `BRAVE_SEARCH_STORAGE_ALLOWED=true` depois de confirmar a autorização do provedor para armazenar resultados no CRM. Nenhuma credencial Brave foi colocada no código, no manifesto ou nos arquivos de exemplo.

No projeto Vercel já existente, configurar as variáveis de servidor:

```dotenv
PLATFORM_MANAGEMENT_ENABLED=false
PLATFORM_ADMIN_ORIGIN=https://<origem atual do Master>
PLATFORM_API_BASE_URL=https://<API atual>/api/v1
SUPPORT_ADMIN_ORIGIN=https://<mesma origem atual do Master>
SUPPORT_ALLOWED_GESTAO_ORIGIN=https://<mesma origem atual do Master>
SUPPORT_API_BASE_URL=https://<API atual>/api/v1
SUPPORT_SESSION_SECRET=<segredo aleatório privado de pelo menos 32 bytes>
NEXT_PUBLIC_USE_MOCK_ADMIN=false
```

Preservar `NEXT_PUBLIC_API_URL` atual, que aponta para a origem da API usada pelo painel normal. Os valores de origem acima não têm path; bases da API terminam em `/api/v1`. O proxy deve preservar o Host público. `SUPPORT_ALLOWED_GESTAO_ORIGIN`, apesar do nome histórico, agora é a própria origem do Master. Nenhuma variável privada ganha prefixo `NEXT_PUBLIC_`.

Publicar no mesmo projeto Vercel o commit do frontend desta entrega. As configurações do backend não são copiadas automaticamente para o Vercel. Validar o login normal de uma conta de teste ainda com o módulo desligado.

Após as migrations e a conferência, se a API atual usa Docker, atualizar somente o serviço existente, ainda com o módulo desligado:

```sh
docker compose -f docker-compose.vps.yml up -d --no-deps api
curl --fail http://127.0.0.1:3333/api/v1/health
```

Restabelecer webhook/cron somente depois de aprovar a versão e a configuração que serão monitoradas.

## 5. Ativar e homologar

Após banco, dados e os dois aplicativos conferidos, ativar `PLATFORM_MANAGEMENT_ENABLED=true` no backend e no frontend em uma janela coordenada. Reiniciar/reimplantar os serviços existentes para receber as variáveis. Durante a troca, não registrar pagamentos simultaneamente pelas telas antiga e nova. O backend passa a encaminhar todos os formulários Master ao mesmo livro de recebimentos.

**Ensaio com escritas: somente em PostgreSQL descartável ou cópia não produtiva.** Não registrar recebimento fictício em produção, mesmo numa barbearia de teste: ele entra no livro global e não há comando de estorno definido para apagá-lo. O ensaio local desta entrega confere:

- Login SUPER_ADMIN em `/platform/super`; usuário OWNER não entra no CRM.
- Criar lead, recarregar e confirmar persistência, editar etapa e vincular conta.
- Cadastrar uma barbearia de teste com OWNER/unidade corretos; preservar preço personalizado ao editar plano.
- Mensalidade zero: isenção, sem novo recebimento/MRR e sem bloqueio financeiro.
- Vencimento individual: bloqueio no dia seguinte, inclusive quando ainda não existe cobrança materializada; dias 29–31 preservados no mês seguinte.
- Recebimento de R$ 220 distribuído em duas competências de R$ 110: caixa uma vez e MRR por competência; repetição não duplica registro.
- Acesso como admin de uma barbearia, motivo registrado, encerramento e retorno ao Master. Outra conta fica fora do escopo.
- Logout e reabertura em outra aba negam acesso; testar celular e atualização de um PWA já instalado.
- Prospecção externa somente depois de configurada/autorizada; sem configuração, CRM manual permanece disponível.

No ambiente de produção, conferir login/negação de acesso, páginas, dados e histórico existentes, consulta de MRR/recebimentos, escopo/encerramento de suporte e logout. Não criar recebimentos fictícios, alterar vencimentos reais ou executar exclusão/domínio/DNS para validar o deploy. Um recebimento real só deve ser registrado quando corresponder a dinheiro efetivamente recebido e à operação normal autorizada pelo responsável.

## Se for necessário recuar

Interromper novas operações financeiras e coordenar o retorno dos dois aplicativos/flags. Preservar as migrations, tabelas, recebimentos e auditoria; não executar downgrade SQL destrutivo. Escritas financeiras feitas pelo código antigo durante uma reversão precisam ser reconciliadas antes de reativar o livro de recebimentos.

## Limite desta entrega

Esta preparação entrega código, migrations, ensaio local e instruções. Não comprova o histórico, backup ou dados do banco real, pois a conexão não está configurada neste checkout. A publicação, a aplicação real e a homologação do destino serão executadas por você na sequência acima.
