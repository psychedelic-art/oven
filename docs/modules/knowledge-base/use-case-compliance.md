# Knowledge Base -- Use-Case Compliance

> Maps `module-knowledge-base` to platform use cases from `docs/use-cases.md` and dental-specific scenarios.

---

## 1. Mapping to Platform Use Cases

### UC-1: Initial Platform Setup

**Relevance**: Low -- Knowledge Base is not involved in initial platform setup. It activates per-tenant during onboarding.

**KB contribution**: The module's `configSchema` entries (`EMBEDDING_MODEL`, `SEARCH_CONFIDENCE_THRESHOLD`, etc.) are available as platform-level defaults once the module is registered. An admin can set platform-wide KB defaults during setup via Module Configs.

---

### UC-2: Onboard a New Tenant

**Relevance**: High -- When a tenant is onboarded, their knowledge base should be bootstrapped with default categories.

**Steps involving KB**:

| Step | Action | Module |
|---|---|---|
| 5 | Auto-seed default FAQ categories for the tenant | knowledge-base |
| 6 | Create initial FAQ entries (optional, from template) | knowledge-base |

**Implementation**: The seed function (or a wiring triggered by `tenants.tenant.created`) creates the 10 default dental FAQ categories for the new tenant:

1. Agendamiento (`agendamiento`)
2. Horarios (`horarios`)
3. Ubicacion (`ubicacion`)
4. Servicios (`servicios`)
5. Pagos (`pagos`)
6. Antes de la cita (`antes-cita`)
7. Despues de la cita (`despues-cita`)
8. Sintomas / Dolor (`sintomas`)
9. Urgencias (`urgencias`)
10. Atencion humana (`atencion-humana`)

**Wiring definition**:
```
Event: tenants.tenant.created
Action: POST /api/kb-categories (batch create 10 categories)
Condition: $.metadata.industry == 'dental' (or always, if dental is the only vertical)
```

---

### UC-3: Configure Tenant Settings

**Relevance**: High -- KB has several tenant-configurable settings.

**Configurable keys for KB**:

| Config Key | What It Controls | Example Override |
|---|---|---|
| `EMBEDDING_MODEL` | Which embedding model to use | `text-embedding-3-large` for a premium tenant |
| `SEARCH_CONFIDENCE_THRESHOLD` | Minimum score for confident match | `0.75` for a tenant with broader FAQ coverage |
| `SEARCH_MAX_RESULTS` | Maximum results per search query | `10` for a tenant wanting more suggestions |
| `MAX_ENTRIES_PER_TENANT` | Hard limit on FAQ entries | `1000` for an enterprise tenant |

**Steps**: Dashboard > Automation > Module Configs > Create entry with `moduleName=knowledge-base`, `tenantId=T`, `key=SEARCH_CONFIDENCE_THRESHOLD`, `value=0.75`.

---

### UC-8: Override Config Per Tenant

**Relevance**: High -- Directly applicable. The config cascade enables per-tenant KB behavior tuning.

**Scenario**: Tenant "Clinica Norte" wants to use a different embedding model because their FAQ entries are longer and benefit from the larger model's context window.

**Steps**:

1. Admin navigates to Module Configs for tenant "Clinica Norte".
2. Creates config: `moduleName=knowledge-base`, `key=EMBEDDING_MODEL`, `value=text-embedding-3-large`.
3. Creates config: `moduleName=knowledge-base`, `key=EMBEDDING_DIMENSIONS`, `value=3072`.
4. Navigates to Knowledge Base > Bulk Actions.
5. Clicks "Re-embed All" to regenerate vectors with the new model.
6. Monitors progress until complete.

**Result**: Clinica Norte's KB uses the larger model. All other tenants continue using the platform default (`text-embedding-3-small`).

---

## 2. Dental-Specific Use Cases

### UC-KB-001: Initial FAQ Setup for a Dental Clinic

**Goal**: Populate a new dental clinic's knowledge base with common FAQ entries.

**Persona**: Clinic administrator

**Steps**:

