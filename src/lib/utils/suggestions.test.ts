import { describe, it, expect, beforeEach } from 'vitest';
import { generateSuggestions, resetSuggestionCounter } from './suggestions';
import type { AnalyzedPlanNode } from '$lib/types/explain';

function createNode(overrides: Partial<AnalyzedPlanNode>): AnalyzedPlanNode {
	return {
		'Node Type': 'Seq Scan',
		id: 'node-0',
		selfTime: 0,
		selfTimePercent: 0,
		isHot: false,
		hotReasons: [],
		estimationFactor: null,
		suggestions: [],
		depth: 0,
		...overrides
	};
}

describe('generateSuggestions', () => {
	beforeEach(() => {
		resetSuggestionCounter();
	});

	it('suggests index for seq scan on large table', () => {
		const node = createNode({
			'Node Type': 'Seq Scan',
			'Relation Name': 'orders',
			'Actual Rows': 50000,
			hotReasons: ['seq-scan-large']
		});

		const suggestions = generateSuggestions(node);

		expect(suggestions.length).toBeGreaterThan(0);
		expect(suggestions[0].category).toBe('indexing');
		expect(suggestions[0].title).toContain('index');
	});

	it('suggests ANALYZE for estimation error', () => {
		const node = createNode({
			estimationFactor: 15,
			hotReasons: ['estimation-error']
		});

		const suggestions = generateSuggestions(node);

		expect(suggestions.some((s) => s.category === 'statistics')).toBe(true);
		expect(suggestions.some((s) => s.description.includes('ANALYZE'))).toBe(true);
	});

	it('suggests work_mem increase for disk sort', () => {
		const node = createNode({
			'Node Type': 'Sort',
			'Sort Space Type': 'Disk',
			'Sort Space Used': 1024,
			hotReasons: ['disk-sort']
		});

		const suggestions = generateSuggestions(node);

		expect(suggestions.some((s) => s.category === 'memory')).toBe(true);
		expect(suggestions.some((s) => s.severity === 'critical')).toBe(true);
		expect(suggestions.some((s) => s.description.includes('work_mem'))).toBe(true);
	});

	it('suggests filter optimization for high filter removal', () => {
		const node = createNode({
			'Actual Rows': 100,
			'Rows Removed by Filter': 9900,
			hotReasons: ['high-filter-removal']
		});

		const suggestions = generateSuggestions(node);

		expect(suggestions.some((s) => s.category === 'filtering')).toBe(true);
	});

	it('suggests hash join for nested loop with high loops', () => {
		const node = createNode({
			'Node Type': 'Nested Loop',
			'Actual Loops': 5000,
			hotReasons: []
		});

		const suggestions = generateSuggestions(node);

		expect(suggestions.some((s) => s.category === 'join-strategy')).toBe(true);
		expect(suggestions.some((s) => s.description.includes('Hash Join'))).toBe(true);
	});

	it('warns about multi-batch hash operations', () => {
		const node = createNode({
			'Node Type': 'Hash',
			'Hash Buckets': 65536,
			'Hash Batches': 4,
			hotReasons: []
		});

		const suggestions = generateSuggestions(node);

		expect(suggestions.some((s) => s.category === 'memory')).toBe(true);
		expect(suggestions.some((s) => s.description.includes('batches'))).toBe(true);
	});

	it('provides generic suggestion for high self-time only', () => {
		const node = createNode({
			'Node Type': 'Aggregate',
			selfTimePercent: 25,
			hotReasons: ['high-self-time']
		});

		const suggestions = generateSuggestions(node);

		expect(suggestions.length).toBeGreaterThan(0);
		expect(suggestions[0].severity).toBe('info');
	});

	it('returns empty array for normal nodes', () => {
		const node = createNode({
			'Node Type': 'Index Scan',
			selfTimePercent: 2,
			hotReasons: []
		});

		const suggestions = generateSuggestions(node);

		expect(suggestions.length).toBe(0);
	});

	it('assigns unique IDs to suggestions', () => {
		const node1 = createNode({
			hotReasons: ['estimation-error'],
			estimationFactor: 20
		});
		const node2 = createNode({
			id: 'node-1',
			hotReasons: ['estimation-error'],
			estimationFactor: 15
		});

		const suggestions1 = generateSuggestions(node1);
		const suggestions2 = generateSuggestions(node2);

		expect(suggestions1[0].id).not.toBe(suggestions2[0].id);
	});

	it('includes node ID in suggestions', () => {
		const node = createNode({
			id: 'test-node-123',
			hotReasons: ['estimation-error'],
			estimationFactor: 20
		});

		const suggestions = generateSuggestions(node);

		expect(suggestions[0].nodeId).toBe('test-node-123');
	});
});
