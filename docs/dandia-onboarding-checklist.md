# Dandia Dental Office — Complete Admin Onboarding Checklist

## Context

Dandia is the first dental office client on the OVEN platform. This checklist covers **every manual task** the admin needs to perform to get Dandia fully operational — from infrastructure to Stripe payments. It maps directly to the Dandia commercial proposal (Anexos 1-4) and the OVEN sprint plan.

**Pricing:** Setup $450,000 COP | Monthly $125,000 COP | Annual $90,000 COP/month
**Limits:** WhatsApp 300 msg/month | Web Chat 500/month | 40 FAQ entries | 1 WA number

---

## PHASE 0 — PREREQUISITES (External / Infrastructure)

### 0.1 Domain & Hosting

- [ ] **Purchase admin dashboard domain** — Registrar (e.g. `admin.oven.com.co`)
- [ ] **Purchase/confirm Dandia widget domain** — Dandia's existing website or new subdomain
- [ ] **Configure DNS** — CNAME to Vercel deployment URL + TXT verification
- [ ] **Create Vercel project** — Import monorepo, set root to `apps/dashboard`, connect domain

### 0.2 Environment Variables (Vercel > Settings > Env Vars)

- [ ] `DATABASE_URL` = `{neon_connection_string}`
- [ ] `AUTH_SECRET` = `{random_64_char_secret}` — NextAuth JWT signing
- [ ] `NEXTAUTH_URL` = `https://{dashboard_domain}`
- [ ] `AUTH_TRUST_HOST` = `true`

### 0.3 Database

- [ ] **Create Neon PostgreSQL database** — neon.tech, name: `oven_production`, region closest to Colombia
- [ ] **Enable pgvector** — `CREATE EXTENSION IF NOT EXISTS vector;`
- [ ] **Run migrations** — `pnpm drizzle-kit push`
- [ ] **Run seeds** — Auto-creates: 3 roles, 60 permissions, 3 service categories, 6 services, 4 providers, Free plan

### 0.4 Collect Client Data

- [ ] **Collect signed Anexo 4** from Dandia (all 9 sections filled)
- [ ] **Collect all 40 FAQ Q&A pairs** (Anexo 2 — client provides in template)
- [ ] **Collect Dandia's logo** (image file)
- [ ] **Collect scheduling URL** (Calendly/booking system link)

---

## SPRINT 1 — Foundation (Implemented Modules)

### 1.1 Verify Seed Data

- [ ] **Service categories** — `Dashboard > Service Catalog > Categories` — Expect: Messaging, AI, Storage
- [ ] **Services** — Expect: WhatsApp (messages), SMS (messages), Email (messages), Web Chat (messages), AI Chat (tokens), File Storage (gb)
- [ ] **Providers** — Expect: Twilio, Meta Business, Resend, OpenAI
- [ ] **Provider-Service mappings** — Expect: Twilio→WhatsApp, Twilio→SMS, Resend→Email, OpenAI→AI Chat
- [ ] **Free billing plan** — Expect: slug `free`, price 0, COP
- [ ] **Roles** — Expect: Admin (system), Moderator (system), Player

### 1.2 Add Meta as Default WhatsApp Provider

- [ ] **Create Meta → WhatsApp provider-service mapping** — `Provider Services > Create`
  - Provider: `Meta Business` | Service: `WhatsApp` | Cost: `0` | Currency: `USD` | Default: `true`
  - Config Schema:
    ```json
    [
      {"key": "META_WA_PHONE_NUMBER_ID", "label": "Phone Number ID", "type": "string", "required": true},
      {"key": "META_WA_ACCESS_TOKEN", "label": "Permanent Access Token", "type": "secret", "required": true},
      {"key": "META_WA_BUSINESS_ACCOUNT_ID", "label": "Business Account ID", "type": "string", "required": true},
      {"key": "META_WA_VERIFY_TOKEN", "label": "Webhook Verify Token", "type": "string", "required": true},
      {"key": "META_WA_APP_SECRET", "label": "App Secret", "type": "secret", "required": true}
    ]
    ```
- [ ] **Set Twilio → WhatsApp isDefault=false** — Edit existing mapping

