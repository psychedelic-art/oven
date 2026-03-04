# Module: Question Types

> **Package**: `packages/module-question-types/`
> **Name**: `@oven/module-question-types`
> **Dependencies**: `module-registry`
> **Status**: Planned

---

## 1. Overview

Question Types is a **behavior composition system** that defines the building blocks for educational assessments. Rather than hardcoding question formats, this module provides a designer where each question type is assembled from reusable **behaviors** — input method, validation, scoring contract, display, and interaction rules.

A question type is a **template** that defines how a question behaves. It does not contain content — that belongs to the Questions module. Think of question types as "blueprints" that describe: what kind of input the student provides, how it renders, and what scoring contract it exposes.

---

## 2. Core Concepts

### Question Type
A reusable template defining the structure and behavior of a category of questions. Examples: Multiple Choice, Drag-and-Drop Ordering, Code Editor, Math Expression, Fill-in-the-Blank.

### Behavior
An atomic capability that can be composed into a question type:
- **Input Behavior**: How the student provides an answer (click, type, drag, draw, record, upload)
- **Display Behavior**: How the question renders (text, image, audio, video, code block, math formula)
- **Validation Behavior**: Client-side rules before submission (required, min/max length, format)
- **Interaction Behavior**: UI interactions (shuffle options, timer, hint reveal, partial submit)
- **Scoring Contract**: What data shape this question type produces for the scoring engine (exact match, partial credit, rubric-based, auto-graded)

### Component Mapping
Each question type maps to a React component (or GrapeJS block) that handles rendering and interaction. The module provides a registry of available components per behavior.

---

## 3. Built-in Question Types

### Selection Types
- **Multiple Choice (Single)** — Radio buttons, one correct answer
- **Multiple Choice (Multiple)** — Checkboxes, multiple correct answers
- **True/False** — Binary choice
- **Dropdown Select** — Select from a dropdown menu

### Text Input Types
- **Short Answer** — Single-line text input with exact/regex matching
- **Long Answer / Essay** — Multi-line text with rubric-based scoring
- **Fill-in-the-Blank** — Inline blanks within a passage
- **Cloze (Multiple Blanks)** — Multiple blanks with individual scoring

### Interactive Types
- **Drag-and-Drop Ordering** — Reorder items into correct sequence
- **Drag-and-Drop Matching** — Match items between two columns
- **Drag-and-Drop Categories** — Sort items into labeled buckets
- **Hotspot / Image Click** — Click on regions of an image
- **Drawing Canvas** — Freeform drawing or annotation on an image

### Rich Input Types
- **Code Editor** — Write code with syntax highlighting, language selection, and test-case execution
- **Math Expression** — LaTeX/MathML input with symbolic comparison
- **Rich Text** — Formatted text response with toolbar
- **File Upload** — Upload documents, images, or media as the answer

### Media Types
- **Audio Response** — Record an audio answer
- **Video Response** — Record a video answer
- **Image Annotation** — Annotate an uploaded or provided image

### Composite Types
- **Matrix / Grid** — Table of questions with shared options across rows
- **Likert Scale** — Agreement scale (Strongly Disagree → Strongly Agree)
- **Ranking** — Order items by preference or priority
- **Slider / Numeric Scale** — Numeric answer on a range

---

## 4. Database Schema

### Tables

**`question_types`** — Question type definitions
- `id`, `name`, `slug`, `description`, `category`
- `behaviors` (JSONB) — composed behavior configuration
- `scoringContract` (JSONB) — expected output shape for scoring engine
- `componentId` (varchar) — React component identifier
- `defaultConfig` (JSONB) — default settings when creating a question of this type
- `icon` (varchar), `color` (varchar)
- `builtIn` (boolean) — system-provided vs custom
- `enabled` (boolean)
- `createdAt`, `updatedAt`

**`question_type_behaviors`** — Available behavior definitions
- `id`, `name`, `slug`, `type` (input/display/validation/interaction/scoring)
- `description`
- `config` (JSONB) — behavior-specific configuration schema
- `componentId` (varchar) — React component for this behavior
- `createdAt`, `updatedAt`

