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
