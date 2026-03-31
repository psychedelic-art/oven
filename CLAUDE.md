# OVEN Monorepo Coding Standards

This is a pnpm + Turborepo monorepo. Node.js 20+, React 19, Next.js 15.
Dashboard uses React Admin 5 + MUI 7. Portal uses Tailwind CSS + @oven/oven-ui.

<styling-rules>

<rule name="no-inline-styles">
  <description>
    Never use the style={{ }} prop on any JSX element across the entire codebase.
    Inline styles bypass the design system, are not responsive, cannot be themed,
    and create maintenance burden.
  </description>

  <applies-to>All packages and apps in the monorepo</applies-to>

  <do-not>
    - Do NOT use style={{ }} on any element
    - Do NOT use style={{ display: 'flex', gap: 8 }}
    - Do NOT use style={{ marginTop: 16 }}
    - Do NOT mix style= with sx= or className=
  </do-not>

  <do>
    - Use sx prop for MUI components (dashboard/editors)
    - Use cn() from @oven/oven-ui for Tailwind components (portal/oven-ui)
  </do>

  <incorrect>
    <div style={{ display: 'flex', gap: '8px' }}>content</div>
    <input style={{ width: 32, height: 32, border: 'none' }} />
    <Box style={{ marginTop: 16 }}>spaced</Box>
  </incorrect>

  <correct context="dashboard (MUI)">
    <Box sx={{ display: 'flex', gap: 1 }}>content</Box>
    <Box component="input" sx={{ width: 32, height: 32, border: 'none' }} />
    <Box sx={{ mt: 2 }}>spaced</Box>
  </correct>

  <correct context="portal / oven-ui (Tailwind)">
    import { cn } from '@oven/oven-ui';
    <div className={cn('flex gap-2')}>content</div>
    <input className={cn('w-8 h-8 border-0')} />
    <div className={cn('mt-4')}>spaced</div>
  </correct>

  <exception>
    The only acceptable use of style= is for truly dynamic CSS custom properties
    from runtime values (e.g., color pickers):
    style={{ '--user-color': value } as React.CSSProperties}
  </exception>
</rule>

<rule name="mui-sx-prop">
  <description>
    In dashboard admin app and editor packages that use MUI, always use the
    MUI sx prop for styling. Never use style=, className= with hand-written CSS,
    or styled().
  </description>

  <applies-to>
    - apps/dashboard/** (except portal routes)
    - packages/ui-flows-editor/**
    - packages/map-editor/**
    - packages/form-editor/**
  </applies-to>

  <do-not>
    - Do NOT use style={{ }} on MUI components
    - Do NOT use className= with custom CSS classes
    - Do NOT use styled(Component)({ ... })
    - Do NOT write raw px values for spacing (use MUI theme units)
  </do-not>

  <do>
    - Use sx prop on all MUI components
    - Use MUI shorthand spacing: p, m, px, py, mx, my, mt, mb, ml, mr
    - Use theme-aware values: bgcolor: 'background.paper', color: 'text.secondary'
    - Use responsive breakpoints: sx={{ p: { xs: 1, md: 2 } }}
    - Use pseudo-selectors: sx={{ '&:hover': { bgcolor: 'action.hover' } }}
  </do>

  <incorrect>
    <Typography style={{ fontWeight: 600 }}>Title</Typography>
    <Box className="my-custom-class">content</Box>
    const StyledBox = styled(Box)({ padding: 16 });
  </incorrect>

  <correct>
    <Typography sx={{ fontWeight: 600 }}>Title</Typography>
    <Box sx={{ p: 2, bgcolor: 'background.paper' }}>content</Box>
  </correct>
</rule>

<rule name="tailwind-cn-utility">
  <description>
    In oven-ui component library and portal app, always use the cn() utility
    from @oven/oven-ui for className composition. Never use raw string
    concatenation, template literals, or direct clsx/classnames imports.
  </description>

  <applies-to>
    - packages/oven-ui/**
    - apps/dashboard/src/app/portal/**
  </applies-to>

  <do-not>
    - Do NOT use template literals for className: className={`flex ${cond}`}
    - Do NOT use string concatenation: className={'px-4 ' + variant}
    - Do NOT import clsx or classnames directly (use cn instead)
    - Do NOT hardcode Tailwind classes without cn()
  </do-not>

  <do>
    - Import cn from @oven/oven-ui
    - Use conditional objects: cn('base', condition && 'conditional-class')
    - Always accept and merge className prop for composability
    - Define variant style maps as Record<string, string> outside the component
  </do>

  <incorrect>
    <div className={`flex ${isActive ? 'bg-blue-500' : 'bg-gray-200'}`}>
    <div className={clsx('flex', isActive && 'bg-blue-500')}>
    <button className={'px-4 py-2 ' + variant}>Click</button>
  </incorrect>

  <correct>
    import { cn } from '@oven/oven-ui';

    <div className={cn('flex', isActive && 'bg-blue-500', !isActive && 'bg-gray-200')}>
    <button className={cn('px-4 py-2', variantStyles[variant], className)}>Click</button>
  </correct>
</rule>

</styling-rules>

<general-rules>

<rule name="zustand-store-pattern">
  <description>
    When a zustand store needs to be parameterized (adapter, initial state from props),
    use a factory function + React context provider. Singleton stores are only for
    truly global state with no per-instance variation.
  </description>

  <do-not>
    - Do NOT store adapter/callbacks in zustand state (use closure capture)
    - Do NOT use a singleton store when the store needs per-instance config
  </do-not>

  <do>
    - Use createStore from zustand/vanilla for context-based stores
    - Create store via factory function that captures adapter by closure
    - Provide store via React context + useRef for stable identity
    - Export a typed useMyStore(selector) hook that reads from context
  </do>

  <correct>
    // store factory: createMyStore(adapter) returns StoreApi
    // provider: useRef to create once, context.Provider
    // hook: useMyStore(s => s.field) for fine-grained subscriptions
  </correct>
</rule>

<rule name="type-imports">
  <description>
    Always use import type for type-only imports. This ensures proper tree-shaking
    and makes the intent clear.
  </description>

  <do-not>
    - Do NOT use value imports for type-only usage
  </do-not>

  <do>
    - Use import type { Foo } from '...' for type-only imports
    - Use inline type: import { createStore, type StoreApi } from '...'
  </do>

  <incorrect>
    import { UiFlowDefinition } from '@oven/module-ui-flows/types';
  </incorrect>

  <correct>
    import type { UiFlowDefinition } from '@oven/module-ui-flows/types';
  </correct>
</rule>

</general-rules>