### 1.3 Create Dandia Billing Plans

#### Monthly Plan
- [ ] **Create "Dandia Basico Mensual"** — `Billing Plans > Create`
  - Name: `Dandia Basico Mensual` | Slug: `dandia-basico-mensual`
  - Price: `12500000` (centavos) | Currency: `COP` | Cycle: `Monthly`
  - Features: `{"maxMembers": 5, "maxFaqCategories": 10, "maxFaqEntries": 40, "whatsappNumbers": 1, "monthlyContentAdjustments": 1, "maxChangesPerAdjustment": 10}`
  - Public: `true` | Enabled: `true`
- [ ] **Add WhatsApp quota** — `Plan Quotas > Create` — Plan: Monthly | Service: WhatsApp | Quota: `300` | Period: Monthly
- [ ] **Add Web Chat quota** — Service: Web Chat | Quota: `500` | Period: Monthly
- [ ] **Add AI Chat quota** — Service: AI Chat | Quota: `100` | Period: Monthly

#### Annual Plan
- [ ] **Create "Dandia Basico Anual"** — Same as monthly but:
  - Price: `9000000` (centavos) | Features add: `"commitmentMonths": 12`
- [ ] **Add same 3 quotas** (WhatsApp 300, Web 500, AI 100) to annual plan

#### Setup Fee
- [ ] **Create "Dandia Setup"** — One-time, price: `45000000`, public: `false`
  - Features: `{"isOneTime": true, "includes": ["faq_setup_40", "whatsapp_integration", "agent_customization"]}`

### 1.4 Create Dandia Tenant

- [ ] **Create tenant** — `Tenants > Create`
  - Name: `Dandia` | Slug: `dandia` | Enabled: `true`
  - Metadata:
    ```json
    {
      "legalName": "{Anexo 4 §1}",
      "nit": "{Anexo 4 §1}",
      "city": "{Anexo 4 §1}",
      "commercialName": "Dandia",
      "authorizedRepresentative": "{Anexo 4 §1}",
      "whatsappNumber": "{Anexo 4 §1}",
      "website": "{Anexo 4 §1}"
    }
    ```
  - **Record tenant ID** → `{dandia_tenant_id}` (used everywhere below)

### 1.5 Dandia Tenant Config Entries

All at `Module Configs > Create`, tenantId = `{dandia_tenant_id}`, moduleName = `tenants`, scope = `Module Default`:

#### Business Identity (Anexo 4 §1)
- [ ] `NIT` = `"{NIT}"` — Tax ID
- [ ] `BUSINESS_NAME` = `"{legal name}"` — Legal business name
- [ ] `LOGO` = `"{logo_url}"` — Logo URL for widget branding

#### Schedule (Anexo 4 §3)
- [ ] `SCHEDULE` = `{"monday": {"open": "HH:MM", "close": "HH:MM"}, ...}` — Office hours Mon-Sat
- [ ] `WHATSAPP_SUPPORT_HOURS` = same format if different from office hours

#### Scheduling (Anexo 4 §2)
- [ ] `SCHEDULING_URL` = `"{booking URL}"` — Online appointment booking link

#### Services (Anexo 4 §4)
- [ ] `AUTHORIZED_SERVICES` = `["Limpieza dental", "Ortodoncia", "Blanqueamiento", ...]` — Approved service list

#### Payments (Anexo 4 §5)
- [ ] `PAYMENT_METHODS` = `["Efectivo", "Tarjeta credito", "Transferencia"]` — Accepted methods
- [ ] `PRICING_POLICY` = `{"canMentionPrices": false, "approvedCostText": "{text from Anexo 4 §5}"}` — Price disclosure rules

#### Communication (Anexo 4 §6)
- [ ] `TONE` = `"friendly"` (or `"formal"` / `"neutral"`) — Communication tone
- [ ] `EMOJI_USAGE` = `true` or `false` — Whether agent uses emojis
- [ ] `WELCOME_MESSAGE_BUSINESS_HOURS` = `"{message from Anexo 4 §6}"` — Business hours greeting
- [ ] `WELCOME_MESSAGE_OUT_OF_HOURS` = `"{message from Anexo 4 §3}"` — After-hours greeting

