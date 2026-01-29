<script lang="ts">
	import { onMount } from 'svelte';
	import { onboarding, currentStep, progress, type OnboardingStep } from '$lib/stores/onboarding';
	import { analyzedPlan } from '$lib/stores/plan';

	let targetRect: DOMRect | null = $state(null);
	let tooltipRef: HTMLDivElement | null = $state(null);

	function getTargetElement(selector: string): Element | null {
		return document.querySelector(selector);
	}

	function updateTargetRect(step: OnboardingStep | null) {
		if (!step) {
			targetRect = null;
			return;
		}

		const target = getTargetElement(step.targetSelector);
		if (target) {
			targetRect = target.getBoundingClientRect();
		} else {
			targetRect = null;
		}
	}

	function getTooltipStyle(step: OnboardingStep | null, rect: DOMRect | null): string {
		if (!step || !rect) return 'display: none';

		const padding = 16;
		const tooltipWidth = 280;
		const tooltipHeight = 150;

		let top = 0;
		let left = 0;

		switch (step.position) {
			case 'top':
				top = rect.top - tooltipHeight - padding;
				left = rect.left + rect.width / 2 - tooltipWidth / 2;
				break;
			case 'bottom':
				top = rect.bottom + padding;
				left = rect.left + rect.width / 2 - tooltipWidth / 2;
				break;
			case 'left':
				top = rect.top + rect.height / 2 - tooltipHeight / 2;
				left = rect.left - tooltipWidth - padding;
				break;
			case 'right':
				top = rect.top + rect.height / 2 - tooltipHeight / 2;
				left = rect.right + padding;
				break;
		}

		// Keep tooltip in viewport
		left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
		top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));

		return `top: ${top}px; left: ${left}px; width: ${tooltipWidth}px;`;
	}

	function handleNext() {
		onboarding.next();
	}

	function handleSkip() {
		onboarding.complete();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!$currentStep) return;

		if (e.key === 'Escape') {
			handleSkip();
		} else if (e.key === 'Enter' || e.key === ' ') {
			handleNext();
		}
	}

	// Update target rect when step changes
	$effect(() => {
		updateTargetRect($currentStep);
	});

	// Re-calculate on resize
	onMount(() => {
		const handleResize = () => updateTargetRect($currentStep);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});

	// Skip to plan-loaded steps when plan is loaded
	$effect(() => {
		if ($analyzedPlan && $currentStep?.showAfterPlanLoad === false) {
			onboarding.skipToStep('hot-nodes');
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if $currentStep && targetRect}
	<!-- Backdrop with spotlight cutout -->
	<div class="fixed inset-0 z-40 pointer-events-none">
		<svg class="w-full h-full" aria-hidden="true">
			<defs>
				<mask id="spotlight-mask">
					<rect width="100%" height="100%" fill="white" />
					<rect
						x={targetRect.left - 8}
						y={targetRect.top - 8}
						width={targetRect.width + 16}
						height={targetRect.height + 16}
						rx="12"
						fill="black"
					/>
				</mask>
			</defs>
			<rect
				width="100%"
				height="100%"
				fill="rgba(0, 0, 0, 0.5)"
				mask="url(#spotlight-mask)"
			/>
		</svg>
		<!-- Invisible button overlay for backdrop click - handles a11y properly -->
		<button
			class="absolute inset-0 w-full h-full pointer-events-auto cursor-default"
			onclick={handleSkip}
			aria-label="Skip onboarding tour"
			style="background: transparent; border: none;"
		></button>
	</div>

	<!-- Spotlight ring -->
	<div
		class="fixed z-40 pointer-events-none rounded-xl ring-4 ring-blue-500 ring-opacity-80 animate-pulse-subtle"
		style="
			top: {targetRect.top - 8}px;
			left: {targetRect.left - 8}px;
			width: {targetRect.width + 16}px;
			height: {targetRect.height + 16}px;
		"
	></div>

	<!-- Tooltip -->
	<div
		bind:this={tooltipRef}
		class="fixed z-50 p-4 bg-[var(--surface-elevated)] rounded-xl shadow-xl border border-[var(--border-primary)] animate-scale-in"
		style={getTooltipStyle($currentStep, targetRect)}
	>
		<!-- Progress indicator -->
		<div class="flex items-center justify-between mb-3">
			<div class="flex gap-1">
				{#each Array($progress.total) as _, i}
					<div
						class="w-2 h-2 rounded-full transition-colors {i < $progress.current ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}"
					></div>
				{/each}
			</div>
			<span class="text-xs text-[var(--text-tertiary)]">
				{$progress.current} of {$progress.total}
			</span>
		</div>

		<!-- Content -->
		<h3 class="text-base font-semibold text-[var(--text-primary)] mb-1">
			{$currentStep.title}
		</h3>
		<p class="text-sm text-[var(--text-secondary)] mb-4">
			{$currentStep.description}
		</p>

		<!-- Actions -->
		<div class="flex items-center justify-between">
			<button
				onclick={handleSkip}
				class="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
			>
				Skip tour
			</button>
			<button
				onclick={handleNext}
				class="btn btn-primary text-sm py-1.5 px-4"
			>
				{$progress.current === $progress.total ? 'Done' : 'Next'}
			</button>
		</div>
	</div>
{/if}
