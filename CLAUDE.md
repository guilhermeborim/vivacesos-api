# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar neste repositório.

## Contexto

API do **Vivace SOS** (gestão de clínicas, multi-tenant): NestJS 12 + TypeORM + Postgres, ESM puro. É a migração da API antiga (Fastify + TypeORM, em `../vivacesos/api`); **todos os módulos de domínio já foram migrados** e foram criados vários novos (prontuário, repasse, dashboard, notificações, integrações). O front-end é o projeto `../vivacesos` (React); leia o `CLAUDE.md` dele antes de mudar contrato (campos, permissões, rotas).

Um banco só, a **clínica é o tenant**: o `clinicId` vai no access token (cookie httpOnly) e **toda consulta é escopada pela clínica ativa**. Nunca aceite `clinicId` vindo de body/URL para operar dados.

## Comandos

- Gerenciador: **yarn** (não usar npm).
- `yarn start:dev` (watch) · `yarn build` · `yarn start:prod` (`node dist/main`)
- `yarn lint`: oxlint com type-aware (não é eslint) · `yarn format`: prettier
- **Não criar testes** (unitários, e2e ou specs). Valide com `yarn build`, `yarn lint` e **chamadas reais** à API (veja "Como validar").
- `yarn migration:run` / `migration:revert`: CLI do TypeORM via `src/database/data-source.ts` (as migrations também rodam sozinhas ao subir, `migrationsRun: true`).
- `yarn db:reset --yes` (`scripts/reset-db.mjs`): `TRUNCATE ... RESTART IDENTITY CASCADE` em todas as tabelas, menos `migrations`. Recusa sem `--yes` e com `NODE_ENV=PROD`. Serve só para desenvolvimento: o `TRUNCATE` **ignora os triggers de imutabilidade**.
- `docker-compose.yml` sobe o Postgres (porta 5434 no host) com as variáveis do `.env`.
- Teste local costuma usar `PORT=3399 node dist/main` (a 3334 é a do dev). `pkill -f "node dist/main"` dentro do mesmo comando que sobe o servidor mata o próprio shell; mate por PID.

## Regra principal: seguir a documentação do NestJS

Antes de implementar ou configurar qualquer coisa, consulte https://docs.nestjs.com/ (WebFetch) e siga o que ela recomenda. Prefira recursos nativos do Nest/`@nestjs/*` a código customizado ou pacotes extras. Arquitetura padrão: um diretório por feature module, nomes `nome.papel.ts`, DI em vez de singletons. Já usados: `@nestjs/event-emitter`, `@nestjs/schedule` (doc "Task scheduling"), `@nestjs/throttler`, `@nestjs/swagger`, `@nestjs/terminus`.

## Convenções

- Arquivos e pastas em minúsculas, com hífen (`clinic-user`, `clinic-user-status.enum.ts`).
- Módulo de domínio: `src/modules/<modulo>/{<modulo>.module,.controller,.service,.repository}.ts` + `schemas/` (zod) + `entities/*.entity.ts`. Repositories encapsulam o TypeORM (`@InjectRepository`); services não usam `Repository` direto. Consultas SQL multi-tabela (dashboard, repasse, jobs) usam `DataSource` dentro do repository.
- Módulos de suporte (`users`, `refresh-tokens`) não importam outros módulos só para registrar entity (evita ciclos). `common` nunca importa de `modules`.
- **Ordem de rotas**: `ClinicsModule` fica por último nos imports do `AppModule`, porque `GET /clinic/:clinicId` capturaria `/clinic/users`, `/clinic/finance`, `/clinic/dashboard` etc. Rotas novas sob `/clinic/...` entram **antes** dele. Dentro de um controller, rotas estáticas vêm antes das `:param` (ex.: `appointments/slots`, `medical-records/day|audit|templates`).
- Imports relativos com extensão `.js`; `import.meta.dirname` em vez de `__dirname`.
- Erros: exceções nativas do Nest; mensagens em português e com `!` no fim (padrão do projeto).
- Estilo: prettier do repositório (`.prettierrc`); rode `npx prettier --write` só nos diretórios que você alterou.
- Mudou contrato com o front (campo, permissão, rota)? Atualize o `CLAUDE.md` do front e **avise o usuário**.
- Ao adicionar variável de ambiente: `src/config/env.schema.ts` + `src/config/app.config.ts` (ou outro namespace) + `.env.example`.

