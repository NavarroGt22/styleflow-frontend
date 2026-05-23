# Separação de URLs no SaaS StyleFlow 🔗🌐

Para oferecer uma experiência de marca exclusiva para cada salão inquilino, o StyleFlow utiliza uma arquitetura dinâmica de caminhos de rotas (Routing Slugs) que separa as interfaces administrativas privadas dos links de vitrines públicas compartilhados com os clientes finais de forma 100% segregada.

---

## 🧭 Estrutura de Rotas e URLs

As URLs do sistema estão distribuídas em três categorias principais:

```
                  ┌──────────────────────────────────────────────┐
                  │                 StyleFlow SaaS               │
                  └──────┬──────────────┬──────────────┬─────────┘
                         │              │              │
        ┌────────────────▼──┐  ┌────────▼─────────┐  ┌─▼───────────────────┐
        │ Painel Admin      │  │ Cadastro Novo    │  │ Área do Cliente     │
        │ /admin/:salonSlug │  │ /admin/novo      │  │ /app/:salonSlug     │
        └───────────────────┘  └──────────────────┘  └─────────────────────┘
```

### 1. Painel Administrativo Privado (`/admin/:salonSlug`)
* **Acesso**: Restrito aos donos de salão (`OWNER`), profissionais (`PROFESSIONAL`) e administradores (`SUPER_ADMIN`) associados ao estabelecimento correspondente ao slug.
* **Segurança e Tenant Isolation**: Requer autenticação por token JWT no `localStorage`. Um middleware reativo valida se o usuário autenticado de fato pertence ao salão do `:salonSlug` na URL; acessos não autorizados a salões concorrentes são imediatamente interceptados e redirecionados de forma transparente para seu próprio painel.
* **Abas Dinâmicas**: O dashboard adapta sua URL interna e exibe apenas o menu permitido para a respectiva credencial logada.

### 2. Cadastro de Novo Estabelecimento (`/admin/novo`)
* **Acesso**: Donos de salão (`OWNER`) recém-registrados que ainda não cadastraram seu salão.
* **Fluxo**: Ao salvar o formulário de cadastro de salão, o sistema persiste os dados no banco, atualiza o perfil do usuário localmente e navega dinamicamente para o novo slug administrativo gerado `/admin/:salonSlug`.

### 3. Área Pública do Cliente (`/app/:salonSlug`)
* **Acesso**: Público e anônimo. Destinado aos clientes finais que desejam acompanhar a fila dinâmica em tempo real, efetuar reservas ou entrar em contato direto via WhatsApp/Instagram.
* **Mapeamento de Inquilino**: O backend identifica a qual salão a requisição se refere utilizando o parâmetro dinâmico `:salonSlug` (ex: `styleflow.app/app/salao-estilo-e-corte`).
* **Segurança e Privacidade (LGPD)**: Os nomes dos clientes na fila pública são ofuscados automaticamente no backend (ex: `João Pedro` vira `J*** P***`), blindando a privacidade das informações.