<script lang="ts">
	import { suggestionsByCategory, selectNode } from '$lib/stores/plan';
	import type { SuggestionCategory } from '$lib/types/explain';
	import ScrollContainer from './ScrollContainer.svelte';

	const categoryLabels: Record<SuggestionCategory, string> = {
		indexing: 'Indexing',
		statistics: 'Statistics',
		'join-strategy': 'Join Strategy',
		memory: 'Memory',
		filtering: 'Filtering'
	};

	const categoryIcons: Record<SuggestionCategory, string> = {
		indexing: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
		statistics: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
		'join-strategy': 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
		memory: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
		filtering: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z'
	};

	function handleSuggestionClick(nodeId: string) {
		selectNode(nodeId);
	}
</script>

<div class="h-full flex flex-col">
	<div class="flex-shrink-0 flex items-center justify-between mb-3">
		<h2 class="text-sm font-semibold text-[var(--text-primary)]">All Insights</h2>
	</div>

	{#if Object.keys($suggestionsByCategory).length > 0}
		<div class="flex-1 min-h-0">
			<ScrollContainer>
				<div class="space-y-4 pb-1">
					{#each Object.entries($suggestionsByCategory) as [category, suggestions], catIndex}
						<div class="animate-slide-up" style="animation-delay: {catIndex * 50}ms">
							<h3 class="flex items-center gap-2 mb-2 px-1">
								<span class="w-6 h-6 rounded-md bg-[var(--surface-tertiary)] flex items-center justify-center">
									<svg class="w-3.5 h-3.5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d={categoryIcons[category as SuggestionCategory]} />
									</svg>
								</span>
								<span class="text-xs font-semibold text-[var(--text-primary)]">
									{categoryLabels[category as SuggestionCategory]}
								</span>
								<span class="badge badge-neutral text-[9px] px-1.5 py-0">{suggestions.length}</span>
							</h3>
							<div class="space-y-2">
								{#each suggestions as suggestion, i}
									<button
										onclick={() => handleSuggestionClick(suggestion.nodeId)}
										class="w-full text-left alert card-interactive animate-fade-in {
											suggestion.severity === 'critical' ? 'alert-danger' :
											suggestion.severity === 'warning' ? 'alert-warning' : 'alert-info'
										}"
										style="animation-delay: {catIndex * 50 + i * 30}ms"
									>
										<div class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm {
											suggestion.severity === 'critical' ? 'bg-red-500' :
											suggestion.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
										}">!</div>
										<div class="alert-content">
											<p class="alert-title">{suggestion.title}</p>
											<p class="alert-description">{suggestion.description}</p>
										</div>
										<svg class="w-4 h-4 flex-shrink-0 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
										</svg>
									</button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</ScrollContainer>
		</div>
	{:else}
		<div class="empty-state flex-1">
			<div class="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center mb-3 shadow-lg">
				<svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
			</div>
			<p class="empty-state-title text-emerald-600 dark:text-emerald-400">Looking good!</p>
			<p class="empty-state-description">No issues found - your query plan is optimized</p>
		</div>
	{/if}
</div>
