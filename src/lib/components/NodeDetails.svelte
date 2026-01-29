<script lang="ts">
	import { selectedNode } from '$lib/stores/plan';
	import { getNodeLabel } from '$lib/utils/tree-transform';
	import type { AnalyzedPlanNode, HotReason } from '$lib/types/explain';
	import ScrollContainer from './ScrollContainer.svelte';

	const hotReasonLabels: Record<HotReason, string> = {
		'high-self-time': 'High execution time',
		'estimation-error': 'Row estimation error',
		'disk-sort': 'Sort spilling to disk',
		'seq-scan-large': 'Sequential scan on large table',
		'high-filter-removal': 'High filter overhead'
	};

	const importantProps = [
		'Node Type',
		'Relation Name',
		'Index Name',
		'Join Type',
		'Filter',
		'Index Cond',
		'Hash Cond',
		'Sort Key',
		'Group Key'
	];

	const metricsProps = [
		{ key: 'Actual Rows', label: 'Actual Rows' },
		{ key: 'Plan Rows', label: 'Estimated Rows' },
		{ key: 'Actual Total Time', label: 'Total Time (ms)' },
		{ key: 'Actual Loops', label: 'Loops' },
		{ key: 'Rows Removed by Filter', label: 'Rows Filtered' },
		{ key: 'Sort Method', label: 'Sort Method' },
		{ key: 'Sort Space Used', label: 'Sort Space (KB)' },
		{ key: 'Sort Space Type', label: 'Sort Space Type' },
		{ key: 'Peak Memory Usage', label: 'Peak Memory (KB)' }
	];

	const bufferProps = [
		{ key: 'Shared Hit Blocks', label: 'Shared Hit' },
		{ key: 'Shared Read Blocks', label: 'Shared Read' },
		{ key: 'Shared Dirtied Blocks', label: 'Shared Dirtied' },
		{ key: 'Shared Written Blocks', label: 'Shared Written' },
		{ key: 'Temp Read Blocks', label: 'Temp Read' },
		{ key: 'Temp Written Blocks', label: 'Temp Written' },
		{ key: 'I/O Read Time', label: 'I/O Read Time (ms)' },
		{ key: 'I/O Write Time', label: 'I/O Write Time (ms)' }
	];

	const walProps = [
		{ key: 'WAL Records', label: 'WAL Records' },
		{ key: 'WAL FPI', label: 'WAL FPI' },
		{ key: 'WAL Bytes', label: 'WAL Bytes' }
	];

	function hasBufferData(node: typeof $selectedNode): boolean {
		if (!node) return false;
		return bufferProps.some(prop => node[prop.key] !== undefined && node[prop.key] !== 0);
	}

	function hasWalData(node: typeof $selectedNode): boolean {
		if (!node) return false;
		return walProps.some(prop => node[prop.key] !== undefined && node[prop.key] !== 0);
	}

	function formatValue(value: unknown): string {
		if (Array.isArray(value)) return value.join(', ');
		if (typeof value === 'number') return value.toLocaleString();
		if (typeof value === 'boolean') return value ? 'Yes' : 'No';
		return String(value);
	}
</script>

