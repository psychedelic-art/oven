# Agent-UI Inventory

> Frozen at dev HEAD `8e25df9` (2026-04-12, post cycle-17).
> Re-run before sprint-01 to catch any drift.

## File inventory

| # | File | Type | Exports | Documented in |
|---|------|------|---------|---------------|
| 1 | `src/index.ts` | barrel | All public APIs | architecture.md |
| 2 | `src/types.ts` | types | UIMessage, TenantPublicConfig, BusinessSchedule, all prop types | architecture.md, api.md |
| 3 | `src/entry/widget.ts` | entry | init(), destroy(), OvenChatConfig, OvenChatAPI | architecture.md, Readme.md |
| 4 | `src/hooks/useChat.ts` | hook | useChat() | architecture.md |
| 5 | `src/hooks/useTenantConfig.ts` | hook | useTenantConfig() | architecture.md |
| 6 | `src/hooks/useBusinessHours.ts` | hook | useBusinessHours() | architecture.md |
| 7 | `src/hooks/useAnonymousSession.ts` | hook | useAnonymousSession() | architecture.md |
| 8 | `src/hooks/useSessionPersistence.ts` | hook | useSessionPersistence() | architecture.md |
| 9 | `src/hooks/useChatScroll.ts` | hook | useChatScroll() | architecture.md |
| 10 | `src/hooks/useCommandPalette.ts` | hook | useCommandPalette() | architecture.md |
| 11 | `src/hooks/useDualStateMessages.ts` | hook | useDualStateMessages() | MISSING |
| 12 | `src/hooks/usePlaygroundCommands.ts` | hook | usePlaygroundCommands(), WORKFLOW_BLOCKED_COMMANDS | architecture.md |
| 13 | `src/shared/StreamingText.tsx` | component | StreamingText | UI.md |
| 14 | `src/shared/TypingIndicator.tsx` | component | TypingIndicator | UI.md |
| 15 | `src/shared/ChatErrorCard.tsx` | component | ChatErrorCard | UI.md |
| 16 | `src/shared/ToolCallCard.tsx` | component | ToolCallCard | UI.md |
| 17 | `src/shared/MessageFeedback.tsx` | component | MessageFeedback | UI.md |
| 18 | `src/shared/MessageBubble.tsx` | component | MessageBubble | UI.md |
| 19 | `src/shared/CommandPalette.tsx` | component | CommandPalette | UI.md |
| 20 | `src/shared/MessageInput.tsx` | component | MessageInput | UI.md |
| 21 | `src/shared/MessageList.tsx` | component | MessageList | UI.md |
| 22 | `src/shared/SessionSidebar.tsx` | component | SessionSidebar | UI.md |
| 23 | `src/shared/ConversationView.tsx` | component | ConversationView | UI.md |
| 24 | `src/shared/ChatHeader.tsx` | component | ChatHeader, ChatHeaderProps | UI.md |
| 25 | `src/shared/filterMessagesForDisplay.ts` | utility | filterMessagesForDisplay() | MISSING (undocumented utility) |
| 26 | `src/widget/ChatWidget.tsx` | component | ChatWidget | UI.md |
| 27 | `src/widget/WidgetLauncher.tsx` | component | WidgetLauncher | UI.md |
| 28 | `src/widget/WelcomeScreen.tsx` | component | WelcomeScreen | UI.md |
| 29 | `src/widget/EscalationBanner.tsx` | component | EscalationBanner | UI.md |
| 30 | `src/playground/UnifiedAIPlayground.tsx` | component | UnifiedAIPlayground | UI.md |
| 31 | `src/playground/AgentPlayground.tsx` | component | AgentPlayground | MISSING (legacy, superseded) |
| 32 | `src/playground/TargetSelector.tsx` | component | TargetSelector, PlaygroundTarget, PlaygroundMode | UI.md |
| 33 | `src/playground/ParamsPanel.tsx` | component | ParamsPanel | UI.md |
| 34 | `src/playground/RuntimeConfigPanel.tsx` | component | RuntimeConfigPanel | MISSING (undocumented panel) |
| 35 | `src/playground/panels/ExecutionInspector.tsx` | component | ExecutionInspector | UI.md |
| 36 | `src/playground/panels/EvalReportPanel.tsx` | component | EvalReportPanel | MISSING (undocumented panel) |
| 37 | `src/playground/panels/TracePanel.tsx` | component | TracePanel | UI.md |
| 38 | `src/layout/LayoutManager.tsx` | component | LayoutManager, LayoutMode | UI.md |
| 39 | `src/themes/presets.ts` | constants | themePresets (10), ThemeVariables, ThemePresetName | UI.md |
| 40 | `src/themes/applyTheme.ts` | utility | applyTheme(), applyThemeWithOverrides(), getResolvedTheme(), clearTheme() | UI.md |

