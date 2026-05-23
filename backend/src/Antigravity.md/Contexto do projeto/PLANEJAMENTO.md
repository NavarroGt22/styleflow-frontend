# 📋 Planejamento de Melhorias e Novos Recursos

Este arquivo é o nosso roteiro de desenvolvimento. Vamos implementar cada funcionalidade de forma incremental, segura e testada, avançando etapa por etapa.

---

## 📅 Progresso Geral

- [/] **Etapa 1: Prevenção de Agendamentos no Passado** 🔄 *Em Progresso (Testando)*
  - [x] Implementar barreira de validação no Backend (`appointment.service.ts` e `appointment.controller.ts`)
  - [x] Ajustar o Frontend (`Dashboard.tsx`) para desabilitar dias passados no calendário (`min` data de hoje)
  - [x] Filtrar horários passados no Frontend se o dia selecionado for o dia de hoje
  - [ ] Validar e testar o fluxo de agendamento de ponta a ponta

- [x] **Etapa 2: Configuração de Funcionamento do Salão e Gestão de Equipe** ✅ *Concluído*
  - [x] Atualizar o model `Salon` no `schema.prisma` com `openTime` e `closeTime`
  - [x] Rodar push de banco de dados (`npx prisma db push`)
  - [x] Atualizar serviços de salão no Backend para permitir atualizar o expediente (`update` / `getById`)
  - [x] Adicionar botão de edição na tabela de equipe ("Minha Equipe") para alterar comissão e expediente dos funcionários
  - [x] Implementar campos de horário e contato no painel de configurações do salão no Frontend
  - [x] Adicionar o botão com link premium do WhatsApp Comercial no cabeçalho do sistema
  - [x] Testar persistência e integração completa do expediente e equipe


- [x] **Etapa 3: Controle de Ponto Eletrônico (Funcionários)** ✅ *Concluído*
  - [x] Criar model `Timecard` no `schema.prisma` e relacionar ao profissional
  - [x] Rodar push de banco de dados
  - [x] Desenvolver serviço e rotas de ponto no Backend (`clockIn`, `clockOut`, `status`, `salonTimecards`)
  - [x] Adicionar Widget de Bater Ponto no painel dos funcionários no Frontend
  - [x] Adicionar Aba de Ponto e Controle de Assiduidade para o Administrador no Frontend
  - [x] Implementar exportação e download de relatório de ponto em CSV elegante
  - [x] Testar o fluxo de ponto de entrada/saída e extração do relatório

- [x] **Etapa 4: Módulo de Controle de Estoque e Venda de Produtos (PDV)** ✅ *Concluído*
  - [x] Modelar tabelas `Product` e `ProductSale` no `schema.prisma` com rollback em transações do banco
  - [x] Criar rotas e serviços CRUD de produtos e controle de estoque no Backend
  - [x] Construir aba de **Estoque** com alertas visuais modernos de nível baixo (Sem Estoque, Estoque Baixo, Em Estoque) no Frontend
  - [x] Integrar carrinho de compras físico no **Checkout de Agendamento** com separação matemática de comissões (comissão apenas sobre serviço)
  - [x] Implementar terminal de **Caixa Rápido (PDV)** para vendas avulsas de balcão na aba Financeiro
  - [x] Validar compilação livre de erros e segurança transacional de ponta a ponta

---

## 🛠️ Como vamos proceder?

Seguindo sua sugestão de **ir devagar e correto**, faremos as etapas sequencialmente.
Cada subtarefa concluída será marcada com `[x]` aqui para que você possa acompanhar em tempo real no seu Obsidian.
