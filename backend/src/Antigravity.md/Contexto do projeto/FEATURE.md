Gere a feature de fila dinâmica para o SaaS de barbearia. Contexto: - O sistema já tem appointments, professionals e services - A fila só ativa se establishment.queue_mode = true - Se queue_mode = false, o sistema atual não muda Entregue: 1. Migration Prisma com queue_sessions e queue_entries 2. QueueService com os métodos: - openSession(establishmentId, professionalId, date) - addToQueue(appointmentId) - reorder(queueSessionId, entryId, newPosition, userId, reason) - startNext(queueSessionId) - skipEntry(entryId, userId, reason) - recalculateEstimates(queueSessionId) - closeSession(queueSessionId) 3. QueueController com as rotas: - GET /queue/:sessionId → fila atual com tempos - POST /queue/:sessionId/start → inicia próximo - POST /queue/:sessionId/reorder → reordena - POST /queue/:sessionId/skip → pula cliente 4. Evento WebSocket para atualização em tempo real da fila 5. Testes unitários com Vitest para o QueueService 6. Checklist de segurança aplicado (posse, validação Zod, audit log)


Arquitetura

### 🧠 Conceito

São dois modos de operação que o dono configura:

```
MODO 1 — Agendamento fixo (atual)
Cliente marca às 10h → atendido às 10h exatamente

MODO 2 — Fila dinâmica (novo)
Cliente marca às 10h → entra na fila → 
atendido assim que o anterior terminar
```

---

### 🗃️ Mudanças na Modelagem do Banco

Novas tabelas e campos que se encaixam no que já existe:

sql

```sql
-- Campo novo em ESTABLISHMENTS
ALTER TABLE establishments ADD COLUMN queue_mode BOOLEAN DEFAULT false;
ALTER TABLE establishments ADD COLUMN queue_auto_advance BOOLEAN DEFAULT false;
-- auto_advance = true: avança fila automaticamente quando corte termina
-- auto_advance = false: dono precisa confirmar manualmente

-- Nova tabela: fila ativa do dia
CREATE TABLE queue_sessions (
  id            UUID PRIMARY KEY,
  establishment_id UUID REFERENCES establishments(id),
  professional_id  UUID REFERENCES professionals(id),
  date          DATE NOT NULL,
  is_open       BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT now()
);

-- Posição de cada cliente na fila
CREATE TABLE queue_entries (
  id              UUID PRIMARY KEY,
  queue_session_id UUID REFERENCES queue_sessions(id),
  appointment_id  UUID REFERENCES appointments(id),
  position        INTEGER NOT NULL,       -- posição atual na fila
  original_position INTEGER NOT NULL,     -- posição original (auditoria)
  estimated_start TIMESTAMP,             -- calculado dinamicamente
  actual_start    TIMESTAMP,             -- quando realmente começou
  actual_end      TIMESTAMP,             -- quando terminou
  status          ENUM('waiting','in_progress','done','skipped','no_show'),
  moved_by        UUID REFERENCES users(id), -- quem reordenou
  move_reason     TEXT,
  created_at      TIMESTAMP DEFAULT now()
);
```

---

### ⚙️ Como a Lógica Funciona

```
Cliente A agenda 10h00 — serviço 30min → posição 1
Cliente B agenda 10h00 — serviço 10min → posição 2
Cliente C agenda 10h00 — serviço 20min → posição 3

Sistema calcula automaticamente:
├── Cliente A → estimado 10h00 (começa na abertura)
├── Cliente B → estimado 10h30 (A termina às 10h30)
└── Cliente C → estimado 10h40 (B termina às 10h40)

Dono adianta Cliente B para posição 1:
├── Cliente B → estimado 10h00
├── Cliente A → estimado 10h10
└── Cliente C → estimado 10h40
                     ↑ recalcula toda a fila automaticamente
```

---

### 🔧 Configurações do Dono (editáveis)

ts

```ts
// Novas configs em ESTABLISHMENTS
{
  queue_mode: boolean,           // liga/desliga fila dinâmica
  queue_auto_advance: boolean,   // avança sozinho ou espera confirmação
  queue_allow_client_view: boolean, // cliente vê posição na fila?
  queue_notify_client: boolean,  // avisa cliente quando é o próximo?
  queue_notify_ahead: number,    // avisar X posições antes (ex: 2)
  queue_allow_skip: boolean,     // permite pular cliente (no-show)?
  queue_skip_timeout_min: number // após X min sem aparecer, pula automático
}
```

