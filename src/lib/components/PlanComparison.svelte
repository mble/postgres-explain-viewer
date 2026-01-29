<script lang="ts">
	import { comparison, comparisonSummary } from '$lib/stores/comparison';
	import { diffPlans, getDiffSummary, getDeltaColorClass, formatDelta } from '$lib/utils/plan-diff';

	let jsonInputA = $state('');
	let jsonInputB = $state('');

	function handleLoadA() {
		comparison.loadPlanA(jsonInputA);
	}

	function handleLoadB() {
		comparison.loadPlanB(jsonInputB);
	}

	function handleSwap() {
		comparison.swap();
		[jsonInputA, jsonInputB] = [jsonInputB, jsonInputA];
	}

	function handleClose() {
		comparison.disable();
	}

	const diffResults = $derived(
		$comparison.planA && $comparison.planB
			? diffPlans($comparison.planA.root, $comparison.planB.root)
			: null
	);

	const diffSummary = $derived(diffResults ? getDiffSummary(diffResults) : null);

	function formatTime(ms: number): string {
		if (ms >= 1000) return (ms / 1000).toFixed(2) + 's';
		return ms.toFixed(2) + 'ms';
	}

	function formatPercent(value: number): string {
		const sign = value > 0 ? '+' : '';
		return `${sign}${value.toFixed(1)}%`;
	}
</script>

