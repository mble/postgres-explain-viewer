import { writable, derived } from 'svelte/store';
import type { AnalyzedPlan, AnalyzedPlanNode, Suggestion } from '$lib/types/explain';
import { parseExplainJson } from '$lib/utils/parser';
import { analyzePlan } from '$lib/utils/analyzer';
import { resetSuggestionCounter } from '$lib/utils/suggestions';

export const rawJson = writable<string>('');
export const sqlQuery = writable<string>('');
export const analyzedPlan = writable<AnalyzedPlan | null>(null);
export const selectedNodeId = writable<string | null>(null);
export const parseError = writable<string | null>(null);

export const selectedNode = derived(
	[analyzedPlan, selectedNodeId],
	([$plan, $nodeId]) => {
		if (!$plan || !$nodeId) return null;
		// O(1) lookup via pre-built index instead of O(N) DFS traversal
		// ISOMORPHISM PROOF: nodeIndex contains all nodes keyed by their unique ID.
		// Map.get() returns the same object reference as findNodeById() would.
		return $plan.nodeIndex.get($nodeId) ?? null;
	}
);

export const allSuggestions = derived(analyzedPlan, ($plan) => {
	if (!$plan) return [];
	return $plan.allSuggestions;
});

export const suggestionsByCategory = derived(allSuggestions, ($suggestions) => {
	const grouped: Record<string, Suggestion[]> = {};
	for (const suggestion of $suggestions) {
		if (!grouped[suggestion.category]) {
			grouped[suggestion.category] = [];
		}
		grouped[suggestion.category].push(suggestion);
	}
	return grouped;
});

export function loadPlan(json: string, sql: string = ''): boolean {
	resetSuggestionCounter();
	rawJson.set(json);
	sqlQuery.set(sql);
	parseError.set(null);
	selectedNodeId.set(null);

	const result = parseExplainJson(json);

	if (!result.success) {
		parseError.set(result.error);
		analyzedPlan.set(null);
		return false;
	}

	const plan = analyzePlan(result.plan, result.hasAnalyzeData);

	// If SQL was provided separately, use it; otherwise use Query Text from EXPLAIN
	if (sql && !plan.queryText) {
		plan.queryText = sql;
	}

	analyzedPlan.set(plan);
	return true;
}

export function selectNode(nodeId: string | null): void {
	selectedNodeId.set(nodeId);
}

export function clearPlan(): void {
	rawJson.set('');
	sqlQuery.set('');
	analyzedPlan.set(null);
	selectedNodeId.set(null);
	parseError.set(null);
}

// REMOVED: findNodeById() - now using O(1) Map lookup via plan.nodeIndex
// The DFS traversal was O(N) for each lookup. With the nodeIndex Map,
// lookups are O(1) amortized, which matters when users click many nodes.