## Papéis e permissões

`ROLE_PERMISSIONS` em `src/common/permissions/role-permissions.ts`; o front recebe a lista em `GET /auth/session` e usa `hasPermission(...)`.

| Permissão | ADMIN | PROFISSIONAL | RECEPCIONISTA |
|---|:-:|:-:|:-:|
| `PROFESSIONAL_CREATE`, `PROFESSIONAL_UPDATE`, `USER_STATUS_CHANGE`, `CLINIC_USER_MANAGE` | ✓ | | |
| `FINANCE_VIEW`, `FINANCE_MANAGE` | ✓ | | ✓ |
| `RECORD_VIEW`, `RECORD_WRITE` | ✓ | ✓ | |
| `AUDIT_VIEW`, `DASHBOARD_ANALYTICS`, `SETTINGS_MANAGE`, `INTEGRATIONS_MANAGE` | ✓ | | |

Regras que **não** cabem só na permissão:
- **Prontuário exige ser profissional ativo da clínica** (`professionals.findByUser(...).active`), além de `RECORD_*`. Assim o **ADMIN que atende** (tem perfil de profissional) acessa; o ADMIN sem perfil recebe 403.
- PROFISSIONAL só enxerga as **próprias** consultas/receitas/repasses (o `professionalId` é forçado no servidor).
- Quem não tem `FINANCE_VIEW` nunca recebe despesas/saldo.

## Módulos

**auth** — `POST /auth/register|login|refresh|logout`, `GET /auth/session`, `POST /auth/session/select-clinic|next-step`. Tokens em cookies httpOnly: `token` (access, `maxAge = JWT_EXPIRY`) e `refreshToken` (opaco, hash SHA-256 no banco). Um login revoga os refresh anteriores. **Quando o cookie do access expira o navegador o descarta, então a API devolve `TOKEN_NOT_PROVIDED` (e não `TOKEN_EXPIRED`)**: o front trata os dois. Login/register têm throttle de 10/min. `register` aceita `inviteToken` e `professional` (veja invites).

**clinics** — `POST /clinic/register` (vincula como ADMIN; a primeira clínica vira a ativa), `GET /clinics`, `GET|PUT /clinic/:clinicId`. CNPJ cifrado (`clinic:cnpj`) e buscado por `cnpjHash`; telefone e CNPJ só dígitos.

**clinic-users** — `/clinic/users` (vincular, listar usuários **+ convites não aceitos**, inclusive expirados, com `invite.expiresAt`), `GET|PUT /clinic/users/:userId`, `PATCH .../status`. Vincular exige `CLINIC_USER_MANAGE`; status exige `USER_STATUS_CHANGE`. PUT: o próprio usuário edita só o nome. A mudança de status emite `clinic-user.status-changed` (a `professionals` sincroniza `professional.active`).

**invites + mail** — `POST /invite` (ADMIN) cria o convite (24 h) e envia o e-mail pelo **Resend** (`src/mail/`, template em `mail/templates/invite.template.ts`, remetente `MAIL_FROM`, link `{APP_URL}/invite/accept?token=`). A resposta traz `emailSent` e **nunca o token**; se o e-mail falhar o convite fica salvo (reenvie). `POST /invite/:inviteId/resend` gera novo token e novas 24 h. `GET /invite/:token` é público (e-mail, papel, validade, clínica). `POST /auth/register`: e-mail com convite pendente só cadastra com o token certo (403); convite de **PROFISSIONAL exige** `professional {crm, specialty}` (400 sem ele) e o de **ADMIN aceita** (“também atendo”); o CRM é validado **antes** de criar o usuário (409 se duplicado), e usuário + vínculo + perfil de profissional saem juntos. Teste com `delivered+qualquercoisa@resend.dev` (caixa de teste do Resend).

