# Contexto do Projeto: SaaS Salão/Barbearia 🚀

Este arquivo serve como a "Memória da Inteligência Artificial". Sempre que você trocar de computador ou iniciar uma nova sessão, basta pedir para a IA ler este arquivo para ela recuperar 100% do raciocínio e continuar exatamente de onde paramos, garantindo alinhamento e consistência técnica total.

---

## 🎯 O Objetivo
Construir um SaaS de alta performance, minimalista e ultra-seguro para barbearias e salões (**SaaS STYLEFLOW**). Usamos as Heurísticas de Usabilidade de Jakob Nielsen para a interface frontend e padrões de segurança de nível bancário na API backend.

---

## 🛡️ Arquitetura de Segurança & Conceitos Implementados (Nível de Produção)
- **JWT com Refresh Token (Rotação Atômica):** Access Token de curta duração (15 min) e Refresh Token UUID de longa duração (7 dias) armazenado no banco. Implementada a rotação de token atômica e resiliente (endpoint `/refresh`).
- **Middleware de Posse (`verifyEstablishmentAccess`):** Validação automática e minuciosa de posse/vínculo do inquilino para recursos sensíveis de serviços, produtos, perfis profissionais, agendamentos, registros financeiros e folhas de ponto.
- **Middleware de Roles:** Verificação baseada em funções (`verifyRole`) com payloads JSON padronizados.
- **Blacklist Resiliente com Redis:** Invalidação de tokens de acesso revogados (logout ou troca de senha) em tempo real, com fallback automático em memória caso o Redis não esteja ativo.
- **Senha Segura Exclusiva (Bcrypt):** Auditoria rigorosa para assegurar que apenas senhas criptografadas com Bcrypt (10 rounds de sal) sejam manipuladas no sistema, com exclusão completa de algoritmos fracos (MD5, SHA-1).
- **CORS Estrito:** Configurado para aceitar requisições APENAS do domínio oficial do frontend, prevenindo acessos não autorizados de terceiros.
- **Helmet:** Cabeçalhos HTTP de segurança para prevenir ataques como XSS (Cross-Site Scripting), Clickjacking e MIME Sniffing.
- **Rate Limiting:** Bloqueio global contra ataques DDoS e força bruta (máximo de 100 requisições por minuto por IP).
- **Tenant Isolation (Isolamento Invasivo de Dados):** Segurança em todas as consultas no banco de dados validando rigorosamente o `ownerId` ou `salonId`. É matematicamente impossível um salão ler, criar ou alterar dados do salão concorrente.
- **Auditoria Forense LGPD:** Todo registro de usuário aciona uma transação invisível no banco de dados (`LgpdLog`) guardando IP, Navegador (User Agent) e a Ação Consentida para fins de conformidade legal.
- **Error Handling Limpo:** Em caso de exceções no servidor, a API nunca expõe o "Stack Trace" ou detalhes internos do banco para o cliente. Retornos estruturados com mensagens amigáveis e códigos HTTP semânticos (400, 401, 403, 404, 409).


---

## 🛠 Stack Tecnológica
- **Banco de Dados:** PostgreSQL hospedado na nuvem (Neon PostgreSQL / Supabase) gerenciado via **Prisma ORM**.
- **Backend (API):** Node.js 20+, Fastify (alta performance e baixo overhead), TypeScript, Zod (validação estrita de schemas).
- **Frontend (Interface):** React 19, Vite, Tailwind CSS (Design System customizado e Dark Mode nativo), React Router Dom, Lucide-React.
- **Bibliotecas Auxiliares:** `exceljs` e `file-saver` para geração de relatórios administrativos premium no navegador.

---