1. Navigate to Knowledge Base > Categories. Verify 10 default categories are pre-seeded.
2. Click on "Agendamiento" category.
3. Click "Create Entry":
   - Question: "Como puedo agendar una cita?"
   - Answer: "Puede agendar su cita llamando al (555) 123-4567, por WhatsApp al mismo numero, o a traves de nuestra pagina web en www.clinica.com/citas."
   - Keywords: `agendar, cita, reservar, turno`
   - Priority: 8
   - Language: es
4. Entry auto-embeds. Embedding status badge turns green.
5. Repeat for remaining FAQ entries across all 10 categories.

**Target**: 40+ entries across 10 categories for a typical dental clinic.

**Acceptance**: All entries show green embedding status. Search test returns relevant results for common patient questions.

---

### UC-KB-002: Monthly FAQ Review and Update

**Goal**: Update FAQ entries based on patient feedback and seasonal changes.

**Persona**: Clinic administrator

**Steps**:

1. Navigate to Knowledge Base > Entries.
2. Sort by `updatedAt` ascending to find stale entries.
3. Edit entry "Horarios de atencion" to reflect holiday schedule changes.
4. System auto-creates version snapshot of old content.
5. System auto-re-embeds with updated text.
6. Navigate to entry Show page > Version History tab.
7. Verify old version is preserved with timestamp.

**Acceptance**: Version history shows before/after. Embedding re-generated. Search returns updated answer.

---

### UC-KB-003: Search Testing Before Go-Live

**Goal**: Validate that the knowledge base provides correct answers to common patient questions.

**Persona**: Clinic administrator

**Steps**:

1. Navigate to Knowledge Base > Search Test.
2. Select the clinic's tenant from the tenant selector.
3. Enter test query: "A que hora abren?"
4. Review results:
   - Top result: "Cual es el horario de atencion?" with score 0.92 (semantic)
   - Second result: "Atienden los sabados?" with score 0.85 (semantic)
5. Verify `topResultConfident: true` (score >= threshold).
6. Enter another query: "Puedo pagar con tarjeta?"
7. Verify result matches "Pagos" category entry.
8. Enter an out-of-scope query: "Cual es el clima hoy?"
9. Verify low confidence or no results, confirming scope containment.

**Acceptance**: Relevant queries return confident matches. Irrelevant queries return low/no confidence.

---

### UC-KB-004: Bulk Import from Existing FAQ Document

**Goal**: Import a clinic's existing FAQ from a spreadsheet.

**Persona**: Clinic administrator

**Steps**:

1. Prepare CSV file with columns: `question`, `answer`, `category`, `keywords`.
2. Navigate to Knowledge Base > Bulk Actions.
3. Upload CSV file in the Import section.
4. Review column mapping preview (auto-detected columns).
5. Click "Import".
6. System validates all rows, then creates entries with auto-embedding.
7. Monitor embedding progress bar until all entries are embedded.

**Acceptance**: All rows imported. No duplicate entries. All embeddings generated. Categories auto-matched by slug or name.

---

### UC-KB-005: Re-embed After Model Change

**Goal**: Regenerate all vectors after switching to a different embedding model.

**Persona**: Platform administrator

**Steps**:

1. Update config: `EMBEDDING_MODEL` = `text-embedding-3-large` for the tenant.
2. Update config: `EMBEDDING_DIMENSIONS` = `3072` (must match model).
3. Navigate to Knowledge Base > Bulk Actions.
4. Click "Re-embed All Entries".
5. System checks quota (150 entries * 1 embedding = 150 credits).
6. System starts bulk job, returns job ID.
7. Progress bar updates: 0/150, 10/150, ..., 150/150.
8. Verify stats show 100% embedding coverage with new model.

**Acceptance**: All entries re-embedded with new model. Old vectors replaced. Search quality maintained or improved.

---

### UC-KB-006: Review Embedding Status

**Goal**: Identify and fix entries with failed embeddings.

**Persona**: Clinic administrator

**Steps**:

1. Navigate to Knowledge Base > Entries.
2. Sort/filter by embedding status (red badge = failed).
3. Click on a failed entry to view details.
4. Check `metadata.embeddingError` for error message (e.g., "Rate limit exceeded").
5. Click "Re-embed" action button on the entry.
6. Or: Navigate to Bulk Actions > Re-embed All with `force: true`.

