# Module: Flows

> **Package**: `packages/module-flows/`
> **Name**: `@oven/module-flows`
> **Dependencies**: `module-registry`, `module-roles` (for stage permissions)
> **Status**: Planned

---

## 1. Overview

Flows is a **content pipeline system** that provides a structured way to connect people across an organization around shared content. A Flow defines a sequence of **stages** that any piece of content must pass through — from initial draft all the way to final publication or delivery.

The key insight is that a Flow is not just a state machine — it is a **big-picture interface** where participants can see the entire pipeline, understand where each item sits, and take action at their stage. Items flowing through can be anything: a document, a canvas, a question, an exam, a form, a dashboard, or any visual interface built by other modules.

When a Flow completes (or reaches a specific stage), it can trigger a **Workflow** (from the existing `module-workflows`) to store, transform, or distribute the resulting content.

---

## 2. Core Concepts

### Flow
A reusable pipeline template that defines the stages, allowed transitions, and rules for how content moves through the organization.

### Stage
A named step in the pipeline (e.g., "Draft", "Review", "Approved", "Published"). Each stage defines:
- **Who** can access it (role-based, via `module-roles`)
- **What actions** are available (review, edit, comment, approve, reject, move)
- **What components/content** should be displayed (configurable per stage)
- **Entry conditions** (what must be true before an item can enter this stage)
- **Exit conditions** (what must be completed before moving to the next stage)

### Flow Item
A concrete instance of content moving through a Flow. Each item tracks its current stage, history, comments, and associated content references.

### Stage Transition
The act of moving a Flow Item from one stage to another. Every transition is recorded, creating a full audit trail with who moved it, when, and why.

---

## 3. What People Can Do at Each Stage

| Action | Description |
|--------|-------------|
| **Review** | View the item's content and metadata in read-only mode |
| **Edit** | Modify the item's content (only when the stage allows it) |
| **Comment** | Add review notes, feedback, or inline annotations |
| **Summarize** | Generate or write summaries to correlate pieces and evaluate the whole |
| **Approve / Reject** | Make a stage decision that moves the item forward or sends it back |
| **Move to Stage** | Manually transition the item to any allowed next stage |
| **Review History** | See the full timeline of transitions, edits, comments, and decisions |
| **Trigger Workflow** | At specific stages, automatically execute a workflow to process the item |

---

## 4. Content and Components

A Flow does not own content directly — it **references** content from other modules. Each stage can define which components/views to render for the referenced content:

- A **document** stage might show a rich text editor
- A **review** stage might show a read-only view with an annotation sidebar
- A **quiz review** stage might show the exam questions with scoring rubrics
- A **dashboard review** stage might embed an analytics dashboard

This makes Flows a **universal pipeline** that can orchestrate any content type in the system.

### Component Configuration per Stage

Each stage in a Flow definition can specify:
- Which **content type** it expects (form, exam, dashboard, document, custom)
- Which **view mode** to render (edit, preview, review, summary)
- Which **sidebar panels** to show (comments, history, checklist, scoring)
- Which **actions** are visible in the toolbar

---

## 5. Database Schema

### Tables

**`flows`** — Pipeline template definitions
- `id`, `name`, `slug`, `description`
- `definition` (JSONB) — stages, transitions, rules, component configs
- `version`, `enabled`, `createdAt`, `updatedAt`

**`flow_versions`** — Version history snapshots
- `id`, `flowId`, `version`, `definition`, `description`, `createdAt`

**`flow_stages`** — Denormalized stage metadata (for querying)
- `id`, `flowId`, `name`, `slug`, `order`, `stageType` (draft/review/approval/terminal)
- `allowedRoles` (JSONB — array of role IDs or slugs)
- `allowedActions` (JSONB — array of action identifiers)
- `componentConfig` (JSONB — what to render at this stage)
- `entryConditions` (JSONB), `exitConditions` (JSONB)

**`flow_items`** — Content instances moving through a flow
- `id`, `flowId`, `currentStageId`
- `contentType` (varchar) — "form", "exam", "dashboard", "document", "custom"
- `contentId` (integer) — FK to the source module's entity
- `contentSnapshot` (JSONB) — optional frozen copy for audit
- `metadata` (JSONB) — arbitrary item data
- `status` (active/completed/cancelled/paused)
- `assignedTo` (integer — current owner/reviewer)
- `createdBy`, `createdAt`, `updatedAt`