<div class="fixed inset-0 z-50 bg-[var(--surface-secondary)] overflow-hidden flex flex-col">
	<!-- Header -->
	<header class="flex-shrink-0 bg-[var(--surface-elevated)] border-b border-[var(--border-primary)] px-4 h-14 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<button
				onclick={handleClose}
				class="p-2 rounded-lg hover:bg-[var(--surface-tertiary)] text-[var(--text-secondary)]"
				aria-label="Close comparison"
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
			<h1 class="text-lg font-semibold text-[var(--text-primary)]">Compare Plans</h1>
		</div>

		{#if $comparison.planA && $comparison.planB}
			<button onclick={handleSwap} class="btn btn-secondary">
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
				</svg>
				Swap
			</button>
		{/if}
	</header>

	<!-- Main Content -->
	<main class="flex-1 min-h-0 p-4 overflow-auto">
		{#if !$comparison.planA || !$comparison.planB}
			<!-- Input Mode -->
			<div class="max-w-4xl mx-auto grid grid-cols-2 gap-4 h-full">
				<!-- Plan A Input -->
				<div class="flex flex-col">
					<div class="flex items-center justify-between mb-2">
						<h2 class="text-sm font-semibold text-[var(--text-primary)]">Plan A (Before)</h2>
						{#if $comparison.planA}
							<span class="badge badge-success">Loaded</span>
						{/if}
					</div>
					<textarea
						bind:value={jsonInputA}
						placeholder="Paste EXPLAIN (ANALYZE, FORMAT JSON) output..."
						class="input input-mono flex-1 min-h-0 resize-none"
						disabled={!!$comparison.planA}
					></textarea>
					{#if $comparison.errorA}
						<p class="text-sm text-red-500 mt-2">{$comparison.errorA}</p>
					{/if}
					{#if !$comparison.planA}
						<button onclick={handleLoadA} disabled={!jsonInputA.trim()} class="btn btn-primary mt-2">
							Load Plan A
						</button>
					{/if}
				</div>

				<!-- Plan B Input -->
				<div class="flex flex-col">
					<div class="flex items-center justify-between mb-2">
						<h2 class="text-sm font-semibold text-[var(--text-primary)]">Plan B (After)</h2>
						{#if $comparison.planB}
							<span class="badge badge-success">Loaded</span>
						{/if}
					</div>
					<textarea
						bind:value={jsonInputB}
						placeholder="Paste EXPLAIN (ANALYZE, FORMAT JSON) output..."
						class="input input-mono flex-1 min-h-0 resize-none"
						disabled={!!$comparison.planB}
					></textarea>
					{#if $comparison.errorB}
						<p class="text-sm text-red-500 mt-2">{$comparison.errorB}</p>
					{/if}
					{#if !$comparison.planB}
						<button onclick={handleLoadB} disabled={!jsonInputB.trim()} class="btn btn-primary mt-2">
							Load Plan B
						</button>
					{/if}
				</div>
			</div>
		{:else}
			<!-- Comparison View -->
			<div class="max-w-6xl mx-auto space-y-4">
				<!-- Summary -->
				{#if $comparisonSummary}
					<div class="card p-4">
						<h2 class="text-sm font-semibold text-[var(--text-primary)] mb-3">Summary</h2>
						<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
							<!-- Time Comparison -->
							<div class="stat-card">
								<div class="metric-label">Execution Time</div>
								<div class="flex items-baseline gap-2">
									<span class="text-lg font-bold text-[var(--text-primary)]">
										{formatTime($comparisonSummary.timeB)}
									</span>
									<span class="text-sm font-medium {$comparisonSummary.isImproved ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
										{formatPercent($comparisonSummary.timePercent)}
									</span>
								</div>
								<div class="text-xs text-[var(--text-tertiary)] mt-1">
									was {formatTime($comparisonSummary.timeA)}
								</div>
							</div>

							<!-- Improved Nodes -->
							<div class="stat-card">
								<div class="metric-label">Improved</div>
								<div class="text-lg font-bold text-green-600 dark:text-green-400">
									{diffSummary?.improved ?? 0}
								</div>
								<div class="text-xs text-[var(--text-tertiary)]">nodes faster</div>
							</div>

							<!-- Regressed Nodes -->
							<div class="stat-card">
								<div class="metric-label">Regressed</div>
								<div class="text-lg font-bold text-red-600 dark:text-red-400">
									{diffSummary?.regressed ?? 0}
								</div>
								<div class="text-xs text-[var(--text-tertiary)]">nodes slower</div>
							</div>

							<!-- Suggestions -->
							<div class="stat-card">
								<div class="metric-label">Suggestions</div>
								<div class="text-lg font-bold text-[var(--text-primary)]">
									{$comparisonSummary.suggestionsB}
								</div>
								<div class="text-xs text-[var(--text-tertiary)]">
									{$comparisonSummary.suggestionsDiff > 0 ? '+' : ''}{$comparisonSummary.suggestionsDiff} from before
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Node-by-node comparison -->
				{#if diffResults}
					<div class="card p-4">
						<h2 class="text-sm font-semibold text-[var(--text-primary)] mb-3">Node Comparison</h2>
						<div class="max-h-[400px] overflow-auto">
							<table class="w-full text-sm">
								<thead class="sticky top-0 bg-[var(--surface-elevated)]">
									<tr class="text-left text-[var(--text-tertiary)]">
										<th class="pb-2 font-medium">Node</th>
										<th class="pb-2 font-medium text-right">Time A</th>
										<th class="pb-2 font-medium text-right">Time B</th>
										<th class="pb-2 font-medium text-right">Change</th>
										<th class="pb-2 font-medium text-center">Status</th>
									</tr>
								</thead>
								<tbody>
									{#each diffResults as match}
										{@const node = match.nodeA ?? match.nodeB}
										{#if node && match.delta}
											<tr class="border-t border-[var(--border-secondary)]">
												<td class="py-2">
													<div class="flex items-center gap-2">
														<span style="padding-left: {(node.depth) * 12}px" class="text-[var(--text-secondary)]">
															{node.depth > 0 ? '└' : ''}
														</span>
														<span class="font-medium text-[var(--text-primary)]">
															{node['Node Type']}
														</span>
														{#if node['Relation Name']}
															<span class="text-[var(--text-tertiary)]">
																on {node['Relation Name']}
															</span>
														{/if}
													</div>
												</td>
												<td class="py-2 text-right font-mono text-[var(--text-secondary)]">
													{match.nodeA ? formatTime(match.nodeA.selfTime) : '-'}
												</td>
												<td class="py-2 text-right font-mono text-[var(--text-secondary)]">
													{match.nodeB ? formatTime(match.nodeB.selfTime) : '-'}
												</td>
												<td class="py-2 text-right font-mono {getDeltaColorClass(match.delta.status)}">
													{formatDelta(match.delta.timeDiff, 'ms')}
												</td>
												<td class="py-2 text-center">
													{#if match.delta.status === 'improved'}
														<span class="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
															<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
																<path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
															</svg>
														</span>
													{:else if match.delta.status === 'regressed'}
														<span class="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
															<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
																<path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
															</svg>
														</span>
													{:else if match.delta.status === 'new'}
														<span class="badge badge-info text-[10px]">NEW</span>
													{:else if match.delta.status === 'removed'}
														<span class="badge badge-neutral text-[10px]">REMOVED</span>
													{:else}
														<span class="text-[var(--text-tertiary)]">-</span>
													{/if}
												</td>
											</tr>
										{/if}
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</main>
</div>