---

### 🔄 Fluxo do Sistema

```
MODO FILA ATIVO
      │
      ▼
Cliente agenda → entra na queue_entries com posição
      │
      ▼
Dono abre o dia → queue_session criada
      │
      ▼
Sistema calcula estimated_start de todos
      │
      ├── Cliente vê posição e tempo estimado (se configurado)
      │
      ▼
Atendimento começa → status = in_progress + actual_start
      │
      ▼
Atendimento termina → status = done + actual_end
      │
      ├── auto_advance = true  → próximo inicia automaticamente
      └── auto_advance = false → dono confirma no painel
            │
            ▼
      Recalcula fila inteira com novos tempos reais
```

---

### 📱 O que o Dono Vê no Painel

Uma tela de **controle de fila em tempo real** com:

- Lista ordenada dos clientes do dia com tempo estimado
- Botão de **arrastar para reordenar** (drag and drop)
- Botão **"Iniciar atendimento"** e **"Finalizar"**
- Botão **"Pular cliente"** com campo de motivo
- Tempo real de espera atualizado automaticamente
- Alerta quando um cliente está esperando mais que X minutos

---

### 💬 O que o Cliente Vê

Se `queue_allow_client_view = true`, o cliente acessa o link e vê:

```
Sua posição na fila: 3º
Tempo estimado de espera: ~25 minutos
Previsão de atendimento: 10h40

[  Cliente à sua frente: João (10min restantes)  ]
```

---

### 🔌 Como Ativar sem Quebrar o Sistema Atual

A chave é o campo `queue_mode` em `establishments`. O sistema verifica isso em toda operação:

ts

```ts
// No service de agendamento:
const establishment = await prisma.establishments.findUnique(...)

if (establishment.queue_mode) {
  // lógica de fila dinâmica
  await QueueService.addToQueue(appointment)
} else {
  // lógica atual de horário fixo — não muda nada
  await AppointmentService.create(appointment)
}
```


SUPER ADMIN (dono da barbearia)
├── Gerencia tudo
├── Cria/demite funcionários
├── Vê financeiro completo
├── Configura comissões
├── Vê ponto de todos
└── Edita qualquer serviço

ADMIN (barbeiro/funcionário)
├── Gerencia própria agenda
├── Cria seu próprio menu de serviços
├── Edita preço e tempo dos SEUS serviços
├── Bate próprio ponto
└── Vê próprio financeiro/comissão

CREATE TABLE time_records (
  id                UUID PRIMARY KEY,
  professional_id   UUID REFERENCES professionals(id),
  establishment_id  UUID REFERENCES establishments(id),
  type              ENUM('clock_in', 'clock_out', 'break_start', 'break_end'),
  recorded_at       TIMESTAMP NOT NULL,
  location_lat      DECIMAL,   -- opcional, bater ponto por GPS
  location_lng      DECIMAL,
  ip_address        TEXT,      -- segurança, saber de onde bateu
  notes             TEXT,      -- observações do dono se ajustar manual
  adjusted_by       UUID REFERENCES users(id), -- se dono corrigiu
  created_at        TIMESTAMP DEFAULT now()
)

-- Já temos professional_services (pivot)
-- Adiciona campos específicos por profissional:

ALTER TABLE professional_services ADD COLUMN
  custom_price      DECIMAL,      -- preço próprio (sobrescreve o padrão)
  custom_duration   INTEGER,      -- tempo próprio em minutos
  custom_name       TEXT,         -- nome customizado do serviço
  active            BOOLEAN DEFAULT true;

-- Exemplo:
-- Serviço padrão: "Corte" = R$35, 30min
-- Funcionário 1:  "Corte Americano" = R$40, 25min (ele é mais rápido)
-- Funcionário 2:  "Luzes" = R$120, 90min


// types/permissions.ts

