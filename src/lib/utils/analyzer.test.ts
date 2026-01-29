import { describe, it, expect } from 'vitest';
import { analyzePlan } from './analyzer';
import type { ExplainOutput } from '$lib/types/explain';

describe('analyzePlan', () => {
	it('calculates self-time correctly for single node', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Seq Scan',
				'Actual Total Time': 100,
				'Actual Loops': 1
			}
		};

		const result = analyzePlan(input, true);

		expect(result.root.selfTime).toBe(100);
		expect(result.root.selfTimePercent).toBe(100);
	});

	it('calculates self-time correctly with children', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Aggregate',
				'Actual Total Time': 100,
				'Actual Loops': 1,
				Plans: [
					{
						'Node Type': 'Seq Scan',
						'Actual Total Time': 80,
						'Actual Loops': 1
					}
				]
			}
		};

		const result = analyzePlan(input, true);

		expect(result.root.selfTime).toBe(20);
		expect(result.root.Plans?.[0].selfTime).toBe(80);
	});

	it('accounts for loops in self-time calculation', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Nested Loop',
				'Actual Total Time': 100,
				'Actual Loops': 1,
				Plans: [
					{
						'Node Type': 'Index Scan',
						'Actual Total Time': 5,
						'Actual Loops': 10
					}
				]
			}
		};

		const result = analyzePlan(input, true);

		// Parent time (100) - child time (5 * 10 = 50) = 50
		expect(result.root.selfTime).toBe(50);
	});

	it('detects high self-time as hot', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Seq Scan',
				'Actual Total Time': 100,
				'Actual Loops': 1
			}
		};

		const result = analyzePlan(input, true);

		expect(result.root.isHot).toBe(true);
		expect(result.root.hotReasons).toContain('high-self-time');
	});

	it('detects estimation error', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Seq Scan',
				'Actual Total Time': 10,
				'Actual Rows': 10000,
				'Plan Rows': 100,
				'Actual Loops': 1
			}
		};

		const result = analyzePlan(input, true);

		expect(result.root.isHot).toBe(true);
		expect(result.root.hotReasons).toContain('estimation-error');
		expect(result.root.estimationFactor).toBe(100);
	});

	it('detects disk sort', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Sort',
				'Actual Total Time': 50,
				'Sort Space Type': 'Disk',
				'Sort Space Used': 1024,
				'Actual Loops': 1
			}
		};

		const result = analyzePlan(input, true);

		expect(result.root.isHot).toBe(true);
		expect(result.root.hotReasons).toContain('disk-sort');
	});

	it('detects sequential scan on large table', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Seq Scan',
				'Actual Total Time': 50,
				'Actual Rows': 50000,
				'Actual Loops': 1
			}
		};

		const result = analyzePlan(input, true);

		expect(result.root.hotReasons).toContain('seq-scan-large');
	});

	it('detects high filter removal', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Seq Scan',
				'Actual Total Time': 50,
				'Actual Rows': 100,
				'Rows Removed by Filter': 9900,
				'Actual Loops': 1
			}
		};

		const result = analyzePlan(input, true);

		expect(result.root.hotReasons).toContain('high-filter-removal');
	});

	it('collects all suggestions from tree', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Aggregate',
				'Actual Total Time': 100,
				'Actual Loops': 1,
				Plans: [
					{
						'Node Type': 'Seq Scan',
						'Relation Name': 'orders',
						'Actual Total Time': 80,
						'Actual Rows': 100000,
						'Actual Loops': 1
					}
				]
			}
		};

		const result = analyzePlan(input, true);

		expect(result.allSuggestions.length).toBeGreaterThan(0);
	});

	it('assigns unique IDs to nodes', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Hash Join',
				'Actual Total Time': 100,
				'Actual Loops': 1,
				Plans: [
					{
						'Node Type': 'Seq Scan',
						'Actual Total Time': 40,
						'Actual Loops': 1
					},
					{
						'Node Type': 'Hash',
						'Actual Total Time': 30,
						'Actual Loops': 1
					}
				]
			}
		};

		const result = analyzePlan(input, true);

		const ids = new Set<string>();
		function collectIds(node: typeof result.root) {
			ids.add(node.id);
			node.Plans?.forEach(collectIds);
		}
		collectIds(result.root);

		expect(ids.size).toBe(3);
	});

	it('includes planning and execution time', () => {
		const input: ExplainOutput = {
			Plan: {
				'Node Type': 'Seq Scan',
				'Actual Total Time': 50,
				'Actual Loops': 1
			},
			'Planning Time': 0.5,
			'Execution Time': 50.2
		};

		const result = analyzePlan(input, true);

		expect(result.planningTime).toBe(0.5);
		expect(result.executionTime).toBe(50.2);
	});
});