**professionals** — `POST /professional/onboarding` (o próprio usuário), `POST /clinic/professionals` (ADMIN), `GET /clinic/professionals[/:id]`, `PUT /clinic/professionals/:id` (ADMIN, ou o próprio sem `active` nem `payoutPercent`). CRM normalizado, cifrado (`professional:crm`) e único por clínica via `crmHash`. `payoutPercent` (repasse padrão, 0–100) só aparece para ADMIN e para o próprio profissional. `googleCalendarId` guarda a agenda do Google.
- **Horários de atendimento**: `availabilityRestricted` (padrão **false = atende a qualquer hora**) + `professional_availability` (faixas por dia da semana, **horas cheias**). `GET|PUT /clinic/professionals/:id/availability` (PUT: o próprio ou ADMIN; substitui tudo). Ligado, o intervalo **inteiro** da consulta precisa caber numa faixa do dia (fuso `CLINIC_TZ`), senão 409 ao agendar e ao reagendar; consulta que vira o dia só vale se terminar à meia-noite. Lógica pura em `modules/professionals/availability.ts`. Consultas já marcadas não mudam quando a grade muda.

**patients** — `POST /clinic/patient`, `GET /clinic/patients[/:id]`, `PUT /clinic/patients/:id`. CPF/telefone normalizados, cifrados (`patient:cpf`, `patient:phone`) e únicos por clínica; CPF sai mascarado. Cadastrar emite `patient.created` e o **prontuário abre sozinho**.

**appointments** — `POST|GET /clinic/appointments`, `GET|PUT /clinic/appointments/:id`, `PATCH .../status`, `PATCH .../payment`, `GET /clinic/appointments/slots?professionalId&date` (horas livres de 1 h do profissional restrito: faixa − consultas em aberto − horas passadas).
- Status: AGENDADA, CONFIRMADA, CONCLUIDA, CANCELADA, FALTOU. Só em aberto (AGENDADA/CONFIRMADA) reagenda/edita; voltar para AGENDADA é proibido.
- Um profissional não tem duas consultas em aberto no mesmo horário (409). Paciente e profissional precisam estar ativos.
- `price` obrigatório (0 = grátis); muda só em status faturáveis; **não muda** se a consulta estiver **concluída e paga** (409) nem se já foi **repassada**. Pagamento só por `PATCH .../payment` (`FINANCE_MANAGE`).
- Consulta repassada (`payoutId`) não desfaz pagamento nem vira CANCELADA/FALTOU (desfaça o repasse antes).
- Emite `appointment.created`, `appointment.status-changed` e `appointment.rescheduled`.

**medical-records** (prontuário; valor legal) — `GET /clinic/medical-records` (todos), `GET .../day?from&to` (pacientes com consulta **CONFIRMADA** do próprio profissional no período, que o front envia no fuso local), `GET .../:patientId` (linha do tempo), `POST .../:patientId/entries` (ficha ou adendo), `POST .../entries/:entryId/cancel`, `GET .../appointments/:id/entry-status`.
- Um prontuário por paciente/clínica, nunca apagado.
- **Ficha**: só para consulta **CONFIRMADA**, do paciente e do profissional logado, e **uma ficha ativa por consulta** (409). Conteúdo cifrado (`medical-record:content`). **Imutável**: não se edita nem se apaga.
- **Adendo** (`parentEntryId`): complementa uma ficha ativa que não seja adendo; herda a consulta; vários por ficha.
- **Cancelar**: só o autor, com justificativa (≥ 5 caracteres, cifrada em `medical-record:cancel-reason`). A ficha cancelada continua legível e **libera a consulta** para uma nova ficha.
- O ADMIN **não lê conteúdo** de fichas (só a auditoria, que guarda IDs).
- **Auditoria** (`record_audit_logs`, só inserção, sem IP, só IDs): `VIEW_RECORD`, `CREATE_ENTRY`, `CANCEL_ENTRY`, `VIEW_AUDIT`, `VIEW_PROFILE`, `UPDATE_PROFILE`; `GET /clinic/medical-records/audit` (`AUDIT_VIEW`, só ADMIN; filtros e `limit` ≤ 500). Falha ao auditar derruba a leitura de propósito.
- **Modelos de ficha** (`/clinic/medical-records/templates`): por profissional, só do dono; o texto é copiado para a ficha (editar/apagar o modelo não muda fichas antigas); nome único por profissional; conteúdo cifrado (`record-template:content`). As variáveis `{{paciente}}`, `{{profissional}}`, `{{data}}` são substituídas **no front**.
- **Dados básicos do paciente** (`patient_clinical_profiles`): `GET|PUT /clinic/medical-records/:patientId/profile`. Altura, peso, diabetes (SIM|NAO|NA), alergia a medicamentos, outras informações. **Só o valor atual** (sem histórico), num JSON cifrado (`patient:clinical-profile`); o PUT substitui tudo; leitura e alteração são auditadas; nunca apagado.
- Imutabilidade também no banco por **triggers** (`medical_records_block_delete`, `medical_record_entries_guard_update`, `record_audit_logs_immutable`...): sem DELETE; a ficha só muda de ATIVA para CANCELADA.