**`flow_transitions`** — Audit trail of stage changes
- `id`, `flowItemId`, `fromStageId`, `toStageId`
- `action` (approve/reject/move/auto)
- `performedBy`, `reason` (text), `metadata` (JSONB)
- `createdAt`

**`flow_comments`** — Review notes and annotations
- `id`, `flowItemId`, `stageId`, `authorId`
- `content` (text), `type` (comment/annotation/summary/decision)
- `parentId` (integer — for threaded replies)
- `resolved` (boolean)
- `createdAt`, `updatedAt`

**`flow_reviews`** — Formal review decisions
- `id`, `flowItemId`, `stageId`, `reviewerId`
- `decision` (approve/reject/request-changes)
- `summary` (text), `score` (integer — optional numeric rating)
- `createdAt`

---

## 6. API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/flows` | List and create flow templates |
| GET/PUT/DELETE | `/api/flows/[id]` | Single flow CRUD |
| GET | `/api/flows/[id]/stages` | List stages for a flow |
| GET/POST | `/api/flow-items` | List and create flow items |
| GET/PUT | `/api/flow-items/[id]` | Get or update a flow item |
| POST | `/api/flow-items/[id]/transition` | Move item to a new stage |
| GET | `/api/flow-items/[id]/history` | Full transition + comment timeline |
| GET/POST | `/api/flow-items/[id]/comments` | List and add comments |
| GET/POST | `/api/flow-items/[id]/reviews` | List and submit reviews |
| POST | `/api/flow-items/[id]/trigger-workflow` | Execute a workflow for this item |
| GET | `/api/flow-versions` | Version history for a flow template |
| POST | `/api/flow-versions/[id]/restore` | Restore a flow definition version |

---

## 7. Dashboard UI

### React Admin Resources
- **Flows** — List, Create, Edit, Show (template management)
- **Flow Items** — List with stage filters, Kanban-style board view
- **Flow Reviews** — List of pending reviews for the current user

### Custom Pages
- **Flow Board** (`/flows/[id]/board`) — Kanban view of all items across stages
- **Flow Item Detail** (`/flow-items/[id]`) — Full-page view with stage-appropriate content, comments sidebar, history timeline, and action toolbar

### Menu Section
```
──── Flows ────
Flow Templates
Flow Items
My Reviews
```

---

## 8. Workflow Integration

Flows can trigger Workflows at specific stage transitions. This is configured in the stage definition:

- **On entry**: When an item enters a stage, fire a workflow (e.g., notify reviewers)
- **On exit**: When an item leaves a stage, fire a workflow (e.g., store results)
- **On completion**: When the item reaches a terminal stage, fire a workflow (e.g., publish content, send report, archive)

The workflow receives the flow item's `contentType`, `contentId`, `metadata`, and `currentStageId` as input parameters, connecting seamlessly with the existing workflow engine.

---

## 9. Events

| Event | Payload |
|-------|---------|
| `flows.flow.created` | id, name, slug |
| `flows.flow.updated` | id, name, slug |
| `flows.item.created` | id, flowId, contentType, contentId |
| `flows.item.stage-changed` | id, flowId, fromStage, toStage, action, performedBy |
| `flows.item.completed` | id, flowId, contentType, contentId |
| `flows.item.cancelled` | id, flowId, reason |
| `flows.comment.created` | id, flowItemId, stageId, authorId, type |
| `flows.review.submitted` | id, flowItemId, reviewerId, decision |

---

## 10. Integration Points

| Module | Integration |
|--------|-------------|
| **module-roles** | Stage access control — which roles can view/act at each stage |
| **module-workflows** | Trigger workflows on stage transitions and flow completion |
| **module-forms** | Flow items can reference Forms as their content |
| **module-exams** | Flow items can reference Exams for review/approval pipelines |
| **module-analytics-forms** | Embed analytics dashboards as review content |
| **module-dashboards** | Flow items can reference dashboards |
| **module-chat** | Chat agent can create flows, move items, add comments |