export const PERMISSIONS = {
  // Serviços
  SERVICE_CREATE:        ['owner', 'professional'],
  SERVICE_EDIT_OWN:      ['owner', 'professional'],
  SERVICE_EDIT_ANY:      ['owner'],
  SERVICE_DELETE:        ['owner'],

  // Agenda
  SCHEDULE_VIEW_OWN:     ['owner', 'professional'],
  SCHEDULE_VIEW_ALL:     ['owner'],
  SCHEDULE_EDIT_OWN:     ['owner', 'professional'],
  SCHEDULE_EDIT_ANY:     ['owner'],

  // Ponto
  CLOCK_IN_OUT:          ['owner', 'professional'],
  TIMERECORD_VIEW_OWN:   ['owner', 'professional'],
  TIMERECORD_VIEW_ALL:   ['owner'],
  TIMERECORD_ADJUST:     ['owner'],  // só dono corrige ponto

  // Financeiro
  FINANCIAL_VIEW_OWN:    ['owner', 'professional'],  // só própria comissão
  FINANCIAL_VIEW_ALL:    ['owner'],
  COMMISSION_EDIT:       ['owner'],

  // Funcionários
  STAFF_CREATE:          ['owner'],
  STAFF_EDIT:            ['owner'],
  STAFF_FIRE:            ['owner'],

  // Configurações
  SETTINGS_EDIT:         ['owner'],
  QUEUE_MODE_TOGGLE:     ['owner'],
} as const


Funcionário abre o app admin
          │
          ▼
    Vê botão "Bater Ponto"
          │
    ┌─────▼──────┐
    │ clock_in   │ → registra entrada + IP + horário
    └─────┬──────┘
          │ (durante o dia)
    ┌─────▼──────┐
    │ break_start│ → início do intervalo
    └─────┬──────┘
    ┌─────▼──────┐
    │ break_end  │ → fim do intervalo
    └─────┬──────┘
    ┌─────▼──────┐
    │ clock_out  │ → registra saída
    └─────┬──────┘
          │
          ▼
    Sistema calcula:
    ├── Horas trabalhadas
    ├── Horas de intervalo
    └── Horas extras (se configurado)

    DONO configura serviços base:
├── Corte          R$35 / 30min
├── Barba          R$25 / 20min
├── Luzes          R$100 / 90min
└── Sobrancelha    R$15 / 15min

FUNCIONÁRIO 1 (João — só corte e barba):
├── ativa: Corte Americano  → R$40 / 25min (preço/tempo próprio)
├── ativa: Barba Degradê    → R$25 / 20min (igual ao padrão)
└── desativa: Luzes, Sobrancelha (ele não faz)

FUNCIONÁRIO 2 (Maria — especialista em química):
├── ativa: Luzes            → R$130 / 90min (cobra mais)
├── ativa: Coloração        → R$150 / 120min
└── desativa: Corte, Barba (ela não faz)

Cliente agenda → escolhe profissional →
vê APENAS os serviços daquele profissional
com OS PREÇOS E TEMPOS daquele profissional

PONTO
POST   /admin/clock                    → bater ponto (clock_in/out/break)
GET    /admin/clock/today              → ponto do dia do próprio funcionário
GET    /admin/clock/history            → histórico próprio
GET    /admin/staff/:id/clock          → histórico de funcionário (só owner)
PATCH  /admin/staff/:id/clock/:record  → corrigir ponto (só owner)

MENU DO PROFISSIONAL
GET    /admin/my-services              → meus serviços ativos
POST   /admin/my-services              → adicionar serviço ao meu menu
PATCH  /admin/my-services/:id          → editar preço/tempo/nome do meu serviço
DELETE /admin/my-services/:id          → remover do meu menu

CLIENTE (app público)
GET    /app/professionals              → lista profissionais do salão
GET    /app/professionals/:id/services → serviços daquele profissional

// middlewares/authorize.middleware.ts

export function authorize(permission: keyof typeof PERMISSIONS) {
  return async (req, res) => {
    const { role } = req.tenant

    if (!PERMISSIONS[permission].includes(role)) {
      return res.status(403).json({
        error: 'Você não tem permissão para esta ação'
      })
    }
  }
}

// Uso nas rotas:

// Qualquer funcionário edita SEU serviço
app.patch('/admin/my-services/:id',
  authMiddleware,
  tenantMiddleware,
  authorize('SERVICE_EDIT_OWN'),
  professionalServiceController.updateOwn
)

// Só dono corrige ponto de outro
app.patch('/admin/staff/:id/clock/:record',
  authMiddleware,
  tenantMiddleware,
  authorize('TIMERECORD_ADJUST'),
  timeRecordController.adjust
)