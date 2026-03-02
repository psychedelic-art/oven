# Module: Exams

> **Package**: `packages/module-exams/`
> **Name**: `@oven/module-exams`
> **Dependencies**: `module-registry`, `module-roles`, `module-questions`
> **Status**: Planned

---

## 1. Overview

Exams is the **assessment composition and delivery module**. It takes questions from the Questions module and assembles them into structured, timed, and configurable assessments. Exams handle the full lifecycle: authoring, configuration, delivery, state preservation (for resumable sessions), and response collection.

Exams do **not** score responses — that responsibility belongs to the Scoring Engine. Instead, exams collect structured response data and forward it for evaluation.

---

## 2. Core Concepts

### Exam
A configured assessment containing an ordered set of questions with rules for timing, navigation, randomization, and delivery.

### Exam Section
A grouping within an exam — sections can have their own time limits, instructions, and question pools. Example: "Section A: Multiple Choice (30 min)" and "Section B: Essay (60 min)".

### Exam Attempt
A student's session taking an exam. Tracks start time, current position, time remaining, and completion status. Supports pause/resume for long assessments.

### Exam Response
A student's answer to a single question within an attempt. Stored as structured JSON matching the question type's expected output.

---

## 3. Exam Configuration

### Delivery Settings
- **Time Limit**: Per-exam or per-section, with optional grace period
- **Question Order**: Fixed, randomized, or randomized-per-section
- **Option Shuffle**: Randomize answer option order per student
- **Navigation**: Linear (forward-only), free (any order), or section-locked
- **Attempts Allowed**: Single attempt, multiple with best/latest/average scoring
- **Availability Window**: Start date/time, end date/time, late submission policy

### Display Settings
- **Questions Per Page**: One at a time, all at once, or section-at-a-time
- **Progress Indicator**: Show/hide progress bar, question counter
- **Review Mode**: Allow students to review and change answers before submission
- **Hints**: Enable/disable hint usage, with optional point deduction per hint

### Security Settings
- **Browser Lockdown**: Flag for proctoring integration
- **Copy/Paste Prevention**: Disable clipboard interactions
- **Tab-Away Detection**: Log when student navigates away from the exam window

---

## 4. State Preservation

Exams support **resumable sessions** for long or interrupted assessments:
- Every response is auto-saved as the student progresses
- Current position, time remaining, and answered question IDs are persisted
- On reconnection, the exam resumes exactly where the student left off
- Network interruptions do not lose progress — responses are queued and synced

---

## 5. Database Schema

### Tables

**`exams`** — Exam definitions
- `id`, `name`, `slug`, `description`, `instructions` (JSONB)
- `config` (JSONB) — delivery, display, and security settings
- `totalPoints` (integer), `passingScore` (integer — optional)
- `timeLimitSeconds` (integer — nullable)
- `attemptsAllowed` (integer — default 1)
- `availableFrom` (timestamp), `availableUntil` (timestamp)
- `status` (draft/published/archived)
- `version` (integer)
- `createdBy`, `createdAt`, `updatedAt`

**`exam_sections`** — Logical groupings within an exam
- `id`, `examId` (FK → exams), `name`, `description`
- `position` (integer), `timeLimitSeconds` (integer — nullable)
- `config` (JSONB) — section-specific overrides
- `createdAt`, `updatedAt`

**`exam_questions`** — Questions assigned to an exam
- `id`, `examId` (FK → exams), `sectionId` (FK → exam_sections — nullable)
- `questionId` (FK → questions)
- `position` (integer), `points` (integer — override question default)
- `required` (boolean)
- `config` (JSONB) — per-question overrides (hints enabled, time limit)

**`exam_attempts`** — Student exam sessions
- `id`, `examId` (FK → exams), `studentId` (integer)
- `attemptNumber` (integer)
- `status` (in-progress/submitted/timed-out/abandoned)
- `startedAt` (timestamp), `submittedAt` (timestamp)
- `timeRemainingSeconds` (integer — for pause/resume)
- `currentPosition` (integer — last viewed question index)
- `metadata` (JSONB) — browser info, IP, proctoring flags

**`exam_responses`** — Individual question responses
- `id`, `attemptId` (FK → exam_attempts), `questionId` (FK → questions)
- `response` (JSONB) — structured answer data per question type
- `timeTakenSeconds` (integer)
- `hintsUsed` (integer)
- `flagged` (boolean) — student marked for review
- `answeredAt` (timestamp), `updatedAt` (timestamp)

**`exam_versions`** — Version history
- `id`, `examId`, `version`, `definition` (JSONB), `description`, `createdAt`

---

## 6. API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/exams` | List and create exams |
| GET/PUT/DELETE | `/api/exams/[id]` | Single exam CRUD |
| GET/POST | `/api/exams/[id]/sections` | List and create sections |
| PUT/DELETE | `/api/exam-sections/[id]` | Section CRUD |
| GET/POST | `/api/exams/[id]/questions` | List and assign questions |
| PUT/DELETE | `/api/exam-questions/[id]` | Update or remove question assignment |
| POST | `/api/exams/[id]/reorder` | Reorder questions/sections |
| POST | `/api/exams/[id]/start` | Begin an attempt (creates exam_attempt) |
| GET | `/api/exam-attempts/[id]` | Get attempt state (for resume) |
| POST | `/api/exam-attempts/[id]/respond` | Save a response |
| POST | `/api/exam-attempts/[id]/submit` | Submit the attempt |
| POST | `/api/exam-attempts/[id]/pause` | Pause and preserve state |
| GET | `/api/exam-attempts/[id]/responses` | List all responses for an attempt |
| GET | `/api/exams/[id]/versions` | Version history |
| POST | `/api/exams/[id]/duplicate` | Clone an exam |

---

## 7. Dashboard UI

### React Admin Resources
- **Exams** — List (filterable by status, date), Create, Edit, Show
- **Exam Attempts** — List with filters (by exam, student, status)
- **Exam Responses** — Read-only list within an attempt detail

### Custom Pages
- **Exam Composer** (`/exams/[id]/compose`) — Drag questions from the question bank into sections, configure order, points, and settings
- **Attempt Review** (`/exam-attempts/[id]/review`) — Read-only replay of a student's attempt showing each response

### Menu Section
```
──── Exams ────
Exams
Attempts
```

---

## 8. Events

| Event | Payload |
|-------|---------|
| `exams.exam.created` | id, name, createdBy |
| `exams.exam.published` | id, name, version |
| `exams.exam.archived` | id, name |
| `exams.attempt.started` | id, examId, studentId |
| `exams.attempt.submitted` | id, examId, studentId, attemptNumber |
| `exams.attempt.timed-out` | id, examId, studentId |
| `exams.response.saved` | attemptId, questionId |

---

## 9. Integration Points

| Module | Integration |
|--------|-------------|
| **module-roles** | Permission-based access to create exams, take exams, review attempts |
| **module-questions** | Exams compose questions — reads from question bank |
| **module-question-types** | Renders question components based on type during delivery |
| **module-scoring-engine** | On attempt submission, triggers scoring evaluation |
| **module-flows** | Exams can be flow items for review/approval before publishing |
| **module-workflows** | Trigger workflows on attempt submission (notifications, scoring, reports) |
| **module-chat** | Chat agent can create exams, assign questions, view attempt summaries |
