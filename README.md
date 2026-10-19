# Vivace SOS — API

API do **Vivace SOS**, sistema de gestão para clínicas **multi-tenant**: agenda, pacientes, prontuário eletrônico, financeiro com repasse, dashboard, notificações e integrações. O cliente web está em [`vivacesos`](../vivacesos).

> Projeto autoral, de ponta a ponta. Nasceu como API Fastify e foi migrada para NestJS, com novos módulos de domínio criados no processo.

## Destaques técnicos

- **Multi-tenant por clínica**: o `clinicId` vai no access token (cookie `httpOnly`) e toda consulta é escopada pela clínica ativa. Nenhum `clinicId` vindo de body ou URL opera dados.
- **Autenticação própria**: JWT de curta duração + refresh token opaco (hash SHA-256 no banco), revogação a cada login, hash de senha com scrypt, throttling no login.
- **Autorização em camadas**: guards de autenticação, vínculo com a clínica e permissões por papel (ADMIN, PROFISSIONAL, RECEPCIONISTA), mais regras de negócio que a permissão sozinha não cobre.
- **Dados sensíveis cifrados** (AES-256-GCM com HMAC, chave derivada por contexto): CPF, telefone, CNPJ, CRM e todo o conteúdo clínico, com busca por hash determinístico.
- **Prontuário imutável**: o banco bloqueia `UPDATE` e `DELETE` por **triggers**; a ficha só passa de ATIVA para CANCELADA, com justificativa. Toda leitura e escrita clínica é **auditada** (só IDs, sem conteúdo).
- **Transações e concorrência**: repasse financeiro com `FOR UPDATE`, geração de despesas recorrentes idempotente (`SKIP LOCKED` + índice único), prevenção de conflito de horário na agenda.
- **Arquitetura orientada a eventos**: `@nestjs/event-emitter` desacopla notificações, Google Agenda, avisos ao paciente e abertura de prontuário.
- **Jobs agendados** (`@nestjs/schedule`): despesas recorrentes, avisos de vencimento, reenvio de sincronização e limpeza de notificações.
- **Integrações**: Google Agenda (OAuth 2.0, sincronização em uma via, refresh token cifrado), e-mail transacional (Resend) e links públicos assinados por HMAC para o paciente confirmar ou cancelar consultas.
- **Operação**: validação de ambiente e de entrada com Zod, Swagger em `/docs`, health check (Terminus), rate limit global, helmet, migrations versionadas.

## Stack

| Área | Tecnologias |
|---|---|
| Framework | NestJS 12, TypeScript, ESM puro |
| Banco | PostgreSQL, TypeORM (migrations, `synchronize: false`) |
| Validação | Zod (pipe global baseado em Standard Schema) |
| Segurança | `@nestjs/jwt`, scrypt, AES-256-GCM, helmet, `@nestjs/throttler` |
| Observabilidade e docs | `@nestjs/terminus`, `@nestjs/swagger` |
| Mensageria interna | `@nestjs/event-emitter`, `@nestjs/schedule` |
| E-mail | Resend |
| Qualidade | oxlint (type-aware), Prettier |

## Módulos

| Módulo | Responsabilidade |
|---|---|
| `auth`, `users`, `refresh-tokens` | Cadastro, login, sessão, seleção de clínica |
| `clinics`, `clinic-users`, `invites` | Clínicas, vínculos, convites por e-mail |
| `professionals` | Perfil, CRM, horários de atendimento, duração e repasse padrão |
| `patients` | Cadastro com CPF e telefone cifrados |
| `appointments` | Agenda, slots livres, status, pagamento, reagendamento |
| `medical-records` | Prontuário, fichas, prescrições, exames, atestados, triagem, modelos, auditoria |
| `finance` | Receitas, despesas (recorrentes), repasse |
| `dashboard` | Indicadores mensais e analytics (ADMIN) |
| `notifications`, `settings` | Avisos por evento e configurações da clínica |
| `integrations`, `patient-messages` | Google Agenda e avisos ao paciente |

## Como rodar

Requisitos: Node 20+, [yarn](https://yarnpkg.com/) e Docker (para o Postgres).

```bash
yarn install
cp .env.example .env        # preencha as variáveis
docker compose up -d        # Postgres na porta 5434
yarn start:dev              # migrations rodam ao subir
```

- Swagger: `http://localhost:3334/docs`
- Health: `http://localhost:3334/health`

Variáveis obrigatórias: `DATABASE_*`, `JWT_SECRET` (mín. 32 caracteres), `COOKIE_SECRET`, `CRYPTO_SECRET_KEY` (32 bytes), `CORS_ORIGIN` e `APP_URL`. E-mail (`RESEND_API_KEY`, `MAIL_FROM`) e Google (`GOOGLE_*`) são opcionais. Detalhes em `.env.example`.

## Scripts

| Comando | O que faz |
|---|---|
| `yarn start:dev` | Servidor em modo watch |
| `yarn build` / `yarn start:prod` | Build e execução de produção |
| `yarn lint` / `yarn format` | oxlint e Prettier |
| `yarn migration:run` / `migration:revert` | Migrations do TypeORM |
| `yarn db:reset --yes` | Limpa o banco (somente desenvolvimento) |

## Estrutura

```
src/
├── modules/      um diretório por feature (module, controller, service, repository, schemas, entities)
├── common/       guards, permissões, eventos de domínio, utilitários
├── security/     tokens, hash de senha, criptografia
├── database/     data source e migrations
├── config/       configuração tipada com validação Zod
└── mail/         envio e templates de e-mail
```

Padrões: repositories encapsulam o TypeORM, services não tocam o `Repository` direto, erros usam exceções nativas do Nest e as regras de acesso ficam em `ROLE_PERMISSIONS`.

## Projeto relacionado

- **Web:** [`vivacesos`](../vivacesos) — React 19, TypeScript, Vite.

## Autor

**Guilherme Machado Borim** — [borimdev@gmail.com](mailto:borimdev@gmail.com)
