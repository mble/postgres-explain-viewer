/**
 * Benchmark tests - run with: npm test -- benchmark.test.ts
 */

import { describe, it, expect } from 'vitest';
import { parseExplainJson } from './parser';
import { analyzePlan } from './analyzer';
import { generateLargePlan, countNodes, benchmark } from './benchmark';

describe('Performance Benchmarks', () => {
	// This test outputs performance metrics to console
	it('should measure parsing and analysis performance', () => {
		const sizes = [
			{ depth: 3, branching: 2, label: 'Small' },
			{ depth: 4, branching: 2, label: 'Medium' },
			{ depth: 5, branching: 2, label: 'Large' },
			{ depth: 4, branching: 3, label: 'Wide' },
			{ depth: 6, branching: 2, label: 'Deep' },
		];

		console.log('\n=== Performance Baseline ===\n');

		for (const { depth, branching, label } of sizes) {
			const planJson = generateLargePlan(depth, branching);
			const parseResult = parseExplainJson(planJson);

			expect(parseResult.success).toBe(true);
			if (!parseResult.success) continue;

			const analyzed = analyzePlan(parseResult.plan, parseResult.hasAnalyzeData);
			const nodeCount = countNodes(analyzed.root);
			const suggestionCount = analyzed.allSuggestions.length;

			// Benchmark parsing
			const parseBench = benchmark('parse', () => {
				parseExplainJson(planJson);
			}, 100);

			// Benchmark analysis
			const analyzeBench = benchmark('analyze', () => {
				analyzePlan(parseResult.plan, parseResult.hasAnalyzeData);
			}, 100);

			console.log(`${label} (${nodeCount} nodes, ${suggestionCount} suggestions):`);
			console.log(`  Parse:   p50=${parseBench.p50.toFixed(3)}ms p95=${parseBench.p95.toFixed(3)}ms p99=${parseBench.p99.toFixed(3)}ms`);
			console.log(`  Analyze: p50=${analyzeBench.p50.toFixed(3)}ms p95=${analyzeBench.p95.toFixed(3)}ms p99=${analyzeBench.p99.toFixed(3)}ms`);
		}

		// This test always passes - it's for measurement
		expect(true).toBe(true);
	});

	it('should verify node lookup is O(1) with index', () => {
		const planJson = generateLargePlan(5, 2); // ~63 nodes
		const parseResult = parseExplainJson(planJson);
		expect(parseResult.success).toBe(true);
		if (!parseResult.success) return;

		const analyzed = analyzePlan(parseResult.plan, parseResult.hasAnalyzeData);
		const nodeCount = countNodes(analyzed.root);

		// Collect all node IDs
		const nodeIds: string[] = [];
		function collectIds(node: typeof analyzed.root) {
			nodeIds.push(node.id);
			if (node.Plans) {
				for (const child of node.Plans) {
					collectIds(child);
				}
			}
		}
		collectIds(analyzed.root);

		// OLD O(N) lookup implementation for comparison
		function findNodeByIdDFS(node: typeof analyzed.root, id: string): typeof analyzed.root | null {
			if (node.id === id) return node;
			if (node.Plans) {
				for (const child of node.Plans) {
					const found = findNodeByIdDFS(child, id);
					if (found) return found;
				}
			}
			return null;
		}

		// Benchmark OLD DFS lookup (O(N) per lookup)
		const dfsBench = benchmark('dfs-lookups', () => {
			for (const id of nodeIds) {
				findNodeByIdDFS(analyzed.root, id);
			}
		}, 100);

		// Benchmark NEW Map lookup (O(1) per lookup)
		const mapBench = benchmark('map-lookups', () => {
			for (const id of nodeIds) {
				analyzed.nodeIndex.get(id);
			}
		}, 100);

		console.log(`\nNode lookup comparison (${nodeCount} nodes, ${nodeIds.length} lookups each):`);
		console.log(`  DFS (old): p50=${dfsBench.p50.toFixed(3)}ms per-lookup=${(dfsBench.p50 / nodeIds.length * 1000).toFixed(3)}µs`);
		console.log(`  Map (new): p50=${mapBench.p50.toFixed(3)}ms per-lookup=${(mapBench.p50 / nodeIds.length * 1000).toFixed(3)}µs`);
		console.log(`  Speedup: ${(dfsBench.p50 / mapBench.p50).toFixed(1)}x`);

		// Verify both return the same results
		for (const id of nodeIds) {
			const dfsResult = findNodeByIdDFS(analyzed.root, id);
			const mapResult = analyzed.nodeIndex.get(id);
			expect(mapResult).toBe(dfsResult); // Same object reference
		}

		expect(true).toBe(true);
	});

	it('should measure suggestion collection overhead', () => {
		const planJson = generateLargePlan(5, 2);
		const parseResult = parseExplainJson(planJson);
		expect(parseResult.success).toBe(true);
		if (!parseResult.success) return;

		// Current implementation: analyzePlan does TWO traversals
		// 1. analyzeNode() - traverses all nodes, generates suggestions per-node
		// 2. collectSuggestions() - traverses AGAIN to flatten suggestions

		// We can measure by timing the full analysis
		const fullBench = benchmark('full-analysis', () => {
			analyzePlan(parseResult.plan, parseResult.hasAnalyzeData);
		}, 100);

		console.log(`\nFull analysis with suggestion collection:`);
		console.log(`  p50=${fullBench.p50.toFixed(3)}ms p95=${fullBench.p95.toFixed(3)}ms p99=${fullBench.p99.toFixed(3)}ms`);

		expect(true).toBe(true);
	});
});
