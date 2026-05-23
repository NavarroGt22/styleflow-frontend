
São duas aplicações React separadas, mesmo banco, mesma API:

┌─────────────────────────────────────────┐
│              MESMO BANCO                │
│           (PostgreSQL)                  │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────▼──────────┐
        │     MESMA API      │
        │  (Fastify + JWT)   │
        └──┬─────────────┬───┘
           │             │
    ┌──────▼──────┐ ┌────▼────────────┐
    │  CLIENT APP │ │    ADMIN APP    │
    │  React PWA  │ │  React Dashboard│
    │             │ │                 │
    │ /app/:slug  │ │ /admin/:slug    │
    │ (Fila Púb)  │ │ (Painel Geral)  │
    │ (Vitrine)   │ │ (Configurações) │
    └─────────────┘ └─────────────────┘