# Arquitetura do Frontend - SaaS Salão de Beleza

  

Esta documentação fornece uma visão técnica estrutural do painel do cliente/dono. A escolha das ferramentas priorizou **velocidade de carregamento (Vite)** e **estética visual fluída (Tailwind)**.

  

## 🚀 Tecnologias Principais

- **React 19**: Biblioteca UI moderna, usando os hooks padrão para reatividade.

- **Vite**: Bundler ultra-rápido que substituiu o Create React App.

- **Tailwind CSS**: Framework utilitário para estilização "Inline". Permite a criação de temas obscuros (Dark Mode) e responsividade usando prefixos (`sm:`, `dark:`).

- **React Router Dom (v6)**: Gerencia a navegação sem recarregar a página (SPA - Single Page Application).

- **Lucide-React**: Biblioteca de ícones vetoriais modernos e leves.

  

---

  

## 📁 Estrutura de Diretórios (`/frontend/src`)

  

A aplicação segue uma estrutura focada em "Páginas":

  

```text

src/

├── main.tsx                # Ponto de inicialização do React no DOM (onde o Router é envolvido)

├── App.tsx                 # Define as Rotas (/, /login, /dashboard)

├── index.css               # Diretrizes globais do Tailwind, temas base (Variáveis CSS)

└── pages/                  

    ├── Login.tsx           # Tela de autenticação e Registro

    └── Dashboard.tsx       # O coração da aplicação (Painel Monolítico)

```

  

---

  

## 🏗️ Design System & UI/UX

  

1. **"Dark Mode" Nativo**: O projeto possui diretivas `.dark` no Tailwind. Componentes utilizam pares de cores, ex: `bg-white dark:bg-slate-800`.

2. **Glassmorphism**: Abuso consciente de "blur" e fundos semitransparentes, especialmente em Modais (`backdrop-blur-sm`).

3. **Padrão de Cores Premium**: O design foca na cor "Emerald" para áreas financeiras (verde = dinheiro) e "Indigo/Primary" para ações padrão de sistema.

4. **Animações (Microinterações)**: Classes como `transition-all duration-300`, `hover:-translate-y-1` garantem que o app responda de forma orgânica ao usuário.

  

---

  

## 🧩 O Monolito: `Dashboard.tsx`

  

Devido à fase inicial de desenvolvimento, toda a inteligência da interface do salão foi consolidada em um único arquivo de "Smart Component", o `Dashboard.tsx`.

  

### Como ele funciona:

- **Gestão de Estado**: Utiliza dezenas de instâncias de `useState` para controlar qual aba está ativa (`activeTab`), abrir/fechar modais (`isModalOpen`, `schedulingService`), e armazenar os dados carregados da API (`services`, `appointments`, `financials`).

- **Renderização Condicional de Abas (Tabs)**:

  - O cabeçalho lateral renderiza botões que mudam o estado `activeTab` (ex: "Agenda", "Equipe", "Financeiro").

  - O corpo do Dashboard possui blocos `{activeTab === 'financials' && ( ... )}`.

- **Role-Based UI (RBAC)**: O componente verifica a flag `isOwner`. Se for falso, o usuário é visto como um cliente, escondendo a aba de equipe/financeiro e mudando a visualização da agenda para "Modo Cliente" (onde ele agenda serviços no lugar de administrá-los).

  

---

  

## 🔌 Conexão com o Backend (API)

  

A camada de requisição foi mantida simples, utilizando a API nativa do navegador (`fetch`).

1. **Autenticação Bearer**: Ao logar, o token JWT é guardado no `localStorage`. Em todas as chamadas futuras ao Backend, enviamos um cabeçalho: `Authorization: Bearer <token>`.

2. **Cadeia de "Refetch"**: Ao executar uma mutação (ex: Criar um profissional), após o POST ter sucesso (201), a interface não modifica o estado manualmente. Em vez disso, ela chama a função de "fetch" novamente (`fetchProfessionals()`) para pegar a versão atualizada e autoritativa do servidor.

  

---

  

## 💡 Pontos de Melhoria / Futuro da Arquitetura

  

1. **Componentização Extrema**: O arquivo `Dashboard.tsx` cresceu exponencialmente. O próximo passo urgente de arquitetura é fatiá-lo em diretórios de componentes:

   - `components/Modals/TeamModal.tsx`

   - `components/Tabs/FinancialTab.tsx`

   - `components/Layout/Sidebar.tsx`

2. **State Management Global (Context API ou Zustand)**: O usuário e o salão ativos estão sendo gerenciados localmente. Ao criar múltiplos componentes, passar esses dados via "Prop Drilling" será exaustivo. Um store global resolveria isso.

3. **Camada de Serviço (Axios / Fetch Wrappers)**: Mover todas as linhas de `fetch('http://localhost...')` para arquivos em uma pasta `src/api/`, organizando as requisições em funções reutilizáveis, facilitando a troca da URL base durante o deploy.

4. **React Query (TanStack Query)**: Substituir o `useEffect` nativo para buscar dados. O React Query lidaria com cache, retries, estados de `isLoading` de forma mágica, removendo muito código *boilerplate* atual.