<div class="h-full flex flex-col">
	<div class="flex-shrink-0 flex items-center justify-between mb-3">
		<h2 class="text-sm font-semibold text-[var(--text-primary)]">Node Details</h2>
	</div>

	{#if $selectedNode}
		<div class="flex-1 min-h-0">
			<ScrollContainer>
				<div class="space-y-3 pb-1 animate-fade-in">
					<!-- Node Header -->
					<div class="stat-card !p-3">
						<h3 class="font-semibold text-[var(--text-primary)] text-sm">{getNodeLabel($selectedNode)}</h3>
						<div class="mt-2 flex flex-wrap gap-1.5">
							<span class="badge badge-info">
								{$selectedNode.selfTimePercent.toFixed(1)}% of query
							</span>
							{#if $selectedNode.selfTime > 0}
								<span class="badge badge-neutral">
									{$selectedNode.selfTime.toFixed(2)}ms self-time
								</span>
							{/if}
						</div>
					</div>

					<!-- Hot Warnings -->
					{#if $selectedNode.isHot}
						<div class="alert alert-danger">
							<div class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold bg-red-500 shadow-sm">!</div>
							<div class="alert-content">
								<p class="alert-title">Performance Issues</p>
								<ul class="mt-1 space-y-1">
									{#each $selectedNode.hotReasons as reason}
										<li class="alert-description flex items-center gap-1.5">
											<svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
												<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
											</svg>
											{hotReasonLabels[reason]}
										</li>
									{/each}
								</ul>
							</div>
						</div>
					{/if}

					<!-- Suggestions -->
					{#if $selectedNode.suggestions.length > 0}
						<div class="space-y-2">
							<h4 class="metric-label px-1">Suggestions</h4>
							{#each $selectedNode.suggestions as suggestion}
								<div class="alert {
									suggestion.severity === 'critical' ? 'alert-danger' :
									suggestion.severity === 'warning' ? 'alert-warning' : 'alert-info'
								}">
									<div class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm {
										suggestion.severity === 'critical' ? 'bg-red-500' :
										suggestion.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
									}">!</div>
									<div class="alert-content">
										<p class="alert-title">{suggestion.title}</p>
										<p class="alert-description">{suggestion.description}</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}

					<!-- Estimation Factor -->
					{#if $selectedNode.estimationFactor !== null}
						<div class="stat-card">
							<h4 class="metric-label mb-2">Row Estimation</h4>
							<p class="text-xs text-[var(--text-secondary)]">
								{#if $selectedNode.estimationFactor > 1}
									Actual rows were <strong class="text-amber-600 dark:text-amber-400">{$selectedNode.estimationFactor.toFixed(1)}x more</strong> than estimated
								{:else if $selectedNode.estimationFactor < 1}
									Actual rows were <strong class="text-amber-600 dark:text-amber-400">{(1 / $selectedNode.estimationFactor).toFixed(1)}x fewer</strong> than estimated
								{:else}
									<span class="text-emerald-600 dark:text-emerald-400">Estimation was accurate</span>
								{/if}
							</p>
						</div>
					{/if}

					<!-- Metrics -->
					<div class="stat-card">
						<h4 class="metric-label mb-2">Metrics</h4>
						<dl class="grid grid-cols-2 gap-x-3 gap-y-2">
							{#each metricsProps as prop}
								{#if $selectedNode[prop.key] !== undefined}
									<div class="metric">
										<dt class="metric-label">{prop.label}</dt>
										<dd class="metric-value">{formatValue($selectedNode[prop.key])}</dd>
									</div>
								{/if}
							{/each}
						</dl>
					</div>

					<!-- Buffer Stats -->
					{#if hasBufferData($selectedNode)}
						<div class="stat-card">
							<h4 class="metric-label mb-2">Buffers / I/O</h4>
							<dl class="grid grid-cols-2 gap-x-3 gap-y-2">
								{#each bufferProps as prop}
									{#if $selectedNode[prop.key] !== undefined && $selectedNode[prop.key] !== 0}
										<div class="metric">
											<dt class="metric-label">{prop.label}</dt>
											<dd class="metric-value">{formatValue($selectedNode[prop.key])}</dd>
										</div>
									{/if}
								{/each}
							</dl>
						</div>
					{/if}

					<!-- WAL Stats -->
					{#if hasWalData($selectedNode)}
						<div class="stat-card">
							<h4 class="metric-label mb-2">WAL</h4>
							<dl class="grid grid-cols-2 gap-x-3 gap-y-2">
								{#each walProps as prop}
									{#if $selectedNode[prop.key] !== undefined && $selectedNode[prop.key] !== 0}
										<div class="metric">
											<dt class="metric-label">{prop.label}</dt>
											<dd class="metric-value">{formatValue($selectedNode[prop.key])}</dd>
										</div>
									{/if}
								{/each}
							</dl>
						</div>
					{/if}

					<!-- Other Properties -->
					<div class="stat-card">
						<h4 class="metric-label mb-2">Properties</h4>
						<dl class="space-y-2">
							{#each importantProps as prop}
								{#if $selectedNode[prop] !== undefined}
									<div>
										<dt class="metric-label">{prop}</dt>
										<dd class="text-xs font-mono text-[var(--text-primary)] break-all mt-0.5">{formatValue($selectedNode[prop])}</dd>
									</div>
								{/if}
							{/each}
						</dl>
					</div>
				</div>
			</ScrollContainer>
		</div>
	{:else}
		<div class="empty-state flex-1">
			<svg class="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
			</svg>
			<p class="empty-state-title">No node selected</p>
			<p class="empty-state-description">Click a node in the tree to view details</p>
		</div>
	{/if}
</div>