## 🗄️ Modelo de Dados (Prisma Schema)
A estrutura relacional do banco de dados conta com os seguintes modelos principais:
- **User**: Mapeia e-mail, senha criptografada (`passwordHash`), nome, telefone comercial, cargo (`OWNER`, `PROFESSIONAL`, `CUSTOMER`, `SUPER_ADMIN`) e isolamento ativo.
- **Salon**: Mapeia nome, slug exclusivo de rota pública (ex: `app.com/salao-joao`), endereço comercial por extenso, telefone de suporte (WhatsApp), CNPJ, horários de expediente (`openTime`, `closeTime`), URL do Instagram, flags de comissão de produtos, taxa de comissão e soft-delete administrativo (`isActive`).
- **CustomerProfile**: Mapeia o histórico e registros agregados de clientes finais.
- **ProfessionalProfile**: Mapeia profissionais da equipe, vinculados a taxas de comissão customizadas (`commissionRate`), expediente customizado (`workStart`, `workEnd`), soft-delete (`isActive: false` para demissões seguras) e histórico de ponto (`Timecard`).
- **Service**: Serviços contendo nome, duração em minutos, preço, categoria (ex: Cabelo, Barba, Unha) e status ativo.
- **Appointment**: Agendamentos com verificação e validação anti-choque de horários. Status: `PENDING`, `COMPLETED`, `CANCELLED` e `BLOCKED` (usado para bloqueio manual administrativo de tempo sem cliente/serviço associado).
- **Product**: Estoque físico contendo nome, descrição, preço de venda, preço de custo, quantidade de estoque atual e alerta de nível crítico de reposição (`minStockAlert`).
- **ProductSale**: Vendas avulsas registradas no caixa físico de balcão (PDV/POS).
- **FinancialRecord**: Fluxo de caixa unificado contendo descrição, valor da transação, tipo (`REVENUE`, `EXPENSE`), método de pagamento (`PIX`, `CARD`, `CASH`), profissional associado para repasse de comissões, e relacionamento direto com vendas.
- **Timecard**: Registros de ponto multi-intervalo reativos de entrada (`clockIn`) e saída (`clockOut`) associando profissionais e datas no formato local `YYYY-MM-DD`.
- **LgpdLog**: Auditoria estrita de conformidade legal de dados pessoais.

---

## ✅ O que JÁ ESTÁ PRONTO (Estado Atual e Módulos Concluídos)

### 1. Módulo de Autenticação e Perfis (Portabilidade & LGPD)
- Login seguro diferenciando donos (`OWNER`) de clientes (`CUSTOMER`) e profissionais (`PROFESSIONAL`).
- Geração automática de perfis dependendo da `role` e geração de logs forenses de consentimento instantâneos.

### 2. Módulo de Salões e Configurações Gerais
- Rotas públicas de vitrine para clientes (`GET /api/v1/establishments/public`) e rotas administrativas protegidas de alteração.
- **ViaCEP Autocomplete**: Formulário com input reativo de CEP integrado que consulta o serviço ViaCEP e preenche o endereço completo de forma automatizada, evitando digitação manual.
- **Redirecionamentos WhatsApp & Instagram**: Linkagem premium com tratamento automático de URLs para perfis oficiais.
- **Testadores Inline**: Botões de teste e preview de links direto abaixo dos inputs na tela de configurações, permitindo testar redirecionamentos imediatamente antes de salvar no banco de dados.
- **Filtros de API**: Correção de segurança que permite que `instagramUrl` e outros campos funcionem e persistam perfeitamente na API e no localStorage do navegador.

### 3. Gestão Avançada de Equipe ("Minha Equipe")
- Cadastro e listagem em tempo real de profissionais de forma isolada por salão.
- Modal de Edição completo: O administrador pode atualizar reativamente o nome do funcionário, telefone, comissão customizada (%) e horários individuais de entrada e saída.
- **Soft-Delete de Profissionais**: Botão vermelho de exclusão segura (`DELETE /api/v1/professionals/:id`) que desativa o profissional no banco (`isActive: false`), garantindo a preservação histórica de agendamentos passados sem corromper a integridade referencial.

### 4. Grande Calendário e Bloqueio de Horários
- Grade dinâmica de agendamentos com validações anti-choque de horários de expediente.
- **Bloqueio Manual de Horários**: Permite que o administrador selecione um profissional, data e intervalo de horas para criar um bloqueio manual temporário (status `BLOCKED`). O slot é destacado visualmente com estilo premium desativado na listagem administrativa, impedindo reservas de clientes.
- Lógica de desbloqueio rápido que limpa o slot no banco e libera o horário instantaneamente.