### Test files (9)

| # | File | Tests |
|---|------|-------|
| T1 | `src/__tests__/ChatHeader.test.tsx` | 7 |
| T2 | `src/__tests__/UnifiedAIPlayground.test.tsx` | 4 |
| T3 | `src/__tests__/filterMessagesForDisplay.test.ts` | 10 |
| T4 | `src/__tests__/themes.test.ts` | 10 |
| T5 | `src/__tests__/useBusinessHours.test.ts` | 5 |
| T6 | `src/__tests__/useChat.appendMessage.test.ts` | 3 |
| T7 | `src/__tests__/useCommandPalette.test.ts` | 6 |
| T8 | `src/__tests__/usePlaygroundCommands.test.ts` | 15 |
| T9 | `src/__tests__/useSessionPersistence.test.ts` | 7 |
| | **Total** | **67** |

## Requirement-ID map

| R-ID | Description | Code location | Status |
|------|-------------|---------------|--------|
| R1.1 | No @mui/*, react-router-dom imports | Package-wide | SATISFIED (verified by test) |
| R1.2 | cn() for className composition | All components | SATISFIED |
| R1.3 | No inline style={} except CSS vars | All components | NEEDS AUDIT |
| R1.4 | import type for type-only imports | Package-wide | SATISFIED |
| R1.5 | zustand factory + context pattern | No zustand stores found | N/A (no zustand in this package) |
| R2.1 | 3-panel layout | `playground/UnifiedAIPlayground.tsx` | SATISFIED |
| R2.2 | Agent mode SSE streaming | `hooks/useChat.ts` | SATISFIED |
| R2.3 | Workflow mode POST execute | `hooks/usePlaygroundCommands.ts` | SATISFIED |
| R2.4 | Mode switch preserves messages | `playground/UnifiedAIPlayground.tsx` | NEEDS VERIFY |
| R2.5 | Local slash commands | `hooks/usePlaygroundCommands.ts` | SATISFIED (tested) |
| R2.6 | Workflow blocks commands | `hooks/usePlaygroundCommands.ts` | SATISFIED (WORKFLOW_BLOCKED_COMMANDS) |
| R2.7 | Unknown commands forward | `hooks/usePlaygroundCommands.ts` | NEEDS VERIFY |
| R3.1 | Welcome message business-hours | `widget/WelcomeScreen.tsx` + `hooks/useBusinessHours.ts` | SATISFIED |
| R3.2 | Scheduling button visibility | `widget/WelcomeScreen.tsx` | NEEDS VERIFY |
| R3.3 | Escalation replaces input | `widget/ChatWidget.tsx` + `widget/EscalationBanner.tsx` | SATISFIED |
| R3.4 | Anonymous session persistence | `hooks/useAnonymousSession.ts` | SATISFIED |
| R3.5 | Mobile full-screen overlay | `layout/LayoutManager.tsx` | NEEDS VERIFY |
| R3.6 | External embed scoped styles | `entry/widget.ts` | NEEDS VERIFY |
| R4.1 | Session restore with backoff | `hooks/useSessionPersistence.ts` | SATISFIED (tested) |
| R4.2 | Expired session discard | `hooks/useSessionPersistence.ts` | SATISFIED (tested) |
| R4.3 | localStorage fallback | `hooks/useSessionPersistence.ts` | SATISFIED (tested) |
| R4.4 | No PII to localStorage | `hooks/useSessionPersistence.ts` | NEEDS AUDIT |
| R5.1 | applyTheme() CSS vars | `themes/applyTheme.ts` | SATISFIED (tested) |
| R5.2 | Per-tenant brand overrides | `themes/applyTheme.ts` | SATISFIED |
| R5.3 | theme="auto" dark mode | `themes/applyTheme.ts` | NEEDS VERIFY |
| R5.4 | 10 presets | `themes/presets.ts` | SATISFIED (tested: 10 presets) |
| R6.1 | Markdown rendering | `shared/MessageBubble.tsx` | SATISFIED |
| R6.2 | Tool call expandable card | `shared/ToolCallCard.tsx` | SATISFIED |
| R6.3 | Role-based styling | `shared/MessageBubble.tsx` | SATISFIED |
| R6.4 | Feedback POST optimistic | `shared/MessageFeedback.tsx` | NEEDS VERIFY |
| R6.5 | filterMessagesForDisplay | `shared/filterMessagesForDisplay.ts` | SATISFIED (tested) |
| R7.1 | Auto-growing textarea 1-6 | `shared/MessageInput.tsx` | SATISFIED |
| R7.2 | Shift+Enter / Enter | `shared/MessageInput.tsx` | SATISFIED |
| R7.3 | Character counter at 80% | `shared/MessageInput.tsx` | NEEDS VERIFY |
| R7.4 | / opens palette | `shared/MessageInput.tsx` + `shared/CommandPalette.tsx` | SATISFIED (tested) |
| R7.5 | Input disabled during states | `shared/MessageInput.tsx` | NEEDS VERIFY |
| R8.1 | Layout modes | `layout/LayoutManager.tsx` | SATISFIED |
| R8.2 | Resizable panels min width | `layout/LayoutManager.tsx` | NEEDS VERIFY |
| R8.3 | Panel size persistence | `layout/LayoutManager.tsx` | NEEDS VERIFY |
| R8.4 | Breakpoint behaviour | `layout/LayoutManager.tsx` | NEEDS VERIFY |
| R9.1 | widget.ts single entry | `entry/widget.ts` | SATISFIED |
| R9.2 | Bundle without React | `entry/widget.ts` | NEEDS VERIFY (build config) |
| R9.3 | Scoped widget styles | `entry/widget.ts` | NEEDS VERIFY |
| R9.4 | apiBaseUrl + X-Session-Token | `hooks/useAnonymousSession.ts` | SATISFIED |
| R10.1 | Hook tests | 6 of 9 hooks tested | PARTIAL (useTenantConfig, useChatScroll, useDualStateMessages missing) |
| R10.2 | Component tests | ChatHeader, UnifiedAIPlayground, filterMessagesForDisplay | SATISFIED |
| R10.3 | Slash command test updates | `usePlaygroundCommands.test.ts` | SATISFIED |
| R11.1 | Accessible names | All components | NEEDS AUDIT (sprint-04) |
| R11.2 | Keyboard navigation | All components | NEEDS AUDIT (sprint-04) |
| R11.3 | Live region streaming | `shared/MessageList.tsx` | NEEDS VERIFY (sprint-04) |
| R11.4 | WCAG AA contrast | `themes/presets.ts` | NEEDS AUDIT (sprint-04) |

## Drift summary (prioritised)

1. **MISSING docs**: `useDualStateMessages` hook, `filterMessagesForDisplay` utility, `AgentPlayground` (legacy), `RuntimeConfigPanel`, `EvalReportPanel` -- add to architecture.md or UI.md
2. **MISSING tests**: `useTenantConfig`, `useChatScroll`, `useDualStateMessages` hooks have no test files (R10.1 partial)
3. **NEEDS AUDIT**: R1.3 (inline style scan), R4.4 (PII audit), R11.1-R11.4 (accessibility) -- sprint-04
4. **NEEDS VERIFY**: 13 requirements marked NEEDS VERIFY -- runtime verification required (sprint-01)
5. **Legacy component**: `AgentPlayground.tsx` is superseded by `UnifiedAIPlayground.tsx` -- consider removal in sprint-02

### Sprint targets for NOT YET / drift items

| Item | Target Sprint |
|------|---------------|
| Document useDualStateMessages, filterMessagesForDisplay, RuntimeConfigPanel, EvalReportPanel | sprint-01 |
| Add tests for useTenantConfig, useChatScroll, useDualStateMessages | sprint-01 |
| Runtime verify 13 NEEDS VERIFY items | sprint-01 |
| Inline style audit (R1.3) | sprint-02 |
| PII localStorage audit (R4.4) | sprint-02 |
| Remove legacy AgentPlayground | sprint-02 |
| Accessibility audit (R11.1-R11.4) | sprint-04 |