#### Escalation (Anexo 4 §7)
- [ ] `HUMAN_CONTACT_INFO` = `{"contactName": "{name}", "channel": "{phone/whatsapp}", "hours": "{availability}", "escalationMessage": "{approved message}"}` — Human handoff config

#### Emergency (Anexo 4 §8)
- [ ] `EMERGENCY_INSTRUCTIONS` = `{"officialInstructions": "{instructions}", "approvedMessage": "{emergency response text}"}` — Emergency/pain escalation

### 1.6 Platform-Level Config Defaults

All at `Module Configs > Create`, tenantId = _(empty)_:

- [ ] `tenants` / `TIMEZONE` = `"America/Bogota"`
- [ ] `tenants` / `LOCALE` = `"es"`
- [ ] `subscriptions` / `DEFAULT_PLAN_SLUG` = `"dandia-basico-mensual"`
- [ ] `auth` / `ALLOW_SELF_REGISTRATION` = `false` — Admin-invite only
- [ ] `subscriptions` / `OVERAGE_ENABLED` = `false` — No overage billing

### 1.7 Create Dandia Subscription

- [ ] **Create subscription** — `Tenant Subscriptions > Create`
  - Tenant: `Dandia` | Plan: `Dandia Basico Mensual` (or Anual) | Status: `active`
  - Start Date: `{contract date}` | Expires At: _(empty for monthly; +12mo for annual)_

### 1.8 Auth Setup

- [ ] **Create platform superadmin** — `Users > Create`
  - Email: `admin@{company}` | Name: `{name}` | Status: `Active` | Tenant: _(empty)_
  - Note: First user password set via `/api/auth/register` or direct DB insert

- [ ] **Create Dandia admin user** — `Users > Create`
  - Email: `{Anexo 4 §1 contact email}` | Name: `{authorized representative}` | Status: `Active`
  - Default Tenant: `{dandia_tenant_id}` → Record `{dandia_user_id}`

- [ ] **Add Dandia admin as tenant owner** — `Tenant Members > Create`
  - Tenant: `Dandia` | User: `{dandia_user_id}` | Role: `Owner`

- [ ] **Generate WhatsApp webhook API key** — `API Keys > Create`
  - Name: `Dandia WhatsApp Webhook` | Tenant: `{dandia_tenant_id}`
  - Permissions: `["notifications.receive", "notifications.send"]` | Expires: _(never)_
  - **COPY KEY IMMEDIATELY** — shown only once

### 1.9 Meta WhatsApp Credentials (Module Config)

All at `Module Configs > Create`, tenantId = `{dandia_tenant_id}`, moduleName = `subscriptions`:

- [ ] `META_WA_PHONE_NUMBER_ID` = `"{from Meta dashboard}"`
- [ ] `META_WA_ACCESS_TOKEN` = `"{permanent token}"` — SENSITIVE
- [ ] `META_WA_BUSINESS_ACCOUNT_ID` = `"{business account ID}"`
- [ ] `META_WA_VERIFY_TOKEN` = `"{random token you generate}"`
- [ ] `META_WA_APP_SECRET` = `"{app secret}"` — SENSITIVE

### 1.10 Optional: Forms & Flows

- [ ] **Create contact form** (optional) — `Forms > Create`
  - Name: `Formulario de Contacto Dandia` | Slug: `dandia-contacto` | Status: `active`

- [ ] **Create FAQ review flow** (optional) — `Flow Templates > Create`
  - Name: `Revision Contenido FAQ` | Slug: `faq-content-review`
  - Stages: Draft → Review → Approved → Published

---

## SPRINT 2 — Knowledge Base + AI + Agent Core

