/**
 * Performance benchmarking utilities for the EXPLAIN analyzer.
 *
 * This module provides tools to measure and profile the critical path:
 * 1. JSON parsing
 * 2. Plan analysis (node traversal, metric calculation, suggestion generation)
 * 3. Node lookup by ID
 */

import { parseExplainJson } from './parser';
import { analyzePlan } from './analyzer';
import type { AnalyzedPlan, AnalyzedPlanNode } from '$lib/types/explain';

// Generate a deep plan tree for benchmarking
export function generateLargePlan(depth: number, branchingFactor: number): string {
	let nodeId = 0;

	function createNode(currentDepth: number): object {
		const node: Record<string, unknown> = {
			'Node Type': currentDepth === 0 ? 'Aggregate' :
			             currentDepth % 3 === 0 ? 'Hash Join' :
			             currentDepth % 3 === 1 ? 'Seq Scan' : 'Index Scan',
			'Startup Cost': Math.random() * 100,
			'Total Cost': Math.random() * 1000 + 100,
			'Plan Rows': Math.floor(Math.random() * 100000),
			'Plan Width': Math.floor(Math.random() * 100),
			'Actual Startup Time': Math.random() * 10,
			'Actual Total Time': Math.random() * 100 + 10,
			'Actual Rows': Math.floor(Math.random() * 100000),
			'Actual Loops': 1,
			'Shared Hit Blocks': Math.floor(Math.random() * 1000),
			'Shared Read Blocks': Math.floor(Math.random() * 100),
		};

		if (node['Node Type'] === 'Seq Scan' || node['Node Type'] === 'Index Scan') {
			node['Relation Name'] = `table_${nodeId++}`;
		}

		if (node['Node Type'] === 'Index Scan') {
			node['Index Name'] = `idx_${nodeId}`;
		}

		// Add filter to trigger high-filter-removal suggestions
		if (Math.random() > 0.7) {
			node['Rows Removed by Filter'] = Math.floor(Math.random() * 50000);
		}

		if (currentDepth < depth) {
			node['Plans'] = [];
			for (let i = 0; i < branchingFactor; i++) {
				(node['Plans'] as object[]).push(createNode(currentDepth + 1));
			}
		}

		return node;
	}

	const plan = [{
		Plan: createNode(0),
		'Planning Time': Math.random() * 10,
		'Execution Time': Math.random() * 1000,
	}];

	return JSON.stringify(plan);
}

// Count nodes in a tree
export function countNodes(node: AnalyzedPlanNode): number {
	let count = 1;
	if (node.Plans) {
		for (const child of node.Plans) {
			count += countNodes(child);
		}
	}
	return count;
}

// Benchmark a function with multiple iterations
export function benchmark(
	name: string,
	fn: () => void,
	iterations: number = 100
): { name: string; mean: number; p50: number; p95: number; p99: number; iterations: number } {
	const times: number[] = [];

	// Warmup
	for (let i = 0; i < 5; i++) {
		fn();
	}

	// Actual benchmark
	for (let i = 0; i < iterations; i++) {
		const start = performance.now();
		fn();
		const end = performance.now();
		times.push(end - start);
	}

	times.sort((a, b) => a - b);

	const mean = times.reduce((a, b) => a + b, 0) / times.length;
	const p50 = times[Math.floor(times.length * 0.5)];
	const p95 = times[Math.floor(times.length * 0.95)];
	const p99 = times[Math.floor(times.length * 0.99)];

	return { name, mean, p50, p95, p99, iterations };
}

// Run full benchmark suite
export function runBenchmarkSuite(): void {
	console.log('=== EXPLAIN Analyzer Benchmark Suite ===\n');

	// Test different plan sizes
	const sizes = [
		{ depth: 3, branching: 2, label: 'Small (~15 nodes)' },
		{ depth: 4, branching: 2, label: 'Medium (~31 nodes)' },
		{ depth: 5, branching: 2, label: 'Large (~63 nodes)' },
		{ depth: 4, branching: 3, label: 'Wide (~121 nodes)' },
		{ depth: 6, branching: 2, label: 'Deep (~127 nodes)' },
	];

	for (const { depth, branching, label } of sizes) {
		const planJson = generateLargePlan(depth, branching);
		const parseResult = parseExplainJson(planJson);

		if (!parseResult.success) {
			console.error(`Failed to parse plan for ${label}`);
			continue;
		}

		// Count actual nodes
		const analyzed = analyzePlan(parseResult.plan, parseResult.hasAnalyzeData);
		const nodeCount = countNodes(analyzed.root);

		console.log(`\n--- ${label} (actual: ${nodeCount} nodes) ---`);

		// Benchmark parsing
		const parseResult1 = benchmark('parseExplainJson', () => {
			parseExplainJson(planJson);
		});
		console.log(`Parse:    mean=${parseResult1.mean.toFixed(3)}ms p50=${parseResult1.p50.toFixed(3)}ms p95=${parseResult1.p95.toFixed(3)}ms`);

		// Benchmark analysis
		const analyzeResult = benchmark('analyzePlan', () => {
			analyzePlan(parseResult.plan, parseResult.hasAnalyzeData);
		});
		console.log(`Analyze:  mean=${analyzeResult.mean.toFixed(3)}ms p50=${analyzeResult.p50.toFixed(3)}ms p95=${analyzeResult.p95.toFixed(3)}ms`);

		// Benchmark node lookup (simulating user clicking nodes)
		const nodeIds = collectNodeIds(analyzed.root);
		const lookupResult = benchmark('findNodeById (all nodes)', () => {
			for (const id of nodeIds) {
				findNodeById(analyzed.root, id);
			}
		}, 50);
		console.log(`Lookup:   mean=${lookupResult.mean.toFixed(3)}ms p50=${lookupResult.p50.toFixed(3)}ms p95=${lookupResult.p95.toFixed(3)}ms (${nodeIds.length} lookups)`);
	}

	console.log('\n=== Benchmark Complete ===');
}

// Helper to collect all node IDs
function collectNodeIds(node: AnalyzedPlanNode): string[] {
	const ids = [node.id];
	if (node.Plans) {
		for (const child of node.Plans) {
			ids.push(...collectNodeIds(child));
		}
	}
	return ids;
}

// Current findNodeById implementation (copied for comparison)
function findNodeById(node: AnalyzedPlanNode, id: string): AnalyzedPlanNode | null {
	if (node.id === id) return node;
	if (node.Plans) {
		for (const child of node.Plans) {
			const found = findNodeById(child, id);
			if (found) return found;
		}
	}
	return null;
}
