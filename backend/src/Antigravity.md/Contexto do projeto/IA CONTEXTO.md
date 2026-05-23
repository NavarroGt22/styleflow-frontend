# Contexto do Projeto: SaaS Salão/Barbearia 🚀

  

Este arquivo serve como a "Memória da Inteligência Artificial". Sempre que você trocar de computador ou iniciar uma nova sessão, basta pedir para a IA ler este arquivo para ela recuperar 100% do raciocínio e continuar exatamente de onde paramos, garantindo alinhamento e consistência técnica total.

  

---

  

## 🎯 O Objetivo

Construir um SaaS de alta performance, minimalista e ultra-seguro para barbearias e salões (**SaaS STYLEFLOW**). Usamos as Heurísticas de Usabilidade de Jakob Nielsen para a interface frontend e padrões de segurança de nível bancário na API backend.

  

---

  

## 🛡️ Arquitetura de Segurança & Conceitos Implementados (Nível de Produção)

- **CORS Estrito:** Configurado para aceitar requisições APENAS do domínio oficial do frontend, prevenindo acessos não autorizados de terceiros.

- **Helmet:** Cabeçalhos HTTP de segurança para prevenir ataques como XSS (Cross-Site Scripting), Clickjacking e MIME Sniffing.

- **Rate Limiting:** Bloqueio global contra ataques DDoS e força bruta (máximo de 100 requisições por minuto por IP).

- **Criptografia:** Senhas de usuários transformadas em hash unidirecional seguro usando Bcrypt (10 rounds de sal).

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
- **Bypass de Conflitos**: No modo de Fila Dinâmica, a checagem de choque de horários (`TIME_SLOT_UNAVAILABLE`) é ignorada para permitir múltiplos clientes simultâneos por ordem de chegada. No modo tradicional (Agenda), a restrição estrita anti-choque permanece ativa.
- **Dinamismo Lateral de Abas**: Abas "Agenda" e "Fila Dinâmica" se alternam de forma inteligente na barra lateral. O sistema oculta a aba inativa e redireciona reativamente o usuário para a aba de "Serviços" caso o modo operacional mude.
- **Controle Manual de Ritmo**: Possibilidade de concluir o atendimento ativo (`DONE`) sem avançar a fila de espera automaticamente (Botão principal "Concluir Atendimento") ou avançar de imediato (Botão "Concluir & Chamar Próximo"), dando controle total aos profissionais.
- **Owner Control Panel (Dashboard)**: Seção de fila completa, reativa e interativa na aba "Fila Dinâmica", com botões rápidos de Up/Down, modal glassmorphic premium para motivos de pulo por ausência e reordenação numérica inteligente.
- **Vitrine Pública do Cliente (`/public/:salonSlug`)**: Rota pública anônima premium com cronômetro em tempo real do corte em andamento, previsões dinâmicas de início e listagem de próximos na fila (ofuscamento LGPD ativo).

### 9. Motor de Automação de WhatsApp & UX Premium 💬🤖
- **Disparos Automáticos via Gateway (Scheduler no Backend)**:
  - Adicionados campos de persistência de gateway (`whatsappGatewayUrl` e `whatsappGatewayToken`) na tabela `Salon`.
  - Criado o serviço agendador assíncrono em segundo plano (`whatsapp-scheduler.service.ts`) no backend, que é inicializado junto com o servidor (`server.ts`) e roda a cada 60 segundos.
  - O scheduler localiza agendamentos marcados para começar em exatamente 5 minutos e dispara automaticamente notificações em segundo plano para o gateway cadastrado no salão (compatível com Evolution API, Z-API, Baileys HTTP, etc.), sem necessidade de intervenção do usuário. Contém controle interno (`notifiedAppointments` Set) contra envios duplicados.
- **Módulo de Teste Inline (Sem prompt)**: Substituição dos popups `window.prompt` por uma interface em linha premium glassmorphic com máscara de telefone brasileira em tempo real no padrão `(XX) XXXXX-XXXX` para testes diretos rápidos.
- **Máscara de Telefone Unificada (`formatPhoneNumber`)**: Formatação estrita nos agendamentos, equipe, mockup de vitrine e configurações, removendo automaticamente prefixos internacionais `55` excedentes para visualização ideal.

### 10. Notificações de Ponto Eletrônico Fluidas em Linha 🕒✨
- **Eliminação de Alertas Intrusivos do Navegador**: Substituição dos popups `alert()` por um banner de notificação em linha premium e temporário (`timecardNotice`) renderizado diretamente dentro do widget de Ponto Eletrônico no `Dashboard.tsx`.
- **Interface Glassmorphic com Auto-Fade**: O banner é animado (`animate-in slide-in-from-top-2`) com suporte a modos escuro e claro, possui cores adaptativas (verde para sucesso, rosa para erros), botão de fecho manual `X` e **desaparece de forma automatizada após 4 segundos**.
- **Controle de Segurança**: A confirmação de saída (`handleClockOut`) mantém a janela de confirmação nativa `window.confirm` ativa para evitar o encerramento acidental do expediente diário por parte dos profissionais.

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
- [x] **Fase 8 - Extensão:** Automações de WhatsApp, Gateway em Background, Máscaras Unificadas de Telefone e Notificações de Ponto Fluidas sem popups
- [ ] **Fase 9: DEPLOYMENT MESTRE 🚀**
  - Hospedar o Banco de Dados (ex: Supabase / Neon / Render)
  - Subir a API Node.js (ex: Render / Railway / AWS)
  - Subir a Interface React (ex: Vercel / Netlify)
  - Configurar o domínio customizado (`seudominio.com`) e os SSL (HTTPS).

---
*Status: Concluímos todas as sub-etapas e refinamentos com compilação TypeScript 100% perfeita tanto no frontend quanto no backend. O sistema de agendamento automático de WhatsApp e feedbacks do ponto estão operando de forma extremamente robusta e sem erros!*

*Próximo passo quando reiniciar: Iniciar a Fase 9 (Deploy Oficial das aplicações e do banco PostgreSQL na nuvem).*