**finance** — `GET /clinic/finance/revenues` (consultas + `totals`: `total`, `received`, `receivable`), `GET .../summary`. Filtros `from`, `to`, `professionalId`, `paid`, `status`, `dateField` (`startsAt` | `paidAt`; nas despesas `startsAt` = vencimento). `total`/`receivable` contam só status faturáveis (AGENDADA/CONFIRMADA/CONCLUIDA); `received` conta tudo que foi pago. O summary de PROFISSIONAL não traz despesas. Pagamento compartilhado: `PaymentMethod` (PIX, CARTAO, DINHEIRO), `paymentSchema`, `buildPayment` (`paid=true` exige método; `paid=false` limpa método e data).
- **Despesas** `/clinic/finance/expenses` (`POST|GET`, `GET|PUT|DELETE /:id`, `PATCH /:id/payment`; `category` é texto livre). Cadastrar **não** marca como paga.
- **Repasse** (`payouts`, `/clinic/finance/payouts`): `GET /preview?professionalId[&percent]` mostra o que seria repassado agora; `POST` lança o repasse **numa transação** (trava as consultas com `FOR UPDATE`, cria a despesa de categoria `Repasse` e o registro, marca `appointments.payoutId`); `DELETE /:id` desfaz enquanto a despesa **não** foi paga (apaga repasse e despesa, libera as consultas); `GET` lista (PROFISSIONAL só os próprios). **Base é sempre o recebido**: consultas **pagas** até `cutoffAt` e ainda sem `payoutId`, de qualquer período. O valor é calculado **na API** (centavos inteiros), usando o percentual enviado ou o do profissional. Despesa de repasse não se remove nem muda valor/vencimento (use desfazer). Pagar a despesa do repasse emite `payout.paid`.
- **Despesas recorrentes**: `expenses.recurrence` (NONE|DAILY|WEEKLY|BIWEEKLY|MONTHLY), `recurrenceEndsAt`, `recurrenceNextDate`, `recurrenceDay` (âncora do dia do mês), `seriesId`. A despesa original é o **modelo**; `RecurringExpensesService` cria uma despesa **pendente** por ocorrência no próprio dia. Só para clínicas com `clinic_settings.recurringExpensesEnabled` (padrão **desligado**). Mensal mantém o dia original limitado ao fim do mês (31/01 → 28/02 → 31/03). Idempotente (índice único `(seriesId, dueDate)` + `FOR UPDATE SKIP LOCKED`); atraso recupera no máximo 12 e pula o resto; religar a opção pula o período desligado (evento `clinic.recurring-enabled`). Cadastrar recorrente com a opção desligada dá 409; `POST /:id/stop-recurrence` encerra a série (modelo ou ocorrência). Não vale para despesa de repasse.

