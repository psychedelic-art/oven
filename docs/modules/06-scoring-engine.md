# Module: Scoring Engine

> **Package**: `packages/module-scoring-engine/`
> **Name**: `@oven/module-scoring-engine`
> **Dependencies**: `module-registry`, `module-roles`, `module-questions`, `module-exams`
> **Status**: Planned

---

## 1. Overview

The Scoring Engine is the **evaluation and grading module** that processes exam responses and produces scores, grades, and feedback. It operates as a standalone, pluggable engine that receives structured response data from the Exams module and evaluates it against scoring rules defined per question type.

The engine supports multiple scoring strategies — from simple exact-match auto-grading to complex rubric-based manual review with partial credit. It is designed to be extensible: new scoring strategies can be registered without modifying the core engine.

---

## 2. Core Concepts

### Scoring Strategy
A named algorithm that evaluates a response and returns a score. Strategies are registered per question type via the scoring contract.

### Built-in Strategies
- **Exact Match** — Binary correct/incorrect (MCQ single, true/false, dropdown)
- **Multi-Match** — Partial credit for selecting correct options (MCQ multiple)
- **Order Match** — Full or partial credit for correct sequence (ordering, ranking)
- **Text Match** — Exact, case-insensitive, regex, or keyword matching (short answer, fill-in-blank)
- **Rubric Grading** — Manual evaluation against defined criteria (essay, long answer)
- **Code Execution** — Run test cases against submitted code, score per passing test
- **Symbolic Comparison** — Compare math expressions for equivalence (math input)
- **Spatial Match** — Evaluate hotspot/drawing accuracy against defined regions

### Scoring Rubric
A structured set of criteria for manual grading. Each criterion has levels (e.g., Excellent/Good/Fair/Poor) with point values and descriptions. Used for essay, long answer, and other subjective question types.

### Score Record
The final evaluated result for a single response — includes points earned, max points, feedback, and grader info (auto or manual).

### Grade
An aggregate result for an entire exam attempt — total score, percentage, pass/fail, letter grade (configurable), and per-section breakdowns.

---

## 3. Scoring Pipeline

1. **Trigger**: Exam attempt is submitted → `exams.attempt.submitted` event fires
2. **Dispatch**: Scoring engine receives the attempt, loads all responses
3. **Per-Response Evaluation**:
   - Look up the question's scoring contract (from question type)
   - Select the appropriate scoring strategy
   - Auto-gradable → execute strategy, produce score immediately
   - Manual-gradable → create a pending grading task for a reviewer
4. **Aggregation**: Once all responses are scored, compute attempt-level grade
5. **Output**: Score records and grade are persisted, events emitted

---

## 4. Database Schema

### Tables

**`scoring_strategies`** — Registered scoring algorithms
- `id`, `name`, `slug`, `description`
- `type` (auto/manual/hybrid)
- `config` (JSONB) — strategy-specific settings schema
- `handlerModule` (varchar) — code reference for execution
- `builtIn` (boolean)
- `createdAt`, `updatedAt`

**`scoring_rubrics`** — Rubric definitions for manual grading
- `id`, `name`, `slug`, `description`
- `criteria` (JSONB) — array of { name, description, levels: [{ label, points, description }] }
- `maxScore` (integer)
- `createdBy`, `createdAt`, `updatedAt`

**`score_records`** — Individual response scores
- `id`, `attemptId` (FK → exam_attempts), `questionId` (FK → questions)
- `responseId` (FK → exam_responses)
- `strategyId` (FK → scoring_strategies)
- `pointsEarned` (decimal), `pointsMax` (decimal)
- `feedback` (JSONB) — auto-generated or reviewer-written feedback
- `rubricResults` (JSONB) — per-criterion scores (for rubric grading)
- `gradedBy` (integer — null for auto), `gradedAt` (timestamp)
- `status` (pending/auto-graded/manually-graded/disputed)

**`grades`** — Attempt-level aggregate scores
- `id`, `attemptId` (FK → exam_attempts), `examId` (FK → exams)
- `studentId` (integer)
- `totalPoints` (decimal), `maxPoints` (decimal)
- `percentage` (decimal), `letterGrade` (varchar — nullable)
- `passed` (boolean — nullable)
- `sectionBreakdown` (JSONB) — per-section scores
- `computedAt` (timestamp)

**`grading_tasks`** — Pending manual grading assignments
- `id`, `scoreRecordId` (FK → score_records)
- `assignedTo` (integer — reviewer), `assignedAt` (timestamp)
- `status` (pending/in-progress/completed)
- `dueBy` (timestamp — optional deadline)

---

## 5. API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/scoring/evaluate` | Trigger scoring for an attempt |
| GET | `/api/scoring/attempts/[attemptId]/scores` | Get all score records for an attempt |
| GET | `/api/scoring/attempts/[attemptId]/grade` | Get the aggregate grade |
| GET/POST | `/api/scoring/rubrics` | List and create rubrics |
| GET/PUT/DELETE | `/api/scoring/rubrics/[id]` | Rubric CRUD |
| GET | `/api/scoring/grading-tasks` | List pending grading tasks (for current reviewer) |
| GET/PUT | `/api/scoring/grading-tasks/[id]` | View and submit manual grade |
| GET | `/api/scoring/strategies` | List available scoring strategies |
| GET | `/api/scoring/students/[studentId]/grades` | All grades for a student |
| GET | `/api/scoring/exams/[examId]/grades` | All grades for an exam (stats, distribution) |

