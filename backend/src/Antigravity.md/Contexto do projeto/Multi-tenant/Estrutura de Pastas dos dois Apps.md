# Estrutura de Pastas dos dois Apps no SaaS StyleFlow 📂

O projeto StyleFlow é mantido em uma estrutura monorepo simplificada contendo duas pastas principais independentes: **`backend`** e **`frontend`**. Isso permite isolamento de responsabilidades, versionamento ágil e facilita deploys separados em serviços como Render (backend) e Vercel (frontend).

---

## 🌳 Árvore de Diretórios do Projeto

Abaixo está o mapeamento detalhado da arquitetura de pastas e arquivos das aplicações:

```
saas-salao-beleza/
├── backend/                  # API Rest de Alta Performance (Fastify)
│   ├── prisma/               # Banco de Dados (Configuração e Migrations)
│   │   └── schema.prisma     # Modelos relacionais (Prisma Schema)
│   ├── src/
│   │   ├── @types/           # Definição e extensões de tipos TS (Fastify Request)
│   │   ├── Antigravity.md/   # Memória técnica, arquitetura e documentação
│   │   ├── config/           # Configurações de ambiente (env.ts) e CORS
│   │   ├── controllers/      # Handlers de Entrada/Saída das rotas HTTP
│   │   ├── middlewares/      # Interceptadores de segurança (auth, roles)
│   │   ├── routes/           # Mapeamento e registro de caminhos HTTP da API
│   │   ├── services/         # Camada contendo 100% da Regra de Negócio
│   │   ├── tests/            # Testes automatizados unitários e de rotas (Vitest)
│   │   ├── validations/      # Schemas de validação de payloads com Zod
│   │   ├── app.ts            # Inicialização de plugins e hooks do Fastify
│   │   └── server.ts         # Bootstrap do servidor e disparo dos schedulers
│   ├── tsconfig.json         # Configurações do compilador TypeScript
│   └── package.json          # Dependências do backend
│
└── frontend/                 # Aplicação Cliente e Administrativa (React)
    ├── public/               # Ativos estáticos públicos (Logos, PWA manifests)
    ├── src/
    │   ├── assets/           # Imagens, vetores e mídias estáticas
    │   ├── pages/            # Telas da aplicação (Vite Pages)
    │   │   ├── Dashboard.tsx # Painel Administrativo de alta fidelidade
    │   │   ├── Login.tsx     # Tela de login/cadastro de usuários/salão
    │   │   └── PublicQueue.tsx# Rota anônima de acompanhamento de fila em tempo real
    │   ├── App.tsx           # Ponto de entrada, roteamento e contextos globais
    │   ├── index.css         # Configurações globais de estilos (Tailwind CSS)
    │   └── main.tsx          # Renderizador do React na árvore DOM
    ├── vercel.json           # Configuração de reescrita de rotas para deploy
    ├── vite.config.ts        # Configurações do bundler de alta velocidade Vite
    ├── tsconfig.json         # Configurações do compilador TypeScript do React
    └── package.json          # Dependências do frontend
```

---

## 🏛️ Explicação dos Componentes Arquiteturais

### Camada do Backend (`backend/`)
* **`prisma/schema.prisma`**: A fonte da verdade para o banco relacional PostgreSQL. Garante a integridade, relacionamentos e tipos estritos na API.
* **`src/services/`**: Concentra o núcleo lógico da empresa. Isola o banco de dados e os retornos do protocolo HTTP.
* **`src/controllers/`**: Recebe os inputs filtrados e validados pelo **Zod**, executa o serviço correspondente e entrega retornos HTTP semânticos (ex: 200, 201, 400).
* **`src/middlewares/`**: Protege os endpoints por meio de filtros de JWT e Role-Based Access Control (RBAC).

### Camada do Frontend (`frontend/`)
* **`src/pages/Dashboard.tsx`**: Painel administrativo "tudo-em-um" com guias reativas, controle financeiro, controle de ponto eletrônico, fila dinâmica e configurações de salão.
* **`src/pages/PublicQueue.tsx`**: Rota pública amigável de visualização com ofuscamento LGPD para segurança do cliente.
* **`src/App.tsx`**: Concentra as rotas profundas do React Router Dom garantindo navegação suave entre as telas de login, painéis administrativos e rotas públicas.