**dashboard** — `GET /clinic/dashboard?month=AAAA-MM&tz=` (qualquer papel, já filtrado) e `GET /clinic/dashboard/analytics` (`DASHBOARD_ANALYTICS`, só ADMIN). Limites de dia/mês calculados no Postgres no fuso informado (padrão `America/Sao_Paulo`).
- Definições: **recebido** = pagas com `paidAt` no mês; **a receber** = consultas faturáveis do mês não pagas; **não pagas** = consultas **concluídas** não pagas; **taxa de faltas** = faltas ÷ (concluídas + faltas); **saldo** = recebido − despesas pagas; **estimativa de lucro** = (recebido + a receber) − (despesas pagas + pendentes) − repasses ainda não lançados sobre essa receita (cada profissional pelo seu percentual); **crescimento** compara com o mês anterior **até o mesmo dia** (pacientes: total no fim do mês × fim do mês anterior; `null` sem base).
- PROFISSIONAL recebe só os próprios números e o bloco `payout` (percentual, a lançar estimado, lançado, recebido no mês); despesas/saldo só com `FINANCE_VIEW`; `pendingRecords` = consultas confirmadas de hoje sem ficha.
- `analytics`: lucro estimado, crescimento (receita, consultas, pacientes), série de 6 meses, receita acumulada dia a dia (dias futuros `null`), por profissional, por forma de pagamento.

**notifications** — `GET /clinic/notifications` (últimas 30 + `unreadCount`), `PATCH .../:id/read`, `POST .../read-all`, `DELETE /clinic/notifications` (apaga todas do usuário; um aviso de vencimento limpo pode ser recriado pelo job). Cada usuário só vê as próprias. Quem causou o evento **não** é avisado; mensagens **nunca** trazem conteúdo clínico.

| Evento | Quem recebe |
|---|---|
| consulta agendada | PROFISSIONAL da consulta |
| consulta confirmada | RECEPCIONISTA + PROFISSIONAL da consulta |
| consulta concluída | RECEPCIONISTA |
| cancelada / falta | ADMIN |
| repasse lançado / pago | PROFISSIONAL do repasse + ADMIN |
| convite aceito | ADMIN |
| despesa vence hoje / vencida (job) | ADMIN |
| despesa recorrente criada | ADMIN |
| integração desconectada | ADMIN |

**settings** — `GET /clinic/settings` (qualquer membro), `PUT` (`SETTINGS_MANAGE`). Hoje: `recurringExpensesEnabled`.

