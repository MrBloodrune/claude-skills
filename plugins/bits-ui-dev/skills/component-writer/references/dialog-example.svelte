<!--
  EXAMPLE: Dialog Content Component

  This is the canonical example of a portal-based overlay component.
  Key patterns demonstrated:
  - Portal pattern for overlay rendering
  - Complex animations with data-[state=...] classes
  - Composition (uses DialogOverlay child component)
  - Accessible close button with sr-only text
  - Size variants for dialog width
-->
<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils.js';
	import type { Snippet } from 'svelte';
	import DialogOverlay from './DialogOverlay.svelte';  // Companion component

	// Size variants for dialog width
	type Size = 'sm' | 'default' | 'lg' | 'xl' | 'full';

	type Props = {
		size?: Size;
		showClose?: boolean;  // Toggle close button visibility
		class?: string;
		children?: Snippet;
		ref?: HTMLDivElement | null;
	};

	let {
		size = 'default',
		showClose = true,
		class: className = '',
		children,
		ref = $bindable(null),
		...restProps
	}: Props = $props();

	// Size mappings for responsive dialog widths
	const sizeClasses: Record<Size, string> = {
		sm: 'max-w-sm',
		default: 'max-w-lg',
		lg: 'max-w-2xl',
		xl: 'max-w-4xl',
		full: 'max-w-[calc(100%-2rem)] h-[calc(100%-2rem)]'
	};
</script>

<!-- Portal renders content outside normal DOM hierarchy -->
<DialogPrimitive.Portal>
	<!-- Overlay component for backdrop -->
	<DialogOverlay />

	<!-- Main dialog content -->
	<DialogPrimitive.Content
		bind:ref
		class={cn(
			/* Base positioning - centered in viewport */
			'fixed left-1/2 top-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-background p-6 shadow-lg duration-200',

			/* Animation classes - enter/exit with zoom and fade */
			'data-[state=open]:animate-in data-[state=closed]:animate-out',
			'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
			'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',

			/* Slide animation for visual polish */
			'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
			'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',

			/* Responsive border radius */
			'sm:rounded-lg',

			/* Size-specific width */
			sizeClasses[size],
			className
		)}
		{...restProps}
	>
		<!-- Render children content -->
		{#if children}
			{@render children()}
		{/if}

		<!-- Optional close button - ALWAYS include sr-only for accessibility -->
		{#if showClose}
			<DialogPrimitive.Close
				class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
			>
				<!-- Icon -->
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
				<!-- CRITICAL: Screen reader text for accessibility -->
				<span class="sr-only">Close</span>
			</DialogPrimitive.Close>
		{/if}
	</DialogPrimitive.Content>
</DialogPrimitive.Portal>