---

## 5. API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/question-types` | List and create question types |
| GET/PUT/DELETE | `/api/question-types/[id]` | Single question type CRUD |
| GET | `/api/question-types/[id]/preview` | Preview render of a question type with sample data |
| GET/POST | `/api/question-type-behaviors` | List and register behaviors |
| GET/PUT/DELETE | `/api/question-type-behaviors/[id]` | Behavior CRUD |

---

## 6. Dashboard UI

### React Admin Resources
- **Question Types** — List, Create, Edit, Show (template management)
- **Behaviors** — List, Create, Edit (behavior registry)

### Custom Pages
- **Type Designer** (`/question-types/[id]/designer`) — Visual behavior composer: drag behaviors onto a question type canvas, configure each, preview the result

### Menu Section
```
──── Question Types ────
Question Types
Behaviors
```

---

## 7. Events

| Event | Payload |
|-------|---------|
| `question-types.type.created` | id, name, slug, category |
| `question-types.type.updated` | id, name, slug |
| `question-types.type.deleted` | id, name, slug |
| `question-types.behavior.registered` | id, name, slug, type |

---

## 8. Integration Points

| Module | Integration |
|--------|-------------|
| **module-roles** | Permission-based access to create/edit question types |
| **module-questions** | Questions reference a question type to determine behavior |
| **module-scoring-engine** | Scoring contract defines how answers are evaluated |
| **module-forms** | Question types can be registered as GrapeJS blocks in the form editor |
| **module-chat** | Chat agent can browse and suggest question types |

---

## Module Rules Compliance

> Added per [`module-rules.md`](../module-rules.md) — 7 required items.
>
> **Note**: `question_types` and `question_type_behaviors` are **platform-global** entities (shared across all tenants), so they do NOT get a `tenantId` column. However, they still need indexes, chat block, configSchema, event schemas, seed, and API handler examples.

### A. Schema Updates — Indexes (no tenantId)

```typescript
// question_types — platform-global, no tenantId
}, (table) => [
  index('qt_slug_idx').on(table.slug),
  index('qt_category_idx').on(table.category),
  index('qt_built_in_idx').on(table.builtIn),
  index('qt_enabled_idx').on(table.enabled),
]);

// question_type_behaviors — platform-global, no tenantId
}, (table) => [
  index('qtb_slug_idx').on(table.slug),
  index('qtb_type_idx').on(table.type),
]);
```

### B. Chat Block

```typescript
chat: {
  description: 'Behavior composition system for educational question blueprints. Defines input methods, validation, scoring contracts, and display for assessment question types.',
  capabilities: [
    'list question types',
    'create custom question types',
    'browse behavior library',
    'preview question type rendering',
  ],
  actionSchemas: [
    {
      name: 'questionTypes.list',
      description: 'List available question types',
      parameters: {
        category: { type: 'string', description: 'Filter by category (selection/text/interactive/rich/media/composite)' },
        builtIn: { type: 'boolean', description: 'Filter built-in vs custom' },
      },
      returns: { data: { type: 'array' }, total: { type: 'number' } },
      requiredPermissions: ['question-types.read'],
      endpoint: { method: 'GET', path: 'question-types' },
    },
    {
      name: 'questionTypes.create',
      description: 'Create a new custom question type from behaviors',
      parameters: {
        name: { type: 'string', required: true },
        slug: { type: 'string', required: true },
        category: { type: 'string', required: true },
        behaviors: { type: 'object', description: 'Composed behavior configuration' },
        scoringContract: { type: 'object', description: 'Expected scoring output shape' },
      },
      requiredPermissions: ['question-types.create'],
      endpoint: { method: 'POST', path: 'question-types' },
    },
  ],
},
```

### C. configSchema

```typescript
configSchema: [
  {
    key: 'ALLOW_CUSTOM_QUESTION_TYPES',
    type: 'boolean',
    description: 'Whether non-admin users can create custom question types',
    defaultValue: false,
    instanceScoped: false,
  },
  {
    key: 'MAX_BEHAVIORS_PER_TYPE',
    type: 'number',
    description: 'Maximum behaviors composable into a single question type',
    defaultValue: 10,
    instanceScoped: false,
  },
],
```