---

## 6. Dashboard UI

### React Admin Resources
- **Rubrics** — List, Create, Edit, Show
- **Grading Tasks** — List (filtered by status, assigned reviewer), inline grading view
- **Grades** — List (filterable by exam, student, pass/fail)

### Custom Pages
- **Grading Console** (`/scoring/grade`) — Side-by-side view: student response on left, rubric/scoring form on right, with navigation between responses
- **Grade Report** (`/scoring/attempts/[id]/report`) — Full breakdown: per-question scores, rubric results, aggregate stats, comparison to class average

### Menu Section
```
──── Scoring ────
Rubrics
Grading Tasks
Grades
```

---

## 7. Events

| Event | Payload |
|-------|---------|
| `scoring.evaluation.started` | attemptId, examId, studentId |
| `scoring.evaluation.completed` | attemptId, examId, studentId, percentage, passed |
| `scoring.response.auto-graded` | scoreRecordId, attemptId, questionId, pointsEarned |
| `scoring.grading-task.created` | taskId, scoreRecordId, assignedTo |
| `scoring.grading-task.completed` | taskId, scoreRecordId, gradedBy, pointsEarned |
| `scoring.grade.computed` | gradeId, attemptId, totalPoints, percentage |

---

## 8. Integration Points

| Module | Integration |
|--------|-------------|
| **module-roles** | Permission-based access to grade, view scores, manage rubrics |
| **module-exams** | Receives attempt submissions, reads exam structure for aggregation |
| **module-questions** | Reads correct answers and scoring contracts per question |
| **module-question-types** | Determines which scoring strategy to apply |
| **module-flows** | Grading tasks can be flow items for review pipelines |
| **module-workflows** | Trigger workflows on grade completion (send results, update records) |
| **module-analytics-forms** | Scoring data feeds analytics dashboards (score distributions, performance trends) |
| **module-chat** | Chat agent can query grades, summarize performance, identify at-risk students |

---

## Module Rules Compliance

> Added per [`module-rules.md`](../module-rules.md) — 7 required items.

### A. Schema Updates — tenantId + Indexes

```typescript
// scoring_strategies — platform-global (no tenantId), but needs indexes
}, (table) => [
  index('ss_slug_idx').on(table.slug),
  index('ss_type_idx').on(table.type),
  index('ss_built_in_idx').on(table.builtIn),
]);

// scoring_rubrics
tenantId: integer('tenant_id').notNull(),
}, (table) => [
  index('sr_tenant_id_idx').on(table.tenantId),
  index('sr_slug_idx').on(table.slug),
  index('sr_created_by_idx').on(table.createdBy),
]);

// score_records
tenantId: integer('tenant_id').notNull(),
}, (table) => [
  index('scr_tenant_id_idx').on(table.tenantId),
  index('scr_attempt_id_idx').on(table.attemptId),
  index('scr_question_id_idx').on(table.questionId),
  index('scr_status_idx').on(table.status),
  index('scr_graded_by_idx').on(table.gradedBy),
]);

// grades
tenantId: integer('tenant_id').notNull(),
}, (table) => [
  index('g_tenant_id_idx').on(table.tenantId),
  index('g_attempt_id_idx').on(table.attemptId),
  index('g_exam_id_idx').on(table.examId),
  index('g_student_id_idx').on(table.studentId),
]);

// grading_tasks
}, (table) => [
  index('gt_score_record_id_idx').on(table.scoreRecordId),
  index('gt_assigned_to_idx').on(table.assignedTo),
  index('gt_status_idx').on(table.status),
]);
```

### B. Chat Block

```typescript
chat: {
  description: 'Evaluation and grading engine. Processes exam responses, applies scoring strategies, supports rubric-based manual grading, and computes aggregate grades.',
  capabilities: ['evaluate exam attempts', 'manage rubrics', 'view grades', 'assign grading tasks', 'query student performance'],
  actionSchemas: [
    {
      name: 'scoring.evaluate',
      description: 'Trigger scoring for an exam attempt',
      parameters: { attemptId: { type: 'number', required: true } },
      requiredPermissions: ['scoring.evaluate'],
      endpoint: { method: 'POST', path: 'scoring/evaluate' },
    },
    {
      name: 'scoring.getGrade',
      description: 'Get aggregate grade for an attempt',
      parameters: { attemptId: { type: 'number', required: true } },
      returns: { totalPoints: { type: 'number' }, percentage: { type: 'number' }, passed: { type: 'boolean' } },
      requiredPermissions: ['grades.read'],
      endpoint: { method: 'GET', path: 'scoring/attempts/[attemptId]/grade' },
    },
    {
      name: 'scoring.listGradingTasks',
      description: 'List pending grading tasks for the current reviewer',
      parameters: { status: { type: 'string' } },
      requiredPermissions: ['grading-tasks.read'],
      endpoint: { method: 'GET', path: 'scoring/grading-tasks' },
    },
  ],
},
```