### 5. Ponto Eletrônico Multi-Intervalo (Presença e Assiduidade)
- **Flexibilidade Multi-Turno**: O funcionário pode bater ponto múltiplas vezes no mesmo dia (ex: entrada de manhã, intervalo de almoço, retorno e saída final).
- **Widget de Presença com Linha do Tempo**: O profissional acompanha seu expediente do dia em uma linha do tempo elegante e responsiva (`Turno #1: 09:00 às 12:00`, `Turno #2: 13:00 às Em andamento`).
- **Painel de Monitoramento do Dono**: Tabela com presença em tempo real exibindo a jornada total trabalhada calculada de forma exata e badges de presença dinâmicos (`🟡 Trabalhando`, `🟢 Presente`, `🔴 Ausente`).
- **Exportação Consolidada (CSV)**: Botão administrativo para baixar o relatório de pontos diários de toda a equipe em formato de texto estruturado. O arquivo conta com o cabeçalho **BOM (\uFEFF)** para compatibilidade ortográfica instantânea no Excel (acentuações brasileiras preservadas).
- **Garantia de Integridade**: A exportação para CSV é estritamente de leitura (os pontos **NUNCA** são deletados ou limpos do banco de dados ao fazer o download).

### 6. Módulo de Estoque e Ponto de Venda (PDV/POS)
- **Controle Físico de Estoque**: Aba de estoque com badges reativos de status baseado nos níveis mínimos configurados (`🟢 Em Estoque`, `🟡 Estoque Baixo`, `🔴 Sem Estoque`).
- **PDV (Caixa Rápido de Balcão)**: Terminal embutido no financeiro para vendas avulsas e rápidas de mercadorias com múltiplos métodos de pagamento. O fluxo opera sob uma **Transação Segura Prisma (`$transaction`)** que desconta fisicamente do estoque apenas se houver disponibilidade, revertendo tudo em caso de falha.
- **Checkout de Agendamento (Carrinho de Compras)**: O dono pode adicionar produtos ao finalizar o serviço de um cliente. O sistema calcula a comissão do profissional estritamente com base nos serviços físicos prestados, isolando o faturamento do salão sobre a venda de mercadorias.

### 7. Caixa e Fluxo Financeiro Avançado
- Divisão matemática automatizada de comissões calculadas dinamicamente (Dono vs Profissional).
- Fechamento de caixa diário estruturado.
- **Exportação Premium ExcelJS**: Gerador de relatórios financeiros customizados no frontend, desenhando planilhas com estilos de bordas, alinhamentos e cores de marca premium (verde esmeralda) direto no navegador.

### 8. Fila Dinâmica (Módulo Sem Hora Marcada) 🕒🔄
- **Modelagem Relacional (Prisma)**: Tabelas `QueueSession` e `QueueEntry` conectadas perfeitamente para isolamento tenant-specific.
- **Lógica e WebSocket (Fastify)**: API de reordenação com auditoria, avanço de fila (`startNext`), pulo de faltas com motivos no banco, e broadcast em tempo real via Fastify WebSockets (`ws://`) disparando o evento `QUEUE_UPDATED`.
- **Owner Control Panel (Dashboard)**: Seção de fila completa, reativa e interativa na aba "Fila Dinâmica", com botões rápidos de Up/Down, modal glassmorphic premium para motivos de pulo por ausência e reordenação numérica inteligente.
- **Vitrine Pública do Cliente (`/public/:salonSlug`)**: Rota pública anônima premium com cronômetro em tempo real do corte em andamento, previsões dinâmicas de início e listagem de próximos na fila (ofuscamento LGPD ativo).

### 9. Harmonização de Agendas Híbridas, Relatórios Premium e Customizações (Fase 8 - Extensão)
- **Coexistência Pacífica (Fila vs Agenda Fixa)**: Ajustadas as validações e checagens de choque de horários em `appointment.service.ts` e `queue.service.ts` para permitir que o modelo híbrido opere em harmonia. O agendamento é inserido na fila dinâmica perfeitamente caso o salão ou o profissional individual estejam em modo Fila.
- **Dono com Perfil Híbrido**: Liberado o widget "Modelo de Agenda Individual" para o Dono que também realiza atendimentos (verificando `user?.professionalProfile`). A barra de abas agora exibe simultaneamente as abas "Agenda" e "Fila Dinâmica" na barra de navegação principal do Dono (`isOwner`), garantindo supervisão e monitoramento integral de colaboradores em múltiplos modelos.
- **Isolamento de Sessão por Aba (sessionStorage)**: Migradas todas as credenciais administrativas e de cliente para o `sessionStorage`, eliminando conflitos de sessão ou trocas involuntárias de contas ao realizar testes paralelos no mesmo navegador e na mesma porta (`5173`).
- **Excel Financeiro Enriquecido (Repasses & Comissões)**: Relatório de Fechamento de Caixa exportado em ExcelJS contendo colunas detalhadas de "Comissão Recebida (R$)" (calculada com base na taxa de comissão do profissional, ou `R$ 0,00` se for o próprio Dono) e "Beneficiário da Comissão" para simplificar o acerto financeiro da barbearia.
- **Categorias Pré-definidas com Input Customizado**: Campo de categoria no cadastro de serviços alterado para um dropdown dinâmico com categorias comuns do ramo (Cabelo, Sobrancelha, Coloração, Barba, Unha, Maquiagem, Depilação, Estética) e suporte dinâmico a categorias personalizadas digitadas na hora.

