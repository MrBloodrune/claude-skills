<!--
  EXAMPLE: Button Component

  This is the canonical example of a simple stateless component with variants.
  Key patterns demonstrated:
  - bits-ui Button primitive
  - Variant and Size type unions
  - Class mapping with Record<Type, string>
  - cn() utility for class merging
  - $props() with proper destructuring
  - $bindable() for ref
  - Snippet for children
-->
<script lang="ts">
	import { Button as ButtonPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';

	// Define variant union type - all possible visual styles
	type Variant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'success' | 'warning';

	// Define size union type - all possible sizes
	type Size = 'default' | 'sm' | 'lg' | 'xl' | 'icon';

	// Props interface - explicit types for all props
	type Props = {
		variant?: Variant;
		size?: Size;
		class?: string;       // Note: 'class' is valid in type definition
		style?: string;
		children?: Snippet;   // Svelte 5 way to accept children
		disabled?: boolean;
		href?: string;        // Makes button act as anchor
		ref?: HTMLButtonElement | HTMLAnchorElement | null;
		onclick?: (e: MouseEvent) => void;
	};

	// Destructure props with defaults
	// Note: 'class' renamed to 'className' since class is reserved keyword
	let {
		variant = 'default',
		size = 'default',
		class: className = '',
		style,
		children,
		disabled = false,
		href,
		ref = $bindable(null),  // $bindable for two-way binding
		onclick,
	}: Props = $props();

	// Variant class mappings - semantic tokens only, no hardcoded colors
	const variantClasses: Record<Variant, string> = {
		default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
		destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
		outline: 'border border-border bg-background hover:bg-accent hover:text-accent-foreground shadow-sm',
		secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm',
		ghost: 'hover:bg-accent hover:text-accent-foreground',
		link: 'text-primary underline-offset-4 hover:underline',
		success: 'bg-success text-success-foreground hover:bg-success/90 shadow-sm',
		warning: 'bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm'
	};

	// Size class mappings
	const sizeClasses: Record<Size, string> = {
		default: 'h-10 px-4 py-2',
		sm: 'h-8 px-3 text-xs',
		lg: 'h-12 px-8 text-base',
		xl: 'h-14 px-10 text-lg',
		icon: 'h-10 w-10'
	};

	// Base classes - always applied, includes all interactive states
	const baseClasses = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]';
</script>

<!-- Use bits-ui primitive for proper button/anchor behavior -->
<ButtonPrimitive.Root
	bind:ref
	{disabled}
	{href}
	{onclick}
	{style}
	class={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
>
	{#if children}
		{@render children()}
	{/if}
</ButtonPrimitive.Root>