### D. Typed Event Schemas

```typescript
events: {
  schemas: {
    'question-types.type.created': {
      id: { type: 'number', required: true },
      name: { type: 'string' },
      slug: { type: 'string' },
      category: { type: 'string' },
    },
    'question-types.type.updated': {
      id: { type: 'number', required: true },
      name: { type: 'string' },
      slug: { type: 'string' },
    },
    'question-types.type.deleted': {
      id: { type: 'number', required: true },
      name: { type: 'string' },
      slug: { type: 'string' },
    },
    'question-types.behavior.registered': {
      id: { type: 'number', required: true },
      name: { type: 'string' },
      slug: { type: 'string' },
      type: { type: 'string', description: 'input/display/validation/interaction/scoring' },
    },
  },
},
```

### E. Seed Function

```typescript
export async function seedQuestionTypes(db: any) {
  // Seed permissions
  const modulePermissions = [
    { resource: 'question-types', action: 'read', slug: 'question-types.read', description: 'View question types' },
    { resource: 'question-types', action: 'create', slug: 'question-types.create', description: 'Create question types' },
    { resource: 'question-types', action: 'update', slug: 'question-types.update', description: 'Edit question types' },
    { resource: 'question-types', action: 'delete', slug: 'question-types.delete', description: 'Delete question types' },
    { resource: 'question-type-behaviors', action: 'read', slug: 'question-type-behaviors.read', description: 'View behaviors' },
    { resource: 'question-type-behaviors', action: 'create', slug: 'question-type-behaviors.create', description: 'Register behaviors' },
    { resource: 'question-type-behaviors', action: 'update', slug: 'question-type-behaviors.update', description: 'Edit behaviors' },
    { resource: 'question-type-behaviors', action: 'delete', slug: 'question-type-behaviors.delete', description: 'Delete behaviors' },
  ];

  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  // Seed built-in question types
  const builtInTypes = [
    { name: 'Multiple Choice (Single)', slug: 'mcq-single', category: 'selection', builtIn: true, isSystem: true },
    { name: 'Multiple Choice (Multiple)', slug: 'mcq-multiple', category: 'selection', builtIn: true, isSystem: true },
    { name: 'True/False', slug: 'true-false', category: 'selection', builtIn: true, isSystem: true },
    { name: 'Short Answer', slug: 'short-answer', category: 'text', builtIn: true, isSystem: true },
    { name: 'Long Answer / Essay', slug: 'essay', category: 'text', builtIn: true, isSystem: true },
    { name: 'Fill-in-the-Blank', slug: 'fill-blank', category: 'text', builtIn: true, isSystem: true },
    { name: 'Drag-and-Drop Ordering', slug: 'dnd-ordering', category: 'interactive', builtIn: true, isSystem: true },
    { name: 'Drag-and-Drop Matching', slug: 'dnd-matching', category: 'interactive', builtIn: true, isSystem: true },
    { name: 'Code Editor', slug: 'code-editor', category: 'rich', builtIn: true, isSystem: true },
    { name: 'Math Expression', slug: 'math-expression', category: 'rich', builtIn: true, isSystem: true },
    { name: 'Likert Scale', slug: 'likert-scale', category: 'composite', builtIn: true, isSystem: true },
  ];

  for (const qt of builtInTypes) {
    await db.insert(questionTypes).values(qt).onConflictDoNothing();
  }
}
```

### F. API Handler Example

```typescript
// GET /api/question-types — List handler (platform-global, no tenant filter)
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);

  const conditions = [];
  if (params.filter?.category) conditions.push(eq(questionTypes.category, params.filter.category));
  if (params.filter?.builtIn !== undefined) conditions.push(eq(questionTypes.builtIn, params.filter.builtIn));
  conditions.push(eq(questionTypes.enabled, true));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db.select().from(questionTypes).where(where)
      .orderBy(asc(questionTypes.category), asc(questionTypes.name))
      .offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(questionTypes).where(where),
  ]);

  return listResponse(rows, 'question-types', params, Number(count));
}
```