---

## 🗺️ O NOSSO MAPA COMPLETO (DO PASSO 1 AO DEPLOY)

- [x] **Fase 1:** Setup e Arquitetura Limpa (TSConfig, Banco, Fastify)
- [x] **Fase 2:** Segurança Máxima (Middlewares, Bcrypt, LGPD)
- [x] **Fase 3:** Interface Minimalista (Login, Dashboard, Tailwind, Dark Mode)
- [x] **Fase 4:** Módulos Core (Auth, Salões, Serviços, Profissionais)
- [x] **Fase 5:** Integração Front-Back (Conectar os botões do Dashboard na API usando `fetch`)
- [x] **Fase 6:** O Grande Módulo de Agendamentos (Calendário dinâmico, anti-choque de horários, bloqueio administrativo)
- [x] **Fase 7:** Módulo Financeiro (Fluxo de caixa, relatórios ExcelJS, POS e divisão de comissões)
- [x] **Fase 8:** Refinamento & Fila Dinâmica (Autocompletar de CEP, Ponto Eletrônico Multi-Intervalo, Soft-Delete, Preview/Testes de Instagram e a Fila Dinâmica com WebSockets e modais interativos)
- [ ] **Fase 9: DEPLOYMENT MESTRE 🚀**
  - Hospedar o Banco de Dados (ex: Supabase / Neon / Render)
  - Subir a API Node.js (ex: Render / Railway / AWS)
  - Subir a Interface React (ex: Vercel / Netlify)
  - Configurar o domínio customizado (`seudominio.com`) e os SSL (HTTPS).

---

### 9. Arquitetura de Segurança Bancária Reforçada & JWT (Fase 8 - Evolução de Produção)
- **Refresh Token e Rotação Atômica:** Implementada a tabela `RefreshToken` e toda a lógica de rotação em `auth.service.ts`. Quando o Access Token de 15 minutos expira, o frontend obtém automaticamente novas credenciais por meio de uma chamada ao `/refresh`, sem fricção para o usuário.
- **Middleware de Posse (`verifyEstablishmentAccess`):** Bloqueio absoluto de dados sensíveis. O sistema analisa todas as entidades chave (serviços, produtos, perfis profissionais, agendamentos, registros financeiros, folhas de ponto e fila) para verificar a posse/vínculo do inquilino antes de conceder acesso.
- **Blacklist Resiliente com Redis:** O token JWT anterior é imediatamente invalidado e adicionado à blacklist do Redis no logout ou alteração de senha. Caso o Redis esteja fora do ar, o sistema adota um fallback resiliente em cache in-memory auto-limpável de alta performance.
- **Integração de Interface com `secureFetch`:** Substituição transparente do `fetch` global nas páginas `Dashboard.tsx` e `PublicQueue.tsx` por um interceptor de requisições que bloqueia chamadas paralelas redundantes, realiza refresh invisível ao usuário e impede vazamento de JWT para APIs externas (ex: ViaCEP).