_(Modules not yet implemented — tasks for when they're built)_

### 2.1 AI Provider Config

- [ ] `Module Configs > Create` — module: `ai`, key: `OPENAI_API_KEY`, value: `"{sk-...}"` _(platform level)_
- [ ] Key: `EMBEDDING_MODEL` = `"text-embedding-3-small"`
- [ ] Key: `DEFAULT_CHAT_MODEL` = `"gpt-4o-mini"`

### 2.2 Knowledge Base Categories (10 from Anexo 2)

All at `KB > Categories > Create`, tenantId = `{dandia_tenant_id}`:

- [ ] `Agendamiento` (slug: `agendamiento`, icon: CalendarMonth, order: 1)
- [ ] `Horarios` (slug: `horarios`, icon: Schedule, order: 2)
- [ ] `Ubicacion` (slug: `ubicacion`, icon: LocationOn, order: 3)
- [ ] `Servicios` (slug: `servicios`, icon: MedicalServices, order: 4)
- [ ] `Pagos` (slug: `pagos`, icon: Payment, order: 5)
- [ ] `Antes de la Cita` (slug: `antes-cita`, icon: Checklist, order: 6)
- [ ] `Despues de la Cita` (slug: `despues-cita`, icon: FactCheck, order: 7)
- [ ] `Sintomas o Dolor` (slug: `sintomas-dolor`, icon: Healing, order: 8) — metadata: `{"isEscalation": true}`
- [ ] `Urgencias` (slug: `urgencias`, icon: LocalHospital, order: 9) — metadata: `{"isEscalation": true}`
- [ ] `Atencion Humana` (slug: `atencion-humana`, icon: SupportAgent, order: 10) — metadata: `{"isEscalation": true}`

### 2.3 FAQ Entries (40+ from Anexo 2)

All at `KB > Entries > Create`. Fields: tenantId, categoryId, question, answer, keywords (JSON array), language: `es`, enabled: `true`

**Agendamiento (7 entries):**
- [ ] Como agendar cita / Cambiar cita / Cancelar cita / Horarios disponibles / Agendar valoracion / Agendar para otra persona / Confirmacion de cita / Politica inasistencia

**Horarios (5 entries):**
- [ ] Horario general / Atencion sabados / Atencion domingos-festivos / Horario WA / Jornada continua

**Ubicacion (5 entries):**
- [ ] Direccion / Como llegar / Transporte publico / Parqueadero / Accesibilidad

**Servicios (7+ entries):**
- [ ] Valoraciones / Limpieza / Ortodoncia / Blanqueamiento / Odontopediatria / Implantes / Otros

**Pagos (5 entries):**
- [ ] Medios de pago / Info general costos / Facturacion / Convenios / Politica de precios

**Antes de la Cita (4 entries):**
- [ ] Anticipacion / Documentos / Acompanantes / Confirmacion

**Despues de la Cita (3 entries):**
- [ ] Control / Nueva cita / Contacto admin

**Sintomas-Dolor (4 entries — escalation):**
- [ ] Dolor / Inflamacion / Sangrado / Molestias post-procedimiento → escalate to human

**Urgencias (3 entries — escalation):**
- [ ] "Es urgente" / "Me duele mucho" / Canal autorizado → presencial + contacto

**Atencion Humana (3 entries — escalation):**
- [ ] Solicitar asesor / Solicitar llamada / Contacto directo → derivar

### 2.4 Embed FAQ Entries

- [ ] **Bulk embed** — `POST /api/knowledge-base/dandia/ingest` — generates vectors for all entries
- [ ] **Test search** — `KB > Search Test` — type sample questions, verify correct matches

### 2.5 Create Dental Agent

- [ ] **Create agent** — `Agents > Create`
  - Name: `Asistente Dental Dandia` | Slug: `dandia-dental-assistant`
  - Provider: OpenAI | Model: `gpt-4o-mini` | Temperature: `0.3` | Max Tokens: `500`
  - Tenant: `{dandia_tenant_id}` | Language: `es`
  - System Prompt:
    ```
    Eres el asistente virtual de {BUSINESS_NAME}, consultorio dental en {city}.
    REGLAS:
    1. Responde SOLO con info de la FAQ aprobada.
    2. Si no hay respuesta, ofrece contacto humano.
    3. Usa tono {TONE}. {Usa/No uses} emojis.
    4. NUNCA des diagnosticos ni recomendaciones clinicas.
    5. Para sintomas/urgencias → escalamiento.
    6. {Puedes/No puedes} mencionar precios.
    7. Siempre responde en espanol.
    HORARIOS: {SCHEDULE} | URL CITAS: {SCHEDULING_URL}
    SERVICIOS: {AUTHORIZED_SERVICES} | PAGOS: {PAYMENT_METHODS}
    ESCALAMIENTO: {HUMAN_CONTACT_INFO} | EMERGENCIA: {EMERGENCY_INSTRUCTIONS}
    ```
  - Tool bindings: `kb.search`, `escalation`

### 2.6 Safety Rules

- [ ] `Module Configs` — module: `agent-core`, key: `AGENT_SAFETY_RULES`, tenant: `{dandia_tenant_id}`
  - Value: `{"noMedicalDiagnosis": true, "noPrescriptions": true, "escalateOnSymptoms": true, "escalateOnEmergency": true, "maxResponseLength": 500, "requiredLanguage": "es"}`

---

## SPRINT 3 — Chat + Agent UI (Widget)

### 3.1 Web Chat Config

- [ ] `Module Configs` — module: `chat`, key: `WEB_CHAT_ENABLED` = `true`, tenant: `{dandia_tenant_id}`
- [ ] Key: `CHAT_WIDGET_CONFIG` = `{"theme": "light", "position": "bottom-right", "primaryColor": "{Dandia brand color}", "showSchedulingButton": true, "quickReplies": ["Agendamiento", "Horarios", "Servicios", "Pagos", "Ubicacion"]}`

### 3.2 Widget Embedding

- [ ] **Generate embed code:**
  ```html
  <script src="https://{domain}/widget.js" data-tenant="dandia" data-agent="dandia-dental-assistant"></script>
  ```
- [ ] **Send embed code to Dandia** for installation on their website
- [ ] **Test widget** on Dandia's website — verify welcome message, quick replies, scheduling button

---

## SPRINT 4 — Notifications (WhatsApp via Meta)

### 4.1 Meta Business Setup (External)

- [ ] **Create Meta Business Account** — business.facebook.com
- [ ] **Create Meta App with WhatsApp product** — developers.facebook.com
- [ ] **Register Dandia's WhatsApp Business phone number** — Meta App > WhatsApp > Getting Started
- [ ] **Generate permanent access token** — System User > generate token
- [ ] **Configure webhook URL** — `https://{domain}/api/webhooks/whatsapp/{dandia_tenant_id}`
  - Verify Token: same as `META_WA_VERIFY_TOKEN` config entry
  - Subscribe to: `messages`, `message_deliveries`, `message_reads`
- [ ] **Request WhatsApp Business API production access** — Meta App Review

### 4.2 WhatsApp Channel (Dashboard)

- [ ] **Create channel** — `Notification Channels > Create`
  - Tenant: Dandia | Type: `whatsapp` | Adapter: `meta` | Enabled: `true`
  - Config: `{"phoneNumberId": "{id}", "businessAccountId": "{id}"}`

### 4.3 Usage Limits

- [ ] `Module Configs` — module: `notifications`, key: `WHATSAPP_LIMIT_ENFORCEMENT`, tenant: `{dandia_tenant_id}`
  - Value: `{"action": "escalate_to_human", "warningThreshold": 0.8, "warningMessage": "Su plan mensual esta alcanzando el limite."}`

---

## SPRINT 5 — Workflow Agents (Guardrails)

### 5.1 Agent Workflow

- [ ] **Create "Dandia Reply Engine" workflow** — `Agent Workflows > Create`
  - Graph: tenantContext → safetyCheck → usageCheck → KB search → guardrail → LLM → response

### 5.2 Guardrail Rules

- [ ] `Module Configs` — module: `workflow-agents`, key: `GUARDRAIL_RULES`, tenant: `{dandia_tenant_id}`
  - Value: `{"blockedTopics": ["diagnostico medico", "receta medica", "medicamentos"], "escalationTriggers": ["dolor", "sangrado", "urgencia", "emergencia", "hablar con humano", "persona real"]}`

### 5.3 Escalation Config

- [ ] Key: `ESCALATION_CONFIG` = `{"autoEscalateCategories": ["sintomas-dolor", "urgencias", "atencion-humana"], "escalationResponse": "{from Anexo 4 §7}", "includeContactInfo": true}`

---

## SPRINT 6 — Stripe + Files + Full AI

### 6.1 Stripe Integration (External)

- [ ] **Create Stripe account** — stripe.com, country: Colombia, currency: COP
- [ ] **Create Stripe products:**
  1. "Dandia Setup" — one-time, COP $450,000
  2. "Dandia Basico Mensual" — recurring monthly, COP $125,000
  3. "Dandia Basico Anual" — recurring monthly, COP $90,000

### 6.2 Stripe Config (Module Config)

- [ ] `STRIPE_SECRET_KEY` = `"{sk_live_...}"` — platform level
- [ ] `STRIPE_PUBLISHABLE_KEY` = `"{pk_live_...}"` — platform level
- [ ] `STRIPE_WEBHOOK_SECRET` = `"{whsec_...}"` — platform level
- [ ] **Map Stripe Price IDs to billing plans** — per-plan instance config:
  - [ ] Monthly plan: `STRIPE_PRICE_ID` = `"{price_xxx}"`
  - [ ] Annual plan: `STRIPE_PRICE_ID` = `"{price_yyy}"`
  - [ ] Setup fee: `STRIPE_PRICE_ID` = `"{price_zzz}"`

### 6.3 File Storage

- [ ] `FILE_STORAGE_PROVIDER` = `"vercel-blob"` (or `s3`, `cloudflare-r2`) — platform level

---

## EXTERNAL TASKS SUMMARY

| Task | Where | Blocks Sprint |
|------|-------|--------------|
| Purchase dashboard domain | Registrar | 1 |
| Configure DNS | DNS provider | 1 |
| Create Vercel project | vercel.com | 1 |
| Set Vercel env vars | Vercel settings | 1 |
| Create Neon DB | neon.tech | 1 |
| Enable pgvector | Neon SQL editor | 2 |
| Run migrations + seeds | Terminal | 1 |
| Collect Anexo 4 from Dandia | Meeting/email | 1 |
| Collect 40 FAQ pairs | Dandia | 2 |
| Create Meta Business account | business.facebook.com | 4 |
| Create Meta App (WhatsApp) | developers.facebook.com | 4 |
| Register WA phone number | Meta dashboard | 4 |
| Generate WA access token | Meta dashboard | 4 |
| Configure WA webhook | Meta dashboard | 4 |
| Request WA production access | Meta App Review | 4 |
| Create Stripe account | stripe.com | 6 |
| Create Stripe products/prices | Stripe dashboard | 6 |
| Install widget on Dandia's site | Dandia's web dev | 3 |

---

## VERIFICATION CHECKLIST

### After Sprint 1
- [ ] `GET /api/tenants` returns Dandia with correct slug
- [ ] `GET /api/module-configs?filter[tenantId]={id}` returns 14+ config entries
- [ ] `GET /api/tenant-subscriptions?tenantId={id}` returns active subscription
- [ ] `GET /api/billing-plans/public` returns Dandia plans with quotas
- [ ] Admin can log in and see all menu sections
- [ ] Dandia user can log in with correct tenant context

### After Sprint 2
- [ ] KB search returns correct FAQ matches for sample Spanish questions
- [ ] Agent playground responds correctly
- [ ] Escalation triggers work for symptom/emergency categories

### After Sprint 3
- [ ] Chat widget loads on Dandia's website
- [ ] Correct welcome message based on business hours
- [ ] Quick reply buttons work
- [ ] Scheduling button opens correct URL

### After Sprint 4
- [ ] Meta webhook verification succeeds
- [ ] Inbound WhatsApp creates conversation in DB
- [ ] Bot responds with correct FAQ answer
- [ ] Usage counter increments; limit warning at 80%

### After Sprint 5
- [ ] Agent workflow executes full FAQ-first pipeline
- [ ] Guardrails block medical diagnosis attempts
- [ ] Spanish language maintained throughout

### After Sprint 6
- [ ] Stripe checkout creates payment
- [ ] Subscription auto-activates after payment
