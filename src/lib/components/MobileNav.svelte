<script lang="ts">
	import { analyzedPlan } from '$lib/stores/plan';

	interface Props {
		activePanel: 'tree' | 'list' | 'details' | 'insights';
		onPanelChange: (panel: 'tree' | 'list' | 'details' | 'insights') => void;
	}

	let { activePanel, onPanelChange }: Props = $props();

	const panels = [
		{ id: 'tree' as const, label: 'Tree', icon: 'tree' },
		{ id: 'list' as const, label: 'List', icon: 'list' },
		{ id: 'details' as const, label: 'Details', icon: 'details' },
		{ id: 'insights' as const, label: 'Insights', icon: 'insights' }
	];
</script>

{#if $analyzedPlan}
	<nav class="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-[var(--surface-elevated)] border-t border-[var(--border-primary)] safe-area-pb">
		<div class="flex items-stretch h-14">
			{#each panels as panel}
				<button
					onclick={() => onPanelChange(panel.id)}
					class="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors {
						activePanel === panel.id
							? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
							: 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
					}"
					aria-current={activePanel === panel.id ? 'page' : undefined}
				>
					{#if panel.icon === 'tree'}
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
						</svg>
					{:else if panel.icon === 'list'}
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
						</svg>
					{:else if panel.icon === 'details'}
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
						</svg>
					{:else if panel.icon === 'insights'}
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
						</svg>
					{/if}
					<span class="text-[10px] font-medium">{panel.label}</span>

					{#if panel.id === 'insights' && $analyzedPlan.allSuggestions.length > 0}
						<span class="absolute top-1 right-1/4 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold bg-red-500 text-white flex items-center justify-center">
							{$analyzedPlan.allSuggestions.length}
						</span>
					{/if}
				</button>
			{/each}
		</div>
	</nav>
{/if}

<style>
	.safe-area-pb {
		padding-bottom: env(safe-area-inset-bottom, 0);
	}
</style>
