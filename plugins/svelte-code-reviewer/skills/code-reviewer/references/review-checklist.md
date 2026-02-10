# Bits-UI Component Review Checklist

Use this checklist when reviewing components in the Svelte 5 / bits-ui library.

## Structure Verification

### File Organization
- [ ] Component is in `src/lib/components/ui/[component-name]/`
- [ ] Component filename uses PascalCase (e.g., `Button.svelte`)
- [ ] Folder name uses kebab-case (e.g., `button/`)
- [ ] `index.ts` barrel file exists in component folder
- [ ] Component is exported in `src/lib/index.ts`

### Barrel File Pattern
```typescript
// CORRECT pattern
export { default as ComponentName } from './ComponentName.svelte';

// WRONG - named export
export { ComponentName } from './ComponentName.svelte';

// WRONG - default export
export default ComponentName;
```

---

## TypeScript Requirements

### Props Definition
- [ ] `type Props = { ... }` is explicitly defined
- [ ] All props have explicit types (no implicit `any`)
- [ ] Optional props use `?:` notation
- [ ] Default values provided in destructuring

### Type Patterns
```typescript
// CORRECT
type Variant = 'default' | 'secondary' | 'destructive';
type Size = 'sm' | 'default' | 'lg';

type Props = {
    variant?: Variant;
    size?: Size;
    class?: string;
    children?: Snippet;
    disabled?: boolean;
    ref?: HTMLElement | null;
    onClick?: (event: MouseEvent) => void;
};

// WRONG - using any
type Props = {
    data: any;
    handler: Function;
};
```

### Class Mappings
- [ ] Using `Record<Type, string>` for variant/size classes
- [ ] All union members have corresponding class entries

---

## Svelte 5 Runes

### $props()
- [ ] Using `$props()` not `export let`
- [ ] `class` renamed to `className` in destructuring
- [ ] Default values provided inline
- [ ] `...restProps` captured for pass-through

### $bindable()
- [ ] `ref` uses `$bindable(null)`
- [ ] Two-way bound props (value, checked, open) use `$bindable()`

### $state(), $derived(), $effect()
- [ ] `$state()` for local reactive state
- [ ] `$derived()` for computed values (not $: reactive statements)
- [ ] `$effect()` for side effects (not $: reactive blocks)

### Snippet
- [ ] Using `Snippet` type for children
- [ ] Using `{@render children()}` to render

---

## Styling Requirements

### cn() Usage
- [ ] All class merging uses `cn()` utility
- [ ] Classes passed in order: base, variant, size, className

### Design Tokens
- [ ] Using semantic tokens (bg-primary, text-foreground, etc.)
- [ ] No hardcoded colors (bg-blue-500, text-white, etc.)
- [ ] Dark mode compatible (tokens auto-adapt)

### Interactive States
- [ ] Hover state defined
- [ ] Focus-visible state with ring
- [ ] Disabled state with opacity and pointer-events
- [ ] Active/pressed state (optional)

### bits-ui State Styling
- [ ] Using `data-[state=...]` for primitive states

---

## Accessibility

### bits-ui Primitives
- [ ] Using appropriate bits-ui primitive for complex interactions
- [ ] Not re-implementing accessibility manually

### Screen Reader Support
- [ ] Icon-only buttons have accessible name
- [ ] Using `sr-only` class for screen reader text

### Focus Management
- [ ] Focus visible styles present
- [ ] Keyboard navigation works
- [ ] Tab order logical

---

## Performance

### Reactivity
- [ ] No unnecessary state updates
- [ ] Using `$derived()` not `$effect()` for computed values
- [ ] No object creation in template expressions

### Bundle Size
- [ ] Only importing needed primitives
- [ ] No unnecessary dependencies

---

## Example Page (if applicable)

- [ ] Example page created at `src/routes/examples/[name]/+page.svelte`
- [ ] Shows all variants
- [ ] Shows all sizes
- [ ] Shows disabled states
- [ ] Shows with icons (if applicable)
- [ ] Shows edge cases