**integrations / patient-messages** (avisos ao paciente)
- `POST /clinic/appointments/:id/message` (qualquer papel; só consulta em aberto) devolve `{ phone, text, link, whatsappUrl, automatic }`: a recepcionista abre o `wa.me` e envia. Hoje o canal é manual (`ManualChannel`).
- **Link público** sem tabela: `{APP_URL}/c/{appointmentId}.{HMAC(id|startsAt)}` (`AppointmentLinkService`, contexto `appointment:link`). Reagendar invalida links antigos; expira no início da consulta (410). Público e com `@Throttle`: `GET /public/appointments/:token` (clínica, profissional, data, primeiro nome, situação), `POST .../confirm` e `.../cancel` (idempotentes; reusam `AppointmentsService.updateStatus` com `actorUserId = null`). Nada de dado clínico/financeiro.
- **Envio automático (Z-API) ainda não existe**: a estrutura está pronta (`PatientMessageChannel` + token `PATIENT_MESSAGE_CHANNEL` em `IntegrationsModule`; trocar `ManualChannel` por um `ZApiChannel`, que envia no evento `appointment.created`). Notas da Z-API (https://developer.z-api.io): conexão por **QR Code**, sessão do WhatsApp Web (não oficial, serviço pago, risco de restrição do número); botões do WhatsApp são instáveis, por isso confirmar/cancelar continuam por **link**. Confira URLs/headers na referência da Z-API ao implementar.
- `clinic_integrations(clinicId, provider, status, credentials cifradas, config)`; `GET /clinic/integrations` (`INTEGRATIONS_MANAGE`).

**Google Agenda** (`modules/integrations/google/`) — OAuth 2.0 de servidor com escopo mínimo `calendar.app.created` (+ `openid email` só para mostrar a conta). `GET /clinic/integrations/google` (estado), `GET .../auth-url` (state assinado, 10 min), `GET /integrations/google/callback` (público; redireciona para `{APP_URL}/google?connected=1|error=`), `POST .../disconnect` (revoga), `POST .../sync-all`, `GET .../professionals`, `POST .../professionals/:id/calendar`; tudo `INTEGRATIONS_MANAGE`. Refresh token cifrado (`integration:google`). O sistema cria a agenda “Vivace — Nome” de cada profissional e espelha as consultas (`appointments.googleEventId`, `googleSyncState` PENDING|SYNCED) por eventos de domínio — **uma via**, sem dado clínico (título “Consulta — paciente”); CANCELADA/FALTOU removem o evento; falha deixa `PENDING` e o job de 10 min reenvia; `invalid_grant` desconecta e avisa os ADMIN. O escopo mínimo **não cobre compartilhar** a agenda: o ADMIN compartilha pelo próprio Google. App em modo “Teste” no Google: só usuários de teste e o acesso expira em ~7 dias. Credenciais: Google Cloud Console → projeto → ativar Calendar API → tela de consentimento (Externo, usuário de teste, escopo) → ID do cliente OAuth “Aplicativo da Web” com URI de redirecionamento `{URL da API}/integrations/google/callback`.

## Eventos de domínio

`src/common/events/domain.events.ts` (emitidos com `emitAsync`, ouvidos com `@OnEvent`, em geral `suppressErrors: true`): `appointment.created|status-changed|rescheduled`, `payout.launched|paid`, `invite.accepted`, `expense.recurring-created`, `clinic.recurring-enabled`, `integration.disconnected`, mais `patient.created` (módulo patients) e `clinic-user.status-changed`. Ouvintes: `notifications.listener`, `google-calendar.listener`, `patient-messages.service` (canal automático), `medical-records.service` (abre prontuário), `professionals.service`, `recurring-expenses.service`.

## Jobs agendados (`@nestjs/schedule`, `ScheduleModule.forRoot()` só no `AppModule`)

| Hora (America/Sao_Paulo) | O que faz |
|---|---|
| 06:00 | cria as despesas recorrentes vencidas (`RecurringExpensesService`) |
| 08:00 | avisa ADMIN de despesas que vencem hoje/venceram (deduplicado por `dedupeKey`) |
| a cada 10 min | reenvia à Google Agenda as consultas `PENDING` |
| 03:30 | apaga notificações antigas (lidas > 30 dias, todas > 90) |

## Banco e criptografia

- Migrations em `src/database/migrations/` (ordem por timestamp). `synchronize: false`. Crie migration para toda mudança de esquema; enums novos de Postgres usam `ADD VALUE IF NOT EXISTS`.
- Chaves de criptografia: `CryptoService.forField(contexto)` (AES-256-GCM + HMAC). **Nunca altere um contexto nem os prefixos `vivace:`**, ou os dados já cifrados deixam de abrir. Contextos em uso: `clinic:cnpj`, `professional:crm`, `patient:cpf`, `patient:phone`, `patient:clinical-profile`, `medical-record:content`, `medical-record:cancel-reason`, `record-template:content`, `appointment:link`, `integration:google`, `integration:google-state`.
- Triggers de imutabilidade: prontuário, fichas, auditoria e dados básicos não aceitam DELETE; ficha só vai de ATIVA para CANCELADA.

## Variáveis de ambiente (`.env`, schema em `src/config/env.schema.ts`)

`PORT`, `CORS_ORIGIN`, `NODE_ENV` (`PROD` liga cookies `secure`/`sameSite=none`), `DATABASE_*`, `JWT_SECRET`/`JWT_EXPIRY`/`JWT_REFRESH_EXPIRY`/`JWT_ISSUER`/`JWT_AUDIENCE`, `COOKIE_SECRET`, `CRYPTO_SECRET_KEY`, `RESEND_API_KEY`, `APP_URL` (URL do **front**; vira os links de e-mail, do convite e de confirmação — em produção é obrigatório defini-la), `MAIL_FROM`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`. `GOOGLE_AUTH_URL|TOKEN_URL|REVOKE_URL|API_URL` existem só para testar com um servidor falso do Google. Sem as credenciais do Google o botão Conectar avisa que não está configurado.

## Arquitetura

- **Config**: `ConfigModule` global com validação zod e namespaces `registerAs` (`app`, `database`, `jwt`). Injete com `@Inject(xConfig.KEY)` tipado por `ConfigType<typeof xConfig>`.
- **Banco**: `database.module.ts` (`forRootAsync`, `autoLoadEntities`, `migrationsRun`). Cada módulo registra suas entities com `TypeOrmModule.forFeature`.
- **Bootstrap** (`main.ts`): helmet nativo, cookies nativos (em handlers use `@Cookies('nome')`; em guards, `readCookie`; para gravar, `AuthCookiesService`), `enableCors` com credenciais, `StandardSchemaValidationPipe` global (schemas zod nos controllers via `@Body({ schema })`/`@Query({ schema })`). O `.env` é carregado com `dotenv/config` antes do app.
- **Rate limit**: `ThrottlerGuard` global (100 req / 5 min), com limites próprios no login/register e nas rotas públicas.
- **Swagger**: UI em `/docs`, JSON em `/docs-json`. Documente controllers com `@ApiTags`/`@ApiOperation`.
- **Health**: `GET /health` (Terminus, ping no banco).
- **Segurança** (`src/security/`): `TokenService` (access JWT + refresh opaco), `PasswordHasher` de `@nestjs/authentication` (scrypt; só ele é usado desse pacote), `CryptoService`. Erros de token: `UnauthorizedException` com `{ message, errorType, code: 'JWT_ERROR' }` (`JwtErrorType`).
- **Guards** (`src/common/guards/`): `AuthenticationGuard` (cookie `token` → `request.user`, `request.clinicId`), `ClinicGuard` (vínculo/status → `request.userRole`), `PermissionsGuard` + `@RequirePermissions(...)`. Use nessa ordem. Dependem dos tokens `USER_LOOKUP` e `CLINIC_USER_LOOKUP`, que os módulos `users` e `clinic-users` provêm e exportam; por isso módulos com rotas protegidas importam `SecurityModule`, `UsersModule` e `ClinicUsersModule`.
- **Auth (decisão)**: multi-tenant com `@nestjs/jwt` + `TokenService` + guards próprios (o pacote `@nestjs/authentication` não cobre tenant nem token em cookie).
- **Fuso**: `src/common/utils/clinic-time.ts` (`CLINIC_TZ = America/Sao_Paulo`, `localParts`, `zonedToUtc`). Um fuso por clínica é evolução futura.

## Como validar (sem arquivos de teste)

- `yarn build` + `yarn lint`, depois suba em outra porta e use `curl` com cookie jar (`-c/-b`). Fluxo mínimo: `register` → `login` → `POST /clinic/register` → `POST /professional/onboarding` → `login` de novo (o token passa a levar a clínica).
- Outros papéis: convide (`POST /invite`), leia o token no banco (`select token from clinic_invites`) e cadastre com `inviteToken` (PROFISSIONAL leva `professional`). Use e-mails `delivered+x@resend.dev` e **nunca** consuma convites de usuários reais.
- Jobs e recorrência: um script `node` com `NestFactory.createApplicationContext(AppModule)` chama o serviço direto (ex.: `generateDue('2026-02-28')`) para simular datas.
- Google: servidor falso em Node apontado por `GOOGLE_*_URL`, com `expires_in` curto para exercitar o refresh.
- Banco: script `node` com `pg` (`dotenv/config`) para ler tokens ou conferir criptografia/triggers. Apague os arquivos temporários depois.
- Os testes deixam clínicas/usuários de teste no banco; `yarn db:reset --yes` limpa.

## Pendências e ideias em aberto

- Envio automático de WhatsApp via Z-API (estrutura pronta, falta o `ZApiChannel` e a tela de conexão por QR Code).
- Fuso por clínica; cruzar horários do mesmo profissional entre clínicas; duração variável de consulta para profissionais restritos.
- Compartilhar a agenda do Google com o profissional exigiria o escopo `calendar.acls`.
