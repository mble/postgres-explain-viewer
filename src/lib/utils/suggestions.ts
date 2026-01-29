import type { AnalyzedPlanNode, Suggestion, SuggestionSeverity } from '$lib/types/explain';
import { HOT_NODE_THRESHOLDS } from '$lib/constants/thresholds';

let suggestionIdCounter = 0;

export function generateSuggestions(node: AnalyzedPlanNode): Suggestion[] {
	const suggestions: Suggestion[] = [];

	// Seq Scan on large table
	if (node['Node Type'] === 'Seq Scan' && node.hotReasons.includes('seq-scan-large')) {
		const tableName = node['Relation Name'] || 'table';
		suggestions.push(
			createSuggestion(node.id, 'warning', 'indexing', 'Consider adding an index', `Sequential scan on "${tableName}" returned ${node['Actual Rows']?.toLocaleString()} rows. Consider adding an index on frequently filtered or joined columns.`)
		);
	}

	// Large estimation error
	if (node.hotReasons.includes('estimation-error') && node.estimationFactor !== null) {
		const factor = node.estimationFactor;
		const direction = factor > 1 ? 'underestimated' : 'overestimated';
		const ratio =
			factor > 1 ? factor.toFixed(1) + 'x more' : (1 / factor).toFixed(1) + 'x fewer';
		suggestions.push(
			createSuggestion(
				node.id,
				'warning',
				'statistics',
				'Update table statistics',
				`Planner ${direction} rows (${ratio} than expected). Run ANALYZE on the involved tables to update statistics.`
			)
		);
	}

	// Disk sort
	if (node.hotReasons.includes('disk-sort')) {
		const spaceUsed = node['Sort Space Used'];
		suggestions.push(
			createSuggestion(
				node.id,
				'critical',
				'memory',
				'Sort spilling to disk',
				`Sort operation used ${spaceUsed ? spaceUsed.toLocaleString() + ' KB of' : ''} disk space. Consider increasing work_mem or adding an index on the sort columns.`
			)
		);
	}

	// High filter removal
	if (node.hotReasons.includes('high-filter-removal')) {
		const removed = node['Rows Removed by Filter'] ?? 0;
		const kept = node['Actual Rows'] ?? 0;
		const percent = ((removed / (removed + kept)) * 100).toFixed(1);
		suggestions.push(
			createSuggestion(
				node.id,
				'warning',
				'filtering',
				'High filter overhead',
				`${percent}% of rows (${removed.toLocaleString()}) were filtered out. Consider adding an index that includes the filter condition, or restructuring the query to filter earlier.`
			)
		);
	}

	// Nested Loop with high row count
	if (node['Node Type'] === 'Nested Loop') {
		const loops = node['Actual Loops'] ?? 1;
		if (loops > 1000) {
			suggestions.push(
				createSuggestion(
					node.id,
					'info',
					'join-strategy',
					'Consider Hash Join',
					`Nested Loop executed ${loops.toLocaleString()} times. For large datasets, a Hash Join or Merge Join might be more efficient.`
				)
			);
		}
	}

	// Hash Join building large hash table
	if (node['Node Type'] === 'Hash') {
		const buckets = node['Hash Buckets'] as number | undefined;
		const batches = node['Hash Batches'] as number | undefined;
		if (batches && batches > 1) {
			suggestions.push(
				createSuggestion(
					node.id,
					'warning',
					'memory',
					'Hash operation using multiple batches',
					`Hash used ${batches} batches (${buckets?.toLocaleString() ?? 'unknown'} buckets). This may indicate work_mem is too low for this operation.`
				)
			);
		}
	}

	// High self-time without other issues
	if (
		node.hotReasons.includes('high-self-time') &&
		node.hotReasons.length === 1
	) {
		suggestions.push(
			createSuggestion(
				node.id,
				'info',
				'indexing',
				'High execution time',
				`This ${node['Node Type']} operation accounts for ${node.selfTimePercent.toFixed(1)}% of query time. Review if this operation can be optimized or if the data volume can be reduced earlier in the query.`
			)
		);
	}

	return suggestions;
}

function createSuggestion(
	nodeId: string,
	severity: SuggestionSeverity,
	category: Suggestion['category'],
	title: string,
	description: string
): Suggestion {
	return {
		id: `suggestion-${suggestionIdCounter++}`,
		nodeId,
		severity,
		category,
		title,
		description
	};
}

export function resetSuggestionCounter(): void {
	suggestionIdCounter = 0;
}
