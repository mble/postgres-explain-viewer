<script lang="ts">
	import { analyzedPlan, selectedNodeId, selectNode } from '$lib/stores/plan';
	import type { AnalyzedPlanNode } from '$lib/types/explain';
	import { SELF_TIME_COLOR_THRESHOLDS } from '$lib/constants/thresholds';
	import ScrollContainer from './ScrollContainer.svelte';

	function getNodeTypeShort(nodeType: string): string {
		const shortNames: Record<string, string> = {
			'Seq Scan': 'Seq',
			'Index Scan': 'Idx',
			'Index Only Scan': 'IdxOnly',
			'Bitmap Heap Scan': 'BmpHeap',
			'Bitmap Index Scan': 'BmpIdx',
			'Hash Join': 'Hash',
			'Merge Join': 'Merge',
			'Nested Loop': 'NLoop',
			'Aggregate': 'Agg',
			'Hash Aggregate': 'HashAgg',
			'Group Aggregate': 'GrpAgg',
			'Sort': 'Sort',
			'Limit': 'Limit',
			'Materialize': 'Mat',
			'Subquery Scan': 'SubQ',
			'CTE Scan': 'CTE',
			'Function Scan': 'Func',
			'Values Scan': 'Vals'
		};
		return shortNames[nodeType] || nodeType.slice(0, 6);
	}

	function formatTime(ms: number): string {
		if (ms < 0.01) return '<0.01';
		if (ms < 1) return ms.toFixed(2);
		if (ms < 100) return ms.toFixed(1);
		return ms.toFixed(0);
	}

	function getNodes(node: AnalyzedPlanNode, depth: number = 0): Array<{ node: AnalyzedPlanNode; depth: number }> {
		const result: Array<{ node: AnalyzedPlanNode; depth: number }> = [{ node, depth }];
		if (node.Plans) {
			for (const child of node.Plans) {
				result.push(...getNodes(child, depth + 1));
			}
		}
		return result;
	}

	$: nodes = $analyzedPlan ? getNodes($analyzedPlan.root) : [];
</script>

<div class="h-full flex flex-col">
	<div class="flex-shrink-0 flex items-center justify-between mb-3 px-1">
		<h2 class="text-sm font-semibold text-[var(--text-primary)]">Plan Nodes</h2>
		<span class="text-[10px] font-medium text-[var(--text-tertiary)]">{nodes.length} nodes</span>
	</div>

	<div class="flex-1 min-h-0">
		<ScrollContainer>
			<div class="space-y-0.5 pb-1">
				{#each nodes as { node, depth }, i}
					{@const isSelected = $selectedNodeId === node.id}
					{@const pct = node.selfTimePercent}
					{@const isCritical = pct >= SELF_TIME_COLOR_THRESHOLDS.critical}
					{@const isHot = pct >= SELF_TIME_COLOR_THRESHOLDS.hot}
					{@const isWarm = pct >= SELF_TIME_COLOR_THRESHOLDS.warm}
					<button
						onclick={() => selectNode(node.id)}
						class="w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all duration-150 animate-fade-in
							{isSelected
								? 'bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-500)]/10 ring-1 ring-[var(--color-primary-400)] shadow-sm'
								: 'hover:bg-[var(--surface-tertiary)]'}"
						style="padding-left: {10 + depth * 14}px; animation-delay: {i * 20}ms"
					>
						<div class="flex items-center gap-2">
							<!-- Depth indicator -->
							{#if depth > 0}
								<span class="text-[var(--border-primary)] font-mono text-[10px] opacity-60">
									{'└'}
								</span>
							{/if}

							<!-- Node type badge -->
							<span class="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-semibold min-w-[42px] transition-all duration-150
								{isCritical
									? 'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-sm'
									: isHot
										? 'bg-gradient-to-b from-red-100 to-red-200 dark:from-red-900/60 dark:to-red-800/60 text-red-700 dark:text-red-300'
										: isWarm
											? 'bg-gradient-to-b from-amber-100 to-amber-200 dark:from-amber-900/60 dark:to-amber-800/60 text-amber-700 dark:text-amber-300'
											: 'bg-[var(--surface-tertiary)] text-[var(--text-secondary)]'}">
								{getNodeTypeShort(node['Node Type'])}
							</span>

							<!-- Relation/Index name -->
							<span class="truncate text-[var(--text-primary)] flex-1 font-medium">
								{#if node['Relation Name']}
									{node['Relation Name']}
								{:else if node['Index Name']}
									{node['Index Name']}
								{:else if node['Join Type']}
									{node['Join Type']}
								{/if}
							</span>

							<!-- Time -->
							{#if node.selfTime > 0}
								<span class="text-[10px] font-mono whitespace-nowrap font-medium
									{isHot
										? 'text-red-600 dark:text-red-400'
										: 'text-[var(--text-tertiary)]'}">
									{formatTime(node.selfTime)}ms
								</span>
							{/if}
						</div>

						<!-- Rows info on second line if present -->
						{#if node['Actual Rows'] !== undefined}
							<div class="mt-1 text-[10px] text-[var(--text-tertiary)] flex items-center gap-2"
								style="padding-left: {depth > 0 ? 22 : 0}px">
								<span class="font-mono">{node['Actual Rows'].toLocaleString()} rows</span>
								{#if node.isHot}
									<span class="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold bg-red-500 shadow-sm">!</span>
								{/if}
							</div>
						{/if}
					</button>
				{/each}
			</div>
		</ScrollContainer>
	</div>
</div>