### C. configSchema

```typescript
configSchema: [
  { key: 'AUTO_GRADE_ON_SUBMIT', type: 'boolean', description: 'Auto-trigger scoring when attempt is submitted', defaultValue: true, instanceScoped: true },
  { key: 'GRADING_TASK_DUE_DAYS', type: 'number', description: 'Default days until grading task is due', defaultValue: 7, instanceScoped: true },
  { key: 'PASS_PERCENTAGE_DEFAULT', type: 'number', description: 'Default passing percentage when exam does not specify', defaultValue: 60, instanceScoped: true },
],
```

### D. Typed Event Schemas

```typescript
events: {
  schemas: {
    'scoring.evaluation.started': {
      attemptId: { type: 'number', required: true }, tenantId: { type: 'number', required: true },
      examId: { type: 'number' }, studentId: { type: 'number' },
    },
    'scoring.evaluation.completed': {
      attemptId: { type: 'number', required: true }, tenantId: { type: 'number', required: true },
      examId: { type: 'number' }, studentId: { type: 'number' },
      percentage: { type: 'number' }, passed: { type: 'boolean' },
    },
    'scoring.response.auto-graded': {
      scoreRecordId: { type: 'number', required: true }, tenantId: { type: 'number', required: true },
      attemptId: { type: 'number' }, questionId: { type: 'number' }, pointsEarned: { type: 'number' },
    },
    'scoring.grading-task.created': {
      taskId: { type: 'number', required: true }, tenantId: { type: 'number', required: true },
      scoreRecordId: { type: 'number' }, assignedTo: { type: 'number' },
    },
    'scoring.grade.computed': {
      gradeId: { type: 'number', required: true }, tenantId: { type: 'number', required: true },
      attemptId: { type: 'number' }, totalPoints: { type: 'number' }, percentage: { type: 'number' },
    },
  },
},
```

### E. Seed Function

```typescript
export async function seedScoring(db: any) {
  const modulePermissions = [
    { resource: 'scoring', action: 'evaluate', slug: 'scoring.evaluate', description: 'Trigger scoring' },
    { resource: 'scoring-rubrics', action: 'read', slug: 'scoring-rubrics.read', description: 'View rubrics' },
    { resource: 'scoring-rubrics', action: 'create', slug: 'scoring-rubrics.create', description: 'Create rubrics' },
    { resource: 'scoring-rubrics', action: 'update', slug: 'scoring-rubrics.update', description: 'Edit rubrics' },
    { resource: 'scoring-rubrics', action: 'delete', slug: 'scoring-rubrics.delete', description: 'Delete rubrics' },
    { resource: 'grades', action: 'read', slug: 'grades.read', description: 'View grades' },
    { resource: 'grading-tasks', action: 'read', slug: 'grading-tasks.read', description: 'View grading tasks' },
    { resource: 'grading-tasks', action: 'grade', slug: 'grading-tasks.grade', description: 'Submit manual grades' },
    { resource: 'score-records', action: 'read', slug: 'score-records.read', description: 'View score records' },
  ];
  for (const perm of modulePermissions) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  // Seed built-in scoring strategies
  const strategies = [
    { name: 'Exact Match', slug: 'exact-match', type: 'auto', builtIn: true, isSystem: true },
    { name: 'Multi-Match', slug: 'multi-match', type: 'auto', builtIn: true, isSystem: true },
    { name: 'Order Match', slug: 'order-match', type: 'auto', builtIn: true, isSystem: true },
    { name: 'Text Match', slug: 'text-match', type: 'auto', builtIn: true, isSystem: true },
    { name: 'Rubric Grading', slug: 'rubric-grading', type: 'manual', builtIn: true, isSystem: true },
    { name: 'Code Execution', slug: 'code-execution', type: 'auto', builtIn: true, isSystem: true },
  ];
  for (const s of strategies) {
    await db.insert(scoringStrategies).values(s).onConflictDoNothing();
  }
}
```

### F. API Handler Example

```typescript
import { parseListParams, listResponse } from '@oven/module-registry/api-utils';

export async function GET(request: NextRequest) {
  const params = parseListParams(request);
  const tenantId = request.headers.get('x-tenant-id');
  const conditions = [];
  if (tenantId) conditions.push(eq(grades.tenantId, Number(tenantId)));
  if (params.filter?.examId) conditions.push(eq(grades.examId, params.filter.examId));
  if (params.filter?.studentId) conditions.push(eq(grades.studentId, params.filter.studentId));
  const where = conditions.length ? and(...conditions) : undefined;
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(grades).where(where).orderBy(desc(grades.computedAt)).offset(params.offset).limit(params.limit),
    db.select({ count: sql`count(*)` }).from(grades).where(where),
  ]);
  return listResponse(rows, 'grades', params, Number(count));
}
```
