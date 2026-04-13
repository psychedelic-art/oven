# Dashboard UX Audit -- Playgrounds

> Generated: 2026-04-13 (cycle-30 session)
> Total playground files: 4 primary surfaces + 3 supporting files

## Primary playground surfaces (DRIFT-3)

| File | Lines | Layout | State model | Uses UnifiedAIPlayground | Dead code | style= | Sprint |
|------|-------|--------|-------------|--------------------------|-----------|--------|--------|
| `ai/AIPlayground.tsx` | 1,870 | Multi-tab horizontal (6 tabs: Text, Vision, Embeddings, Image, Audio, Structured Output) + collapsible history sidebar | Local useState + custom hooks (`useSessionState`, `useAliasesAndProviders`, `useDynamicParams`, `useHistory`) | No | ~2-3% (minor useCallback overhead) | 0 (sx only) | sprint-05 |
| `knowledge-base/KBPlayground.tsx` | 781 | 3-panel (left: tenant/KB selector, center: 3 tabs [Search, Entries, Stats], right: search history) | Local useState + useCallback/useEffect | No | 0% | 0 (sx only) | sprint-05 |
| `agents/AgentPlaygroundPanel.tsx` | 145 | Collapsible card (expand/collapse, messages, input) | Local useState (expanded, input, messages, loading, error, lastExecution) | No | ~2% (lastExecution stored but not displayed) | 0 (sx only) | sprint-05 |
| `workflow-agents/AIPlaygroundPage.tsx` | 43 | Simple shell wrapper (header bar + flex container) | Minimal (useNavigate only) | **Yes** (imports from `@oven/agent-ui`) | 0% | 0 (sx only) | -- (reference) |

## Supporting playground files

| File | Lines | Notes |
|------|-------|-------|
| `ai/PlaygroundErrorBoundary.tsx` | 60 | Class component error boundary with retry button |
| `ai/PlaygroundExecutionList.tsx` | 89 | React Admin List for execution records |
| `ai/PlaygroundExecutionShow.tsx` | 137 | React Admin Show for execution detail |

## Key findings

1. **Only 1 of 4 playground surfaces uses `UnifiedAIPlayground`** --
   `workflow-agents/AIPlaygroundPage.tsx` is the reference implementation.
   The other 3 (AI, KB, Agent) are independent, duplicating layout/state code.

2. **Total duplicated code**: ~2,796 lines across 3 surfaces that should
   wrap `UnifiedAIPlayground` instead.

3. **No `style={}` violations** -- all playground files use MUI `sx`
   correctly.

4. **State management inconsistency**:
   - AIPlayground: custom `useSessionState` hook for session persistence
   - KBPlayground: raw useState for everything
   - AgentPlaygroundPanel: raw useState, no persistence
   - All should use the zustand factory + context pattern from CLAUDE.md.

5. **Sprint-05 target**: wrap AI/KB/Agent in `UnifiedAIPlayground` shell,
   migrate to thin MUI wrappers, remove dead code paths.