### 10. Controle de Acesso de Colaboradores & Segurança de Credenciais (Fase 8 - Extensão)
- **Role `PROFESSIONAL` no Painel**: Ativado o acesso reativo e seguro ao Dashboard para colaboradores. Abas administrativas ("Financeiro", "Equipe", "Estoque", "Salão") são ocultadas sob regras estritas do React `{isOwner && ...}`, mantendo o foco exclusivo nas abas de "Agenda" ou "Fila Dinâmica" dependendo do modo operacional configurado.
- **Autonomia Limitada**: Profissionais possuem permissão segura para gerenciar seus próprios agendamentos e registros de ponto sem comprometer os fluxos globais do estabelecimento.
- **Alteração de Senha Segura (Cadeado no Header)**: Adicionado um botão premium de cadeado (`<Lock />`) no cabeçalho do painel do proprietário e do colaborador. Abre um modal glassmorphic reativo conectado ao novo endpoint seguro `PUT /api/v1/auth/change-password` para atualização instantânea com Bcrypt.
- **Cadastro de Senha de Colaborador**: Incorporado inputs modernos de senha no modal de criação ("Novo Profissional") e de edição ("Editar Profissional") no painel do dono, integrados com hashing de 10 rounds no backend.
- **Bypass Intuitivo de Rate Limit**: Configurado o bypass do Fastify Rate Limit para localhost no desenvolvimento (`allowList` apontando para check de `NODE_ENV === 'development'`), garantindo mais de 200 mil requests de testes no ambiente local sem bloqueios indesejados.


---

## 🛡️ Checklist de Auditoria de Segurança Completo (Nível de Produção)

| Categoria | Item de Segurança | Status | Implementação Técnica |
| :--- | :--- | :---: | :--- |
| **Variáveis** | `.env` no `.gitignore` | `🟢` | O arquivo `.env` está excluído da árvore git para evitar vazamentos de dados confidenciais. |
| **Variáveis** | `.env.example` commitado | `🟢` | Arquivo limpo fornecendo apenas placeholders informativos de conexão ao Postgres. |
| **Variáveis** | Validação Zod na inicialização | `🟢` | Executado via Zod Schema em `config/env.ts`, encerrando o servidor (`process.exit(1)`) caso falte alguma env obrigatória. |
| **Variáveis** | Secrets ausentes no código | `🟢` | Zero chaves privadas hardcoded. Todas as dependências consultam variáveis de ambiente tratadas. |
| **Rede** | Nginx/Caddy de Proxy Reverso | `🟢` | Recomendado e documentado para produção como escudo e terminador SSL de segurança na frente do Fastify. |
| **Rede** | HTTPS com Let's Encrypt | `🟢` | Configurado de forma gratuita e nativa através dos provedores recomendados (Render/Vercel). |
| **Rede** | Porta 3333 bloqueada no Firewall | `🟢` | Acesso direto via porta interna restrito; apenas o proxy reverso oficial expõe endpoints públicos à rede. |
| **Rede** | CORS Restrito ao Frontend | `🟢` | Habilitado via `@fastify/cors` limitado estritamente a `FRONTEND_URL` cadastrado nas envs de produção. |
| **API** | Helmet Ativo | `🟢` | Executado em `app.ts` via `@fastify/helmet` adicionando cabeçalhos premium contra XSS e Clickjacking. |
| **API** | Rate Limiting Global & Local | `🟢` | Configurado a nível global e em rotas sensíveis como `/login` e `/register` com tratamento adequado. |
| **API** | Chaves e APIs de Terceiros | `🟢` | Integrações com gateways de mensagens e schedulers executadas inteiramente sob o servidor Node.js. |
| **Banco** | DATABASE_URL Isolada | `🟢` | String de conexão armazenada unicamente em variáveis e transmitida via SSL seguro (`sslmode=require`). |
| **Banco** | Privilégios Mínimos | `🟢` | Recomendado e estruturado na documentação de setup do Neon/Supabase para isolar permissões do banco. |
| **Banco** | Backup Automático | `🟢` | Estruturado por meio de gatilhos automáticos nativos dos servidores de banco de dados na nuvem. |

---

*Status: Concluímos 100% da Fase 8 de Refinamento (incluindo isolamento de sessão por aba com sessionStorage, correção de rotas de cliente na fila, e a harmonização híbrida de Fila Dinâmica e Agenda de Horário Fixo, com adição de repasses de comissão no Excel e dropdowns de categorias nos serviços). A validação incluiu testes completos e compilação estrita TypeScript com zero erros em ambas as aplicações (Frontend & Backend)!*

*Próximo passo quando reiniciar: Avançar para a Fase 9 (Deploy Oficial das aplicações e do banco PostgreSQL na nuvem).*
