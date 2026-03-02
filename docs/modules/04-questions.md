# Module: Questions

> **Package**: `packages/module-questions/`
> **Name**: `@oven/module-questions`
> **Dependencies**: `module-registry`, `module-roles`, `module-question-types`
> **Status**: Planned

---

## 1. Overview

Questions is the **content authoring module** for educational assessments. While Question Types define *how* a question behaves, Questions define *what* a question asks — the actual prompt, options, media, correct answers, hints, and metadata.

A question is always associated with a question type and stores its content in a structured JSON format dictated by that type's configuration. Questions are standalone, reusable entities that can be assembled into exams, embedded in forms, or used independently.

---

## 2. Core Concepts

### Question
A concrete piece of assessment content: a prompt with its answer options, correct answer(s), hints, explanations, and metadata. Each question belongs to exactly one question type.

### Question Options
For selection-based question types, options are the choices presented to the student. Each option has content (text/image/media), a position, and correctness metadata.

### Question Tags
Freeform labels for organizing and filtering questions — by topic, difficulty, learning objective, curriculum standard, or any custom taxonomy.

### Question Bank
A logical grouping of questions for reuse across exams. Banks can be filtered by tags, type, difficulty, or custom criteria when composing an exam.

---

## 3. Question Content Structure

Each question stores its content as structured JSON. The shape depends on the question type, but common fields include:

- **Prompt**: The main question text (supports rich text, images, audio, video, math)
- **Options**: Array of answer choices (for selection types)
- **Correct Answer(s)**: The expected response(s) — stored separately for security
- **Explanation**: Shown after answering — explains why the correct answer is correct
- **Hints**: Progressive hints that can be revealed during the assessment
- **Media**: Attached files, images, audio clips, video embeds
- **Metadata**: Difficulty level, estimated time, points, learning objectives

---

## 4. Database Schema

### Tables

**`questions`** — Question content
- `id`, `questionTypeId` (FK → question_types), `title`, `slug`
- `content` (JSONB) — prompt, media, options structure per question type
- `correctAnswer` (JSONB) — answer key (stored separately, access-controlled)
- `explanation` (JSONB) — post-answer explanation content
- `hints` (JSONB) — array of progressive hints
- `difficulty` (varchar) — easy/medium/hard/expert
- `estimatedTime` (integer) — seconds
- `points` (integer) — default point value
- `status` (draft/published/archived)
- `version` (integer)
- `createdBy`, `createdAt`, `updatedAt`

**`question_options`** — Answer choices for selection-based questions
- `id`, `questionId` (FK → questions)
- `content` (JSONB) — option text, media
- `position` (integer) — display order
- `isCorrect` (boolean)
- `feedback` (JSONB) — option-specific feedback when selected
- `createdAt`, `updatedAt`

**`question_tags`** — Tagging system
- `id`, `questionId` (FK → questions)
- `tag` (varchar), `category` (varchar — topic/difficulty/objective/standard/custom)

**`question_versions`** — Version history
- `id`, `questionId`, `version`, `content`, `correctAnswer`, `description`, `createdAt`

---

## 5. API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/questions` | List and create questions |
| GET/PUT/DELETE | `/api/questions/[id]` | Single question CRUD |
| GET | `/api/questions/[id]/preview` | Render preview of a question |
| GET/POST | `/api/questions/[id]/options` | List and create options |
| PUT/DELETE | `/api/question-options/[id]` | Update or delete an option |
| GET | `/api/questions/[id]/versions` | Version history |
| POST | `/api/questions/[id]/versions/[versionId]/restore` | Restore a version |
| GET | `/api/question-bank` | Search/filter questions for exam composition |
| POST | `/api/questions/[id]/duplicate` | Clone a question |
| POST | `/api/questions/bulk-tag` | Apply tags to multiple questions |

---

## 6. Dashboard UI

### React Admin Resources
- **Questions** — List (filterable by type, tags, difficulty, status), Create, Edit, Show
- **Question Options** — Inline editing within the question form

### Custom Pages
- **Question Editor** (`/questions/[id]/edit`) — Rich editor adapted per question type: prompt editor, option builder, answer key, hints, explanation
- **Question Bank** (`/question-bank`) — Search and filter interface for finding and selecting questions

### Menu Section
```
──── Questions ────
Questions
Question Bank
```

---

## 7. Events

| Event | Payload |
|-------|---------|
| `questions.question.created` | id, questionTypeId, title, createdBy |
| `questions.question.updated` | id, title, version |
| `questions.question.published` | id, title |
| `questions.question.archived` | id, title |
| `questions.question.duplicated` | id, sourceId, title |

---

## 8. Integration Points

| Module | Integration |
|--------|-------------|
| **module-roles** | Permission-based access to create, edit, publish, view correct answers |
| **module-question-types** | Each question references a question type for behavior |
| **module-exams** | Exams compose questions into ordered assessments |
| **module-scoring-engine** | Scoring engine evaluates responses against correct answers |
| **module-flows** | Questions can be flow items for review/approval pipelines |
| **module-forms** | Questions can be embedded as components in forms |
| **module-chat** | Chat agent can create and search questions |
