/**
 * Plan Diff Utilities
 * Matches and compares nodes between two query plans
 */

import type { AnalyzedPlanNode } from '$lib/types/explain';

export interface NodeMatch {
	nodeA: AnalyzedPlanNode | null;
	nodeB: AnalyzedPlanNode | null;
	matchKey: string;
	delta: NodeDelta | null;
}

export interface NodeDelta {
	timeDiff: number;
	timePercent: number;
	rowsDiff: number;
	rowsPercent: number;
	costDiff: number;
	costPercent: number;
	status: 'improved' | 'regressed' | 'unchanged' | 'new' | 'removed';
}

/**
 * Generate a matching key for a node based on its type, relation, and position
 */
function getNodeMatchKey(node: AnalyzedPlanNode): string {
	const parts: string[] = [
		node['Node Type'],
		node['Relation Name'] ?? '',
		node['Index Name'] ?? '',
		String(node.depth)
	];
	return parts.join('|');
}

/**
 * Build a map of nodes by their match key
 */
function buildNodeMap(root: AnalyzedPlanNode): Map<string, AnalyzedPlanNode[]> {
	const map = new Map<string, AnalyzedPlanNode[]>();

	function traverse(node: AnalyzedPlanNode): void {
		const key = getNodeMatchKey(node);
		const existing = map.get(key) ?? [];
		existing.push(node);
		map.set(key, existing);

		if (node.Plans) {
			for (const child of node.Plans) {
				traverse(child);
			}
		}
	}

	traverse(root);
	return map;
}

/**
 * Calculate delta between two matched nodes
 */
function calculateDelta(nodeA: AnalyzedPlanNode | null, nodeB: AnalyzedPlanNode | null): NodeDelta | null {
	if (!nodeA && !nodeB) return null;

	if (!nodeA) {
		return {
			timeDiff: nodeB!.selfTime,
			timePercent: 100,
			rowsDiff: nodeB!['Actual Rows'] ?? 0,
			rowsPercent: 100,
			costDiff: nodeB!['Total Cost'] ?? 0,
			costPercent: 100,
			status: 'new'
		};
	}

	if (!nodeB) {
		return {
			timeDiff: -nodeA.selfTime,
			timePercent: -100,
			rowsDiff: -(nodeA['Actual Rows'] ?? 0),
			rowsPercent: -100,
			costDiff: -(nodeA['Total Cost'] ?? 0),
			costPercent: -100,
			status: 'removed'
		};
	}

	const timeA = nodeA.selfTime;
	const timeB = nodeB.selfTime;
	const timeDiff = timeB - timeA;
	const timePercent = timeA > 0 ? (timeDiff / timeA) * 100 : 0;

	const rowsA = nodeA['Actual Rows'] ?? 0;
	const rowsB = nodeB['Actual Rows'] ?? 0;
	const rowsDiff = rowsB - rowsA;
	const rowsPercent = rowsA > 0 ? (rowsDiff / rowsA) * 100 : 0;

	const costA = nodeA['Total Cost'] ?? 0;
	const costB = nodeB['Total Cost'] ?? 0;
	const costDiff = costB - costA;
	const costPercent = costA > 0 ? (costDiff / costA) * 100 : 0;

	// Determine status based on time change
	let status: NodeDelta['status'];
	if (Math.abs(timePercent) < 5) {
		status = 'unchanged';
	} else if (timeDiff < 0) {
		status = 'improved';
	} else {
		status = 'regressed';
	}

	return {
		timeDiff,
		timePercent,
		rowsDiff,
		rowsPercent,
		costDiff,
		costPercent,
		status
	};
}

/**
 * Match nodes between two plans and calculate deltas
 */
export function diffPlans(
	planA: AnalyzedPlanNode,
	planB: AnalyzedPlanNode
): NodeMatch[] {
	const mapA = buildNodeMap(planA);
	const mapB = buildNodeMap(planB);

	const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
	const matches: NodeMatch[] = [];

	for (const key of allKeys) {
		const nodesA = mapA.get(key) ?? [];
		const nodesB = mapB.get(key) ?? [];

		// Match nodes by order within the same key
		const maxLen = Math.max(nodesA.length, nodesB.length);
		for (let i = 0; i < maxLen; i++) {
			const nodeA = nodesA[i] ?? null;
			const nodeB = nodesB[i] ?? null;

			matches.push({
				nodeA,
				nodeB,
				matchKey: key + (i > 0 ? `:${i}` : ''),
				delta: calculateDelta(nodeA, nodeB)
			});
		}
	}

	// Sort by nodeA depth, then nodeB depth
	matches.sort((a, b) => {
		const depthA = a.nodeA?.depth ?? a.nodeB?.depth ?? 0;
		const depthB = b.nodeA?.depth ?? b.nodeB?.depth ?? 0;
		return depthA - depthB;
	});

	return matches;
}

/**
 * Get summary statistics for a diff
 */
export function getDiffSummary(matches: NodeMatch[]): {
	improved: number;
	regressed: number;
	unchanged: number;
	added: number;
	removed: number;
} {
	const summary = {
		improved: 0,
		regressed: 0,
		unchanged: 0,
		added: 0,
		removed: 0
	};

	for (const match of matches) {
		if (!match.delta) continue;

		switch (match.delta.status) {
			case 'improved':
				summary.improved++;
				break;
			case 'regressed':
				summary.regressed++;
				break;
			case 'unchanged':
				summary.unchanged++;
				break;
			case 'new':
				summary.added++;
				break;
			case 'removed':
				summary.removed++;
				break;
		}
	}

	return summary;
}

/**
 * Get color class for delta status
 */
export function getDeltaColorClass(status: NodeDelta['status']): string {
	switch (status) {
		case 'improved':
			return 'text-green-600 dark:text-green-400';
		case 'regressed':
			return 'text-red-600 dark:text-red-400';
		case 'new':
			return 'text-blue-600 dark:text-blue-400';
		case 'removed':
			return 'text-gray-500';
		default:
			return 'text-[var(--text-secondary)]';
	}
}

/**
 * Format a delta value with sign
 */
export function formatDelta(value: number, unit: string = ''): string {
	const sign = value > 0 ? '+' : '';
	if (Math.abs(value) >= 1000) {
		return `${sign}${(value / 1000).toFixed(1)}K${unit}`;
	}
	return `${sign}${value.toFixed(1)}${unit}`;
}