**Acceptance**: Failed entries identifiable in list view. Re-embed action resolves transient failures.

---

### UC-KB-007: Agent Uses KB for Patient Response

**Goal**: A WhatsApp patient question is answered using the knowledge base.

**Persona**: Patient (end user), Agent (automated)

**Flow**:

1. Patient sends WhatsApp message: "Cuanto cuesta una limpieza dental?"
2. `module-notifications` receives webhook, emits `notifications.message.received`.
3. Wiring triggers agent workflow.
4. Workflow's RAG node calls `POST /api/knowledge-base/clinica-norte/search` with query.
5. KB returns: top result "Cuanto cuesta una limpieza?" with score 0.91, `topResultConfident: true`.
6. Workflow returns the FAQ answer directly (no LLM call needed).
7. Patient receives curated response via WhatsApp.

**Acceptance**: Patient gets correct answer. No LLM cost incurred. Response time under 2 seconds.

---

## 3. Cross-Module Use Case Matrix

| Use Case | KB | AI | Config | Tenants | Subscriptions | Notifications | Agent |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| UC-2: Onboard tenant | Seed categories | - | Set defaults | Create tenant | Assign plan | - | - |
| UC-3: Configure tenant | Set threshold/model | - | Store overrides | - | - | - | - |
| UC-KB-001: FAQ setup | Create entries | Embed text | Resolve model | Scope data | Track usage | - | - |
| UC-KB-003: Search test | Execute search | Embed query | Resolve threshold | Resolve slug | Track usage | - | - |
| UC-KB-005: Re-embed | Bulk process | Embed text | Resolve model | Scope data | Check quota | - | - |
| UC-KB-007: Agent response | Search | Embed query | Resolve config | Scope data | Track usage | Receive msg | Execute workflow |

---

## 4. Implementation Cross-Check

> Added post-implementation to reconcile the specification above with the actual delivered code.

| Area | Spec Assumption | Actual Implementation | Notes |
|------|----------------|----------------------|-------|
| Multi-KB architecture | Single implicit KB per tenant | `kb_knowledge_bases` table added; `knowledgeBaseId` FK on categories and entries | Tenants can own multiple knowledge bases with independent configs |
| Entry metadata | Keywords field only | `tags` text array field added to entries | User-facing categorization separate from embedding keywords |
| Dashboard UI | CategoryList, EntryList, SearchTest, BulkActions (separate pages) | KBPlayground unified interface replaces SearchTest + BulkActions; 14 components total including KnowledgeBaseList/Create/Edit | Single playground for search testing, bulk operations, and stats |
| Endpoints | 15 endpoints across 9 handler files | 15+ endpoints across 11 handler files — all working | Additional handlers for knowledge base CRUD and vector store ops |
| Tests | Target ~54 tests | 19 tests / 2 suites passing (embedding-pipeline: 7, search-engine: 12) | Core engine fully tested; handler tests deferred to Phase 2.5 |
| Seed | 9 permissions + 10 categories | delete+recreate pattern per Rule 12; 1 KB + 10 categories + 15 entries for first tenant | Seed is idempotent via full delete before insert |
| Chat block tool name | `kb.searchEntries` | `kb.search` | **MISMATCH**: agent-core, chat, and workflow-agents docs reference `kb.searchEntries` but KB module uses `kb.search`. Must standardize to `kb.searchEntries` to avoid tool resolution failures. |
| Config keys | 6 keys | 8 keys (added SEARCH_SEMANTIC_WEIGHT, SEARCH_KEYWORD_WEIGHT) | Extra config for fine-tuning hybrid search behavior |

### Open Items

| Item | Priority | Description |
|------|----------|-------------|
| Tool name standardization | HIGH | Rename `kb.search` to `kb.searchEntries` in chat block actionSchemas to match cross-module references |
| Handler-level tests | MEDIUM | 11 handler files have no dedicated test suites (engine tests cover core logic) |
| Wiring for tenant onboarding | LOW | `tenants.tenant.created` → auto-seed KB categories wiring exists in docs but not implemented as DB wiring |
